import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Modal, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { Plus, Car, Calendar, DollarSign, Users, Filter, MapPin, Clock, Eye, X } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { Spacing, Typography } from '@/constants/Spacing';
import { useAuth } from '@/contexts/AuthContext';

import { StatCard } from '@/components/StatCard';
import { Trip, Bid, User } from '@/types';
import { apiService, BackendTrip, BackendBid } from '@/services/api';

// Enhanced trip interface with related data
interface TripWithDetails extends BackendTrip {
  bids: BackendBid[];
  bidUsers: { [bidId: number]: User };
  status: 'open' | 'started' | 'completed' | 'cancelled';
}

export default function DriverScreen() {
  const { user } = useAuth();
  const [myTrips, setMyTrips] = useState<TripWithDetails[]>([]);
  const [filteredTrips, setFilteredTrips] = useState<TripWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<TripWithDetails | null>(null);
  const [showTripDetails, setShowTripDetails] = useState(false);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [minSeatsFilter, setMinSeatsFilter] = useState<string>('');
  const [minPriceFilter, setMinPriceFilter] = useState<string>('');
  const [maxPriceFilter, setMaxPriceFilter] = useState<string>('');

  useEffect(() => {
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }
    
    if (user.role !== 'driver') {
      router.replace('/(tabs)');
      return;
    }
    
    loadMyTrips();
  }, [user]);

  // Apply filters when trips or filter values change
  useEffect(() => {
    let filtered = myTrips;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(trip => trip.status === statusFilter);
    }

    // Seats filter
    if (minSeatsFilter && !isNaN(Number(minSeatsFilter))) {
      filtered = filtered.filter(trip => trip.available_seats >= Number(minSeatsFilter));
    }

    // Price filters
    if (minPriceFilter && !isNaN(Number(minPriceFilter))) {
      filtered = filtered.filter(trip => trip.base_price >= Number(minPriceFilter));
    }
    if (maxPriceFilter && !isNaN(Number(maxPriceFilter))) {
      filtered = filtered.filter(trip => trip.base_price <= Number(maxPriceFilter));
    }

    setFilteredTrips(filtered);
  }, [myTrips, statusFilter, minSeatsFilter, minPriceFilter, maxPriceFilter]);

  const loadMyTrips = async () => {
    try {
      const trips = await apiService.getMyTrips();
      
      // Enhance trips with bid and user data
      const tripsWithDetails: TripWithDetails[] = await Promise.all(
        trips.map(async (trip) => {
          try {
            // Get bids for this trip
            const bids = await apiService.listBidsForTrip(trip.id);
            
            // Get user details for each bid
            const bidUsers: { [bidId: number]: User } = {};
            await Promise.all(
              bids.map(async (bid) => {
                try {
                  const bidUser = await apiService.getUserById(bid.user_id);
                  bidUsers[bid.id] = bidUser;
                } catch (error) {
                  console.error(`Failed to load user ${bid.user_id}:`, error);
                }
              })
            );

            // Determine trip status based on available seats and current date
            let status: 'open' | 'started' | 'completed' | 'cancelled' = 'open';
            const now = new Date();
            const departureTime = new Date(trip.departure_datetime);
            
            if (trip.available_seats === 0) {
              status = now > departureTime ? 'completed' : 'started';
            } else if (now > departureTime) {
              status = 'completed';
            }

            return {
              ...trip,
              bids,
              bidUsers,
              status
            } as TripWithDetails;
          } catch (error) {
            console.error(`Failed to load details for trip ${trip.id}:`, error);
            return {
              ...trip,
              bids: [],
              bidUsers: {},
              status: 'open'
            } as TripWithDetails;
          }
        })
      );
      
      setMyTrips(tripsWithDetails);
      setFilteredTrips(tripsWithDetails);
    } catch (error) {
      console.error('Failed to load trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMyTrips();
    setRefreshing(false);
  };

  // Filter function
  const applyFilters = () => {
    let filtered = myTrips;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(trip => trip.status === statusFilter);
    }

    // Seats filter
    if (minSeatsFilter && !isNaN(Number(minSeatsFilter))) {
      filtered = filtered.filter(trip => trip.available_seats >= Number(minSeatsFilter));
    }

    // Price filters
    if (minPriceFilter && !isNaN(Number(minPriceFilter))) {
      filtered = filtered.filter(trip => trip.base_price >= Number(minPriceFilter));
    }
    if (maxPriceFilter && !isNaN(Number(maxPriceFilter))) {
      filtered = filtered.filter(trip => trip.base_price <= Number(maxPriceFilter));
    }

    setFilteredTrips(filtered);
    setShowFilters(false);
  };

  // Reset filters
  const resetFilters = () => {
    setStatusFilter('all');
    setMinSeatsFilter('');
    setMinPriceFilter('');
    setMaxPriceFilter('');
    setFilteredTrips(myTrips);
    setShowFilters(false);
  };

  // Confirm top bids for a trip
  const handleConfirmBids = async (tripId: number) => {
    try {
      Alert.alert(
        'Confirm Top Bids',
        'Are you sure you want to confirm the top bids for this trip? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            onPress: async () => {
              try {
                const result = await apiService.confirmTopBids(tripId);
                Alert.alert('Success', `${result.confirmed} bids confirmed, ${result.closed} bids closed`);
                await loadMyTrips(); // Reload trips
              } catch (error) {
                Alert.alert('Error', 'Failed to confirm bids');
                console.error('Failed to confirm bids:', error);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in confirm bids:', error);
    }
  };

  const getStats = () => {
    const openTrips = filteredTrips.filter(trip => trip.status === 'open').length;
    const completedTrips = filteredTrips.filter(trip => trip.status === 'completed').length;
    const totalBids = filteredTrips.reduce((sum, trip) => sum + trip.bids.length, 0);
    const totalEarnings = user && 'earnings' in user ? user.earnings : 0;

    return { openTrips, completedTrips, totalBids, totalEarnings };
  };

  const stats = getStats();

  // Trip card component
  const TripCard = ({ trip }: { trip: TripWithDetails }) => {
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'open': return '#10b981';
        case 'started': return '#f59e0b';
        case 'completed': return '#6b7280';
        case 'cancelled': return '#ef4444';
        default: return '#6b7280';
      }
    };

    return (
      <TouchableOpacity 
        style={styles.tripCard}
        onPress={() => {
          setSelectedTrip(trip);
          setShowTripDetails(true);
        }}
      >
        <View style={styles.tripHeader}>
          <View style={styles.tripRoute}>
            <View style={styles.routePoint}>
              <MapPin size={16} color="#3b82f6" />
              <Text style={styles.routeText} numberOfLines={1}>
                {trip.origin_addr}
              </Text>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.routePoint}>
              <MapPin size={16} color="#ef4444" />
              <Text style={styles.routeText} numberOfLines={1}>
                {trip.dest_addr}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(trip.status) }]}>
            <Text style={styles.statusText}>{trip.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.tripDetails}>
          <View style={styles.tripDetailRow}>
            <Clock size={16} color="#a1a1aa" />
            <Text style={styles.tripDetailText}>{formatDate(trip.departure_datetime)}</Text>
          </View>
          <View style={styles.tripDetailRow}>
            <Users size={16} color="#a1a1aa" />
            <Text style={styles.tripDetailText}>{trip.available_seats} seats available</Text>
          </View>
          <View style={styles.tripDetailRow}>
            <DollarSign size={16} color="#a1a1aa" />
            <Text style={styles.tripDetailText}>LKR {trip.base_price}</Text>
          </View>
        </View>

        <View style={styles.tripFooter}>
          <View style={styles.bidInfo}>
            <Text style={styles.bidCount}>{trip.bids.length} bids</Text>
            {trip.bids.length > 0 && (
              <Text style={styles.highestBid}>
                Highest: LKR {Math.max(...trip.bids.map(b => b.bid_price))}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => {
              setSelectedTrip(trip);
              setShowTripDetails(true);
            }}
          >
            <Eye size={16} color="#3b82f6" />
            <Text style={styles.viewButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>

        {trip.bids.length > 0 && trip.status === 'open' && (
          <TouchableOpacity
            style={styles.confirmBidsButton}
            onPress={() => handleConfirmBids(trip.id)}
          >
            <Text style={styles.confirmBidsText}>Confirm Top Bids</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#ffffff" />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Driver Dashboard</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowFilters(true)}
          >
            <Filter size={20} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => router.push('/driver/trip-creation')}
          >
            <Plus size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <StatCard
          icon={<Car size={24} color="#3b82f6" />}
          title="Active Trips"
          value={stats.openTrips}
          subtitle="Currently posted"
        />
        <StatCard
          icon={<Calendar size={24} color="#3b82f6" />}
          title="Completed"
          value={stats.completedTrips}
          subtitle="This month"
        />
        <StatCard
          icon={<DollarSign size={24} color="#3b82f6" />}
          title="Total Bids"
          value={stats.totalBids}
          subtitle="Across all trips"
        />
        <StatCard
          icon={<Users size={24} color="#3b82f6" />}
          title="Earnings"
          value={`LKR`}
          subtitle="This month"
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Trips</Text>
          <TouchableOpacity onPress={() => router.push('/driver/trip-creation')}>
            <Text style={styles.createNew}>+ New Trip</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <Text style={styles.loadingText}>Loading your trips...</Text>
          </View>
        ) : filteredTrips.length > 0 ? (
          <ScrollView showsVerticalScrollIndicator={false}>
            {filteredTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <Car size={48} color="#a1a1aa" />
            <Text style={styles.emptyTitle}>
              {myTrips.length === 0 ? 'No trips posted' : 'No trips match your filters'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {myTrips.length === 0 
                ? 'Create your first trip to start earning'
                : 'Try adjusting your filters or create a new trip'
              }
            </Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => router.push('/driver/trip-creation')}
            >
              <Text style={styles.emptyButtonText}>Post a Trip</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Trips</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <X size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.statusFilters}>
                {['all', 'open', 'started', 'completed', 'cancelled'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusFilterButton,
                      statusFilter === status && styles.statusFilterButtonActive
                    ]}
                    onPress={() => setStatusFilter(status)}
                  >
                    <Text style={[
                      styles.statusFilterText,
                      statusFilter === status && styles.statusFilterTextActive
                    ]}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Minimum Available Seats</Text>
              <TextInput
                style={styles.filterInput}
                value={minSeatsFilter}
                onChangeText={setMinSeatsFilter}
                placeholder="Enter minimum seats"
                placeholderTextColor="#a1a1aa"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Price Range</Text>
              <View style={styles.priceInputs}>
                <TextInput
                  style={[styles.filterInput, styles.priceInput]}
                  value={minPriceFilter}
                  onChangeText={setMinPriceFilter}
                  placeholder="Min price"
                  placeholderTextColor="#a1a1aa"
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.filterInput, styles.priceInput]}
                  value={maxPriceFilter}
                  onChangeText={setMaxPriceFilter}
                  placeholder="Max price"
                  placeholderTextColor="#a1a1aa"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Trip Details Modal */}
      <Modal
        visible={showTripDetails}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTripDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedTrip && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Trip Details</Text>
                  <TouchableOpacity onPress={() => setShowTripDetails(false)}>
                    <X size={24} color="#ffffff" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.tripDetailsScroll}>
                  <View style={styles.tripDetailSection}>
                    <Text style={styles.sectionTitle}>Route</Text>
                    <View style={styles.routeDetails}>
                      <View style={styles.routeStop}>
                        <MapPin size={20} color="#3b82f6" />
                        <Text style={styles.routeStopText}>{selectedTrip.origin_addr}</Text>
                      </View>
                      <View style={styles.routeStop}>
                        <MapPin size={20} color="#ef4444" />
                        <Text style={styles.routeStopText}>{selectedTrip.dest_addr}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.tripDetailSection}>
                    <Text style={styles.sectionTitle}>Trip Information</Text>
                    <View style={styles.infoGrid}>
                      <View style={styles.infoItem}>
                        <Clock size={18} color="#a1a1aa" />
                        <Text style={styles.infoText}>
                          {new Date(selectedTrip.departure_datetime).toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Users size={18} color="#a1a1aa" />
                        <Text style={styles.infoText}>{selectedTrip.available_seats} seats</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <DollarSign size={18} color="#a1a1aa" />
                        <Text style={styles.infoText}>LKR {selectedTrip.base_price}</Text>
                      </View>
                    </View>
                    {selectedTrip.notes && (
                      <View style={styles.notesSection}>
                        <Text style={styles.notesLabel}>Notes:</Text>
                        <Text style={styles.notesText}>{selectedTrip.notes}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.tripDetailSection}>
                    <Text style={styles.sectionTitle}>Bids ({selectedTrip.bids.length})</Text>
                    {selectedTrip.bids.length > 0 ? (
                      selectedTrip.bids
                        .sort((a, b) => b.bid_price - a.bid_price)
                        .map((bid) => (
                          <View key={bid.id} style={styles.bidCard}>
                            <View style={styles.bidHeader}>
                              <Text style={styles.bidderName}>
                                {selectedTrip.bidUsers[bid.id]?.name || 'Unknown User'}
                              </Text>
                              <Text style={styles.bidPrice}>LKR {bid.bid_price}</Text>
                            </View>
                            <View style={styles.bidDetails}>
                              <Text style={styles.bidPickup}>
                                Pickup: {bid.pickup_addr}
                              </Text>
                              <Text style={styles.bidStatus}>Status: {bid.status}</Text>
                              <Text style={styles.bidDate}>
                                {new Date(bid.created_at).toLocaleDateString()}
                              </Text>
                            </View>
                            {selectedTrip.bidUsers[bid.id] && (
                              <View style={styles.userInfo}>
                                <Text style={styles.userDetail}>
                                  Email: {selectedTrip.bidUsers[bid.id].email}
                                </Text>
                                <Text style={styles.userDetail}>
                                  Phone: {selectedTrip.bidUsers[bid.id].phone || 'N/A'}
                                </Text>
                              </View>
                            )}
                          </View>
                        ))
                    ) : (
                      <Text style={styles.noBidsText}>No bids yet for this trip</Text>
                    )}
                  </View>
                </ScrollView>

                {selectedTrip.bids.length > 0 && selectedTrip.status === 'open' && (
                  <TouchableOpacity
                    style={styles.confirmBidsButton}
                    onPress={() => {
                      setShowTripDetails(false);
                      handleConfirmBids(selectedTrip.id);
                    }}
                  >
                    <Text style={styles.confirmBidsText}>Confirm Top Bids</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.sizes['2xl'],
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  filterButton: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: Spacing.sm,
  },
  createButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: Spacing.sm,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  section: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  createNew: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Medium',
    color: '#3b82f6',
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  loadingText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    color: '#a1a1aa',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: '#a1a1aa',
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  emptyButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  emptyButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
  },
  // Trip Card Styles
  tripCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: Spacing.lg,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  tripRoute: {
    flex: 1,
    marginRight: Spacing.md,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  routeText: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
    marginLeft: Spacing.xs,
    flex: 1,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#374151',
    marginLeft: 8,
    marginVertical: Spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: Typography.sizes.xs,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  tripDetails: {
    marginBottom: Spacing.md,
  },
  tripDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  tripDetailText: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: '#a1a1aa',
    marginLeft: Spacing.xs,
  },
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  bidInfo: {
    flex: 1,
  },
  bidCount: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  highestBid: {
    fontSize: Typography.sizes.xs,
    fontFamily: 'Inter-Regular',
    color: '#10b981',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  viewButtonText: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Medium',
    color: '#3b82f6',
    marginLeft: Spacing.xs,
  },
  confirmBidsButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  confirmBidsText: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  // Filter Styles
  filterGroup: {
    marginBottom: Spacing.lg,
  },
  filterLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
    marginBottom: Spacing.sm,
  },
  statusFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statusFilterButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    backgroundColor: '#374151',
  },
  statusFilterButtonActive: {
    backgroundColor: '#3b82f6',
  },
  statusFilterText: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Medium',
    color: '#a1a1aa',
  },
  statusFilterTextActive: {
    color: '#ffffff',
  },
  filterInput: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
  },
  priceInputs: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  priceInput: {
    flex: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
  },
  // Trip Details Modal Styles
  tripDetailsScroll: {
    maxHeight: '80%',
  },
  tripDetailSection: {
    marginBottom: Spacing.lg,
  },
  routeDetails: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: Spacing.md,
  },
  routeStop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  routeStopText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
    marginLeft: Spacing.sm,
    flex: 1,
  },
  infoGrid: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: Spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  infoText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
    marginLeft: Spacing.sm,
  },
  notesSection: {
    marginTop: Spacing.md,
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: Spacing.md,
  },
  notesLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: Spacing.xs,
  },
  notesText: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: '#a1a1aa',
  },
  bidCard: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  bidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  bidderName: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  bidPrice: {
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Bold',
    color: '#10b981',
  },
  bidDetails: {
    marginBottom: Spacing.sm,
  },
  bidPickup: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: '#a1a1aa',
    marginBottom: Spacing.xs,
  },
  bidStatus: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
    marginBottom: Spacing.xs,
  },
  bidDate: {
    fontSize: Typography.sizes.xs,
    fontFamily: 'Inter-Regular',
    color: '#6b7280',
  },
  userInfo: {
    borderTopWidth: 1,
    borderTopColor: '#4b5563',
    paddingTop: Spacing.sm,
  },
  userDetail: {
    fontSize: Typography.sizes.xs,
    fontFamily: 'Inter-Regular',
    color: '#a1a1aa',
    marginBottom: 2,
  },
  noBidsText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    color: '#a1a1aa',
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
});