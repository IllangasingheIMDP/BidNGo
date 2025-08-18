// Environment configuration for API keys
// Replace these with your actual API keys

export const API_CONFIG = {
  GOOGLE_MAPS_API_KEY: 'AIzaSyCYWffFRDPzZtxrdvyapGy36kQaQDzVaSU',
  // Add other API keys here as needed
  BASE_API_URL: 'http://localhost:8080', // Your backend URL
};

// Development vs Production configurations
export const isDevelopment = __DEV__;

export const getGoogleMapsApiKey = () => {
  // In production, you might want to use different keys or get from secure storage
  return API_CONFIG.GOOGLE_MAPS_API_KEY;
};
