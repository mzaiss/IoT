# Shelly PV-Überschusssteuerung: Anleitung

Dieses Script steuert einen **Shelly Plus 0-10V** (Dimmer) basierend auf der gemessenen Leistung eines **Shelly Pro 3 EM**, um überschüssigen PV-Strom für einen Heizstab zu nutzen.

## Update (v2)
Das Script wurde aktualisiert, um den Fehler `-103 missing or bad argument "id"` zu beheben. Bitte verwenden Sie den neuen Code.

## Installation

1.  Öffnen Sie die Weboberfläche des **Shelly Pro 3 EM** (Messgerät) im Browser:  
    `http://192.168.178.185`
2.  Navigieren Sie im Menü links zu **Scripts**.
3.  Wählen Sie das bestehende Script aus oder erstellen Sie ein neues.
4.  Ersetzen Sie den **gesamten Inhalt** durch den Code aus `pv_heater_control.js`.
5.  Klicken Sie auf **Save** und dann auf **Start**.

## Funktionsprüfung

Beobachten Sie erneut die Konsole im Script-Editor.
Erfolgreiche Ausgaben sehen so aus:
*   `PV Heater Control v2 gestartet`
*   `Leistung: L1=... L2=... L3=... => Total=... W`
*   `Setze Dimmer: ...%`

Falls weiterhin Fehler auftreten, kopieren Sie bitte die genaue Fehlermeldung.
