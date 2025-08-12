import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MapPin, Clock, Users, Star, ArrowRight } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '@/constants/Colors';
import { Trip } from '@/types';

interface TripCardProps {
  trip: Trip;
  onPress: () => void;
  showBidding?: boolean;
}

export function TripCard({ trip, onPress, showBidding = false }: TripCardProps) {
  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (dateTime: string) => {
    return new Date(dateTime).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.driverInfo}>
          <View style={styles.driverAvatar}>
            <Text style={styles.driverInitial}>
              {trip.driver.first_name.charAt(0)}
            </Text>
          </View>
          <View style={styles.driverDetails}>
            <Text style={styles.driverName}>
              {trip.driver.first_name} {trip.driver.last_name}
            </Text>
            <View style={styles.ratingContainer}>
              <Star size={14} color={Colors.accent[500]} fill={Colors.accent[500]} />
              <Text style={styles.rating}>{trip.driver.rating.toFixed(1)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>LKR {trip.base_price_per_seat}</Text>
          <Text style={styles.priceLabel}>per seat</Text>
        </View>
      </View>

      <View style={styles.routeContainer}>
        <View style={styles.locationRow}>
          <MapPin size={16} color={Colors.success[600]} />
          <Text style={styles.locationText} numberOfLines={1}>
            {trip.origin.address}
          </Text>
        </View>
        <View style={styles.routeLine}>
          <View style={styles.routeDot} />
          <View style={styles.routeDash} />
          <ArrowRight size={16} color={Colors.neutral[400]} />
        </View>
        <View style={styles.locationRow}>
          <MapPin size={16} color={Colors.error[600]} />
          <Text style={styles.locationText} numberOfLines={1}>
            {trip.destination.address}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Clock size={16} color={Colors.neutral[500]} />
          <Text style={styles.detailText}>
            {formatDate(trip.departure_datetime)} at {formatTime(trip.departure_datetime)}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Users size={16} color={Colors.neutral[500]} />
          <Text style={styles.detailText}>
            {trip.available_seats} seat{trip.available_seats !== 1 ? 's' : ''} available
          </Text>
        </View>
      </View>

      {showBidding && trip.bid_count > 0 && (
        <View style={styles.biddingInfo}>
          <View style={styles.bidBadge}>
            <Text style={styles.bidText}>
              {trip.bid_count} bid{trip.bid_count !== 1 ? 's' : ''}
            </Text>
            {trip.highest_bid && (
              <Text style={styles.highestBid}>
                Highest: LKR {trip.highest_bid}
              </Text>
            )}
          </View>
        </View>
      )}

      <View style={styles.statusContainer}>
        <View style={[styles.statusBadge, styles[`status${trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}`]]}>
          <Text style={styles.statusText}>{trip.status.toUpperCase()}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  driverInitial: {
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Bold',
    color: Colors.primary[600],
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[900],
    marginBottom: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[600],
    marginLeft: 4,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Bold',
    color: Colors.primary[600],
  },
  priceLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[500],
  },
  routeContainer: {
    marginBottom: Spacing.md,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  locationText: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[700],
    marginLeft: Spacing.sm,
    flex: 1,
  },
  routeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    marginVertical: Spacing.xs,
  },
  routeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.neutral[300],
    marginRight: 4,
  },
  routeDash: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.neutral[200],
    marginRight: Spacing.sm,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailText: {
    fontSize: Typography.sizes.xs,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[600],
    marginLeft: Spacing.xs,
  },
  biddingInfo: {
    marginBottom: Spacing.sm,
  },
  bidBadge: {
    backgroundColor: Colors.accent[50],
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  bidText: {
    fontSize: Typography.sizes.xs,
    fontFamily: 'Inter-Medium',
    color: Colors.accent[700],
  },
  highestBid: {
    fontSize: Typography.sizes.xs,
    fontFamily: 'Inter-Bold',
    color: Colors.accent[800],
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
});