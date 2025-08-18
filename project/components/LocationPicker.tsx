import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { 
  X, 
  Search, 
  MapPin, 
  Navigation, 
  RotateCcw,
  Check
} from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { Spacing, Typography } from '../constants/Spacing';
import { Location } from '../types';
import { getGoogleMapsApiKey } from '../config/env';

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

export default function LocationPicker({
  mode,
  initialOrigin,
  initialDestination,
  onLocationSelect,
  onRouteSelect,
  onClose,
}: LocationPickerProps) {
  const mapRef = useRef<MapView>(null);
  const originInputRef = useRef<any>(null);
  const destinationInputRef = useRef<any>(null);

  // State management
  const [origin, setOrigin] = useState<Location | null>(initialOrigin || null);
  const [destination, setDestination] = useState<Location | null>(initialDestination || null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceDetails[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeInput, setActiveInput] = useState<'origin' | 'destination' | 'single'>('origin');
  const [mapRegion, setMapRegion] = useState({
    latitude: initialOrigin?.lat || 37.78825,
    longitude: initialOrigin?.lng || -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  // Update map region when locations change
  useEffect(() => {
    if (origin && destination && mapRef.current) {
      // Fit map to show both origin and destination
      const coordinates = [
        { latitude: origin.lat, longitude: origin.lng },
        { latitude: destination.lat, longitude: destination.lng },
      ];
      
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    } else if ((origin || destination || selectedLocation) && mapRef.current) {
      const location = origin || destination || selectedLocation;
      if (location) {
        mapRef.current.animateToRegion({
          latitude: location.lat,
          longitude: location.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    }
  }, [origin, destination, selectedLocation]);

  // Search for places using Google Places API
  const searchPlaces = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          query
        )}&key=${GOOGLE_MAPS_APIKEY}&components=country:lk` // Restrict to Sri Lanka, change as needed
      );
      
      const data = await response.json();
      
      if (data.status === 'OK') {
        setSearchResults(data.predictions || []);
      } else {
        console.error('Places API error:', data.status);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching places:', error);
      setSearchResults([]);
    }
    setIsSearching(false);
  };

  // Get place details and coordinates
  const getPlaceDetails = async (placeId: string): Promise<Location | null> => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address&key=${GOOGLE_MAPS_APIKEY}`
      );
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.result) {
        const { geometry, formatted_address } = data.result;
        return {
          lat: geometry.location.lat,
          lng: geometry.location.lng,
          address: formatted_address,
        };
      }
    } catch (error) {
      console.error('Error getting place details:', error);
    }
    return null;
  };

  // Handle place selection from search results
  const handlePlaceSelect = async (place: PlaceDetails) => {
    const location = await getPlaceDetails(place.place_id);
    if (!location) return;

    if (mode === 'single') {
      setSelectedLocation(location);
      setSearchQuery('');
      setSearchResults([]);
    } else {
      // Route mode
      if (activeInput === 'origin') {
        setOrigin(location);
        setActiveInput('destination');
        // Clear search and focus destination input
        setSearchQuery('');
        setSearchResults([]);
        setTimeout(() => destinationInputRef.current?.focus(), 100);
      } else {
        setDestination(location);
        setSearchQuery('');
        setSearchResults([]);
      }
    }
  };

  // Handle map press for coordinate selection
  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    
    // Reverse geocode to get address
    reverseGeocode(latitude, longitude).then((address) => {
      const location: Location = {
        lat: latitude,
        lng: longitude,
        address: address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      };

      if (mode === 'single') {
        setSelectedLocation(location);
      } else {
        // Route mode
        if (activeInput === 'origin') {
          setOrigin(location);
          setActiveInput('destination');
        } else {
          setDestination(location);
        }
      }
    });
  };

  // Reverse geocoding to get address from coordinates
  const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_APIKEY}`
      );
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        return data.results[0].formatted_address;
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
    return null;
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
    setActiveInput('origin');
  };

  const renderSearchResults = () => {
    if (searchResults.length === 0) return null;

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
            <TouchableOpacity style={styles.clearButton} onPress={clearAll}>
              <RotateCcw size={20} color={Colors.neutral[600]} />
            </TouchableOpacity>
          </View>

          {/* Search Input(s) */}
          <View style={styles.searchContainer}>
            {mode === 'route' ? (
              <>
                {/* Origin Input */}
                <View style={[styles.inputContainer, activeInput === 'origin' && styles.activeInput]}>
                  <View style={styles.inputIcon}>
                    <View style={[styles.locationDot, styles.originDot]} />
                  </View>
                  <TextInput
                    ref={originInputRef}
                    style={styles.searchInput}
                    placeholder="From where?"
                    value={origin ? origin.address : searchQuery}
                    onChangeText={(text) => {
                      setSearchQuery(text);
                      searchPlaces(text);
                      setActiveInput('origin');
                    }}
                    onFocus={() => setActiveInput('origin')}
                  />
                  {origin && (
                    <TouchableOpacity onPress={() => setOrigin(null)}>
                      <X size={16} color={Colors.neutral[500]} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Swap Button */}
                <TouchableOpacity style={styles.swapButton} onPress={swapLocations}>
                  <RotateCcw size={16} color={Colors.primary[600]} />
                </TouchableOpacity>

                {/* Destination Input */}
                <View style={[styles.inputContainer, activeInput === 'destination' && styles.activeInput]}>
                  <View style={styles.inputIcon}>
                    <View style={[styles.locationDot, styles.destinationDot]} />
                  </View>
                  <TextInput
                    ref={destinationInputRef}
                    style={styles.searchInput}
                    placeholder="To where?"
                    value={destination ? destination.address : (activeInput === 'destination' ? searchQuery : '')}
                    onChangeText={(text) => {
                      setSearchQuery(text);
                      searchPlaces(text);
                      setActiveInput('destination');
                    }}
                    onFocus={() => setActiveInput('destination')}
                  />
                  {destination && (
                    <TouchableOpacity onPress={() => setDestination(null)}>
                      <X size={16} color={Colors.neutral[500]} />
                    </TouchableOpacity>
                  )}
                </View>
              </>
            ) : (
              /* Single Location Input */
              <View style={[styles.inputContainer, styles.activeInput]}>
                <Search size={20} color={Colors.neutral[500]} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search for a location..."
                  value={selectedLocation ? selectedLocation.address : searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    searchPlaces(text);
                  }}
                />
                {selectedLocation && (
                  <TouchableOpacity onPress={() => setSelectedLocation(null)}>
                    <X size={16} color={Colors.neutral[500]} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Search Results */}
          {renderSearchResults()}

          {/* Map */}
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={mapRegion}
              onPress={handleMapPress}
              showsUserLocation={true}
              showsMyLocationButton={true}
            >
              {/* Origin Marker */}
              {origin && (
                <Marker
                  coordinate={{ latitude: origin.lat, longitude: origin.lng }}
                  title="Origin"
                  description={origin.address}
                  pinColor={Colors.success[500]}
                />
              )}

              {/* Destination Marker */}
              {destination && (
                <Marker
                  coordinate={{ latitude: destination.lat, longitude: destination.lng }}
                  title="Destination"
                  description={destination.address}
                  pinColor={Colors.error[500]}
                />
              )}

              {/* Single Location Marker */}
              {selectedLocation && mode === 'single' && (
                <Marker
                  coordinate={{ latitude: selectedLocation.lat, longitude: selectedLocation.lng }}
                  title="Selected Location"
                  description={selectedLocation.address}
                  pinColor={Colors.primary[500]}
                />
              )}

              {/* Route Directions */}
              {origin && destination && (
                <MapViewDirections
                  origin={{ latitude: origin.lat, longitude: origin.lng }}
                  destination={{ latitude: destination.lat, longitude: destination.lng }}
                  apikey={GOOGLE_MAPS_APIKEY}
                  strokeWidth={4}
                  strokeColor={Colors.primary[600]}
                  optimizeWaypoints={true}
                  onError={(errorMessage) => {
                    console.error('Directions error:', errorMessage);
                  }}
                />
              )}
            </MapView>

            {/* Map Instructions */}
            <View style={styles.mapInstructions}>
              <Text style={styles.instructionsText}>
                {mode === 'single' 
                  ? 'Tap on the map or search to select a location'
                  : `Select ${activeInput} location by tapping the map or searching`
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
                {mode === 'single' ? 'Confirm Location' : 'Confirm Route'}
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
  inputIcon: {
    marginRight: Spacing.sm,
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
});
