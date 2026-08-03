import React, { useEffect, useMemo, useRef } from 'react';
import {
  DataHoverClearEvent,
  DataHoverEvent,
  LegacyGraphHoverClearEvent,
  LegacyGraphHoverEvent,
  type BusEvent,
  type PanelProps,
  dateTime,
} from '@grafana/data';
import { getAppEvents, TimeRangeUpdatedEvent } from '@grafana/runtime';
import { usePanelContext } from '@grafana/ui';
import L from 'leaflet';

import { extractCoords } from '../data';
import { type TrackMapCoord, type TrackMapOptions } from '../types';

import 'leaflet/dist/leaflet.css';
import './TrackMapPanel.css';

const PLUGIN_ID = 'pr0ps-trackmap-panel';

const AP_MANUAL_COLOR = '#CF3828';
const AP_AUTOPILOT_COLOR = '#0070FF';

interface BaseLayers {
  [key: string]: L.TileLayer & { forcedOverlay?: L.TileLayer };
}

const PIN_URLS: Record<number, string> = {
  1: `public/plugins/${PLUGIN_ID}/img/tesla_pin.png`,
  2: `public/plugins/${PLUGIN_ID}/img/charger_pin.png`,
  3: `public/plugins/${PLUGIN_ID}/img/ac_pin.png`,
  4: `public/plugins/${PLUGIN_ID}/img/p_pin.png`,
};

type HoverCoord = { timestamp: number; position: [number, number] };

