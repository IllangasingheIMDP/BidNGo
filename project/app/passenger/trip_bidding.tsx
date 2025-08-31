import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  TextInput,
  RefreshControl,
  Modal,
  Platform,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { router, useLocalSearchParams } from 'expo-router';
import { apiService, BackendTrip, BackendBid } from '../../services/api';
import LocationPicker from '../../components/LocationPicker';

type LocationResult = { lat: number; lng: number; address: string };

const GOOGLE_MAPS_API_KEY = Platform.OS === 'ios'
  ? 'AIzaSyCtpf8qeboIsNHPaO7idcU2e_3huaHpae0'
  : 'AIzaSyCtpf8qeboIsNHPaO7idcU2e_3huaHpae0';

export default function TripBiddingScreen() {
  const params = useLocalSearchParams();
  const mapRef = useRef<MapView>(null);

  // Parse parameters from navigation
  const tripId = parseInt(params.tripId as string, 10);
  const tripData: BackendTrip = JSON.parse(params.tripData as string);
  const initialPickup: LocationResult = {
    lat: parseFloat(params.pickupLat as string),
    lng: parseFloat(params.pickupLng as string),
    address: params.pickupAddress as string,
  };

  // State management
  const [bids, setBids] = useState<BackendBid[]>([]);
  const [myBid, setMyBid] = useState<BackendBid | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bidPrice, setBidPrice] = useState(tripData.base_price.toString());
  const [pickupLocation, setPickupLocation] = useState<LocationResult>(initialPickup);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [submittingBid, setSubmittingBid] = useState(false);
  const [routeCoords, setRouteCoords] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Setup WebSocket and load initial data
  useEffect(() => {
    let isMounted = true;
    
    const initializeScreen = async () => {
      try {
        await loadBids();
        if (isMounted) {
          setupWebSocket();
        }
      } catch (error) {
        console.error('Error initializing screen:', error);
      }
    };

    initializeScreen();

    return () => {
      isMounted = false;
      // Cleanup WebSocket on unmount
      apiService.disconnectBidEvents();
      // Clear auto-refresh interval
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
      }
    };
  }, [tripId]);

  // Load route when component mounts
  useEffect(() => {
    loadTripRoute();
  }, []);

  const setupWebSocket = useCallback(() => {
    apiService.connectBidEvents();
    apiService.onBidEvent(handleBidEvent);
    
    // Set up auto-refresh every 30 seconds as backup
    const interval = setInterval(() => {
      loadBids();
    }, 30000);
    setAutoRefreshInterval(interval);
  }, []);

  const handleBidEvent = useCallback((event: any) => {
    console.log('Bid event received:', event);
    setIsConnected(true);
    
    // Refresh bids when receiving real-time updates
    if (event.type === 'bid_placed' || event.type === 'bid_updated' || event.type === 'bid_deleted') {
      if (event.tripId === tripId) {
        loadBids();
      }
    }
  }, [tripId]);

  const loadBids = async () => {
    try {
      const [tripBids, userBids] = await Promise.all([
        apiService.listBidsForTrip(tripId),
        apiService.listMyBids()
      ]);

      setBids(tripBids.sort((a, b) => b.bid_price - a.bid_price)); // Sort by highest bid first
      
      // Find user's bid for this trip
      const userBidForTrip = userBids.find(bid => bid.trip_id === tripId);
      setMyBid(userBidForTrip || null);
      
      if (userBidForTrip) {
        setBidPrice(userBidForTrip.bid_price.toString());
        setPickupLocation({
          lat: userBidForTrip.pickup_lat,
          lng: userBidForTrip.pickup_lng,
          address: userBidForTrip.pickup_addr,
        });
      }
    } catch (error: any) {
      console.error('Error loading bids:', error);
      Alert.alert('Error', 'Failed to load bids: ' + (error?.message || 'Unknown error'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadTripRoute = async () => {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${tripData.origin_lat},${tripData.origin_lng}&destination=${tripData.dest_lat},${tripData.dest_lng}&key=${GOOGLE_MAPS_API_KEY}`;
      const res = await fetch(url);
      const json = await res.json();
      
      if (json.routes && json.routes.length > 0) {
        const pts = decodePolyline(json.routes[0].overview_polyline.points);
        setRouteCoords(pts);
        
        // Fit map to show trip route and pickup location
        setTimeout(() => {
          const allCoords = [...pts, { latitude: pickupLocation.lat, longitude: pickupLocation.lng }];
          mapRef.current?.fitToCoordinates(allCoords, {
            edgePadding: { top: 80, bottom: 80, left: 80, right: 80 },
            animated: true,
          });
        }, 500);
      }
    } catch (error) {
      console.error('Error loading route:', error);
    }
  };

  const decodePolyline = (encoded: string) => {
    const points: Array<{ latitude: number; longitude: number }> = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;
    while (index < len) {
      let b, shift = 0, result = 0;
      do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;
      shift = 0; result = 0;
      do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;
      points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return points;
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadBids();
  }, []);

  const handleSubmitBid = async () => {
    const price = parseFloat(bidPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Invalid Bid', 'Please enter a valid bid amount.');
      return;
    }

    if (price < tripData.base_price * 0.5) {
      Alert.alert('Bid Too Low', `Your bid should be at least LKR ${(tripData.base_price * 0.5).toFixed(2)} (50% of base price).`);
      return;
    }

    if (price > tripData.base_price * 3) {
      Alert.alert('Bid Too High', `Your bid seems unusually high. Maximum suggested: LKR ${(tripData.base_price * 3).toFixed(2)}.`);
      return;
    }

    // Check if bid is significantly higher than current top bid
    if (bids.length > 0 && price > bids[0].bid_price * 1.5) {
      Alert.alert(
        'High Bid Warning',
        `Your bid is much higher than the current top bid (LKR ${bids[0].bid_price.toFixed(2)}). Are you sure?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => submitBidRequest(price) }
        ]
      );
      return;
    }

    await submitBidRequest(price);
  };

  const submitBidRequest = async (price: number) => {
    try {
      setSubmittingBid(true);
      
      if (myBid) {
        // Update existing bid
        await apiService.updateBid(myBid.id, {
          bid_price: price,
          pickup: pickupLocation,
        });
        Alert.alert('Success', 'Your bid has been updated!');
      } else {
        // Create new bid
        await apiService.createBid(tripId, {
          bid_price: price,
          pickup: pickupLocation,
        });
        Alert.alert('Success', 'Your bid has been placed!');
      }
      
      setShowBidModal(false);
      loadBids(); // Refresh to show updated data
    } catch (error: any) {
      console.error('Error submitting bid:', error);
      Alert.alert('Error', 'Failed to submit bid: ' + (error?.message || 'Unknown error'));
    } finally {
      setSubmittingBid(false);
    }
  };

  const handleDeleteBid = () => {
    if (!myBid) return;

    Alert.alert(
      'Delete Bid',
      'Are you sure you want to delete your bid? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteBid(myBid.id);
              Alert.alert('Success', 'Your bid has been deleted.');
              loadBids();
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete bid: ' + (error?.message || 'Unknown error'));
            }
          },
        },
      ]
    );
  };

  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const onPickupLocationSelected = (origin: LocationResult, destination: LocationResult) => {
    // Use the origin as the pickup location (destination is ignored in this context)
    setPickupLocation(origin);
    setShowLocationPicker(false);
  };

  const renderBidItem = ({ item, index }: { item: BackendBid; index: number }) => {
    const isMyBid = myBid?.id === item.id;
    const isTopBid = index === 0;
    
    return (
      <View style={[
        styles.bidItem,
        isMyBid && styles.myBidItem,
        isTopBid && styles.topBidItem,
      ]}>
        <View style={styles.bidHeader}>
          <View style={styles.bidRankContainer}>
            <View style={[styles.bidRankBadge, isTopBid && styles.topBidBadge]}>
              <Text style={[styles.bidRankText, isTopBid && styles.topBidText]}>#{index + 1}</Text>
            </View>
            {isMyBid && (
              <View style={styles.myBidBadge}>
                <Text style={styles.myBidText}>Your Bid</Text>
              </View>
            )}
          </View>
          <Text style={[styles.bidPrice, isTopBid && styles.topBidPrice]}>
            LKR {item.bid_price.toFixed(2)}
          </Text>
        </View>
        
        <Text style={styles.pickupText} numberOfLines={1}>
          📍 Pickup: {item.pickup_addr}
        </Text>
        
        <View style={styles.bidMeta}>
          <Text style={styles.bidTime}>
            🕒 {getRelativeTime(item.created_at)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.bidStatus, { color: getBidStatusColor(item.status) }]}>
              {item.status.toUpperCase()}
            </Text>
            {isMyBid && item.status === 'booked' && (
              <TouchableOpacity
                style={styles.showBookingButton}
                onPress={() => router.push({
                  pathname: '/passenger/booked',
                  params: {
                    bidId: item.id,
                    tripId: item.trip_id,
                    viewMode: 'single'
                  }
                })}
              >
                <Text style={styles.showBookingButtonText}>Show Booking</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const getBidStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#2563eb';
      case 'accepted': return '#059669';
      case 'booked': return '#10b981';
      case 'rejected': return '#dc2626';
      case 'withdrawn': return '#6b7280';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading bidding data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with trip info */}
      <View style={styles.tripInfoCard}>
        <View style={styles.tripHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.tripTitle}>Trip Bidding</Text>
          <View style={styles.placeholder} />
        </View>
        
        
        
        <View style={styles.tripMeta}>
          <Text style={styles.metaText}>
            🕒 {new Date(tripData.departure_datetime).toLocaleString()}
          </Text>
          <Text style={styles.metaText}>
            👥 {tripData.available_seats} seats
          </Text>
          
        </View>
        <View style={styles.tripMeta}>
         <Text style={styles.basePriceText}>
            Base: LKR {tripData.base_price.toFixed(2)}
          </Text>
          
        </View>
      </View>

      {/* Map showing trip route and pickup location */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{ 
            latitude: tripData.origin_lat, 
            longitude: tripData.origin_lng, 
            latitudeDelta: 0.1, 
            longitudeDelta: 0.1 
          }}
        >
          {/* Trip route */}
          {routeCoords.length > 0 && (
            <Polyline coordinates={routeCoords} strokeColor="#2563eb" strokeWidth={4} />
          )}
          
          {/* Trip markers */}
          <Marker 
            coordinate={{ latitude: tripData.origin_lat, longitude: tripData.origin_lng }} 
            title="Trip Start" 
            pinColor="#2563eb" 
          />
          <Marker 
            coordinate={{ latitude: tripData.dest_lat, longitude: tripData.dest_lng }} 
            title="Trip End" 
            pinColor="#e91e63" 
          />
          
          {/* Pickup location marker */}
          <Marker 
            coordinate={{ latitude: pickupLocation.lat, longitude: pickupLocation.lng }} 
            title="Your Pickup Point" 
            pinColor="#059669"
          />
        </MapView>
      </View>

      {/* Bid actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={() => setShowBidModal(true)}
        >
          <Text style={styles.primaryButtonText}>
            {myBid ? 'Update Bid' : 'Place Bid'}
          </Text>
        </TouchableOpacity>
        
        {myBid && (
          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={handleDeleteBid}
          >
            <Text style={styles.dangerButtonText}>Delete Bid</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Bids list */}
      <View style={styles.bidsSection}>
        <View style={styles.bidsHeader}>
          <Text style={styles.bidsTitle}>
            Live Bids ({bids.length})
          </Text>
          <View style={styles.headerActions}>
            <View style={[styles.connectionStatus, isConnected && styles.connected]}>
              <Text style={[styles.connectionText, isConnected && styles.connectedText]}>
                {isConnected ? '🟢 Live' : '🔴 Offline'}
              </Text>
            </View>
            <TouchableOpacity onPress={loadBids} style={styles.refreshButton}>
              <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {bids.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No bids yet. Be the first to bid!</Text>
          </View>
        ) : (
          <FlatList
            data={bids}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderBidItem}
            refreshControl={<RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor="#3b82f6"
              colors={['#3b82f6']}
            />}
            contentContainerStyle={styles.bidsList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Bid submission modal */}
      <Modal visible={showBidModal} animationType="slide" presentationStyle="formSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowBidModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {myBid ? 'Update Your Bid' : 'Place Your Bid'}
            </Text>
            <View style={styles.modalPlaceholder} />
          </View>

          <View style={styles.modalContent}>
            {/* Bid amount input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Bid Amount (LKR)</Text>
              <TextInput
                style={styles.bidInput}
                value={bidPrice}
                onChangeText={setBidPrice}
                placeholder="Enter your bid amount"
                keyboardType="numeric"
              />
              <Text style={styles.inputHint}>
                Base price: LKR {tripData.base_price.toFixed(2)}
              </Text>
            </View>

            {/* Pickup location */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Pickup Location</Text>
              <TouchableOpacity
                style={styles.locationButton}
                onPress={() => setShowLocationPicker(true)}
              >
                <Text style={styles.locationButtonText} numberOfLines={2}>
                  📍 {pickupLocation.address}
                </Text>
                <Text style={styles.changeLocationText}>Tap to change</Text>
              </TouchableOpacity>
            </View>

            {/* Submit button */}
            <TouchableOpacity
              style={[styles.submitButton, submittingBid && styles.buttonDisabled]}
              onPress={handleSubmitBid}
              disabled={submittingBid}
            >
              {submittingBid ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {myBid ? 'Update Bid' : 'Place Bid'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Location picker modal */}
      <Modal visible={showLocationPicker} animationType="slide" presentationStyle="formSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Pickup Location</Text>
            <View style={styles.modalPlaceholder} />
          </View>
          <LocationPicker
            height={600}
            onLocationsSelected={onPickupLocationSelected}
            initialOrigin={pickupLocation}
            initialDestination={null}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0a0a0a',
    paddingTop: 45,
  },
  
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  loadingText: { 
    marginTop: 16, 
    fontSize: 16, 
    color: '#9ca3af',
    letterSpacing: 0.5,
  },

  // Trip info header
  tripInfoCard: { 
    backgroundColor: '#1a1a1a', 
    padding: 20, 
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  tripHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16,
  },
  backButton: { 
    paddingVertical: 12, 
    paddingHorizontal: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  backButtonText: { 
    color: '#ffffff', 
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  tripTitle: { 
    fontSize: 20, 
    fontWeight: '800', 
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  placeholder: { 
    width: 80,
  },
  routeText: { 
    fontSize: 15, 
    color: '#d1d5db', 
    marginBottom: 6,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  tripMeta: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 12,
    backgroundColor: '#262626',
    padding: 12,
    borderRadius: 12,
  },
  metaText: { 
    fontSize: 12, 
    color: '#9ca3af',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  basePriceText: { 
    fontSize: 12, 
    color: '#3b82f6', 
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Map
  mapContainer: { 
    height: 180, 
    marginHorizontal: 20, 
    borderRadius: 20, 
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    marginBottom: 16,
  },
  map: { 
    width: '100%', 
    height: '100%',
  },

  // Actions
  actionsContainer: { 
    flexDirection: 'row', 
    paddingHorizontal: 20, 
    gap: 12, 
    marginBottom: 16,
  },
  actionButton: { 
    flex: 1, 
    paddingVertical: 16, 
    borderRadius: 16, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButton: { 
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
  },
  primaryButtonText: { 
    color: '#ffffff', 
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  dangerButton: { 
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
  },
  dangerButtonText: { 
    color: '#ffffff', 
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Bids section
  bidsSection: { 
    flex: 1, 
    backgroundColor: '#1a1a1a', 
    marginHorizontal: 20, 
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  bidsHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#3a3a3a',
  },
  bidsTitle: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  connectionStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  connected: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  connectionText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ef4444',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  connectedText: {
    color: '#22c55e',
  },
  refreshButton: { 
    paddingVertical: 8, 
    paddingHorizontal: 16, 
    backgroundColor: '#2a2a2a', 
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  refreshButtonText: { 
    fontSize: 12, 
    color: '#ffffff', 
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Bids list
  bidsList: { 
    paddingBottom: 20,
  },
  bidItem: { 
    padding: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#2a2a2a',
  },
  myBidItem: { 
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  topBidItem: { 
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  bidHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12,
  },
  bidRankContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10,
  },
  bidRankBadge: { 
    backgroundColor: '#6b7280', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  topBidBadge: { 
    backgroundColor: '#f59e0b',
    shadowColor: '#f59e0b',
  },
  bidRankText: { 
    color: '#ffffff', 
    fontSize: 12, 
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  topBidText: { 
    color: '#ffffff',
  },
  myBidBadge: { 
    backgroundColor: '#3b82f6', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  myBidText: { 
    color: '#ffffff', 
    fontSize: 10, 
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  bidPrice: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  topBidPrice: { 
    color: '#f59e0b', 
    fontSize: 20,
  },
  pickupText: { 
    fontSize: 14, 
    color: '#d1d5db', 
    marginBottom: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  bidMeta: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
  },
  bidTime: { 
    fontSize: 12, 
    color: '#9ca3af',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  bidStatus: { 
    fontSize: 12, 
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  // Empty state
  emptyState: { 
    padding: 40, 
    alignItems: 'center',
  },
  emptyText: { 
    fontSize: 16, 
    color: '#9ca3af', 
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  // Modal styles
  modalContainer: { 
    flex: 1, 
    backgroundColor: '#1a1a1a',
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
    paddingTop: Platform.OS === 'ios' ? 45 : 16,
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: '800', 
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  modalCancelText: { 
    fontSize: 16, 
    color: '#3b82f6', 
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  modalPlaceholder: { 
    width: 80,
  },
  modalContent: { 
    padding: 24,
  },

  // Form inputs
  inputGroup: { 
    marginBottom: 24,
  },
  inputLabel: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#ffffff', 
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  bidInput: { 
    borderWidth: 2, 
    borderColor: '#3a3a3a', 
    borderRadius: 16, 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    fontSize: 16,
    backgroundColor: '#2a2a2a',
    color: '#ffffff',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  inputHint: { 
    fontSize: 12, 
    color: '#9ca3af', 
    marginTop: 8,
    letterSpacing: 0.2,
  },
  locationButton: { 
    borderWidth: 2, 
    borderColor: '#3a3a3a', 
    borderRadius: 16, 
    padding: 20,
    backgroundColor: '#2a2a2a',
  },
  locationButtonText: { 
    fontSize: 14, 
    color: '#ffffff', 
    marginBottom: 6,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  changeLocationText: { 
    fontSize: 12, 
    color: '#3b82f6', 
    fontStyle: 'italic',
    letterSpacing: 0.2,
  },
  submitButton: { 
    backgroundColor: '#3b82f6', 
    paddingVertical: 16, 
    borderRadius: 16, 
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonText: { 
    color: '#ffffff', 
    fontSize: 16, 
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  buttonDisabled: { 
    opacity: 0.6,
  },
  showBookingButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  showBookingButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
