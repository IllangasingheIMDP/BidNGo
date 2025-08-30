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
          <Text style={[styles.bidStatus, { color: getBidStatusColor(item.status) }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>
    );
  };

  const getBidStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#2563eb';
      case 'accepted': return '#059669';
      case 'rejected': return '#dc2626';
      case 'withdrawn': return '#6b7280';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
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
        
        <Text style={styles.routeText} numberOfLines={1}>
          📍 {tripData.origin_addr}
        </Text>
        <Text style={styles.routeText} numberOfLines={1}>
          🎯 {tripData.dest_addr}
        </Text>
        
        <View style={styles.tripMeta}>
          <Text style={styles.metaText}>
            🕒 {new Date(tripData.departure_datetime).toLocaleString()}
          </Text>
          <Text style={styles.metaText}>
            👥 {tripData.available_seats} seats
          </Text>
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
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
    backgroundColor: '#f7f7f7' 
  },
  
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
  },
  loadingText: { 
    marginTop: 12, 
    fontSize: 16, 
    color: '#6b7280' 
  },

  // Trip info header
  tripInfoCard: { 
    backgroundColor: '#fff', 
    padding: 16, 
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tripHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  backButton: { 
    paddingVertical: 8, 
    paddingHorizontal: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  backButtonText: { 
    color: '#374151', 
    fontWeight: '600' 
  },
  tripTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#111827' 
  },
  placeholder: { 
    width: 60 
  },
  routeText: { 
    fontSize: 14, 
    color: '#111827', 
    marginBottom: 4 
  },
  tripMeta: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 8 
  },
  metaText: { 
    fontSize: 12, 
    color: '#6b7280' 
  },
  basePriceText: { 
    fontSize: 12, 
    color: '#2563eb', 
    fontWeight: '600' 
  },

  // Map
  mapContainer: { 
    height: 200, 
    margin: 12, 
    borderRadius: 12, 
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  map: { 
    width: '100%', 
    height: '100%' 
  },

  // Actions
  actionsContainer: { 
    flexDirection: 'row', 
    paddingHorizontal: 12, 
    gap: 8, 
    marginBottom: 8 
  },
  actionButton: { 
    flex: 1, 
    paddingVertical: 12, 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  primaryButton: { 
    backgroundColor: '#2563eb' 
  },
  primaryButtonText: { 
    color: '#fff', 
    fontWeight: '700' 
  },
  dangerButton: { 
    backgroundColor: '#dc2626' 
  },
  dangerButtonText: { 
    color: '#fff', 
    fontWeight: '600' 
  },

  // Bids section
  bidsSection: { 
    flex: 1, 
    backgroundColor: '#fff', 
    marginHorizontal: 12, 
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bidsHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#e5e7eb' 
  },
  bidsTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#111827' 
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectionStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
  },
  connected: {
    backgroundColor: '#dcfce7',
  },
  connectionText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#dc2626',
  },
  connectedText: {
    color: '#16a34a',
  },
  refreshButton: { 
    paddingVertical: 6, 
    paddingHorizontal: 12, 
    backgroundColor: '#f3f4f6', 
    borderRadius: 6 
  },
  refreshButtonText: { 
    fontSize: 12, 
    color: '#374151', 
    fontWeight: '600' 
  },

  // Bids list
  bidsList: { 
    paddingBottom: 20 
  },
  bidItem: { 
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f3f4f6' 
  },
  myBidItem: { 
    backgroundColor: '#f0f9ff' 
  },
  topBidItem: { 
    backgroundColor: '#fef3c7' 
  },
  bidHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  bidRankContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 
  },
  bidRankBadge: { 
    backgroundColor: '#6b7280', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 12 
  },
  topBidBadge: { 
    backgroundColor: '#f59e0b' 
  },
  bidRankText: { 
    color: '#fff', 
    fontSize: 12, 
    fontWeight: '700' 
  },
  topBidText: { 
    color: '#fff' 
  },
  myBidBadge: { 
    backgroundColor: '#2563eb', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 8 
  },
  myBidText: { 
    color: '#fff', 
    fontSize: 10, 
    fontWeight: '600' 
  },
  bidPrice: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#111827' 
  },
  topBidPrice: { 
    color: '#f59e0b', 
    fontSize: 18 
  },
  pickupText: { 
    fontSize: 14, 
    color: '#374151', 
    marginBottom: 8 
  },
  bidMeta: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  bidTime: { 
    fontSize: 12, 
    color: '#6b7280' 
  },
  bidStatus: { 
    fontSize: 12, 
    fontWeight: '600' 
  },

  // Empty state
  emptyState: { 
    padding: 40, 
    alignItems: 'center' 
  },
  emptyText: { 
    fontSize: 16, 
    color: '#6b7280', 
    textAlign: 'center' 
  },

  // Modal styles
  modalContainer: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#111827' 
  },
  modalCancelText: { 
    fontSize: 16, 
    color: '#2563eb', 
    fontWeight: '600' 
  },
  modalPlaceholder: { 
    width: 60 
  },
  modalContent: { 
    padding: 20 
  },

  // Form inputs
  inputGroup: { 
    marginBottom: 20 
  },
  inputLabel: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#111827', 
    marginBottom: 8 
  },
  bidInput: { 
    borderWidth: 2, 
    borderColor: '#e5e7eb', 
    borderRadius: 8, 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputHint: { 
    fontSize: 12, 
    color: '#6b7280', 
    marginTop: 4 
  },
  locationButton: { 
    borderWidth: 2, 
    borderColor: '#e5e7eb', 
    borderRadius: 8, 
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  locationButtonText: { 
    fontSize: 14, 
    color: '#111827', 
    marginBottom: 4 
  },
  changeLocationText: { 
    fontSize: 12, 
    color: '#2563eb', 
    fontStyle: 'italic' 
  },
  submitButton: { 
    backgroundColor: '#2563eb', 
    paddingVertical: 16, 
    borderRadius: 8, 
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '700' 
  },
  buttonDisabled: { 
    opacity: 0.6 
  },
});
