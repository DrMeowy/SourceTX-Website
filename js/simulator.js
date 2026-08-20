/**
 * SourceTX Surface RC Transmitter & 16-Channel Simulator
 */

(function () {
  // Surface Controls State (-1.0 to 1.0)
  const surfaceControls = {
    steering: 0.0, // Steering Wheel: -1.0 (Full Left) to 1.0 (Full Right)
    throttle: 0.0  // Throttle Trigger: -1.0 (Full Brake/Rev) to 1.0 (Full Throttle)
  };

  // Channels 1 to 16 in Microseconds (1000µs to 2000µs, 1500µs center)
  const channels = new Array(16).fill(1500);

  // Setup Surface Control Draggers (Steering Wheel & Throttle Trigger)
  function setupSurfaceControl(boxId, thumbId, onMove) {
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
    channels[0] = Math.round(1500 + surfaceControls.steering * 500); // CH1: Steering
    channels[1] = Math.round(1500 + surfaceControls.throttle * 500); // CH2: Throttle / Brake

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
    const oledSteer = document.getElementById('oled-steer-val');
    const oledThr = document.getElementById('oled-thr-val');

    if (oledSteer) {
      const steerPct = Math.round(surfaceControls.steering * 100);
      if (steerPct > 2) {
        oledSteer.textContent = `RIGHT ${steerPct}%`;
      } else if (steerPct < -2) {
        oledSteer.textContent = `LEFT ${Math.abs(steerPct)}%`;
      } else {
        oledSteer.textContent = `CENTER (0%)`;
      }
    }

    if (oledThr) {
      const thrPct = Math.round(surfaceControls.throttle * 100);
      if (thrPct > 2) {
        oledThr.textContent = `FWD ${thrPct}%`;
      } else if (thrPct < -2) {
        oledThr.textContent = `BRAKE/REV ${Math.abs(thrPct)}%`;
      } else {
        oledThr.textContent = `NEUTRAL (0%)`;
      }
    }
  }

  // Simulated Telemetry Drift (Battery & LQ)
  function simulateTelemetryDrift() {
    const oledBatt = document.getElementById('oled-batt-val');
    const oledLq = document.getElementById('oled-lq-val');
    const oledRssi = document.getElementById('oled-rssi-val');

    if (oledBatt) {
      const v = (8.2 + Math.sin(Date.now() / 8000) * 0.05).toFixed(2);
      oledBatt.textContent = `${v}V (2S)`;
    }
    if (oledLq) {
      const lq = Math.floor(99 + Math.random() * 2);
      oledLq.textContent = `${lq}% (1:100)`;
    }
    if (oledRssi) {
      const rssi = Math.floor(-64 + Math.random() * 4);
      oledRssi.textContent = `${rssi} dBm`;
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
    setInterval(simulateTelemetryDrift, 1500);
  });
})();
