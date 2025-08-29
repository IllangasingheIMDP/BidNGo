import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  ArrowLeft,
  User,
  CreditCard,
  Car,
  FileText,
  Upload,
  Camera,
  CheckCircle,
  AlertCircle,
} from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { Spacing, Typography } from '@/constants/Spacing';
import { apiService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface DriverFormData {
  nic_number: string;
  license_number: string;
  vehicle_reg_number: string;
  vehicle_model: string;
}

interface DocumentData {
  nicImage: string | null;
  licenseDocument: string | null;
}

export default function DriverRegistrationScreen() {
  const { user, refreshUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<DriverFormData>({
    nic_number: '',
    license_number: '',
    vehicle_reg_number: '',
    vehicle_model: '',
  });

  const [documents, setDocuments] = useState<DocumentData>({
    nicImage: null,
    licenseDocument: null,
  });

  const updateField = (field: keyof DriverFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep1 = (): string | null => {
    if (!formData.nic_number.trim()) return 'NIC number is required';
    if (!formData.license_number.trim()) return 'License number is required';
    if (!formData.vehicle_reg_number.trim()) return 'Vehicle registration number is required';
    if (!formData.vehicle_model.trim()) return 'Vehicle model is required';
    return null;
  };

  const validateStep2 = (): string | null => {
    if (!documents.nicImage) return 'NIC image is required';
    if (!documents.licenseDocument) return 'License document is required';
    return null;
  };

  const handleStep1Continue = async () => {
    const error = validateStep1();
    if (error) {
      Alert.alert('Validation Error', error);
      return;
    }

    setLoading(true);
    try {
      await apiService.completeDriverRegistration({
        nic_number: formData.nic_number.trim(),
        license_number: formData.license_number.trim(),
        vehicle_reg_number: formData.vehicle_reg_number.trim(),
        vehicle_model: formData.vehicle_model.trim(),
      });
      setCurrentStep(2);
    } catch (error) {
      console.error('Failed to complete driver registration:', error);
      Alert.alert('Error', 'Failed to save driver information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const convertToBase64 = (uri: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () {
        const reader = new FileReader();
        reader.onloadend = function () {
          const base64data = reader.result as string;
          // Remove the data:image/jpeg;base64, prefix
          const base64 = base64data.split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(xhr.response);
      };
      xhr.onerror = reject;
      xhr.open('GET', uri);
      xhr.responseType = 'blob';
      xhr.send();
    });
  };

  const pickNICImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to upload your NIC image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const base64 = await convertToBase64(result.assets[0].uri);
        setDocuments(prev => ({ ...prev, nicImage: base64 }));
      }
    } catch (error) {
      console.error('Error picking NIC image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const pickLicenseDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const base64 = await convertToBase64(result.assets[0].uri);
        setDocuments(prev => ({ ...prev, licenseDocument: base64 }));
      }
    } catch (error) {
      console.error('Error picking license document:', error);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  const handleFinalSubmit = async () => {
    const error = validateStep2();
    if (error) {
      Alert.alert('Validation Error', error);
      return;
    }

    setLoading(true);
    try {
      const docUrls = [documents.nicImage!, documents.licenseDocument!];
      
      await apiService.submitDriverProfile({
        nic_number: formData.nic_number.trim(),
        license_number: formData.license_number.trim(),
        vehicle_reg_number: formData.vehicle_reg_number.trim(),
        vehicle_model: formData.vehicle_model.trim(),
        doc_urls: docUrls,
      });

      // Refresh user data to reflect the completed registration
      await refreshUser();

      Alert.alert(
        'Registration Complete!',
        'Your driver registration has been submitted successfully. Your documents will be reviewed and you will be notified of the verification status.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)/profile'),
          },
        ]
      );
    } catch (error) {
      console.error('Failed to submit driver profile:', error);
      Alert.alert('Error', 'Failed to submit documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <View style={styles.stepIndicator}>
          <Text style={styles.stepNumber}>1</Text>
        </View>
        <View style={styles.stepInfo}>
          <Text style={styles.stepTitle}>Driver Information</Text>
          <Text style={styles.stepSubtitle}>Enter your personal and vehicle details</Text>
        </View>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>NIC Number</Text>
          <View style={styles.inputWithIcon}>
            <CreditCard size={20} color={Colors.neutral[500]} />
            <TextInput
              style={styles.textInput}
              value={formData.nic_number}
              onChangeText={(value) => updateField('nic_number', value)}
              placeholder="123456789V"
              autoCapitalize="characters"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>License Number</Text>
          <View style={styles.inputWithIcon}>
            <FileText size={20} color={Colors.neutral[500]} />
            <TextInput
              style={styles.textInput}
              value={formData.license_number}
              onChangeText={(value) => updateField('license_number', value)}
              placeholder="B1234567"
              autoCapitalize="characters"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Vehicle Registration Number</Text>
          <View style={styles.inputWithIcon}>
            <Car size={20} color={Colors.neutral[500]} />
            <TextInput
              style={styles.textInput}
              value={formData.vehicle_reg_number}
              onChangeText={(value) => updateField('vehicle_reg_number', value)}
              placeholder="ABC-1234"
              autoCapitalize="characters"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Vehicle Model</Text>
          <View style={styles.inputWithIcon}>
            <Car size={20} color={Colors.neutral[500]} />
            <TextInput
              style={styles.textInput}
              value={formData.vehicle_model}
              onChangeText={(value) => updateField('vehicle_model', value)}
              placeholder="Toyota Prius 2020"
              autoCapitalize="words"
            />
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.continueButton, loading && styles.buttonDisabled]}
        onPress={handleStep1Continue}
        disabled={loading}
      >
        <Text style={styles.continueButtonText}>
          {loading ? 'Saving...' : 'Continue to Documents'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <View style={styles.stepIndicator}>
          <Text style={styles.stepNumber}>2</Text>
        </View>
        <View style={styles.stepInfo}>
          <Text style={styles.stepTitle}>Document Upload</Text>
          <Text style={styles.stepSubtitle}>Upload your NIC and license documents</Text>
        </View>
      </View>

      <View style={styles.documentsContainer}>
        <View style={styles.documentSection}>
          <Text style={styles.documentTitle}>NIC Image</Text>
          <Text style={styles.documentSubtitle}>Upload a clear photo of your National Identity Card</Text>
          <TouchableOpacity style={styles.uploadButton} onPress={pickNICImage}>
            <View style={styles.uploadContent}>
              {documents.nicImage ? (
                <CheckCircle size={24} color={Colors.success[600]} />
              ) : (
                <Camera size={24} color={Colors.primary[600]} />
              )}
              <Text style={[styles.uploadText, documents.nicImage && styles.uploadedText]}>
                {documents.nicImage ? 'NIC Image Uploaded' : 'Upload NIC Image'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.documentSection}>
          <Text style={styles.documentTitle}>License Document</Text>
          <Text style={styles.documentSubtitle}>Upload your driving license (image or PDF)</Text>
          <TouchableOpacity style={styles.uploadButton} onPress={pickLicenseDocument}>
            <View style={styles.uploadContent}>
              {documents.licenseDocument ? (
                <CheckCircle size={24} color={Colors.success[600]} />
              ) : (
                <Upload size={24} color={Colors.primary[600]} />
              )}
              <Text style={[styles.uploadText, documents.licenseDocument && styles.uploadedText]}>
                {documents.licenseDocument ? 'License Document Uploaded' : 'Upload License Document'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentStep(1)}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.buttonDisabled]}
          onPress={handleFinalSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Submitting...' : 'Complete Registration'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backIcon} onPress={() => router.back()}>
          <ArrowLeft size={24} color={Colors.neutral[900]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Registration</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(currentStep / 2) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>Step {currentStep} of 2</Text>
        </View>

        {currentStep === 1 ? renderStep1() : renderStep2()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  backIcon: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  progressContainer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.neutral[200],
    borderRadius: 2,
    marginBottom: Spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary[600],
    borderRadius: 2,
  },
  progressText: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[600],
    textAlign: 'center',
  },
  stepContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  stepIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  stepNumber: {
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Bold',
    color: Colors.white,
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[600],
  },
  form: {
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Medium',
    color: Colors.neutral[700],
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[900],
    paddingVertical: Spacing.xs,
  },
  continueButton: {
    backgroundColor: Colors.primary[600],
    borderRadius: 12,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Bold',
    color: Colors.white,
  },
  documentsContainer: {
    gap: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  documentSection: {
    gap: Spacing.sm,
  },
  documentTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[900],
  },
  documentSubtitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: 'Inter-Regular',
    color: Colors.neutral[600],
    marginBottom: Spacing.sm,
  },
  uploadButton: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary[200],
    borderStyle: 'dashed',
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  uploadContent: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  uploadText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Medium',
    color: Colors.primary[600],
  },
  uploadedText: {
    color: Colors.success[600],
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  backButton: {
    flex: 1,
    backgroundColor: Colors.neutral[100],
    borderRadius: 12,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Bold',
    color: Colors.neutral[700],
  },
  submitButton: {
    flex: 2,
    backgroundColor: Colors.primary[600],
    borderRadius: 12,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: Typography.sizes.base,
    fontFamily: 'Inter-Bold',
    color: Colors.white,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
