@echo off
echo.
echo ==========================================
echo   Trackmap Plugin Update Script
echo ==========================================
echo.

REM --- Schritt 1: Lokale Dateien auf den Debian Server kopieren ---
echo [1/3] Kopiere lokale 'dist' Dateien auf den Debian Server...

REM Wir prüfen, ob der Zielordner auf dem Server existiert, sonst erstellen wir ihn
ssh root@debian "mkdir -p /opt/docker/temp/trackmappanel"

REM XCOPY kopiert den INHALT von dist in den Remote-Ordner
REM /E = Unterverzeichnisse inkl. leerer
REM /Y = Überschreiben ohne Nachfrage
REM /I = Wenn Ziel ein Verzeichnis ist, nehme es als Zielverzeichnis an
xcopy dist\*.* \\debian\docker\temp\trackmappanel\ /E /Y /I

if %errorlevel% NEQ 0 (
    echo FEHLER: Lokales Kopieren auf Debian fehlgeschlagen!
    pause
    exit /b 1
)
echo Lokales Kopieren erfolgreich.

echo.
echo [2/3] Kopiere Dateien in den Docker Container...

REM WICHTIG: 
REM 1. Altes dist im Container leeren, damit keine alten Dateien bleiben (z.B. trackmap_ctrl.js)
REM 2. NEU: Punkt (.) am Ende des Quellpfades hinzufügen, damit der INHALT kopiert wird und kein Unterordner entsteht!
ssh root@debian "rm -rf /var/lib/grafana/plugins/pR0Ps-grafana-trackmap-panel/dist/* && docker cp /opt/docker/temp/trackmappanel/. teslalogger-grafana:/var/lib/grafana/plugins/pR0Ps-grafana-trackmap-panel/dist/ && echo 'Kopieren erfolgreich!' || echo 'Fehler beim Kopieren!'"

if %errorlevel% NEQ 0 (
    echo FEHLER: Kopieren in den Docker Container fehlgeschlagen!
    pause
    exit /b 1
)
echo Container-Update erfolgreich.

echo.
echo [3/3] Starte Grafana Container neu...

ssh root@debian "docker restart teslalogger-grafana"

if %errorlevel% NEQ 0 (
    echo FEHLER: Neustart des Containers fehlgeschlagen!
    pause
    exit /b 1
)
echo Grafana wurde neu gestartet.

echo.
echo ==========================================
echo   Update abgeschlossen!
echo   Bitte warte ca. 10-20 Sekunden bis Grafana hochgefahren ist.
echo   Dann Cache im Browser leeren (Strg+F5).
echo ==========================================
echo.
pause
