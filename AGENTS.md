# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

This is a **Shelly IoT embedded script** (`pv_heater_control.js`) for PV surplus energy management. The JavaScript runs on **Shelly Pro 3 EM** device firmware (mJS engine), NOT Node.js. It controls a Shelly dimmer to divert excess solar power to a water heater.

### Key caveats

- **Cannot run end-to-end locally.** The script uses Shelly-specific APIs (`Shelly.call`, `Timer.set`, `print`) unavailable in Node.js. Full end-to-end testing requires physical Shelly hardware on a local network.
- **No package manager or dependencies.** There is no `package.json`, no `node_modules`, and no build step.
- **Documentation is in German** (README.md, plan.md).

### Lint

```sh
jshint pv_heater_control.js
```

Requires `jshint` installed globally (`npm install -g jshint`). A `.jshintrc` config is provided with ES6 mode and Shelly globals declared.

### Test

```sh
node test_control_logic.js
```

Runs the core regulation logic (`calculateAndSet`) under a mock Shelly environment in Node.js. Validates brightness regulation, clamping, convergence, and stability near target margin.

### Deployment (to hardware)

See `README.md` — paste the script into the Shelly Pro 3 EM web UI script editor at `http://192.168.178.185`, then click Save & Start.
