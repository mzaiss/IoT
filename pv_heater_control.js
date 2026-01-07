/**
 * Shelly Script: PV-Überschusssteuerung für Heizstab
 * 
 * Host: Shelly Pro 3 EM (misst die Energie am Hausanschluss)
 * Target: Shelly Plus 0-10V (steuert den Dimmer/Heizstab)
 * 
 * Funktion:
 * - Liest regelmäßig die aktuelle Gesamtleistung (Summe aller Phasen).
 * - Bei Einspeisung (Leistung < -30W) wird der Dimmer hochgeregelt.
 * - Bei Bezug (Leistung > 0W) wird der Dimmer runtergeregelt/ausgeschaltet.
 * - Hysterese und Puffer sind konfigurierbar.
 */

let CONFIG = {
  // IP des Shelly Plus 0-10V Dimmers
  dimmerIp: "192.168.178.186",
  
  // Nennleistung des Heizstabs in Watt (bei 100%)
  heaterPower: 3000,
  
  // Einschaltschwelle in Watt (Einspeisung als negativer Wert)
  // Beispiel: -30 bedeutet, ab 30 Watt Einspeisung fangen wir an.
  startThreshold: -30,
  
  // Intervall in Millisekunden (z.B. 2000 = 2 Sekunden)
  interval: 2000,
  
  // Puffer: Wieviel Watt Einspeisung sollen "übrig" bleiben?
  // 0 = Ziel ist 0 Watt am Zähler (ideal).
  // -50 = Ziel ist 50 Watt Einspeisung (Sicherheitspuffer).
  targetMargin: -20,

  // Debug-Modus für Konsole
  debug: true
};

// Globaler Status
let lastBrightness = 0;

/**
 * Sendet den Steuerbefehl an den Dimmer (Shelly Plus 0-10V / Gen 2 RPC API)
 * API: http://<ip>/rpc/Light.Set?id=0&on=true&brightness=<val>
 */
function setDimmer(brightness) {
  // Begrenzung auf 0-100
  if (brightness < 0) brightness = 0;
  if (brightness > 100) brightness = 100;
  
  // Runde auf ganze Zahl
  brightness = Math.round(brightness);

  // Optimierung: Nur senden, wenn sich der Wert geändert hat
  if (brightness === lastBrightness) {
    return;
  }
  
  let switchOn = brightness > 0;
  // Wenn brightness 0 ist, schalten wir explizit aus oder setzen 0?
  // Light.Set mit on=false ist sicherer zum Ausschalten.
  
  let url = "http://" + CONFIG.dimmerIp + "/rpc/Light.Set?id=0&on=" + (switchOn ? "true" : "false") + "&brightness=" + brightness;

  if (CONFIG.debug) {
    print("Setze Dimmer auf: " + brightness + "% (URL: " + url + ")");
  }

  Shelly.call(
    "HTTP.GET",
    { url: url },
    function (response, error_code, error_message) {
      if (error_code !== 0) {
        print("Fehler beim Steuern des Dimmers: " + error_message);
      } else {
        lastBrightness = brightness;
      }
    }
  );
}

/**
 * Hauptlogik
 */
function controlLoop() {
  // Status vom Shelly Pro 3 EM abrufen (Komponente EM:0 enthält meist Summenwerte oder Einzelphasen)
  // Bei Gen 2 Pro 3 EM heisst die Komponente oft "EM:0" oder man muss "EMData.GetStatus" nutzen.
  // Wir nutzen Shelly.getComponentStatus, wenn verfügbar, sonst RPC call.
  // Da Shelly.call async ist, nutzen wir das hier.
  
  Shelly.call(
    "EM.GetStatus",
    { id: 0 },
    function (result, error_code, error_message) {
      if (error_code !== 0) {
        print("Fehler beim Lesen der Leistung: " + error_message);
        return;
      }

      // Pro 3 EM liefert total_act_power (Summe). 
      // Falls nicht vorhanden, summieren wir a/b/c_act_power.
      let totalPower = 0;
      if (typeof result.total_act_power !== 'undefined') {
        totalPower = result.total_act_power;
      } else {
        // Fallback: Summe berechnen
        let pA = result.a_act_power || 0;
        let pB = result.b_act_power || 0;
        let pC = result.c_act_power || 0;
        totalPower = pA + pB + pC;
      }

      if (CONFIG.debug) {
        print("Aktuelle Gesamtleistung: " + totalPower + " W");
      }

      calculateAndSet(totalPower);
    }
  );
}

