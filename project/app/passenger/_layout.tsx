import { Stack } from 'expo-router';

export default function PassengerLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="trip_booking" />
      <Stack.Screen name="trip_bidding" />
    </Stack>
  );
}
