/**
 * Options that can be configured via the panel editor.
 */
export interface TrackMapOptions {
  /** Maximum number of data points to render on the map. */
  maxDataPoints: number;
  /** Automatically zoom the map to fit the data. */
  autoZoom: boolean;
  /** Enable zooming with the mouse scroll wheel. */
  scrollWheelZoom: boolean;
  /** The default base map layer to show. */
  defaultLayer: string;
  /** Show the layer switcher control. */
  showLayerChanger: boolean;
  /** Colour of the track polyline (used when useApColors is off). */
  lineColor: string;
  /** Colour the polyline by autopilot state instead of lineColor. */
  useApColors: boolean;
  /** Colour of the hover marker. */
  pointColor: string;
  /**
   * If greater than 0, start a new track when the time difference between two
   * consecutive data points (in seconds) is larger than this value.
   */
  maxDataPointDelta: number;
  /** Set to true when input data is a single "table" frame instead of separate series. */
  useTableFormat: boolean;
  /** Name of the time field (table format). Empty uses first column. */
  timeField: string;
  /** Name of the latitude field (table format). Empty uses second column. */
  latitudeField: string;
  /** Name of the longitude field (table format). Empty uses third column. */
  longitudeField: string;
  /** Name of the type field (table format). Empty disables type markers. */
  typeField: string;
  /** Name of the text field (table format). */
  textField: string;
  /** Name of the autopilot field (table format). Empty disables colouring by autopilot. */
  apField: string;
}

/** A single GPS sample in the format consumed by the map. */
export interface TrackMapCoord {
  /** [lat, lng] */
  position: [number, number];
  /** Timestamp in epoch milliseconds. */
  timestamp: number;
  /** Marker type (matches legacy plugin): 1, 2, 3, 4 -> tesla/charger/ac/pin. */
  type: number | null;
  /** Popup text for type markers. */
  text: string | null;
  /** Whether the sample was driven by autopilot (1) or manual (0). */
  ap: number;
}
