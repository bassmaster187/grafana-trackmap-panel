import { PanelPlugin } from '@grafana/data';
import { TrackMapPanel } from './panel/TrackMapPanel';
import { Options } from './panel/Options';
import { TrackMapPanelOptions, defaultOptions } from './types';

const plugin = new PanelPlugin<TrackMapPanelOptions>(TrackMapPanel)
  .setDefaults(defaultOptions)
  .setEditor(Options as any)
  .setNoPadding();

export { plugin };
