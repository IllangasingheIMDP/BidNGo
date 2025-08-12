import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Star, MapPin, Clock } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '@/constants/Colors';
import { Bid } from '@/types';

interface BidCardProps {
  bid: Bid;
  onPress?: () => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

export function BidCard({ bid, onPress, onAccept, showAcceptButton = false }: BidCardProps) {
  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return Colors.success[500];
      case 'rejected':
        return Colors.error[500];
      case 'withdrawn':
        return Colors.neutral[500];
      default:
        return Colors.warning[500];
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.passengerInfo}>
          <View style={styles.passengerAvatar}>
            <Text style={styles.passengerInitial}>
              {bid.passenger.first_name.charAt(0)}
            </Text>
          </View>
          <View style={styles.passengerDetails}>
            <Text style={styles.passengerName}>
              {bid.passenger.first_name} {bid.passenger.last_name}
            </Text>
            <View style={styles.ratingContainer}>
              <Star size={14} color={Colors.accent[500]} fill={Colors.accent[500]} />
              <Text style={styles.rating}>{bid.passenger.rating.toFixed(1)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.bidAmount}>
          <Text style={styles.price}>LKR {bid.bid_price}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(bid.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(bid.status) }]}>
              {bid.status.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.pickupInfo}>
        <MapPin size={14} color={Colors.primary[600]} />
        <Text style={styles.pickupText} numberOfLines={1}>
          Pickup: {bid.pickup_point.address}
        </Text>
      </View>

      <View style={styles.timeInfo}>
        <Clock size={14} color={Colors.neutral[500]} />
        <Text style={styles.timeText}>
          Bid placed {formatTime(bid.created_at)}
        </Text>
      </View>

      {showAcceptButton && bid.status === 'open' && onAccept && (
        <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
          <Text style={styles.acceptButtonText}>Accept Bid</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  passengerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  passengerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.secondary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  passengerInitial: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Bold',
    color: Colors.secondary[600],
  },
  passengerDetails: {
    flex: 1,
  },
  passengerName: {
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
  bidAmount: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Bold',
    color: Colors.accent[600],
    marginBottom: Spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: Typography.sizes.xs,
    fontFamily: 'Inter-Bold',
  },
  pickupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  pickupText: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[700],
    marginLeft: Spacing.xs,
    flex: 1,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  timeText: {
    fontSize: Typography.sizes.xs,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[500],
    marginLeft: Spacing.xs,
  },
  acceptButton: {
    backgroundColor: Colors.success[600],
    borderRadius: 8,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  acceptButtonText: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Bold',
    color: Colors.white,
  },
});