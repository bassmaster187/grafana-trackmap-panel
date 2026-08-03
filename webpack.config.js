const CopyWebpackPlugin = require('copy-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const path = require('path');

module.exports = (env) => {
  const isWatch = env.watch;
  const isProd = env.production;

  return {
    devtool: isProd ? 'source-map' : 'eval-source-map',
    entry: {
      module: './src/module.ts',
    },
    mode: isProd ? 'production' : 'development',
    output: {
      library: {
        type: 'system',
      },
      filename: '[name].js',
      path: path.resolve(process.cwd(), 'dist'),
      chunkFilename: '[name].[contenthash:8].js',
    },
    externalsType: 'system',
    externals: {
      '@grafana/data': '@grafana/data',
      '@grafana/runtime': '@grafana/runtime',
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    plugins: [
      new ForkTsCheckerWebpackPlugin(),
      new CopyWebpackPlugin({
        patterns: [
          { from: process.cwd() + '/src/plugin.json', to: './' },
          { from: process.cwd() + '/README.md', to: './' },
          { from: process.cwd() + '/LICENCE', to: './' },
          { from: 'src/img/**/*', to: './' },
          { from: 'node_modules/leaflet/dist/images', to: 'leaflet/images/' },
          { from: 'node_modules/leaflet/dist/leaflet.js', to: 'leaflet/' },
          { from: 'node_modules/leaflet/dist/leaflet.css', to: 'leaflet/' },
        ],
      }),
    ],
  };
};
