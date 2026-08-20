/**
 * SourceTX Live Interactive Transmitter & Channel Simulator
 */

(function () {
  // Stick States (-1.0 to 1.0)
  const sticks = {
    yaw: 0.0,      // Left Stick X (CH4)
    throttle: 0.0, // Left Stick Y (CH3: 0.0 to 1.0)
    roll: 0.0,     // Right Stick X (CH1)
    pitch: 0.0     // Right Stick Y (CH2)
  };

  // Channels 1 to 16 in Microseconds (988us to 2012us)
  const channels = new Array(16).fill(1500);
  channels[2] = 988; // Throttle down by default

  // Setup Gimbal Draggers
  function setupGimbal(boxId, thumbId, onMove, springReturnY = true) {
    const box = document.getElementById(boxId);
    const thumb = document.getElementById(thumbId);
    if (!box || !thumb) return;

    let isDragging = false;
    const radius = 40; // Max displacement in pixels

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
      const normY = -dy / radius; // Invert Y so up is positive
      onMove(normX, normY);
      updateOutputs();
    }

    function resetStick() {
      isDragging = false;
      const returnY = springReturnY ? 0 : (sticks.throttle * 2 - 1) * -radius;
      thumb.style.transform = `translate(-50%, calc(-50% + ${returnY}px))`;
      if (springReturnY) {
        onMove(0, 0);
      } else {
        onMove(0, sticks.throttle * 2 - 1);
      }
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
      if (isDragging) resetStick();
    });

    // Touch Support
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
      if (isDragging) resetStick();
    });
  }

  function updateOutputs() {
    // Map normalized sticks (-1.0 to 1.0) to Microseconds (988 to 2012)
    channels[0] = Math.round(1500 + sticks.roll * 512);     // CH1: Roll
    channels[1] = Math.round(1500 + sticks.pitch * 512);    // CH2: Pitch
    channels[2] = Math.round(988 + sticks.throttle * 1024); // CH3: Throttle (988 to 2012)
    channels[3] = Math.round(1500 + sticks.yaw * 512);      // CH4: Yaw

    // Update Channel UI Bars
    for (let i = 0; i < 16; i++) {
      const valElem = document.getElementById(`ch-val-${i + 1}`);
      const barElem = document.getElementById(`ch-bar-${i + 1}`);
      if (valElem && barElem) {
        const us = channels[i];
        valElem.textContent = `${us}µs`;
        const percent = ((us - 988) / (2012 - 988)) * 100;
        barElem.style.width = `${Math.min(100, Math.max(0, percent))}%`;
      }
    }

    // Update OLED HUD Telemetry
    const oledThrottle = document.getElementById('oled-thr-val');
    const oledRoll = document.getElementById('oled-roll-val');
    const oledPitch = document.getElementById('oled-pitch-val');
    const oledYaw = document.getElementById('oled-yaw-val');

    if (oledThrottle) oledThrottle.textContent = `${Math.round(sticks.throttle * 100)}%`;
    if (oledRoll) oledRoll.textContent = `${Math.round(sticks.roll * 100)}%`;
    if (oledPitch) oledPitch.textContent = `${Math.round(sticks.pitch * 100)}%`;
    if (oledYaw) oledYaw.textContent = `${Math.round(sticks.yaw * 100)}%`;
  }

  // Simulated Telemetry Drift (Battery & LQ)
  function simulateTelemetryDrift() {
    const oledBatt = document.getElementById('oled-batt-val');
    const oledLq = document.getElementById('oled-lq-val');
    const oledRssi = document.getElementById('oled-rssi-val');

    if (oledBatt) {
      const v = (8.2 + Math.sin(Date.now() / 8000) * 0.05).toFixed(2);
      oledBatt.textContent = `${v}V`;
    }
    if (oledLq) {
      const lq = Math.floor(99 + Math.random() * 2);
      oledLq.textContent = `${lq}% (1:100)`;
    }
    if (oledRssi) {
      const rssi = Math.floor(-68 + Math.random() * 4);
      oledRssi.textContent = `${rssi} dBm`;
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    // Left Stick: Throttle (Y) + Yaw (X)
    setupGimbal('left-stick-area', 'left-stick-thumb', (x, y) => {
      sticks.yaw = x;
      sticks.throttle = (y + 1) / 2; // Map -1..1 to 0..1
    }, false);

    // Right Stick: Roll (X) + Pitch (Y)
    setupGimbal('right-stick-area', 'right-stick-thumb', (x, y) => {
      sticks.roll = x;
      sticks.pitch = y;
    }, true);

    updateOutputs();
    setInterval(simulateTelemetryDrift, 1500);
  });
})();
