import React from 'react';
import { TrackMapPanelOptions, defaultLayers, defaultOptions } from '../types';

interface Props {
  options: TrackMapPanelOptions;
  onOptionsChange: (options: TrackMapPanelOptions) => void;
}

export function Options({ options, onOptionsChange }: Props) {
  const onChange = (newOptions: Partial<TrackMapPanelOptions>) => {
    onOptionsChange({
      ...defaultOptions,
      ...options,
      ...newOptions,
    });
  };

  const layerOptions = Object.keys(defaultLayers);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%' }}>
      <div>
        <h3 className="page-heading">Panel Options</h3>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={options.autoZoom}
              onChange={(e) => onChange({ autoZoom: e.currentTarget.checked })}
              className="form-control-input"
            />
            Auto zoom
          </label>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={options.scrollWheelZoom}
              onChange={(e) => onChange({ scrollWheelZoom: e.currentTarget.checked })}
              className="form-control-input"
            />
            Zoom with scroll wheel
          </label>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label className="ss-label" style={{ marginBottom: '4px', display: 'block' }}>
            Default map style
          </label>
          <select
            className="form-control"
            value={options.defaultLayer}
            onChange={(e) => onChange({ defaultLayer: e.target.value })}
            style={{ width: '100%' }}
          >
            {layerOptions.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={options.showLayerChanger}
              onChange={(e) => onChange({ showLayerChanger: e.currentTarget.checked })}
              className="form-control-input"
            />
            Show layer changer
          </label>
        </div>
      </div>

      <div>
        <h3 className="page-heading">Colors</h3>

        <div style={{ marginBottom: '12px' }}>
          <label className="ss-label" style={{ marginBottom: '4px', display: 'block' }}>
            Line Color
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="color"
              value={options.lineColor}
              onChange={(e) => onChange({ lineColor: e.target.value })}
              style={{ width: '40px', height: '32px', border: 'none', cursor: 'pointer' }}
            />
            <input
              type="text"
              value={options.lineColor}
              onChange={(e) => onChange({ lineColor: e.target.value })}
              className="form-control"
              style={{ flex: 1 }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label className="ss-label" style={{ marginBottom: '4px', display: 'block' }}>
            Point Color
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="color"
              value={options.pointColor}
              onChange={(e) => onChange({ pointColor: e.target.value })}
              style={{ width: '40px', height: '32px', border: 'none', cursor: 'pointer' }}
            />
            <input
              type="text"
              value={options.pointColor}
              onChange={(e) => onChange({ pointColor: e.target.value })}
              className="form-control"
              style={{ flex: 1 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
