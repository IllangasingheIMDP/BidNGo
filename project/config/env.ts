// Environment configuration for API keys
// Replace these with your actual API keys

export const API_CONFIG = {
  GOOGLE_MAPS_API_KEY: 'AIzaSyCYWffFRDPzZtxrdvyapGy36kQaQDzVaSU',
  GOOGLE_PLACES_API_KEY: 'AIzaSyCYWffFRDPzZtxrdvyapGy36kQaQDzVaSU', // Same key works for both
  // Add other API keys here as needed
  BASE_API_URL: 'http://localhost:9000', // Your backend URL - matches Ballerina backend port
};

// Development vs Production configurations
export const isDevelopment = __DEV__;

export const getGoogleMapsApiKey = () => {
  // In production, you might want to use different keys or get from secure storage
  return API_CONFIG.GOOGLE_MAPS_API_KEY;
};

export const getGooglePlacesApiKey = () => {
  return API_CONFIG.GOOGLE_PLACES_API_KEY;
};
