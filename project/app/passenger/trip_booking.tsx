import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Alert, Platform, Modal, ScrollView } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { router } from 'expo-router';
import LocationPicker from '../../components/LocationPicker';
import { apiService, BackendTrip, DriverProfile } from '../../services/api';
import { User } from '../../types';

type LocationResult = { lat: number; lng: number; address: string };

const GOOGLE_MAPS_API_KEY = Platform.OS === 'ios'
	? 'AIzaSyCtpf8qeboIsNHPaO7idcU2e_3huaHpae0'
	: 'AIzaSyCtpf8qeboIsNHPaO7idcU2e_3huaHpae0';

export default function TripBookingScreen() {
	const mapRef = useRef<MapView>(null);
	const [origin, setOrigin] = useState<LocationResult | null>(null);
	const [destination, setDestination] = useState<LocationResult | null>(null);
	const [loading, setLoading] = useState(false);
	const [results, setResults] = useState<BackendTrip[]>([]);
	const [routeCoords, setRouteCoords] = useState<Array<{ latitude: number; longitude: number }>>([]);
	const [locationsConfirmed, setLocationsConfirmed] = useState(false);
	const [showLocationPicker, setShowLocationPicker] = useState(false);
	const [showDriverModal, setShowDriverModal] = useState(false);
	const [selectedDriver, setSelectedDriver] = useState<{ user: User; profile: DriverProfile | null; trip: BackendTrip } | null>(null);
	const [loadingDriver, setLoadingDriver] = useState(false);

	const topTrip = useMemo(() => (results.length > 0 ? results[0] : null), [results]);

	const showDriverDetails = async (trip: BackendTrip) => {
		try {
			setLoadingDriver(true);
			setShowDriverModal(true);
			
			// First get the driver's user info
			const driverUser = await apiService.getUserById(trip.driver_user_id);
			
			// Try to get driver profile for additional details
			let driverProfile: DriverProfile | null = null;
			try {
				driverProfile = await apiService.getDriverProfileByUserId(trip.driver_user_id);
			} catch (error) {
				console.log('Driver profile not found, showing basic user info only');
			}

			setSelectedDriver({ user: driverUser, profile: driverProfile, trip });
		} catch (error: any) {
			Alert.alert('Error', 'Could not load driver details: ' + (error?.message || 'Unknown error'));
			setShowDriverModal(false);
		} finally {
			setLoadingDriver(false);
		}
	};

	const onLocationsSelected = (o: LocationResult, d: LocationResult) => {
		setOrigin(o);
		setDestination(d);
		setLocationsConfirmed(true);
		setShowLocationPicker(false);
		// Auto-search if both locations are selected
		setTimeout(() => {
			searchTrips();
		}, 500);
	};

	const searchTrips = async () => {
		console.log('Searching trips WITH', { origin, destination });
		if (!origin || !destination) {
			Alert.alert('Select locations', 'Please select both start and end locations');
			return;
		}
		try {
			setLoading(true);
			// Use today by default for date filter
			const dateStr = new Date().toISOString();
			const found = await apiService.searchTrips({
				origin: { lat: origin.lat, lng: origin.lng, address: origin.address },
				destination: { lat: destination.lat, lng: destination.lng, address: destination.address },
				date: dateStr,
			} as any);
			setResults(found);
		} catch (e: any) {
			Alert.alert('Search failed', e?.message || 'Could not search trips.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		// When top trip changes, fetch and render its route
		const fetchRoute = async () => {
			if (!topTrip) {
				setRouteCoords([]);
				return;
			}
			try {
				const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${topTrip.origin_lat},${topTrip.origin_lng}&destination=${topTrip.dest_lat},${topTrip.dest_lng}&key=${GOOGLE_MAPS_API_KEY}`;
				const res = await fetch(url);
				const json = await res.json();
				if (json.routes && json.routes.length > 0) {
					const pts = decodePolyline(json.routes[0].overview_polyline.points);
					setRouteCoords(pts);
					// Fit map to route
					setTimeout(() => {
						mapRef.current?.fitToCoordinates(pts, {
							edgePadding: { top: 60, bottom: 60, left: 60, right: 60 },
							animated: true,
						});
					}, 300);
				} else {
					setRouteCoords([]);
				}
			} catch {
				setRouteCoords([]);
			}
		};
		fetchRoute();
	}, [topTrip]);

	function decodePolyline(encoded: string) {
		const points: Array<{ latitude: number; longitude: number }> = [];
		let index = 0, len = encoded.length;
		let lat = 0, lng = 0;
		while (index < len) {
			let b, shift = 0, result = 0;
			do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
			const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
			lat += dlat;
			shift = 0; result = 0;
			do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
			const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
			lng += dlng;
			points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
		}
		return points;
	}

	const renderTripItem = ({ item, index }: { item: BackendTrip; index: number }) => (
		<View style={[styles.tripItem, index === 0 && styles.topTripItem]}>
			<View style={styles.tripHeader}>
				<View style={styles.tripRankBadge}>
					<Text style={styles.tripRankText}>#{index + 1}</Text>
				</View>
				<Text style={styles.price}>LKR {item.base_price.toFixed(2)}</Text>
			</View>
			<Text style={styles.addr} numberOfLines={1}>📍 From: {item.origin_addr}</Text>
			<Text style={styles.addr} numberOfLines={1}>🎯 To: {item.dest_addr}</Text>
			<View style={styles.metaRow}>
				<Text style={styles.meta}>🕒 {new Date(item.departure_datetime).toLocaleString()}</Text>
				<Text style={styles.meta}>👥 {item.available_seats} seats</Text>
			</View>
			{item.notes && (
				<Text style={styles.notes} numberOfLines={2}>📝 {item.notes}</Text>
			)}
			
			{/* Action buttons */}
			<View style={styles.tripActions}>
				<TouchableOpacity 
					style={styles.viewDetailsButton}
					onPress={() => showDriverDetails(item)}
				>
					<Text style={styles.viewDetailsText}>View Driver Details</Text>
				</TouchableOpacity>
				<TouchableOpacity 
					style={styles.bookButton}
					onPress={() => {
						// Navigate to bidding screen with trip and pickup location data
						router.push({
							pathname: '/passenger/trip_bidding' as any,
							params: {
								tripId: item.id.toString(),
								tripData: JSON.stringify(item),
								pickupLat: origin?.lat.toString() || '',
								pickupLng: origin?.lng.toString() || '',
								pickupAddress: origin?.address || '',
							}
						});
					}}
				>
					<Text style={styles.bookButtonText}>Place Bid</Text>
				</TouchableOpacity>
			</View>
		</View>
	);

	return (
		<View style={styles.container}>
			{/* Location selection button */}
			<View style={styles.locationSelectionContainer}>
				<TouchableOpacity
					style={[styles.locationButton, (origin && destination) && styles.selectedLocationButton]}
					onPress={() => setShowLocationPicker(true)}
				>
					<Text style={styles.locationButtonLabel}>📍 Route Selection</Text>
					{origin && destination ? (
						<>
							<Text style={styles.locationText} numberOfLines={1}>
								From: {origin.address.split(',')[0]}
							</Text>
							<Text style={styles.locationText} numberOfLines={1}>
								To: {destination.address.split(',')[0]}
							</Text>
						</>
					) : (
						<Text style={styles.placeholderText}>
							Tap to select your origin and destination
						</Text>
					)}
				</TouchableOpacity>

				{/* Clear and Search buttons */}
				{(origin || destination) && (
					<View style={styles.actionButtonsRow}>
						<TouchableOpacity 
							style={styles.clearButton} 
							onPress={() => {
								setOrigin(null);
								setDestination(null);
								setLocationsConfirmed(false);
								setResults([]);
								setRouteCoords([]);
							}}
						>
							<Text style={styles.clearButtonText}>Clear</Text>
						</TouchableOpacity>
						{origin && destination && (
							<TouchableOpacity 
								style={[styles.searchButton, loading && styles.buttonDisabled]} 
								onPress={searchTrips} 
								disabled={loading}
							>
								{loading ? (
									<ActivityIndicator color="#fff" size="small" />
								) : (
									<Text style={styles.searchButtonText}>Search Trips</Text>
								)}
							</TouchableOpacity>
						)}
					</View>
				)}
			</View>

			{/* Location Picker Modal */}
			<Modal visible={showLocationPicker} animationType="slide" presentationStyle="formSheet">
				<View style={styles.modalContainer}>
					<View style={styles.modalHeader}>
						<TouchableOpacity onPress={() => setShowLocationPicker(false)}>
							<Text style={styles.modalCancelText}>Cancel</Text>
						</TouchableOpacity>
						<Text style={styles.modalTitle}>Select Route</Text>
						<View style={styles.modalPlaceholder} />
					</View>
					<LocationPicker
						height={700}
						onLocationsSelected={onLocationsSelected}
						initialOrigin={origin}
						initialDestination={destination}
					/>
				</View>
			</Modal>

			{/* Driver Details Modal */}
			<Modal visible={showDriverModal} animationType="slide" presentationStyle="formSheet" transparent={true}>
				<View style={styles.driverModalOverlay}>
					<View style={styles.driverModalContainer}>
						{/* Modal Header */}
						<View style={styles.driverModalHeader}>
							<TouchableOpacity 
								onPress={() => {
									setShowDriverModal(false);
									setSelectedDriver(null);
								}}
								style={styles.closeButton}
							>
								<Text style={styles.closeButtonText}>✕</Text>
							</TouchableOpacity>
							<Text style={styles.driverModalTitle}>Driver Details</Text>
							<View style={styles.headerSpacer} />
						</View>

						{/* Modal Content */}
						{loadingDriver ? (
							<View style={styles.loadingContainer}>
								<ActivityIndicator size="large" color="#3b82f6" />
								<Text style={styles.loadingText}>Loading driver details...</Text>
							</View>
						) : selectedDriver ? (
							<ScrollView 
								style={styles.driverContent}
								contentContainerStyle={styles.driverScrollContent}
								showsVerticalScrollIndicator={true}
								bounces={true}
							>
								{/* Driver Profile Section */}
								<View style={styles.driverProfileSection}>
									<View style={styles.driverAvatar}>
										<Text style={styles.driverInitials}>
											{selectedDriver.user.name?.charAt(0)?.toUpperCase() || '?'}
										</Text>
									</View>
									<View style={styles.driverBasicInfo}>
										<Text style={styles.driverName}>{selectedDriver.user.name || 'Unknown Driver'}</Text>
										{selectedDriver.user.rating && (
											<View style={styles.ratingContainer}>
												<Text style={styles.ratingStars}>
													{'★'.repeat(Math.floor(selectedDriver.user.rating))}
													{'☆'.repeat(5 - Math.floor(selectedDriver.user.rating))}
												</Text>
												<Text style={styles.ratingText}>{selectedDriver.user.rating.toFixed(1)}/5</Text>
											</View>
										)}
										<View style={styles.verificationBadge}>
											<Text style={styles.verificationText}>
												{selectedDriver.profile?.verificationStatus === 'approved' ? '✅ Verified Driver' : '⏳ Pending Verification'}
											</Text>
										</View>
									</View>
								</View>

								{/* Contact Information */}
								<View style={styles.infoSection}>
									<Text style={styles.sectionTitle}>📞 Contact Information</Text>
									<View style={styles.infoRow}>
										<Text style={styles.infoLabel}>Phone:</Text>
										<Text style={styles.infoValue}>{selectedDriver.user.phone || 'Not provided'}</Text>
									</View>
									<View style={styles.infoRow}>
										<Text style={styles.infoLabel}>Email:</Text>
										<Text style={styles.infoValue}>{selectedDriver.user.email}</Text>
									</View>
								</View>

								{/* Vehicle Information */}
								{selectedDriver.profile && (
									<View style={styles.infoSection}>
										<Text style={styles.sectionTitle}>🚗 Vehicle Information</Text>
										<View style={styles.infoRow}>
											<Text style={styles.infoLabel}>Model:</Text>
											<Text style={styles.infoValue}>{selectedDriver.profile.vehicleModel}</Text>
										</View>
										<View style={styles.infoRow}>
											<Text style={styles.infoLabel}>Registration:</Text>
											<Text style={styles.infoValue}>{selectedDriver.profile.vehicleRegNumber}</Text>
										</View>
										<View style={styles.infoRow}>
											<Text style={styles.infoLabel}>License:</Text>
											<Text style={styles.infoValue}>{selectedDriver.profile.licenseNumber}</Text>
										</View>
									</View>
								)}

								{/* Trip Information */}
								<View style={styles.infoSection}>
									<Text style={styles.sectionTitle}>🎯 Trip Information</Text>
									<View style={styles.infoRow}>
										<Text style={styles.infoLabel}>Available Seats:</Text>
										<Text style={styles.infoValue}>{selectedDriver.trip.available_seats}</Text>
									</View>
									<View style={styles.infoRow}>
										<Text style={styles.infoLabel}>Base Price:</Text>
										<Text style={styles.priceValue}>LKR {selectedDriver.trip.base_price.toFixed(2)}</Text>
									</View>
									<View style={styles.infoRow}>
										<Text style={styles.infoLabel}>Departure:</Text>
										<Text style={styles.infoValue}>{new Date(selectedDriver.trip.departure_datetime).toLocaleString()}</Text>
									</View>
									{selectedDriver.trip.notes && (
										<View style={styles.notesContainer}>
											<Text style={styles.infoLabel}>Notes:</Text>
											<Text style={styles.notesText}>{selectedDriver.trip.notes}</Text>
										</View>
									)}
								</View>

								{/* Action Buttons */}
								<View style={styles.actionButtonsContainer}>
									{selectedDriver.user.phone && (
										<TouchableOpacity 
											style={styles.contactButton}
											onPress={() => {
												Alert.alert(
													'Contact Driver',
													`Phone: ${selectedDriver.user.phone}\nEmail: ${selectedDriver.user.email}`,
													[
														{ text: 'Close', style: 'cancel' },
														{ text: 'Call', onPress: () => {
															// You could implement actual calling functionality here
															Alert.alert('Call Feature', 'Calling functionality would be implemented here');
														}}
													]
												);
											}}
										>
											<Text style={styles.contactButtonText}>📞 Contact Driver</Text>
										</TouchableOpacity>
									)}
									<TouchableOpacity 
										style={styles.placeBidButton}
										onPress={() => {
											setShowDriverModal(false);
											setSelectedDriver(null);
											// Navigate to bidding with the trip data
											router.push({
												pathname: '/passenger/trip_bidding' as any,
												params: {
													tripId: selectedDriver.trip.id.toString(),
													tripData: JSON.stringify(selectedDriver.trip),
													pickupLat: origin?.lat.toString() || '',
													pickupLng: origin?.lng.toString() || '',
													pickupAddress: origin?.address || '',
												}
											});
										}}
									>
										<Text style={styles.placeBidButtonText}>💰 Place Bid</Text>
									</TouchableOpacity>
								</View>
							</ScrollView>
						) : null}
					</View>
				</View>
			</Modal>

			{/* Results section - show after locations are selected */}
			{(origin && destination) && (
				<>
					{/* Map showing rank #1 route */}
					<View style={styles.mapContainer}>
						<MapView
							ref={mapRef}
							provider={PROVIDER_GOOGLE}
							style={styles.map}
							initialRegion={{ 
								latitude: 7.8731, 
								longitude: 80.7718, 
								latitudeDelta: 2.5, 
								longitudeDelta: 2.5 
							}}
						>
							{topTrip && (
								<>
									<Marker 
										coordinate={{ latitude: topTrip.origin_lat, longitude: topTrip.origin_lng }} 
										title="Trip Start" 
										pinColor="#2196f3" 
									/>
									<Marker 
										coordinate={{ latitude: topTrip.dest_lat, longitude: topTrip.dest_lng }} 
										title="Trip End" 
										pinColor="#e91e63" 
									/>
								</>
							)}
							{routeCoords.length > 0 && (
								<Polyline coordinates={routeCoords} strokeColor="#2196f3" strokeWidth={5} />
							)}
						</MapView>
						{!topTrip && !loading && (
							<View style={styles.mapHint}> 
								<Text style={styles.mapHintText}>
									{results.length === 0 ? 'Searching for trips...' : 'Top ranked trip route will appear here'}
								</Text>
							</View>
						)}
					</View>

					{/* Results list */}
					<View style={styles.resultsHeader}>
						<Text style={styles.resultsTitle}>
							{loading ? 'Searching...' : `Matched Trips ${results.length > 0 ? `(${results.length})` : ''}`}
						</Text>
					</View>
					{loading ? (
						<View style={{ alignItems: 'center', padding: 20 }}>
							<ActivityIndicator size="large" color="#3b82f6" />
							<Text style={styles.emptyText}>Finding the best trips for you...</Text>
						</View>
					) : results.length === 0 ? (
						<View style={{ alignItems: 'center', padding: 20 }}>
							<Text style={styles.emptyText}>🚗 No trips found for your route.</Text>
							<Text style={styles.emptyText}>Try adjusting your locations or check back later.</Text>
						</View>
					) : (
						<FlatList
							data={results}
							keyExtractor={(item) => String(item.id)}
							renderItem={renderTripItem}
							contentContainerStyle={{ paddingBottom: 24 }}
						/>
					)}
				</>
			)}

			{/* Instructions when no locations selected */}
			{!origin && !destination && (
				<View style={styles.instructionsContainer}>
					<Text style={styles.instructionsTitle}>Find Your Perfect Trip</Text>
					<Text style={styles.instructionsText}>
						1. Tap "Route Selection" above{'\n'}
						2. Choose your starting location{'\n'}
						3. Select your destination{'\n'}
						4. Search results will appear automatically
					</Text>
					<Text style={styles.tipText}>
						💡 Tip: You can search for locations or tap directly on the map!
					</Text>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: { 
		flex: 1, 
		backgroundColor: '#0a0a0a' ,
		paddingTop:45
	},
	
	// Location selection styles
	locationSelectionContainer: { 
		margin: 20, 
		backgroundColor: '#1a1a1a', 
		borderRadius: 20, 
		padding: 20,
		borderWidth: 1,
		borderColor: '#2a2a2a',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.3,
		shadowRadius: 12,
		elevation: 12,
	},
	locationButton: { 
		backgroundColor: '#2a2a2a',
		borderWidth: 2,
		borderColor: '#3a3a3a',
		borderRadius: 16,
		padding: 20,
		borderStyle: 'dashed',
	},
	selectedLocationButton: {
		backgroundColor: 'rgba(59, 130, 246, 0.1)',
		borderColor: '#3b82f6',
		borderStyle: 'solid',
		shadowColor: '#3b82f6',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 8,
	},
	locationButtonLabel: { 
		fontSize: 18, 
		fontWeight: '800', 
		color: '#3b82f6', 
		marginBottom: 12,
		letterSpacing: 0.5,
	},
	locationText: { 
		fontSize: 15, 
		color: '#ffffff', 
		marginBottom: 6,
		fontWeight: '600',
		letterSpacing: 0.3,
	},
	placeholderText: { 
		fontSize: 15, 
		color: '#9ca3af', 
		fontStyle: 'italic',
		letterSpacing: 0.2,
	},
	actionButtonsRow: { 
		flexDirection: 'row', 
		gap: 12, 
		marginTop: 16,
	},
	clearButton: { 
		backgroundColor: '#6b7280',
		paddingHorizontal: 20,
		paddingVertical: 14,
		borderRadius: 16,
		flex: 1,
		alignItems: 'center',
		shadowColor: '#6b7280',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 8,
	},
	clearButtonText: { 
		color: '#ffffff', 
		fontWeight: '700',
		letterSpacing: 0.5,
		textTransform: 'uppercase',
	},
	searchButton: { 
		backgroundColor: '#3b82f6', 
		paddingVertical: 14, 
		borderRadius: 16, 
		alignItems: 'center',
		flex: 2,
		shadowColor: '#3b82f6',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 8,
	},
	searchButtonText: { 
		color: '#ffffff', 
		fontWeight: '700',
		letterSpacing: 0.5,
		textTransform: 'uppercase',
	},

	// Modal styles
	modalContainer: { 
		flex: 1, 
		backgroundColor: '#1a1a1a',
		paddingHorizontal: 20,
		
	},
	modalHeader: { 
		flexDirection: 'row', 
		justifyContent: 'space-between', 
		alignItems: 'center',
		paddingHorizontal: 20,
		paddingVertical: 16,
		
		borderBottomWidth: 1,
		borderBottomColor: '#3a3a3a',
		paddingTop: Platform.OS === 'ios' ? 45 : 16,
	},
	modalTitle: { 
		fontSize: 20, 
		fontWeight: '800', 
		color: '#ffffff',
		letterSpacing: 0.5,
	},
	modalCancelText: { 
		fontSize: 16, 
		color: '#3b82f6', 
		fontWeight: '700',
		letterSpacing: 0.3,
	},
	modalPlaceholder: { 

		width: 80,
	},

	// Map and results styles
	actionsBar: { 
		paddingHorizontal: 20, 
		paddingBottom: 12 
	},
	button: { 
		backgroundColor: '#3b82f6', 
		paddingVertical: 16, 
		borderRadius: 16, 
		alignItems: 'center',
		shadowColor: '#3b82f6',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 8,
	},
	buttonDisabled: { 
		opacity: 0.6 
	},
	buttonText: { 
		color: '#ffffff', 
		fontWeight: '700',
		letterSpacing: 0.5,
		textTransform: 'uppercase',
	},
	mapContainer: { 
		height: 100,
		 
		margin: 20, 
		borderRadius: 20, 
		overflow: 'hidden', 
		backgroundColor: '#1a1a1a',
		borderWidth: 1,
		borderColor: '#2a2a2a',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.3,
		shadowRadius: 12,
		elevation: 12,
	},
	map: { 
		width: '100%', 
		height: '100%' 
	},
	mapHint: { 
		position: 'absolute', 
		left: 0, 
		right: 0, 
		bottom: 0, 
		padding: 16, 
		backgroundColor: 'rgba(26, 26, 26, 0.9)',
		borderBottomLeftRadius: 20,
		borderBottomRightRadius: 20,
	},
	mapHintText: { 
		color: '#ffffff', 
		textAlign: 'center',
		fontSize: 14,
		fontWeight: '600',
		letterSpacing: 0.3,
	},
	resultsHeader: { 
		paddingHorizontal: 20, 
		paddingTop: 8,
		paddingBottom: 12,
	},
	resultsTitle: { 
		fontSize: 20, 
		fontWeight: '800', 
		color: '#ffffff',
		letterSpacing: 0.5,
	},
	emptyText: { 
		paddingHorizontal: 20, 
		paddingVertical: 12, 
		color: '#9ca3af',
		fontSize: 16,
		textAlign: 'center',
		letterSpacing: 0.2,
	},
	tripItem: { 
		backgroundColor: '#1a1a1a', 
		padding: 20, 
		borderRadius: 20, 
		marginHorizontal: 20,
		marginBottom: 16, 
		borderWidth: 1,
		borderColor: '#2a2a2a',
		shadowColor: '#000', 
		shadowOffset: { width: 0, height: 8 }, 
		shadowOpacity: 0.3, 
		shadowRadius: 12, 
		elevation: 12,
	},
	topTripItem: { 
		borderWidth: 2, 
		borderColor: '#3b82f6',
		shadowColor: '#3b82f6',
		shadowOpacity: 0.4,
	},
	tripHeader: { 
		flexDirection: 'row', 
		justifyContent: 'space-between', 
		alignItems: 'center', 
		marginBottom: 16,
	},
	tripRankBadge: { 
		backgroundColor: '#3b82f6', 
		paddingHorizontal: 12, 
		paddingVertical: 6, 
		borderRadius: 20,
		shadowColor: '#3b82f6',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 4,
		elevation: 4,
	},
	tripRankText: { 
		color: '#ffffff', 
		fontSize: 12, 
		fontWeight: '700',
		letterSpacing: 0.5,
		textTransform: 'uppercase',
	},
	tripTitle: { 
		fontWeight: '800', 
		color: '#ffffff',
		letterSpacing: 0.3,
	},
	price: { 
		fontWeight: '800', 
		color: '#3b82f6', 
		fontSize: 20,
		letterSpacing: 0.3,
	},
	addr: { 
		color: '#d1d5db', 
		marginBottom: 6, 
		fontSize: 15,
		fontWeight: '500',
		letterSpacing: 0.2,
	},
	metaRow: { 
		flexDirection: 'row', 
		justifyContent: 'space-between', 
		marginBottom: 12,
		backgroundColor: '#262626',
		padding: 12,
		borderRadius: 12,
	},
	meta: { 
		fontSize: 13, 
		color: '#9ca3af',
		fontWeight: '600',
		letterSpacing: 0.2,
	},
	notes: { 
		fontSize: 13, 
		color: '#9ca3af', 
		fontStyle: 'italic', 
		marginBottom: 16,
		backgroundColor: '#262626',
		padding: 12,
		borderRadius: 12,
		letterSpacing: 0.2,
	},
	tripActions: { 
		flexDirection: 'row', 
		gap: 12, 
		marginTop: 8,
	},
	viewDetailsButton: { 
		flex: 1, 
		backgroundColor: '#6b7280', 
		paddingVertical: 14, 
		paddingHorizontal: 10,
		borderRadius: 16, 
		justifyContent: 'center',
		alignItems: 'center',
		shadowColor: '#6b7280',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 8,
	},
	viewDetailsText: { 
		color: '#ffffff', 
		fontWeight: '700', 
		fontSize: 14,
		letterSpacing: 0.5,
		textTransform: 'uppercase',
	},
	bookButton: { 
		flex: 1, 
		backgroundColor: '#3b82f6', 
		paddingVertical: 14, 
		borderRadius: 16, 
		alignItems: 'center',
		shadowColor: '#3b82f6',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 8,
	},
	bookButtonText: { 
		color: '#ffffff', 
		fontWeight: '700', 
		fontSize: 14,
		letterSpacing: 0.5,
		textTransform: 'uppercase',
	},
	instructionsContainer: { 
		margin: 20, 
		padding: 24, 
		backgroundColor: '#1a1a1a', 
		borderRadius: 20, 
		borderWidth: 1,
		borderColor: '#2a2a2a',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.3,
		shadowRadius: 12,
		elevation: 12,
	},
	instructionsTitle: { 
		fontSize: 24, 
		fontWeight: '800', 
		color: '#ffffff', 
		marginBottom: 16,
		textAlign: 'center',
		letterSpacing: 0.5,
	},
	instructionsText: { 
		fontSize: 16, 
		color: '#d1d5db', 
		lineHeight: 26,
		marginBottom: 20,
		fontWeight: '500',
		letterSpacing: 0.2,
	},
	tipText: { 
		fontSize: 14, 
		color: '#60a5fa', 
		fontStyle: 'italic',
		textAlign: 'center',
		backgroundColor: 'rgba(59, 130, 246, 0.1)',
		padding: 16,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: 'rgba(59, 130, 246, 0.3)',
		letterSpacing: 0.2,
	},

	// Driver Modal Styles
	driverModalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.8)',
		justifyContent: 'flex-end',
	},
	driverModalContainer: {
		backgroundColor: '#1a1a1a',
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		maxHeight: '90%',
		minHeight: '70%',
	},
	driverModalHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 24,
		paddingVertical: 20,
		borderBottomWidth: 1,
		borderBottomColor: '#2a2a2a',
	},
	closeButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#2a2a2a',
		justifyContent: 'center',
		alignItems: 'center',
	},
	closeButtonText: {
		color: '#ffffff',
		fontSize: 18,
		fontWeight: '600',
	},
	driverModalTitle: {
		fontSize: 20,
		fontWeight: '800',
		color: '#ffffff',
		letterSpacing: 0.5,
	},
	headerSpacer: {
		width: 40,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 60,
	},
	loadingText: {
		color: '#9ca3af',
		fontSize: 16,
		marginTop: 16,
		fontWeight: '500',
	},
	driverContent: {
		flex: 1,
		paddingHorizontal: 24,
	},
	driverScrollContent: {
		paddingBottom: 24,
	},
	driverProfileSection: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 24,
		borderBottomWidth: 1,
		borderBottomColor: '#2a2a2a',
		
	},
	driverAvatar: {
		width: 70,
		height: 70,
		borderRadius: 35,
		backgroundColor: '#3b82f6',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 20,
		shadowColor: '#3b82f6',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 8,
	},
	driverInitials: {
		color: '#ffffff',
		fontSize: 28,
		fontWeight: '800',
		letterSpacing: 0.5,
	},
	driverBasicInfo: {
		flex: 1,
	},
	driverName: {
		fontSize: 22,
		fontWeight: '800',
		color: '#ffffff',
		marginBottom: 8,
		letterSpacing: 0.3,
	},
	ratingContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	ratingStars: {
		fontSize: 16,
		color: '#fbbf24',
		marginRight: 8,
	},
	ratingText: {
		fontSize: 14,
		color: '#d1d5db',
		fontWeight: '600',
	},
	verificationBadge: {
		alignSelf: 'flex-start',
		backgroundColor: 'rgba(34, 197, 94, 0.1)',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: 'rgba(34, 197, 94, 0.3)',
	},
	verificationText: {
		fontSize: 12,
		color: '#22c55e',
		fontWeight: '600',
		letterSpacing: 0.3,
	},
	infoSection: {
		paddingVertical: 20,
		borderBottomWidth: 1,
		borderBottomColor: '#2a2a2a',
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#ffffff',
		marginBottom: 16,
		letterSpacing: 0.3,
	},
	infoRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 8,
		paddingHorizontal: 16,
		backgroundColor: '#262626',
		borderRadius: 12,
		marginBottom: 8,
	},
	infoLabel: {
		fontSize: 14,
		color: '#9ca3af',
		fontWeight: '600',
		flex: 1,
	},
	infoValue: {
		fontSize: 14,
		color: '#ffffff',
		fontWeight: '500',
		flex: 2,
		textAlign: 'right',
	},
	priceValue: {
		fontSize: 16,
		color: '#3b82f6',
		fontWeight: '700',
		flex: 2,
		textAlign: 'right',
		letterSpacing: 0.3,
	},
	notesContainer: {
		backgroundColor: '#262626',
		borderRadius: 12,
		padding: 16,
		marginTop: 8,
	},
	notesText: {
		fontSize: 14,
		color: '#d1d5db',
		fontStyle: 'italic',
		marginTop: 8,
		lineHeight: 20,
	},
	actionButtonsContainer: {
		flexDirection: 'row',
		gap: 12,
		paddingTop: 24,
		paddingBottom: 12,
	},
	contactButton: {
		flex: 1,
		backgroundColor: '#6b7280',
		paddingVertical: 16,
		borderRadius: 16,
		alignItems: 'center',
		shadowColor: '#6b7280',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 8,
	},
	contactButtonText: {
		color: '#ffffff',
		fontSize: 16,
		fontWeight: '700',
		letterSpacing: 0.5,
	},
	placeBidButton: {
		flex: 1,
		backgroundColor: '#3b82f6',
		paddingVertical: 16,
		borderRadius: 16,
		alignItems: 'center',
		shadowColor: '#3b82f6',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 8,
	},
	placeBidButtonText: {
		color: '#ffffff',
		fontSize: 16,
		fontWeight: '700',
		letterSpacing: 0.5,
	},
});
