import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { User as UserIcon, Star, Settings, FileText, LogOut, MapPin, CreditCard, Car, Shield, DollarSign, CheckCircle, XCircle, Clock } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { Spacing, Typography } from '@/constants/Spacing';
import { useAuth } from '@/contexts/AuthContext';
import { apiService, DriverProfile } from '@/services/api';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const isDriver = user?.role === 'driver';

  // Redirect to login if no user
  useEffect(() => {
    if (!user && !isRedirecting) {
      setIsRedirecting(true);
      router.replace('/(auth)/login');
    }
  }, [user, isRedirecting]);

  useEffect(() => {
    if (isDriver) {
      loadDriverProfile();
    }
  }, [isDriver, user]); // Add user as dependency to reload when user changes

  // Refresh driver profile when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (isDriver) {
        loadDriverProfile();
      }
    }, [isDriver])
  );

  // Don't render anything if no user or redirecting
  if (!user || isRedirecting) {
    return null;
  }

  const loadDriverProfile = async () => {
    if (!isDriver) return;
    
    setLoading(true);
    try {
      const profile = await apiService.getMyDriverProfile();
      setDriverProfile(profile);
    } catch (error) {
      console.error('Failed to load driver profile:', error);
      // Driver profile might not exist yet or user might not be fully registered
      setDriverProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (isDriver) {
      await loadDriverProfile();
    }
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
            // Don't manually navigate - let the useEffect handle it
          }
        },
      ]
    );
  };

  const handleCompleteProfile = () => {
    router.push('/driver/registration');
  };

  const getVerificationStatusColor = (status?: string) => {
    switch (status) {
      case 'approved':
        return '#3b82f6';
      case 'rejected':
        return '#ef4444';
      case 'pending':
      default:
        return '#f59e0b';
    }
  };

  const getVerificationStatusIcon = (status?: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle size={16} color="#3b82f6" />;
      case 'rejected':
        return <XCircle size={16} color="#ef4444" />;
      case 'pending':
      default:
        return <Clock size={16} color="#f59e0b" />;
    }
  };

  const passengerMenuItems = [
    {
      icon: <Settings size={20} color="#a1a1aa" />,
      title: 'Account Settings',
      subtitle: 'Update your profile information',
      onPress: () => {}, // TODO: Implement settings screen
    },
    {
      icon: <MapPin size={20} color="#3b82f6" />,
      title: 'Saved Places',
      subtitle: 'Manage your favorite locations',
      onPress: () => {}, // TODO: Implement saved places
    },
    {
      icon: <FileText size={20} color="#3b82f6" />,
      title: 'Trip History',
      subtitle: 'View your completed trips and bookings',
      onPress: () => {}, // TODO: Implement trip history
    },
    {
      icon: <CreditCard size={20} color="#3b82f6" />,
      title: 'Payment Methods',
      subtitle: 'Manage your payment options',
      onPress: () => {}, // TODO: Implement payment methods
    },
    {
      icon: <LogOut size={20} color="#ef4444" />,
      title: 'Sign Out',
      subtitle: 'Sign out of your account',
      onPress: handleLogout,
      destructive: true,
    },
  ];

  const driverMenuItems = [
    {
      icon: <Settings size={20} color="#a1a1aa" />,
      title: 'Account Settings',
      subtitle: 'Update your profile information',
      onPress: () => {}, // TODO: Implement settings screen
    },
    {
      icon: <Car size={20} color="#3b82f6" />,
      title: 'Vehicle & Documents',
      subtitle: 'Manage your vehicle and documents',
      onPress: () => {}, // TODO: Implement vehicle management
    },
    {
      icon: <DollarSign size={20} color="#3b82f6" />,
      title: 'Earnings',
      subtitle: 'View your earnings and payment history',
      onPress: () => {}, // TODO: Implement earnings screen
    },
    {
      icon: <FileText size={20} color="#3b82f6" />,
      title: 'Trip History',
      subtitle: 'View your completed trips and ratings',
      onPress: () => {}, // TODO: Implement trip history
    },
    {
      icon: <LogOut size={20} color="#ef4444" />,
      title: 'Sign Out',
      subtitle: 'Sign out of your account',
      onPress: handleLogout,
      destructive: true,
    },
  ];

  const menuItems = isDriver ? driverMenuItems : passengerMenuItems;

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
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />
      }
    >
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getInitials(user.name || (isDriver ? 'D' : 'P'))}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user.name || (isDriver ? 'Driver' : 'Passenger')}
            </Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            <View style={styles.roleContainer}>
              <Text style={[styles.roleText, isDriver && styles.driverRole]}>
                {isDriver ? 'Driver' : 'Passenger'}
              </Text>
              {isDriver && driverProfile && driverProfile.verificationStatus && (
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

        {isDriver && driverProfile ? (
          <View style={styles.ratingContainer}>
            <View style={styles.statItem}>
              <Star size={16} color={Colors.accent[500]} fill={Colors.accent[500]} />
              <Text style={styles.ratingText}>{(user.rating || 0).toFixed(1)}</Text>
              <Text style={styles.ratingLabel}>rating</Text>
            </View>
          </View>
        ) : isDriver && !driverProfile ? (
          <TouchableOpacity style={styles.completeProfileButton} onPress={handleCompleteProfile}>
            <Text style={styles.completeProfileText}>Complete Profile</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.ratingContainer}>
            <View style={styles.statItem}>
              <Star size={16} color={Colors.accent[500]} fill={Colors.accent[500]} />
              <Text style={styles.ratingText}>{(user.rating || 0).toFixed(1)}</Text>
              <Text style={styles.ratingLabel}>rating</Text>
            </View>
          </View>
        )}
      </View>

      {isDriver && driverProfile && (
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
        <Text style={styles.menuTitle}>{isDriver ? 'Driver Services' : 'Account'}</Text>
        {menuItems.map((item, index) => (
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
    backgroundColor: '#0f0f0f',
  },
  header: {
    backgroundColor: '#1a1a1a',
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
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    fontSize: Typography.sizes['2xl'],
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: Typography.sizes.xl,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: '#a1a1aa',
    marginBottom: Spacing.xs,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  roleText: {
    fontSize: Typography.sizes.xs,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    backgroundColor: '#27272a',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  driverRole: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
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
  completeProfileButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  completeProfileText: {
    color: '#ffffff',
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Medium',
  },
  vehicleCard: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  vehicleTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: Spacing.sm,
  },
  vehicleInfo: {
    gap: 4,
  },
  vehicleModel: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
  },
  vehicleReg: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: '#a1a1aa',
  },
  licenseNumber: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: '#a1a1aa',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  verifiedText: {
    fontSize: Typography.sizes.xs,
    fontFamily: 'Inter-Bold',
    color: '#3b82f6',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  ratingLabel: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: '#a1a1aa',
  },
  menu: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  menuTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: Spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  destructiveItem: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
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
    color: '#ffffff',
    marginBottom: 2,
  },
  destructiveText: {
    color: '#ef4444',
  },
  menuItemSubtitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: '#a1a1aa',
  },
});