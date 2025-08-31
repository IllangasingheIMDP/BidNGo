import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Alert, Platform, Modal } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { router } from 'expo-router';
import LocationPicker from '../../components/LocationPicker';
import { apiService, BackendTrip } from '../../services/api';

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

	const topTrip = useMemo(() => (results.length > 0 ? results[0] : null), [results]);

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
					onPress={() => Alert.alert('Trip Details', `Full details for trip #${item.id} would be shown here.`)}
				>
					<Text style={styles.viewDetailsText}>View Details</Text>
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
		borderRadius: 16, 
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
});
