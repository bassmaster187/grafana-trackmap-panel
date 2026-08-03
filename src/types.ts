import { PanelProps } from '@grafana/data';

export interface TrackMapPoint {
  lat: number;
  lon: number;
  timestamp: number;
}

export interface TrackMapSlice {
  start: number;
  end: number;
}

export interface TrackMapLayer {
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
  options?: {
    subdomains?: string[];
    tms?: boolean;
    forcedOverlay?: {
      url: string;
      attribution: string;
    };
  };
}

export const defaultLayers: Record<string, TrackMapLayer> = {
  OpenStreetMap: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  OpenTopoMap: {
    name: 'OpenTopoMap',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
    maxZoom: 17,
  },
  Satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Imagery &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18,
    options: {
      forcedOverlay: {
        url: 'https://stamen-tiles-{s}.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}.png',
        attribution: 'Labels by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      },
    },
  },
  'Eniro Seamap': {
    name: 'Eniro Seamap',
    url: 'https://{s}.eniro.com/geowebcache/service/tms1.0.0/nautical/{z}/{x}/{y}.png',
    attribution: '&copy; Kort & Matrikelstyrelsen',
    maxZoom: 17,
    options: {
      subdomains: ['map01', 'map02', 'map03', 'map04'],
      tms: true,
    },
  },
};

export interface TrackMapPanelOptions {
  autoZoom: boolean;
  scrollWheelZoom: boolean;
  defaultLayer: string;
  showLayerChanger: boolean;
  lineColor: string;
  pointColor: string;
}

export const defaultOptions: TrackMapPanelOptions = {
  autoZoom: true,
  scrollWheelZoom: false,
  defaultLayer: 'OpenStreetMap',
  showLayerChanger: true,
  lineColor: 'red',
  pointColor: 'royalblue',
};

export type TrackMapProps = PanelProps<TrackMapPanelOptions>;
