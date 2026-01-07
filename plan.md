# Plan zur Steuerung des Heizstabs mittels Shelly Pro 3 EM und Shelly Plus 0-10V

## 1. Analyse und Vorbereitung
- [ ] **Bestehendes Script sichten**: Bitte stelle das aktuelle Script zur Verfügung (z.B. als `script.js` im Chat oder Datei-Upload), damit ich analysieren kann, warum der Dimmer zwar in der App reagiert, aber der physikalische Ausgang nicht schaltet.
- [ ] **Dokumentation prüfen**: 
    - Shelly Gen2/Gen3 API für RPC/HTTP Requests prüfen.
    - Sicherstellen, dass die Steuerbefehle (HTTP Request vs. RPC) für den Shelly Plus 0-10V Dimmer korrekt sind. Häufiges Problem: `turn=on` fehlt oder falscher Endpunkt (`/rpc/Light.Set` vs `/color/0` etc.).

## 2. Fehlersuche im bestehenden Code
- Analyse der HTTP-Aufrufe. Funktioniert der Aufruf `http://192.168.178.186/...` wirklich korrekt?
- Prüfung der "Brightness"-Logik.
- Prüfung, ob `timer` korrekt gesetzt sind (Shelly Scripts sind event-basiert oder laufen in Timern).

## 3. Implementierung / Optimierung (Neues Script)
Wir werden uns entscheiden müssen zwischen **Variante 1 (Direkte Berechnung)** und **Variante 2 (Inkrementell)**. 
*Empfehlung*: **Variante 1** ist meist stabiler für PV-Überschuss, da sie direkt auf den aktuellen Messwert reagiert.

### Geplante Logik (Variante 1 - Angepasst):
1.  **Messung**: Alle X Sekunden (z.B. 2s) die Gesamtleistung vom Shelly Pro 3 EM abfragen.
2.  **Berechnung**:
    - Wenn `Leistung < -30W` (Einspeisung): 
        - Berechne Dimmer-Level: `(Abs(Leistung) - 30) / 3000 * 100`.
        - Sende `Licht AN` + `Brightness` an IP `192.168.178.186`.
    - Wenn `Leistung > 0` (Bezug):
        - Sende `Licht AUS` oder `Brightness 0`.
3.  **Sonderlogik (Hysterese/Erweiterung)**:
    - Wenn `Brightness > 100`:
        - Prüfen, ob die anderen 3 Heizstäbe schon an sind (Status-Abfrage notwendig oder Variable setzen?).
        - Wenn nicht alle an: Dimmer für 5 Sekunden AUS (damit externe Logik die großen Heizstäbe zuschalten kann).
    - Temperatur-Check: Wenn Puffer > 85°C -> AUS.

## 4. Offene Fragen für das Script
- Wie ermitteln wir den Status der "anderen 3 Heizstäbe"? Haben diese feste IPs (Shellys)?
- Wie lesen wir die Temperatur aus? (IP des Shelly mit Temp-Sensor?)

## Nächste Schritte
Bitte kopiere den **aktuellen Code** hier in den Chat oder lade die Datei hoch.
