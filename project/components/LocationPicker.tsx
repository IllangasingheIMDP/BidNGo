import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { X, MapPin, Search } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '@/constants/Colors';
import { Location } from '@/types';

interface LocationPickerProps {
  onLocationSelect: (location: Location) => void;
  onClose: () => void;
}

const popularLocations: Location[] = [
  { lat: 6.9271, lng: 79.8612, address: 'Colombo Fort', city: 'Colombo' },
  { lat: 6.9319, lng: 79.8478, address: 'Pettah', city: 'Colombo' },
  { lat: 6.8649, lng: 79.8997, address: 'Mount Lavinia', city: 'Colombo' },
  { lat: 7.2906, lng: 80.6337, address: 'Kandy City Center', city: 'Kandy' },
  { lat: 6.0535, lng: 80.2210, address: 'Galle Fort', city: 'Galle' },
  { lat: 7.9554, lng: 81.0137, address: 'Anuradhapura', city: 'Anuradhapura' },
  { lat: 8.3114, lng: 80.4037, address: 'Dambulla', city: 'Dambulla' },
];

export function LocationPicker({ onLocationSelect, onClose }: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLocations, setFilteredLocations] = useState(popularLocations);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const filtered = popularLocations.filter(location =>
        location.address.toLowerCase().includes(query.toLowerCase()) ||
        location.city?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredLocations(filtered);
    } else {
      setFilteredLocations(popularLocations);
    }
  };

  const renderLocationItem = ({ item }: { item: Location }) => (
    <TouchableOpacity
      style={styles.locationItem}
      onPress={() => onLocationSelect(item)}
    >
      <MapPin size={20} color={Colors.primary[600]} />
      <View style={styles.locationDetails}>
        <Text style={styles.locationAddress}>{item.address}</Text>
        {item.city && (
          <Text style={styles.locationCity}>{item.city}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal visible={true} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Select Location</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={Colors.neutral[600]} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Search size={20} color={Colors.neutral[500]} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Search locations..."
            autoFocus
          />
        </View>

        <FlatList
          data={filteredLocations}
          renderItem={renderLocationItem}
          keyExtractor={(item) => `${item.lat}-${item.lng}`}
          style={styles.locationList}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
  },
  closeButton: {
    padding: Spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[50],
    marginHorizontal: Spacing.xl,
    marginVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[900],
    paddingVertical: Spacing.md,
    marginLeft: Spacing.sm,
  },
  locationList: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  locationDetails: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  locationAddress: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[900],
    marginBottom: 2,
  },
  locationCity: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[500],
  },
});