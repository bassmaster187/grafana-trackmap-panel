import * as React from 'react';
import * as L from 'leaflet';
import { DataFrame, Field } from '@grafana/data';
import { TrackMapProps, TrackMapPoint, defaultLayers } from '../types';
import { getAntimeridianMidpoints } from '../utils';
import 'leaflet/dist/leaflet.css';
import '../styles.css';

interface TrackMapState {
  options: TrackMapProps['options'];
}

export class TrackMapPanel extends React.Component<TrackMapProps, TrackMapState> {
  containerRef: HTMLDivElement | null = null;
  map: L.Map | null = null;
  polylines: L.Polyline[] = [];
  hoverLine: L.Polyline | null = null;
  hoverMarker: L.CircleMarker | null = null;
  coords: TrackMapPoint[] = [];
  slices: number[] = [];
  hoverTarget: number | null = null;
  layers: Record<string, L.TileLayer> = {};
  layerControl: L.Control.Layers | null = null;
  forcedOverlay: L.TileLayer | null = null;

  constructor(props: TrackMapProps) {
    super(props);
    this.state = { options: props.options };
  }

  getOptions() {
    return this.props.options;
  }

  createTileLayer = (layerDef: (typeof defaultLayers)[string]) => {
    const tileOptions: L.TileLayerOptions = {
      attribution: layerDef.attribution,
      maxZoom: layerDef.maxZoom,
    };
    if (layerDef.options?.subdomains) {
      tileOptions.subdomains = layerDef.options.subdomains;
    }
    if (layerDef.options?.tms) {
      tileOptions.tms = true;
    }
    return L.tileLayer(layerDef.url, tileOptions);
  };

  setupLayers = (map: L.Map) => {
    const baseLayers: Record<string, L.TileLayer> = {};
    for (const [key, layerDef] of Object.entries(defaultLayers)) {
      baseLayers[key] = this.createTileLayer(layerDef);
    }
    this.layers = baseLayers;

    if (this.layerControl) {
      map.removeControl(this.layerControl);
    }

    this.layerControl = L.control.layers(baseLayers);
    if (this.getOptions().showLayerChanger) {
      map.addControl(this.layerControl);
    }

    if (baseLayers[this.getOptions().defaultLayer]) {
      baseLayers[this.getOptions().defaultLayer].addTo(map);
    }
  };

  clearPolylines = () => {
    this.polylines.forEach((p) => p.remove());
    this.polylines = [];
    if (this.hoverLine) {
      this.hoverLine.remove();
      this.hoverLine = null;
    }
  };

  clearHoverMarker = () => {
    if (this.hoverMarker) {
      this.hoverMarker.remove();
      this.hoverMarker = null;
    }
    this.hoverTarget = null;
  };

  handleBaseLayerChange = (e: any) => {
    const layer = e.layer as L.TileLayer;
    if (this.forcedOverlay) {
      this.forcedOverlay.remove();
      this.forcedOverlay = null;
    }

    const layerName = Object.keys(this.layers).find(
      (k) => this.layers[k] === layer
    );
    const layerDef = layerName ? defaultLayers[layerName] : null;

    if (layerDef?.options?.forcedOverlay) {
      const overlay = L.tileLayer(layerDef.options.forcedOverlay.url, {
        attribution: layerDef.options.forcedOverlay.attribution,
        subdomains: 'abcd',
        maxZoom: 20,
        zIndex: (layer.options.zIndex ?? 1) + 1,
      });
      overlay.addTo(e.target as L.Map);
      this.forcedOverlay = overlay;
    }
  };

  handleBoxZoomEnd = (e: any) => {
    const boxZoomBounds = e.boxZoomBounds;
    if (!boxZoomBounds) return;

    const bounds = this.coords.reduce(
      (t, c) => {
        if (boxZoomBounds.contains(L.latLng(c.lat, c.lon))) {
          t.from = Math.min(t.from, c.timestamp);
          t.to = Math.max(t.to, c.timestamp);
        }
        return t;
      },
      { from: Infinity, to: -Infinity }
    );

    if (isFinite(bounds.from) && isFinite(bounds.to)) {
      const evt = new CustomEvent('grafana-time-range-change', {
        detail: {
          from: new Date(bounds.from).toISOString(),
          to: new Date(bounds.to).toISOString(),
        },
      });
      document.dispatchEvent(evt);
    }
  };

