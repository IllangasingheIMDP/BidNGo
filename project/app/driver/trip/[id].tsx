import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Users, DollarSign, Clock, MapPin } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { Spacing, Typography } from '@/constants/Spacing';
import { useAuth } from '@/contexts/AuthContext';
import { BidCard } from '@/components/BidCard';
import { Trip, Bid } from '@/types';
import { apiService } from '@/services/api';

export default function DriverTripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'driver' || !id) {
      router.replace('/(tabs)');
      return;
    }
    loadTripData();
  }, [user, id]);

  const loadTripData = async () => {
    try {
      const [tripData, bidsData] = await Promise.all([
        apiService.getTrip(id!),
        apiService.getTripBids(id!)
      ]);
      setTrip(tripData);
      setBids(bidsData.sort((a, b) => b.bid_price - a.bid_price)); // Sort by price descending
    } catch (error) {
      Alert.alert('Error', 'Failed to load trip details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTripData();
    setRefreshing(false);
  };

  const handleAcceptBid = async (bidId: string, bidPrice: number) => {
    if (!trip) return;

    Alert.alert(
      'Accept Bid',
      `Accept bid of LKR ${bidPrice} from this passenger?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              const result = await apiService.acceptBid(trip.id, bidId);
              Alert.alert(
                'Bid Accepted!',
                `Booking confirmed for LKR ${result.fare}. The passenger has been notified.`,
                [{ text: 'OK', onPress: () => router.replace('/(tabs)/bookings') }]
              );
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Failed to accept bid';
              if (message.includes('seats_unavailable')) {
                Alert.alert('Error', 'Sorry, no seats are available anymore.');
              } else {
                Alert.alert('Error', message);
              }
              await loadTripData(); // Refresh data
            }
          }
        }
      ]
    );
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (loading || !trip) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading trip details...</Text>
      </View>
    );
  }

  const openBids = bids.filter(bid => bid.status === 'open');
  const acceptedBids = bids.filter(bid => bid.status === 'accepted');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.neutral[900]} />
        </TouchableOpacity>
        <Text style={styles.title}>Manage Trip</Text>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.tripCard}>
          <Text style={styles.routeText}>
            {trip.origin.address} → {trip.destination.address}
          </Text>
          <Text style={styles.timeText}>
            {formatDateTime(trip.departure_datetime)}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Users size={16} color={Colors.secondary[600]} />
              <Text style={styles.statText}>{trip.available_seats} seats left</Text>
            </View>
            <View style={styles.statItem}>
              <DollarSign size={16} color={Colors.accent[600]} />
              <Text style={styles.statText}>LKR {trip.base_price_per_seat} base</Text>
            </View>
          </View>

          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, styles[`status${trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}`]]}>
              <Text style={styles.statusText}>{trip.status.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {acceptedBids.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Confirmed Passengers ({acceptedBids.length})
            </Text>
            {acceptedBids.map((bid) => (
              <BidCard
                key={bid.id}
                bid={bid}
                onPress={() => router.push(`/booking/${bid.id}`)}
              />
            ))}
          </View>
        )}

        {openBids.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Pending Bids ({openBids.length})
            </Text>
            <Text style={styles.sectionSubtitle}>
              Tap to view details, then accept your preferred bid
            </Text>
            {openBids.map((bid) => (
              <BidCard
                key={bid.id}
                bid={bid}
                onAccept={() => handleAcceptBid(bid.id, bid.bid_price)}
                showAcceptButton={trip.status === 'open' && trip.available_seats > 0}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyBids}>
            <DollarSign size={48} color={Colors.neutral[400]} />
            <Text style={styles.emptyTitle}>No bids yet</Text>
            <Text style={styles.emptySubtitle}>
              Passengers will start bidding on your trip soon
            </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.neutral[50],
  },
  loadingText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[500],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  backButton: {
    marginRight: Spacing.md,
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  tripCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  routeText: {
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
    marginBottom: Spacing.xs,
  },
  timeText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[600],
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[700],
    marginLeft: Spacing.xs,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusOpen: {
    backgroundColor: Colors.success[100],
  },
  statusStarted: {
    backgroundColor: Colors.warning[100],
  },
  statusCompleted: {
    backgroundColor: Colors.neutral[100],
  },
  statusCancelled: {
    backgroundColor: Colors.error[100],
  },
  statusText: {
    fontSize: Typography.sizes.xs,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[700],
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[500],
    marginBottom: Spacing.md,
  },
  emptyBids: {
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
  },
});