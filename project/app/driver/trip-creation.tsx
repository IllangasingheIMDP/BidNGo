import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  StickyNote,
  Plus,
  Edit3,
  Trash2,
  Car,
  Clock,
  Navigation,
} from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import LocationPicker from '../../components/LocationPicker';
import { Spacing, Typography } from '@/constants/Spacing';

import { Location } from '@/types';
import { apiService, BackendTrip } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface TripFormData {
  origin: Location | null;
  destination: Location | null;
  departure_datetime: Date;
  available_seats: string;
  base_price_per_seat: string;
  notes: string;
}

interface EditingTrip extends BackendTrip {
  isEditing: boolean;
}

export default function TripCreationScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [myTrips, setMyTrips] = useState<EditingTrip[]>([]);
  const [showRoutePicker, setShowRoutePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Form state
  const [formData, setFormData] = useState<TripFormData>({
    origin: null,
    destination: null,
    departure_datetime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    available_seats: '4',
    base_price_per_seat: '',
    notes: '',
  });

  // Editing state
  const [editingTripId, setEditingTripId] = useState<number | null>(null);

  useEffect(() => {
    // Redirect non-drivers
    if (!user || user.role !== 'driver') {
      router.replace('/(tabs)');
      return;
    }
    
    if (activeTab === 'manage') {
      loadMyTrips();
    }
  }, [user, activeTab]);

  const loadMyTrips = async () => {
    try {
      setLoading(true);
      const trips = await apiService.getMyTrips();
      setMyTrips(trips.map(trip => ({ ...trip, isEditing: false })));
    } catch (error) {
      console.error('Failed to load trips:', error);
      Alert.alert('Error', 'Failed to load your trips');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMyTrips();
    setRefreshing(false);
  };

  const resetForm = () => {
    setFormData({
      origin: null,
      destination: null,
      departure_datetime: new Date(Date.now() + 2 * 60 * 60 * 1000),
      available_seats: '4',
      base_price_per_seat: '',
      notes: '',
    });
    setEditingTripId(null);
  };

  const validateForm = (): string | null => {
    if (!formData.origin) return 'Please select origin location';
    if (!formData.destination) return 'Please select destination location';
    if (!formData.available_seats || parseInt(formData.available_seats) < 1) return 'Please enter valid number of seats';
    if (!formData.base_price_per_seat || parseFloat(formData.base_price_per_seat) <= 0) return 'Please enter valid price per seat';
    if (formData.departure_datetime <= new Date()) return 'Departure time must be in the future';
    return null;
  };

  const handleCreateTrip = async () => {
    const error = validateForm();
    if (error) {
      Alert.alert('Validation Error', error);
      return;
    }

    try {
      setLoading(true);
      
      const tripData = {
        origin: {
          lat: formData.origin!.lat,
          lng: formData.origin!.lng,
          address: formData.origin!.address,
        },
        destination: {
          lat: formData.destination!.lat,
          lng: formData.destination!.lng,
          address: formData.destination!.address,
        },
        departure_datetime: formData.departure_datetime.toISOString(),
        available_seats: parseInt(formData.available_seats),
        base_price_per_seat: parseFloat(formData.base_price_per_seat),
        notes: formData.notes,
      };

      await apiService.createTrip(tripData);
      Alert.alert('Success', 'Trip created successfully!', [
        { text: 'OK', onPress: () => {
          resetForm();
          setActiveTab('manage');
        }}
      ]);
    } catch (error) {
      console.error('Failed to create trip:', error);
      Alert.alert('Error', 'Failed to create trip. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTrip = async (tripId: number) => {
    const error = validateForm();
    if (error) {
      Alert.alert('Validation Error', error);
      return;
    }

    try {
      setLoading(true);

      const updateData = {
        origin: {
          lat: formData.origin!.lat,
          lng: formData.origin!.lng,
          address: formData.origin!.address,
        },
        destination: {
          lat: formData.destination!.lat,
          lng: formData.destination!.lng,
          address: formData.destination!.address,
        },
        departure_datetime: formData.departure_datetime.toISOString(),
        available_seats: parseInt(formData.available_seats),
        base_price_per_seat: parseFloat(formData.base_price_per_seat),
        notes: formData.notes,
      };

      await apiService.updateTrip(tripId, updateData);
      Alert.alert('Success', 'Trip updated successfully!');
      setEditingTripId(null);
      resetForm();
      await loadMyTrips();
    } catch (error) {
      console.error('Failed to update trip:', error);
      Alert.alert('Error', 'Failed to update trip. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (trip: BackendTrip) => {
    setFormData({
      origin: {
        lat: trip.origin_lat,
        lng: trip.origin_lng,
        address: trip.origin_addr,
      },
      destination: {
        lat: trip.dest_lat,
        lng: trip.dest_lng,
        address: trip.dest_addr,
      },
      departure_datetime: new Date(trip.departure_datetime),
      available_seats: trip.available_seats.toString(),
      base_price_per_seat: trip.base_price.toString(),
      notes: trip.notes || '',
    });
    setEditingTripId(trip.id);
    setActiveTab('create');
  };

  const handleDeleteTrip = async (tripId: number) => {
    Alert.alert(
      'Delete Trip',
      'Are you sure you want to delete this trip? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              // Note: API doesn't have delete endpoint, so we'll show a message
              Alert.alert('Feature Coming Soon', 'Trip deletion will be available in a future update.');
              // await apiService.deleteTrip(tripId);
              // await loadMyTrips();
            } catch (error) {
              console.error('Failed to delete trip:', error);
              Alert.alert('Error', 'Failed to delete trip. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatDateTime = (date: Date) => {
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
    
    let dateStr = '';
    if (isToday) dateStr = 'Today';
    else if (isTomorrow) dateStr = 'Tomorrow';
    else dateStr = date.toLocaleDateString();
    
    return `${dateStr} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const renderCreateForm = () => (
    <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Trip Details</Text>
        
        {/* Origin & Destination (Route Picker) */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Route</Text>
          <TouchableOpacity
            style={[styles.locationInput, !(formData.origin && formData.destination) && styles.placeholderInput]}
            onPress={() => setShowRoutePicker(true)}
          >
            <MapPin size={20} color={formData.origin ? Colors.primary[600] : Colors.neutral[500]} />
            <Text style={[styles.locationText, !(formData.origin && formData.destination) && styles.placeholderText]} numberOfLines={2}>
              {formData.origin && formData.destination
                ? `${formData.origin.address.split(',')[0]} → ${formData.destination.address.split(',')[0]}`
                : 'Select origin & destination'}
            </Text>
          </TouchableOpacity>
        </View>
        {/* LocationPicker Modal */}
        {showRoutePicker && (
          <Modal visible transparent animationType="slide">
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
              <View style={{ backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', width: '95%', maxWidth: 500 }}>
                <LocationPicker
                  initialOrigin={formData.origin}
                  initialDestination={formData.destination}
                  onLocationsSelected={(origin, destination) => {
                    setFormData(fd => ({ ...fd, origin, destination }));
                    setShowRoutePicker(false);
                  }}
                  height={400}
                />
                <TouchableOpacity style={{ padding: 16, alignItems: 'center' }} onPress={() => setShowRoutePicker(false)}>
                  <Text style={{ color: '#e53935', fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {/* Departure Date & Time */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Departure</Text>
          <TouchableOpacity
            style={styles.locationInput}
            onPress={() => setShowDatePicker(true)}
          >
            <Calendar size={20} color={Colors.primary[600]} />
            <Text style={styles.locationText}>
              {formatDateTime(formData.departure_datetime)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Available Seats */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Available Seats</Text>
          <View style={styles.inputWithIcon}>
            <Users size={20} color={Colors.neutral[500]} />
            <TextInput
              style={styles.textInput}
              value={formData.available_seats}
              onChangeText={(text) => setFormData({ ...formData, available_seats: text })}
              placeholder="4"
              keyboardType="numeric"
              maxLength={1}
            />
          </View>
        </View>

        {/* Price per Seat */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Price per Seat ($)</Text>
          <View style={styles.inputWithIcon}>
            <DollarSign size={20} color={Colors.neutral[500]} />
            <TextInput
              style={styles.textInput}
              value={formData.base_price_per_seat}
              onChangeText={(text) => setFormData({ ...formData, base_price_per_seat: text })}
              placeholder="25.00"
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Notes */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Notes (Optional)</Text>
          <View style={[styles.inputWithIcon, styles.notesInput]}>
            <StickyNote size={20} color={Colors.neutral[500]} style={styles.notesIcon} />
            <TextInput
              style={[styles.textInput, styles.notesTextInput]}
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              placeholder="Any additional information..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {editingTripId ? (
          <>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                resetForm();
                setActiveTab('manage');
              }}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.disabledButton]}
              onPress={() => handleUpdateTrip(editingTripId)}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Updating...' : 'Update Trip'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.disabledButton]}
            onPress={handleCreateTrip}
            disabled={loading}
          >
            <Plus size={20} color={Colors.white} />
            <Text style={styles.primaryButtonText}>
              {loading ? 'Creating...' : 'Create Trip'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );

  const renderManageTrips = () => (
    <ScrollView
      style={styles.tripsContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {loading && myTrips.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading your trips...</Text>
        </View>
      ) : myTrips.length === 0 ? (
        <View style={styles.centerContainer}>
          <Car size={48} color={Colors.neutral[400]} />
          <Text style={styles.emptyTitle}>No trips yet</Text>
          <Text style={styles.emptySubtitle}>Create your first trip to start earning</Text>
          <TouchableOpacity
            style={styles.emptyAction}
            onPress={() => setActiveTab('create')}
          >
            <Plus size={20} color={Colors.white} />
            <Text style={styles.emptyActionText}>Create Trip</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.tripsList}>
          {myTrips.map((trip) => (
            <View key={trip.id} style={styles.tripCard}>
              <View style={styles.tripHeader}>
                <View style={styles.routeInfo}>
                  <Text style={styles.routeText}>
                    {trip.origin_addr} → {trip.dest_addr}
                  </Text>
                  <View style={styles.tripMeta}>
                    <Clock size={14} color={Colors.neutral[500]} />
                    <Text style={styles.metaText}>
                      {formatDateTime(new Date(trip.departure_datetime))}
                    </Text>
                  </View>
                </View>
                <Text style={styles.tripPrice}>${trip.base_price}</Text>
              </View>

              <View style={styles.tripDetails}>
                <View style={styles.tripDetail}>
                  <Users size={16} color={Colors.neutral[500]} />
                  <Text style={styles.detailText}>{trip.available_seats} seats</Text>
                </View>
                {trip.notes && (
                  <View style={styles.tripDetail}>
                    <StickyNote size={16} color={Colors.neutral[500]} />
                    <Text style={styles.detailText} numberOfLines={1}>{trip.notes}</Text>
                  </View>
                )}
              </View>

              <View style={styles.tripActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => startEditing(trip)}
                >
                  <Edit3 size={16} color={Colors.primary[600]} />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteTrip(trip.id)}
                >
                  <Trash2 size={16} color={Colors.error[600]} />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={Colors.neutral[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {editingTripId ? 'Edit Trip' : 'Trip Management'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tab Navigation */}
      {!editingTripId && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'create' && styles.activeTab]}
            onPress={() => setActiveTab('create')}
          >
            <Text style={[styles.tabText, activeTab === 'create' && styles.activeTabText]}>
              Create Trip
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'manage' && styles.activeTab]}
            onPress={() => setActiveTab('manage')}
          >
            <Text style={[styles.tabText, activeTab === 'manage' && styles.activeTabText]}>
              Manage Trips
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      {activeTab === 'create' || editingTripId ? renderCreateForm() : renderManageTrips()}

      {/* Route Picker Modal (select both origin & destination) */}
      

      {/* Date Picker */}
      {showDatePicker && (
        <Modal transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.datePickerContainer}>
              <Text style={styles.datePickerTitle}>Select Date</Text>
              <DateTimePicker
                value={formData.departure_datetime}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={(event, date) => {
                  if (Platform.OS === 'android') {
                    setShowDatePicker(false);
                    if (date) {
                      const newDateTime = new Date(date);
                      newDateTime.setHours(formData.departure_datetime.getHours());
                      newDateTime.setMinutes(formData.departure_datetime.getMinutes());
                      setFormData({ ...formData, departure_datetime: newDateTime });
                      setShowTimePicker(true);
                    }
                  } else if (date) {
                    const newDateTime = new Date(date);
                    newDateTime.setHours(formData.departure_datetime.getHours());
                    newDateTime.setMinutes(formData.departure_datetime.getMinutes());
                    setFormData({ ...formData, departure_datetime: newDateTime });
                  }
                }}
              />
              {Platform.OS === 'ios' && (
                <View style={styles.datePickerActions}>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.datePickerButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.datePickerButton, styles.primaryDatePickerButton]}
                    onPress={() => {
                      setShowDatePicker(false);
                      setShowTimePicker(true);
                    }}
                  >
                    <Text style={[styles.datePickerButtonText, styles.primaryDatePickerButtonText]}>
                      Next
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <Modal transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.datePickerContainer}>
              <Text style={styles.datePickerTitle}>Select Time</Text>
              <DateTimePicker
                value={formData.departure_datetime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                  if (Platform.OS === 'android') {
                    setShowTimePicker(false);
                    if (date) {
                      const newDateTime = new Date(formData.departure_datetime);
                      newDateTime.setHours(date.getHours());
                      newDateTime.setMinutes(date.getMinutes());
                      setFormData({ ...formData, departure_datetime: newDateTime });
                    }
                  } else if (date) {
                    const newDateTime = new Date(formData.departure_datetime);
                    newDateTime.setHours(date.getHours());
                    newDateTime.setMinutes(date.getMinutes());
                    setFormData({ ...formData, departure_datetime: newDateTime });
                  }
                }}
              />
              {Platform.OS === 'ios' && (
                <View style={styles.datePickerActions}>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowTimePicker(false)}
                  >
                    <Text style={styles.datePickerButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.datePickerButton, styles.primaryDatePickerButton]}
                    onPress={() => setShowTimePicker(false)}
                  >
                    <Text style={[styles.datePickerButtonText, styles.primaryDatePickerButtonText]}>
                      Done
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}
    </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
  },
  placeholder: {
    width: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: Colors.primary[600],
  },
  tabText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[600],
  },
  activeTabText: {
    color: Colors.primary[600],
  },
  formContainer: {
    flex: 1,
  },
  formSection: {
    backgroundColor: Colors.white,
    margin: Spacing.lg,
    padding: Spacing.xl,
    borderRadius: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
    marginBottom: Spacing.lg,
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
  locationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[50],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  placeholderInput: {
    borderColor: Colors.neutral[300],
    borderStyle: 'dashed',
  },
  locationText: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[900],
  },
  placeholderText: {
    color: Colors.neutral[500],
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[50],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[900],
  },
  notesInput: {
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
  },
  notesIcon: {
    marginTop: Spacing.xs,
  },
  notesTextInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: Colors.primary[600],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: 12,
    gap: Spacing.sm,
  },
  primaryButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Bold',
    color: Colors.white,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: 12,
  },
  secondaryButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[700],
  },
  disabledButton: {
    opacity: 0.6,
  },
  tripsContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  loadingText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[500],
  },
  emptyTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[700],
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[500],
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  emptyAction: {
    backgroundColor: Colors.primary[600],
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    gap: Spacing.sm,
  },
  emptyActionText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Medium',
    color: Colors.white,
  },
  tripsList: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  tripCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.lg,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  routeInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  routeText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
    marginBottom: Spacing.xs,
  },
  tripMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[600],
  },
  tripPrice: {
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Bold',
    color: Colors.primary[600],
  },
  tripDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  tripDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailText: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[600],
  },
  tripActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary[50],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    gap: Spacing.xs,
  },
  editButtonText: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Medium',
    color: Colors.primary[600],
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error[50],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    gap: Spacing.xs,
  },
  deleteButtonText: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Medium',
    color: Colors.error[600],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContainer: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.xl,
    margin: Spacing.xl,
    width: '80%',
  },
  datePickerTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
  },
  datePickerButton: {
    flex: 1,
    backgroundColor: Colors.neutral[100],
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: Spacing.xs,
  },
  primaryDatePickerButton: {
    backgroundColor: Colors.primary[600],
  },
  datePickerButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[700],
  },
  primaryDatePickerButtonText: {
    color: Colors.white,
  },
});