export function TrackMapPanel(props: PanelProps<TrackMapOptions>) {
  const { data, options, width, height } = props;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<BaseLayers>({});
  const layerChangerRef = useRef<L.Control.Layers | null>(null);
  const polylinesRef = useRef<L.Polyline[]>([]);
  const markersRef = useRef<L.Marker[]>([]);
  const hoverMarkerRef = useRef<L.CircleMarker | null>(null);
  const forcedOverlayRef = useRef<L.TileLayer | null>(null);
  const coordsRef = useRef<HoverCoord[]>([]);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Create the Leaflet map once.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) {
      return;
    }

    const map = L.map(el, {
      scrollWheelZoom: optionsRef.current.scrollWheelZoom,
      zoomSnap: 0.5,
      zoomDelta: 1,
    });
    mapRef.current = map;

    layersRef.current = {
      OpenStreetMap: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }),
      OpenTopoMap: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution:
          'Map data: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
        maxZoom: 17,
      }),
      Satellite: Object.assign(
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution:
            'Imagery &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
          maxZoom: 20,
        }),
        {
          forcedOverlay: L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}.png', {
            attribution:
              'Labels by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            subdomains: 'abcd',
            maxZoom: 20,
          }),
        }
      ),
    };

    layerChangerRef.current = L.control.layers(layersRef.current);

    hoverMarkerRef.current = L.circleMarker(L.latLng(0, 0), {
      color: 'white',
      fillColor: optionsRef.current.pointColor,
      fillOpacity: 1,
      weight: 2,
      radius: 7,
    });

    map.on('baselayerchange', (e: L.LayersControlEvent) => {
      if (forcedOverlayRef.current) {
        forcedOverlayRef.current.remove();
        forcedOverlayRef.current = null;
      }
      const overlay = (e.layer as BaseLayers[string]).forcedOverlay;
      if (overlay) {
        overlay.addTo(map);
        overlay.setZIndex(((e.layer as L.TileLayer).options.zIndex ?? 0) + 1);
        forcedOverlayRef.current = overlay;
      }
    });

    map.on('boxzoomend', (e: L.LeafletEvent) => {
      const boxZoomBounds = (e as unknown as { boxZoomBounds: L.LatLngBounds }).boxZoomBounds;
      const bounds = coordsRef.current.reduce(
        (acc: { from: number; to: number }, c) => {
          if (boxZoomBounds.contains(L.latLng(c.position[0], c.position[1]))) {
            acc.from = Math.min(acc.from, c.timestamp);
            acc.to = Math.max(acc.to, c.timestamp);
          }
          return acc;
        },
        { from: Infinity, to: -Infinity }
      );

      if (Number.isFinite(bounds.from) && Number.isFinite(bounds.to)) {
        getAppEvents().publish(
          new TimeRangeUpdatedEvent({
            from: dateTime(bounds.from),
            to: dateTime(bounds.to),
            raw: { from: dateTime(bounds.from), to: dateTime(bounds.to) },
          })
        );
      }
    });

    const legend = new L.Control({ position: 'bottomleft' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'leaflet-control-layers leaflet-control-layers-expanded trackmap-legend');
      div.innerHTML +=
        '<span style="background-color: #CF3828; height: 3px; width: 20px; border-radius: 10%; display: inline-block;"></span> Human driving<br>';
      div.innerHTML +=
        '<span style="background-color: #0070FF; height: 3px; width: 20px; border-radius: 10%; display: inline-block;"></span> Autopilot / TACC';
      return div;
    };
    legend.addTo(map);

    requestAnimationFrame(() => map.invalidateSize(true));

    return () => {
      map.remove();
      mapRef.current = null;
      polylinesRef.current = [];
      markersRef.current = [];
    };
  }, []);

  // Apply option-driven map settings (base layer, scroll zoom, layer changer).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const scrollEnabled = map.scrollWheelZoom.enabled();
    if (scrollEnabled !== options.scrollWheelZoom) {
      if (scrollEnabled) {
        map.scrollWheelZoom.disable();
      } else {
        map.scrollWheelZoom.enable();
      }
    }

    const base = layersRef.current[options.defaultLayer];
    if (base) {
      if (forcedOverlayRef.current) {
        forcedOverlayRef.current.remove();
        forcedOverlayRef.current = null;
      }
      map.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) {
          layer.remove();
        }
      });
      base.addTo(map);
    }

    if (layerChangerRef.current) {
      map.removeControl(layerChangerRef.current);
      if (options.showLayerChanger) {
        map.addControl(layerChangerRef.current);
      }
    }
  }, [options]);

  // Build the track data on the map whenever data or options change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !data) {
      return;
    }

    polylinesRef.current.forEach((p) => p.remove());
    polylinesRef.current = [];
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const coords = extractCoords(data.series, options, options.maxDataPoints);
    coordsRef.current = coords.map((c) => ({ timestamp: c.timestamp, position: c.position }));

    if (coords.length === 0) {
      map.setView([0, 0], 1);
      return;
    }

    const { polylines, markers } = buildTracks(coords, options);
    polylines.forEach((p) => p.addTo(map));
    markers.forEach((m) => m.addTo(map));
    polylinesRef.current = polylines;
    markersRef.current = markers;

    if (options.autoZoom) {
      zoomToFit(map, polylines);
    }
  }, [data, options]);

  // Subscribe to crosshair events from the shared dashboard event bus.
  const panelContext = usePanelContext();
  const eventBus = useMemo(() => panelContext.eventBus, [panelContext]);

  useEffect(() => {
    if (!eventBus) {
      return;
    }

    const handleHover = (evt: BusEvent) => {
      const map = mapRef.current;
      const marker = hoverMarkerRef.current;
      const coords = coordsRef.current;
      if (!map || !marker || coords.length === 0) {
        return;
      }
      // Modern (uPlot) graphs publish the hover time in payload.point.time;
      // legacy (flot) graphs publish it in pos.x. Prefer the point time.
      const payload = (evt as { payload?: { point?: { time?: number } } }).payload;
      let target = payload?.point?.time;
      if (target === undefined) {
        target = (evt as { pos?: { x?: number } }).pos?.x;
      }
      if (typeof target !== 'number') {
        return;
      }
      showHoverMarker(target);
    };

    const hoverSub = eventBus.subscribe(DataHoverEvent, handleHover);
    const legacyHoverSub = eventBus.subscribe(LegacyGraphHoverEvent, handleHover);
    const clearSub = eventBus.subscribe(DataHoverClearEvent, () => {
      hoverMarkerRef.current?.remove();
    });
    const legacyClearSub = eventBus.subscribe(LegacyGraphHoverClearEvent, () => {
      hoverMarkerRef.current?.remove();
    });

    return () => {
      hoverSub.unsubscribe();
      legacyHoverSub.unsubscribe();
      clearSub.unsubscribe();
      legacyClearSub.unsubscribe();
    };
  }, [eventBus]);

  const showHoverMarker = (target: number) => {
    const coords = coordsRef.current;
    const map = mapRef.current;
    const marker = hoverMarkerRef.current;
    if (!map || !marker || coords.length === 0) {
      return;
    }

    let min = 0;
    let max = coords.length - 1;
    let idx = Math.floor((max + min) / 2);
    let exact = false;
    while (min <= max) {
      idx = Math.floor((max + min) / 2);
      if (coords[idx].timestamp === target) {
        exact = true;
        break;
      } else if (coords[idx].timestamp < target) {
        min = idx + 1;
      } else {
        max = idx - 1;
      }
    }
    if (!exact && idx > 0 && coords[idx].timestamp > target) {
      idx--;
    }

    const latLng = L.latLng(coords[idx].position[0], coords[idx].position[1]);
    if (map.hasLayer(marker)) {
      marker.setLatLng(latLng);
    } else {
      marker.setLatLng(latLng).addTo(map);
    }
  };

  return <div ref={containerRef} className="trackmap-panel" style={{ width, height }} data-testid="trackmap-panel" />;
}

