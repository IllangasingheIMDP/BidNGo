import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { apiService, BackendTrip } from '../../services/api';

export default function DriverTripsScreen() {
  const [trips, setTrips] = useState<BackendTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      const myTrips = await apiService.getMyTrips();
      // Sort by latest first (by departure_datetime)
      const sortedTrips = myTrips.sort((a, b) => 
        new Date(b.departure_datetime).getTime() - new Date(a.departure_datetime).getTime()
      );
      setTrips(sortedTrips);
    } catch (error: any) {
      console.error('Error loading trips:', error);
      Alert.alert('Error', 'Failed to load trips: ' + (error?.message || 'Unknown error'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTrips();
  }, []);

  const handleTripPress = (trip: BackendTrip) => {
    router.push({
      pathname: '/driver/trip_handling' as any,
      params: {
        tripId: trip.id.toString(),
        tripData: JSON.stringify(trip),
      }
    });
  };

  const getTimeUntilDeparture = (departureTime: string) => {
    const now = new Date();
    const departure = new Date(departureTime);
    const diffMs = departure.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs < 0) return 'Departed';
    if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h`;
    if (diffHours > 0) return `${diffHours}h`;
    
    const diffMins = Math.floor(diffMs / (1000 * 60));
    return `${diffMins}m`;
  };

  const getTripStatus = (trip: BackendTrip) => {
    const now = new Date();
    const departure = new Date(trip.departure_datetime);
    
    if (now > departure) return 'completed';
    if (departure.getTime() - now.getTime() < 24 * 60 * 60 * 1000) return 'upcoming';
    return 'scheduled';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return '#f59e0b';
      case 'completed': return '#6b7280';
      case 'scheduled': return '#2563eb';
      default: return '#6b7280';
    }
  };

  const renderTripItem = ({ item }: { item: BackendTrip }) => {
    const status = getTripStatus(item);
    const timeUntil = getTimeUntilDeparture(item.departure_datetime);
    
    return (
      <TouchableOpacity 
        style={styles.tripCard}
        onPress={() => handleTripPress(item)}
      >
        <View style={styles.tripHeader}>
          <View style={styles.tripStatus}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
              {status.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.tripPrice}>LKR {item.base_price.toFixed(2)}</Text>
        </View>

        <Text style={styles.routeText} numberOfLines={1}>
          📍 From: {item.origin_addr}
        </Text>
        <Text style={styles.routeText} numberOfLines={1}>
          🎯 To: {item.dest_addr}
        </Text>

        <View style={styles.tripDetails}>
          <Text style={styles.detailText}>
            🕒 {new Date(item.departure_datetime).toLocaleString()}
          </Text>
          <Text style={styles.detailText}>
            👥 {item.available_seats} seats
          </Text>
        </View>

        <View style={styles.tripFooter}>
          <Text style={styles.timeUntilText}>
            {timeUntil === 'Departed' ? '✅ Completed' : `⏰ ${timeUntil}`}
          </Text>
          <Text style={styles.tapHint}>Tap to manage bids →</Text>
        </View>

        {item.notes && (
          <Text style={styles.notesText} numberOfLines={2}>
            📝 {item.notes}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading your trips...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Trips</Text>
        <TouchableOpacity 
          onPress={() => router.push('/driver/trip-creation')}
          style={styles.addButton}
        >
          <Text style={styles.addButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {trips.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No trips yet</Text>
          <Text style={styles.emptySubtitle}>Create your first trip to start earning</Text>
          <TouchableOpacity 
            style={styles.createTripButton}
            onPress={() => router.push('/driver/trip-creation')}
          >
            <Text style={styles.createTripButtonText}>Create Trip</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTripItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.tripsList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  addButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },

  tripsList: {
    padding: 16,
  },

  tripCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tripStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tripPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563eb',
  },

  routeText: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 4,
  },

  tripDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 12,
    color: '#6b7280',
  },

  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  timeUntilText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  tapHint: {
    fontSize: 12,
    color: '#2563eb',
    fontStyle: 'italic',
  },

  notesText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  createTripButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createTripButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
