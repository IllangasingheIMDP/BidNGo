import { Stack } from 'expo-router';

export default function DriverLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="location-picker" />
      <Stack.Screen name="registration" />
      <Stack.Screen name="trip-creation" />
      <Stack.Screen name="trip_handling" />
      <Stack.Screen name="trips_list" />
    </Stack>
  );
}
