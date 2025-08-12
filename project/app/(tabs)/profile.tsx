import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { User as UserIcon, Star, Settings, FileText, LogOut, Car, Shield } from 'lucide-react-native';
import { Colors, Spacing, Typography } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  if (!user) {
    router.replace('/(auth)/login');
    return null;
  }

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

  const menuItems = [
    {
      icon: <Settings size={20} color={Colors.neutral[600]} />,
      title: 'Account Settings',
      subtitle: 'Update your profile information',
      onPress: () => router.push('/profile/settings'),
    },
    ...(user.role === 'driver' ? [{
      icon: <Car size={20} color={Colors.primary[600]} />,
      title: 'Vehicle & Documents',
      subtitle: 'Manage your vehicle and documents',
      onPress: () => router.push('/profile/vehicle'),
    }] : []),
    {
      icon: <FileText size={20} color={Colors.secondary[600]} />,
      title: 'Trip History',
      subtitle: 'View your completed trips',
      onPress: () => router.push('/profile/history'),
    },
    {
      icon: <Shield size={20} color={Colors.success[600]} />,
      title: 'Safety & Support',
      subtitle: 'Help center and safety features',
      onPress: () => router.push('/profile/safety'),
    },
    {
      icon: <LogOut size={20} color={Colors.error[600]} />,
      title: 'Sign Out',
      subtitle: 'Sign out of your account',
      onPress: handleLogout,
      destructive: true,
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.first_name.charAt(0)}{user.last_name.charAt(0)}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user.first_name} {user.last_name}
            </Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            <View style={styles.roleContainer}>
              <Text style={[styles.roleText, user.role === 'driver' && styles.driverRole]}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </Text>
              {user.is_verified && (
                <View style={styles.verifiedBadge}>
                  <Shield size={12} color={Colors.success[600]} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.ratingContainer}>
          <Star size={20} color={Colors.accent[500]} fill={Colors.accent[500]} />
          <Text style={styles.ratingText}>{user.rating.toFixed(1)}</Text>
          <Text style={styles.ratingLabel}>rating</Text>
        </View>
      </View>

      <View style={styles.menu}>
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
  roleText: {
    fontSize: Typography.sizes.xs,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[700],
    backgroundColor: Colors.neutral[100],
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  driverRole: {
    backgroundColor: Colors.primary[100],
    color: Colors.primary[700],
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success[100],
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  verifiedText: {
    fontSize: Typography.sizes.xs,
    fontFamily: 'Inter-Bold',
    color: Colors.success[700],
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
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
  menu: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
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