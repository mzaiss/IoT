# Motor-Puls (Rehwild): Shelly 1 Gen3

Dieses Shelly-Script schaltet das Relais des **Shelly 1 Gen3** (oder anderer Gen2/Gen3-Geräte mit `Switch.Set`) in einem festen Rhythmus **kurz ein** – gedacht für einen Motor oder ein Gerät, das für etwa **15 Sekunden Lärm** erzeugt und danach wieder aus ist.

## Standard-Verhalten

| Parameter | Standard | Bedeutung |
|-----------|----------|-----------|
| `cyclePeriodMs` | `180000` | Alle **3 Minuten** startet ein Puls |
| `onSeconds` | `15` | Der Ausgang bleibt **15 Sekunden** an, danach automatisch aus (`toggle_after`) |
| `useTimeWindow` | `false` | Ohne Zeitfenster: **24/7** (sinnvoll ohne WLAN/NTP) |

## Zeitfenster 19:00–9:00 (optional)

Wenn `useTimeWindow: true` gesetzt ist, werden Pulse nur ausgeführt, wenn die **interne Uhr** des Shelly im Bereich **ab 19:00 bis vor 9:00** liegt (also Nacht über Mitternacht).

**Wichtig:** Ohne Internet/WLAN hat das Gerät oft **keine korrekte Zeit** (kein NTP). Dann ist diese Option **nicht verlässlich**. Für den Weinberg im 12-V-Betrieb ist **`useTimeWindow: false`** (Standard) meist die richtige Wahl; der Rhythmus läuft trotzdem stabil weiter.

## Installation

1. Shelly per Browser im lokalen Netz öffnen (oder vor Ort einmalig verbinden).
2. Menü **Scripts** → neues Script anlegen.
3. Inhalt von `motor_pulse_scare.js` einfügen, **Save**, dann **Start**.
4. Für Betrieb nach Stromausfall: beim Script **„Beim Start ausführen“** (Run on startup) aktivieren.

## Konfiguration anpassen

Oben im Script im Objekt `CONFIG`:

- **`relayId`**: fast immer `0` beim Shelly 1.
- **`onSeconds`**: Dauer des „Krachs“ in Sekunden.
- **`cyclePeriodMs`**: Abstand **zwischen Puls-Beginnen** in Millisekunden (z. B. `240000` = 4 Minuten).
- **`immediateFirstPulse`**: `true` = direkt nach Script-Start erster Puls; `false` = erster Puls erst nach einem vollen Intervall.
- **`useTimeWindow`**, **`nightStartHour`**, **`nightEndHour`**: nur nutzen, wenn die Gerätezeit stimmt.

## Sicherheit / Technik

- Relaislast und Motor **technisch absichern** (Schütz, Endschalter, thermisch, …) – das Script ersetzt keine Maschinensicherheit.
- **`toggle_after`** schaltet nach Ablauf auf den **vorherigen** Zustand zurück. Nach einem sauberen Start mit ausgeschaltetem Kanal bedeutet das: **EIN → nach X s wieder AUS**.
