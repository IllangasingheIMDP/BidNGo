import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { apiService, BackendBooking, BackendTrip, BackendBid } from '../../services/api';
import { Colors } from '../../constants/Colors';
import { Calendar, Clock, MapPin, User, Phone, Car, CreditCard, ArrowLeft } from 'lucide-react-native';

type BookingWithDetails = BackendBooking & {
  trip?: BackendTrip;
  bid?: BackendBid;
};

type FilterType = 'all' | 'upcoming' | 'completed' | 'cancelled';

export default function BookedScreen() {
  const params = useLocalSearchParams();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<FilterType>('upcoming');
  const [singleBooking, setSingleBooking] = useState<BookingWithDetails | null>(null);

  // Check if we're viewing a single booking
  const viewMode = params.viewMode as string;
  const bidId = params.bidId ? parseInt(params.bidId as string) : null;
  const tripId = params.tripId ? parseInt(params.tripId as string) : null;
  const isSingleView = viewMode === 'single' && bidId && tripId;

  useEffect(() => {
    if (isSingleView) {
      loadSingleBooking();
    } else {
      loadBookings();
    }
  }, [isSingleView, bidId, tripId]);

  const loadSingleBooking = async () => {
    if (!bidId || !tripId) return;
    
    setLoading(true);
    try {
      // Load all bookings and find the one matching our bid
      const allBookings = await apiService.listMyBookings();
      const booking = allBookings.find(b => b.bid_id === bidId && b.trip_id === tripId);
      
      if (booking) {
        // Load additional details
        const [trip, bids] = await Promise.all([
          apiService.getTrip(booking.trip_id || 0),
          bidId ? apiService.listBidsForTrip(booking.trip_id || 0) : Promise.resolve([])
        ]);
        
        const bid = bids.find(b => b.id === bidId);
        
        setSingleBooking({
          ...booking,
          trip,
          bid
        });
      } else {
        Alert.alert('Error', 'Booking not found');
        router.back();
      }
    } catch (error) {
      console.error('Error loading single booking:', error);
      Alert.alert('Error', 'Failed to load booking details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async () => {
    try {
      const myBookings = await apiService.listMyBookings();
      
      // Load additional details for each booking
      const bookingsWithDetails = await Promise.all(
        myBookings.map(async (booking) => {
          try {
            const [trip, bids] = await Promise.all([
              booking.trip_id ? apiService.getTrip(booking.trip_id) : Promise.resolve(undefined),
              booking.bid_id && booking.trip_id ? apiService.listBidsForTrip(booking.trip_id) : Promise.resolve([])
            ]);
            
            const bid = booking.bid_id ? bids.find(b => b.id === booking.bid_id) : undefined;
            
            return {
              ...booking,
              trip,
              bid
            } as BookingWithDetails;
          } catch (error) {
            console.error(`Error loading details for booking ${booking.id}:`, error);
            return booking as BookingWithDetails;
          }
        })
      );
      
      setBookings(bookingsWithDetails);
    } catch (error: any) {
      console.error('Error loading bookings:', error);
      Alert.alert('Error', 'Failed to load bookings: ' + (error?.message || 'Unknown error'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (isSingleView) {
      loadSingleBooking();
    } else {
      loadBookings();
    }
  }, [isSingleView]);

  const getFilteredBookings = () => {
    const now = new Date();
    return bookings.filter(booking => {
      if (!booking.trip) return currentFilter === 'all';
      
      const departureDate = new Date(booking.trip.departure_datetime);
      
      switch (currentFilter) {
        case 'upcoming':
          return departureDate > now && booking.status !== 'cancelled';
        case 'completed':
          return booking.status === 'completed' || (departureDate < now && booking.status !== 'cancelled');
        case 'cancelled':
          return booking.status === 'cancelled';
        default:
          return true;
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'booked': return '#2563eb';
      case 'picked_up': return '#f59e0b';
      case 'completed': return '#10b981';
      case 'cancelled': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#10b981';
      case 'pending': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const handleCancelBooking = (bookingId: number) => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.updateBooking(bookingId, { status: 'cancelled' });
              if (isSingleView) {
                loadSingleBooking();
              } else {
                loadBookings();
              }
              Alert.alert('Success', 'Booking cancelled successfully');
            } catch (error) {
              console.error('Error cancelling booking:', error);
              Alert.alert('Error', 'Failed to cancel booking');
            }
          }
        }
      ]
    );
  };

  const renderBookingCard = (booking: BookingWithDetails) => {
    const { trip, bid } = booking;
    if (!trip) return null;

    const { date, time } = formatDateTime(trip.departure_datetime);
    const canCancel = booking.status === 'booked' && new Date(trip.departure_datetime) > new Date();

    return (
      <View key={booking.id} style={styles.bookingCard}>
        <View style={styles.bookingHeader}>
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
              <Text style={styles.statusText}>
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </Text>
            </View>
            <View style={[styles.paymentBadge, { backgroundColor: getPaymentStatusColor(booking.payment_status) }]}>
              <Text style={styles.paymentText}>
                {booking.payment_status.charAt(0).toUpperCase() + booking.payment_status.slice(1)}
              </Text>
            </View>
          </View>
          <Text style={styles.bookingId}>#{booking.id}</Text>
        </View>

        <View style={styles.routeContainer}>
          <Text style={styles.routeText}>
            {trip.origin_addr} → {trip.dest_addr}
          </Text>
        </View>

        <View style={styles.tripDetails}>
          <View style={styles.detailRow}>
            <Calendar size={16} color="#60a5fa" />
            <Text style={styles.detailText}>{date}</Text>
          </View>
          <View style={styles.detailRow}>
            <Clock size={16} color="#60a5fa" />
            <Text style={styles.detailText}>{time}</Text>
          </View>
          <View style={styles.detailRow}>
            <MapPin size={16} color="#60a5fa" />
            <Text style={styles.detailText}>
              Pickup: {bid?.pickup_addr || 'Default pickup'}
            </Text>
          </View>
        </View>

        <View style={styles.fareContainer}>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Fare:</Text>
            <Text style={styles.fareAmount}>LKR {booking.fare.toFixed(2)}</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Payment:</Text>
            <View style={styles.paymentMethod}>
              <CreditCard size={14} color="#9ca3af" />
              <Text style={styles.paymentMethodText}>
                {booking.payment_method.charAt(0).toUpperCase() + booking.payment_method.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        {bid && (
          <View style={styles.bidInfo}>
            <Text style={styles.bidLabel}>Your bid: LKR {bid.bid_price.toFixed(2)}</Text>
          </View>
        )}

        <View style={styles.bookingActions}>
          {canCancel && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelBooking(booking.id)}
            >
              <Text style={styles.cancelButtonText}>Cancel Booking</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => router.push({
              pathname: '/passenger/trip_bidding',
              params: {
                tripId: trip.id,
                tripData: JSON.stringify(trip),
                pickupLat: bid?.pickup_lat || trip.origin_lat,
                pickupLng: bid?.pickup_lng || trip.origin_lng,
                pickupAddress: bid?.pickup_addr || trip.origin_addr,
              }
            })}
          >
            <Text style={styles.detailsButtonText}>View Trip</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

    if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading bookings...</Text>
      </View>
    );
  }

  // Single booking view
  if (isSingleView) {
    return (
      <ScrollView 
        style={styles.container}
        refreshControl={<RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          tintColor="#3b82f6"
          colors={['#3b82f6']}
        />}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={20} color="#ffffff" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Booking Details</Text>
          <View style={styles.placeholder} />
        </View>

        {singleBooking ? renderBookingCard(singleBooking) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptySubtitle}>Booking not found</Text>
          </View>
        )}
      </ScrollView>
    );
  }

  // Full bookings list view
  const filteredBookings = getFilteredBookings();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#ffffff" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Bookings</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.filterContainer}>
        {['upcoming', 'all', 'completed', 'cancelled'].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterButton,
              currentFilter === filter && styles.activeFilterButton
            ]}
            onPress={() => setCurrentFilter(filter as FilterType)}
          >
            <Text style={[
              styles.filterButtonText,
              currentFilter === filter && styles.activeFilterButtonText
            ]}>
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView 
        style={styles.bookingsList}
        refreshControl={<RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          tintColor="#3b82f6"
          colors={['#3b82f6']}
        />}
        showsVerticalScrollIndicator={false}
      >
        {filteredBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Calendar size={48} color="#3b82f6" />
            <Text style={styles.emptyTitle}>No bookings found</Text>
            <Text style={styles.emptySubtitle}>
              {currentFilter === 'upcoming' 
                ? "You don't have any upcoming bookings" 
                : `No ${currentFilter} bookings found`}
            </Text>
            <TouchableOpacity 
              style={styles.searchButton}
              onPress={() => router.push('/passenger/trip_booking')}
            >
              <Text style={styles.searchButtonText}>Find Trips</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredBookings.map(renderBookingCard)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
    paddingTop: 45,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
  },
  backButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  placeholder: {
    width: 80,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
    gap: 12,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#3a3a3a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  activeFilterButton: {
    backgroundColor: '#3b82f6',
    borderColor: '#60a5fa',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.4,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    letterSpacing: 0.3,
  },
  activeFilterButtonText: {
    color: '#ffffff',
  },
  bookingsList: {
    flex: 1,
    padding: 20,
  },
  bookingCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  paymentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  paymentText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  bookingId: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  routeContainer: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  routeText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
    lineHeight: 24,
  },
  tripDetails: {
    gap: 12,
    marginBottom: 16,
    backgroundColor: '#262626',
    padding: 16,
    borderRadius: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#d1d5db',
    flex: 1,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  fareContainer: {
    borderTopWidth: 1,
    borderTopColor: '#3a3a3a',
    paddingTop: 16,
    marginBottom: 16,
    gap: 8,
    backgroundColor: '#262626',
    padding: 16,
    borderRadius: 16,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  fareLabel: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  fareAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3b82f6',
    letterSpacing: 0.3,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3a3a3a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  paymentMethodText: {
    fontSize: 13,
    color: '#d1d5db',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  bidInfo: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    padding: 12,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  bidLabel: {
    fontSize: 14,
    color: '#60a5fa',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  bookingActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  detailsButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  detailsButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 20,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  searchButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
