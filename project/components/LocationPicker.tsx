import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Dimensions, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Platform, Keyboard } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Marker, Polyline, Region } from 'react-native-maps';
import * as Location from 'expo-location';

const GOOGLE_MAPS_API_KEY = Platform.OS === 'ios'
  ? 'AIzaSyCtpf8qeboIsNHPaO7idcU2e_3huaHpae0'
  : 'AIzaSyCtpf8qeboIsNHPaO7idcU2e_3huaHpae0';

type Place = {
  description: string;
  place_id: string;
};

type LocationResult = {
  lat: number;
  lng: number;
  address: string;
};

interface LocationPickerProps {
  height?: number;
  width?: number;
  onLocationsSelected?: (origin: LocationResult, destination: LocationResult) => void;
  initialOrigin?: LocationResult | null;
  initialDestination?: LocationResult | null;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  height = 600,
  width = Dimensions.get('window').width - 40,
  onLocationsSelected,
  initialOrigin = null,
  initialDestination = null,
}) => {
  const [origin, setOrigin] = useState<LocationResult | null>(initialOrigin);
  const [destination, setDestination] = useState<LocationResult | null>(initialDestination);
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<Place[]>([]);
  const [routeCoords, setRouteCoords] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<Region | null>(null);
  const [selectionMode, setSelectionMode] = useState<'origin' | 'destination' | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const mapRef = useRef<MapView>(null);

  // Get user location for initial region
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    })();
  }, []);

  // Fetch predictions for search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setPredictions([]);
      return;
    }
    const fetchPredictions = async () => {
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(searchQuery)}&key=${GOOGLE_MAPS_API_KEY}`
        );
        const json = await res.json();
        setPredictions(json.predictions || []);
      } catch (e) {
        setPredictions([]);
      }
    };
    fetchPredictions();
  }, [searchQuery]);

  // Fetch route when both origin and destination are set
  // Only fetch route when both are set, but do not call onLocationsSelected automatically
  useEffect(() => {
    if (origin && destination) {
      fetchRoute();
    } else {
      setRouteCoords([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination]);

  const fetchPlaceDetails = async (placeId: string): Promise<LocationResult | null> => {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const json = await res.json();
      const loc = json.result.geometry.location;
      return {
        lat: loc.lat,
        lng: loc.lng,
        address: json.result.formatted_address,
      };
    } catch (e) {
      return null;
    }
  };

  const fetchRoute = async () => {
    if (!origin || !destination) return;
    setLoadingRoute(true);
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const json = await res.json();
      if (json.routes && json.routes.length > 0) {
        const points = decodePolyline(json.routes[0].overview_polyline.points);
        setRouteCoords(points);
        // Fit map to route
        setTimeout(() => {
          mapRef.current?.fitToCoordinates(points, {
            edgePadding: { top: 60, bottom: 60, left: 60, right: 60 },
            animated: true,
          });
        }, 500);
      } else {
        setRouteCoords([]);
      }
    } catch (e) {
      setRouteCoords([]);
    }
    setLoadingRoute(false);
  };

  // Polyline decoder (Google encoded polyline algorithm)
  function decodePolyline(encoded: string) {
    let points = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;
    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;
      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;
      points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return points;
  }

  const handlePlaceSelect = async (place: Place) => {
    setPredictions([]);
    Keyboard.dismiss();
    const details = await fetchPlaceDetails(place.place_id);
    if (details) {
      if (selectionMode === 'origin') {
        setOrigin(details);
      } else if (selectionMode === 'destination') {
        setDestination(details);
      }
      setSelectionMode(null);
      setSearchQuery('');
      setShowInstructions(false);
    }
  };

  const handleMapPress = async (event: any) => {
    if (!selectionMode) return;
    
    const { latitude, longitude } = event.nativeEvent.coordinate;
    
    try {
      // Reverse geocoding to get address
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const json = await res.json();
      
      const address = json.results && json.results.length > 0 
        ? json.results[0].formatted_address 
        : `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      
      const locationResult: LocationResult = {
        lat: latitude,
        lng: longitude,
        address: address,
      };
      
      if (selectionMode === 'origin') {
        setOrigin(locationResult);
      } else if (selectionMode === 'destination') {
        setDestination(locationResult);
      }
      
      setSelectionMode(null);
      setShowInstructions(false);
    } catch (error) {
      console.error('Error getting address:', error);
      // Fallback to coordinates
      const locationResult: LocationResult = {
        lat: latitude,
        lng: longitude,
        address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      };
      
      if (selectionMode === 'origin') {
        setOrigin(locationResult);
      } else if (selectionMode === 'destination') {
        setDestination(locationResult);
      }
      
      setSelectionMode(null);
      setShowInstructions(false);
    }
  };

  const startLocationSelection = (mode: 'origin' | 'destination') => {
    setSelectionMode(mode);
    setSearchQuery('');
    setPredictions([]);
    setShowInstructions(true);
  };

  const cancelSelection = () => {
    setSelectionMode(null);
    setSearchQuery('');
    setPredictions([]);
    setShowInstructions(false);
  };

  const clearAll = () => {
    setOrigin(null);
    setDestination(null);
    setSearchQuery('');
    setPredictions([]);
    setRouteCoords([]);
    setSelectionMode(null);
    setShowInstructions(false);
  };

  // Helper to convert LocationResult to { latitude, longitude }
  const toLatLng = (loc: LocationResult | null) =>
    loc ? { latitude: loc.lat, longitude: loc.lng } : undefined;

  return (
    <View style={[styles.container, { height, width }]}> 
      {/* Location Selection Controls */}
      <View style={styles.searchContainer}>
        {!selectionMode ? (
          <>
            {/* Origin Button */}
            <TouchableOpacity
              style={[styles.locationButton, origin && styles.selectedLocationButton]}
              onPress={() => startLocationSelection('origin')}
            >
              <Text style={[styles.locationButtonLabel, origin && styles.selectedLocationLabel]}>
                Origin:
              </Text>
              <Text style={[styles.locationButtonText, !origin && styles.placeholderText]} numberOfLines={2}>
                {origin ? origin.address : 'Tap to select origin'}
              </Text>
            </TouchableOpacity>

            {/* Destination Button */}
            <TouchableOpacity
              style={[styles.locationButton, destination && styles.selectedLocationButton]}
              onPress={() => startLocationSelection('destination')}
            >
              <Text style={[styles.locationButtonLabel, destination && styles.selectedLocationLabel]}>
                Destination:
              </Text>
              <Text style={[styles.locationButtonText, !destination && styles.placeholderText]} numberOfLines={2}>
                {destination ? destination.address : 'Tap to select destination'}
              </Text>
            </TouchableOpacity>

            {/* Action Buttons */}
            <View style={styles.actionButtonsRow}>
              {(origin || destination) && (
                <TouchableOpacity style={styles.clearButton} onPress={clearAll}>
                  <Text style={styles.clearButtonText}>Clear All</Text>
                </TouchableOpacity>
              )}
              {origin && destination && (
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={() => {
                    if (onLocationsSelected) onLocationsSelected(origin, destination);
                  }}
                >
                  <Text style={styles.confirmButtonText}>Confirm Route</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        ) : (
          <>
            {/* Instructions */}
            {showInstructions && (
              <View style={styles.instructionsContainer}>
                <Text style={styles.instructionsTitle}>
                  Select {selectionMode === 'origin' ? 'Origin' : 'Destination'}
                </Text>
                <Text style={styles.instructionsText}>
                  Search below or tap on the map to select a location
                </Text>
              </View>
            )}

            {/* Search Input */}
            <TextInput
              style={styles.searchInput}
              placeholder={`Search for ${selectionMode}...`}
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />

            {/* Search Predictions */}
            {predictions.length > 0 && (
              <FlatList
                data={predictions}
                keyExtractor={item => item.place_id}
                style={styles.predictionsList}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.predictionItem} onPress={() => handlePlaceSelect(item)}>
                    <Text style={styles.predictionText}>{item.description}</Text>
                  </TouchableOpacity>
                )}
              />
            )}

            {/* Cancel Button */}
            <TouchableOpacity style={styles.cancelButton} onPress={cancelSelection}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={
            origin
              ? {
                  latitude: origin.lat,
                  longitude: origin.lng,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }
              : userLocation || {
                  latitude: 6.9271,
                  longitude: 79.8612,
                  latitudeDelta: 0.0922,
                  longitudeDelta: 0.0421,
                }
          }
          showsUserLocation
          onPress={handleMapPress}
        >
          {/* Show origin marker if origin is set */}
          {origin && (
            <Marker
              coordinate={toLatLng(origin)!}
              title="Origin"
              pinColor="#2196f3"
            />
          )}
          {/* Show destination marker if destination is set */}
          {destination && (
            <Marker
              coordinate={toLatLng(destination)!}
              title="Destination"
              pinColor="#e91e63"
            />
          )}
          {/* Show route polyline if available */}
          {routeCoords.length > 0 && (
            <Polyline
              coordinates={routeCoords.map(p => ({ latitude: p.latitude, longitude: p.longitude }))}
              strokeColor="#2196f3"
              strokeWidth={4}
            />
          )}
        </MapView>
        {loadingRoute && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#2196f3" />
          </View>
        )}
        
        {/* Selection Mode Overlay */}
        {selectionMode && (
          <View style={styles.selectionOverlay}>
            <Text style={styles.selectionOverlayText}>
              Tap on the map to select {selectionMode}
            </Text>
          </View>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 8,
    backgroundColor: '#f5f5f5',
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 0,
  },
  searchContainer: {
    width: '100%',
    padding: 15,
    backgroundColor: '#fff',
    zIndex: 2,
  },
  locationButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderStyle: 'dashed',
  },
  selectedLocationButton: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
    borderStyle: 'solid',
  },
  locationButtonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  selectedLocationLabel: {
    color: '#2196f3',
  },
  locationButtonText: {
    fontSize: 16,
    color: '#212529',
    lineHeight: 20,
  },
  placeholderText: {
    color: '#6c757d',
    fontStyle: 'italic',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  clearButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  confirmButton: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 2,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  instructionsContainer: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 14,
    color: '#856404',
  },
  searchInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#212529',
    marginBottom: 10,
  },
  predictionsList: {
    backgroundColor: '#fff',
    borderRadius: 8,
    maxHeight: 150,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  predictionItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  predictionText: {
    fontSize: 15,
    color: '#212529',
  },
  cancelButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  mapContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    minHeight: 400,
    maxHeight: 600,
    position: 'relative',
    zIndex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
    minHeight: 400,
    maxHeight: 600,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  selectionOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(33, 150, 243, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    zIndex: 5,
  },
  selectionOverlayText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorText: {
    color: '#e53935',
    textAlign: 'center',
    padding: 8,
    fontSize: 15,
  },
});

export default LocationPicker;
