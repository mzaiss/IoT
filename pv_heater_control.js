/**
 * Shelly Script: PV-Überschusssteuerung für Heizstab (v2)
 * 
 * Host: Shelly Pro 3 EM
 * Target: Shelly Plus 0-10V
 * 
 * Änderungen v2:
 * - Nutzung von Shelly.GetStatus() statt EM.GetStatus(), um Fehler -103 zu vermeiden.
 * - Manuelle Summenbildung der Phasen A, B, C.
 */

let CONFIG = {
  // IP des Shelly Plus 0-10V Dimmers
  dimmerIp: "192.168.178.186",
  
  // Nennleistung des Heizstabs in Watt (bei 100%)
  heaterPower: 3000,
  
  // Einschaltschwelle in Watt (Einspeisung als negativer Wert)
  startThreshold: -30,
  
  // Intervall in Millisekunden
  interval: 2000,
  
  // Ziel-Einspeisung (Puffer)
  targetMargin: -20,

  // Debug-Modus
  debug: true
};

let lastBrightness = 0;

function setDimmer(brightness) {
  if (brightness < 0) brightness = 0;
  if (brightness > 100) brightness = 100;
  brightness = Math.round(brightness);

  if (brightness === lastBrightness) return;
  
  let switchOn = brightness > 0;
  
  // URL für Shelly Plus 0-10V (Gen 2 RPC)
  let url = "http://" + CONFIG.dimmerIp + "/rpc/Light.Set?id=0&on=" + (switchOn ? "true" : "false") + "&brightness=" + brightness;

  if (CONFIG.debug) {
    print("Setze Dimmer: " + brightness + "%");
  }

  Shelly.call(
    "HTTP.GET",
    { url: url },
    function (response, error_code, error_message) {
      if (error_code !== 0) {
        print("HTTP Fehler beim Dimmer: " + error_message);
      } else {
        lastBrightness = brightness;
      }
    }
  );
}

function controlLoop() {
  // Wir nutzen Shelly.GetStatus (ohne Parameter), um den Status aller Komponenten zu holen.
  // Das vermeidet ID-Fehler und funktioniert auf allen Gen2 Geräten.
  Shelly.call(
    "Shelly.GetStatus",
    {},
    function (result, error_code, error_message) {
      if (error_code !== 0) {
        print("Fehler beim Status-Abruf: " + error_message + " (Code: " + error_code + ")");
        return;
      }

      // Berechnung der Gesamtleistung aus den 3 Phasen
      // Pro 3 EM liefert em:0, em:1, em:2
      let pA = 0, pB = 0, pC = 0;
      
      if (result["em:0"] && typeof result["em:0"].act_power !== 'undefined') {
        pA = result["em:0"].act_power;
      }
      if (result["em:1"] && typeof result["em:1"].act_power !== 'undefined') {
        pB = result["em:1"].act_power;
      }
      if (result["em:2"] && typeof result["em:2"].act_power !== 'undefined') {
        pC = result["em:2"].act_power;
      }
      
      // Falls keys anders heißen (z.B. nur 'em' array?), prüfen wir Alternativen,
      // aber result["em:0"] ist Standard bei Gen 2 RPC.
      
      let totalPower = pA + pB + pC;

      if (CONFIG.debug) {
        // Nur alle paar Mal loggen oder bei Änderung? Hier immer, zum Debuggen.
        print("Leistung: L1=" + pA + " L2=" + pB + " L3=" + pC + " => Total=" + totalPower + " W");
      }

      calculateAndSet(totalPower);
    }
  );
}

function calculateAndSet(totalPower) {
  let newBrightness = lastBrightness;
  
  // Regelabweichung: Ist-Wert - Soll-Wert
  // totalPower ist z.B. -500 (Einspeisung). targetMargin ist -20.
  // diff = -480.
  let powerDiff = totalPower - CONFIG.targetMargin;
  
  // Skalierung: 3000W entsprechen 100%. 30W pro %.
  let wattPerPercent = CONFIG.heaterPower / 100;
  
  // P-Anteil / Schrittberechnung
  // Wenn powerDiff negativ (zu viel Einspeisung), müssen wir Brightness ERHÖHEN.
  // step = - (-480 / 30) = +16%
  // Dämpfung 0.5 -> +8%
  let step = -(powerDiff / wattPerPercent) * 0.5; 
  
  if (Math.abs(step) < 0.5) {
    step = 0; 
  }

  newBrightness = lastBrightness + step;
  
  // Bei starkem Bezug (>100W) schneller runterregeln
  if (totalPower > 100) {
      newBrightness -= 5; 
  }

  // Clamping
  if (newBrightness < 0) newBrightness = 0;
  if (newBrightness > 100) newBrightness = 100;
  
  // Debug Ausgabe für Berechnung
  // print("Step: " + step.toFixed(2) + " -> Neu: " + newBrightness.toFixed(1));
  
  setDimmer(newBrightness);
}

Timer.set(CONFIG.interval, true, controlLoop);
print("PV Heater Control v2 gestartet");
