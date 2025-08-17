import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MapPin, Clock, Users, Star, CreditCard } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { Spacing, Typography } from '@/constants/Spacing';
import { Booking } from '@/types';

interface BookingCardProps {
  booking: Booking;
  onPress: () => void;
}

export function BookingCard({ booking, onPress }: BookingCardProps) {
  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (dateTime: string) => {
    return new Date(dateTime).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'booked':
        return Colors.warning[500];
      case 'picked_up':
        return Colors.primary[500];
      case 'completed':
        return Colors.success[500];
      case 'cancelled':
        return Colors.error[500];
      default:
        return Colors.neutral[500];
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(booking.status) }]} />
          <Text style={styles.statusText}>
            {booking.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
        <Text style={styles.date}>
          {formatDate(booking.trip.departure_datetime)}
        </Text>
      </View>

      <View style={styles.driverInfo}>
        <View style={styles.driverAvatar}>
          <Text style={styles.driverInitial}>
            {(booking.driver.name || 'D').charAt(0)}
          </Text>
        </View>
        <View style={styles.driverDetails}>
          <Text style={styles.driverName}>
            {booking.driver.name || ''}
          </Text>
          <View style={styles.ratingContainer}>
            <Star size={14} color={Colors.accent[500]} fill={Colors.accent[500]} />
            <Text style={styles.rating}>{(booking.driver.rating || 0).toFixed(1)}</Text>
          </View>
        </View>
        <View style={styles.fareContainer}>
          <Text style={styles.fare}>LKR {booking.fare}</Text>
          <View style={styles.paymentStatus}>
            <CreditCard size={12} color={Colors.neutral[500]} />
            <Text style={styles.paymentText}>
              {booking.payment_status === 'completed' ? 'Paid' : 'Pending'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.routeContainer}>
        <View style={styles.locationRow}>
          <MapPin size={14} color={Colors.success[600]} />
          <Text style={styles.locationText} numberOfLines={1}>
            {booking.trip.origin.address}
          </Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.locationRow}>
          <MapPin size={14} color={Colors.error[600]} />
          <Text style={styles.locationText} numberOfLines={1}>
            {booking.trip.destination.address}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Clock size={14} color={Colors.neutral[500]} />
          <Text style={styles.detailText}>
            {formatTime(booking.trip.departure_datetime)}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <MapPin size={14} color={Colors.primary[600]} />
          <Text style={styles.detailText} numberOfLines={1}>
            {booking.pickup_point.address}
          </Text>
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
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  statusText: {
    fontSize: Typography.sizes.xs,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[700],
  },
  date: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[600],
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  driverAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  driverInitial: {
    fontSize: Typography.sizes.base,
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
  fareContainer: {
    alignItems: 'flex-end',
  },
  fare: {
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Bold',
    color: Colors.primary[600],
    marginBottom: 2,
  },
  paymentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentText: {
    fontSize: Typography.sizes.xs,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[500],
    marginLeft: 4,
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
    height: 20,
    width: 2,
    backgroundColor: Colors.neutral[200],
    marginLeft: 7,
    marginVertical: 2,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
});