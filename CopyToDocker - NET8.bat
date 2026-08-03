docker cp ./dist teslalogger-grafana:/var/lib/grafana/plugins/pR0Ps-grafana-trackmap-panel/dist

docker restart teslalogger-grafana

timeout /t 3 /nobreak >nul
