import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Search, MapPin, Clock, Car, Plus, DollarSign, Users, Star, Calendar, Sun, Moon, ArrowRight } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { Spacing, Typography } from '@/constants/Spacing';
import { useAuth } from '@/contexts/AuthContext';

import { QuickSearchCard } from '@/components/QuickSearchCard';
import { Trip } from '@/types';
import { apiService, BackendTrip, BackendBooking } from '@/services/api';

export default function HomeScreen() {
  const { user } = useAuth();
  const [recentTrips, setRecentTrips] = useState<BackendTrip[]>([]);
  const [myTrips, setMyTrips] = useState<BackendTrip[]>([]);
  const [myBookings, setMyBookings] = useState<BackendBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }
    loadData();
  }, [user]);

  const isDriver = user?.role === 'driver';

  const loadData = async () => {
    try {
      if (isDriver) {
        // Load driver-specific data
        const [trips, bookings] = await Promise.all([
          apiService.getMyTrips(),
          apiService.listMyBookings()
        ]);
        setMyTrips(trips);
        setMyBookings(bookings);
      } else {
        // Load passenger-specific data
        const [trips, bookings] = await Promise.all([
          apiService.listTrips(), // Recent available trips
          apiService.listMyBookings()
        ]);
        setRecentTrips(trips.slice(0, 3)); // Show only first 3
        setMyBookings(bookings);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const navigateToSearch = () => {
    router.push('/passenger/trip_booking');
  };

  const navigateToCreateTrip = () => {
    router.push('/driver/trip-creation');
  };

  // Driver Home Screen
  if (isDriver) {
    return (
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#ffffff" />
        }
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>
            {new Date().getHours() < 12 ? <Sun size={20} color="#3b82f6" /> : <Moon size={20} color="#3b82f6" />} 
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, <Text style={{ color: '#3b82f6' }}>{user?.name}</Text>!
          </Text>
          <Text style={styles.subtitle}>Ready to earn today?</Text>
        </View>

        {/* Driver Quick Actions */}
        <View style={styles.driverActions}>
          <TouchableOpacity style={styles.primaryAction} onPress={navigateToCreateTrip} activeOpacity={0.8}>
            <Plus size={24} color="#ffffff" />
            <Text style={styles.primaryActionText}>Create New Trip</Text>
          </TouchableOpacity>
        </View>

        {/* Driver Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Car size={22} color="#3b82f6" />
            </View>
            <Text style={styles.statValue}>{(myTrips || []).length}</Text>
            <Text style={styles.statLabel}>Active Trips</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Star size={22} color="#3b82f6" />
            </View>
            <Text style={styles.statValue}>{(user?.rating || 0).toFixed(1)}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>

          {/* {myBookings && (
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <DollarSign size={20} color={Colors.success[600]} />
              </View>
              <Text style={styles.statValue}>
                ${(myBookings || []).reduce((sum, booking) => sum + booking.fare, 0).toFixed(0)}
              </Text>
              <Text style={styles.statLabel}>Earnings</Text>
            </View>
          )} */}
        </View>

        {/* Recent Trips Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Recent Trips</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/driver')} style={styles.seeAllBtn} activeOpacity={0.7}>
              <Text style={styles.seeAll}>Manage all</Text>
              <ArrowRight size={16} color="#3b82f6" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingState}>
              <Text style={styles.loadingText}>Loading your trips...</Text>
            </View>
          ) : (myTrips || []).length === 0 ? (
            <View style={styles.emptyState}>
              <Car size={48} color="#a1a1aa" />
              <Text style={styles.emptyTitle}>No trips yet</Text>
              <Text style={styles.emptySubtitle}>Create your first trip to start earning</Text>
              <TouchableOpacity style={styles.emptyAction} onPress={navigateToCreateTrip} activeOpacity={0.8}>
                <Text style={styles.emptyActionText}>Create Trip</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.tripsList}>
              {(myTrips || []).slice(0, 2).map((trip) => (
                <View key={trip.id} style={styles.tripCard}>
                  <View style={styles.tripHeader}>
                    <Text style={styles.tripRoute}>
                      {trip.origin_addr} <ArrowRight size={16} color="#3b82f6" /> {trip.dest_addr}
                    </Text>
                    <Text style={styles.tripPrice}>${trip.base_price}</Text>
                  </View>
                  <Text style={styles.tripTime}>
                    {new Date(trip.departure_datetime).toLocaleDateString()} at{' '}
                    {new Date(trip.departure_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text style={styles.tripSeats}>{trip.available_seats} seats available</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    );
  }

  // Passenger Home Screen
  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#ffffff" />
      }
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>
          {new Date().getHours() < 12 ? <Sun size={20} color="#3b82f6" /> : <Moon size={20} color="#3b82f6" />} 
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, <Text style={{ color: '#3b82f6' }}>{user?.name}</Text>!
        </Text>
        <Text style={styles.subtitle}>Where would you like to go today?</Text>
      </View>

      <TouchableOpacity style={styles.searchButton} onPress={navigateToSearch} activeOpacity={0.8}>
        <Search size={22} color="#3b82f6" />
        <Text style={styles.searchPlaceholder}>Search for trips...</Text>
      </TouchableOpacity>

      <View style={styles.quickActions}>
        <QuickSearchCard
          icon={<MapPin size={24} color="#3b82f6" />}
          title="Popular Routes"
          subtitle="Colombo ↔ Kandy"
          onPress={navigateToSearch}
        />
        <QuickSearchCard
          icon={<Clock size={24} color="#3b82f6" />}
          title="Quick Book"
          subtitle="Next 2 hours"
          onPress={navigateToSearch}
        />
      </View>

      {/* My Bookings Section */}
      {(myBookings || []).length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Upcoming Trips</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/bookings')} style={styles.seeAllBtn} activeOpacity={0.7}>
              <Text style={styles.seeAll}>See all</Text>
              <ArrowRight size={16} color="#3b82f6" />
            </TouchableOpacity>
          </View>

          <View style={styles.bookingsList}>
            {(myBookings || []).slice(0, 2).map((booking) => (
              <View key={booking.id} style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                  <Calendar size={16} color="#3b82f6" />
                  <Text style={styles.bookingStatus}>{booking.status}</Text>
                </View>
                <Text style={styles.bookingFare}>${booking.fare}</Text>
                <Text style={styles.bookingMethod}>Payment: {booking.payment_method}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available Trips</Text>
          <TouchableOpacity onPress={navigateToSearch}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <Text style={styles.loadingText}>Loading trips...</Text>
          </View>
        ) : recentTrips.length === 0 ? (
          <View style={styles.emptyState}>
            <Search size={48} color="#a1a1aa" />
            <Text style={styles.emptyTitle}>No trips available</Text>
            <Text style={styles.emptySubtitle}>Try searching for trips in your area</Text>
            <TouchableOpacity style={styles.emptyAction} onPress={navigateToSearch} activeOpacity={0.8}>
              <Text style={styles.emptyActionText}>Search Trips</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.tripsList}>
            {recentTrips.map((trip) => (
              <TouchableOpacity 
                key={trip.id} 
                style={styles.tripCard}
                onPress={() => router.push('/(tabs)/bookings')} // TODO: Navigate to trip details
                activeOpacity={0.8}
              >
                <View style={styles.tripHeader}>
                  <Text style={styles.tripRoute}>
                    {trip.origin_addr} <ArrowRight size={16} color="#3b82f6" /> {trip.dest_addr}
                  </Text>
                  <Text style={styles.tripPrice}>${trip.base_price}</Text>
                </View>
                <Text style={styles.tripTime}>
                  {new Date(trip.departure_datetime).toLocaleDateString()} at{' '}
                  {new Date(trip.departure_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Text style={styles.tripSeats}>{trip.available_seats} seats available</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.lg,
  },
  greeting: {
    fontSize: Typography.sizes['2xl'],
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    color: '#a1a1aa',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  searchPlaceholder: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    color: '#a1a1aa',
    marginLeft: Spacing.sm,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
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
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  seeAll: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Medium',
    color: '#3b82f6',
    marginRight: 2,
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
    paddingVertical: Spacing.xl,
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
  },
  // Driver-specific styles
  driverActions: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  primaryAction: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: 16,
    gap: Spacing.sm,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryActionText: {
    color: '#ffffff',
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Bold',
    marginLeft: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  statCard: {
    backgroundColor: '#1a1a1a',
    flex: 1,
    minWidth: '48%',
    padding: Spacing.md,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: Typography.sizes.xl,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: 'Inter-Regular',
    color: '#a1a1aa',
    textAlign: 'center',
  },
  tripsList: {
    gap: Spacing.sm,
  },
  tripCard: {
    backgroundColor: '#1a1a1a',
    padding: Spacing.md,
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 4,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  tripRoute: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tripPrice: {
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Bold',
    color: '#3b82f6',
  },
  tripTime: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: '#a1a1aa',
    marginBottom: 2,
  },
  tripSeats: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: '#a1a1aa',
  },
  emptyAction: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 10,
    marginTop: Spacing.md,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyActionText: {
    color: '#ffffff',
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Medium',
  },
  // Passenger-specific styles
  bookingsList: {
    gap: Spacing.sm,
  },
  bookingCard: {
    backgroundColor: '#1a1a1a',
    padding: Spacing.md,
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 4,
  },
  bookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  bookingStatus: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Medium',
    color: '#3b82f6',
    textTransform: 'capitalize',
  },
  bookingFare: {
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  bookingMethod: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: '#a1a1aa',
  },
});