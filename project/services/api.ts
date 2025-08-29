import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Trip, Bid, Booking, SearchFilters } from '@/types';

// Add local types for upload service interaction
export interface DriverProfileResponse {
  id: number;
  nic_number: string;
  license_number: string;
  vehicle_reg_number: string;
  vehicle_model: string;
  doc_urls: string[];
  verification_status: string;
}

// Driver Profile types for new driver service
export interface DriverProfile {
  id: number;
  nicNumber: string;
  licenseNumber: string;
  vehicleRegNumber: string;
  vehicleModel: string;
  docUrls: string[];
  verificationStatus: string;
  submittedAt: string;
  reviewedAt?: string;
  userId?: number; // Only available in admin responses
}

export interface DriverProfileWithUser extends DriverProfile {
  userId: number;
  userName: string;
  userEmail: string;
  userPhone: string;
}

export interface DriverStats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

// Backend trip representation (from Ballerina DBTrip)
export interface BackendTrip {
  id: number;
  origin_lat: number;
  origin_lng: number;
  origin_addr: string;
  dest_lat: number;
  dest_lng: number;
  dest_addr: string;
  departure_datetime: string;
  available_seats: number;
  base_price: number; // decimal in backend; mapped to number here
  notes?: string | null;
  created_at: string;
  updated_at: string;
  driver_user_id: number;
}

// Backend search result with ranking metrics
export interface BackendTripSearchResult extends BackendTrip {
  start_distance_km: number;
  end_distance_km: number;
  total_distance_km: number;
  bearing_diff_deg: number;
}

// Backend bid representation (from Ballerina DBBid)
export interface BackendBid {
  id: number;
  trip_id: number;
  user_id: number;
  bid_price: number; // decimal mapped to number
  pickup_lat: number;
  pickup_lng: number;
  pickup_addr: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// Backend booking representation (from Ballerina DBBooking)
export interface BackendBooking {
  id: number;
  trip_id?: number | null;
  bid_id?: number | null;
  passenger_user_id?: number | null;
  fare: number; // decimal mapped to number
  status: string; // booked | canceled | etc.
  payment_method: string; // cash | card
  payment_status: string; // pending | paid (future)
  created_at: string;
  updated_at: string;
}

// Backend returns { message, token }
export interface AuthResponse {
  message: string;
  token: string;
}

const API_BASE_URL = 'http://10.30.240.137:9000';

class ApiService {
  private async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('token');
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

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = await this.getHeaders();

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (response.status === 401) {
      // No refresh endpoint in current backend; force auth failure
      throw new Error('UNAUTHORIZED');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        (errorData && (errorData.error || errorData.message)) ||
        `HTTP ${response.status}: ${response.statusText}`
      );
    }