function calculateAndSet(currentPower) {
  // currentPower ist negativ bei Einspeisung (z.B. -500 W)
  // Wir wollen regeln, dass currentPower + DimmerVerbrauch ~= TargetMargin
  
  // Logik Var 1 (Direkt):
  // Verfügbare Leistung = Aktuelle Einspeisung (negativ) + Aktueller Verbrauch des Dimmers (geschätzt)
  // Da wir den aktuellen Verbrauch des Dimmers nicht messen (er hängt ja am Netz, aber wird er vom Pro 3 EM miterfasst?),
  // müssen wir aufpassen.
  
  // Annahme: Der Shelly Pro 3 EM misst den GESAMTEN Hausanschluss inklusive dem Heizstab.
  // Das bedeutet: Wenn wir den Heizstab hochregeln, steigt der Verbrauch (totalPower wird positiver).
  // Das ist ein Regelkreis.
  
  // Einfacher P-Regler Ansatz:
  // Wir wollen totalPower auf CONFIG.targetMargin regeln.
  // Fehler = totalPower - CONFIG.targetMargin
  // Korrektur = Fehler * Faktor
  
  // Oder inkrementell (Var 2 Ansatz, oft stabiler bei Schwankungen):
  // Wenn Einspeisung zu hoch (totalPower < -50): Dimmer erhöhen.
  // Wenn Bezug (totalPower > 0): Dimmer verringern.
  
  // User bevorzugte Var 1 "Direkte Berechnung", aber Vorsicht: 
  // Wenn man direkt berechnet, braucht man den aktuellen Verbrauch des Dimmers als Basis.
  // Hat man den nicht, schwingt es.
  // Daher ist ein inkrementeller Ansatz ("I-Regler") oft besser für Shelly Scripts ohne komplexen State.
  
  // Wir versuchen eine Mischung:
  // Wenn wir stark einspeisen (z.B. -2000W), machen wir große Sprünge nach oben.
  // Wenn wir Bezug haben (+500W), machen wir große Sprünge nach unten.
  // Wenn wir nah dran sind, kleine Sprünge.
  
  let newBrightness = lastBrightness;
  
  // Differenz zur Ziel-Marke (z.B. -20W)
  // Ist totalPower = -500, target = -20 -> diff = -480 (zu viel Einspeisung) -> Erhöhen
  // Ist totalPower = +100, target = -20 -> diff = +120 (zu viel Bezug) -> Verringern
  let powerDiff = totalPower - CONFIG.targetMargin;
  
  // Umrechnung Watt zu %-Punkten (3000W / 100 = 30W pro %)
  let wattPerPercent = CONFIG.heaterPower / 100;
  
  // Wir dämpfen den Schritt etwas, um Schwingen zu vermeiden (Faktor 0.5)
  let step = -(powerDiff / wattPerPercent) * 0.5; 
  
  // Minimale Schrittgröße beachten, damit es nicht "zittert" bei Rauschen
  if (Math.abs(step) < 1) {
    step = 0; 
  }

  // Neuen Wert berechnen
  newBrightness = lastBrightness + step;
  
  // Sicherheitscheck: Wenn wir massiven Bezug haben (> 200W), sofort runterfahren
  if (totalPower > 200) {
      // Schnell senken
      newBrightness = Math.min(newBrightness, lastBrightness - 10);
  }

  // Grenzen einhalten
  if (newBrightness < 0) newBrightness = 0;
  if (newBrightness > 100) newBrightness = 100;
  
  if (CONFIG.debug && Math.round(newBrightness) !== lastBrightness) {
     print("Regelung: Power=" + totalPower + "W, Diff=" + powerDiff + "W, Step=" + step.toFixed(1) + "%, Ziel=" + newBrightness.toFixed(1) + "%");
  }
  
  setDimmer(newBrightness);
}

// Timer starten
Timer.set(CONFIG.interval, true, controlLoop);

print("PV Heater Control gestartet. Ziel-IP: " + CONFIG.dimmerIp);
