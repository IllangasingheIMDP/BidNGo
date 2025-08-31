import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import { User, Car, ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { Spacing, Typography } from '@/constants/Spacing';

export default function RoleSelectionScreen() {
  const handleRoleSelection = (role: 'passenger' | 'driver') => {
    if (role === 'passenger') {
      router.push('/(auth)/register');
    } else {
      router.push('/(auth)/register');
    }
  };

  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B', '#334155']}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <View style={styles.backButtonWrapper}>
            <ArrowLeft size={20} color={Colors.white} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <View style={styles.logoWrapper}>
            <Image
              source={require('./Logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Choose Your Role</Text>
          <View style={styles.glowLine} />
          <Text style={styles.subtitle}>How do you want to use BidNGo?</Text>
        </View>

        {/* Role Cards Side by Side */}
        <View style={styles.roleCardsContainer}>
          <TouchableOpacity 
            style={styles.roleCard} 
            onPress={() => handleRoleSelection('passenger')}
          >
            <LinearGradient
              colors={['rgba(59, 130, 246, 0.1)', 'rgba(37, 99, 235, 0.05)']}
              style={styles.cardGradient}
            >
              <View style={styles.roleIconContainer}>
                <View style={[styles.roleIcon, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                  <User size={28} color={Colors.primary[400]} />
                </View>
              </View>
              <Text style={styles.roleTitle}>Passenger</Text>
              <Text style={styles.roleDescription}>
                Find rides and travel with verified drivers
              </Text>
              <View style={styles.roleFeatures}>
                <Text style={styles.feature}>• Search trips</Text>
                <Text style={styles.feature}>• Place bids</Text>
                <Text style={styles.feature}>• Instant booking</Text>
                <Text style={styles.feature}>• Rate experience</Text>
              </View>
              <View style={styles.cardBottomGlow} />
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.roleCard} 
            onPress={() => handleRoleSelection('driver')}
          >
            <LinearGradient
              colors={['rgba(6, 182, 212, 0.1)', 'rgba(14, 116, 144, 0.05)']}
              style={styles.cardGradient}
            >
              <View style={styles.roleIconContainer}>
                <View style={[styles.roleIcon, { backgroundColor: 'rgba(6, 182, 212, 0.2)' }]}>
                  <Car size={28} color={Colors.secondary[400]} />
                </View>
              </View>
              <Text style={styles.roleTitle}>Driver</Text>
              <Text style={styles.roleDescription}>
                Create trips and earn money driving
              </Text>
              <View style={styles.roleFeatures}>
                <Text style={styles.feature}>• Create trips</Text>
                <Text style={styles.feature}>• Receive bids</Text>
                <Text style={styles.feature}>• Flexible schedule</Text>
                <Text style={styles.feature}>• Earn income</Text>
              </View>
              <View style={styles.cardBottomGlow} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.noteContainer}>
          <Text style={styles.note}>
            Driver accounts require document verification
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.lg,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backButtonWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.neutral[700],
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logoWrapper: {
    width: 120,
    height: 120,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 1)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary[500],
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 10,
  },
  logo: {
    width: 120,
    height: 120,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.sizes['3xl'],
    fontFamily: 'Inter-Bold',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    textShadowColor: Colors.primary[600],
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  glowLine: {
    width: 100,
    height: 2,
    backgroundColor: Colors.primary[500],
    marginBottom: Spacing.md,
    shadowColor: Colors.primary[500],
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  subtitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[300],
    textAlign: 'center',
  },
  roleCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  roleCard: {
    flex: 1,
    maxWidth: '48%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.neutral[700],
    shadowColor: Colors.primary[600],
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  cardGradient: {
    flex: 1,
    borderRadius: 12,
    padding: Spacing.md,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 180,
  },
  roleIconContainer: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary[500],
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  roleTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Bold',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: Spacing.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  roleDescription: {
    fontSize: Typography.sizes.xs,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[300],
    textAlign: 'center',
    marginBottom: Spacing.sm,
    lineHeight: 16,
  },
  roleFeatures: {
    gap: 2,
  },
  feature: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[400],
    textAlign: 'center',
  },
  cardBottomGlow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.primary[500],
    opacity: 0.6,
    shadowColor: Colors.primary[500],
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  noteContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  note: {
    fontSize: Typography.sizes.xs,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[500],
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 16,
  },
});
