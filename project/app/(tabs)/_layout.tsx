import { Tabs } from 'expo-router';
import { Chrome as Home, Search, Calendar, User, Car } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';

export default function TabLayout() {
  const { user } = useAuth();
  const isDriver = user?.role === 'driver';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#a1a1aa',
        tabBarStyle: {
          backgroundColor: '#1a1a1a',
          borderTopColor: '#27272a',
          paddingBottom: 8,
          paddingTop: 8,
          height: 80,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: 'Inter-Medium',
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ size, color }) => (
            <Home size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ size, color }) => (
            <Search size={size} color={color} />
          ),
        }}
      />
      {isDriver && (
        <Tabs.Screen
          key="driver-tab"
          name="driver"
          options={{
            title: 'Drive',
            tabBarIcon: ({ size, color }) => (
              <Car size={size} color={color} />
            ),
          }}
        />
      )}
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Trips',
          tabBarIcon: ({ size, color }) => (
            <Calendar size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color }) => (
            <User size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}