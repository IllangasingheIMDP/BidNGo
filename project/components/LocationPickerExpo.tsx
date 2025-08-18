import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  FlatList,
  Dimensions,
  StyleSheet,
} from 'react-native';
import * as Maps from 'expo-maps';
import * as ExpoLocation from 'expo-location';
import { 
  X, 
  Search, 
  MapPin, 
  Navigation, 
  RotateCcw, 
  Check,
  ArrowUpDown 
} from 'lucide-react-native';
import { Location } from '../types';
import { Colors } from '@/constants/Colors';
import { Spacing, Typography } from '@/constants/Spacing';
import { getGoogleMapsApiKey, getGooglePlacesApiKey } from '../config/env';

const { width, height } = Dimensions.get('window');

interface LocationPickerProps {
  mode: 'single' | 'route';
  initialOrigin?: Location;
  initialDestination?: Location;
  onLocationSelect?: (location: Location) => void;
  onRouteSelect?: (origin: Location, destination: Location) => void;
  onClose: () => void;
}

interface PlaceDetails {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

const GOOGLE_MAPS_APIKEY = getGoogleMapsApiKey();
const GOOGLE_PLACES_APIKEY = getGooglePlacesApiKey();

// Debug function to log API key status
const debugApiKey = () => {
  console.log('Google Maps API Key:', GOOGLE_MAPS_APIKEY ? 'Present' : 'Missing');
  console.log('API Key length:', GOOGLE_MAPS_APIKEY?.length || 0);
};

export default function LocationPickerExpo({
  mode,
  initialOrigin,
  initialDestination,
  onLocationSelect,
  onRouteSelect,
  onClose,
}: LocationPickerProps) {
  const mapRef = useRef<any>(null);

  // Debug API key on mount
  useEffect(() => {
    debugApiKey();
  }, []);

  // State management
  const [origin, setOrigin] = useState<Location | null>(initialOrigin || null);
  const [destination, setDestination] = useState<Location | null>(initialDestination || null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceDetails[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeInput, setActiveInput] = useState<'origin' | 'destination' | 'single'>('origin');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 6.9271, // Colombo, Sri Lanka
    longitude: 79.8612,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

  // Request location permissions
  const requestLocationPermission = async () => {
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please enable location permissions to use the map features.'
        );
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  useEffect(() => {
    requestLocationPermission();
  }, []);

  // Get current location
  const getCurrentLocation = async () => {
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is required to get your current location.');
        return;
      }

      const location = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.High,
      });

