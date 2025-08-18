# Google Maps Setup for BidNGo

## Prerequisites

1. **Google Cloud Console Account**: You need a Google Cloud Console account
2. **Google Maps Platform APIs**: Enable the following APIs:
   - Maps SDK for Android
   - Maps SDK for iOS
   - Places API
   - Directions API
   - Geocoding API

## Step-by-Step Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable billing for the project

### 2. Enable Required APIs

Navigate to **APIs & Services > Library** and enable:

- **Maps SDK for Android**
- **Maps SDK for iOS** 
- **Places API**
- **Directions API**
- **Geocoding API**

### 3. Create API Credentials

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > API Key**
3. Copy the API key

### 4. Restrict API Key (Recommended)

1. Click on your API key to edit it
2. Under **Application restrictions**:
   - For development: Select "None"
   - For production: Select "Android apps" and add your package name and SHA-1 fingerprint
3. Under **API restrictions**:
   - Select "Restrict key"
   - Choose the APIs you enabled above

### 5. Configure Your App

#### Update app.json
Replace `YOUR_GOOGLE_MAPS_API_KEY_HERE` in `app.json` with your actual API key:

```json
{
  "expo": {
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_ACTUAL_API_KEY_HERE"
        }
      }
    },
    "ios": {
      "config": {
        "googleMapsApiKey": "YOUR_ACTUAL_API_KEY_HERE"
      }
    }
  }
}
```

#### Update environment config
Replace the API key in `config/env.ts`:

```typescript
export const API_CONFIG = {
  GOOGLE_MAPS_API_KEY: 'YOUR_ACTUAL_API_KEY_HERE',
};
```

### 6. Test the Implementation

1. Run your app: `npm run dev`
2. Navigate to the trip creation screen
3. Test the location picker functionality:
   - Search for places
   - Tap on map to select locations
   - Create routes between origin and destination

## Features Implemented

### LocationPicker Component

✅ **Google Maps Integration**
- Interactive map with Google Maps provider
- Custom markers for origin/destination
- Route visualization with MapViewDirections

✅ **Place Search**
- Google Places Autocomplete
- Search suggestions with formatted addresses
- Place details with coordinates

✅ **Location Selection**
- Tap-to-select on map
- Search-based selection
- Reverse geocoding for addresses

✅ **Route Planning**
- Origin and destination selection
- Route visualization
- Distance and duration calculation
- Swap origin/destination functionality

✅ **User Experience**
- Clean, intuitive interface
- Loading states and error handling
- Keyboard-aware design
- Responsive layout

## Usage in Trip Creation

The LocationPicker is integrated into the trip creation flow:

```tsx
{showRoutePicker && (
  <LocationPicker
    mode="route"
    initialOrigin={formData.origin || undefined}
    initialDestination={formData.destination || undefined}
    onRouteSelect={(o,d)=>{
      setFormData({...formData, origin:o, destination:d});
      setShowRoutePicker(false);
    }}
    onClose={()=>setShowRoutePicker(false)}
  />
)}
```

## Security Notes

⚠️ **Important**: Never commit API keys to version control

For production:
1. Use environment variables
2. Implement proper API key restrictions
3. Consider using a backend proxy for sensitive operations
4. Monitor API usage and set quotas

## Troubleshooting

### Common Issues

1. **Map not loading**: Check API key configuration
2. **Places search not working**: Ensure Places API is enabled
3. **Directions not showing**: Verify Directions API is enabled
4. **Build errors**: Check react-native-maps installation

### Getting SHA-1 Fingerprint (Android)

For development:
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

For production, use your release keystore.

## API Costs

Google Maps Platform has a pay-as-you-go pricing model:
- **Maps SDK**: $7.00 per 1,000 loads
- **Places API**: $17.00 per 1,000 requests  
- **Directions API**: $5.00 per 1,000 requests
- **Geocoding API**: $5.00 per 1,000 requests

Google provides $200 free credits monthly.
