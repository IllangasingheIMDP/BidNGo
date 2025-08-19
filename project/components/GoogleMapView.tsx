import React, { useState, useRef } from 'react';
import { View, StyleSheet, Alert, Dimensions } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region, MapPressEvent } from 'react-native-maps';
import { Location } from '../types';

const { width, height } = Dimensions.get('window');

interface GoogleMapViewProps {
  initialLocation?: Location;
  onLocationSelect?: (location: Location) => void;
  showUserLocation?: boolean;
  markers?: Location[];
  style?: any;
}

export default function GoogleMapView({
  initialLocation,
  onLocationSelect,
  showUserLocation = true,
  markers = [],
  style,
}: GoogleMapViewProps) {
  const mapRef = useRef<MapView>(null);
  
  const [region, setRegion] = useState<Region>({
    latitude: initialLocation?.lat || 6.9271, // Colombo, Sri Lanka
    longitude: initialLocation?.lng || 79.8612,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const handleMapPress = (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    
    if (!latitude || !longitude) {
      Alert.alert('Invalid Location', 'Please select a valid location on the map.');
      return;
    }

    const location: Location = {
      lat: latitude,
      lng: longitude,
      address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
    };

    onLocationSelect?.(location);
  };

  const animateToLocation = (location: Location) => {
    const newRegion = {
      latitude: location.lat,
      longitude: location.lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    
    mapRef.current?.animateToRegion(newRegion, 1000);
  };

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={region}
        onPress={handleMapPress}
        onRegionChangeComplete={setRegion}
        showsUserLocation={showUserLocation}
        showsMyLocationButton={false}
        mapType="standard"
        zoomEnabled={true}
        scrollEnabled={true}
        pitchEnabled={true}
        rotateEnabled={true}
      >
        {/* Render markers */}
        {markers.map((marker, index) => (
          <Marker
            key={index}
            coordinate={{ latitude: marker.lat, longitude: marker.lng }}
            title={marker.address}
            description={`Lat: ${marker.lat.toFixed(6)}, Lng: ${marker.lng.toFixed(6)}`}
          />
        ))}
        
        {/* Initial location marker */}
        {initialLocation && (
          <Marker
            coordinate={{ latitude: initialLocation.lat, longitude: initialLocation.lng }}
            title="Selected Location"
            description={initialLocation.address}
            pinColor="red"
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
});
