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
  const [originQuery, setOriginQuery] = useState('');
  const [destinationQuery, setDestinationQuery] = useState('');
  const [originPredictions, setOriginPredictions] = useState<Place[]>([]);
  const [destinationPredictions, setDestinationPredictions] = useState<Place[]>([]);
  const [routeCoords, setRouteCoords] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<Region | null>(null);
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

  // Fetch predictions for origin
  useEffect(() => {
    if (originQuery.length < 2) {
      setOriginPredictions([]);
      return;
    }
    const fetchPredictions = async () => {
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(originQuery)}&key=${GOOGLE_MAPS_API_KEY}`
        );
        const json = await res.json();
        setOriginPredictions(json.predictions || []);
      } catch (e) {
        setOriginPredictions([]);
      }
    };
    fetchPredictions();
  }, [originQuery]);

  // Fetch predictions for destination
  useEffect(() => {
    if (destinationQuery.length < 2) {
      setDestinationPredictions([]);
      return;
    }
    const fetchPredictions = async () => {
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(destinationQuery)}&key=${GOOGLE_MAPS_API_KEY}`
        );
        const json = await res.json();
        setDestinationPredictions(json.predictions || []);
      } catch (e) {
        setDestinationPredictions([]);
      }
    };
    fetchPredictions();
  }, [destinationQuery]);

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

  const handleOriginSelect = async (place: Place) => {
    setOriginQuery(place.description);
    setOriginPredictions([]);
    Keyboard.dismiss();
    const details = await fetchPlaceDetails(place.place_id);
    if (details) setOrigin(details);
  };

  const handleDestinationSelect = async (place: Place) => {
    setDestinationQuery(place.description);
    setDestinationPredictions([]);
    Keyboard.dismiss();
    const details = await fetchPlaceDetails(place.place_id);
    if (details) setDestination(details);
  };

  const clearAll = () => {
    setOrigin(null);
    setDestination(null);
    setOriginQuery('');
    setDestinationQuery('');
    setRouteCoords([]);
  };

  // Helper to convert LocationResult to { latitude, longitude }
  const toLatLng = (loc: LocationResult | null) =>
    loc ? { latitude: loc.lat, longitude: loc.lng } : undefined;

  return (
    <View style={[styles.container, { height, width }]}> 
      {/* Search Inputs */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Search origin..."
          placeholderTextColor="#000"
          value={originQuery}
          onChangeText={text => {
            setOriginQuery(text);
            setOrigin(null);
          }}
        />
        {originPredictions.length > 0 && (
          <FlatList
            data={originPredictions}
            keyExtractor={item => item.place_id}
            style={styles.predictionsList}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.predictionItem} onPress={() => handleOriginSelect(item)}>
                <Text>{item.description}</Text>
              </TouchableOpacity>
            )}
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="Search destination..."
          placeholderTextColor="#000"
          value={destinationQuery}
          onChangeText={text => {
            setDestinationQuery(text);
            setDestination(null);
          }}
        />
        {destinationPredictions.length > 0 && (
          <FlatList
            data={destinationPredictions}
            keyExtractor={item => item.place_id}
            style={styles.predictionsList}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.predictionItem} onPress={() => handleDestinationSelect(item)}>
                <Text>{item.description}</Text>
              </TouchableOpacity>
            )}
          />
        )}
        {(origin || destination) && (
          <TouchableOpacity style={styles.clearButton} onPress={clearAll}>
            <Text style={{ color: '#fff' }}>Clear</Text>
          </TouchableOpacity>
        )}
        {/* Confirm button: only show if both origin and destination are set */}
        {origin && destination && (
          <TouchableOpacity
            style={[styles.clearButton, { backgroundColor: '#2196f3', marginTop: 8 }]}
            onPress={() => {
              if (onLocationsSelected) onLocationsSelected(origin, destination);
              setOriginPredictions([]);
              setDestinationPredictions([]);
            }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Confirm Route</Text>
          </TouchableOpacity>
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
    padding: 10,
    
    backgroundColor: '#fff',
    zIndex: 2,
  },
  input: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    color:"#000",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 6,
    fontSize: 16,
  },
  predictionsList: {
    backgroundColor: '#fff',
    borderRadius: 8,
    maxHeight: 120,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#eee',
  },
  predictionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  clearButton: {
    backgroundColor: '#888',
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
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
  errorText: {
    color: '#e53935',
    textAlign: 'center',
    padding: 8,
    fontSize: 15,
  },
});

export default LocationPicker;
