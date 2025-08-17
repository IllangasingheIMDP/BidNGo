import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Search, MapPin, Clock, TrendingUp } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { Spacing, Typography } from '@/constants/Spacing';
import { useAuth } from '@/contexts/AuthContext';

import { QuickSearchCard } from '@/components/QuickSearchCard';
import { Trip } from '@/types';
import { apiService } from '@/services/api';

export default function HomeScreen() {
  const { user } = useAuth();
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }
    loadRecentTrips();
  }, [user]);

  const loadRecentTrips = async () => {
    try {
      // Get recent trips based on user's common routes or popular trips
      const trips = await apiService.searchTrips({
        origin: { lat: 6.9271, lng: 79.8612, address: 'Colombo' },
        destination: { lat: 7.2906, lng: 80.6337, address: 'Kandy' },
        date: new Date().toISOString().split('T')[0],
      });
      
    } catch (error) {
      console.error('Failed to load recent trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRecentTrips();
    setRefreshing(false);
  };

  const navigateToSearch = () => {
    router.push('/search');
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.name}!
        </Text>
        <Text style={styles.subtitle}>Where would you like to go today?</Text>
      </View>

      <TouchableOpacity style={styles.searchButton} onPress={navigateToSearch}>
        <Search size={20} color={Colors.neutral[500]} />
        <Text style={styles.searchPlaceholder}>Search for trips...</Text>
      </TouchableOpacity>

      <View style={styles.quickActions}>
        <QuickSearchCard
          icon={<MapPin size={24} color={Colors.primary[600]} />}
          title="Popular Routes"
          subtitle="Colombo ↔ Kandy"
          onPress={() => router.push('/search?route=colombo-kandy')}
        />
        <QuickSearchCard
          icon={<Clock size={24} color={Colors.secondary[600]} />}
          title="Quick Book"
          subtitle="Next 2 hours"
          onPress={() => router.push('/search?time=quick')}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Trips</Text>
          <TouchableOpacity onPress={navigateToSearch}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        
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
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.lg,
  },
  greeting: {
    fontSize: Typography.sizes['2xl'],
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[600],
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  searchPlaceholder: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[500],
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
    color: Colors.neutral[900],
  },
  seeAll: {
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
    paddingVertical: Spacing.xl,
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
  },
});