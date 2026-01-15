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
 * 
 * Änderungen Refinement:
 * - Abschaltung des Dimmers für konfigurierbare Zeit, wenn 100% Helligkeit und weiterhin Einspeisung (für andere Verbraucher).
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

  // Schwelle für kurzzeitige Abschaltung bei 100% (in Watt, negativ = Einspeisung)
  excessDetectThreshold: -50,

  // IP der Shelly, die die Abschaltung verhindert, wenn sie AN ist (z.B. Heizstab 2)
  overrideShellyIp: "192.168.178.198",
  
  // Typ der Override-Shelly: "Gen1" (z.B. Shelly 1, Plug S) oder "Gen2" (z.B. Plus 1, Plus Plug S)
  overrideShellyType: "Gen1", 

  // Dauer der Abschaltung in ms (wenn Verbraucher zuschalten sollen)
  offDuration: 5000,

  // Debug-Modus
  debug: true
};

let lastBrightness = 0;
let dimmerPaused = false;

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

// Hilfsfunktion zum Abrufen der Leistung (Shelly Pro 3 EM liefert alle Phasen in EM:0)
function getPowerStatus(callback) {
  Shelly.call(
    "EM.GetStatus",
    { id: 0 },
    function (result, error_code, error_message) {
      if (error_code !== 0) {
        print("Fehler beim Abruf EM:0 -> " + error_message + " (" + error_code + ")");
        callback(0, 0, 0);
      } else {
        // Pro 3 EM liefert a_act_power, b_act_power, c_act_power in einem Objekt
        let pA = (typeof result.a_act_power !== 'undefined') ? result.a_act_power : 0;
        let pB = (typeof result.b_act_power !== 'undefined') ? result.b_act_power : 0;
        let pC = (typeof result.c_act_power !== 'undefined') ? result.c_act_power : 0;

        // Fallback für Geräte die doch act_power nutzen (oder Einzelphase)
        if (typeof result.act_power !== 'undefined') {
            pA = result.act_power;
        }
        
        callback(pA, pB, pC);
      }
    }
  );
}

function performPause(totalPower) {
    if (CONFIG.debug) {
      print("Maximale Helligkeit und weiterer Überschuss (" + totalPower + "W). Schalte kurz ab für " + CONFIG.offDuration + "ms.");
    }
    setDimmer(0);
    dimmerPaused = true;
    
    Timer.set(CONFIG.offDuration, false, function() {
      dimmerPaused = false;
      if (CONFIG.debug) print("Pause beendet, Regelung wieder aktiv.");
    });
}

function checkOverrideAndPause(totalPower) {
    // Wenn keine IP konfiguriert ist, direkt pausieren
    if (!CONFIG.overrideShellyIp || CONFIG.overrideShellyIp === "") {
        performPause(totalPower);
        return;
    }

    let url = "";
    if (CONFIG.overrideShellyType === "Gen1") {
        // Gen 1: /relay/0/status liefert { ison: true/false ... }
        url = "http://" + CONFIG.overrideShellyIp + "/relay/0/status"; 
    } else {
        // Gen 2: RPC
        url = "http://" + CONFIG.overrideShellyIp + "/rpc/Switch.GetStatus?id=0";
    }

    Shelly.call("HTTP.GET", { url: url }, function(res, err_code, err_msg) {
        if (err_code !== 0) {
            if (CONFIG.debug) print("Fehler beim Check Override-Shelly: " + err_msg + ". Führe Pause aus.");
            performPause(totalPower);
            return;
        }

        let isOne = false;
        try {
            let data = JSON.parse(res.body);
            if (CONFIG.overrideShellyType === "Gen1") {
                isOne = data.ison === true;
            } else {
                isOne = data.output === true;
            }
        } catch(e) {
            if (CONFIG.debug) print("JSON Parse Fehler Override-Shelly. Führe Pause aus.");
            performPause(totalPower);
            return;
        }

        if (isOne) {
            if (CONFIG.debug) print("Override-Shelly (" + CONFIG.overrideShellyIp + ") ist AN. Keine Pause.");
            // Do nothing, just return. The dimmer stays at 100%.
        } else {
            performPause(totalPower);
        }
    });
}

function controlLoop() {
  getPowerStatus(function(pA, pB, pC) {
    let totalPower = pA + pB + pC;
    
    if (CONFIG.debug) {
       print("Leistung: L1=" + pA + " L2=" + pB + " L3=" + pC + " => Total=" + totalPower + " W");
    }
    
    calculateAndSet(totalPower);
  });
}

function calculateAndSet(totalPower) {
  if (dimmerPaused) {
    if (CONFIG.debug) print("Dimmer pausiert für Verbraucher-Check...");
    return;
  }

  // Check: Wenn 100% an und immer noch Überschuss > Threshold -> ggf. kurz abschalten
  if (lastBrightness >= 100 && totalPower < CONFIG.excessDetectThreshold) {
    checkOverrideAndPause(totalPower);
    return;
  }

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
print("PV Heater Control v3 (mit Pause-Funktion) gestartet");