  drawPolylines = () => {
    const map = this.map;
    if (!map) return;

    const opts = this.getOptions();
    const coords = this.coords;
    const slices = this.slices;

    for (let i = 0; i < slices.length - 1; i++) {
      const slice = coords.slice(slices[i], slices[i + 1]);
      const latLngs = slice.map((c) => L.latLng(c.lat, c.lon));

      const polyline = L.polyline(latLngs, {
        color: opts.lineColor,
        weight: 3,
      }).addTo(map);

      this.polylines.push(polyline);
    }

    const allLatLngs = this.coords.map((c) => L.latLng(c.lat, c.lon));
    this.hoverLine = L.polyline(allLatLngs, {
      color: 'transparent',
      weight: 40,
      interactive: true,
      bubblingMouseEvents: false,
    }).addTo(map);

    this.hoverLine.on('mousemove', (e: L.LeafletMouseEvent) => {
      const mousePoint = e.containerPoint;
      const closest = this.findClosestByMouse(mousePoint);
      if (closest) {
        this.processHover(Math.floor(closest.timestamp));
      }
    });

    this.hoverLine.on('mouseout', () => {
      this.clearHoverMarker();
    });

    if (opts.autoZoom && this.polylines.length > 0) {
      const bounds = this.polylines[0].getBounds();
      this.polylines.forEach((p) => bounds.extend(p.getBounds()));

      if (bounds.isValid()) {
        map.fitBounds(bounds);
      } else {
        map.setView([0, 0], 1);
      }
    }
  };

  processCoordinates = (frames: DataFrame[]) => {
    this.clearPolylines();
    this.clearHoverMarker();
    this.coords = [];
    this.slices = [0];

    if (frames.length === 0) {
      if (this.map) this.map.setView([0, 0], 1);
      return;
    }

    let latField: Field | undefined;
    let lonField: Field | undefined;
    let timeField: Field | undefined;

    if (frames.length === 2) {
      latField = frames[0].fields[0];
      lonField = frames[1].fields[0];
    } else if (frames.length === 1) {
      const f = frames[0];
      const latIdx = f.fields.findIndex(fd => fd.name === 'lat');
      const lngIdx = f.fields.findIndex(fd => fd.name === 'lng' || fd.name === 'lon');
      if (latIdx >= 0 && lngIdx >= 0) {
        latField = f.fields[latIdx];
        lonField = f.fields[lngIdx];
        const timeIdx = f.fields.findIndex(fd => fd.type === 'time' || fd.name === 'time_sec');
        if (timeIdx >= 0) timeField = f.fields[timeIdx];
      }
    }

    if (!latField || !lonField) {
      if (this.map) this.map.setView([0, 0], 1);
      return;
    }

    const lats = Array.from(latField.values);
    const lons = Array.from(lonField.values);
    const times = timeField ? Array.from(timeField.values) : null;

    for (let i = 0; i < lats.length; i++) {
      const lat = Number(lats[i]);
      const lon = Number(lons[i]);
      if (isNaN(lat) || isNaN(lon)) continue;
      if (lat === 0 && lon === 0) continue;

      const pos: L.LatLngTuple = [lat, lon];
      const timestamp = times ? Number(times[i]) : i;

      if (this.coords.length > 0) {
        const lastPoint = this.coords[this.coords.length - 1];
        const lastPos: L.LatLngTuple = [lastPoint.lat, lastPoint.lon];
        const midpoints = getAntimeridianMidpoints(lastPos, pos);

        if (midpoints) {
          const lastTime = lastPoint.timestamp;
          const midTime = Number(lastTime) + (Number(timestamp) - Number(lastTime)) / 2;
          const firstEnd = midpoints.firstEnd as L.LatLngTuple;
          const secondStart = midpoints.secondStart as L.LatLngTuple;
          this.coords.push({
            lat: firstEnd[0],
            lon: firstEnd[1],
            timestamp: midTime,
          });
          this.slices.push(this.coords.length);
          this.coords.push({
            lat: secondStart[0],
            lon: secondStart[1],
            timestamp: midTime,
          });
        }
      }

      this.coords.push({ lat, lon, timestamp });
    }

    this.slices.push(this.coords.length);
    this.drawPolylines();
  };

  handleHover = (evt: CustomEvent) => {
    if (this.coords.length === 0 || !this.map) return;

    const detail = evt.detail;
    const point = detail?.point;
    if (point == null) return;

    const targetMs = point.time;
    const targetSec = Math.floor(targetMs / 1000);

    this.processHover(targetSec);
  };

