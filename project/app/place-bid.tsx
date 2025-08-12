import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MapPin, DollarSign } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { Spacing, Typography } from '@/constants/Spacing';
import { LocationPicker } from '@/components/LocationPicker';
import { Trip, Location, Bid } from '@/types';
import { apiService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

export default function PlaceBidScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { user } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [existingBid, setExistingBid] = useState<Bid | null>(null);
  const [bidPrice, setBidPrice] = useState('');
  const [pickupPoint, setPickupPoint] = useState<Location | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user || !tripId) {
      router.replace('/(auth)/login');
      return;
    }
    loadTripAndBid();
  }, [user, tripId]);

  const loadTripAndBid = async () => {
    try {
      const [tripData, bidsData] = await Promise.all([
        apiService.getTrip(tripId!),
        apiService.getTripBids(tripId!)
      ]);
      
      setTrip(tripData);
      
      // Check if user already has a bid
      const userBid = bidsData.find(bid => bid.passenger_id === user?.id);
      if (userBid) {
        setExistingBid(userBid);
        setBidPrice(userBid.bid_price.toString());
        setPickupPoint(userBid.pickup_point);
      } else {
        // Set default pickup to trip origin
        setPickupPoint(tripData.origin);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load trip details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBid = async () => {
    if (!trip || !pickupPoint) return;

    const price = parseFloat(bidPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid bid amount');
      return;
    }

    if (price < trip.base_price_per_seat * 0.5) {
      Alert.alert('Bid Too Low', 'Bid must be at least 50% of the base price');
      return;
    }

    setSubmitting(true);
    try {
      await apiService.placeBid(trip.id, {
  bid_price: price,
  pickup_point: pickupPoint as any, // type assertion to avoid Location type mismatch
      });

      Alert.alert(
        'Bid Submitted',
        existingBid ? 'Your bid has been updated successfully!' : 'Your bid has been placed successfully!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit bid. Please try again.');
      console.error('Bid submission error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLocationSelect = (location: Location) => {
    setPickupPoint(location);
    setShowLocationPicker(false);
  };

  if (loading || !trip) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const highestBid = trip.highest_bid || 0;
  const suggestedBid = Math.max(highestBid + 50, trip.base_price_per_seat);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.neutral[900]} />
        </TouchableOpacity>
        <Text style={styles.title}>
          {existingBid ? 'Update Bid' : 'Place Bid'}
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.tripInfo}>
          <Text style={styles.routeText}>
            {trip.origin.address} → {trip.destination.address}
          </Text>
          <Text style={styles.timeText}>
            {new Date(trip.departure_datetime).toLocaleString()}
          </Text>
        </View>

        <View style={styles.biddingInfo}>
          <Text style={styles.sectionTitle}>Bidding Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Base Price:</Text>
            <Text style={styles.infoValue}>LKR {trip.base_price_per_seat}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Current Highest Bid:</Text>
            <Text style={styles.infoValue}>
              {highestBid > 0 ? `LKR ${highestBid}` : 'No bids yet'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Bids:</Text>
            <Text style={styles.infoValue}>{trip.bid_count}</Text>
          </View>
        </View>

        <View style={styles.bidForm}>
          <Text style={styles.sectionTitle}>Your Bid</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Bid Amount (LKR)</Text>
            <View style={styles.priceInput}>
              <DollarSign size={20} color={Colors.neutral[500]} />
              <TextInput
                style={styles.priceTextInput}
                value={bidPrice}
                onChangeText={setBidPrice}
                keyboardType="numeric"
                placeholder={suggestedBid.toString()}
              />
            </View>
            <Text style={styles.suggestion}>
              Suggested: LKR {suggestedBid} (to beat current highest)
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Pickup Point</Text>
            <TouchableOpacity 
              style={styles.locationButton}
              onPress={() => setShowLocationPicker(true)}
            >
              <MapPin size={16} color={Colors.primary[600]} />
              <Text style={styles.locationButtonText} numberOfLines={2}>
                {(pickupPoint as any)?.address || 'Select pickup location'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmitBid}
          disabled={submitting || !pickupPoint || !bidPrice}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Submitting...' : (existingBid ? 'Update Bid' : 'Place Bid')}
          </Text>
        </TouchableOpacity>
      </View>

      {showLocationPicker && (
        <LocationPicker
          onLocationSelect={handleLocationSelect}
          onClose={() => setShowLocationPicker(false)}
        />
      )}
    </KeyboardAvoidingView>
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
  tripInfo: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  routeText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
    marginBottom: Spacing.xs,
  },
  timeText: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[600],
  },
  biddingInfo: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  infoLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[600],
  },
  infoValue: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
  },
  bidForm: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[700],
    marginBottom: Spacing.sm,
  },
  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.neutral[300],
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.white,
  },
  priceTextInput: {
    flex: 1,
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
    paddingVertical: Spacing.md,
    marginLeft: Spacing.sm,
  },
  suggestion: {
    fontSize: Typography.sizes.xs,
    fontFamily: 'Inter-Regular',
    color: Colors.accent[600],
    marginTop: Spacing.xs,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.neutral[300],
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
  },
  locationButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[900],
    marginLeft: Spacing.sm,
    flex: 1,
  },
  submitButton: {
    backgroundColor: Colors.primary[600],
    borderRadius: 12,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: Colors.neutral[400],
  },
  submitButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Bold',
    color: Colors.white,
  },
});