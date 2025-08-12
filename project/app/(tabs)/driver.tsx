import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Plus, Car, Calendar, DollarSign, Users } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { Spacing, Typography } from '@/constants/Spacing';
import { useAuth } from '@/contexts/AuthContext';
import { TripCard } from '@/components/TripCard';
import { StatCard } from '@/components/StatCard';
import { Trip } from '@/types';
import { apiService } from '@/services/api';

export default function DriverScreen() {
  const { user } = useAuth();
  const [myTrips, setMyTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const loadMyTrips = async () => {
    try {
      const trips = await apiService.getMyTrips();
      setMyTrips(trips);
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

  const getStats = () => {
    const openTrips = myTrips.filter(trip => trip.status === 'open').length;
    const completedTrips = myTrips.filter(trip => trip.status === 'completed').length;
    const totalBids = myTrips.reduce((sum, trip) => sum + trip.bid_count, 0);
    const totalEarnings = user && 'earnings' in user ? user.earnings : 0;

    return { openTrips, completedTrips, totalBids, totalEarnings };
  };

  const stats = getStats();

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Driver Dashboard</Text>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => router.push('/create-trip')}
        >
          <Plus size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <StatCard
          icon={<Car size={24} color={Colors.primary[600]} />}
          title="Active Trips"
          value={stats.openTrips}
          subtitle="Currently posted"
        />
        <StatCard
          icon={<Calendar size={24} color={Colors.success[600]} />}
          title="Completed"
          value={stats.completedTrips}
          subtitle="This month"
        />
        <StatCard
          icon={<DollarSign size={24} color={Colors.accent[600]} />}
          title="Total Bids"
          value={stats.totalBids}
          subtitle="Across all trips"
        />
        <StatCard
          icon={<Users size={24} color={Colors.secondary[600]} />}
          title="Earnings"
          value={`LKR ${stats.totalEarnings.toLocaleString()}`}
          subtitle="This month"
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Trips</Text>
          <TouchableOpacity onPress={() => router.push('/create-trip')}>
            <Text style={styles.createNew}>+ New Trip</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <Text style={styles.loadingText}>Loading your trips...</Text>
          </View>
        ) : myTrips.length > 0 ? (
          myTrips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              onPress={() => router.push(`/driver/trip/${trip.id}`)}
              showBidding={true}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Car size={48} color={Colors.neutral[400]} />
            <Text style={styles.emptyTitle}>No trips posted</Text>
            <Text style={styles.emptySubtitle}>
              Create your first trip to start earning
            </Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => router.push('/create-trip')}
            >
              <Text style={styles.emptyButtonText}>Post a Trip</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
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
    color: Colors.neutral[900],
  },
  createButton: {
    backgroundColor: Colors.primary[600],
    borderRadius: 12,
    padding: Spacing.sm,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    color: Colors.neutral[900],
  },
  createNew: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Medium',
    color: Colors.primary[600],
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
});