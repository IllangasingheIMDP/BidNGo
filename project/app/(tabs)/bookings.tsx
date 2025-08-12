import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Calendar, Clock, MapPin } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { Spacing, Typography } from '@/constants/Spacing';
import { useAuth } from '@/contexts/AuthContext';
import { BookingCard } from '@/components/BookingCard';
import { Booking } from '@/types';
import { apiService } from '@/services/api';

export default function BookingsScreen() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
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
      const userBookings = await apiService.getMyBookings();
      setBookings(userBookings);
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
    switch (filter) {
      case 'upcoming':
        return bookings.filter(booking => 
          new Date(booking.trip.departure_datetime) > now && 
          booking.status !== 'cancelled'
        );
      case 'completed':
        return bookings.filter(booking => 
          booking.status === 'completed' || 
          new Date(booking.trip.departure_datetime) < now
        );
      default:
        return bookings;
    }
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
          filteredBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onPress={() => router.push(`/booking/${booking.id}`)}
            />
          ))
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
                onPress={() => router.push('/search')}
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
});