      const currentLocation: Location = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        address: `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`,
      };

      // Update map region to current location
      setMapRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      if (mode === 'single') {
        setSelectedLocation(currentLocation);
        setSearchQuery(currentLocation.address);
      } else {
        if (activeInput === 'origin') {
          setOrigin(currentLocation);
          setActiveInput('destination');
        } else {
          setDestination(currentLocation);
        }
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Could not get your current location. Please try again.');
    }
  };

  // Validate coordinates
  const isValidCoordinate = (lat: number, lng: number): boolean => {
    return (
      typeof lat === 'number' && 
      typeof lng === 'number' &&
      !isNaN(lat) && 
      !isNaN(lng) &&
      lat >= -90 && 
      lat <= 90 && 
      lng >= -180 && 
      lng <= 180 &&
      Math.abs(lat) > 0.000001 && // Avoid exactly 0,0
      Math.abs(lng) > 0.000001
    );
  };

  // Mock results for testing when API is not available
  const showMockResults = (query: string) => {
    const mockResults = [
      {
        place_id: 'mock_1',
        description: `${query} - Colombo, Sri Lanka`,
        structured_formatting: {
          main_text: query,
          secondary_text: 'Colombo, Sri Lanka'
        }
      },
      {
        place_id: 'mock_2', 
        description: `${query} - Kandy, Sri Lanka`,
        structured_formatting: {
          main_text: query,
          secondary_text: 'Kandy, Sri Lanka'
        }
      }
    ];
    setSearchResults(mockResults);
    setShowSearchResults(true);
  };

  // Search for places using Google Places API
  const searchPlaces = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    console.log('Searching for:', query);
    setIsSearching(true);

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          query
        )}&key=${GOOGLE_PLACES_APIKEY}&components=country:lk`
      );
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.predictions) {
        const results = data.predictions.map((prediction: any) => ({
          place_id: prediction.place_id,
          description: prediction.description,
          structured_formatting: prediction.structured_formatting || {
            main_text: prediction.description,
            secondary_text: ''
          }
        }));
        setSearchResults(results);
        setShowSearchResults(true);
      } else {
        console.warn('Google Places API error:', data.status);
        // Fallback to mock results
        showMockResults(query);
      }
    } catch (error) {
      console.error('Error searching places:', error);
      // Fallback to mock results
      showMockResults(query);
    } finally {
      setIsSearching(false);
    }
  };

  // Get place details and coordinates
  const getPlaceDetails = async (placeId: string): Promise<Location | null> => {
    // Handle mock results
    if (placeId.startsWith('mock_')) {
      const mockCoordinates = {
        mock_1: { lat: 6.9271, lng: 79.8612 }, // Colombo
        mock_2: { lat: 7.2966, lng: 80.6350 }, // Kandy
      };
      const coords = mockCoordinates[placeId as keyof typeof mockCoordinates] || { lat: 6.9271, lng: 79.8612 };
      return {
        lat: coords.lat,
        lng: coords.lng,
        address: placeId === 'mock_1' ? 'Colombo, Sri Lanka' : 'Kandy, Sri Lanka',
      };
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address&key=${GOOGLE_PLACES_APIKEY}`
      );
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.result) {
        const { geometry, formatted_address } = data.result;
        return {
          lat: geometry.location.lat,
          lng: geometry.location.lng,
          address: formatted_address,
        };
      } else {
        console.warn('Google Places Details API error:', data.status);
        return null;
      }
    } catch (error) {
      console.error('Error getting place details:', error);
      return null;
    }
  };

  // Handle place selection from search results
  const handlePlaceSelect = async (place: PlaceDetails) => {
    const location = await getPlaceDetails(place.place_id);
    if (!location) {
      Alert.alert('Error', 'Could not get location details. Please try again.');
      return;
    }

    if (mode === 'single') {
      setSelectedLocation(location);
      setSearchQuery(location.address);
    } else {
      // Route mode
      if (activeInput === 'origin') {
        setOrigin(location);
        setActiveInput('destination');
      } else {
        setDestination(location);
      }
    }
    
    setSearchResults([]);
    setShowSearchResults(false);
    setSearchQuery('');
  };

  // Handle map press for coordinate selection
  const handleMapPress = async (event: { coordinates: { latitude?: number; longitude?: number } }) => {
    console.log('Map pressed:', event);
    const { latitude, longitude } = event.coordinates;
    
    // Validate coordinates more strictly
    if (!latitude || !longitude || !isValidCoordinate(latitude, longitude)) {
      Alert.alert('Invalid Location', 'Please select a valid location on the map.');
      console.log('Invalid coordinates:', { latitude, longitude });
      return;
    }
    
    // Create location with coordinates
    const location: Location = {
      lat: latitude,
      lng: longitude,
      address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
    };

    if (mode === 'single') {
      setSelectedLocation(location);
      setSearchQuery(location.address);
    } else {
      // Route mode
      if (activeInput === 'origin') {
        setOrigin(location);
        setActiveInput('destination');
      } else {
        setDestination(location);
      }
    }
  };

  // Handle search input change
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (mode === 'single') {
      setSelectedLocation(null);
    }
    // Debounce search
    setTimeout(() => {
      if (text === searchQuery) {
        searchPlaces(text);
      }
    }, 500);
  };

  // Handle confirm button press
  const handleConfirm = () => {
    if (mode === 'single' && selectedLocation && onLocationSelect) {
      onLocationSelect(selectedLocation);
    } else if (mode === 'route' && origin && destination && onRouteSelect) {
      onRouteSelect(origin, destination);
    } else {
      Alert.alert('Incomplete Selection', `Please select ${mode === 'single' ? 'a location' : 'both origin and destination'}.`);
      return;
    }
    onClose();
  };

  // Swap origin and destination
  const swapLocations = () => {
    if (origin && destination) {
      const temp = origin;
      setOrigin(destination);
      setDestination(temp);
    }
  };

  // Clear all selections
  const clearAll = () => {
    setOrigin(null);
    setDestination(null);
    setSelectedLocation(null);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    setActiveInput(mode === 'route' ? 'origin' : 'single');
  };

  // Set active input for route mode
  const setActiveInputAndFocus = (inputType: 'origin' | 'destination') => {
    setActiveInput(inputType);
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const renderSearchResults = () => {
    if (!showSearchResults || searchResults.length === 0) return null;

    return (
      <View style={styles.searchResultsContainer}>
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.place_id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.searchResultItem}
              onPress={() => handlePlaceSelect(item)}
            >
              <MapPin size={16} color={Colors.neutral[500]} />
              <View style={styles.resultTextContainer}>
                <Text style={styles.resultMainText}>{item.structured_formatting.main_text}</Text>
                <Text style={styles.resultSecondaryText}>{item.structured_formatting.secondary_text}</Text>
              </View>
            </TouchableOpacity>
          )}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      </View>
    );
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          style={styles.container} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color={Colors.neutral[700]} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {mode === 'single' ? 'Select Location' : 'Select Route'}
            </Text>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.locationButton} onPress={getCurrentLocation}>
                <Navigation size={20} color={Colors.primary[600]} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.clearButton} onPress={clearAll}>
                <RotateCcw size={20} color={Colors.neutral[600]} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Input(s) */}
          <View style={styles.searchContainer}>
            {mode === 'route' ? (
              <>
                {/* Origin Input */}
                <TouchableOpacity 
                  style={[
                    styles.inputContainer, 
                    activeInput === 'origin' && styles.activeInput
                  ]}
                  onPress={() => setActiveInputAndFocus('origin')}
                >
                  <View style={[styles.locationDot, styles.originDot]} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="From where?"
                    value={activeInput === 'origin' ? searchQuery : (origin?.address || '')}
                    onChangeText={activeInput === 'origin' ? handleSearchChange : undefined}
                    onFocus={() => setActiveInputAndFocus('origin')}
                    editable={activeInput === 'origin'}
                  />
                  {origin && (
                    <TouchableOpacity onPress={() => setOrigin(null)}>
                      <X size={16} color={Colors.neutral[500]} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>

                {/* Swap Button */}
                {origin && destination && (
                  <TouchableOpacity style={styles.swapButton} onPress={swapLocations}>
                    <ArrowUpDown size={16} color={Colors.primary[600]} />
                  </TouchableOpacity>
                )}

                {/* Destination Input */}
                <TouchableOpacity 
                  style={[
                    styles.inputContainer, 
                    activeInput === 'destination' && styles.activeInput
                  ]}
                  onPress={() => setActiveInputAndFocus('destination')}
                >
                  <View style={[styles.locationDot, styles.destinationDot]} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="To where?"
                    value={activeInput === 'destination' ? searchQuery : (destination?.address || '')}
                    onChangeText={activeInput === 'destination' ? handleSearchChange : undefined}
                    onFocus={() => setActiveInputAndFocus('destination')}
                    editable={activeInput === 'destination'}
                  />
                  {destination && (
                    <TouchableOpacity onPress={() => setDestination(null)}>
                      <X size={16} color={Colors.neutral[500]} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              /* Single Location Input */
              <View style={[styles.inputContainer, styles.activeInput]}>
                <Search size={20} color={Colors.neutral[500]} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search for a location..."
                  value={searchQuery}
                  onChangeText={handleSearchChange}
                />
                {selectedLocation && (
                  <TouchableOpacity onPress={() => {
                    setSelectedLocation(null);
                    setSearchQuery('');
                  }}>
                    <X size={16} color={Colors.neutral[500]} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Search Results */}
          {renderSearchResults()}

          {/* Expo Maps */}
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
                // Single Location Marker
                ...(selectedLocation && mode === 'single' ? [{
                  id: 'selected',
                  coordinates: { latitude: selectedLocation.lat, longitude: selectedLocation.lng },
                  title: 'Selected Location',
                  snippet: selectedLocation.address,
                }] : []),
              ]}
            />

            {/* Map Instructions */}
            <View style={styles.mapInstructions}>
              <Text style={styles.instructionsText}>
                {mode === 'single' 
                  ? 'Tap on the map to select a location or search above'
                  : 'Tap on the map to set origin and destination points'
                }
              </Text>
            </View>
          </View>

          {/* Confirm Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                (mode === 'single' ? !selectedLocation : !origin || !destination) && styles.disabledButton
              ]}
              onPress={handleConfirm}
              disabled={mode === 'single' ? !selectedLocation : !origin || !destination}
            >
              <Check size={20} color={Colors.white} />
              <Text style={styles.confirmButtonText}>
                {mode === 'single' ? 'Select Location' : 'Confirm Route'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  closeButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
  },
  clearButton: {
    padding: Spacing.sm,
  },
  searchContainer: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[50],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  activeInput: {
    borderColor: Colors.primary[600],
    backgroundColor: Colors.primary[50],
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  originDot: {
    backgroundColor: Colors.success[500],
  },
  destinationDot: {
    backgroundColor: Colors.error[500],
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[900],
    paddingVertical: Spacing.xs,
  },
  swapButton: {
    alignSelf: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary[600],
    borderRadius: 16,
    padding: Spacing.xs,
    marginVertical: Spacing.xs,
  },
  searchResultsContainer: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
    maxHeight: 200,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  resultTextContainer: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  resultMainText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[900],
  },
  resultSecondaryText: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[600],
    marginTop: 2,
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
    top: Spacing.lg,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionsText: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[600],
    textAlign: 'center',
  },
  footer: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
  },
  confirmButton: {
    backgroundColor: Colors.primary[600],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: 12,
    gap: Spacing.sm,
  },
  confirmButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Bold',
    color: Colors.white,
  },
  disabledButton: {
    backgroundColor: Colors.neutral[300],
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  locationButton: {
    padding: Spacing.xs,
    borderRadius: 8,
    backgroundColor: Colors.primary[50],
  },
});