    // Some endpoints might return empty body
    const text = await response.text();
    return (text ? JSON.parse(text) : {}) as T;
  }

  // Decode JWT payload to extract driver/user id for client-side filtering (best-effort; no signature validation)
  private async getTokenPayload(): Promise<any | null> {
    const token = await this.getToken();
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    try {
      const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  // ========== Authentication ==========

  // Original register had first_name/last_name/role; backend expects single 'name'
  async register(data: {
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    password: string;
  }): Promise<{ message: string }> {
    const payload = {
      name: `${data.first_name} ${data.last_name}`.trim(),
      phone: data.phone,
      email: data.email,
      password: data.password,
    };
    return this.request<{ message: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Driver step 1: create user with role_flags = 0 (backend route: /api/auth/driver_register_as_user)
  async driverRegisterAsUser(data: {
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    password: string;
  }): Promise<{ message: string }> {
    const payload = {
      name: `${data.first_name} ${data.last_name}`.trim(),
      phone: data.phone,
      email: data.email,
      password: data.password,
    };
    return this.request<{ message: string }>('/api/auth/driver_register_as_user', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Driver step 2: complete driver profile (requires auth token)
  async completeDriverRegistration(data: {
    nic_number: string;
    license_number: string;
    vehicle_reg_number: string;
    vehicle_model: string;
  }): Promise<{ message: string }> {
    return this.request<{ message: string }>('/api/auth/driver_complete_register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    
    const res = await this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    console.log(res);
    // Store token
    await AsyncStorage.setItem('token', res.token);
    return res;
  }

  // Removed refreshToken (not needed with single token approach)
  async refreshToken(): Promise<boolean> {
    return false;
  }

  async logout(): Promise<void> {
    await AsyncStorage.removeItem('token');
  }

  // ========== Trip Management ==========
  // NOTE: Backend attaches TripService at /api/trips/ and resources are under /trips...
  // So full paths are /api/trips/trips and /api/trips/trips/:id

  // Create trip (driver only). Map frontend structure to backend expected fields.
  async createTrip(tripData: {
    origin: { lat: number; lng: number; address: string };
    destination: { lat: number; lng: number; address: string };
    departure_datetime: string; // ISO string
    available_seats: number;
    base_price_per_seat: number; // mapped to base_price
    notes?: string;
  }): Promise<{ message: string; id: number }> {
    const payload = {
      origin_lat: tripData.origin.lat,
      origin_lng: tripData.origin.lng,
      origin_addr: tripData.origin.address,
      dest_lat: tripData.destination.lat,
      dest_lng: tripData.destination.lng,
      dest_addr: tripData.destination.address,
      departure_datetime: tripData.departure_datetime,
      available_seats: tripData.available_seats,
      base_price: tripData.base_price_per_seat,
      notes: tripData.notes ?? '',
    };
    return this.request<{ message: string; id: number }>('/api/trips/trips', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Update trip (driver only & ownership enforced server-side)
  async updateTrip(tripId: number, update: Partial<{
    origin: { lat: number; lng: number; address: string };
    destination: { lat: number; lng: number; address: string };
    departure_datetime: string;
    available_seats: number;
    base_price_per_seat: number;
    notes: string;
  }>): Promise<{ message: string; id: number }> {
    // Translate partial fields
    const mapped: Record<string, any> = {};
    if (update.origin) {
      mapped.origin_lat = update.origin.lat;
      mapped.origin_lng = update.origin.lng;
      mapped.origin_addr = update.origin.address;
    }
    if (update.destination) {
      mapped.dest_lat = update.destination.lat;
      mapped.dest_lng = update.destination.lng;
      mapped.dest_addr = update.destination.address;
    }
    if (update.departure_datetime) mapped.departure_datetime = update.departure_datetime;
    if (typeof update.available_seats === 'number') mapped.available_seats = update.available_seats;
    if (typeof update.base_price_per_seat === 'number') mapped.base_price = update.base_price_per_seat;
    if (typeof update.notes === 'string') mapped.notes = update.notes;
    return this.request<{ message: string; id: number }>(`/api/trips/trips/${tripId}`, {
      method: 'PUT',
      body: JSON.stringify(mapped),
    });
  }

  // List trips (backend currently offers no filtering parameters)
  async listTrips(): Promise<BackendTrip[]> {
    return this.request<BackendTrip[]>('/api/trips/trips');
  }

  // Search trips using backend geospatial ranking (POST /api/trips/trips/search)
  async searchTrips(filters: SearchFilters): Promise<BackendTrip[]> {
    const payload = {
      start_lat: filters.origin.lat,
      start_lng: filters.origin.lng,
      start_addr: filters.origin.address,
      end_lat: filters.destination.lat,
      end_lng: filters.destination.lng,
      end_addr: filters.destination.address,
    };

    let results = await this.request<BackendTripSearchResult[]>(
      '/api/trips/trips/search',
      { method: 'POST', body: JSON.stringify(payload) }
    );
    

    // Optional client-side filters (date/min_seats/max_price)
    
    
    
    return results; // has superset fields; assignable to BackendTrip[]
  }

  async getTrip(tripId: number): Promise<BackendTrip> {
    return this.request<BackendTrip>(`/api/trips/trips/${tripId}`);
  }

  // Emulate "my trips" by filtering list based on driver_user_id from token payload
  async getMyTrips(): Promise<BackendTrip[]> {
    const payload = await this.getTokenPayload();
    const id = payload?.id;
    const trips = await this.listTrips();
    if (typeof id === 'number') {
      return trips.filter(t => t.driver_user_id === id);
    }
    return [];
  }

  // ========== Bidding ==========
  // Create bid (passenger). tripId provided separately for clarity.
  async createBid(tripId: number, data: {
    bid_price: number;
    pickup: { lat: number; lng: number; address: string };
  }): Promise<{ message: string; id: number }> {
    const payload = {
      trip_id: tripId,
      bid_price: data.bid_price,
      pickup_lat: data.pickup.lat,
      pickup_lng: data.pickup.lng,
      pickup_addr: data.pickup.address,
    };
    return this.request<{ message: string; id: number }>('/api/bids/bids', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Update bid (passenger owner)
  async updateBid(bidId: number, data: {
    bid_price: number;
    pickup: { lat: number; lng: number; address: string };
  }): Promise<{ message: string; id: number }> {
    const payload = {
      bid_price: data.bid_price,
      pickup_lat: data.pickup.lat,
      pickup_lng: data.pickup.lng,
      pickup_addr: data.pickup.address,
    };
    return this.request<{ message: string; id: number }>(`/api/bids/bids/${bidId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  // Delete bid
  async deleteBid(bidId: number): Promise<{ message: string; id: number }> {
    return this.request<{ message: string; id: number }>(`/api/bids/bids/${bidId}`, {
      method: 'DELETE',
    });
  }

  // List bids for a trip
  async listBidsForTrip(tripId: number): Promise<BackendBid[]> {
    return this.request<BackendBid[]>(`/api/bids/bids/trip/${tripId}`);
  }

  // List my bids (passenger)
  async listMyBids(): Promise<BackendBid[]> {
    return this.request<BackendBid[]>('/api/bids/bids/mine');
  }

  // Driver confirms top bids for a trip
  async confirmTopBids(tripId: number): Promise<{ message: string; confirmed: number; closed: number }> {
    return this.request<{ message: string; confirmed: number; closed: number }>(`/api/bids/bids/confirm/${tripId}`, {
      method: 'POST',
    });
  }

  // Backwards-compatible wrappers (deprecated)
  async placeBid(tripId: number, bidData: { bid_price: number; pickup: { lat: number; lng: number; address: string } }) {
    return this.createBid(tripId, bidData);
  }
  async getTripBids(tripId: number) { return this.listBidsForTrip(tripId); }
  async getMyBids() { return this.listMyBids(); }

  // ===== WebSocket: Bid Events =====
  private bidWs?: WebSocket;
  private bidWsListeners: Array<(event: any) => void> = [];
  private bidWsReconnectAttempts = 0;

  onBidEvent(cb: (event: any) => void) {
    this.bidWsListeners.push(cb);
  }

  offBidEvent(cb: (event: any) => void) {
    this.bidWsListeners = this.bidWsListeners.filter(l => l !== cb);
  }

  connectBidEvents(hostOverride?: string) {
    if (this.bidWs && (this.bidWs.readyState === WebSocket.OPEN || this.bidWs.readyState === WebSocket.CONNECTING)) {
      return; // already connecting/connected
    }
    const host = hostOverride || API_BASE_URL.replace(/^https?:\/\//, '').replace(/:\\d+$/, '');
    // Backend WS listener runs on port 21003, path /ws
    const url = `ws://${host}:21003/ws`;
    const ws = new WebSocket(url);
    this.bidWs = ws;
    ws.onopen = () => {
      this.bidWsReconnectAttempts = 0;
    };
    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data as string);
        this.bidWsListeners.forEach(l => l(data));
      } catch {
        // non-JSON or parse error, forward raw
        this.bidWsListeners.forEach(l => l(msg.data));
      }
    };
    ws.onclose = () => {
      this.scheduleBidWsReconnect(hostOverride);
    };
    ws.onerror = () => {
      ws.close();
    };
  }

  private scheduleBidWsReconnect(hostOverride?: string) {
    if (this.bidWsReconnectAttempts > 5) return; // give up after 5 tries
    const delay = Math.min(30000, 1000 * Math.pow(2, this.bidWsReconnectAttempts));
    this.bidWsReconnectAttempts += 1;
    setTimeout(() => this.connectBidEvents(hostOverride), delay);
  }

  disconnectBidEvents() {
    if (this.bidWs) {
      this.bidWs.close();
      this.bidWs = undefined;
    }
  }

  // ========== Bookings ==========
  // Base path: /api/bookings/ + resources /bookings...

  listBookings(): Promise<BackendBooking[]> {
    return this.request<BackendBooking[]>('/api/bookings/bookings');
  }

  getBooking(id: number): Promise<BackendBooking> {
    return this.request<BackendBooking>(`/api/bookings/bookings/${id}`);
  }

  listBookingsForTrip(tripId: number): Promise<BackendBooking[]> {
    return this.request<BackendBooking[]>(`/api/bookings/bookings/trip/${tripId}`);
  }

  listMyBookings(): Promise<BackendBooking[]> {
    return this.request<BackendBooking[]>('/api/bookings/bookings/mine');
  }

  createBooking(data: { trip_id?: number; bid_id?: number; fare: number }): Promise<{ message: string; id: number }> {
    const payload = {
      trip_id: data.trip_id ?? null,
      bid_id: data.bid_id ?? null,
      fare: data.fare,
    };
    return this.request<{ message: string; id: number }>('/api/bookings/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  updateBooking(id: number, data: { status?: string; payment_method?: string }): Promise<{ message: string; id: number }> {
    const payload: Record<string, any> = {};
    if (data.status) payload.status = data.status;
    if (data.payment_method) payload.payment_method = data.payment_method;
    return this.request<{ message: string; id: number }>(`/api/bookings/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  // Deprecated wrappers for backward compatibility
  async getMyBookings(): Promise<BackendBooking[]> { return this.listMyBookings(); }
  async updateBookingStatus(bookingId: string, status: string): Promise<{ message: string; id: number }> {
    return this.updateBooking(Number(bookingId), { status });
  }
  async rateTrip(): Promise<void> { /* no-op: rateTrip not implemented in backend */ return; }

  // ========== Profile & Documents ==========

    // Get own profile (GET /api/users/me)
    async getMyProfile(): Promise<User> {
      return this.request<User>('/api/users/me');
    }

    // Get any user by email (GET /api/users/user/:email)
    async getUserByEmail(email: string): Promise<User> {
      return this.request<User>(`/api/users/user/${encodeURIComponent(email)}`);
    }

    // Update email (PUT /api/users/email)
    async updateEmail(currentEmail: string, newEmail: string): Promise<{ message: string; newEmail: string; note: string }> {
      return this.request<{ message: string; newEmail: string; note: string }>(
        '/api/users/email',
        {
          method: 'PUT',
          body: JSON.stringify({ currentEmail, newEmail }),
        }
      );
    }

    // Update phone (PUT /api/users/phone)
    async updatePhone(newPhone: string): Promise<{ message: string; phone: string }> {
      return this.request<{ message: string; phone: string }>('/api/users/phone', {
        method: 'PUT',
        body: JSON.stringify({ newPhone }),
      });
    }

    // Update password (PUT /api/users/password)
    async updatePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
      return this.request<{ message: string }>('/api/users/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
    }

    // Delete user (DELETE /api/users/:email)
    async deleteUser(email: string): Promise<{ message: string }> {
      return this.request<{ message: string }>(`/api/users/${encodeURIComponent(email)}`, {
        method: 'DELETE',
      });
    }

  // Submit / upsert driver profile with documents (POST /api/uploads/upload)
  // Backend expects: nic_number, license_number, vehicle_reg_number, vehicle_model, doc_urls (array of base64 file contents)
  async submitDriverProfile(data: {
    nic_number: string;
    license_number: string;
    vehicle_reg_number: string;
    vehicle_model: string;
    doc_urls: string[]; // base64 encoded file contents
  }): Promise<{ message: string; profile: DriverProfileResponse }> {
    return this.request<{ message: string; profile: DriverProfileResponse }>('/api/uploads/upload', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ========== Driver Service (New) ==========
  // Base path: /api/drivers/

  // Create driver profile (POST /api/drivers/profile)
  async createDriverProfile(data: {
    nicNumber: string;
    licenseNumber: string;
    vehicleRegNumber: string;
    vehicleModel: string;
    docUrls: string[];
  }): Promise<{ message: string; profileId: number; status: string }> {
    return this.request<{ message: string; profileId: number; status: string }>('/api/drivers/profile', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Get own driver profile (GET /api/drivers/profile)
  async getMyDriverProfile(): Promise<DriverProfile> {
    return this.request<DriverProfile>('/api/drivers/profile');
  }

  // Update driver profile (PUT /api/drivers/profile)
  async updateDriverProfile(data: {
    nicNumber?: string;
    licenseNumber?: string;
    vehicleRegNumber?: string;
    vehicleModel?: string;
    docUrls?: string[];
  }): Promise<{ message: string; note: string }> {
    return this.request<{ message: string; note: string }>('/api/drivers/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Delete own driver profile (DELETE /api/drivers/profile)
  async deleteMyDriverProfile(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/api/drivers/profile', {
      method: 'DELETE',
    });
  }

  // ========== Admin Driver Management ==========

  // Get driver profile by user ID (admin only)
  async getDriverProfileByUserId(userId: number): Promise<DriverProfile> {
    return this.request<DriverProfile>(`/api/drivers/profile/user/${userId}`);
  }

  // Get all driver profiles (admin only)
  async getAllDriverProfiles(status?: string): Promise<{ profiles: DriverProfileWithUser[]; total: number }> {
    const params = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request<{ profiles: DriverProfileWithUser[]; total: number }>(`/api/drivers/profiles${params}`);
  }

  // Update driver verification status (admin only)
  async updateDriverVerificationStatus(
    profileId: number,
    status: 'pending' | 'approved' | 'rejected',
    reviewNote?: string
  ): Promise<{ message: string; status: string; reviewedAt: string }> {
    return this.request<{ message: string; status: string; reviewedAt: string }>(
      `/api/drivers/profile/${profileId}/verification`,
      {
        method: 'PUT',
        body: JSON.stringify({ status, reviewNote }),
      }
    );
  }

  // Delete driver profile by user ID (admin only)
  async deleteDriverProfileByUserId(userId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/drivers/profile/user/${userId}`, {
      method: 'DELETE',
    });
  }

  // Get driver statistics (admin only)
  async getDriverStats(): Promise<DriverStats> {
    return this.request<DriverStats>('/api/drivers/stats');
  }

  // ========== Notifications ==========
  async updateFCMToken(token: string): Promise<void> {
    await this.request('/api/users/me/fcm-token', {
      method: 'POST',
      body: JSON.stringify({ fcm_token: token }),
    });
  }
}

export const apiService = new ApiService();