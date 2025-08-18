import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';
import LocationPicker from '../components/LocationPicker';
import { Location } from '../types';
import { Colors } from '../constants/Colors';
import { Spacing, Typography } from '../constants/Spacing';

/**
 * Example component showing how to use LocationPicker
 * This can be used as a reference for implementing location selection
 * in other parts of your app
 */
export default function LocationPickerExample() {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [origin, setOrigin] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);
  const [showSinglePicker, setShowSinglePicker] = useState(false);
  const [showRoutePicker, setShowRoutePicker] = useState(false);

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
    setShowSinglePicker(false);
  };

  const handleRouteSelect = (originLoc: Location, destinationLoc: Location) => {
    setOrigin(originLoc);
    setDestination(destinationLoc);
    setShowRoutePicker(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Location Picker Examples</Text>
      
      {/* Single Location Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Single Location</Text>
        <TouchableOpacity
          style={styles.locationButton}
          onPress={() => setShowSinglePicker(true)}
        >
          <MapPin size={20} color={Colors.primary[600]} />
          <Text style={styles.locationText}>
            {selectedLocation ? selectedLocation.address : 'Select a location'}
          </Text>
        </TouchableOpacity>
        
        {selectedLocation && (
          <View style={styles.locationDetails}>
            <Text style={styles.detailText}>
              Latitude: {selectedLocation.lat.toFixed(6)}
            </Text>
            <Text style={styles.detailText}>
              Longitude: {selectedLocation.lng.toFixed(6)}
            </Text>
          </View>
        )}
      </View>

      {/* Route Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Route (Origin → Destination)</Text>
        <TouchableOpacity
          style={styles.locationButton}
          onPress={() => setShowRoutePicker(true)}
        >
          <MapPin size={20} color={Colors.primary[600]} />
          <Text style={styles.locationText}>
            {origin && destination 
              ? `${origin.address.split(',')[0]} → ${destination.address.split(',')[0]}`
              : 'Select route'
            }
          </Text>
        </TouchableOpacity>
        
        {origin && destination && (
          <View style={styles.routeDetails}>
            <View style={styles.locationItem}>
              <Text style={styles.locationLabel}>From:</Text>
              <Text style={styles.locationAddress}>{origin.address}</Text>
            </View>
            <View style={styles.locationItem}>
              <Text style={styles.locationLabel}>To:</Text>
              <Text style={styles.locationAddress}>{destination.address}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Single Location Picker Modal */}
      {showSinglePicker && (
        <LocationPicker
          mode="single"
          onLocationSelect={handleLocationSelect}
          onClose={() => setShowSinglePicker(false)}
        />
      )}

      {/* Route Picker Modal */}
      {showRoutePicker && (
        <LocationPicker
          mode="route"
          initialOrigin={origin || undefined}
          initialDestination={destination || undefined}
          onRouteSelect={handleRouteSelect}
          onClose={() => setShowRoutePicker(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
    padding: Spacing.lg,
  },
  title: {
    fontSize: Typography.sizes['2xl'],
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
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
    marginBottom: Spacing.md,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[50],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    borderRadius: 12,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  locationText: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[700],
  },
  locationDetails: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: Colors.neutral[50],
    borderRadius: 8,
  },
  detailText: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[600],
    marginBottom: Spacing.xs,
  },
  routeDetails: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  locationItem: {
    backgroundColor: Colors.neutral[50],
    padding: Spacing.sm,
    borderRadius: 8,
  },
  locationLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[700],
    marginBottom: Spacing.xs,
  },
  locationAddress: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[600],
  },
});
