import { PanelPlugin } from '@grafana/data';
import { SelectableValue } from '@grafana/data';

import { TrackMapPanel } from './components/TrackMapPanel';
import { TrackMapOptions } from './types';

const LAYER_OPTIONS: SelectableValue<string>[] = [
  { label: 'OpenStreetMap', value: 'OpenStreetMap' },
  { label: 'OpenTopoMap', value: 'OpenTopoMap' },
  { label: 'Satellite', value: 'Satellite' },
];

export const plugin = new PanelPlugin<TrackMapOptions>(TrackMapPanel).setPanelOptions((builder) => {
  builder
    .addNumberInput({
      path: 'maxDataPoints',
      name: 'Max data points',
      defaultValue: 500,
      settings: { min: 1 },
    })
    .addNumberInput({
      path: 'maxDataPointDelta',
      name: 'Max data point time delta',
      description: 'In seconds, 0 to disable. Start a new track if the time difference between a data point and the previous data point is greater than this value.',
      defaultValue: 0,
      settings: { min: 0 },
    })
    .addBooleanSwitch({
      path: 'autoZoom',
      name: 'Auto zoom',
      description: 'Automatically zoom the map to fit the data.',
      defaultValue: true,
    })
    .addBooleanSwitch({
      path: 'scrollWheelZoom',
      name: 'Zoom with scroll wheel',
      defaultValue: false,
    })
    .addSelect({
      path: 'defaultLayer',
      name: 'Default map style',
      defaultValue: 'OpenStreetMap',
      settings: { options: LAYER_OPTIONS },
    })
    .addBooleanSwitch({
      path: 'showLayerChanger',
      name: 'Show layer changer',
      description: 'Allow viewers to change the map style.',
      defaultValue: true,
    })
    .addBooleanSwitch({
      path: 'useApColors',
      name: 'Color by autopilot state',
      description: 'When enabled, track segments are colored red (manual) and blue (autopilot).',
      defaultValue: true,
    })
    .addColorPicker({
      path: 'lineColor',
      name: 'Line color',
      defaultValue: 'red',
      showIf: (options) => !options.useApColors,
    })
    .addColorPicker({
      path: 'pointColor',
      name: 'Point color',
      defaultValue: 'royalblue',
    })
    .addTextInput({
      path: 'timeField',
      name: 'Time field',
      description: 'Field name for the timestamp (table format). Leave empty for the first column.',
      defaultValue: '',
      settings: { placeholder: 'Time' },
    })
    .addTextInput({
      path: 'latitudeField',
      name: 'Latitude field',
      description: 'Field name for latitude (table format). Leave empty for the second column.',
      defaultValue: '',
      settings: { placeholder: 'latitude' },
    })
    .addTextInput({
      path: 'longitudeField',
      name: 'Longitude field',
      description: 'Field name for longitude (table format). Leave empty for the third column.',
      defaultValue: '',
      settings: { placeholder: 'longitude' },
    })
    .addTextInput({
      path: 'typeField',
      name: 'Type field',
      description: 'Field name for the marker type (table format).',
      defaultValue: '',
      settings: { placeholder: 'type' },
    })
    .addTextInput({
      path: 'textField',
      name: 'Text field',
      description: 'Field name for the marker popup text (table format).',
      defaultValue: '',
      settings: { placeholder: 'text' },
    })
    .addTextInput({
      path: 'apField',
      name: 'Autopilot field',
      description: 'Field name for the autopilot state (table format).',
      defaultValue: '',
      settings: { placeholder: 'ap' },
    })
    .addBooleanSwitch({
      path: 'useTableFormat',
      name: 'Use table format',
      description: 'Force single-frame (table) parsing of the input data.',
      defaultValue: false,
    });

  return builder;
});
