import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@/types';
import { apiService } from './api';

class AuthService {
  async saveAuthData(user: User, accessToken: string, refreshToken: string): Promise<void> {
    try {
      await AsyncStorage.multiSet([
        ['user', JSON.stringify(user)],
        ['access_token', accessToken],
        ['refresh_token', refreshToken],
      ]);
    } catch (error) {
      console.error('Error saving auth data:', error);
      throw error;
    }
  }

  async getUser(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('access_token');
      return !!token;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }

  async logout(): Promise<void> {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
}

export const authService = new AuthService();