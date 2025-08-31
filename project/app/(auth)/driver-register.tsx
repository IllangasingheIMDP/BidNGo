import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Spacing, Typography } from '@/constants/Spacing';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';

export default function DriverRegisterScreen() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleRegister = async () => {
    const { email, password, confirmPassword, first_name, last_name, phone } = formData;

    if (!email.trim() || !password.trim() || !first_name.trim() || !last_name.trim() || !phone.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    try {
      // Use the driver registration endpoint
      await apiService.driverRegisterAsUser({
        email: email.trim(),
        password,
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        phone: phone.trim(),
      });

      // After successful registration, login automatically
      const loginResponse = await apiService.login(email.trim(), password);
      await login(loginResponse.token);
      
      // Navigate to driver registration to complete profile
      router.replace('/driver/registration');
    } catch (error) {
      Alert.alert('Registration Failed', error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.title}>Register as Driver</Text>
          <Text style={styles.subtitle}>Create your driver account to start offering rides</Text>

          <View style={styles.form}>
            <View style={styles.nameRow}>
              <View style={styles.nameInput}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  style={styles.input}
                  value={formData.first_name}
                  onChangeText={(value) => updateField('first_name', value)}
                  placeholder="John"
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.nameInput}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  value={formData.last_name}
                  onChangeText={(value) => updateField('last_name', value)}
                  placeholder="Doe"
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(value) => updateField('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                placeholder="john@example.com"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(value) => updateField('phone', value)}
                keyboardType="phone-pad"
                autoComplete="tel"
                placeholder="+94 77 123 4567"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={formData.password}
                onChangeText={(value) => updateField('password', value)}
                secureTextEntry
                autoComplete="new-password"
                placeholder="Enter password (min 8 characters)"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                value={formData.confirmPassword}
                onChangeText={(value) => updateField('confirmPassword', value)}
                secureTextEntry
                autoComplete="new-password"
                placeholder="Re-enter password"
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Creating Account...' : 'Create Driver Account'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Want to register as passenger? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Passenger Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.sizes['3xl'],
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Regular',
    color: '#a1a1aa',
    textAlign: 'center',
    marginBottom: Spacing.xxxl,
  },
  form: {
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  nameRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  nameInput: {
    flex: 1,
    gap: Spacing.xs,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Medium',
    color: '#a1a1aa',
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  button: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  footerText: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: '#a1a1aa',
  },
  footerLink: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Bold',
    color: '#3b82f6',
  },
});
