/**
 * Shelly Script: Motor-Puls gegen Rehwild (Gen2/Gen3 RPC, z. B. Shelly 1 Gen3)
 *
 * Schaltet den Ausgang (Relais) regelmäßig für eine kurze Zeit ein, z. B. Motor/Geräusch.
 * Optional nur in einem Nacht-Zeitfenster (Uhrzeit vom Gerät; ohne NTP oft unzuverlässig).
 *
 * Standard: alle 180 s (3 min) ca. 15 s EIN — per toggle_after des Relais, ein periodischer Timer.
 */

let CONFIG = {
  // Relais-Index (meist 0 beim Shelly 1)
  relayId: 0,

  // Einschaltdauer in Sekunden (Gen3 Switch.Set: toggle_after)
  onSeconds: 15,

  // Abstand zwischen Puls-Beginnen in Millisekunden (3 Minuten)
  cyclePeriodMs: 180000,

  // true = nur zwischen nightStartHour und nightEndHour (siehe unten)
  useTimeWindow: false,

  // „Nacht“ von 19:00 bis 9:00: aktiv wenn Stunde >= 19 ODER Stunde < 9
  nightStartHour: 19,
  nightEndHour: 9,

  // Beim Start sofort ersten Puls ausführen (danach weiter im Raster)
  immediateFirstPulse: true,

  debug: true,
};

function inNightWindow() {
  let d = new Date();
  let h = d.getHours();
  if (h >= CONFIG.nightStartHour) {
    return true;
  }
  if (h < CONFIG.nightEndHour) {
    return true;
  }
  return false;
}

function onSwitchSetResult(result, error_code, error_message) {
  if (error_code !== 0) {
    print("Motor-Puls: Switch.Set Fehler: " + error_message + " (" + error_code + ")");
    return;
  }
  if (CONFIG.debug) {
    print("Motor-Puls: Relais EIN für " + CONFIG.onSeconds + " s (toggle_after)");
  }
}

function firePulse() {
  if (CONFIG.useTimeWindow && !inNightWindow()) {
    if (CONFIG.debug) {
      let d = new Date();
      print(
        "Motor-Puls: außerhalb Zeitfenster (" +
          d.getHours() +
          ":" +
          d.getMinutes() +
          "), kein Puls"
      );
    }
    return;
  }

  Shelly.call(
    "Switch.Set",
    {
      id: CONFIG.relayId,
      on: true,
      toggle_after: CONFIG.onSeconds,
    },
    onSwitchSetResult
  );
}

function onTick() {
  firePulse();
}

Timer.set(CONFIG.cyclePeriodMs, true, onTick);

if (CONFIG.immediateFirstPulse) {
  firePulse();
}

print(
  "Motor-Puls Rehwild gestartet: alle " +
    CONFIG.cyclePeriodMs / 1000 +
    " s ~" +
    CONFIG.onSeconds +
    " s EIN; Zeitfenster=" +
    CONFIG.useTimeWindow
);
