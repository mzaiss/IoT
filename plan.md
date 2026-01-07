# Plan zur Steuerung des Heizstabs (Update)

## 1. Analyse der Ausgangslage
- **Geräte**:
  - **Sensor**: Shelly Pro 3 EM (Gen 2) - IP: 192.168.178.185
  - **Aktor**: Shelly Plus 0-10V (Gen 2) - IP: 192.168.178.186
- **Problem**:
  - Bestehendes Script funktioniert "in der App" (Anzeige ändert sich), aber physikalischer Ausgang (0-10V) ändert sich nicht.
  - PDF enthält **Gen 1 API Befehle** (`/light/0?turn=on`), aber der Shelly Plus 0-10V benötigt die **Gen 2 RPC API** (`/rpc/Light.Set`).
  - Wenn das aktuelle Script Gen 1 Befehle nutzt, dürfte der Shelly Plus 0-10V eigentlich gar nicht reagieren. Dass er in der App reagiert, deutet auf ein seltsames Verhalten oder ein Missverständnis hin (vielleicht sendet das Script doch RPCs?).

## 2. Strategie
Da das Debuggen des alten Scripts ohne den Code schwierig ist und wir Versionskonflikte vermuten, ist die **Erstellung eines neuen, sauberen Scripts** (Variante 1 aus dem Chat) der sicherste Weg.

### Neues Script (läuft auf Shelly Pro 3 EM):
Das Script wird direkt auf dem Shelly Pro 3 EM laufen (da dieser die Messwerte hat) und per HTTP-Request den Dimmer steuern.

#### Logik-Ablauf (Schleife alle x Sekunden):
1.  **Leistung messen**: Abruf von `Switch.GetStatus` oder `EM.GetStatus` (id:0) auf dem Pro 3 EM (local). Summe aller Phasen (`total_act_power`).
2.  **Entscheidung**:
    - **Fall A (Einspeisung < -30W)**:
        - Verfügbare Leistung = `abs(total_act_power)`.
        - Ziel-Helligkeit = `(Verfügbare Leistung - 30W Puffer) / 30W_pro_Prozent`.
        - Begrenzung auf 0-100%.
        - Sende RPC an Dimmer: `http://192.168.178.186/rpc/Light.Set?id=0&on=true&brightness=X`.
    - **Fall B (Bezug > 0W)**:
        - Sende RPC an Dimmer: `http://192.168.178.186/rpc/Light.Set?id=0&on=false` (oder brightness=0).
3.  **Hysterese/Schutz**:
    - Wenn Helligkeit > 100% (virtuell) -> Prüfen ob andere Heizstäbe an müssen (Optional, erst mal Basis-Funktion sicherstellen).
    - Optional: Temperatur-Check (wenn IP bekannt).

## 3. Nächste Schritte
1.  **Ich erstelle das Script `pv_heater_control.js`** basierend auf der Gen 2 RPC API.
2.  Du kopierst dieses Script auf den Shelly Pro 3 EM.
3.  Wir testen, ob der Shelly Plus 0-10V nun physikalisch reagiert.

## Offene Punkte
- Temperatur-Überwachung: Welche IP hat der Shelly mit dem Temp-Sensor? (User erwähnte "einen der drei letzt genannten shellys"). Wir lassen das vorerst draußen oder fügen einen Platzhalter ein.
- Status der anderen 3 Heizstäbe: Wie werden diese abgefragt? (IPs?). Vorerst ignorieren wir das und fokussieren uns auf die Regelung des Dimmers.

---
**Bereit zur Erstellung des Scripts?**