  processHover = (targetMs: number) => {
    if (this.coords.length === 0 || !this.map) return;

    const target = targetMs;

    if (this.hoverTarget === target) return;
    this.hoverTarget = target;

    if (!this.hoverMarker) {
      this.hoverMarker = L.circleMarker(L.latLng(0, 0), {
        color: 'white',
        fillColor: this.getOptions().pointColor,
        fillOpacity: 1,
        weight: 2,
        radius: 7,
      }).addTo(this.map);
    }

    let min = 0;
    let max = this.coords.length - 1;
    let idx = 0;

    while (min <= max) {
      idx = Math.floor((max + min) / 2);
      if (this.coords[idx].timestamp === target) {
        break;
      } else if (this.coords[idx].timestamp < target) {
        min = idx + 1;
      } else {
        max = idx - 1;
      }
    }

    if (this.coords[idx].timestamp > target && idx > 0) {
      idx--;
    }

    this.hoverMarker!.setLatLng(
      L.latLng(this.coords[idx].lat, this.coords[idx].lon)
    );
  };

  handleHoverClear = () => {
    this.clearHoverMarker();
  };

  findClosestByMouse = (mousePoint: L.Point) => {
    const map = this.map;
    if (!map) return null;

    let bestIdx = 0;
    let bestDist = Infinity;

    for (let i = 0; i < this.coords.length; i++) {
      const c = this.coords[i];
      const screenPoint = map.latLngToContainerPoint(L.latLng(c.lat, c.lon));
      const dist = screenPoint.distanceTo(mousePoint);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }

    return this.coords[bestIdx];
  };

  componentDidMount() {
    console.log('TrackMap componentDidMount, series:', this.props.data.series?.length);
    if (!this.containerRef) return;

    const opts = this.getOptions();
    const map = L.map(this.containerRef, {
      center: [0, 0],
      zoom: 1,
      scrollWheelZoom: opts.scrollWheelZoom,
      zoomSnap: 0.5,
      zoomDelta: 1,
    });

    this.map = map;
    this.setupLayers(map);

    this.hoverMarker = L.circleMarker(L.latLng(0, 0), {
      color: 'white',
      fillColor: opts.pointColor,
      fillOpacity: 1,
      weight: 2,
      radius: 7,
    });

    map.on('baselayerchange', this.handleBaseLayerChange);
    map.on('boxzoomend', this.handleBoxZoomEnd);

    if (this.props.data.series.length > 0) {
      this.processCoordinates(this.props.data.series);
    }
  }

  componentDidUpdate(prevProps: TrackMapProps) {
    const opts = this.getOptions();

    if (!this.map) return;

    if (prevProps.options.scrollWheelZoom !== opts.scrollWheelZoom) {
      if (opts.scrollWheelZoom) {
        this.map.scrollWheelZoom.enable();
      } else {
        this.map.scrollWheelZoom.disable();
      }
    }

    if (
      prevProps.options.defaultLayer !== opts.defaultLayer ||
      prevProps.options.showLayerChanger !== opts.showLayerChanger
    ) {
      this.map.eachLayer((layer) => {
        if (layer instanceof L.TileLayer || layer instanceof L.GridLayer) {
          layer.remove();
        }
      });
      this.polylines.forEach((p) => p.remove());
      this.polylines = [];

      if (this.forcedOverlay) {
        this.forcedOverlay.remove();
        this.forcedOverlay = null;
      }

      this.setupLayers(this.map);
      this.drawPolylines();
    }

    if (
      prevProps.options.lineColor !== opts.lineColor ||
      prevProps.options.pointColor !== opts.pointColor
    ) {
      this.polylines.forEach((p) => {
        p.setStyle({ color: opts.lineColor });
      });
      if (this.hoverMarker) {
        this.hoverMarker.setStyle({
          fillColor: opts.pointColor,
        });
      }
    }

    if (prevProps.data.series !== this.props.data.series) {
      if (this.props.data.series.length > 0) {
        this.processCoordinates(this.props.data.series);
      }
    }

    if (prevProps.width !== this.props.width || prevProps.height !== this.props.height) {
      if (this.props.width && this.props.height) {
        setTimeout(() => {
          if (this.map) {
            this.map.invalidateSize(true);
          }
        }, 300);
      }
    }
  }

  componentWillUnmount() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  render() {
    return (
      <div className="trackmap-panel">
        <div
          className="trackmap-inner"
          ref={(el) => { this.containerRef = el; }}
        />
      </div>
    );
  }
}
