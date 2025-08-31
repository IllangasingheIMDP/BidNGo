import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { Spacing, Typography } from '@/constants/Spacing';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/services/api';

export default function RegisterScreen() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'passenger', // 'passenger' or 'driver'
  });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleRegister = async () => {
    const { email, password, confirmPassword, first_name, last_name, phone, role } = formData;

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
      // Use appropriate registration method based on role
      if (role === 'driver') {
        await apiService.driverRegisterAsUser({
          email: email.trim(),
          password,
          first_name: first_name.trim(),
          last_name: last_name.trim(),
          phone: phone.trim(),
        });
      } else {
        await apiService.register({
          email: email.trim(),
          password,
          first_name: first_name.trim(),
          last_name: last_name.trim(),
          phone: phone.trim(),
        });
      }

      // After successful registration, login automatically
      const loginResponse = await apiService.login(email.trim(), password);
      await login(loginResponse.token);
      
      // Redirect based on role
      if (role === 'driver') {
        // For drivers, they might need to complete their profile later
        Alert.alert(
          'Registration Successful', 
          'Welcome! You can complete your driver profile from the settings.',
          [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
        );
      } else {
        router.replace('/(tabs)');
      }
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
    <LinearGradient
      colors={['#0F172A', '#1E293B', '#334155']}
      style={styles.container}
    >
      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
              <View style={styles.titleContainer}>
                <Text style={styles.title}>Create Account</Text>
                <View style={styles.glowLine} />
              </View>
              <Text style={styles.subtitle}>Join the BidNGo community</Text>
            </View>

            <View style={styles.form}>
              {/* Role Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>I want to register as:</Text>
                <View style={styles.roleContainer}>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      formData.role === 'passenger' && styles.roleButtonActive
                    ]}
                    onPress={() => updateField('role', 'passenger')}
                  >
                    <LinearGradient
                      colors={formData.role === 'passenger' 
                        ? [Colors.primary[600], Colors.primary[700]] 
                        : ['rgba(51, 65, 85, 0.5)', 'rgba(51, 65, 85, 0.3)']
                      }
                      style={styles.roleButtonGradient}
                    >
                      <Text style={[
                        styles.roleButtonText,
                        formData.role === 'passenger' && styles.roleButtonTextActive
                      ]}>
                        Passenger
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      formData.role === 'driver' && styles.roleButtonActive
                    ]}
                    onPress={() => updateField('role', 'driver')}
                  >
                    <LinearGradient
                      colors={formData.role === 'driver' 
                        ? [Colors.secondary[500], Colors.secondary[600]] 
                        : ['rgba(51, 65, 85, 0.5)', 'rgba(51, 65, 85, 0.3)']
                      }
                      style={styles.roleButtonGradient}
                    >
                      <Text style={[
                        styles.roleButtonText,
                        formData.role === 'driver' && styles.roleButtonTextActive
                      ]}>
                        Driver
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
                {formData.role === 'driver' && (
                  <Text style={styles.roleNote}>
                    Note: You'll need to complete your driver profile after registration
                  </Text>
                )}
              </View>

              <View style={styles.nameRow}>
                <View style={styles.nameInput}>
                  <Text style={styles.label}>First Name</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      value={formData.first_name}
                      onChangeText={(value) => updateField('first_name', value)}
                      placeholder="John"
                      placeholderTextColor={Colors.neutral[500]}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
                <View style={styles.nameInput}>
                  <Text style={styles.label}>Last Name</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      value={formData.last_name}
                      onChangeText={(value) => updateField('last_name', value)}
                      placeholder="Doe"
                      placeholderTextColor={Colors.neutral[500]}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={formData.email}
                    onChangeText={(value) => updateField('email', value)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    placeholder="john@example.com"
                    placeholderTextColor={Colors.neutral[500]}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={formData.phone}
                    onChangeText={(value) => updateField('phone', value)}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    placeholder="+94 77 123 4567"
                    placeholderTextColor={Colors.neutral[500]}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={formData.password}
                    onChangeText={(value) => updateField('password', value)}
                    secureTextEntry
                    autoComplete="new-password"
                    placeholder="Enter password (min 8 characters)"
                    placeholderTextColor={Colors.neutral[500]}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={formData.confirmPassword}
                    onChangeText={(value) => updateField('confirmPassword', value)}
                    secureTextEntry
                    autoComplete="new-password"
                    placeholder="Re-enter password"
                    placeholderTextColor={Colors.neutral[500]}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={loading}
              >
                <LinearGradient
                  colors={loading ? [Colors.neutral[600], Colors.neutral[700]] : [Colors.primary[600], Colors.primary[800]]}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.buttonText}>
                    {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
                  </Text>
                </LinearGradient>
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.md,
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
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(252, 253, 255, 1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    shadowColor: Colors.primary[500],
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 15,
  },
  logo: {
    width: 80,
    height: 80,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
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
    width: 80,
    height: 2,
    backgroundColor: Colors.primary[500],
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
  form: {
    marginBottom: Spacing.lg,
  },
  nameRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  nameInput: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Medium',
    color: Colors.primary[300],
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: Colors.neutral[700],
    borderRadius: 12,
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    shadowColor: Colors.primary[600],
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  input: {
    height: 48,
    paddingHorizontal: Spacing.md,
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    color: Colors.white,
  },
  button: {
    height: 56,
    borderRadius: 12,
    marginTop: Spacing.xl,
    shadowColor: Colors.primary[600],
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
  },
  buttonDisabled: {
    shadowOpacity: 0.2,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  buttonText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Bold',
    color: Colors.white,
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  footerText: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[400],
  },
  footerLink: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Bold',
    color: Colors.primary[400],
    textDecorationLine: 'underline',
  },
  roleContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  roleButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.neutral[700],
  },
  roleButtonActive: {
    borderColor: Colors.primary[500],
    shadowColor: Colors.primary[600],
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  roleButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  roleButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[400],
  },
  roleButtonTextActive: {
    color: Colors.white,
    fontFamily: 'Inter-Bold',
  },
  roleNote: {
    fontSize: Typography.sizes.xs,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[400],
    marginTop: Spacing.sm,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});