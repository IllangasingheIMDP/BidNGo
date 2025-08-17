export interface User {
  id: string;
  email: string;
  role: 'driver' | 'passenger';
  name?: string;
 
  phone?: string;
  rating?: number;
  avatar_url?: string;
  is_verified?: boolean;
  created_at?: string;
}

export interface Driver extends User {
  license_number: string;
  vehicle: Vehicle;
  documents: Document[];
  earnings: number;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  plate_number: string;
  photos: string[];
}

export interface Document {
  id: string;
  type: 'license' | 'vehicle_registration' | 'insurance';
  url: string;
  status: 'pending' | 'approved' | 'rejected';
  uploaded_at: string;
}

export interface Trip {
  id: string;
  driver_id: string;
  driver: Driver;
  origin: Location;
  destination: Location;
  departure_datetime: string;
  available_seats: number;
  base_price_per_seat: number;
  status: 'open' | 'started' | 'completed' | 'cancelled';
  distance_km: number;
  duration_minutes: number;
  highest_bid?: number;
  bid_count: number;
  created_at: string;
}

export interface Location {
  lat: number;
  lng: number;
  address: string;
  city?: string;
}

export interface Bid {
  id: string;
  trip_id: string;
  passenger_id: string;
  passenger: User;
  bid_price: number;
  pickup_point: Location;
  status: 'open' | 'accepted' | 'rejected' | 'withdrawn';
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  trip_id: string;
  trip: Trip;
  passenger_id: string;
  passenger: User;
  driver_id: string;
  driver: Driver;
  pickup_point: Location;
  fare: number;
  payment_method: 'cash' | 'placeholder_card';
  payment_status: 'pending' | 'completed';
  status: 'booked' | 'picked_up' | 'completed' | 'cancelled';
  created_at: string;
}

export interface Rating {
  id: string;
  booking_id: string;
  rater_id: string;
  rated_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface AuthResponse {
  message: string;
  token: string;
}

export interface SearchFilters {
  origin: Location;
  destination: Location;
  date: string;
  max_price?: number;
  min_seats?: number;
}