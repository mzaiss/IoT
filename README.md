# Shelly PV-Überschusssteuerung: Anleitung

Dieses Script steuert einen **Shelly Plus 0-10V** (Dimmer) basierend auf der gemessenen Leistung eines **Shelly Pro 3 EM**, um überschüssigen PV-Strom für einen Heizstab zu nutzen.

## Installation

1.  Öffnen Sie die Weboberfläche des **Shelly Pro 3 EM** (Messgerät) im Browser:  
    `http://192.168.178.185`
2.  Navigieren Sie im Menü links zu **Scripts**.
3.  Klicken Sie auf **Create Script** (oder "Add Script").
4.  Geben Sie dem Script einen Namen, z.B. `pv_heater`.
5.  Löschen Sie ggf. vorhandenen Beispiel-Code und fügen Sie den **gesamten Inhalt** der Datei `pv_heater_control.js` ein.
6.  Klicken Sie auf **Save**.
7.  Aktivieren Sie den Schalter oben rechts, um das Script zu starten (**Start**).

## Funktionsprüfung & Debugging

Damit wir sehen, ob alles funktioniert oder warum der Dimmer nicht schaltet, ist der **Debug-Output** wichtig.

1.  Lassen Sie das Script im Editor geöffnet.
2.  Achten Sie auf das **Konsolen-Fenster** (unten im Script-Editor, ggf. "Console" aufklappen).
3.  Dort sollten Meldungen erscheinen wie:
    *   `PV Heater Control gestartet...`
    *   `Aktuelle Gesamtleistung: -450 W`
    *   `Regelung: Power=-450W, Diff=..., Ziel=14.0%`
    *   `Setze Dimmer auf: 14% (URL: http://...)`
    
### Was tun, wenn es nicht geht?

Bitte kopieren Sie die Ausgaben aus der Konsole und senden Sie uns diese zu. Achten Sie besonders auf Fehlermeldungen (rot markiert oder "Fehler...").

**Häufige Fehlerquellen:**
*   **IP-Adresse falsch**: Prüfen Sie, ob der Dimmer wirklich unter `192.168.178.186` erreichbar ist.
*   **Netzwerk**: Shelly Pro 3 EM und Shelly Plus 0-10V müssen im gleichen WLAN sein und sich sehen können.
*   **API-Fehler**: Wenn im Log `Fehler beim Steuern des Dimmers` steht, antwortet der Dimmer nicht korrekt.

## Konfiguration anpassen

Oben im Script finden Sie den Bereich `let CONFIG = { ... };`. Hier können Sie Werte anpassen:
*   `startThreshold`: Ab wieviel Watt Einspeisung (negativ) soll geregelt werden? (Standard: -30)
*   `heaterPower`: Leistung Ihres Heizstabs in Watt (Standard: 3000)
*   `targetMargin`: Wieviel Watt Einspeisung soll als Sicherheitspuffer bleiben? (Standard: -20)
