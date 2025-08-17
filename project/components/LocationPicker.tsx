import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform
} from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import * as ExpoLocation from 'expo-location';
import { X, MapPin, Search, Map, List, Crosshair, Target } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { Spacing, Typography } from '@/constants/Spacing';
import { Location } from '@/types';

interface LocationPickerProps {
  onLocationSelect: (location: Location) => void;
  onClose: () => void;
  initialLocation?: Location;
}

interface NominatimResult {
  place_id: string;
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

const { width, height } = Dimensions.get('window');

// Sri Lanka bounds
const SRI_LANKA_REGION = {
  latitude: 7.8731,
  longitude: 80.7718,
  latitudeDelta: 3.0,
  longitudeDelta: 3.0,
};

const popularLocations: Location[] = [
  { lat: 6.9271, lng: 79.8612, address: 'Colombo Fort', city: 'Colombo' },
  { lat: 6.9319, lng: 79.8478, address: 'Pettah', city: 'Colombo' },
  { lat: 6.8649, lng: 79.8997, address: 'Mount Lavinia', city: 'Colombo' },
  { lat: 7.2906, lng: 80.6337, address: 'Kandy City Center', city: 'Kandy' },
  { lat: 6.0535, lng: 80.2210, address: 'Galle Fort', city: 'Galle' },
  { lat: 7.9554, lng: 81.0137, address: 'Anuradhapura', city: 'Anuradhapura' },
  { lat: 8.3114, lng: 80.4037, address: 'Dambulla', city: 'Dambulla' },
];

export function LocationPicker({ onLocationSelect, onClose, initialLocation }: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Location[]>([]);
  const [filteredLocations, setFilteredLocations] = useState(popularLocations);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(initialLocation || null);
  const [mapRegion, setMapRegion] = useState({
    ...SRI_LANKA_REGION,
    latitude: initialLocation?.lat || SRI_LANKA_REGION.latitude,
    longitude: initialLocation?.lng || SRI_LANKA_REGION.longitude,
  });
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [gettingCurrentLocation, setGettingCurrentLocation] = useState(false);
  const [mapReady, setMapReady] = useState(false); // prevents premature controlled region causing blank map
  const [mapLayoutDone, setMapLayoutDone] = useState(false); // ensure layout pass complete before animating

  // Using OpenStreetMap tiles instead of Google Maps. No provider prop -> default native provider, we overlay OSM tiles.
  // NOTE: Heavy production usage of OSM default tile server is discouraged; consider a hosted tile service.

  const mapRef = useRef<MapView>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialLocation) {
      setSelectedLocation(initialLocation);
      const newRegion = {
        latitude: initialLocation.lat,
        longitude: initialLocation.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      setMapRegion(newRegion);
      console.log('Initial location set:', initialLocation, 'Region:', newRegion);
    }
  }, [initialLocation]);

  // Debounced search function
  const performSearch = async (query: string) => {

    if (!query.trim() || query.length < 3) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      // Use a more reliable geocoding service with better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      // 
      const searchUrl = `https://nominatim.openstreetmap.org/search?` +
  `q=${encodeURIComponent(query)}&` +
  `format=json&` +
  `countrycodes=lk&` +
  `limit=10&` +
  `addressdetails=1&` +
  `accept-language=en`;

const response = await fetch(searchUrl, {
  headers: {
    'User-Agent': 'BidNGo-Mobile-App/1.0 (contact@example.com)',
    'Accept': 'application/json',
  }
});


      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Response is not JSON');
      }

      const text = await response.text();
      console.log('Raw response:', text.substring(0, 200) + '...');

      // Check if response is actually JSON
      if (!text.trim() || (!text.trim().startsWith('[') && !text.trim().startsWith('{'))) {
        throw new Error('Invalid JSON response format');
      }

      let data: NominatimResult[];
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        throw new Error('Failed to parse response as JSON');
      }

      if (!Array.isArray(data)) {
        console.error('Response is not an array:', data);
        throw new Error('Invalid response format - expected array');
      }

      console.log('Parsed data:', data.length, 'results');

      const locations: Location[] = data.map(item => ({
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        address: item.display_name.split(',')[0], // First part is usually the most relevant
        city: item.address?.city || item.address?.town || item.address?.village || undefined,
      }));

      console.log('Mapped locations:', locations);

      setSearchResults(locations);
      setShowSearchResults(true);

      // Also filter popular locations
      const filtered = popularLocations.filter(location =>
        location.address.toLowerCase().includes(query.toLowerCase()) ||
        location.city?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredLocations([...filtered, ...locations]);

      console.log('Search completed successfully with', locations.length, 'results');

    } catch (error) {
      console.error('Search failed:', error);

      // Fallback to local search only
      const filtered = popularLocations.filter(location =>
        location.address.toLowerCase().includes(query.toLowerCase()) ||
        location.city?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredLocations(filtered);
      setShowSearchResults(false);

      // Only show error if it's not a user-cancelled search
      if (error instanceof Error && !error.message.includes('aborted')) {
        Alert.alert('Search Error', `Online search failed: ${error.message}. Showing local results only.`);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 500);

    if (!query.trim()) {
      setFilteredLocations(popularLocations);
      setShowSearchResults(false);
    }
  };

  const handleMapPress = async (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;

    // Reverse geocoding to get address
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?` +
        `lat=${latitude}&` +
        `lon=${longitude}&` +
        `format=json&` +
        `addressdetails=1`,
        {
          signal: controller.signal,
          headers: {
            'User-Agent': 'BidNGo-Mobile-App/1.0',
            'Accept': 'application/json',
          }
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const text = await response.text();

        // Check if response is actually JSON
        if (text.trim().startsWith('{')) {
          const data = JSON.parse(text);

          const location: Location = {
            lat: latitude,
            lng: longitude,
            address: data.display_name?.split(',')[0] || `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
            city: data.address?.city || data.address?.town || data.address?.village || undefined,
          };

          setSelectedLocation(location);
          return;
        }
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
    }

    // Fallback to coordinates if reverse geocoding fails
    const location: Location = {
      lat: latitude,
      lng: longitude,
      address: `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
    };
    setSelectedLocation(location);
  };

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
    setShowSearchResults(false);
    setSearchQuery('');

    // Update map region to the selected location
    const newRegion = {
      latitude: location.lat,
      longitude: location.lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };

    setMapRegion(newRegion);

    // Animate map to selected location if in map mode
    if (viewMode === 'map' && mapRef.current) {
      mapRef.current.animateToRegion(newRegion, 1000);
    }
  };

  const handleConfirmLocation = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
      onClose();
    } else {
      Alert.alert('No Location Selected', 'Please select a location first.');
    }
  };

  const handleCurrentLocation = async () => {
    setGettingCurrentLocation(true);

    try {
      // Request location permission
      let { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to get your current location.');
        return;
      }

      // Get current position
      const location = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.High,
        timeInterval: 10000,
        distanceInterval: 10,
      });

      const { latitude, longitude } = location.coords;

      try {
        // Reverse geocoding to get address
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?` +
          `lat=${latitude}&` +
          `lon=${longitude}&` +
          `format=json&` +
          `addressdetails=1`,
          {
            signal: controller.signal,
            headers: {
              'User-Agent': 'BidNGo-Mobile-App/1.0',
              'Accept': 'application/json',
            }
          }
        );

        clearTimeout(timeoutId);

        if (response.ok) {
          const text = await response.text();
          if (text.trim().startsWith('{')) {
            const data = JSON.parse(text);

            const locationData: Location = {
              lat: latitude,
              lng: longitude,
              address: data.display_name?.split(',')[0] || `Current Location`,
              city: data.address?.city || data.address?.town || data.address?.village || 'Current Location',
            };

            setSelectedLocation(locationData);
            setMapRegion({
              latitude,
              longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            });

            if (mapRef.current) {
              mapRef.current.animateToRegion({
                latitude,
                longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }, 1000);
            }
            return;
          }
        }
      } catch (error) {
        console.error('Reverse geocoding failed:', error);
      }

      // Fallback if reverse geocoding fails
      const locationData: Location = {
        lat: latitude,
        lng: longitude,
        address: 'Current Location',
        city: 'Current Location',
      };

      setSelectedLocation(locationData);
      setMapRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
      }
    } catch (error) {
      console.error('Current location error:', error);
      Alert.alert('Error', 'Failed to get current location. Please try again.');
    } finally {
      setGettingCurrentLocation(false);
    }
  };

  const renderLocationItem = ({ item }: { item: Location }) => (
    <TouchableOpacity
      style={styles.locationItem}
      onPress={() => handleLocationSelect(item)}
    >
      <MapPin size={20} color={Colors.primary[600]} />
      <View style={styles.locationDetails}>
        <Text style={styles.locationAddress}>{item.address}</Text>
        {item.city && (
          <Text style={styles.locationCity}>{item.city}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderMapView = () => {
    console.log('Rendering map with region:', mapRegion);
    console.log('Selected location:', selectedLocation);

    return (
      <View style={styles.mapContainer}>
        {!mapReady && (
          <View style={styles.mapLoaderOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color={Colors.primary[600]} />
            <Text style={styles.mapLoaderText}>Loading map...</Text>
          </View>
        )}
        <MapView
          ref={mapRef}
          style={styles.map}
          // Use initialRegion for first paint; switch to controlled region after map is ready.
          initialRegion={mapRegion}
          {...(mapReady ? { region: mapRegion } : {})}
          onRegionChangeComplete={setMapRegion}
          onPress={handleMapPress}
          showsUserLocation={false}
          showsMyLocationButton={false}
          onMapReady={() => {
            console.log('Map ready');
            setMapReady(true);
            // Ensure we snap to the selected or initial region after a tiny delay (layout complete)
            setTimeout(() => {
              if (mapRef.current) {
                mapRef.current.animateToRegion(mapRegion, 500);
              }
            }, 150);
          }}
          onMapLoaded={() => console.log('Map loaded')}
          onLayout={() => {
            if (!mapLayoutDone) {
              setMapLayoutDone(true);
              // Force a redraw workaround for some Android modal issues
              setTimeout(() => {
                if (mapRef.current && mapReady) {
                  mapRef.current.animateToRegion(mapRegion, 250);
                }
              }, 100);
            }
          }}
        >
          {/* OpenStreetMap tile layer */}
          <UrlTile
            urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maximumZ={19}
            tileSize={256}
            shouldReplaceMapContent={true}
            zIndex={0}
          />
          {selectedLocation && (
            <Marker
              coordinate={{
                latitude: selectedLocation.lat,
                longitude: selectedLocation.lng,
              }}
              title={selectedLocation.address}
              description={selectedLocation.city}
            />
          )}
        </MapView>

        {/* Current location button */}
        <TouchableOpacity
          style={[styles.currentLocationButton, gettingCurrentLocation && styles.currentLocationButtonLoading]}
          onPress={handleCurrentLocation}
          disabled={gettingCurrentLocation}
        >
          {gettingCurrentLocation ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Target size={20} color={Colors.white} />
          )}
        </TouchableOpacity>

        {/* Debug info */}
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>
            Lat: {mapRegion.latitude.toFixed(4)}, Lng: {mapRegion.longitude.toFixed(4)}
          </Text>
          {selectedLocation && (
            <Text style={styles.debugText}>
              Selected: {selectedLocation.address}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderListView = () => {
    const dataToShow = showSearchResults ? searchResults : filteredLocations;
    console.log('Rendering list view with data:', dataToShow.length, 'items');
    console.log('Show search results:', showSearchResults);
    console.log('Search query:', searchQuery);

    return (
      <FlatList
        data={dataToShow}
        renderItem={renderLocationItem}
        keyExtractor={(item) => `${item.lat}-${item.lng}`}
        style={styles.locationList}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          !showSearchResults && searchQuery.length === 0 ? (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Popular Locations</Text>
            </View>
          ) : showSearchResults ? (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Search Results ({dataToShow.length})</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Search size={48} color={Colors.neutral[400]} />
            <Text style={styles.emptyTitle}>No locations found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try a different search term' : 'Search for a location above'}
            </Text>
          </View>
        }
      />
    );
  };

  return (
    <Modal visible={true} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Select Location</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={Colors.neutral[600]} />
          </TouchableOpacity>
        </View>

        {/* Search Container */}
        <View style={styles.searchContainer}>
          <Search size={20} color={Colors.neutral[500]} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Search locations..."
            autoCorrect={false}
            autoCapitalize="words"
          />
          {isSearching && <ActivityIndicator size="small" color={Colors.primary[600]} />}
        </View>

        {/* View Mode Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'map' && styles.activeToggle]}
            onPress={() => setViewMode('map')}
          >
            <Map size={20} color={viewMode === 'map' ? Colors.white : Colors.neutral[600]} />
            <Text style={[styles.toggleText, viewMode === 'map' && styles.activeToggleText]}>
              Map
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'list' && styles.activeToggle]}
            onPress={() => setViewMode('list')}
          >
            <List size={20} color={viewMode === 'list' ? Colors.white : Colors.neutral[600]} />
            <Text style={[styles.toggleText, viewMode === 'list' && styles.activeToggleText]}>
              List
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {viewMode === 'map' ? renderMapView() : renderListView()}
        </View>

        {/* Selected Location Info */}
        {selectedLocation && (
          <View style={styles.selectedLocationContainer}>
            <View style={styles.selectedLocationInfo}>
              <MapPin size={16} color={Colors.primary[600]} />
              <View style={styles.selectedLocationText}>
                <Text style={styles.selectedLocationAddress} numberOfLines={1}>
                  {selectedLocation.address}
                </Text>
                {selectedLocation.city && (
                  <Text style={styles.selectedLocationCity} numberOfLines={1}>
                    {selectedLocation.city}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmLocation}>
              <Text style={styles.confirmButtonText}>Select</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
  },
  closeButton: {
    padding: Spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[50],
    marginHorizontal: Spacing.xl,
    marginVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[900],
    paddingVertical: Spacing.md,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.neutral[100],
    borderRadius: 12,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    gap: Spacing.xs,
  },
  activeToggle: {
    backgroundColor: Colors.primary[600],
  },
  toggleText: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[600],
  },
  activeToggleText: {
    color: Colors.white,
  },
  content: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  currentLocationButton: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.primary[600],
    borderRadius: 25,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  currentLocationButtonLoading: {
    opacity: 0.7,
  },
  locationList: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  sectionHeader: {
    paddingVertical: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[700],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  locationDetails: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  locationAddress: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[900],
    marginBottom: 2,
  },
  locationCity: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[500],
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[500],
    textAlign: 'center',
  },
  selectedLocationContainer: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  selectedLocationInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  selectedLocationText: {
    flex: 1,
  },
  selectedLocationAddress: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[900],
  },
  selectedLocationCity: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[600],
  },
  confirmButton: {
    backgroundColor: Colors.primary[600],
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  confirmButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Bold',
    color: Colors.white,
  },
  debugInfo: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: Spacing.xs,
    borderRadius: 4,
  },
  debugText: {
    color: Colors.white,
    fontSize: Typography.sizes.xs,
    fontFamily: 'Inter-Regular',
  },
  mapLoaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    zIndex: 10,
  },
  mapLoaderText: {
    marginTop: Spacing.md,
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[600],
  },
});