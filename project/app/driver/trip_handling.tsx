import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  RefreshControl,
  Modal,
  Platform,
  Linking,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { router, useLocalSearchParams } from 'expo-router';
import { apiService, BackendTrip, BackendBid, BackendBooking } from '../../services/api';

type LocationResult = { lat: number; lng: number; address: string };

const GOOGLE_MAPS_API_KEY = Platform.OS === 'ios'
  ? 'AIzaSyCtpf8qeboIsNHPaO7idcU2e_3huaHpae0'
  : 'AIzaSyCtpf8qeboIsNHPaO7idcU2e_3huaHpae0';

// Extended bid interface with user information
interface BidWithUser extends BackendBid {
  user_name?: string;
  user_email?: string;
  user_phone?: string;
}

export default function TripHandlingScreen() {
  const params = useLocalSearchParams();
  const mapRef = useRef<MapView>(null);

  // Parse parameters from navigation
  const tripId = parseInt(params.tripId as string, 10);
  const tripData: BackendTrip = JSON.parse(params.tripData as string);

  // State management
  const [bids, setBids] = useState<BidWithUser[]>([]);
  const [bookings, setBookings] = useState<BackendBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBid, setSelectedBid] = useState<BidWithUser | null>(null);
  const [showBidDetails, setShowBidDetails] = useState(false);
  const [routeCoords, setRouteCoords] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [acceptingBid, setAcceptingBid] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'bids' | 'bookings'>('bids');

  // Load bids and establish WebSocket connection
  useEffect(() => {
    let isMounted = true;
    
    const initializeScreen = async () => {
      try {
        await Promise.all([loadBids(), loadBookings()]);
        if (isMounted) {
          setupWebSocket();
          loadTripRoute();
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

  const setupWebSocket = useCallback(() => {
    apiService.connectBidEvents();
    apiService.onBidEvent(handleBidEvent);
    
    // Check initial connection status
    setTimeout(() => {
      const isConnected = apiService.isWebSocketConnected();
      setIsConnected(isConnected);
      console.log('WebSocket connection status:', isConnected);
    }, 1000);
    
    // Set up auto-refresh every 30 seconds as backup
    const interval = setInterval(() => {
      loadBids();
      loadBookings();
    }, 30000);
    setAutoRefreshInterval(interval);
  }, []);

  const handleBidEvent = useCallback((event: any) => {
    console.log('Bid event received:', event);
    
    // Handle connection status updates
    if (event.type === 'connection_status') {
      setIsConnected(event.connected);
      return;
    }
    
    // Mark as connected when receiving any real event
    setIsConnected(true);
    
    // Refresh bids when receiving real-time updates
    if (event.type === 'bid_placed' || event.type === 'bid_updated' || event.type === 'bid_deleted') {
      if (event.tripId === tripId) {
        loadBids();
        loadBookings(); // Also refresh bookings as bids can turn into bookings
      }
    }
  }, [tripId]);

  const loadBids = async (retryCount = 0) => {
    try {
      const tripBids = await apiService.listBidsForTrip(tripId);
      
      // Enhance bids with user information
      const bidsWithUser = await Promise.all(
        tripBids.map(async (bid) => {
          try {
            // Fetch user details using bid.user_id
            const user = await apiService.getUserById(bid.user_id);
            
            const enhancedBid: BidWithUser = {
              ...bid,
              user_name: user.name || `User ${bid.user_id}`,
              user_email: user.email || 'Not available',
              user_phone: user.phone || 'Not available',
            };
            return enhancedBid;
          } catch (error) {
            // Log the error but don't let it break the bid loading
            console.warn('Failed to fetch user details for bid:', bid.id, 'Error:', error);
            return {
              ...bid,
              user_name: `User ${bid.user_id}`,
              user_email: 'Not available',
              user_phone: 'Not available',
            } as BidWithUser;
          }
        })
      );

      setBids(bidsWithUser.sort((a, b) => b.bid_price - a.bid_price)); // Sort by highest bid first
    } catch (error: any) {
      console.error('Error loading bids:', error);
      
      // Handle specific error types
      if (error?.message?.includes('504') && retryCount < 2) {
        // Retry up to 2 times for 504 errors
        console.log(`Retrying bid load... attempt ${retryCount + 1}`);
        setTimeout(() => loadBids(retryCount + 1), 2000);
        return;
      } else if (error?.message?.includes('504')) {
        Alert.alert(
          'Connection Timeout', 
          'The server is taking too long to respond. Please check your connection and try again.',
          [{ text: 'OK' }]
        );
      } else if (error?.message?.includes('Method not allowed')) {
        Alert.alert(
          'Server Error', 
          'There seems to be a server configuration issue. Please try again later.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to load bids: ' + (error?.message || 'Unknown error'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadBookings = async () => {
    try {
      const tripBookings = await apiService.listBookingsForTrip(tripId);
      setBookings(tripBookings);
    } catch (error: any) {
      console.error('Error loading bookings:', error);
      // Don't show error alerts for bookings as it's less critical than bids
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
        
        // Fit map to show trip route and all pickup locations
        setTimeout(() => {
          const allCoords = [
            ...pts,
            ...bids.map(bid => ({ latitude: bid.pickup_lat, longitude: bid.pickup_lng }))
          ];
          if (allCoords.length > 0) {
            mapRef.current?.fitToCoordinates(allCoords, {
              edgePadding: { top: 80, bottom: 80, left: 80, right: 80 },
              animated: true,
            });
          }
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
    Promise.all([loadBids(), loadBookings()]).finally(() => {
      setRefreshing(false);
    });
  }, []);

  const handleAcceptBid = async (bid: BidWithUser) => {
    // Check available seats first
    const bookedSeats = bookings.filter(booking => 
      booking.status !== 'cancelled' && booking.trip_id === tripId
    ).length;
    
    const availableSeats = tripData.available_seats - bookedSeats;
    
    if (availableSeats <= 0) {
      Alert.alert(
        'No Seats Available',
        'All seats for this trip are already booked. You cannot accept more bids.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Accept Bid',
      `Accept bid from ${bid.user_name} for LKR ${bid.bid_price.toFixed(2)}?\n\nThis will create a booking and notify the passenger.\n\nSeats remaining: ${availableSeats}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              setAcceptingBid(bid.id);
              
              // Create booking for this bid
              const res = await apiService.createBooking({
                user_id: bid.user_id,
                trip_id: tripData.id,
                bid_id: bid.id,
                fare: bid.bid_price,
              });
              console.log(res);
              
              Alert.alert('Success', 'Bid accepted! Booking created successfully.');
              loadBids(); // Refresh to show updated status
              loadBookings(); // Refresh bookings list
            } catch (error: any) {
              console.error('Error accepting bid:', error);
              Alert.alert('Error', 'Failed to accept bid: ' + (error?.message || 'Unknown error'));
            } finally {
              setAcceptingBid(null);
            }
          },
        },
      ]
    );
  };

  const handleCallPassenger = (phone: string) => {
    if (phone && phone !== 'Not available') {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('No Phone Number', 'Phone number not available for this passenger.');
    }
  };

  const handleViewPickupLocation = (bid: BidWithUser) => {
    setSelectedBid(bid);
    setShowBidDetails(true);
    
    // Center map on pickup location
    mapRef.current?.animateToRegion({
      latitude: bid.pickup_lat,
      longitude: bid.pickup_lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
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

  const renderBidItem = ({ item, index }: { item: BidWithUser; index: number }) => {
    const isTopBid = index === 0;
    const isAccepted = item.status === 'accepted';
    const isBooked = item.status === 'booked';
    const isProcessing = acceptingBid === item.id;
    
    // Calculate available seats
    const bookedSeats = bookings.filter(booking => 
      booking.status !== 'cancelled' && booking.trip_id === tripId
    ).length;
    const availableSeats = tripData.available_seats - bookedSeats;
    const canAccept = !isAccepted && !isBooked && item.status === 'open' && availableSeats > 0;
    
    return (
      <View style={[
        styles.bidItem,
        isTopBid && styles.topBidItem,
        (isAccepted || isBooked) && styles.acceptedBidItem,
      ]}>
        <View style={styles.bidHeader}>
          <View style={styles.bidRankContainer}>
            <View style={[styles.bidRankBadge, isTopBid && styles.topBidBadge]}>
              <Text style={[styles.bidRankText, isTopBid && styles.topBidText]}>#{index + 1}</Text>
            </View>
            {(isAccepted || isBooked) && (
              <View style={styles.acceptedBadge}>
                <Text style={styles.acceptedText}>
                  {isBooked ? 'BOOKED' : 'ACCEPTED'}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.bidPrice, isTopBid && styles.topBidPrice]}>
            LKR {item.bid_price.toFixed(2)}
          </Text>
        </View>
        
        {/* Passenger Info */}
        <View style={styles.passengerInfo}>
          <Text style={styles.passengerName}>👤 {item.user_name}</Text>
          <Text style={styles.passengerContact}>📧 {item.user_email}</Text>
          <Text style={styles.passengerContact}>📞 {item.user_phone}</Text>
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

        {/* Action buttons */}
        <View style={styles.bidActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleViewPickupLocation(item)}
          >
            <Text style={styles.actionButtonText}>📍 View Location</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.callButton]}
            onPress={() => handleCallPassenger(item.user_phone || '')}
          >
            <Text style={styles.callButtonText}>📞 Call</Text>
          </TouchableOpacity>
          
          {canAccept && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.acceptButton, isProcessing && styles.buttonDisabled]}
              onPress={() => handleAcceptBid(item)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.acceptButtonText}>✓ Accept</Text>
              )}
            </TouchableOpacity>
          )}
          
          {!canAccept && item.status === 'open' && availableSeats <= 0 && (
            <View style={[styles.actionButton, styles.buttonDisabled]}>
              <Text style={styles.actionButtonText}>No Seats</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderBookingItem = ({ item, index }: { item: BackendBooking; index: number }) => {
    return (
      <View style={[styles.bidItem, styles.acceptedBidItem]}>
        <View style={styles.bidHeader}>
          <View style={styles.bidRankContainer}>
            <View style={styles.acceptedBadge}>
              <Text style={styles.acceptedText}>BOOKING #{item.id}</Text>
            </View>
          </View>
          <Text style={styles.bidPrice}>
            LKR {item.fare.toFixed(2)}
          </Text>
        </View>
        
        <View style={styles.passengerInfo}>
          <Text style={styles.passengerName}>👤 Passenger ID: {item.passenger_user_id}</Text>
          <Text style={styles.passengerContact}>💳 Payment: {item.payment_method}</Text>
          <Text style={styles.passengerContact}>📊 Status: {item.status}</Text>
        </View>
        
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading trip bids...</Text>
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
          <Text style={styles.tripTitle}>Trip Bids</Text>
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

        {/* Bid and booking stats */}
        {(bids.length > 0 || bookings.length > 0) && (
          <View style={styles.bidStats}>
            {bids.length > 0 && (
              <>
                <Text style={styles.bidStatsText}>
                  💰 Highest: LKR {Math.max(...bids.map(b => b.bid_price)).toFixed(2)}
                </Text>
                <Text style={styles.bidStatsText}>
                  📊 {bids.length} bid{bids.length !== 1 ? 's' : ''}
                </Text>
              </>
            )}
            <Text style={styles.bidStatsText}>
              ✅ {bookings.filter(b => b.status !== 'cancelled').length} booked
            </Text>
            <Text style={styles.bidStatsText}>
              🪑 {tripData.available_seats - bookings.filter(b => b.status !== 'cancelled').length} seats left
            </Text>
          </View>
        )}
      </View>

      {/* Map showing trip route and pickup locations */}
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
          
          {/* Pickup location markers */}
          {bids.map((bid, index) => (
            <Marker 
              key={bid.id}
              coordinate={{ latitude: bid.pickup_lat, longitude: bid.pickup_lng }} 
              title={`${bid.user_name} - LKR ${bid.bid_price}`}
              description={bid.pickup_addr}
              pinColor={index === 0 ? "#f59e0b" : "#059669"}
              onPress={() => handleViewPickupLocation(bid)}
            />
          ))}
        </MapView>
        
        {bids.length === 0 && !loading && (
          <View style={styles.mapOverlay}>
            <Text style={styles.mapOverlayText}>No pickup locations to show</Text>
          </View>
        )}
      </View>

      {/* Tabbed Bids and Bookings Section */}
      <View style={styles.bidsSection}>
        <View style={styles.bidsHeader}>
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'bids' && styles.activeTab]}
              onPress={() => setActiveTab('bids')}
            >
              <Text style={[styles.tabText, activeTab === 'bids' && styles.activeTabText]}>
                Bids ({bids.filter(bid => bid.status !== 'booked').length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'bookings' && styles.activeTab]}
              onPress={() => setActiveTab('bookings')}
            >
              <Text style={[styles.tabText, activeTab === 'bookings' && styles.activeTabText]}>
                Bookings ({bookings.length})
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.headerActions}>
            <View style={[styles.connectionStatus, isConnected && styles.connected]}>
              <Text style={[styles.connectionText, isConnected && styles.connectedText]}>
                {isConnected ? '🟢 Live' : '🔴 Offline'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => {
              loadBids();
              loadBookings();
            }} style={styles.refreshButton}>
              <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {activeTab === 'bids' ? (
          bids.filter(bid => bid.status !== 'booked').length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No open bids for this trip.</Text>
              <Text style={styles.emptySubText}>Passengers will see your trip in search results.</Text>
            </View>
          ) : (
            <FlatList
              data={bids.filter(bid => bid.status !== 'booked')}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderBidItem}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              contentContainerStyle={styles.bidsList}
              showsVerticalScrollIndicator={false}
            />
          )
        ) : (
          bookings.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No bookings yet for this trip.</Text>
              <Text style={styles.emptySubText}>Accept bids to create bookings.</Text>
            </View>
          ) : (
            <FlatList
              data={bookings}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderBookingItem}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              contentContainerStyle={styles.bidsList}
              showsVerticalScrollIndicator={false}
            />
          )
        )}
      </View>

      {/* Bid details modal */}
      <Modal visible={showBidDetails} animationType="slide" presentationStyle="formSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowBidDetails(false)}>
              <Text style={styles.modalCancelText}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Bid Details</Text>
            <View style={styles.modalPlaceholder} />
          </View>

          {selectedBid && (
            <View style={styles.modalContent}>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Passenger</Text>
                <Text style={styles.detailValue}>{selectedBid.user_name}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Contact</Text>
                <Text style={styles.detailValue}>{selectedBid.user_email}</Text>
                <Text style={styles.detailValue}>{selectedBid.user_phone}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Bid Amount</Text>
                <Text style={[styles.detailValue, styles.priceText]}>
                  LKR {selectedBid.bid_price.toFixed(2)}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Pickup Location</Text>
                <Text style={styles.detailValue}>{selectedBid.pickup_addr}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Status</Text>
                <Text style={[styles.detailValue, { color: getBidStatusColor(selectedBid.status) }]}>
                  {selectedBid.status.toUpperCase()}
                </Text>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.modalActionButton, styles.callModalButton]}
                  onPress={() => handleCallPassenger(selectedBid.user_phone || '')}
                >
                  <Text style={styles.callModalButtonText}>📞 Call Passenger</Text>
                </TouchableOpacity>
                
                {selectedBid.status === 'open' && (
                  <TouchableOpacity 
                    style={[styles.modalActionButton, styles.acceptModalButton]}
                    onPress={() => {
                      setShowBidDetails(false);
                      handleAcceptBid(selectedBid);
                    }}
                  >
                    <Text style={styles.acceptModalButtonText}>✓ Accept Bid</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
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

  // Bid stats
  bidStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  bidStatsText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },

  // Map
  mapContainer: { 
    height: 250, 
    margin: 12, 
    borderRadius: 12, 
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  map: { 
    width: '100%', 
    height: '100%' 
  },
  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  mapOverlayText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
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
  topBidItem: { 
    backgroundColor: '#fef3c7' 
  },
  acceptedBidItem: { 
    backgroundColor: '#f0fdf4' 
  },
  bidHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12 
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
  acceptedBadge: { 
    backgroundColor: '#059669', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 8 
  },
  acceptedText: { 
    color: '#fff', 
    fontSize: 10, 
    fontWeight: '600' 
  },
  bidPrice: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#111827' 
  },
  topBidPrice: { 
    color: '#f59e0b', 
    fontSize: 20 
  },

  // Passenger info
  passengerInfo: {
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  passengerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  passengerContact: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },

  pickupText: { 
    fontSize: 14, 
    color: '#374151', 
    marginBottom: 8 
  },
  bidMeta: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 12,
  },
  bidTime: { 
    fontSize: 12, 
    color: '#6b7280' 
  },
  bidStatus: { 
    fontSize: 12, 
    fontWeight: '600' 
  },

  // Bid actions
  bidActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  callButton: {
    backgroundColor: '#3b82f6',
  },
  callButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  acceptButton: {
    backgroundColor: '#059669',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // Empty state
  emptyState: { 
    padding: 40, 
    alignItems: 'center' 
  },
  emptyText: { 
    fontSize: 16, 
    color: '#6b7280', 
    textAlign: 'center',
    marginBottom: 4,
  },
  emptySubText: { 
    fontSize: 14, 
    color: '#9ca3af', 
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

  // Modal details
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 2,
  },
  priceText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563eb',
  },

  // Modal actions
  modalActions: {
    marginTop: 20,
    gap: 12,
  },
  modalActionButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  callModalButton: {
    backgroundColor: '#3b82f6',
  },
  callModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  acceptModalButton: {
    backgroundColor: '#059669',
  },
  acceptModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#111827',
  },
});
