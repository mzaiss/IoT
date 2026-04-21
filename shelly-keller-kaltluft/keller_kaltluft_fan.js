/**
 * Shelly Script: Keller-Kaltluft (Shelly 1 Gen3 + Sensor-Add-on)
 *
 * Vergleicht zwei Temperaturfühler (Add-on, typisch id 100 und 101).
 * Wenn Fühler 100 mindestens deltaC kälter ist als Fühler 101, geht das Relais AN
 * (z. B. Lüfter für kalte Außen-/Zuluft in den Keller). Sonst AUS.
 *
 * Kleine Hysterese verhindert schnelles Klappern am Schwellwert.
 * Bei Lesefehler oder ungültigen Werten: Relais AUS (Fail-safe).
 */

let CONFIG = {
  // DS18B20 / Add-on: erste und zweite Temperatur-Komponente
  tempColdId: 100,
  tempWarmId: 101,

  // Relais-Index (Shelly 1: meist 0)
  relayId: 0,

  // Mindest-Differenz: (tempWarm - tempCold) >= deltaC → EIN
  // Entspricht: tempCold <= tempWarm - deltaC
  deltaC: 3.0,

  // Hysterese in K (Schaltband), z. B. 0.3 = erst wieder AUS wenn Differenz um 0.3 K gesunken
  hysteresisC: 0.3,

  // Prüfintervall in Millisekunden
  intervalMs: 60000,

  debug: true,
};

let relayOn = false;

function log(msg) {
  if (CONFIG.debug) {
    print("Keller-Kaltluft: " + msg);
  }
}

function readTempC(id, callback) {
  Shelly.call(
    "Temperature.GetStatus",
    { id: id },
    function (result, error_code, error_message) {
      if (error_code !== 0) {
        callback(null, "Temperature.GetStatus id=" + id + ": " + error_message + " (" + error_code + ")");
        return;
      }
      if (typeof result.tC === "undefined" || result.tC === null) {
        callback(null, "Temperature id=" + id + ": tC ungültig/null");
        return;
      }
      callback(result.tC, null);
    }
  );
}

function setRelay(wantOn, reason) {
  if (wantOn === relayOn) {
    return;
  }

  Shelly.call(
    "Switch.Set",
    { id: CONFIG.relayId, on: wantOn },
    function (result, error_code, error_message) {
      if (error_code !== 0) {
        log("Switch.Set Fehler: " + error_message + " (" + error_code + ")");
        return;
      }
      relayOn = wantOn;
      log("Relais " + (wantOn ? "EIN" : "AUS") + (reason ? " (" + reason + ")" : ""));
    }
  );
}

function forceRelayOff(reason) {
  setRelay(false, reason || "Fail-safe");
}

function evaluateDiff(tCold, tWarm) {
  let diff = tWarm - tCold;

  if (!relayOn) {
    if (diff >= CONFIG.deltaC) {
      setRelay(true, "diff=" + diff.toFixed(2) + "K ≥ " + CONFIG.deltaC);
    } else {
      log("bleibt AUS: diff=" + diff.toFixed(2) + "K < " + CONFIG.deltaC);
    }
  } else {
    if (diff <= CONFIG.deltaC - CONFIG.hysteresisC) {
      setRelay(false, "diff=" + diff.toFixed(2) + "K ≤ " + (CONFIG.deltaC - CONFIG.hysteresisC).toFixed(2));
    } else {
      log("bleibt AN: diff=" + diff.toFixed(2) + "K");
    }
  }
}

function onTick() {
  readTempC(CONFIG.tempColdId, function (tCold, errCold) {
    if (errCold) {
      log(errCold);
      forceRelayOff("Sensor kalt");
      return;
    }

    readTempC(CONFIG.tempWarmId, function (tWarm, errWarm) {
      if (errWarm) {
        log(errWarm);
        forceRelayOff("Sensor warm");
        return;
      }

      log(
        "T" +
          CONFIG.tempColdId +
          "=" +
          tCold.toFixed(2) +
          "°C, T" +
          CONFIG.tempWarmId +
          "=" +
          tWarm.toFixed(2) +
          "°C"
      );
      evaluateDiff(tCold, tWarm);
    });
  });
}

Timer.set(CONFIG.intervalMs, true, onTick);

print(
  "Keller-Kaltluft gestartet: alle " +
    CONFIG.intervalMs / 1000 +
    " s; EIN wenn T" +
    CONFIG.tempWarmId +
    " - T" +
    CONFIG.tempColdId +
    " ≥ " +
    CONFIG.deltaC +
    "K (Hysterese " +
    CONFIG.hysteresisC +
    "K)"
);

onTick();
