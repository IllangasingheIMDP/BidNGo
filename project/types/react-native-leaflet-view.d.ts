declare module 'react-native-leaflet-view' {
  import * as React from 'react';
  import { WebViewMessageEvent } from 'react-native-webview';

  export interface LatLng { lat: number; lng: number; }
  export interface MapMarker { id: string; position: LatLng; icon?: string; size?: [number, number]; }
  export interface WebviewLeafletMessage { event: string; payload?: any; }
  export interface LeafletViewProps {
    mapCenterPosition?: LatLng;
    mapMarkers?: MapMarker[];
    mapLayers?: any[];
    onMessageReceived: (msg: WebviewLeafletMessage) => void;
    zoom?: number;
    source?: any;
    doDebug?: boolean;
    zoomControl?: boolean;
  }
  export const LeafletView: React.FC<LeafletViewProps>;
}
