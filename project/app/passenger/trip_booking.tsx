import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Alert, Platform, Modal } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
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
					onPress={() => Alert.alert(
						'Book Trip', 
						`Book this trip for LKR ${item.base_price.toFixed(2)}?\n\nFrom: ${item.origin_addr}\nTo: ${item.dest_addr}\nDeparture: ${new Date(item.departure_datetime).toLocaleString()}`,
						[
							{ text: 'Cancel', style: 'cancel' },
							{ text: 'Book Now', onPress: () => Alert.alert('Success', 'Booking feature coming soon!') }
						]
					)}
				>
					<Text style={styles.bookButtonText}>Book Trip</Text>
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
						height={600}
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
							<ActivityIndicator size="large" color="#2563eb" />
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
							contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24 }}
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
	container: { flex: 1, backgroundColor: '#f7f7f7' },
	
	// Location selection styles
	locationSelectionContainer: { 
		margin: 12, 
		backgroundColor: '#fff', 
		borderRadius: 12, 
		padding: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	locationButton: { 
		backgroundColor: '#f8f9fa',
		borderWidth: 2,
		borderColor: '#e9ecef',
		borderRadius: 12,
		padding: 16,
		borderStyle: 'dashed',
	},
	selectedLocationButton: {
		backgroundColor: '#e3f2fd',
		borderColor: '#2563eb',
		borderStyle: 'solid',
	},
	locationButtonLabel: { 
		fontSize: 16, 
		fontWeight: '700', 
		color: '#2563eb', 
		marginBottom: 8,
	},
	locationText: { 
		fontSize: 14, 
		color: '#111827', 
		marginBottom: 4,
	},
	placeholderText: { 
		fontSize: 14, 
		color: '#6b7280', 
		fontStyle: 'italic',
	},
	actionButtonsRow: { 
		flexDirection: 'row', 
		gap: 10, 
		marginTop: 12,
	},
	clearButton: { 
		backgroundColor: '#6b7280',
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 8,
		flex: 1,
		alignItems: 'center',
	},
	clearButtonText: { 
		color: '#fff', 
		fontWeight: '600',
	},
	searchButton: { 
		backgroundColor: '#2563eb', 
		paddingVertical: 12, 
		borderRadius: 8, 
		alignItems: 'center',
		flex: 2,
	},
	searchButtonText: { 
		color: '#fff', 
		fontWeight: '700',
	},

	// Modal styles
	modalContainer: { 
		flex: 1, 
		backgroundColor: '#fff',
	},
	modalHeader: { 
		flexDirection: 'row', 
		justifyContent: 'space-between', 
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: '#f8f9fa',
		borderBottomWidth: 1,
		borderBottomColor: '#e9ecef',
	},
	modalTitle: { 
		fontSize: 18, 
		fontWeight: '700', 
		color: '#111827',
	},
	modalCancelText: { 
		fontSize: 16, 
		color: '#2563eb', 
		fontWeight: '600',
	},
	modalPlaceholder: { 
		width: 60,
	},

	// Existing styles
	actionsBar: { paddingHorizontal: 12, paddingBottom: 8 },
	button: { backgroundColor: '#2563eb', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
	buttonDisabled: { opacity: 0.6 },
	buttonText: { color: '#fff', fontWeight: '700' },
	mapContainer: { height: 220, margin: 12, borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff' },
	map: { width: '100%', height: '100%' },
	mapHint: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 8, backgroundColor: 'rgba(0,0,0,0.4)' },
	mapHintText: { color: '#fff', textAlign: 'center' },
	resultsHeader: { paddingHorizontal: 12, paddingTop: 4 },
	resultsTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
	emptyText: { paddingHorizontal: 12, paddingVertical: 8, color: '#6b7280' },
	tripItem: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginTop: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
	topTripItem: { borderWidth: 2, borderColor: '#2563eb' },
	tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
	tripRankBadge: { backgroundColor: '#2563eb', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
	tripRankText: { color: '#fff', fontSize: 12, fontWeight: '700' },
	tripTitle: { fontWeight: '700', color: '#111827' },
	price: { fontWeight: '800', color: '#2563eb', fontSize: 18 },
	addr: { color: '#111827', marginBottom: 4, fontSize: 14 },
	metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
	meta: { fontSize: 12, color: '#6b7280' },
	notes: { fontSize: 12, color: '#6b7280', fontStyle: 'italic', marginBottom: 8 },
	tripActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
	viewDetailsButton: { flex: 1, backgroundColor: '#f3f4f6', paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
	viewDetailsText: { color: '#374151', fontWeight: '600', fontSize: 14 },
	bookButton: { flex: 1, backgroundColor: '#2563eb', paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
	bookButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
	instructionsContainer: { 
		margin: 12, 
		padding: 20, 
		backgroundColor: '#fff', 
		borderRadius: 12, 
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	instructionsTitle: { 
		fontSize: 20, 
		fontWeight: '700', 
		color: '#111827', 
		marginBottom: 12,
		textAlign: 'center',
	},
	instructionsText: { 
		fontSize: 16, 
		color: '#4b5563', 
		lineHeight: 24,
		marginBottom: 16,
	},
	tipText: { 
		fontSize: 14, 
		color: '#6366f1', 
		fontStyle: 'italic',
		textAlign: 'center',
		backgroundColor: '#eef2ff',
		padding: 12,
		borderRadius: 8,
	},
});
