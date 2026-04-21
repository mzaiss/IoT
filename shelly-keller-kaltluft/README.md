# Keller-Kaltluft mit Shelly 1 Gen3 (Sensor-Add-on)

Kleines **Shelly-Script** für den **Shelly 1 Gen3** mit aufgestecktem **Sensor-Add-on** und zwei Temperaturfühlern (z. B. DS18B20 als **Komponente 100** und **101**).

**Idee:** Draußen (oder in der Zuleitung) ist’s **sodele** kühler als im Keller – dann darf ein **Lüfter / Gebläse** über das Relais laufen und **kalte Luft** in den Keller ziehen. Wenn die Differenz nicht reicht, bleibt alles **aus** – so bleibt der Keller **jetzetle** ohne unnötigen Strom und ohne „Warmblasen“ im Griff.

## Regelung

- Es werden die Celsius-Werte von **Fühler `tempColdId`** (Standard **100**) und **Fühler `tempWarmId`** (Standard **101**) gelesen.
- **Einschalten**, wenn die „warme“ Seite mindestens **`deltaC`** Kelvin wärmer ist als die „kalte“ Seite:

  \((T_{101} - T_{100}) \ge \texttt{deltaC}\)

  Das entspricht: **Fühler 100 ist mindestens 3 K kälter als Fühler 101** (bei Standard `deltaC: 3`).

- **Ausschalten** mit kleiner **Hysterese** (`hysteresisC`), damit am Schwellwert nicht ständig hin- und hergeschaltet wird.

- **Sensorfehler** oder ungültige Messwerte: Relais geht auf **AUS** (Fail-safe).

## Installation

1. Shelly im Browser öffnen, unter **Scripts** ein neues Script anlegen.
2. Inhalt von `keller_kaltluft_fan.js` einfügen, **Speichern**, dann **Start**.
3. Für Betrieb nach Stromausfall: **„Beim Start ausführen“** aktivieren.

## Konfiguration

Oben im `CONFIG`-Objekt:

| Feld | Standard | Bedeutung |
|------|----------|-----------|
| `tempColdId` | `100` | ID des **kälteren** Bezugs (Außen / Zuluft vor dem Keller) |
| `tempWarmId` | `101` | ID des **wärmeren** Bezugs (Keller / Rücklauf) |
| `relayId` | `0` | Relais-Kanal (Shelly 1: fast immer `0`) |
| `deltaC` | `3.0` | Mindest-Differenz in Kelvin für **EIN** |
| `hysteresisC` | `0.3` | Schaltband für **AUS** |
| `intervalMs` | `60000` | Abstand der Messung in ms (hier 60 s) |
| `debug` | `true` | Log-Ausgaben im Script-Konsolenfenster |

**Hinweis:** Welcher Fühler „innen“ und welcher „außen“ hängt an der Verdrahtung. Wenn’s **invertiert** wirkt, die IDs **`tempColdId`** / **`tempWarmId`** tauschen oder die Fühler physisch anders zuordnen.

## Sicherheit

- Nur **zulässige elektrische Last** am Relais; Motor/Lüfter **technisch** absichern (Schutzleiter, ggf. Motorschutz, Thermistoren, …).
- Das Script ersetzt **keine** Brandschutz- oder Raumluft-Konzepte – wer Lüftung dauerhaft braucht, sollte das **fachlich** planen.
- Bei **WLAN-Ausfall** läuft das Script weiter auf dem Gerät; ohne Strom natürlich nicht.

## Dateien

- `keller_kaltluft_fan.js` – Shelly-Script (Gen2/Gen3 RPC: `Temperature.GetStatus`, `Switch.Set`)
