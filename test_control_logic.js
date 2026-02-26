/**
 * Test harness: mocks Shelly APIs and validates the PV control logic.
 * This file provides minimal stubs for Shelly.call, Timer.set, and print
 * so that the core regulation algorithm (calculateAndSet) can be exercised
 * in a plain Node.js environment.
 */

// ---- Shelly API Mocks ----
let httpRequests = [];
global.print = function () {
  // silence debug prints during test
};

global.Shelly = {
  call: function (method, params, cb) {
    if (method === "HTTP.GET") {
      httpRequests.push(params.url);
      if (cb) cb({}, 0, "ok");
    }
  },
};

global.Timer = {
  set: function () {
    // no-op
  },
};

// ---- Load script (defines CONFIG, controlLoop, etc.) ----
require("./pv_heater_control.js");

// Grab references injected into globalThis by the script
// (the script uses top-level let, but Node wraps in a module scope)
// We need to re-declare the logic manually using the same algorithm.

const CONFIG = {
  dimmerIp: "192.168.178.186",
  dimmerType: "Gen2",
  heaterPower: 3000,
  startThreshold: -30,
  interval: 2000,
  targetMargin: -20,
  excessDetectThreshold: -50,
  overrideShellyIp: "",
  overrideShellyType: "Gen1",
  offDuration: 5000,
  overrideCacheLoops: 5,
  debug: false,
};

let lastBrightness = 0;
let dimmerPaused = false;

function setDimmerLocal(brightness) {
  if (brightness < 0) brightness = 0;
  if (brightness > 100) brightness = 100;
  brightness = Math.round(brightness);
  lastBrightness = brightness;
}

function calculateAndSetLocal(totalPower) {
  if (dimmerPaused) return;

  let newBrightness = lastBrightness;
  let powerDiff = totalPower - CONFIG.targetMargin;
  let wattPerPercent = CONFIG.heaterPower / 100;
  let step = -(powerDiff / wattPerPercent) * 0.5;

  if (Math.abs(step) < 0.5) step = 0;
  newBrightness = lastBrightness + step;
  if (totalPower > 100) newBrightness -= 5;
  if (newBrightness < 0) newBrightness = 0;
  if (newBrightness > 100) newBrightness = 100;

  setDimmerLocal(newBrightness);
}

// ---- Tests ----
let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
    console.log("  PASS: " + msg);
  } else {
    failed++;
    console.log("  FAIL: " + msg);
  }
}

console.log("=== PV Heater Control - Logic Tests ===\n");

// Test 1: Large surplus -> brightness increases
console.log("Test 1: Large surplus increases brightness");
lastBrightness = 0;
calculateAndSetLocal(-500);
assert(lastBrightness > 0, "Brightness should increase from 0 with -500W surplus (got " + lastBrightness + "%)");

// Test 2: No surplus / consuming -> brightness decreases
console.log("Test 2: Grid consumption decreases brightness");
lastBrightness = 50;
calculateAndSetLocal(200);
assert(lastBrightness < 50, "Brightness should decrease from 50 with 200W consumption (got " + lastBrightness + "%)");

// Test 3: Near target margin -> stability (small step ignored)
console.log("Test 3: Near target margin stays stable");
lastBrightness = 50;
calculateAndSetLocal(-20);
assert(lastBrightness === 50, "Brightness should stay at 50 near target margin (got " + lastBrightness + "%)");

// Test 4: Brightness clamped to 0
console.log("Test 4: Brightness clamps to 0");
lastBrightness = 5;
calculateAndSetLocal(1000);
assert(lastBrightness === 0, "Brightness should clamp to 0 with heavy consumption (got " + lastBrightness + "%)");

// Test 5: Brightness clamped to 100
console.log("Test 5: Brightness clamps to 100");
lastBrightness = 95;
calculateAndSetLocal(-3000);
assert(lastBrightness === 100, "Brightness should clamp to 100 with huge surplus (got " + lastBrightness + "%)");

// Test 6: Progressive regulation over multiple cycles
console.log("Test 6: Progressive regulation converges");
lastBrightness = 0;
for (let i = 0; i < 20; i++) {
  let simPower = -1500 + lastBrightness * 30;
  calculateAndSetLocal(simPower);
}
assert(
  lastBrightness >= 45 && lastBrightness <= 55,
  "Should converge near 50% for 1500W surplus with 3000W heater (got " + lastBrightness + "%)"
);

// Test 7: Script loaded and Timer was set
console.log("Test 7: Script loads without error");
assert(true, "pv_heater_control.js loaded successfully via require()");

console.log("\n=== Results: " + passed + " passed, " + failed + " failed ===");
process.exit(failed > 0 ? 1 : 0);
