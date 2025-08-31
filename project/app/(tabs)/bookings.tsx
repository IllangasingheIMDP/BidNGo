import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Calendar, Clock, MapPin } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { Spacing, Typography } from '@/constants/Spacing';
import { useAuth } from '@/contexts/AuthContext';
import { apiService, BackendBooking, BackendTrip, BackendBid } from '@/services/api';

type BookingWithDetails = BackendBooking & {
  trip?: BackendTrip;
  bid?: BackendBid;
};

export default function BookingsScreen() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all');

  useEffect(() => {
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }
    loadBookings();
  }, [user]);

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
    } catch (error) {
      console.error('Failed to load bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
  };

  const getFilteredBookings = () => {
    const now = new Date();
    return bookings.filter(booking => {
      if (!booking.trip) return filter === 'all';
      
      const departureDate = new Date(booking.trip.departure_datetime);
      
      switch (filter) {
        case 'upcoming':
          return departureDate > now && booking.status !== 'cancelled';
        case 'completed':
          return booking.status === 'completed' || (departureDate < now && booking.status !== 'cancelled');
        default:
          return true;
      }
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'booked': return Colors.primary[600];
      case 'picked_up': return '#f59e0b';
      case 'completed': return '#10b981';
      case 'cancelled': return '#dc2626';
      default: return Colors.neutral[500];
    }
  };

  const renderBookingCard = (booking: BookingWithDetails) => {
    const { trip, bid } = booking;
    if (!trip) return null;

    const { date, time } = formatDateTime(trip.departure_datetime);

    return (
      <TouchableOpacity
        key={booking.id}
        style={styles.bookingCard}
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
        <View style={styles.bookingHeader}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
            <Text style={styles.statusText}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </Text>
          </View>
          <Text style={styles.bookingId}>#{booking.id}</Text>
        </View>

        <View style={styles.routeContainer}>
          <Text style={styles.routeText}>
            {trip.origin_addr} → {trip.dest_addr}
          </Text>
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Calendar size={16} color={Colors.primary[600]} />
            <Text style={styles.detailText}>{date}</Text>
          </View>
          <View style={styles.detailRow}>
            <Clock size={16} color={Colors.primary[600]} />
            <Text style={styles.detailText}>{time}</Text>
          </View>
          <View style={styles.detailRow}>
            <MapPin size={16} color={Colors.primary[600]} />
            <Text style={styles.detailText}>
              Pickup: {bid?.pickup_addr || trip.origin_addr}
            </Text>
          </View>
        </View>

        <View style={styles.fareContainer}>
          <Text style={styles.fareLabel}>Fare:</Text>
          <Text style={styles.fareAmount}>LKR {booking.fare.toFixed(2)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const filteredBookings = getFilteredBookings();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Trips</Text>
      </View>

      <View style={styles.filterContainer}>
        {(['all', 'upcoming', 'completed'] as const).map((filterType) => (
          <TouchableOpacity
            key={filterType}
            style={[
              styles.filterTab,
              filter === filterType && styles.filterTabActive
            ]}
            onPress={() => setFilter(filterType)}
          >
            <Text style={[
              styles.filterTabText,
              filter === filterType && styles.filterTabTextActive
            ]}>
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingState}>
            <Text style={styles.loadingText}>Loading your trips...</Text>
          </View>
        ) : filteredBookings.length > 0 ? (
          filteredBookings.map(renderBookingCard)
        ) : (
          <View style={styles.emptyState}>
            <Calendar size={48} color={Colors.neutral[400]} />
            <Text style={styles.emptyTitle}>No trips found</Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'upcoming' 
                ? 'You have no upcoming trips'
                : filter === 'completed'
                ? 'No completed trips yet'
                : 'Start by searching for a trip'
              }
            </Text>
            {filter === 'all' && (
              <TouchableOpacity 
                style={styles.emptyButton}
                onPress={() => router.push('/passenger/trip_booking')}
              >
                <Text style={styles.emptyButtonText}>Search Trips</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.sizes['2xl'],
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  filterTab: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 8,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  filterTabActive: {
    backgroundColor: Colors.primary[600],
    borderColor: Colors.primary[600],
  },
  filterTabText: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[600],
  },
  filterTabTextActive: {
    color: Colors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  loadingText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[500],
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[700],
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[500],
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  emptyButton: {
    backgroundColor: Colors.primary[600],
    borderRadius: 12,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  emptyButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Medium',
    color: Colors.white,
  },
  // Booking card styles
  bookingCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
  },
  statusText: {
    fontSize: Typography.sizes.xs,
    fontFamily: 'Inter-Bold',
    color: Colors.white,
    textTransform: 'uppercase',
  },
  bookingId: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[500],
  },
  routeContainer: {
    marginBottom: Spacing.md,
  },
  routeText: {
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
  },
  detailsContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  detailText: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[600],
  },
  fareContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
  },
  fareLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[600],
  },
  fareAmount: {
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Bold',
    color: Colors.primary[600],
  },
});