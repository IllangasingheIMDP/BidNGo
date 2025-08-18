import { Location } from '../types';
import { getGoogleMapsApiKey } from '../config/env';

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 Latitude of first point
 * @param lng1 Longitude of first point  
 * @param lat2 Latitude of second point
 * @param lng2 Longitude of second point
 * @returns Distance in kilometers
 */
export const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Calculate distance between two Location objects
 * @param origin Origin location
 * @param destination Destination location
 * @returns Distance in kilometers
 */
export const getDistanceBetweenLocations = (origin: Location, destination: Location): number => {
  return calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng);
};

/**
 * Format distance for display
 * @param distanceKm Distance in kilometers
 * @returns Formatted string (e.g., "5.2 km" or "1.2 km")
 */
export const formatDistance = (distanceKm: number): string => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
};

/**
 * Get user's current location using device GPS
 * @returns Promise resolving to current location or null if failed
 */
export const getCurrentLocation = (): Promise<Location | null> => {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Try to get address using reverse geocoding
        try {
          const address = await reverseGeocode(latitude, longitude);
          resolve({
            lat: latitude,
            lng: longitude,
            address: address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          });
        } catch (error) {
          resolve({
            lat: latitude,
            lng: longitude,
            address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          });
        }
      },
      (error) => {
        console.error('Error getting current location:', error);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000, // 5 minutes
      }
    );
  });
};

/**
 * Reverse geocode coordinates to get address
 * @param lat Latitude
 * @param lng Longitude
 * @returns Promise resolving to address string or null
 */
export const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${getGoogleMapsApiKey()}`
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

/**
 * Search for places using Google Places API
 * @param query Search query
 * @param location Optional location bias
 * @param radius Optional search radius in meters
 * @returns Promise resolving to array of place predictions
 */
export const searchPlaces = async (
  query: string, 
  location?: { lat: number; lng: number }, 
  radius?: number
): Promise<any[]> => {
  try {
    let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${getGoogleMapsApiKey()}`;
    
    // Add location bias if provided
    if (location) {
      url += `&location=${location.lat},${location.lng}`;
      if (radius) {
        url += `&radius=${radius}`;
      }
    }
    
    // Restrict to specific country if needed (example: Sri Lanka)
    url += '&components=country:lk';
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK') {
      return data.predictions || [];
    }
  } catch (error) {
    console.error('Error searching places:', error);
  }
  return [];
};

/**
 * Get detailed information about a place using place ID
 * @param placeId Google Place ID
 * @returns Promise resolving to Location object or null
 */
export const getPlaceDetails = async (placeId: string): Promise<Location | null> => {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address&key=${getGoogleMapsApiKey()}`
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

/**
 * Calculate map region to fit multiple coordinates
 * @param coordinates Array of coordinates
 * @param padding Optional padding percentage (default: 0.1 = 10%)
 * @returns Map region object
 */
export const getRegionForCoordinates = (
  coordinates: { latitude: number; longitude: number }[],
  padding: number = 0.1
) => {
  if (coordinates.length === 0) {
    return {
      latitude: 37.78825,
      longitude: -122.4324,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    };
  }

  if (coordinates.length === 1) {
    return {
      latitude: coordinates[0].latitude,
      longitude: coordinates[0].longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }

  const minLat = Math.min(...coordinates.map(c => c.latitude));
  const maxLat = Math.max(...coordinates.map(c => c.latitude));
  const minLng = Math.min(...coordinates.map(c => c.longitude));
  const maxLng = Math.max(...coordinates.map(c => c.longitude));

  const latDelta = (maxLat - minLat) * (1 + padding);
  const lngDelta = (maxLng - minLng) * (1 + padding);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(latDelta, 0.01),
    longitudeDelta: Math.max(lngDelta, 0.01),
  };
};
