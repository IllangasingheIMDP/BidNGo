import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { User, Car, ArrowLeft } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { Spacing, Typography } from '@/constants/Spacing';

export default function RoleSelectionScreen() {
  const handleRoleSelection = (role: 'passenger' | 'driver') => {
    if (role === 'passenger') {
      router.push('/(auth)/register');
    } else {
      router.push('/(auth)/driver-register');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Join as</Text>
        <Text style={styles.subtitle}>Choose how you want to use BidNGo</Text>

        <View style={styles.roleCards}>
          <TouchableOpacity 
            style={styles.roleCard} 
            onPress={() => handleRoleSelection('passenger')}
          >
            <View style={styles.roleIcon}>
              <User size={32} color="#3b82f6" />
            </View>
            <Text style={styles.roleTitle}>Passenger</Text>
            <Text style={styles.roleDescription}>
              Find rides, place bids on trips, and travel with verified drivers
            </Text>
            <View style={styles.roleFeatures}>
              <Text style={styles.feature}>• Search available trips</Text>
              <Text style={styles.feature}>• Bid on rides</Text>
              <Text style={styles.feature}>• Instant booking</Text>
              <Text style={styles.feature}>• Rate your experience</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.roleCard} 
            onPress={() => handleRoleSelection('driver')}
          >
            <View style={styles.roleIcon}>
              <Car size={32} color="#10b981" />
            </View>
            <Text style={styles.roleTitle}>Driver</Text>
            <Text style={styles.roleDescription}>
              Create trips, receive bids from passengers, and earn money driving
            </Text>
            <View style={styles.roleFeatures}>
              <Text style={styles.feature}>• Create trip offers</Text>
              <Text style={styles.feature}>• Receive passenger bids</Text>
              <Text style={styles.feature}>• Flexible scheduling</Text>
              <Text style={styles.feature}>• Earn extra income</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.note}>
          Note: Driver accounts require document verification before you can create trips
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.lg,
  },
  backButton: {
    padding: Spacing.xs,
    alignSelf: 'flex-start',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  title: {
    fontSize: Typography.sizes['3xl'],
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Regular',
    color: '#a1a1aa',
    textAlign: 'center',
    marginBottom: Spacing.xxxl,
  },
  roleCards: {
    gap: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  roleCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: Spacing.xl,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#27272a',
  },
  roleIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  roleTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  roleDescription: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    color: '#a1a1aa',
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 24,
  },
  roleFeatures: {
    gap: Spacing.xs,
  },
  feature: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: '#a1a1aa',
  },
  note: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: '#71717a',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
