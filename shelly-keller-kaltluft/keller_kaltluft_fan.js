// Keller-Kaltluft: Shelly 1 Gen3 + Sensor-Add-on (Temp id 100/101).
// Relais EIN wenn (T101 - T100) >= deltaC. Hysterese + Fail-safe AUS.
// Wichtig: komplettes Script kopieren (bis letzte Zeile).

let CONFIG = {
  tempColdId: 100,
  tempWarmId: 101,
  relayId: 0,
  deltaC: 3.0,
  hysteresisC: 0.3,
  intervalMs: 60000,
  debug: true,
};

let relayOn = false;

function log(msg) {
  if (CONFIG.debug) print("Keller-Kaltluft: " + msg);
}

function readTempC(id, cb) {
  Shelly.call("Temperature.GetStatus", { id: id }, function (r, ec, em) {
    if (ec !== 0) {
      cb(null, "Temp.GetStatus id=" + id + ": " + em + " (" + ec + ")");
      return;
    }
    if (typeof r.tC === "undefined" || r.tC === null) {
      cb(null, "Temp id=" + id + ": tC null");
      return;
    }
    cb(r.tC, null);
  });
}

function setRelay(wantOn, reason) {
  if (wantOn === relayOn) return;
  Shelly.call("Switch.Set", { id: CONFIG.relayId, on: wantOn }, function (r, ec, em) {
    if (ec !== 0) {
      log("Switch.Set: " + em + " (" + ec + ")");
      return;
    }
    relayOn = wantOn;
    log("Relais " + (wantOn ? "EIN" : "AUS") + (reason ? " (" + reason + ")" : ""));
  });
}

function forceRelayOff(reason) {
  setRelay(false, reason || "Fail-safe");
}

function evaluateDiff(tCold, tWarm) {
  let diff = tWarm - tCold;
  if (!relayOn) {
    if (diff >= CONFIG.deltaC) {
      setRelay(true, "diff=" + diff.toFixed(2) + "K >= " + CONFIG.deltaC);
    } else {
      log("AUS: diff=" + diff.toFixed(2) + "K < " + CONFIG.deltaC);
    }
  } else {
    let offThr = CONFIG.deltaC - CONFIG.hysteresisC;
    if (diff <= offThr) {
      setRelay(false, "diff=" + diff.toFixed(2) + "K <= " + offThr.toFixed(2));
    } else {
      log("AN: diff=" + diff.toFixed(2) + "K");
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
          "C, T" +
          CONFIG.tempWarmId +
          "=" +
          tWarm.toFixed(2) +
          "C"
      );
      evaluateDiff(tCold, tWarm);
    });
  });
}

Timer.set(CONFIG.intervalMs, true, onTick);
print(
  "Keller-Kaltluft: " +
    CONFIG.intervalMs / 1000 +
    "s; EIN wenn T" +
    CONFIG.tempWarmId +
    "-T" +
    CONFIG.tempColdId +
    ">=" +
    CONFIG.deltaC +
    "K, Hyst " +
    CONFIG.hysteresisC +
    "K"
);
onTick();
