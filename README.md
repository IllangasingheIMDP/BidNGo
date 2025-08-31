# 🚗 BidNGo - Ride Sharing & Bidding Platform

A modern ride-sharing platform where passengers can bid on driver trips, built with Ballerina backend and React Native frontend using Expo.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)

## 🎯 Overview

BidNGo is a revolutionary ride-sharing platform that introduces a bidding system where:
- **Drivers** create trips with origin, destination, departure time, and base price
- **Passengers** search for trips and place bids with their preferred pickup locations
- **Real-time bidding** through WebSocket connections
- **Admin panel** for driver verification and platform management

## ✨ Features

### For Passengers
- 🔍 **Trip Search** - Find trips by origin and destination with geospatial ranking
- 💰 **Bidding System** - Place competitive bids on available trips
- 📍 **Custom Pickup** - Specify your preferred pickup location
- 📱 **Real-time Updates** - Live bid updates via WebSocket
- 📊 **Booking Management** - Track your bookings and trip history

### For Drivers
- 🚗 **Trip Creation** - Create trips with detailed route information
- 💵 **Bid Management** - Review and accept passenger bids
- 📋 **Driver Registration** - Complete profile with vehicle and license verification
- 🎯 **Smart Bidding** - Auto-confirm top bids for efficient trip planning

### For Admins
- ✅ **Driver Verification** - Review and approve driver applications
- 📊 **Analytics Dashboard** - Monitor platform statistics
- 👥 **User Management** - Manage users and driver profiles

## 🛠 Tech Stack

### Backend
- **[Ballerina](https://ballerina.io/)** - Cloud-native programming language
- **PostgreSQL** - Database (Supabase)
- **WebSocket** - Real-time communication
- **JWT** - Authentication

### Frontend
- **React Native** - Mobile framework
- **Expo** - Development platform
- **TypeScript** - Type safety
- **React Navigation** - Navigation
- **Expo Maps** - Location services

### Services
- **Supabase** - PostgreSQL database hosting
- **Google Maps API** - Maps and location services

## 📁 Project Structure

```
BidNGo/
├── backend/                    # Ballerina backend
│   ├── main.bal               # Main entry point
│   ├── Ballerina.toml         # Project configuration
│   ├── config.toml            # Environment configuration
│   └── modules/
│       ├── auth/              # Authentication service
│       ├── user_service/      # User management
│       ├── trips_service/     # Trip management
│       ├── bids_service/      # Bidding system + WebSocket
│       ├── booking_service/   # Booking management
│       ├── driver_service/    # Driver profile management
│       ├── upload_service/    # Document uploads
│       ├── admin_service/     # Admin operations
│       ├── notification_service/ # Push notifications
│       ├── db/                # Database connection
│       └── middleware/        # CORS and auth middleware
└── project/                   # React Native frontend
    ├── app/                   # App screens (Expo Router)
    ├── components/            # Reusable components
    ├── services/              # API services
    ├── types/                 # TypeScript types
    ├── contexts/              # React contexts
    └── utils/                 # Utility functions
```

## 📋 Prerequisites

### Required Software
1. **Ballerina** - [Download from official website](https://ballerina.io/downloads/)
2. **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
3. **npm** or **yarn**
4. **Android Studio** (for Android development)
5. **Expo CLI** - `npm install -g @expo/cli`

### Required Accounts
1. **Supabase** account for database
2. **Google Cloud** account for Maps API
3. **Expo** account (optional, for publishing)

## ⚙️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/BidNGo.git
cd BidNGo
```

### 2. Backend Setup
```bash
cd backend

# Install dependencies (handled by Ballerina)
# Configure environment variables (see Configuration section)

# Build and run
bal run --watch
```

### 3. Frontend Setup
```bash
cd project

# Install dependencies
npm install

# For Android development
npx expo run:android



## 🔧 Configuration

### Backend Configuration

#### Database Configuration (`backend/modules/db/db.bal`)

**For Public WiFi:**
```ballerina
configurable string host = "db.wkjheqsekenkoowlqecy.supabase.co";
configurable string dbUsername = "postgres";
```

**For Personal Hotspot:**
```ballerina
configurable string host = "aws-1-ap-southeast-1.pooler.supabase.com";
configurable string dbUsername = "postgres.wkjheqsekenkoowlqecy";
```

#### Environment Variables

Already added for easy usage for evaluation

### Frontend Configuration

#### API Configuration (`project/services/api.ts`)

**For Personal Hotspot:**
```typescript
const API_BASE_URL = 'http://YOUR_PC_IP:9000';
const WS_HOST = 'YOUR_PC_IP';
```

**For Public WiFi (using VS Code port forwarding):**
1. Open VS Code terminal
2. Go to "Ports" tab
3. Forward port 9000
4. Set visibility to "Public"
5. Copy the generated URL
```typescript
const API_BASE_URL = 'https://your-tunnel-url.devtunnels.ms';
```

#### Google Maps API
Already added for easy evaluation
```

## 🚀 Running the Application

### Backend
```bash
cd backend
bal run --watch
```
The backend will start on:
- **Main API**: `http://localhost:9000`
- **Health Check**: `http://localhost:9090`
- **WebSocket**: `ws://localhost:21003/ws`

### Frontend
```bash
cd project

# Development mode
npx expo start

# Run on Android
npx expo run:android

```
### Port Forwarding (Public WiFi)
1. In VS Code, open the "Ports" panel
2. Click "Forward a Port"
3. Enter `9000`
4. Right-click on the forwarded port
5. Select "Port Visibility" → "Public"
6. Copy the generated URL and update `API_BASE_URL` in `project/services/api.ts`

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/driver_register_as_user` - Driver step 1
- `POST /api/auth/driver_complete_register` - Driver step 2

### Trip Management
- `GET /api/trips/trips` - List all trips
- `POST /api/trips/trips` - Create trip (driver)
- `PUT /api/trips/trips/:id` - Update trip
- `POST /api/trips/trips/search` - Search trips with geolocation

### Bidding System
- `POST /api/bids/bids` - Place bid
- `GET /api/bids/bids/trip/:id` - Get trip bids
- `GET /api/bids/bids/mine` - Get my bids
- `POST /api/bids/bids/confirm/:tripId` - Confirm top bids

### WebSocket Events
- **Connection**: `ws://localhost:21003/ws`
- **Events**: Bid updates, trip status changes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 Development Notes

### Network Configuration
- **UoM WiFi**: Use Supabase direct connection + VS Code port forwarding
- **Personal Hotspot**: Use AWS pooler + local IP configuration

### Database Schema
The application uses PostgreSQL with the following main tables:
- `users` - User profiles and authentication
- `driver_profiles` - Driver verification data
- `trips` - Trip information
- `bids` - Bidding data
- `bookings` - Confirmed bookings

### WebSocket Implementation
Real-time features are powered by WebSocket connections for:
- Live bid updates
- Trip status changes
- Driver notifications

---

## 📞 Support

For development questions or issues:
1. Check the existing documentation
2. Search through existing issues
3. Create a new issue with detailed information

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

