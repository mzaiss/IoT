/**
 * Shelly Script: PV-Überschusssteuerung für Heizstab (v3)
 * 
 * Host: Shelly Pro 3 EM
 * Target: Shelly Plus 0-10V (Gen2) oder Shelly Dimmer 2 (Gen1)
 * 
 * Änderungen v3:
 * - Fix für Fehler -103: Nutzung von EM.GetStatus mit expliziter ID statt Shelly.GetStatus.
 * - Sequenzielle Abfrage der Phasen L1, L2, L3.
 * - Unterstützung für Gen1 Dimmer (via config).
 */

let CONFIG = {
  // IP des Shelly Dimmers
  dimmerIp: "192.168.178.186",
  
  // Typ des Dimmers: "Gen2" (z.B. Shelly Plus 0-10V) oder "Gen1" (z.B. Shelly Dimmer 2)
  dimmerType: "Gen2", 
  
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
  let url = "";

  if (CONFIG.dimmerType === "Gen1") {
    // Gen 1 API (Shelly Dimmer 2)
    // http://ip/light/0?turn=on&brightness=xx
    let action = switchOn ? "on" : "off";
    url = "http://" + CONFIG.dimmerIp + "/light/0?turn=" + action + "&brightness=" + brightness;
  } else {
    // Gen 2 RPC API (Shelly Plus 0-10V)
    url = "http://" + CONFIG.dimmerIp + "/rpc/Light.Set?id=0&on=" + (switchOn ? "true" : "false") + "&brightness=" + brightness;
  }

  if (CONFIG.debug) {
    print("Setze Dimmer (" + CONFIG.dimmerType + "): " + brightness + "%");
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

// Hilfsfunktion zum Abrufen einer Phase
function getPhasePower(id, callback) {
  Shelly.call(
    "EM.GetStatus",
    { id: id },
    function (result, error_code, error_message) {
      if (error_code !== 0) {
        print("Fehler beim Abruf EM:" + id + " -> " + error_message + " (" + error_code + ")");
        // Wir nehmen 0 an, damit das Skript nicht abbricht, aber loggen den Fehler.
        callback(0);
      } else {
        // EM.GetStatus liefert das Objekt direkt zurück (z.B. { id:0, act_power: ... })
        let power = (typeof result.act_power !== 'undefined') ? result.act_power : 0;
        callback(power);
      }
    }
  );
}

function controlLoop() {
  // Sequenzielle Abfrage der 3 Phasen, um -103 Fehler durch falsche Aufrufe zu vermeiden
  getPhasePower(0, function(pA) {
    getPhasePower(1, function(pB) {
      getPhasePower(2, function(pC) {
        
        let totalPower = pA + pB + pC;

        if (CONFIG.debug) {
          print("Leistung: L1=" + pA + " L2=" + pB + " L3=" + pC + " => Total=" + totalPower + " W");
        }

        calculateAndSet(totalPower);
        
      });
    });
  });
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
  
  // Kleine Schritte ignorieren (Hysterese/Rauschen)
  if (Math.abs(step) < 0.5) {
    step = 0; 
  }

  newBrightness = lastBrightness + step;
  
  // Bei starkem Bezug (>100W) schneller runterregeln, um Bezug zu vermeiden
  if (totalPower > 100) {
      newBrightness -= 5; 
  }

  // Clamping
  if (newBrightness < 0) newBrightness = 0;
  if (newBrightness > 100) newBrightness = 100;
  
  setDimmer(newBrightness);
}

Timer.set(CONFIG.interval, true, controlLoop);
print("PV Heater Control v3 gestartet");
