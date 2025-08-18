import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import LocationPicker, { Location } from './LocationPicker';
import { Colors } from '../constants/Colors';

const LocationPickerTest: React.FC = () => {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedOrigin, setSelectedOrigin] = useState<Location | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<Location | null>(null);

  const handleLocationsSelected = (origin: Location, destination: Location) => {
    setSelectedOrigin(origin);
    setSelectedDestination(destination);
    Alert.alert(
      'Locations Selected',
      `Origin: ${origin.address}\n\nDestination: ${destination.address}`
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LocationPicker Test</Text>
      
      <View style={styles.infoContainer}>
        <Text style={styles.label}>Origin:</Text>
        <Text style={styles.value}>
          {selectedOrigin ? selectedOrigin.address : 'Not selected'}
        </Text>
        
        <Text style={styles.label}>Destination:</Text>
        <Text style={styles.value}>
          {selectedDestination ? selectedDestination.address : 'Not selected'}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => setShowPicker(true)}
      >
        <Text style={styles.buttonText}>Select Route</Text>
      </TouchableOpacity>

      <LocationPicker
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onLocationsSelected={handleLocationsSelected}
        initialOrigin={selectedOrigin}
        initialDestination={selectedDestination}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: Colors.white,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: Colors.neutral[900],
  },
  infoContainer: {
    backgroundColor: Colors.neutral[50],
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[700],
    marginTop: 10,
    marginBottom: 5,
  },
  value: {
    fontSize: 14,
    color: Colors.neutral[600],
    paddingBottom: 10,
  },
  button: {
    backgroundColor: Colors.primary[600],
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LocationPickerTest;
