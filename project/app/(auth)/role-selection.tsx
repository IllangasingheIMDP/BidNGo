import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { User, Car, ArrowLeft, CheckCircle, MapPin, Clock, Shield, Star } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/Colors';
import { Spacing, Typography, BorderRadius } from '@/constants/Spacing';

const { width } = Dimensions.get('window');

export default function RoleSelectionScreen() {
  const [selectedRole, setSelectedRole] = useState<'passenger' | 'driver' | null>(null);

  const handleRoleSelection = (role: 'passenger' | 'driver') => {
    setSelectedRole(role);
    setTimeout(() => {
      if (role === 'passenger') {
        router.push('/(auth)/register');
      } else {
        router.push('/(auth)/register');
      }
    }, 300);
  };

  return (
    <View style={styles.container}>
      {/* Animated Background */}
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#334155']}
        style={styles.backgroundGradient}
      />
      
      {/* Floating particles effect */}
      <View style={styles.particlesContainer}>
        {[...Array(8)].map((_, index) => (
          <View 
            key={index} 
            style={[
              styles.particle, 
              { 
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`
              }
            ]} 
          />
        ))}
      </View>

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
            style={styles.backButtonGradient}
          >
            <ArrowLeft size={22} color={Colors.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Compact Logo Section */}
        <View style={styles.logoContainer}>
          <View style={styles.logoWrapper}>
            <Image
              source={require('./Logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Compact Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>Choose Your Role</Text>
          <View style={styles.titleUnderline}>
            <LinearGradient
              colors={[Colors.primary[600], Colors.secondary[500], Colors.primary[600]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientLine}
            />
          </View>
          <Text style={styles.subtitle}>How do you want to use BidNGo?</Text>
        </View>

        {/* Enhanced Role Cards */}
        <View style={styles.roleCardsContainer}>
          {/* Passenger Card */}
          <TouchableOpacity 
            style={[
              styles.roleCard,
              selectedRole === 'passenger' && styles.selectedCard
            ]} 
            onPress={() => handleRoleSelection('passenger')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[
                selectedRole === 'passenger' 
                  ? 'rgba(59, 130, 246, 0.25)' 
                  : 'rgba(59, 130, 246, 0.08)',
                selectedRole === 'passenger' 
                  ? 'rgba(37, 99, 235, 0.15)' 
                  : 'rgba(37, 99, 235, 0.02)'
              ]}
              style={styles.cardGradient}
            >
              {selectedRole === 'passenger' && (
                <View style={styles.selectedIndicator}>
                  <CheckCircle size={20} color={Colors.primary[400]} />
                </View>
              )}
              
              <View style={styles.roleIconContainer}>
                <LinearGradient
                  colors={['rgba(59, 130, 246, 0.3)', 'rgba(37, 99, 235, 0.2)']}
                  style={styles.roleIcon}
                >
                  <User size={32} color={Colors.primary[300]} />
                </LinearGradient>
              </View>
              
              <Text style={styles.roleTitle}>Passenger</Text>
              <Text style={styles.roleDescription}>
                Find rides and travel with verified drivers
              </Text>
              
              <View style={styles.roleFeatures}>
                <View style={styles.featureRow}>
                  <MapPin size={10} color={Colors.primary[400]} />
                  <Text style={styles.feature}>Search trips</Text>
                </View>
                <View style={styles.featureRow}>
                  <Star size={10} color={Colors.primary[400]} />
                  <Text style={styles.feature}>Place bids</Text>
                </View>
                <View style={styles.featureRow}>
                  <Clock size={10} color={Colors.primary[400]} />
                  <Text style={styles.feature}>Safe travel</Text>
                </View>
              </View>
              
              <View style={[styles.cardAccent, { backgroundColor: Colors.primary[500] }]} />
            </LinearGradient>
          </TouchableOpacity>

          {/* Driver Card */}
          <TouchableOpacity 
            style={[
              styles.roleCard,
              selectedRole === 'driver' && styles.selectedCard
            ]} 
            onPress={() => handleRoleSelection('driver')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[
                selectedRole === 'driver' 
                  ? 'rgba(6, 182, 212, 0.25)' 
                  : 'rgba(6, 182, 212, 0.08)',
                selectedRole === 'driver' 
                  ? 'rgba(14, 116, 144, 0.15)' 
                  : 'rgba(14, 116, 144, 0.02)'
              ]}
              style={styles.cardGradient}
            >
              {selectedRole === 'driver' && (
                <View style={styles.selectedIndicator}>
                  <CheckCircle size={20} color={Colors.secondary[400]} />
                </View>
              )}
              
              <View style={styles.roleIconContainer}>
                <LinearGradient
                  colors={['rgba(6, 182, 212, 0.3)', 'rgba(14, 116, 144, 0.2)']}
                  style={styles.roleIcon}
                >
                  <Car size={32} color={Colors.secondary[300]} />
                </LinearGradient>
              </View>
              
              <Text style={styles.roleTitle}>Driver</Text>
              <Text style={styles.roleDescription}>
                Create trips and earn money driving
              </Text>
              
              <View style={styles.roleFeatures}>
                <View style={styles.featureRow}>
                  <MapPin size={10} color={Colors.secondary[400]} />
                  <Text style={styles.feature}>Create trips</Text>
                </View>
                <View style={styles.featureRow}>
                  <Star size={10} color={Colors.secondary[400]} />
                  <Text style={styles.feature}>Receive bids</Text>
                </View>
                <View style={styles.featureRow}>
                  <Clock size={10} color={Colors.secondary[400]} />
                  <Text style={styles.feature}>Earn income</Text>
                </View>
              </View>
              
              <View style={[styles.cardAccent, { backgroundColor: Colors.secondary[500] }]} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.noteContainer}>
          <View style={styles.noteIcon}>
            <Shield size={14} color={Colors.warning[500]} />
          </View>
          <Text style={styles.note}>
            Driver accounts require document verification for safety
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[900],
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  particlesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary[500],
    opacity: 0.3,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
    zIndex: 10,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.neutral[600],
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    justifyContent: 'flex-start',
    zIndex: 10,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    position: 'relative',
  },
  logoWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary[500],
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logo: {
    width: 70,
    height: 70,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.sizes['2xl'],
    fontFamily: 'Inter-Bold',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    textShadowColor: Colors.primary[600],
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  titleUnderline: {
    width: 80,
    height: 2,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  gradientLine: {
    flex: 1,
    height: '100%',
  },
  subtitle: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[300],
    textAlign: 'center',
    lineHeight: Typography.lineHeights.normal * Typography.sizes.base,
  },
  roleCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  roleCard: {
    flex: 1,
    height: 220,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.neutral[700],
    shadowColor: Colors.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    transform: [{ scale: 1 }],
  },
  selectedCard: {
    borderColor: Colors.primary[500],
    shadowColor: Colors.primary[500],
    shadowOpacity: 0.3,
    transform: [{ scale: 1.02 }],
  },
  cardGradient: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    position: 'relative',
    overflow: 'hidden',
    minHeight: 160,
  },
  selectedIndicator: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    zIndex: 10,
  },
  roleIconContainer: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  roleIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary[500],
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
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
    lineHeight: Typography.lineHeights.normal * Typography.sizes.xs,
  },
  roleFeatures: {
    gap: Spacing.xs,
    flex: 1,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  feature: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[400],
    flex: 1,
  },
  cardAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderBottomLeftRadius: BorderRadius.lg,
    borderBottomRightRadius: BorderRadius.lg,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
    paddingTop:150,
    gap: Spacing.xs,
  },
  noteIcon: {
    opacity: 0.8,
  },
  note: {
    fontSize: Typography.sizes.xs,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[400],
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: Typography.lineHeights.normal * Typography.sizes.xs,
    flex: 1,
  },
});
