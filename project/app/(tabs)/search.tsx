import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Search, MapPin, Calendar, Filter, ArrowUpDown } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { Spacing, Typography } from '@/constants/Spacing';
import { TripCard } from '@/components/TripCard';
import { LocationPicker } from '@/components/LocationPicker';
import { DatePicker } from '@/components/DatePicker';
import { Trip, SearchFilters, Location } from '@/types';
import { apiService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

export default function SearchScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  
  const [filters, setFilters] = useState<SearchFilters>({
    origin: { lat: 6.9271, lng: 79.8612, address: 'Colombo Fort' },
    destination: { lat: 7.2906, lng: 80.6337, address: 'Kandy' },
    date: new Date().toISOString().split('T')[0],
  });
  
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState<'origin' | 'destination' | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [maxPrice, setMaxPrice] = useState('');
  const [minSeats, setMinSeats] = useState('');

  useEffect(() => {
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }
    
    // Handle quick search params
    if (params.route === 'colombo-kandy') {
      searchTrips();
    } else if (params.time === 'quick') {
      const quickFilters = {
        ...filters,
        date: new Date().toISOString().split('T')[0],
      };
      setFilters(quickFilters);
      searchTripsWithFilters(quickFilters);
    }
  }, [params, user]);

  const searchTrips = () => {
    const searchFilters = {
      ...filters,
      ...(maxPrice && { max_price: parseFloat(maxPrice) }),
      ...(minSeats && { min_seats: parseInt(minSeats) }),
    };
    searchTripsWithFilters(searchFilters);
  };

  const searchTripsWithFilters = async (searchFilters: SearchFilters) => {
    setLoading(true);
    try {
      const results = await apiService.searchTrips(searchFilters);
      setTrips(results);
    } catch (error) {
      Alert.alert('Search Failed', 'Unable to search trips. Please try again.');
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSelect = (location: Location) => {
    if (showLocationPicker === 'origin') {
      setFilters(prev => ({ ...prev, origin: location }));
    } else if (showLocationPicker === 'destination') {
      setFilters(prev => ({ ...prev, destination: location }));
    }
    setShowLocationPicker(null);
  };

  const handleDateSelect = (date: Date) => {
    setFilters(prev => ({ ...prev, date: date.toISOString().split('T')[0] }));
    setShowDatePicker(false);
  };

  const swapLocations = () => {
    setFilters(prev => ({
      ...prev,
      origin: prev.destination,
      destination: prev.origin,
    }));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Search Trips</Text>
        <TouchableOpacity 
          style={styles.filterButton} 
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} color={Colors.primary[600]} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchForm}>
        <View style={styles.locationContainer}>
          <TouchableOpacity 
            style={styles.locationButton}
            onPress={() => setShowLocationPicker('origin')}
          >
            <MapPin size={16} color={Colors.success[600]} />
            <Text style={styles.locationButtonText} numberOfLines={1}>
              {filters.origin.address}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.swapButton} onPress={swapLocations}>
            <ArrowUpDown size={20} color={Colors.primary[600]} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.locationButton}
            onPress={() => setShowLocationPicker('destination')}
          >
            <MapPin size={16} color={Colors.error[600]} />
            <Text style={styles.locationButtonText} numberOfLines={1}>
              {filters.destination.address}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Calendar size={16} color={Colors.primary[600]} />
          <Text style={styles.dateButtonText}>
            {new Date(filters.date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </TouchableOpacity>

        {showFilters && (
          <View style={styles.filtersContainer}>
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Max Price (LKR)</Text>
              <TextInput
                style={styles.filterInput}
                value={maxPrice}
                onChangeText={setMaxPrice}
                keyboardType="numeric"
                placeholder="Any"
              />
            </View>
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Min Seats</Text>
              <TextInput
                style={styles.filterInput}
                value={minSeats}
                onChangeText={setMinSeats}
                keyboardType="numeric"
                placeholder="Any"
              />
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.searchButton} onPress={searchTrips}>
          <Search size={20} color={Colors.white} />
          <Text style={styles.searchButtonText}>Search Trips</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.results}>
        {loading ? (
          <View style={styles.loadingState}>
            <Text style={styles.loadingText}>Searching for trips...</Text>
          </View>
        ) : trips.length > 0 ? (
          <>
            <Text style={styles.resultsHeader}>
              {trips.length} trip{trips.length !== 1 ? 's' : ''} found
            </Text>
            {trips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onPress={() => router.push(`/trip/${trip.id}`)}
                showBidding={user?.role === 'passenger'}
              />
            ))}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Search size={48} color={Colors.neutral[400]} />
            <Text style={styles.emptyTitle}>No trips found</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your search criteria or check back later
            </Text>
          </View>
        )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.sizes['2xl'],
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
  },
  filterButton: {
    padding: Spacing.sm,
  },
  searchForm: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  locationContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  locationButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[900],
    marginLeft: Spacing.sm,
    flex: 1,
  },
  swapButton: {
    alignSelf: 'center',
    padding: Spacing.sm,
    marginVertical: Spacing.xs,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dateButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[900],
    marginLeft: Spacing.sm,
  },
  filtersContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  filterLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[700],
    flex: 1,
  },
  filterInput: {
    flex: 1,
    textAlign: 'right',
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[900],
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: 6,
    backgroundColor: Colors.neutral[50],
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary[600],
    borderRadius: 12,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  searchButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Medium',
    color: Colors.white,
  },
  results: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  resultsHeader: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[600],
    marginBottom: Spacing.md,
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
  },
});