import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MapPin, Clock, Users, Star, DollarSign } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { Spacing, Typography } from '@/constants/Spacing';
import { useAuth } from '@/contexts/AuthContext';
import { BidCard } from '@/components/BidCard';
import { Trip, Bid } from '@/types';
import { apiService } from '@/services/api';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidLoading, setBidLoading] = useState(false);

  useEffect(() => {
    if (!user || !id) {
      router.replace('/(auth)/login');
      return;
    }
    loadTripDetails();
  }, [user, id]);

  const loadTripDetails = async () => {
    try {
      const [tripData, bidsData] = await Promise.all([
        apiService.getTrip(id!),
        apiService.getTripBids(id!)
      ]);
      setTrip(tripData);
      setBids(bidsData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load trip details');
      console.error('Failed to load trip details:', error);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceBid = () => {
    router.push({
      pathname: '/place-bid',
      params: { tripId: id! }
    });
  };

  const handleBookAtBasePrice = async () => {
    if (!trip) return;

    Alert.alert(
      'Confirm Booking',
      `Book this trip for LKR ${trip.base_price_per_seat} per seat?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Book Now',
          onPress: async () => {
            setBidLoading(true);
            try {
              await apiService.placeBid(trip.id, {
                bid_price: trip.base_price_per_seat,
                pickup_point: trip.origin,
              });
              Alert.alert('Success', 'Booking request sent!');
              await loadTripDetails();
            } catch (error) {
              Alert.alert('Error', 'Failed to book trip');
            } finally {
              setBidLoading(false);
            }
          }
        }
      ]
    );
  };

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (dateTime: string) => {
    return new Date(dateTime).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading || !trip) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading trip details...</Text>
      </View>
    );
  }

  const userBid = bids.find(bid => bid.passenger_id === user?.id);
  const highestBid = Math.max(...bids.map(bid => bid.bid_price), 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.neutral[900]} />
        </TouchableOpacity>
        <Text style={styles.title}>Trip Details</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.tripCard}>
          <View style={styles.driverSection}>
            <View style={styles.driverAvatar}>
              <Text style={styles.driverInitial}>
                {trip.driver.first_name.charAt(0)}
              </Text>
            </View>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>
                {trip.driver.first_name} {trip.driver.last_name}
              </Text>
              <View style={styles.ratingContainer}>
                <Star size={16} color={Colors.accent[500]} fill={Colors.accent[500]} />
                <Text style={styles.rating}>{trip.driver.rating.toFixed(1)}</Text>
                <Text style={styles.ratingCount}>(based on trips)</Text>
              </View>
            </View>
          </View>

          <View style={styles.routeSection}>
            <Text style={styles.sectionTitle}>Route</Text>
            <View style={styles.routeContainer}>
              <View style={styles.locationRow}>
                <MapPin size={18} color={Colors.success[600]} />
                <View style={styles.locationDetails}>
                  <Text style={styles.locationLabel}>From</Text>
                  <Text style={styles.locationText}>{trip.origin.address}</Text>
                </View>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.locationRow}>
                <MapPin size={18} color={Colors.error[600]} />
                <View style={styles.locationDetails}>
                  <Text style={styles.locationLabel}>To</Text>
                  <Text style={styles.locationText}>{trip.destination.address}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Trip Details</Text>
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Clock size={16} color={Colors.primary[600]} />
                <Text style={styles.detailLabel}>Departure</Text>
                <Text style={styles.detailValue}>
                  {formatDate(trip.departure_datetime)}
                </Text>
                <Text style={styles.detailValue}>
                  {formatTime(trip.departure_datetime)}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Users size={16} color={Colors.secondary[600]} />
                <Text style={styles.detailLabel}>Available Seats</Text>
                <Text style={styles.detailValue}>{trip.available_seats}</Text>
              </View>
              <View style={styles.detailItem}>
                <DollarSign size={16} color={Colors.accent[600]} />
                <Text style={styles.detailLabel}>Base Price</Text>
                <Text style={styles.detailValue}>LKR {trip.base_price_per_seat}</Text>
              </View>
            </View>
          </View>

          {bids.length > 0 && (
            <View style={styles.biddingSection}>
              <Text style={styles.sectionTitle}>
                Current Bids ({bids.length})
              </Text>
              <Text style={styles.highestBid}>
                Highest bid: LKR {highestBid}
              </Text>
              {userBid && (
                <View style={styles.userBidContainer}>
                  <Text style={styles.userBidLabel}>Your bid:</Text>
                  <Text style={styles.userBidAmount}>LKR {userBid.bid_price}</Text>
                  <Text style={[styles.userBidStatus, styles[`status${userBid.status.charAt(0).toUpperCase() + userBid.status.slice(1)}`]]}>
                    {userBid.status.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {user?.role === 'passenger' && trip.status === 'open' && (
        <View style={styles.actions}>
          {!userBid && (
            <>
              <TouchableOpacity 
                style={styles.bidButton} 
                onPress={handlePlaceBid}
                disabled={bidLoading}
              >
                <Text style={styles.bidButtonText}>Place Bid</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.bookButton} 
                onPress={handleBookAtBasePrice}
                disabled={bidLoading}
              >
                <Text style={styles.bookButtonText}>
                  Book at LKR {trip.base_price_per_seat}
                </Text>
              </TouchableOpacity>
            </>
          )}
          {userBid && userBid.status === 'open' && (
            <TouchableOpacity 
              style={styles.updateBidButton} 
              onPress={handlePlaceBid}
            >
              <Text style={styles.updateBidButtonText}>Update Bid</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
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
  },
  tripCard: {
    backgroundColor: Colors.white,
    margin: Spacing.xl,
    borderRadius: 16,
    padding: Spacing.xl,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  driverSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  driverAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  driverInitial: {
    fontSize: Typography.sizes.xl,
    fontFamily: 'Inter-Bold',
    color: Colors.primary[600],
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
    marginBottom: Spacing.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[700],
    marginLeft: 4,
    marginRight: Spacing.xs,
  },
  ratingCount: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[500],
  },
  routeSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
    marginBottom: Spacing.md,
  },
  routeContainer: {},
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  locationDetails: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  locationLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[500],
    marginBottom: 2,
  },
  locationText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[900],
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: Colors.neutral[200],
    marginLeft: 8,
    marginBottom: Spacing.md,
  },
  detailsSection: {
    marginBottom: Spacing.xl,
  },
  detailsGrid: {
    gap: Spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[50],
    borderRadius: 8,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  detailLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[600],
    flex: 1,
  },
  detailValue: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
  },
  biddingSection: {
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
  },
  highestBid: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Bold',
    color: Colors.accent[600],
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  userBidContainer: {
    backgroundColor: Colors.primary[50],
    borderRadius: 8,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userBidLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Medium',
    color: Colors.primary[700],
  },
  userBidAmount: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Bold',
    color: Colors.primary[800],
  },
  userBidStatus: {
    fontSize: Typography.sizes.xs,
    fontFamily: 'Inter-Bold',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusOpen: {
    backgroundColor: Colors.warning[100],
    color: Colors.warning[700],
  },
  statusAccepted: {
    backgroundColor: Colors.success[100],
    color: Colors.success[700],
  },
  statusRejected: {
    backgroundColor: Colors.error[100],
    color: Colors.error[700],
  },
  actions: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  bidButton: {
    backgroundColor: Colors.accent[600],
    borderRadius: 12,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  bidButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Bold',
    color: Colors.white,
  },
  bookButton: {
    backgroundColor: Colors.primary[600],
    borderRadius: 12,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Bold',
    color: Colors.white,
  },
  updateBidButton: {
    backgroundColor: Colors.secondary[600],
    borderRadius: 12,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  updateBidButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Bold',
    color: Colors.white,
  },
});