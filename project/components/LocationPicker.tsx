import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Dimensions, Text } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';

interface GeneralMapViewProps {
  height?: number;
  width?: number;
  showUserLocation?: boolean;
}

const GeneralMapView: React.FC<GeneralMapViewProps> = ({
  height = 300,
  width = Dimensions.get('window').width - 70,
  showUserLocation = false,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<Region | null>(null);
  const mapRef = useRef<MapView>(null);

  // Get user location if enabled
  useEffect(() => {
    if (showUserLocation) {
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

        // Animate to user location
        mapRef.current?.animateToRegion(
          {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          },
          1000
        );
      })();
    }
  }, [showUserLocation]);

  if (error) {
    return (
      <View style={[styles.container, { height, width }]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height, width }]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={
          userLocation || {
            latitude: 6.9271, // Default: Colombo, Sri Lanka
            longitude: 79.8612,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }
        }
        showsUserLocation={showUserLocation}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 8,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  errorText: {
    color: '#666',
    textAlign: 'center',
    padding: 16,
  },
});

export default GeneralMapView;
