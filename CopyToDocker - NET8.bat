@echo off
REM Replace the TrackMap plugin inside the running Grafana container.
REM Grafana loads the plugin from <plugin>/dist/, so we copy the contents
REM of the local ./dist folder there (not nested), then restart Grafana.

echo Clearing old plugin files...
docker exec -u root teslalogger-grafana sh -c "rm -rf /var/lib/grafana/plugins/pR0Ps-grafana-trackmap-panel/dist && mkdir -p /var/lib/grafana/plugins/pR0Ps-grafana-trackmap-panel/dist"

echo Copying new plugin build...
docker cp ./dist/. teslalogger-grafana:/var/lib/grafana/plugins/pR0Ps-grafana-trackmap-panel/dist/

echo Restarting Grafana...
docker restart teslalogger-grafana

timeout /t 3 /nobreak >nul
