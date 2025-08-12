import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Spacing, Typography } from '@/constants/Spacing';

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle: string;
}

export function StatCard({ icon, title, value, subtitle }: StatCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.iconContainer}>
        {icon}
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.md,
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.neutral[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  value: {
    fontSize: Typography.sizes['2xl'],
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
    marginBottom: 2,
  },
  title: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[700],
    marginBottom: 2,
  },
  subtitle: {
    fontSize: Typography.sizes.xs,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[500],
    textAlign: 'center',
  },
});