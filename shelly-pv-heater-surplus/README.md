# Shelly PV-Überschusssteuerung: Anleitung

Dieses Script steuert einen **Shelly Plus 0-10V** (Dimmer) basierend auf der gemessenen Leistung eines **Shelly Pro 3 EM**, um überschüssigen PV-Strom für einen Heizstab zu nutzen.

## Inhalt dieses Ordners

| Datei / Ordner | Beschreibung |
|----------------|--------------|
| `pv_heater_control.js` | Shelly-Script (auf dem **Pro 3 EM** ausführen). |
| `plan.md` | Arbeitsnotizen / Entwicklungsplan. |
| `docs/` | PDF und Textauszug zu HTTP-Befehlen (Dimmer-Referenz). |

## Update (v2)

Das Script wurde aktualisiert, um den Fehler `-103 missing or bad argument "id"` zu beheben. Bitte verwenden Sie den neuen Code.

## Installation

1. Öffnen Sie die Weboberfläche des **Shelly Pro 3 EM** (Messgerät) im Browser (Beispiel-IP aus dem Projekt: `http://192.168.178.185` – bei Ihnen die passende Adresse eintragen).
2. Navigieren Sie im Menü links zu **Scripts**.
3. Wählen Sie das bestehende Script aus oder erstellen Sie ein neues.
4. Ersetzen Sie den **gesamten Inhalt** durch den Code aus **`pv_heater_control.js`** in diesem Ordner.
5. Klicken Sie auf **Save** und dann auf **Start**.

## Funktionsprüfung

Beobachten Sie erneut die Konsole im Script-Editor. Erfolgreiche Ausgaben sehen z. B. so aus:

- `PV Heater Control v4 ... gestartet` (Versionszeile je nach Stand)
- `Leistung: L1=... L2=... L3=... => Total=... W`
- `Setze Dimmer: ...%`

Falls weiterhin Fehler auftreten, kopieren Sie bitte die genaue Fehlermeldung.
