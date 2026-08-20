/**
 * SourceTX 1:1 Pixel-Accurate Firmware Display & 12-Channel Real-Time Simulator
 */

(function () {
  // Surface Controls State (-1.0 to 1.0)
  const surfaceControls = {
    steering: 0.0, // Steering Wheel: -1.0 (Full Left) to 1.0 (Full Right)
    throttle: 0.0, // Throttle Trigger: -1.0 (Full Brake/Rev) to 1.0 (Full Throttle)
    gearHigh: false,
    diffLock: 0,   // 0: Open, 1: Front, 2: Both
    mode4ws: 1,    // 1: Front, 2: Opposite, 3: Crab
    lightsOn: false,
    stTrim: 0,
    thTrim: 0
  };

  // Channels 1 to 16 in Microseconds (1000µs to 2000µs, 1500µs center)
  const channels = new Array(16).fill(1500);
  channels[2] = 1000; // CH3 (2-Speed Shift): Low Gear default
  channels[6] = 1000; // CH7 (Lights): Off default

  // Timer State
  let timer1Seconds = 525; // 08:45
  let timer1Running = false;

  // Setup Surface Control Draggers (Steering Wheel & Throttle Trigger)
  function setupSurfaceControl(boxId, thumbId, onMove) {
    const box = document.getElementById(boxId);
    const thumb = document.getElementById(thumbId);
    if (!box || !thumb) return;

    let isDragging = false;
    const radius = 32; // Max displacement in pixels

    function handlePointer(clientX, clientY) {
      const rect = box.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let dx = clientX - centerX;
      let dy = clientY - centerY;

      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius) {
        dx = (dx / dist) * radius;
        dy = (dy / dist) * radius;
      }

      thumb.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

      const normX = dx / radius;
      const normY = -dy / radius; // Invert Y so pushing forward is positive
      onMove(normX, normY);
      updateOutputs();
    }

    function resetToCenter() {
      isDragging = false;
      thumb.style.transform = `translate(-50%, -50%)`;
      onMove(0, 0);
      updateOutputs();
    }

    box.addEventListener('mousedown', (e) => {
      isDragging = true;
      handlePointer(e.clientX, e.clientY);
    });

    window.addEventListener('mousemove', (e) => {
      if (isDragging) handlePointer(e.clientX, e.clientY);
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) resetToCenter();
    });

    // Touch Support for Mobile / Tablets
    box.addEventListener('touchstart', (e) => {
      isDragging = true;
      const touch = e.touches[0];
      handlePointer(touch.clientX, touch.clientY);
      e.preventDefault();
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (isDragging && e.touches.length > 0) {
        const touch = e.touches[0];
        handlePointer(touch.clientX, touch.clientY);
      }
    }, { passive: false });

    window.addEventListener('touchend', () => {
      if (isDragging) resetToCenter();
    });
  }

  function updateOutputs() {
    // Map Surface Inputs to Microseconds (1000µs to 2000µs)
    channels[0] = Math.round(1500 + surfaceControls.stTrim + surfaceControls.steering * 500); // CH1: Steering
    channels[1] = Math.round(1500 + surfaceControls.thTrim + surfaceControls.throttle * 500); // CH2: Throttle / Brake
    channels[2] = surfaceControls.gearHigh ? 2000 : 1000;                                     // CH3: 2-Speed Gear
    channels[3] = surfaceControls.diffLock === 0 ? 1000 : (surfaceControls.diffLock === 1 ? 1500 : 2000); // CH4: Diff
    channels[4] = surfaceControls.mode4ws === 1 ? 1500 : (surfaceControls.mode4ws === 2 ? 2000 : 1000);   // CH5: 4WS
    channels[6] = surfaceControls.lightsOn ? 2000 : 1000;                                     // CH7: Lights

    // Check throttle timer auto-trigger
    timer1Running = Math.abs(surfaceControls.throttle) > 0.05;

    // Update Bottom Full 16-Channel Bars
    for (let i = 0; i < 16; i++) {
      const valElem = document.getElementById(`ch-val-${i + 1}`);
      const barElem = document.getElementById(`ch-bar-${i + 1}`);
      if (valElem && barElem) {
        const us = channels[i];
        valElem.textContent = `${us}µs`;
        const percent = ((us - 1000) / 1000) * 100;
        barElem.style.width = `${Math.min(100, Math.max(0, percent))}%`;
      }
    }

    // Update 1:1 On-Screen TFT 12-Channel Vertical Bars
    for (let i = 0; i < 12; i++) {
      const vfill = document.getElementById(`vch-fill-${i + 1}`);
      if (vfill) {
        const us = channels[i];
        const percent = ((us - 1000) / 1000) * 100;
        vfill.style.height = `${Math.min(100, Math.max(0, percent))}%`;
      }
    }

    // Update Timer Status Label
    const timerStatus = document.getElementById('stx-timer-status');
    if (timerStatus) {
      timerStatus.textContent = timer1Running ? 'RUNNING' : 'STOPPED';
      timerStatus.style.color = timer1Running ? '#83b94b' : '#a0a2a6';
    }
  }

  // 1:1 Screen Overlays (TRIM, EXPO, SERVO, MIXERS, GARAGE, SETTINGS)
  window.openStxOverlay = function (overlayId) {
    document.querySelectorAll('.stx-screen-overlay').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(`stx-overlay-${overlayId}`);
    if (target) target.classList.add('active');
  };

  window.closeStxOverlay = function () {
    document.querySelectorAll('.stx-screen-overlay').forEach(el => el.classList.remove('active'));
  };

  window.adjustStxTrim = function (type, amount) {
    if (type === 'st') {
      surfaceControls.stTrim = amount === 0 ? 0 : surfaceControls.stTrim + amount;
      const elem = document.getElementById('stx-trim-st-lbl');
      if (elem) elem.textContent = `${surfaceControls.stTrim >= 0 ? '+' : ''}${surfaceControls.stTrim} µs (${surfaceControls.stTrim === 0 ? 'CENTER' : (surfaceControls.stTrim > 0 ? 'RIGHT' : 'LEFT')})`;
    } else if (type === 'th') {
      surfaceControls.thTrim = amount === 0 ? 0 : surfaceControls.thTrim + amount;
      const elem = document.getElementById('stx-trim-th-lbl');
      if (elem) elem.textContent = `${surfaceControls.thTrim >= 0 ? '+' : ''}${surfaceControls.thTrim} µs (${surfaceControls.thTrim === 0 ? 'NEUTRAL' : (surfaceControls.thTrim > 0 ? 'FWD' : 'REV')})`;
    }
    updateOutputs();
  };

  window.setStx4ws = function (mode) {
    surfaceControls.mode4ws = mode;
    document.getElementById('btn-stx-4ws-1').classList.toggle('active', mode === 1);
    document.getElementById('btn-stx-4ws-2').classList.toggle('active', mode === 2);
    document.getElementById('btn-stx-4ws-3').classList.toggle('active', mode === 3);
    updateOutputs();
  };

  window.setStxDiff = function (mode) {
    surfaceControls.diffLock = mode;
    document.getElementById('btn-stx-diff-1').classList.toggle('active', mode === 0);
    document.getElementById('btn-stx-diff-2').classList.toggle('active', mode === 1);
    document.getElementById('btn-stx-diff-3').classList.toggle('active', mode === 2);
    updateOutputs();
  };

  window.selectStxModel = function (name, desc) {
    document.getElementById('stx-head-model').textContent = name;
    document.getElementById('stx-card-model-name').textContent = name;
    document.getElementById('stx-card-model-desc').textContent = desc;
    closeStxOverlay();
  };

  window.toggleStxGear = function () {
    surfaceControls.gearHigh = !surfaceControls.gearHigh;
    const btn = document.getElementById('btn-stx-gear');
    if (btn) {
      btn.textContent = `Gear: ${surfaceControls.gearHigh ? 'HIGH (Fast)' : 'LOW'}`;
      btn.classList.toggle('active', surfaceControls.gearHigh);
    }
    updateOutputs();
  };

  window.toggleStxDiff = function () {
    surfaceControls.diffLock = (surfaceControls.diffLock + 1) % 3;
    const btn = document.getElementById('btn-stx-diff');
    const names = ['Diff: OPEN', 'Diff: FRONT LOCK', 'Diff: BOTH LOCKED'];
    if (btn) {
      btn.textContent = names[surfaceControls.diffLock];
      btn.classList.toggle('active', surfaceControls.diffLock > 0);
    }
    updateOutputs();
  };

  window.toggleStxLights = function () {
    surfaceControls.lightsOn = !surfaceControls.lightsOn;
    const btn = document.getElementById('btn-stx-lgt');
    if (btn) {
      btn.textContent = `Lights: ${surfaceControls.lightsOn ? 'ON' : 'OFF'}`;
      btn.classList.toggle('active', surfaceControls.lightsOn);
    }
    updateOutputs();
  };

  // Clock & Telemetry Loop
  function tickClockAndTelemetry() {
    // Clock & Date (Format: 06:30 PM | AUG 20, 2026)
    const now = new Date();
    const clockElem = document.getElementById('stx-head-clock');
    const dateElem = document.getElementById('stx-head-date');
    if (clockElem) {
      clockElem.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toUpperCase();
    }
    if (dateElem) {
      dateElem.textContent = now.toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase();
    }

    // Timer 1 Running
    if (timer1Running) {
      timer1Seconds++;
      const m = String(Math.floor(timer1Seconds / 60)).padStart(2, '0');
      const s = String(timer1Seconds % 60).padStart(2, '0');
      const tElem = document.getElementById('stx-timer-1-val');
      if (tElem) tElem.textContent = `${m}:${s}`;
    }

    // Voltage & Signal Micro-fluctuations
    const txBattHead = document.getElementById('stx-head-batt');
    const txBattVal = document.getElementById('stx-batt-tx-val');
    const rxBattVal = document.getElementById('stx-batt-rx-val');
    const rssiVal = document.getElementById('stx-rssi-val');

    if (txBattHead && txBattVal) {
      const v = (8.1 + Math.sin(Date.now() / 9000) * 0.05).toFixed(1);
      txBattHead.textContent = `${v}V`;
      txBattVal.textContent = `${v}V`;
    }
    if (rxBattVal) {
      const v = (11.4 + Math.sin(Date.now() / 7000) * 0.08).toFixed(1);
      rxBattVal.textContent = `${v}V`;
    }
    if (rssiVal) {
      const rssi = Math.floor(-64 + Math.random() * 3);
      rssiVal.textContent = `RSSI ${rssi}`;
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    // Left Control: Steering Wheel (X-Axis)
    setupSurfaceControl('left-stick-area', 'left-stick-thumb', (x, y) => {
      surfaceControls.steering = x;
    });

    // Right Control: Throttle / Brake Trigger (Y-Axis)
    setupSurfaceControl('right-stick-area', 'right-stick-thumb', (x, y) => {
      surfaceControls.throttle = y;
    });

    updateOutputs();
    setInterval(tickClockAndTelemetry, 1000);
  });
})();
