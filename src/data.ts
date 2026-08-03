import { type DataFrame } from '@grafana/data';

import { type TrackMapCoord, type TrackMapOptions } from './types';

function fieldValues(frame: DataFrame, index: number): Array<number | string | null> {
  const field = frame.fields[index];
  if (!field) {
    return [];
  }
  const values = field.values;
  return (values as unknown as { toArray?: () => Array<number | string | null> }).toArray
    ? (values as { toArray: () => Array<number | string | null> }).toArray()
    : Array.from(values as ArrayLike<number | string | null>);
}

function indexOfField(frame: DataFrame, name: string, fallback: number): number {
  if (name) {
    const idx = frame.fields.findIndex((f) => f.name === name);
    if (idx >= 0) {
      return idx;
    }
  }
  return fallback;
}

function detectLatLon(frame: DataFrame): { lat: number; lon: number } {
  let lat = 1;
  let lon = 2;
  frame.fields.forEach((f, i) => {
    const n = (f.name || '').toLowerCase();
    if (!n) {
      return;
    }
    if (n === 'lng' || n.includes('lon')) {
      if (lon === 2 || i !== lon) {
        lon = i;
      }
    } else if (n === 'lat' || n.includes('lat')) {
      if (lat === 1 || i !== lat) {
        lat = i;
      }
    }
  });
  return { lat, lon };
}

function isTableFrame(data: DataFrame[], options: TrackMapOptions): boolean {
  if (!data.length) {
    return false;
  }
  if (options.useTableFormat) {
    return true;
  }
  const names = data[0].fields.map((f) => (f.name || '').toLowerCase());
  const hasLat = options.latitudeField
    ? names.includes(options.latitudeField.toLowerCase())
    : names.some((n) => n.includes('lat'));
  const hasLon = options.longitudeField
    ? names.includes(options.longitudeField.toLowerCase())
    : names.some((n) => n === 'lng' || n.includes('lon') || n.includes('lng'));
  return hasLat && hasLon;
}

function extractFromTable(data: DataFrame[], options: TrackMapOptions): TrackMapCoord[] {
  const frame = data[0];
  if (!frame) {
    return [];
  }

  const iTime = indexOfField(frame, options.timeField, 0);
  const { lat: iLat, lon: iLon } = detectLatLon(frame);
  const iType = indexOfField(frame, options.typeField, 3);
  const iText = indexOfField(frame, options.textField, 4);
  const iAp = indexOfField(frame, options.apField, 5);

  const times = fieldValues(frame, iTime);
  const lats = fieldValues(frame, iLat);
  const lons = fieldValues(frame, iLon);
  const types = iType < frame.fields.length ? fieldValues(frame, iType) : [];
  const texts = iText < frame.fields.length ? fieldValues(frame, iText) : [];
  const aps = iAp < frame.fields.length ? fieldValues(frame, iAp) : [];

  const coords: TrackMapCoord[] = [];
  const count = Math.min(times.length, lats.length, lons.length);
  for (let i = 0; i < count; i++) {
    const lat = Number(lats[i]);
    const lon = Number(lons[i]);
    if (lat == null || lon == null || lat === 0 || lon === 0 || Number.isNaN(lat) || Number.isNaN(lon)) {
      continue;
    }
    const typeVal = types.length ? Number(types[i]) : null;
    coords.push({
      position: [lat, lon],
      timestamp: Number(times[i]) || 0,
      type: typeVal && typeVal > 0 ? typeVal : null,
      text: texts.length ? (texts[i] == null ? null : String(texts[i])) : null,
      ap: aps.length ? Number(aps[i]) : 0,
    });
  }
  return coords;
}

function extractFromSeries(data: DataFrame[], options: TrackMapOptions): TrackMapCoord[] {
  if (data.length < 2) {
    return [];
  }

  // The order returned by the query is expected to be latitude, then longitude.
  const latFrame = data[0];
  const lonFrame = data[1];
  const typeFrame = data.length > 2 ? data[2] : undefined;

  // Use the first numeric field of each frame.
  const latField = latFrame.fields.find((f) => f.type === 'number') || latFrame.fields[0];
  const lonField = lonFrame.fields.find((f) => f.type === 'number') || lonFrame.fields[0];
  const typeField = typeFrame ? typeFrame.fields.find((f) => f.type === 'number') : undefined;

  if (!latField || !lonField) {
    return [];
  }

  const latIdx = latFrame.fields.indexOf(latField);
  const lonIdx = lonFrame.fields.indexOf(lonField);
  const timeIdx = latFrame.fields.findIndex((f) => f.type === 'time');

  const lats = fieldValues(latFrame, latIdx);
  const lons = fieldValues(lonFrame, lonIdx);
  const times = timeIdx >= 0 ? fieldValues(latFrame, timeIdx) : [];
  const types = typeField && typeFrame ? fieldValues(typeFrame, typeFrame.fields.indexOf(typeField)) : [];

  const coords: TrackMapCoord[] = [];
  const count = Math.min(lats.length, lons.length);
  for (let i = 0; i < count; i++) {
    const lat = Number(lats[i]);
    const lon = Number(lons[i]);
    const lonT = Number(times.length ? times[i] : lons[i]);
    if (lat == null || lon == null || (lat === 0 && lon === 0) || Number.isNaN(lat) || Number.isNaN(lon)) {
      continue;
    }
    const typeVal = types.length ? Number(types[i]) : 0;
    coords.push({
      position: [lat, lon],
      timestamp: times.length ? Number(times[i]) : lonT,
      type: typeVal > 0 ? typeVal : null,
      text: typeFrame && types.length ? '' : null,
      ap: 0,
    });
  }
  return coords;
}

/**
 * Convert Grafana frames into the internal coordinate list used by the map.
 */
export function extractCoords(data: DataFrame[], options: TrackMapOptions, _limit: number): TrackMapCoord[] {
  try {
    return isTableFrame(data, options) ? extractFromTable(data, options) : extractFromSeries(data, options);
  } catch (err) {
    console.error('Failed to parse TrackMap data', err);
    return [];
  }
}
