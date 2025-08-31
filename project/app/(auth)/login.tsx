import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Spacing, Typography } from '@/constants/Spacing';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.login(email.trim(), password);
      const userData = await login(response.token);
      
      // Navigate to tabs - role-based routing will happen within the profile tab
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Login Failed', error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to your RideShare account</Text>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              placeholder="Enter your email"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              placeholder="Enter your password"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Signing In...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          <Link href="/(auth)/register" asChild>
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/role-selection" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
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
    marginBottom: Spacing.xl,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Medium',
    color: '#a1a1aa',
    marginBottom: Spacing.sm,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
  },
  button: {
    height: 48,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  buttonDisabled: {
    backgroundColor: '#374151',
  },
  buttonText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  forgotPasswordText: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: '#3b82f6',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: '#a1a1aa',
  },
  footerLink: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Medium',
    color: '#3b82f6',
  },
});