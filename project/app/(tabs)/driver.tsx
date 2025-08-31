import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Plus, Car, Calendar, DollarSign, Users } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { Spacing, Typography } from '@/constants/Spacing';
import { useAuth } from '@/contexts/AuthContext';

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
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#ffffff" />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Driver Dashboard</Text>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => router.push('/driver/trip-creation')}
        >
          <Plus size={20} color="#ffffff" />
        </TouchableOpacity>
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
        ) : (
          <View style={styles.emptyState}>
            <Car size={48} color="#a1a1aa" />
            <Text style={styles.emptyTitle}>No trips posted</Text>
            <Text style={styles.emptySubtitle}>
              Create your first trip to start earning
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
  createButton: {
    backgroundColor: '#3b82f6',
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
});