/**
 * SourceTX Surface RC Transmitter & Authentic LVGL On-Device Simulator
 */

(function () {
  // Surface Controls State (-1.0 to 1.0)
  const surfaceControls = {
    steering: 0.0, // Steering Wheel: -1.0 (Full Left) to 1.0 (Full Right)
    throttle: 0.0, // Throttle Trigger: -1.0 (Full Brake/Rev) to 1.0 (Full Throttle)
    gearHigh: false,
    diffLock: 0,   // 0: Open, 1: Front, 2: Both
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
    const radius = 35; // Max displacement in pixels

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

    // Update On-Screen LVGL Mini Channel Bars (CH1 to CH8)
    for (let i = 0; i < 8; i++) {
      const miniVal = document.getElementById(`mini-ch-val-${i + 1}`);
      const miniBar = document.getElementById(`mini-ch-bar-${i + 1}`);
      if (miniVal && miniBar) {
        const us = channels[i];
        miniVal.textContent = us;
        const percent = ((us - 1000) / 1000) * 100;
        miniBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
      }
    }

    // Update Simulated Speed based on Throttle
    const speedElem = document.getElementById('lvgl-speed');
    if (speedElem) {
      const topSpeed = surfaceControls.gearHigh ? 42.0 : 18.4;
      const currentSpeed = (Math.max(0, surfaceControls.throttle) * topSpeed).toFixed(1);
      speedElem.textContent = `${currentSpeed} km/h`;
    }
  }

  // LVGL Overlay Handlers
  window.openLvglOverlay = function (overlayId) {
    document.querySelectorAll('.lvgl-overlay').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(`overlay-${overlayId}`);
    if (target) target.classList.add('active');
  };

  window.closeLvglOverlay = function () {
    document.querySelectorAll('.lvgl-overlay').forEach(el => el.classList.remove('active'));
  };

  window.adjustTrim = function (type, amount) {
    if (type === 'st') {
      surfaceControls.stTrim = amount === 0 ? 0 : surfaceControls.stTrim + amount;
      const elem = document.getElementById('trim-st-val');
      if (elem) elem.textContent = `${surfaceControls.stTrim >= 0 ? '+' : ''}${surfaceControls.stTrim} µs (${surfaceControls.stTrim === 0 ? 'Center' : (surfaceControls.stTrim > 0 ? 'Right' : 'Left')})`;
    } else if (type === 'th') {
      surfaceControls.thTrim = amount === 0 ? 0 : surfaceControls.thTrim + amount;
      const elem = document.getElementById('trim-th-val');
      if (elem) elem.textContent = `${surfaceControls.thTrim >= 0 ? '+' : ''}${surfaceControls.thTrim} µs (${surfaceControls.thTrim === 0 ? 'Neutral' : (surfaceControls.thTrim > 0 ? 'Fwd' : 'Rev')})`;
    }
    updateOutputs();
  };

  window.set4wsMode = function (mode) {
    alert(`SourceTX 4WS Mode set to: ${mode}`);
    document.getElementById('btn-4ws-front').classList.toggle('active', mode === 'Front Only');
    document.getElementById('btn-4ws-opp').classList.toggle('active', mode === 'Opposite/Circle');
    document.getElementById('btn-4ws-crab').classList.toggle('active', mode === 'Crab Crawl');
  };

  window.setDiffMode = function (mode) {
    alert(`SourceTX Diff Lock set to: ${mode}`);
  };

  window.selectModel = function (name, desc) {
    document.getElementById('lvgl-header-model').textContent = name;
    document.getElementById('lvgl-card-model').textContent = name;
    closeLvglOverlay();
  };

  window.toggle2Speed = function () {
    surfaceControls.gearHigh = !surfaceControls.gearHigh;
    const btn = document.getElementById('btn-shift-toggle');
    if (btn) {
      btn.textContent = `Gear: ${surfaceControls.gearHigh ? 'HIGH (Fast)' : 'LOW (Torque)'}`;
      btn.classList.toggle('active', surfaceControls.gearHigh);
    }
    updateOutputs();
  };

  window.toggleDiffLock = function () {
    surfaceControls.diffLock = (surfaceControls.diffLock + 1) % 3;
    const btn = document.getElementById('btn-diff-toggle');
    const names = ['Diff: OPEN', 'Diff: FRONT LOCK', 'Diff: BOTH LOCKED'];
    if (btn) {
      btn.textContent = names[surfaceControls.diffLock];
      btn.classList.toggle('active', surfaceControls.diffLock > 0);
    }
    updateOutputs();
  };

  window.toggleLights = function () {
    surfaceControls.lightsOn = !surfaceControls.lightsOn;
    const btn = document.getElementById('btn-lights-toggle');
    if (btn) {
      btn.textContent = `Lights: ${surfaceControls.lightsOn ? 'ON (High Beam)' : 'OFF'}`;
      btn.classList.toggle('active', surfaceControls.lightsOn);
    }
    updateOutputs();
  };

  // Clock & Telemetry Loop
  function tickClockAndTelemetry() {
    // Clock
    const now = new Date();
    const clockElem = document.getElementById('lvgl-clock-time');
    if (clockElem) {
      clockElem.textContent = now.toTimeString().substring(0, 5);
    }

    // Timer
    if (timer1Running) {
      timer1Seconds++;
      const m = String(Math.floor(timer1Seconds / 60)).padStart(2, '0');
      const s = String(timer1Seconds % 60).padStart(2, '0');
      const tElem = document.getElementById('lvgl-timer-1');
      if (tElem) tElem.textContent = `${m}:${s}`;
    }

    // Telemetry Drift
    const txBatt = document.getElementById('lvgl-tx-batt');
    const rxBatt = document.getElementById('lvgl-rx-batt');
    const rssiLq = document.getElementById('lvgl-rssi-lq');

    if (txBatt) {
      const v = (7.84 + Math.sin(Date.now() / 9000) * 0.04).toFixed(2);
      txBatt.textContent = `${v}V`;
    }
    if (rxBatt) {
      const v = (11.4 + Math.sin(Date.now() / 7000) * 0.08).toFixed(1);
      rxBatt.textContent = `${v}V (3S)`;
    }
    if (rssiLq) {
      const rssi = Math.floor(-64 + Math.random() * 3);
      rssiLq.textContent = `${rssi}dBm (100%)`;
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
