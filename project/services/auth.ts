import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@/types';
import { apiService } from './api';

interface TokenPayload {
  id: string;
  role: 'driver' | 'passenger';
  email: string;
  name:string;
  phone:string;
  exp?: number;
  iat?: number;
}

class AuthService {
  async saveToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('token', token);
    } catch (error) {
      console.error('Error saving token:', error);
      throw error;
    }
  }

  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('token');
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  private decodeTokenPayload(token: string): TokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  async getUser(): Promise<User | null> {
    try {
      const token = await this.getToken();
      if (!token) return null;

      const payload = this.decodeTokenPayload(token);
      if (!payload) return null;

      // Create user object from token payload
      const user: User = {
        id: payload.id,
        email: payload.email,
        role: payload.role,
        name: payload.name,
        phone: payload.phone,
        // Optional fields that can be fetched from API later if needed
       
        
        
        rating: undefined,
        is_verified: undefined,
        created_at: undefined
      };

      return user;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await this.getToken();
      if (!token) return false;

      const payload = this.decodeTokenPayload(token);
      if (!payload) return false;

      // Check if token is expired (if exp claim exists)
      if (payload.exp) {
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp < now) {
          await this.logout();
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }

  async getFullUserDetails(): Promise<User | null> {
    try {
      // Get basic user info from token
      const basicUser = await this.getUser();
      if (!basicUser) return null;

      // Fetch full user details from API
      const fullUser = await apiService.getMyProfile();
      return fullUser;
    } catch (error) {
      console.error('Error getting full user details:', error);
      // Return basic user info if API call fails
      return this.getUser();
    }
  }

  async logout(): Promise<void> {
    try {
      await AsyncStorage.removeItem('token');
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
}

export const authService = new AuthService();