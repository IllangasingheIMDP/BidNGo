






import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Platform } from 'react-native';
import * as Location from 'expo-location';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { LeafletView, MapMarker, WebviewLeafletMessage } from 'react-native-leaflet-view';
import { Colors } from '@/constants/Colors';
import { Spacing, Typography } from '@/constants/Spacing';
import { Location as AppLocation } from '@/types';
import { MapPin, X, Crosshair, Search } from 'lucide-react-native';

// Location picker modal using Leaflet inside WebView.

interface SingleSelectProps {
	mode?: 'single';
	onLocationSelect: (loc: AppLocation) => void;
	initialLocation?: AppLocation;
}

interface RouteSelectProps {
	mode: 'route';
	onRouteSelect: (origin: AppLocation, destination: AppLocation) => void;
	initialOrigin?: AppLocation;
	initialDestination?: AppLocation;
}

type Props = (SingleSelectProps | RouteSelectProps) & { onClose: () => void };

// Simple Nominatim (OpenStreetMap) search endpoint (no key) - usage throttled.
async function searchPlaces(query: string): Promise<AppLocation[]> {
	if (!query) return [];
	try {
		const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=8`;
		const res = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'BidNGo/1.0 (contact: example@example.com)' } });
		const data = await res.json();
		return data.map((d: any) => ({
			lat: parseFloat(d.lat),
			lng: parseFloat(d.lon),
			address: d.display_name,
			city: d.address?.city || d.address?.town || d.address?.village || undefined,
		}));
	} catch (e) {
		console.warn('Search failed', e);
		return [];
	}
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
	try {
		const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
		const res = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'BidNGo/1.0 (contact: example@example.com)' } });
		const data = await res.json();
		return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
	} catch {
		return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
	}
}

export const LocationPicker: React.FC<Props> = (props) => {
	const { onClose } = props;
	const isRoute = props.mode === 'route';
	const initialLocation = !isRoute ? props.initialLocation : undefined;
	// Sri Lanka default center if nothing else
	const SRI_LANKA_CENTER = { lat: 7.8731, lng: 80.7718 };
	const [htmlContent, setHtmlContent] = useState<string | null>(null);
	const [search, setSearch] = useState('');
	const [results, setResults] = useState<AppLocation[]>([]);
	const [searching, setSearching] = useState(false);
	const [center, setCenter] = useState<{ lat: number; lng: number } | null>(
    initialLocation ? { lat: initialLocation.lat, lng: initialLocation.lng } : (isRoute && props.initialOrigin ? { lat: props.initialOrigin.lat, lng: props.initialOrigin.lng } : SRI_LANKA_CENTER)
  );
	const [selected, setSelected] = useState<AppLocation | null>(initialLocation || null); // single mode only
	const [origin, setOrigin] = useState<AppLocation | null>(isRoute ? (props.initialOrigin || null) : null);
	const [destination, setDestination] = useState<AppLocation | null>(isRoute ? (props.initialDestination || null) : null);
	const [activePoint, setActivePoint] = useState<'origin' | 'destination'>(isRoute ? 'origin' : 'origin');
	const [manualLat, setManualLat] = useState('');
	const [manualLng, setManualLng] = useState('');
		const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Load leaflet asset html required by react-native-leaflet-view in Expo
	useEffect(() => {
		let mounted = true;
		const load = async () => {
			try {
				// Local leaflet HTML asset
				const path = require('../assets/leaflet/leaflet.html');
				const asset = Asset.fromModule(path);
				await asset.downloadAsync();
				const html = await FileSystem.readAsStringAsync(asset.localUri!);
				if (mounted) setHtmlContent(html);
			} catch (e) {
				console.warn('Failed loading leaflet html', e);
			}
		};
		load();
		return () => { mounted = false; };
	}, []);

	// Acquire current location if no initial (single mode only)
	useEffect(() => {
		(async () => {
			if (initialLocation || isRoute) return;
			const { status } = await Location.requestForegroundPermissionsAsync();
			if (status !== 'granted') return;
			const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
			const address = await reverseGeocode(loc.coords.latitude, loc.coords.longitude);
			setCenter({ lat: loc.coords.latitude, lng: loc.coords.longitude });
			setSelected({ lat: loc.coords.latitude, lng: loc.coords.longitude, address });
		})();
	}, [initialLocation, isRoute]);

	// Debounced search
	useEffect(() => {
		if (searchTimeout.current) clearTimeout(searchTimeout.current);
		if (!search) { setResults([]); return; }
		searchTimeout.current = setTimeout(async () => {
			setSearching(true);
			const r = await searchPlaces(search);
			setResults(r);
			setSearching(false);
		}, 400);
		return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
	}, [search]);

	const markers: MapMarker[] = isRoute
	? [origin && { id: 'origin', position: { lat: origin.lat, lng: origin.lng }, icon: '🟢', size: [32, 32] }, destination && { id: 'dest', position: { lat: destination.lat, lng: destination.lng }, icon: '🔴', size: [32, 32] }].filter(Boolean) as MapMarker[]
	: selected ? [{ id: 'sel', position: { lat: selected.lat, lng: selected.lng }, icon: '📍', size: [32, 32] }] : [];

	const handleMessage = useCallback(async (msg: WebviewLeafletMessage) => {
		if (msg.event === 'onMapClicked' && msg.payload?.coords) {
			const { lat, lng } = msg.payload.coords;
			const address = await reverseGeocode(lat, lng);
			if (isRoute) {
				if (activePoint === 'origin') {
					setOrigin({ lat, lng, address });
					setActivePoint('destination');
				} else {
					setDestination({ lat, lng, address });
				}
			} else {
				setSelected({ lat, lng, address });
			}
			setCenter({ lat, lng });
		}
	}, [isRoute, activePoint]);

	const confirm = () => {
		if (isRoute) {
			if (origin && destination && props.mode === 'route') {
				props.onRouteSelect(origin, destination);
			}
		} else if (!isRoute && selected && 'onLocationSelect' in props) {
			props.onLocationSelect(selected as AppLocation);
		}
	};

	// Manual coordinate add (for whichever active point or single)
	const applyManual = async () => {
		const lat = parseFloat(manualLat);
		const lng = parseFloat(manualLng);
		if (isNaN(lat) || isNaN(lng)) return;
		const address = await reverseGeocode(lat, lng);
		if (isRoute) {
			if (activePoint === 'origin') { setOrigin({ lat, lng, address }); }
			else { setDestination({ lat, lng, address }); }
		} else { setSelected({ lat, lng, address }); }
		setCenter({ lat, lng });
		setManualLat(''); setManualLng('');
	};

	return (
		<Modal animationType="slide" transparent={false}>
			<View style={styles.container}>
				<View style={styles.header}>
					<Text style={styles.title}>Select Location</Text>
					<TouchableOpacity onPress={onClose} style={styles.closeBtn}>
						<X size={22} color={Colors.neutral[700]} />
					</TouchableOpacity>
				</View>
				<View style={styles.searchRow}>
					<Search size={18} color={Colors.neutral[500]} />
					<TextInput
						style={styles.searchInput}
						placeholder="Search place or address"
						value={search}
						onChangeText={setSearch}
						autoCorrect={false}
						autoCapitalize='none'
					/>
					<TouchableOpacity
						style={styles.currentBtn}
						onPress={async () => {
							const { status } = await Location.requestForegroundPermissionsAsync();
							if (status !== 'granted') return;
							const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
							const address = await reverseGeocode(loc.coords.latitude, loc.coords.longitude);
									if (isRoute) {
										if (activePoint === 'origin') setOrigin({ lat: loc.coords.latitude, lng: loc.coords.longitude, address });
										else setDestination({ lat: loc.coords.latitude, lng: loc.coords.longitude, address });
									} else {
										setSelected({ lat: loc.coords.latitude, lng: loc.coords.longitude, address });
									}
							setCenter({ lat: loc.coords.latitude, lng: loc.coords.longitude });
						}}
					>
						<Crosshair size={18} color={Colors.primary[600]} />
					</TouchableOpacity>
				</View>
					{isRoute && (
						<View style={styles.routeToggleRow}>
							<TouchableOpacity style={[styles.pointToggle, activePoint==='origin' && styles.pointActive]} onPress={()=>setActivePoint('origin')}>
								<Text style={[styles.pointToggleText, activePoint==='origin' && styles.pointToggleTextActive]}>Origin {origin? '✓':''}</Text>
							</TouchableOpacity>
							<TouchableOpacity style={[styles.pointToggle, activePoint==='destination' && styles.pointActive]} onPress={()=>setActivePoint('destination')}>
								<Text style={[styles.pointToggleText, activePoint==='destination' && styles.pointToggleTextActive]}>Destination {destination? '✓':''}</Text>
							</TouchableOpacity>
						</View>
					)}
					<View style={styles.manualRow}>
						<TextInput style={styles.manualInput} placeholder="Lat" value={manualLat} onChangeText={setManualLat} keyboardType="decimal-pad" />
						<TextInput style={styles.manualInput} placeholder="Lng" value={manualLng} onChangeText={setManualLng} keyboardType="decimal-pad" />
						<TouchableOpacity style={styles.manualApplyBtn} onPress={applyManual}>
							<Text style={styles.manualApplyText}>Set</Text>
						</TouchableOpacity>
					</View>
				{search.length > 0 && (
					<View style={styles.results}>
						{searching && <ActivityIndicator size="small" color={Colors.primary[600]} />}
						<FlatList
							data={results}
							keyExtractor={(_, i) => i.toString()}
							keyboardShouldPersistTaps='handled'
							renderItem={({ item }) => (
								<TouchableOpacity
									style={styles.resultItem}
									onPress={() => {
										setSelected(item);
										setCenter({ lat: item.lat, lng: item.lng });
										setSearch(item.address.split(',')[0]);
										setResults([]); // collapse list
									}}
								>
									<MapPin size={16} color={Colors.primary[600]} />
									<Text style={styles.resultText} numberOfLines={1}>{item.address}</Text>
								</TouchableOpacity>
							)}
						/>
					</View>
				)}
				<View style={styles.mapWrapper}>
					{!htmlContent || !center ? (
						<View style={styles.loadingMap}> 
							<ActivityIndicator size='large' color={Colors.primary[600]} />
							<Text style={styles.loadingText}>Loading map...</Text>
						</View>
					) : (
						<LeafletView
							source={{ html: htmlContent }}
							mapCenterPosition={center}
							mapMarkers={markers}
							onMessageReceived={handleMessage}
							zoom={13}
							doDebug={false}
							zoomControl
						/>
					)}
				</View>
				<View style={styles.footer}>
					{isRoute ? (
						<View style={{ gap: 8 }}>
							<View style={styles.selectedBox}>
								<MapPin size={18} color={Colors.primary[600]} />
								<Text style={styles.selectedText} numberOfLines={2}>
									{origin ? `Origin: ${origin.address}` : 'Select origin (tap map)' }
								</Text>
							</View>
							<View style={styles.selectedBox}>
								<MapPin size={18} color={Colors.error[600]} />
								<Text style={styles.selectedText} numberOfLines={2}>
									{destination ? `Destination: ${destination.address}` : 'Select destination' }
								</Text>
							</View>
							<TouchableOpacity
								style={[styles.confirmBtn, !(origin && destination) && { opacity: 0.5 }]}
								disabled={!(origin && destination)}
								onPress={confirm}
							>
								<Text style={styles.confirmText}>Use these locations</Text>
							</TouchableOpacity>
						</View>
					) : (
						<>
							<View style={styles.selectedBox}>
								<MapPin size={18} color={Colors.primary[600]} />
								<Text style={styles.selectedText} numberOfLines={2}>
									{selected ? selected.address : 'Tap map or search to pick location'}
								</Text>
							</View>
							<TouchableOpacity
								style={[styles.confirmBtn, !selected && { opacity: 0.5 }]}
								disabled={!selected}
								onPress={confirm}
							>
								<Text style={styles.confirmText}>Use this location</Text>
							</TouchableOpacity>
						</>
					)}
				</View>
			</View>
		</Modal>
	);
};

// Export default alias if someone imports default
export default LocationPicker;

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: Colors.white },
	header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: Spacing.xxxl, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.neutral[200] },
	title: { fontSize: Typography.sizes.lg, fontFamily: 'Inter-Bold', color: Colors.neutral[900] },
	closeBtn: { position: 'absolute', right: Spacing.lg, top: Spacing.xxxl },
	searchRow: { flexDirection: 'row', alignItems: 'center', margin: Spacing.lg, backgroundColor: Colors.neutral[50], borderRadius: 12, paddingHorizontal: Spacing.md, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.neutral[200] },
	searchInput: { flex: 1, height: 44, fontFamily: 'Inter-Regular', fontSize: Typography.sizes.base },
	currentBtn: { padding: Spacing.xs },
	results: { maxHeight: 200, marginHorizontal: Spacing.lg, backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: Colors.neutral[200], overflow: 'hidden' },
	resultItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.neutral[100] },
	resultText: { flex: 1, fontSize: Typography.sizes.sm, fontFamily: 'Inter-Regular', color: Colors.neutral[800] },
	mapWrapper: { flex: 1, marginHorizontal: Spacing.lg, marginTop: Spacing.md, marginBottom: Spacing.md, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: Colors.neutral[200] },
	loadingMap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
	loadingText: { fontFamily: 'Inter-Regular', color: Colors.neutral[500] },
	footer: { padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.neutral[200], gap: Spacing.md },
	selectedBox: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
	selectedText: { flex: 1, fontSize: Typography.sizes.sm, fontFamily: 'Inter-Regular', color: Colors.neutral[700] },
	confirmBtn: { backgroundColor: Colors.primary[600], paddingVertical: Spacing.md, borderRadius: 12, alignItems: 'center' },
	confirmText: { color: Colors.white, fontFamily: 'Inter-Bold', fontSize: Typography.sizes.base },
	routeToggleRow: { flexDirection: 'row', marginHorizontal: Spacing.lg, gap: Spacing.sm, marginTop: -Spacing.sm },
	pointToggle: { flex:1, paddingVertical: Spacing.sm, borderRadius: 8, borderWidth:1, borderColor: Colors.neutral[300], alignItems:'center', backgroundColor: Colors.neutral[50] },
	pointActive: { backgroundColor: Colors.primary[50], borderColor: Colors.primary[400] },
	pointToggleText: { fontFamily: 'Inter-Medium', color: Colors.neutral[700], fontSize: Typography.sizes.sm },
	pointToggleTextActive: { color: Colors.primary[700] },
	manualRow: { flexDirection:'row', marginHorizontal: Spacing.lg, gap: Spacing.sm, marginTop: Spacing.sm },
	manualInput: { flex:1, height:40, borderWidth:1, borderColor: Colors.neutral[200], borderRadius:8, paddingHorizontal:8, fontFamily:'Inter-Regular' },
	manualApplyBtn: { backgroundColor: Colors.primary[600], borderRadius:8, paddingHorizontal:16, alignItems:'center', justifyContent:'center' },
	manualApplyText: { color: Colors.white, fontFamily:'Inter-Bold' },
});