function buildTracks(coords: TrackMapCoord[], options: TrackMapOptions): { polylines: L.Polyline[]; markers: L.Marker[] } {
  const polylines: L.Polyline[] = [];
  const markers: L.Marker[] = [];

  if (coords.length === 0) {
    return { polylines, markers };
  }

  const segments: { position: [number, number][]; ap: number }[] = [{ position: [], ap: coords[0].ap }];
  let ap = coords[0].ap;

  coords.forEach((coord, index) => {
    if (ap !== coord.ap) {
      segments[segments.length - 1].position.push(coord.position);
      ap = coord.ap;
      segments.push({ position: [], ap });
    }

    if (coord.type && coord.type >= 1 && coord.type <= 4) {
      const icon = L.icon({ iconUrl: PIN_URLS[coord.type], iconAnchor: [6, 16], popupAnchor: [0, 0] });
      const marker = L.marker(coord.position, { icon });
      if (coord.text) {
        marker.bindPopup(coord.text);
      }
      markers.push(marker);
    }

    if (index !== 0 && options.maxDataPointDelta !== 0) {
      const prevTimestamp = coords[index - 1].timestamp;
      if (coord.timestamp - prevTimestamp > options.maxDataPointDelta * 1000) {
        segments.push({ position: [], ap });
      }
    }

    segments[segments.length - 1].position.push(coord.position);
  });

  segments.forEach((segment) => {
    if (segment.position.length < 2) {
      return;
    }
    const color = options.useApColors
      ? segment.ap === 1
        ? AP_AUTOPILOT_COLOR
        : AP_MANUAL_COLOR
      : options.lineColor;
    polylines.push(L.polyline(segment.position, { color, weight: 3 }));
  });

  return { polylines, markers };
}

function zoomToFit(map: L.Map, polylines: L.Polyline[]) {
  if (polylines.length === 0) {
    return;
  }
  let bounds = polylines[0].getBounds();
  for (let i = 1; i < polylines.length; i++) {
    bounds = bounds.extend(polylines[i].getBounds());
  }
  if (bounds.isValid()) {
    map.fitBounds(bounds);
  } else {
    map.setView([0, 0], 1);
  }
}
