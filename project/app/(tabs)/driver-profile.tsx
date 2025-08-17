import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Car, Shield, Star, Settings, FileText, LogOut, DollarSign, CheckCircle, XCircle, Clock } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { Spacing, Typography } from '@/constants/Spacing';
import { useAuth } from '@/contexts/AuthContext';
import { apiService, DriverProfile } from '@/services/api';

export default function DriverProfileScreen() {
  const { user, logout } = useAuth();
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  if (!user) {
    router.replace('/(auth)/login');
    return null;
  }

  // Redirect passengers to their profile
  if (user.role === 'passenger') {
    router.replace('/(tabs)/profile');
    return null;
  }

  useEffect(() => {
    loadDriverProfile();
  }, []);

  const loadDriverProfile = async () => {
    try {
      const profile = await apiService.getMyDriverProfile();
      setDriverProfile(profile);
    } catch (error) {
      console.error('Failed to load driver profile:', error);
      // Driver profile might not exist yet
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDriverProfile();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          }
        },
      ]
    );
  };

  const handleCompleteProfile = () => {
    // TODO: Create driver profile setup screen
    Alert.alert('Complete Profile', 'Driver profile setup will be implemented soon');
  };

  const getVerificationStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return Colors.success[600];
      case 'rejected':
        return Colors.error[600];
      case 'pending':
      default:
        return Colors.warning[600];
    }
  };

  const getVerificationStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle size={16} color={Colors.success[600]} />;
      case 'rejected':
        return <XCircle size={16} color={Colors.error[600]} />;
      case 'pending':
      default:
        return <Clock size={16} color={Colors.warning[600]} />;
    }
  };

  const driverMenuItems = [
    {
      icon: <Settings size={20} color={Colors.neutral[600]} />,
      title: 'Account Settings',
      subtitle: 'Update your profile information',
      onPress: () => {}, // TODO: Implement settings screen
    },
    {
      icon: <Car size={20} color={Colors.primary[600]} />,
      title: 'Vehicle & Documents',
      subtitle: 'Manage your vehicle and documents',
      onPress: () => {}, // TODO: Implement vehicle management
    },
    {
      icon: <DollarSign size={20} color={Colors.success[600]} />,
      title: 'Earnings',
      subtitle: 'View your earnings and payment history',
      onPress: () => {}, // TODO: Implement earnings screen
    },
    {
      icon: <FileText size={20} color={Colors.secondary[600]} />,
      title: 'Trip History',
      subtitle: 'View your completed trips and ratings',
      onPress: () => {}, // TODO: Implement trip history
    },
    {
      icon: <LogOut size={20} color={Colors.error[600]} />,
      title: 'Sign Out',
      subtitle: 'Sign out of your account',
      onPress: handleLogout,
      destructive: true,
    },
  ];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getInitials(user.name || 'D')}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user.name || 'Driver'}
            </Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            <View style={styles.roleContainer}>
              <Text style={styles.driverRole}>
                Driver
              </Text>
              {driverProfile && (
                <View style={[styles.verificationBadge, { backgroundColor: `${getVerificationStatusColor(driverProfile.verificationStatus)}20` }]}>
                  {getVerificationStatusIcon(driverProfile.verificationStatus)}
                  <Text style={[styles.verificationText, { color: getVerificationStatusColor(driverProfile.verificationStatus) }]}>
                    {driverProfile.verificationStatus.charAt(0).toUpperCase() + driverProfile.verificationStatus.slice(1)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {driverProfile ? (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Star size={16} color={Colors.accent[500]} fill={Colors.accent[500]} />
              <Text style={styles.ratingText}>{(user.rating || 0).toFixed(1)}</Text>
              <Text style={styles.ratingLabel}>rating</Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.completeProfileButton} onPress={handleCompleteProfile}>
            <Text style={styles.completeProfileText}>Complete Profile</Text>
          </TouchableOpacity>
        )}
      </View>

      {driverProfile && (
        <View style={styles.vehicleCard}>
          <Text style={styles.vehicleTitle}>Vehicle Information</Text>
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleModel}>{driverProfile.vehicleModel}</Text>
            <Text style={styles.vehicleReg}>Registration: {driverProfile.vehicleRegNumber}</Text>
            <Text style={styles.licenseNumber}>License: {driverProfile.licenseNumber}</Text>
          </View>
        </View>
      )}

      <View style={styles.menu}>
        <Text style={styles.menuTitle}>Driver Services</Text>
        {driverMenuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.menuItem, item.destructive && styles.destructiveItem]}
            onPress={item.onPress}
          >
            <View style={styles.menuItemIcon}>
              {item.icon}
            </View>
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemTitle, item.destructive && styles.destructiveText]}>
                {item.title}
              </Text>
              <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.xl,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: Typography.sizes['2xl'],
    fontFamily: 'Inter-Bold',
    color: Colors.primary[600],
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: Typography.sizes.xl,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
    marginBottom: 4,
  },
  userEmail: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[600],
    marginBottom: Spacing.xs,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  driverRole: {
    fontSize: Typography.sizes.xs,
    fontFamily: 'Inter-Bold',
    backgroundColor: Colors.primary[100],
    color: Colors.primary[700],
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  verificationText: {
    fontSize: Typography.sizes.xs,
    fontFamily: 'Inter-Bold',
  },
  statsContainer: {
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
  },
  ratingLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[600],
  },
  completeProfileButton: {
    backgroundColor: Colors.primary[600],
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeProfileText: {
    color: Colors.white,
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Medium',
  },
  vehicleCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: 12,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  vehicleTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
    marginBottom: Spacing.sm,
  },
  vehicleInfo: {
    gap: 4,
  },
  vehicleModel: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[900],
  },
  vehicleReg: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[600],
  },
  licenseNumber: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[600],
  },
  menu: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  menuTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
    marginBottom: Spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  destructiveItem: {
    backgroundColor: Colors.error[50],
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[900],
    marginBottom: 2,
  },
  destructiveText: {
    color: Colors.error[700],
  },
  menuItemSubtitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[500],
  },
});
