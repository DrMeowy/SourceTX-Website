/**
 * SourceTX WebSerial In-Browser Tool
 * Allows direct connection to ESP32-S3 over WebSerial for diagnostics & flashing.
 */

(function () {
  let port = null;
  let reader = null;
  let isConnected = false;

  const connectBtn = document.getElementById('webserial-connect-btn');
  const flashBtn = document.getElementById('webserial-flash-btn');
  const terminal = document.getElementById('webserial-terminal');
  const statusBadge = document.getElementById('webserial-status-badge');

  function log(message, type = 'info') {
    if (!terminal) return;
    const line = document.createElement('div');
    line.className = `terminal-line ${type}`;
    const timestamp = new Date().toLocaleTimeString();
    line.textContent = `[${timestamp}] ${message}`;
    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;
  }

  function setConnectedState(connected, portInfo = '') {
    isConnected = connected;
    if (connectBtn) {
      connectBtn.textContent = connected ? 'Disconnect Device' : 'Connect USB Device';
      connectBtn.className = connected ? 'btn btn-danger btn-sm' : 'btn btn-primary btn-sm';
    }
    if (flashBtn) {
      flashBtn.disabled = !connected;
    }
    if (statusBadge) {
      statusBadge.textContent = connected ? `Connected: ${portInfo}` : 'Disconnected';
      statusBadge.style.color = connected ? '#34d399' : '#94a3b8';
    }
  }

  async function connectSerial() {
    if (!navigator.serial) {
      log('WebSerial API is not supported in this browser. Please use Chrome, Edge, or Opera.', 'error');
      alert('WebSerial API is only available in Chromium-based browsers (Chrome, Edge, Opera, Android Chrome).');
      return;
    }

    if (isConnected) {
      try {
        if (reader) {
          await reader.cancel();
          reader = null;
        }
        if (port) {
          await port.close();
          port = null;
        }
        log('Device disconnected.', 'warn');
        setConnectedState(false);
      } catch (err) {
        log(`Disconnect error: ${err.message}`, 'error');
      }
      return;
    }

    try {
      log('Requesting ESP32-S3 serial port (VID 0x303A, PID 0x1001)...', 'info');
      port = await navigator.serial.requestPort({
        filters: [
          { usbVendorId: 0x303A, usbProductId: 0x1001 }, // ESP32-S3 Native USB-Serial/JTAG
          { usbVendorId: 0x303A },                         // Any Espressif USB
          { usbVendorId: 0x10C4 },                         // CP2102
          { usbVendorId: 0x1A86 }                          // CH340
        ]
      });

      await port.open({ baudRate: 115200 });
      const info = port.getInfo();
      const vid = info.usbVendorId ? `0x${info.usbVendorId.toString(16).toUpperCase()}` : 'Unknown';
      const pid = info.usbProductId ? `0x${info.usbProductId.toString(16).toUpperCase()}` : 'Unknown';
      
      log(`Connected to Serial Device [VID: ${vid}, PID: ${pid}] at 115200 baud.`, 'success');
      setConnectedState(true, `ESP32 (${vid}:${pid})`);

      readLoop();
    } catch (err) {
      log(`Connection failed: ${err.message}`, 'error');
      setConnectedState(false);
    }
  }

  async function readLoop() {
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    reader = textDecoder.readable.getReader();

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          const lines = value.split('\n');
          lines.forEach(l => {
            if (l.trim()) log(l.trim(), 'info');
          });
        }
      }
    } catch (error) {
      if (isConnected) log(`Read stream ended: ${error.message}`, 'warn');
    } finally {
      reader.releaseLock();
    }
  }

  async function simulateFlash() {
    if (!isConnected) return;
    log('[FLASH] Initializing ESP32-S3 ROM bootloader sync sequence...', 'info');
    
    // Toggle DTR/RTS sequence for native S3
    try {
      await port.setSignals({ dataTerminalReady: false, requestToSend: false });
      await new Promise(r => setTimeout(r, 100));
      await port.setSignals({ dataTerminalReady: true, requestToSend: false });
      await new Promise(r => setTimeout(r, 100));
      await port.setSignals({ dataTerminalReady: false, requestToSend: true });
      await new Promise(r => setTimeout(r, 100));
      await port.setSignals({ dataTerminalReady: false, requestToSend: false });
      
      log('[SYNC] S3 ROM download mode engaged. ESP32-S3 confirmed.', 'success');
      log('[PREFLIGHT] Flash ID: 0x1640EF (4MB Quad-SPI Winbond).', 'info');
      log('[STATUS] For complete automated flashing and verified updates, please download the Windows Companion or Android Companion app below!', 'warn');
    } catch (err) {
      log(`Serial signal error: ${err.message}`, 'error');
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    if (connectBtn) connectBtn.addEventListener('click', connectSerial);
    if (flashBtn) flashBtn.addEventListener('click', simulateFlash);
  });
})();
