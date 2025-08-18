import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Modal,
  Dimensions,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import * as Maps from 'expo-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import * as ExpoLocation from 'expo-location';
import { X, MapPin, Navigation } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { getGooglePlacesApiKey } from '../config/env';

export interface Location {
  lat: number;
  lng: number;
  address: string;
}

interface LocationPickerProps {
  visible: boolean;
  onClose: () => void;
  onLocationsSelected: (origin: Location, destination: Location) => void;
  initialOrigin?: Location | null;
  initialDestination?: Location | null;
}

interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface Coordinate {
  latitude: number;
  longitude: number;
}

const { width, height } = Dimensions.get('window');

const LocationPicker: React.FC<LocationPickerProps> = ({
  visible,
  onClose,
  onLocationsSelected,
  initialOrigin,
  initialDestination,
}) => {
  const [origin, setOrigin] = useState<Location | null>(initialOrigin || null);
  const [destination, setDestination] = useState<Location | null>(initialDestination || null);
  const [currentLocationSelected, setCurrentLocationSelected] = useState<'origin' | 'destination'>('origin');
  const [userLocation, setUserLocation] = useState<ExpoLocation.LocationObject | null>(null);
  const [mapRegion, setMapRegion] = useState<MapRegion>({
    latitude: 7.8731, // Colombo, Sri Lanka
    longitude: 80.7718,
    latitudeDelta: 2.5,
    longitudeDelta: 2.0,
  });

  const originSearchRef = useRef<any>(null);
  const destinationSearchRef = useRef<any>(null);

  useEffect(() => {
    getUserLocation();
  }, []);

  const getUserLocation = async () => {
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      const location = await ExpoLocation.getCurrentPositionAsync({});
      setUserLocation(location);
    } catch (error) {
      console.error('Error getting user location:', error);
    }
  };

  const handlePlaceSelect = (details: any, type: 'origin' | 'destination') => {
    const location: Location = {
      lat: details.geometry.location.lat,
      lng: details.geometry.location.lng,
      address: details.formatted_address || details.description,
    };

    if (type === 'origin') {
      setOrigin(location);
    } else {
      setDestination(location);
    }

    // Update map region to selected location
    setMapRegion({
      latitude: location.lat,
      longitude: location.lng,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });
  };

  const handleMapPress = (event: any) => {
    const coordinate = event.coordinates;
    
    // Reverse geocode to get address
    reverseGeocode(coordinate, currentLocationSelected);
  };

  const reverseGeocode = async (coordinate: Coordinate, type: 'origin' | 'destination') => {
    try {
      const apiKey = getGooglePlacesApiKey();
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coordinate.latitude},${coordinate.longitude}&key=${apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const location: Location = {
          lat: coordinate.latitude,
          lng: coordinate.longitude,
          address: data.results[0].formatted_address,
        };

        if (type === 'origin') {
          setOrigin(location);
        } else {
          setDestination(location);
        }
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      // Fallback: use coordinates as address
      const location: Location = {
        lat: coordinate.latitude,
        lng: coordinate.longitude,
        address: `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`,
      };

      if (type === 'origin') {
        setOrigin(location);
      } else {
        setDestination(location);
      }
    }
  };

  const handleConfirm = () => {
    if (!origin || !destination) {
      Alert.alert('Incomplete Selection', 'Please select both origin and destination locations.');
      return;
    }

    onLocationsSelected(origin, destination);
    onClose();
  };

  const handleReset = () => {
    setOrigin(null);
    setDestination(null);
    originSearchRef.current?.clear();
    destinationSearchRef.current?.clear();
    
    // Reset map to Sri Lanka view
    setMapRegion({
      latitude: 7.8731,
      longitude: 80.7718,
      latitudeDelta: 2.5,
      longitudeDelta: 2.0,
    });
  };

  const switchLocations = () => {
    if (origin && destination) {
      const temp = origin;
      setOrigin(destination);
      setDestination(temp);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={Colors.neutral[900]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Route</Text>
          <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Search Inputs */}
        <View style={styles.searchContainer}>
          {/* Origin Search */}
          <View style={styles.searchBox}>
            <View style={styles.searchIcon}>
              <View style={[styles.locationDot, { backgroundColor: Colors.success[500] }]} />
            </View>
            <GooglePlacesAutocomplete
              ref={originSearchRef}
              placeholder="Origin (pickup location)"
              onPress={(data, details = null) => {
                if (details) {
                  handlePlaceSelect(details, 'origin');
                }
                setCurrentLocationSelected('origin');
              }}
              query={{
                key: getGooglePlacesApiKey(),
                language: 'en',
                components: 'country:lk', // Restrict to Sri Lanka
              }}
              fetchDetails={true}
              styles={{
                textInput: styles.searchInput,
                container: { flex: 1 },
                listView: styles.suggestionsList,
              }}
            />
          </View>

          {/* Switch Button */}
          <TouchableOpacity onPress={switchLocations} style={styles.switchButton}>
            <Navigation size={16} color={Colors.primary[600]} style={{ transform: [{ rotate: '90deg' }] }} />
          </TouchableOpacity>

          {/* Destination Search */}
          <View style={styles.searchBox}>
            <View style={styles.searchIcon}>
              <View style={[styles.locationDot, { backgroundColor: Colors.error[500] }]} />
            </View>
            <GooglePlacesAutocomplete
              ref={destinationSearchRef}
              placeholder="Destination (drop-off location)"
              onPress={(data, details = null) => {
                if (details) {
                  handlePlaceSelect(details, 'destination');
                }
                setCurrentLocationSelected('destination');
              }}
              query={{
                key: getGooglePlacesApiKey(),
                language: 'en',
                components: 'country:lk', // Restrict to Sri Lanka
              }}
              fetchDetails={true}
              styles={{
                textInput: styles.searchInput,
                container: { flex: 1 },
                listView: styles.suggestionsList,
              }}
            />
          </View>
        </View>

        {/* Map */}
        <View style={styles.mapContainer}>
          <Maps.GoogleMaps.View
            style={styles.map}
            cameraPosition={{
              coordinates: {
                latitude: mapRegion.latitude,
                longitude: mapRegion.longitude,
              },
              zoom: 12,
            }}
            onMapClick={handleMapPress}
            markers={[
              // Origin Marker
              ...(origin ? [{
                id: 'origin',
                coordinates: { latitude: origin.lat, longitude: origin.lng },
                title: 'Origin',
                snippet: origin.address,
              }] : []),
              // Destination Marker  
              ...(destination ? [{
                id: 'destination',
                coordinates: { latitude: destination.lat, longitude: destination.lng },
                title: 'Destination',
                snippet: destination.address,
              }] : []),
            ]}
          />

          {/* Map Instructions */}
          <View style={styles.mapInstructions}>
            <MapPin size={16} color={Colors.neutral[600]} />
            <Text style={styles.instructionsText}>
              Tap on map to select {currentLocationSelected === 'origin' ? 'origin' : 'destination'}
            </Text>
          </View>
        </View>

        {/* Bottom Action */}
        <View style={styles.bottomAction}>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              (!origin || !destination) && styles.disabledButton
            ]}
            onPress={handleConfirm}
            disabled={!origin || !destination}
          >
            <Text style={styles.confirmButtonText}>
              Confirm Route
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.neutral[900],
  },
  resetButton: {
    padding: 8,
  },
  resetText: {
    fontSize: 16,
    color: Colors.primary[600],
    fontWeight: '500',
  },
  searchContainer: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[50],
    borderRadius: 12,
    paddingHorizontal: 12,
    marginVertical: 4,
    minHeight: 48,
  },
  searchIcon: {
    marginRight: 12,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  searchInput: {
    fontSize: 16,
    color: Colors.neutral[900],
    backgroundColor: 'transparent',
    borderRadius: 0,
    margin: 0,
    padding: 0,
  },
  suggestionsList: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderRadius: 12,
    elevation: 5,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    maxHeight: 200,
    zIndex: 1000,
  },
  switchButton: {
    alignSelf: 'center',
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 8,
    marginVertical: 4,
    borderWidth: 2,
    borderColor: Colors.neutral[200],
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapInstructions: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionsText: {
    marginLeft: 8,
    fontSize: 14,
    color: Colors.neutral[600],
  },
  bottomAction: {
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
  },
  confirmButton: {
    backgroundColor: Colors.primary[600],
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  disabledButton: {
    backgroundColor: Colors.neutral[300],
  },
});

export default LocationPicker;