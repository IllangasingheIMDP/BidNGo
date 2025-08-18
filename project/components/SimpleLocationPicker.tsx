import React from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Modal, SafeAreaView } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { Spacing, Typography } from '@/constants/Spacing';
import { Location } from '../types';

interface SimpleLocationPickerProps {
  mode: 'single' | 'route';
  initialOrigin?: Location;
  initialDestination?: Location;
  onLocationSelect?: (location: Location) => void;
  onRouteSelect?: (origin: Location, destination: Location) => void;
  onClose: () => void;
}

// Simple fallback location picker without maps
export default function SimpleLocationPicker({
  mode,
  onLocationSelect,
  onRouteSelect,
  onClose,
}: SimpleLocationPickerProps) {
  
  const mockLocations = [
    { lat: 6.9271, lng: 79.8612, address: 'Colombo, Sri Lanka' },
    { lat: 7.2966, lng: 80.6350, address: 'Kandy, Sri Lanka' },
    { lat: 6.0329, lng: 80.2168, address: 'Galle, Sri Lanka' },
    { lat: 8.3114, lng: 80.4037, address: 'Anuradhapura, Sri Lanka' },
  ];

  const handleLocationSelect = (location: Location) => {
    if (mode === 'single') {
      onLocationSelect?.(location);
    } else {
      // For route mode, select as origin and destination
      onRouteSelect?.(mockLocations[0], location);
    }
    onClose();
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {mode === 'single' ? 'Select Location' : 'Select Route'}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.content}>
          <Text style={styles.subtitle}>Choose from popular locations:</Text>
          
          {mockLocations.map((location, index) => (
            <TouchableOpacity
              key={index}
              style={styles.locationItem}
              onPress={() => handleLocationSelect(location)}
            >
              <MapPin size={20} color={Colors.primary[600]} />
              <Text style={styles.locationText}>{location.address}</Text>
            </TouchableOpacity>
          ))}
          
          <Text style={styles.note}>
            * Map functionality will be available once the module is properly configured
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontWeight: 'bold',
    color: Colors.neutral[900],
  },
  closeButton: {
    padding: Spacing.sm,
  },
  closeText: {
    fontSize: Typography.sizes.lg,
    color: Colors.neutral[600],
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  subtitle: {
    fontSize: Typography.sizes.base,
    color: Colors.neutral[700],
    marginBottom: Spacing.lg,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.neutral[50],
    borderRadius: 8,
    marginBottom: Spacing.sm,
  },
  locationText: {
    marginLeft: Spacing.sm,
    fontSize: Typography.sizes.base,
    color: Colors.neutral[900],
  },
  note: {
    marginTop: Spacing.xl,
    fontSize: Typography.sizes.sm,
    color: Colors.neutral[500],
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
