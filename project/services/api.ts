import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthResponse, User, Trip, Bid, Booking, SearchFilters } from '@/types';

const API_BASE_URL = 'http://localhost:8080';

class ApiService {
  private async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('access_token');
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  private async getHeaders(): Promise<HeadersInit> {
    const token = await this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = await this.getHeaders();
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      if (response.status === 401) {
        // Token expired, try to refresh
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry the original request
          const newHeaders = await this.getHeaders();
          const retryResponse = await fetch(url, {
            ...options,
            headers: {
              ...newHeaders,
              ...options.headers,
            },
          });
          
          if (!retryResponse.ok) {
            throw new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
          }
          
          return await retryResponse.json();
        } else {
          // Redirect to login
          throw new Error('Authentication failed');
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication
  async register(userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone: string;
    role: 'driver' | 'passenger';
  }): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (!refreshToken) return false;

      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) return false;

      const data: AuthResponse = await response.json();
      await AsyncStorage.setItem('access_token', data.access_token);
      await AsyncStorage.setItem('refresh_token', data.refresh_token);
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  async logout(): Promise<void> {
    await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
  }

  // Trip Management
  async createTrip(tripData: {
    origin: Location;
    destination: Location;
    departure_datetime: string;
    available_seats: number;
    base_price_per_seat: number;
  }): Promise<Trip> {
    return this.request<Trip>('/api/trips', {
      method: 'POST',
      body: JSON.stringify(tripData),
    });
  }

  async searchTrips(filters: SearchFilters): Promise<Trip[]> {
    const params = new URLSearchParams({
      origin_lat: filters.origin.lat.toString(),
      origin_lng: filters.origin.lng.toString(),
      destination_lat: filters.destination.lat.toString(),
      destination_lng: filters.destination.lng.toString(),
      date: filters.date,
    });

    if (filters.max_price) {
      params.append('max_price', filters.max_price.toString());
    }
    if (filters.min_seats) {
      params.append('min_seats', filters.min_seats.toString());
    }

    return this.request<Trip[]>(`/api/trips?${params.toString()}`);
  }

  async getTrip(tripId: string): Promise<Trip> {
    return this.request<Trip>(`/api/trips/${tripId}`);
  }

  async getMyTrips(): Promise<Trip[]> {
    return this.request<Trip[]>('/api/trips/my');
  }

  // Bidding System
  async placeBid(tripId: string, bidData: {
    bid_price: number;
    pickup_point: Location;
  }): Promise<Bid> {
    return this.request<Bid>(`/api/trips/${tripId}/bids`, {
      method: 'POST',
      body: JSON.stringify(bidData),
    });
  }

  async getTripBids(tripId: string): Promise<Bid[]> {
    return this.request<Bid[]>(`/api/trips/${tripId}/bids`);
  }

  async acceptBid(tripId: string, bidId: string): Promise<{ booking_id: string; fare: number; status: string }> {
    return this.request(`/api/trips/${tripId}/bids/${bidId}/accept`, {
      method: 'POST',
    });
  }

  async getMyBids(): Promise<Bid[]> {
    return this.request<Bid[]>('/api/bids/my');
  }

  // Bookings
  async getMyBookings(): Promise<Booking[]> {
    return this.request<Booking[]>('/api/bookings/my');
  }

  async updateBookingStatus(bookingId: string, status: string): Promise<Booking> {
    return this.request<Booking>(`/api/bookings/${bookingId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Ratings
  async rateTrip(bookingId: string, rating: number, comment?: string): Promise<void> {
    return this.request(`/api/bookings/${bookingId}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment }),
    });
  }

  // Profile & Documents
  async updateProfile(userData: Partial<User>): Promise<User> {
    return this.request<User>('/api/users/me', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async requestUploadSignature(filename: string, mime: string): Promise<{
    upload_url: string;
    signature: string;
    api_key: string;
    timestamp: number;
  }> {
    return this.request('/api/uploads/sign', {
      method: 'POST',
      body: JSON.stringify({ filename, mime }),
    });
  }

  async submitDriverApplication(documentUrls: string[]): Promise<void> {
    return this.request('/api/drivers/apply', {
      method: 'POST',
      body: JSON.stringify({ doc_urls: documentUrls }),
    });
  }

  // Notifications
  async updateFCMToken(token: string): Promise<void> {
    return this.request('/api/users/me/fcm-token', {
      method: 'POST',
      body: JSON.stringify({ fcm_token: token }),
    });
  }
}

export const apiService = new ApiService();