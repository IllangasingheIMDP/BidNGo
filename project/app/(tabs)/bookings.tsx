import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Modal, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { Calendar, Clock, MapPin } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { Spacing, Typography } from '@/constants/Spacing';
import { useAuth } from '@/contexts/AuthContext';
import { apiService, BackendBooking, BackendTrip, BackendBid, DriverProfile } from '@/services/api';
import { User } from '@/types';

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
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<{ user: User; profile: DriverProfile | null; trip: BackendTrip } | null>(null);
  const [loadingDriver, setLoadingDriver] = useState(false);

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

  // Load driver details and open modal
  const showDriverDetails = async (trip: BackendTrip) => {
    try {
      setLoadingDriver(true);
      setShowDriverModal(true);
      const driverUser = await apiService.getUserById(trip.driver_user_id);
      let driverProfile: DriverProfile | null = null;
      try {
        driverProfile = await apiService.getDriverProfileByUserId(trip.driver_user_id);
      } catch (e) {
        // Profile may not exist; proceed with user only
        console.log('Driver profile not found for user', trip.driver_user_id);
      }
      setSelectedDriver({ user: driverUser, profile: driverProfile, trip });
    } catch (error: any) {
      Alert.alert('Error', 'Could not load driver details: ' + (error?.message || 'Unknown error'));
      setShowDriverModal(false);
    } finally {
      setLoadingDriver(false);
    }
  };

  const renderBookingCard = (booking: BookingWithDetails) => {
    const { trip, bid } = booking;
    if (!trip) return null;

    const { date, time } = formatDateTime(trip.departure_datetime);

    return (
      <View key={booking.id} style={styles.bookingCard}>
        {/* Clickable content area navigates to bidding */}
        <TouchableOpacity
          activeOpacity={0.8}
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

        {/* Actions row */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.viewDriverButton}
            onPress={() => showDriverDetails(trip)}
          >
            <Text style={styles.viewDriverText}>View Driver Details</Text>
          </TouchableOpacity>
        </View>
      </View>
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

      {/* Driver Details Modal */}
      <Modal visible={showDriverModal} animationType="slide" presentationStyle="formSheet" transparent>
        <View style={styles.driverModalOverlay}>
          <View style={styles.driverModalContainer}>
            {/* Header */}
            <View style={styles.driverModalHeader}>
              <TouchableOpacity
                onPress={() => { setShowDriverModal(false); setSelectedDriver(null); }}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.driverModalTitle}>Driver Details</Text>
              <View style={{ width: 40 }} />
            </View>

      {loadingDriver ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary[600]} />
        <Text style={styles.modalLoadingText}>Loading driver details...</Text>
              </View>
            ) : selectedDriver ? (
              <ScrollView style={styles.driverContent} contentContainerStyle={styles.driverScrollContent}>
                {/* Profile */}
                <View style={styles.driverProfileSection}>
                  <View style={styles.driverAvatar}>
                    <Text style={styles.driverInitials}>
                      {selectedDriver.user.name?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                  <View style={styles.driverBasicInfo}>
                    <Text style={styles.driverName}>{selectedDriver.user.name || 'Unknown Driver'}</Text>
                    {selectedDriver.user.rating && (
                      <View style={styles.ratingContainer}>
                        <Text style={styles.ratingStars}>
                          {'★'.repeat(Math.floor(selectedDriver.user.rating))}
                          {'☆'.repeat(5 - Math.floor(selectedDriver.user.rating))}
                        </Text>
                        <Text style={styles.ratingText}>{Number(selectedDriver.user.rating).toFixed(1)}/5</Text>
                      </View>
                    )}
                    <View style={styles.verificationBadge}>
                      <Text style={styles.verificationText}>
                        {selectedDriver.profile?.verificationStatus === 'approved' ? '✅ Verified Driver' : '⏳ Pending Verification'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Contact */}
                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>📞 Contact Information</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Phone:</Text>
                    <Text style={styles.infoValue}>{selectedDriver.user.phone || 'Not provided'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Email:</Text>
                    <Text style={styles.infoValue}>{selectedDriver.user.email}</Text>
                  </View>
                </View>

                {/* Vehicle */}
                {selectedDriver.profile && (
                  <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>🚗 Vehicle Information</Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Model:</Text>
                      <Text style={styles.infoValue}>{selectedDriver.profile.vehicleModel}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Registration:</Text>
                      <Text style={styles.infoValue}>{selectedDriver.profile.vehicleRegNumber}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>License:</Text>
                      <Text style={styles.infoValue}>{selectedDriver.profile.licenseNumber}</Text>
                    </View>
                  </View>
                )}

                {/* Trip */}
                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>🎯 Trip Information</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Available Seats:</Text>
                    <Text style={styles.infoValue}>{selectedDriver.trip.available_seats}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Base Price:</Text>
                    <Text style={styles.priceValue}>LKR {selectedDriver.trip.base_price.toFixed(2)}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Departure:</Text>
                    <Text style={styles.infoValue}>{new Date(selectedDriver.trip.departure_datetime).toLocaleString()}</Text>
                  </View>
                  {selectedDriver.trip.notes && (
                    <View style={styles.notesContainer}>
                      <Text style={styles.infoLabel}>Notes:</Text>
                      <Text style={styles.notesText}>{selectedDriver.trip.notes}</Text>
                    </View>
                  )}
                </View>

                {/* Actions */}
                <View style={styles.actionButtonsContainer}>
                  {selectedDriver.user.phone && (
                    <TouchableOpacity
                      style={styles.contactButton}
                      onPress={() => {
                        Alert.alert(
                          'Contact Driver',
                          `Phone: ${selectedDriver.user.phone}\nEmail: ${selectedDriver.user.email}`,
                          [
                            { text: 'Close', style: 'cancel' },
                          ]
                        );
                      }}
                    >
                      <Text style={styles.contactButtonText}>📞 Contact Driver</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
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

  // Actions below each card
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  viewDriverButton: {
    flex: 1,
    backgroundColor: Colors.neutral[900],
    borderRadius: 12,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  viewDriverText: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Bold',
    color: Colors.white,
    textTransform: 'uppercase',
  },

  // Driver modal styles (light app theme but dim overlay)
  driverModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  driverModalContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    minHeight: '70%',
  },
  driverModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: Colors.neutral[800],
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  driverModalTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  modalLoadingText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[500],
    marginTop: Spacing.sm,
  },
  driverContent: {
    paddingHorizontal: Spacing.xl,
  },
  driverScrollContent: {
    paddingBottom: Spacing.xl,
  },
  driverProfileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  driverAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  driverInitials: {
    color: Colors.white,
    fontSize: Typography.sizes['2xl'],
    fontFamily: 'Inter-Black',
  },
  driverBasicInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: Typography.sizes.xl,
    fontFamily: 'Inter-ExtraBold',
    color: Colors.neutral[900],
    marginBottom: Spacing.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    gap: Spacing.xs,
  },
  ratingStars: {
    fontSize: Typography.sizes.base,
    color: '#f59e0b',
  },
  ratingText: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[700],
  },
  verificationBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#dcfce7',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  verificationText: {
    fontSize: Typography.sizes.xs,
    fontFamily: 'Inter-Bold',
    color: '#16a34a',
    textTransform: 'uppercase',
  },
  infoSection: {
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.neutral[100],
    borderRadius: 12,
    marginBottom: Spacing.sm,
  },
  infoLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[600],
    flex: 1,
  },
  infoValue: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-SemiBold',
    color: Colors.neutral[900],
    flex: 2,
    textAlign: 'right',
  },
  priceValue: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-ExtraBold',
    color: Colors.primary[600],
    flex: 2,
    textAlign: 'right',
  },
  notesContainer: {
    backgroundColor: Colors.neutral[100],
    borderRadius: 12,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  notesText: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[700],
    lineHeight: 20,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  contactButton: {
    flex: 1,
    backgroundColor: Colors.neutral[900],
    borderRadius: 12,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  contactButtonText: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Bold',
    color: Colors.white,
    textTransform: 'uppercase',
  },
});