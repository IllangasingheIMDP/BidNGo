import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, MapPin, Calendar, Clock, Users, DollarSign } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { Spacing, Typography } from '@/constants/Spacing';
import { LocationPicker } from '@/components/LocationPicker';
import { DatePicker } from '@/components/DatePicker';
import { Location } from '@/types';
import { apiService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

export default function CreateTripScreen() {
  const { user } = useAuth();
  const [origin, setOrigin] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);
  const [departureDate, setDepartureDate] = useState<Date>(new Date());
  const [departureTime, setDepartureTime] = useState('09:00');
  const [availableSeats, setAvailableSeats] = useState('4');
  const [basePricePerSeat, setBasePricePerSeat] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState<'origin' | 'destination' | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'driver') {
      router.replace('/(tabs)');
    }
  }, [user]);

  const handleLocationSelect = (location: Location) => {
    if (showLocationPicker === 'origin') {
      setOrigin(location);
    } else if (showLocationPicker === 'destination') {
      setDestination(location);
    }
    setShowLocationPicker(null);
  };

  const handleDateSelect = (date: Date) => {
    setDepartureDate(date);
    setShowDatePicker(false);
  };

  const handleCreateTrip = async () => {
    if (!origin || !destination) {
      Alert.alert('Missing Information', 'Please select both origin and destination');
      return;
    }

    const seats = parseInt(availableSeats);
    const price = parseFloat(basePricePerSeat);

    if (isNaN(seats) || seats < 1 || seats > 8) {
      Alert.alert('Invalid Seats', 'Please enter a valid number of seats (1-8)');
      return;
    }

    if (isNaN(price) || price <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price per seat');
      return;
    }

    // Combine date and time
    const [hours, minutes] = departureTime.split(':');
    const departureDateTime = new Date(departureDate);
    departureDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    if (departureDateTime <= new Date()) {
      Alert.alert('Invalid Time', 'Departure time must be in the future');
      return;
    }

    setSubmitting(true);
    try {
      await apiService.createTrip({
        origin,
        destination,
        departure_datetime: departureDateTime.toISOString(),
        available_seats: seats,
        base_price_per_seat: price,
      });

      Alert.alert(
        'Trip Created',
        'Your trip has been posted successfully!',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)/driver') }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to create trip. Please try again.');
      console.error('Trip creation error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.neutral[900]} />
        </TouchableOpacity>
        <Text style={styles.title}>Create Trip</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.form}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Route</Text>
            
            <TouchableOpacity 
              style={styles.locationButton}
              onPress={() => setShowLocationPicker('origin')}
            >
              <MapPin size={16} color={Colors.success[600]} />
              <View style={styles.locationContent}>
                <Text style={styles.locationLabel}>From</Text>
                <Text style={styles.locationText}>
                  {origin?.address || 'Select origin'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.locationButton}
              onPress={() => setShowLocationPicker('destination')}
            >
              <MapPin size={16} color={Colors.error[600]} />
              <View style={styles.locationContent}>
                <Text style={styles.locationLabel}>To</Text>
                <Text style={styles.locationText}>
                  {destination?.address || 'Select destination'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Schedule</Text>
            
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Calendar size={16} color={Colors.primary[600]} />
              <View style={styles.dateContent}>
                <Text style={styles.dateLabel}>Date</Text>
                <Text style={styles.dateText}>
                  {departureDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Departure Time</Text>
              <View style={styles.timeInput}>
                <Clock size={16} color={Colors.primary[600]} />
                <TextInput
                  style={styles.timeTextInput}
                  value={departureTime}
                  onChangeText={setDepartureTime}
                  placeholder="09:00"
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trip Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Available Seats</Text>
              <View style={styles.numberInput}>
                <Users size={16} color={Colors.secondary[600]} />
                <TextInput
                  style={styles.numberTextInput}
                  value={availableSeats}
                  onChangeText={setAvailableSeats}
                  keyboardType="numeric"
                  maxLength={1}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Base Price per Seat (LKR)</Text>
              <View style={styles.priceInputContainer}>
                <DollarSign size={16} color={Colors.accent[600]} />
                <TextInput
                  style={styles.priceTextInput}
                  value={basePricePerSeat}
                  onChangeText={setBasePricePerSeat}
                  keyboardType="numeric"
                  placeholder="500"
                />
              </View>
              <Text style={styles.priceNote}>
                Passengers can bid higher than this amount
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.createButton, submitting && styles.createButtonDisabled]}
          onPress={handleCreateTrip}
          disabled={submitting || !origin || !destination || !basePricePerSeat || !availableSeats}
        >
          <Text style={styles.createButtonText}>
            {submitting ? 'Creating Trip...' : 'Create Trip'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {showLocationPicker && (
        <LocationPicker
          onLocationSelect={handleLocationSelect}
          onClose={() => setShowLocationPicker(null)}
        />
      )}

      {showDatePicker && (
        <DatePicker
          onDateSelect={handleDateSelect}
          onClose={() => setShowDatePicker(false)}
          minDate={new Date()}
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
  form: {
    marginBottom: Spacing.xl,
  },
  section: {
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
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  locationContent: {
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
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  dateContent: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  dateLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[500],
    marginBottom: 2,
  },
  dateText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[900],
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[700],
    marginBottom: Spacing.sm,
  },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
  },
  timeTextInput: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[900],
    paddingVertical: Spacing.md,
    marginLeft: Spacing.sm,
  },
  numberInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
  },
  numberTextInput: {
    flex: 1,
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
    paddingVertical: Spacing.md,
    marginLeft: Spacing.sm,
    textAlign: 'center',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
  },
  priceTextInput: {
    flex: 1,
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
    paddingVertical: Spacing.md,
    marginLeft: Spacing.sm,
  },
  priceNote: {
    fontSize: Typography.sizes.xs,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[500],
    marginTop: Spacing.xs,
  },
  createButton: {
    backgroundColor: Colors.primary[600],
    borderRadius: 12,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  createButtonDisabled: {
    backgroundColor: Colors.neutral[400],
  },
  createButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Bold',
    color: Colors.white,
  },
});