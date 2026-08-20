const FACTORY_MANIFEST_URL =
  "https://github.com/DrMeowy/SourceTX-Updates/releases/latest/download/factory.json";
const STABLE_MANIFEST_URL =
  "https://github.com/DrMeowy/SourceTX-Updates/releases/latest/download/stable.json";
const SOURCE_REPOSITORY = "DrMeowy/SourceTX-Updates";
const SOURCE_HARDWARE_ID = "sourcetx-s3-st7796-ft6x36";
const ESPTOOL_MODULE_URL = "https://cdn.jsdelivr.net/npm/esptool-js@0.6.0/+esm";
const PUBLIC_KEY_DER_BASE64 =
  "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEmeyz/UyEd597cKsYeiR6dl92YAAemmH+O+ZY8Yz7NQKVRTYmS5DpJaNYdxnThRPEw2F2ie1yVvr7oXTaHJYrgw==";
const MAX_FIRMWARE_BYTES = 4 * 1024 * 1024;
const MAX_MANIFEST_BYTES = 64 * 1024;
const MAX_SIGNATURE_BYTES = 256;
const HW_PREFIX = "SOURCETX_HW:";

const CONFIG_ORDER = [
  "SCHEMA", "DISP_MOSI", "DISP_SCLK", "DISP_MISO", "DISP_CS", "DISP_DC",
  "DISP_RST", "DISP_BL", "I2C_SDA", "I2C_SCL", "TOUCH_INT", "TOUCH_RST",
  "TOUCH_ADDR", "INA_ADDR", "NAV_U", "NAV_D", "NAV_L", "NAV_R", "NAV_OK",
  "STEER", "THROT", "CRSF", "STAT_MODE", "STAT_MONO", "STAT_R", "STAT_G",
  "STAT_B", "STAT_BRIGHT", "SND_MODE", "SND_PIN", "VOICE_RX", "VIB_PIN",
];
const CONFIG_FIELDS = CONFIG_ORDER.filter(function (key) { return key !== "SCHEMA"; });
const PIN_KEYS = CONFIG_ORDER.filter(function (key) {
  return key !== "SCHEMA" && key !== "TOUCH_ADDR" && key !== "INA_ADDR" &&
    key !== "STAT_MODE" && key !== "STAT_BRIGHT" && key !== "SND_MODE";
});
const SAFE_GPIOS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 21, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 47, 48];
const ANALOG_GPIOS = [1, 4, 5, 6, 15, 16, 17, 18];
const ANALOG_KEYS = new Set(["STEER", "THROT"]);

const DEFAULT_PROFILE = {
  SCHEMA: 1, DISP_MOSI: 7, DISP_SCLK: 2, DISP_MISO: -1, DISP_CS: 14,
  DISP_DC: 13, DISP_RST: 10, DISP_BL: 3, I2C_SDA: 8, I2C_SCL: 9,
  TOUCH_INT: 12, TOUCH_RST: 11, TOUCH_ADDR: 0x38, INA_ADDR: 0x40,
  NAV_U: 35, NAV_D: 36, NAV_L: 37, NAV_R: 38, NAV_OK: 39, STEER: -1,
  THROT: -1, CRSF: 42, STAT_MODE: 0, STAT_MONO: -1, STAT_R: -1,
  STAT_G: -1, STAT_B: -1, STAT_BRIGHT: 60, SND_MODE: 0, SND_PIN: -1,
  VOICE_RX: -1, VIB_PIN: -1,
};

const CONFIG_GROUPS = [
  {
    title: "Display and touch",
    fields: [
      ["DISP_MOSI", "Display MOSI", "pin"], ["DISP_SCLK", "Display clock", "pin"],
      ["DISP_MISO", "Display MISO", "pin"], ["DISP_CS", "Display CS", "pin"],
      ["DISP_DC", "Display data / command", "pin"], ["DISP_RST", "Display reset", "pin"],
      ["DISP_BL", "Display backlight", "pin"], ["I2C_SDA", "I²C SDA", "pin"],
      ["I2C_SCL", "I²C SCL", "pin"], ["TOUCH_INT", "Touch interrupt", "pin"],
      ["TOUCH_RST", "Touch reset", "pin"], ["TOUCH_ADDR", "Touch I²C address", "hex"],
      ["INA_ADDR", "INA219 I²C address", "hex"],
    ],
  },
  {
    title: "Controls and CRSF",
    fields: [
      ["NAV_U", "Navigation up", "pin"], ["NAV_D", "Navigation down", "pin"],
      ["NAV_L", "Navigation left", "pin"], ["NAV_R", "Navigation right", "pin"],
      ["NAV_OK", "Navigation confirm", "pin"], ["STEER", "Steering analog input", "analog"],
      ["THROT", "Throttle analog input", "analog"], ["CRSF", "CRSF UART", "pin"],
    ],
  },
  {
    title: "Status and feedback",
    fields: [
      ["STAT_MODE", "Status indicator mode", "status"],
      ["STAT_MONO", "Mono / NeoPixel data pin", "pin"],
      ["STAT_R", "Status red pin", "pin"], ["STAT_G", "Status green pin", "pin"],
      ["STAT_B", "Status blue pin", "pin"], ["STAT_BRIGHT", "Status brightness", "percent"],
      ["SND_MODE", "Sound mode", "sound"], ["SND_PIN", "Sound output pin", "pin"],
      ["VOICE_RX", "DFPlayer RX pin", "pin"], ["VIB_PIN", "Vibration motor pin", "pin"],
    ],
  },
];

const state = { serial: null, port: null, busy: false, publicKey: null, espTool: null };

function $(selector) {
  return document.querySelector(selector);
}

function serialSupported() {
  return window.isSecureContext && "serial" in navigator && !!window.crypto?.subtle;
}

function log(message) {
  const output = $("#device-tool-log");
  if (!output) return;
  output.textContent = (output.textContent + "\n" + message).trim();
  output.scrollTop = output.scrollHeight;
}

function setStatus(message, tone) {
  const text = $("#device-tool-status-text");
  const status = $("#device-tool-status");
  if (text) text.textContent = message;
  if (status) status.dataset.tone = tone || "idle";
}

function setBusy(busy) {
  state.busy = busy;
  document.querySelectorAll("#device-tools button").forEach(function (button) {
    button.disabled = busy;
  });
}

function supportMessage() {
  if (!window.isSecureContext) return "Open SourceTX over HTTPS.";
  if (!("serial" in navigator)) return "Use Chrome or Edge on a desktop for Web Serial.";
  if (!window.crypto?.subtle) return "This browser cannot verify signed releases locally.";
  return "Web Serial ready / signed releases verified locally";
}

function renderSupport() {
  const supported = serialSupported();
  const pill = $("#device-support-pill");
  if (pill) {
    pill.textContent = supported ? "SUPPORTED BROWSER" : "COMPANION APP REQUIRED";
    pill.dataset.tone = supported ? "good" : "warn";
  }
  document.querySelectorAll("#device-install-button, #device-update-button, #device-config-button, #device-read-config-button").forEach(function (button) {
    button.disabled = !supported;
  });
  setStatus(supportMessage(), supported ? "good" : "warn");
}

class SerialLineClient {
  constructor(port) {
    this.port = port;
    this.reader = null;
    this.writer = null;
    this.buffer = "";
  }

  async open() {
    if (!this.port.readable || !this.port.writable) {
      await this.port.open({ baudRate: 115200 });
    }
    this.reader = this.port.readable.getReader();
    this.writer = this.port.writable.getWriter();
  }

  async sendLine(line) {
    await this.writer.write(new TextEncoder().encode(line + "\n"));
  }

  async readLine(timeoutMs) {
    const deadline = Date.now() + (timeoutMs || 4000);
    while (Date.now() < deadline) {
      const newline = this.buffer.indexOf("\n");
      if (newline >= 0) {
        const line = this.buffer.slice(0, newline).replace(/\r$/, "").trim();
        this.buffer = this.buffer.slice(newline + 1);
        return line;
      }

      let timer;
      try {
        const readPromise = this.reader.read();
        const timeoutPromise = new Promise(function (_, reject) {
          timer = setTimeout(function () {
            reject(new Error("USB serial read timed out."));
          }, Math.max(50, deadline - Date.now()));
        });
        const result = await Promise.race([readPromise, timeoutPromise]);
        if (result.done) throw new Error("The USB serial connection closed.");
        this.buffer += new TextDecoder().decode(result.value, { stream: true });
      } catch (error) {
        await this.reader.cancel().catch(function () {});
        throw error;
      } finally {
        clearTimeout(timer);
      }
    }
    throw new Error("USB serial read timed out.");
  }

  async readMatching(predicate, timeoutMs) {
    const deadline = Date.now() + (timeoutMs || 4000);
    while (Date.now() < deadline) {
      const line = await this.readLine(Math.max(100, deadline - Date.now()));
      if (predicate(line)) return line;
    }
    throw new Error("The transmitter did not answer in time.");
  }

  async close() {
    if (this.reader) {
      await this.reader.cancel().catch(function () {});
      this.reader.releaseLock();
      this.reader = null;
    }
    if (this.writer) {
      this.writer.releaseLock();
      this.writer = null;
    }
    if (this.port.readable || this.port.writable) {
      await this.port.close().catch(function () {});
    }
  }
}

async function closeDevice() {
  if (state.serial) await state.serial.close().catch(function () {});
  state.serial = null;
  state.port = null;
}

async function ensureSerial() {
  if (!serialSupported()) throw new Error(supportMessage());
  if (state.serial) return state.serial;
  state.port = await navigator.serial.requestPort();
  state.serial = new SerialLineClient(state.port);
  await state.serial.open();
  return state.serial;
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, function (character) {
    return character.charCodeAt(0);
  });
}

function derLength(bytes, offset) {
  const first = bytes[offset++];
  if (first < 0x80) return { length: first, next: offset };
  const count = first & 0x7f;
  if (!count || count > 2 || offset + count > bytes.length) throw new Error("Invalid ECDSA signature length.");
  let length = 0;
  for (let index = 0; index < count; index += 1) length = (length << 8) | bytes[offset++];
  return { length, next: offset };
}

function derToP1363(signature) {
  if (signature[0] !== 0x30) throw new Error("Firmware signature is not DER.");
  const sequence = derLength(signature, 1);
  if (sequence.next + sequence.length !== signature.length) throw new Error("Firmware signature is truncated.");
  let offset = sequence.next;
  if (signature[offset++] !== 0x02) throw new Error("Firmware signature has no R value.");
  const rLength = derLength(signature, offset);
  offset = rLength.next;
  const r = signature.slice(offset, offset + rLength.length);
  offset += rLength.length;
  if (signature[offset++] !== 0x02) throw new Error("Firmware signature has no S value.");
  const sLength = derLength(signature, offset);
  offset = sLength.next;
  const s = signature.slice(offset, offset + sLength.length);
  if (offset + sLength.length !== signature.length) throw new Error("Firmware signature has trailing data.");

  function normalize(integer) {
    let start = 0;
    while (start < integer.length - 1 && integer[start] === 0) start += 1;
    const value = integer.slice(start);
    if (!value.length || value.length > 32) throw new Error("ECDSA signature integer is invalid.");
    const result = new Uint8Array(32);
    result.set(value, 32 - value.length);
    return result;
  }

  const result = new Uint8Array(64);
  result.set(normalize(r), 0);
  result.set(normalize(s), 32);
  return result;
}

async function verifySignature(content, derSignature) {
  if (!state.publicKey) {
    state.publicKey = await crypto.subtle.importKey(
      "spki",
      base64ToBytes(PUBLIC_KEY_DER_BASE64),
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
  }
  return crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    state.publicKey,
    derToP1363(derSignature),
    content,
  );
}

async function sha256Hex(bytes) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest).map(function (byte) {
    return byte.toString(16).padStart(2, "0");
  }).join("");
}

async function fetchBytes(url, maximum, label, expected, progress) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(label + " download failed with HTTP " + response.status + ".");
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > maximum || (expected && contentLength && contentLength !== expected)) {
    throw new Error(label + " size does not match the signed release contract.");
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > maximum || (expected && bytes.length !== expected)) {
    throw new Error(label + " size does not match the signed release contract.");
  }
  if (progress) progress(bytes.length, expected || contentLength || bytes.length);
  return bytes;
}

function requireGitHubUrl(value, field) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(field + " is not a valid URL.");
  }
  if (url.protocol !== "https:" || url.hostname !== "github.com") {
    throw new Error(field + " must use HTTPS on github.com.");
  }
  return url.href;
}

function validateManifest(manifest, type) {
  const schema = type === "factory" ? 1 : 2;
  const imageField = type === "factory" ? "factory_url" : "firmware_url";
  if (!manifest || manifest.schema !== schema || manifest.product !== "SourceTX" ||
      manifest.hardware !== SOURCE_HARDWARE_ID || manifest.channel !== "stable") {
    throw new Error("The signed release is not for the official SourceTX target.");
  }
  if (!/^[0-9]+\.[0-9]+(?:\.[0-9]+)?$/.test(manifest.version || "")) {
    throw new Error("The release version is invalid.");
  }
  if (!Number.isSafeInteger(manifest.size) || manifest.size < 64 * 1024 || manifest.size > MAX_FIRMWARE_BYTES) {
    throw new Error("The release image size is invalid.");
  }
  if (!/^[0-9a-f]{64}$/i.test(manifest.sha256 || "")) {
    throw new Error("The release SHA-256 digest is invalid.");
  }

  const base = "https://github.com/" + SOURCE_REPOSITORY + "/releases/download/v" + manifest.version + "/";
  const imageUrl = requireGitHubUrl(manifest[imageField], imageField);
  const signatureUrl = requireGitHubUrl(manifest.signature_url, "signature_url");
  if (!imageUrl.startsWith(base) || signatureUrl !== imageUrl + ".sig") {
    throw new Error("The signed release points outside the SourceTX release feed.");
  }
  if (manifest.release_url !== "https://github.com/" + SOURCE_REPOSITORY + "/releases/tag/v" + manifest.version) {
    throw new Error("The release link is outside the SourceTX project.");
  }
  if (type === "factory" && (manifest.chip !== "esp32s3" || manifest.flash_size !== "4MB" ||
      manifest.flash_mode !== "dio" || manifest.flash_frequency !== "80m" || manifest.flash_offset !== "0x0000")) {
    throw new Error("The factory release does not match the official 4 MB target.");
  }
}

function readUint16(bytes, offset) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(offset, true);
}

function readUint32(bytes, offset) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true);
}

function validateFirmwareImage(image, type) {
  if (image.length < 64 * 1024 || image.length > MAX_FIRMWARE_BYTES || image[0] !== 0xe9 || readUint16(image, 12) !== 9) {
    throw new Error("The downloaded image is not a valid ESP32-S3 firmware image.");
  }
  if (type === "factory" && (image.length <= 0x10070 || image[0x8000] !== 0xaa ||
      image[0x8001] !== 0x50 || readUint32(image, 0x10020) !== 0xabcd5432)) {
    throw new Error("The factory image is missing the expected SourceTX partition or application.");
  }
  if (type === "application" && (readUint32(image, 0x20) !== 0xabcd5432 ||
      (image.length > 0x8001 && image[0x8000] === 0xaa && image[0x8001] === 0x50))) {
    throw new Error("The update image does not match the SourceTX application contract.");
  }
}

async function acquireFirmware(type) {
  const manifestUrl = type === "factory" ? FACTORY_MANIFEST_URL : STABLE_MANIFEST_URL;
  const manifestBytes = await fetchBytes(manifestUrl, MAX_MANIFEST_BYTES, "Release manifest");
  const manifestSignature = await fetchBytes(manifestUrl + ".sig", MAX_SIGNATURE_BYTES, "Manifest signature");
  if (!(await verifySignature(manifestBytes, manifestSignature))) throw new Error("Release manifest signature verification failed.");
  const manifest = JSON.parse(new TextDecoder().decode(manifestBytes));
  validateManifest(manifest, type);
  const imageField = type === "factory" ? "factory_url" : "firmware_url";
  const image = await fetchBytes(manifest[imageField], MAX_FIRMWARE_BYTES, type === "factory" ? "Factory image" : "Application image", manifest.size);
  if ((await sha256Hex(image)).toLowerCase() !== manifest.sha256.toLowerCase()) throw new Error("Firmware SHA-256 verification failed.");
  const imageSignature = await fetchBytes(manifest.signature_url, MAX_SIGNATURE_BYTES, "Firmware signature");
  if (!(await verifySignature(image, imageSignature))) throw new Error("Firmware signature verification failed.");
  validateFirmwareImage(image, type);
  return { manifest: manifest, image: image };
}

async function getEspTool() {
  if (!state.espTool) state.espTool = import(ESPTOOL_MODULE_URL);
  return state.espTool;
}

async function runFlash(type) {
  if (!serialSupported()) throw new Error(supportMessage());
  await closeDevice();
  const port = await navigator.serial.requestPort();
  let transport = null;
  try {
    if (type === "factory" && !window.confirm("Install the complete SourceTX factory image? Keep the transmitter powered and do not disconnect USB during the write.")) {
      throw new Error("Factory installation cancelled.");
    }
    setStatus("Checking the signed SourceTX release…", "busy");
    log("[" + (type === "factory" ? "INSTALL" : "UPDATE") + "] USB port selected.");
    const packageInfo = await acquireFirmware(type);
    const tool = await getEspTool();
    const Transport = tool.Transport;
    const ESPLoader = tool.ESPLoader;
    transport = new Transport(port, true);
    const loader = new ESPLoader({
      transport: transport,
      baudrate: 115200,
      terminal: {
        clean: function () {},
        writeLine: function (data) { log("[ESPTOOL] " + data); },
        write: function () {},
      },
    });
    setStatus("Checking the connected ESP32-S3…", "busy");
    log("[PREFLIGHT] " + (await loader.main()) + " detected.");
    const address = type === "factory" ? Number.parseInt(packageInfo.manifest.flash_offset, 16) : 0x10000;
    const eraseAll = type === "factory" && $("#device-erase-flash")?.checked;
    if (eraseAll && !window.confirm("Erase all flash first? This permanently removes models, calibration, settings, and update state.")) {
      throw new Error("Full flash erase cancelled.");
    }
    log("[FLASH] Writing verified image at 0x" + address.toString(16).padStart(6, "0").toUpperCase() + ".");
    await loader.writeFlash({
      fileArray: [{ data: packageInfo.image, address: address }],
      flashMode: type === "factory" ? packageInfo.manifest.flash_mode : "dio",
      flashFreq: type === "factory" ? packageInfo.manifest.flash_frequency : "80m",
      flashSize: type === "factory" ? packageInfo.manifest.flash_size : "4MB",
      eraseAll: eraseAll,
      compress: true,
      reportProgress: function (_index, written, total) {
        setStatus("Writing SourceTX: " + Math.round((written / total) * 100) + "%", "busy");
      },
    });
    await loader.after("hard_reset");
    log("[VERIFY] Flash write completed and reset command sent.");
    setStatus((type === "factory" ? "Installation" : "Update") + " complete — the transmitter is restarting.", "good");
  } finally {
    if (transport) await transport.disconnect().catch(function () {});
    else await port.close().catch(function () {});
  }
}

function pinOptions(analog) {
  const pins = analog ? ANALOG_GPIOS : SAFE_GPIOS;
  return "<option value=\"-1\">Disabled / not assigned (-1)</option>" +
    pins.map(function (pin) { return "<option value=\"" + pin + "\">GPIO " + pin + "</option>"; }).join("");
}

function fieldMarkup(key, label, kind) {
  const start = "<label class=\"device-config-field\"><span>" + label + "</span>";
  if (kind === "status") {
    return start + "<select data-config-key=\"" + key + "\"><option value=\"0\">Disabled</option><option value=\"1\">Mono LED</option><option value=\"2\">RGB PWM</option><option value=\"3\">WS2812 / NeoPixel</option></select></label>";
  }
  if (kind === "sound") {
    return start + "<select data-config-key=\"" + key + "\"><option value=\"0\">Disabled</option><option value=\"1\">Tone / beeper</option><option value=\"2\">DFPlayer voice</option></select></label>";
  }
  if (kind === "hex") {
    return start + "<input data-config-key=\"" + key + "\" type=\"text\" inputmode=\"numeric\" maxlength=\"2\" value=\"" + DEFAULT_PROFILE[key].toString(16).toUpperCase().padStart(2, "0") + "\" /></label>";
  }
  if (kind === "percent") {
    return start + "<input data-config-key=\"" + key + "\" type=\"number\" min=\"0\" max=\"100\" step=\"1\" /></label>";
  }
  return start + "<select data-config-key=\"" + key + "\">" + pinOptions(kind === "analog") + "</select></label>";
}

function renderHardwareForm() {
  const form = $("#device-config-form");
  if (!form) return;
  form.innerHTML = CONFIG_GROUPS.map(function (group) {
    return "<fieldset class=\"device-config-group\"><legend>" + group.title + "</legend><div class=\"device-config-grid\">" +
      group.fields.map(function (field) { return fieldMarkup(field[0], field[1], field[2]); }).join("") +
      "</div></fieldset>";
  }).join("");
  writeHardwareForm(DEFAULT_PROFILE);
}

function writeHardwareForm(profile) {
  CONFIG_FIELDS.forEach(function (key) {
    const field = document.querySelector("[data-config-key=\"" + key + "\"]");
    if (!field) return;
    field.value = key === "TOUCH_ADDR" || key === "INA_ADDR"
      ? Number(profile[key]).toString(16).toUpperCase().padStart(2, "0")
      : String(profile[key]);
  });
}

function readHardwareForm() {
  const profile = { SCHEMA: 1 };
  CONFIG_FIELDS.forEach(function (key) {
    const field = document.querySelector("[data-config-key=\"" + key + "\"]");
    if (!field) throw new Error("Configuration field " + key + " is unavailable.");
    if (key === "TOUCH_ADDR" || key === "INA_ADDR") {
      if (!/^[0-9a-f]{2}$/i.test(field.value.trim())) throw new Error(key + " must be a two-digit hexadecimal I²C address.");
      profile[key] = Number.parseInt(field.value.trim(), 16);
    } else {
      profile[key] = Number(field.value);
    }
  });
  return profile;
}

function validateHardwareProfile(profile) {
  if (profile.SCHEMA !== 1) throw new Error("Hardware profile schema must be 1.");
  if (profile.TOUCH_ADDR < 0x08 || profile.TOUCH_ADDR > 0x77) throw new Error("Touch I²C address must be 08–77.");
  if (profile.INA_ADDR < 0x40 || profile.INA_ADDR > 0x4f) throw new Error("INA219 I²C address must be 40–4F.");
  if (profile.STAT_MODE < 0 || profile.STAT_MODE > 3) throw new Error("Status indicator mode is invalid.");
  if (profile.SND_MODE < 0 || profile.SND_MODE > 2) throw new Error("Sound mode is invalid.");
  if (profile.STAT_BRIGHT < 0 || profile.STAT_BRIGHT > 100) throw new Error("Status brightness must be 0–100.");

  PIN_KEYS.forEach(function (key) {
    const value = profile[key];
    const allowed = ANALOG_KEYS.has(key) ? ANALOG_GPIOS : SAFE_GPIOS;
    if (!Number.isInteger(value) || value < -1 || (value >= 0 && !allowed.includes(value))) {
      throw new Error(key + " is not an allowed SourceTX GPIO assignment.");
    }
  });

  const used = new Map();
  function claim(key, label) {
    const value = profile[key];
    if (value < 0) return;
    if (used.has(value)) throw new Error("GPIO " + value + " is assigned to both " + used.get(value) + " and " + label + ".");
    used.set(value, label);
  }
  [
    ["DISP_MOSI", "Display MOSI"], ["DISP_SCLK", "Display clock"], ["DISP_MISO", "Display MISO"],
    ["DISP_CS", "Display CS"], ["DISP_DC", "Display data / command"], ["DISP_RST", "Display reset"],
    ["DISP_BL", "Display backlight"], ["I2C_SDA", "I²C SDA"], ["I2C_SCL", "I²C SCL"],
    ["TOUCH_INT", "Touch interrupt"], ["TOUCH_RST", "Touch reset"], ["NAV_U", "Navigation up"],
    ["NAV_D", "Navigation down"], ["NAV_L", "Navigation left"], ["NAV_R", "Navigation right"],
    ["NAV_OK", "Navigation confirm"], ["STEER", "Steering input"], ["THROT", "Throttle input"],
    ["CRSF", "CRSF UART"],
  ].forEach(function (item) { claim(item[0], item[1]); });
  if (profile.STAT_MODE === 1 || profile.STAT_MODE === 3) claim("STAT_MONO", "status indicator");
  if (profile.STAT_MODE === 2) {
    claim("STAT_R", "status red");
    claim("STAT_G", "status green");
    claim("STAT_B", "status blue");
  }
  if (profile.SND_MODE !== 0) claim("SND_PIN", "sound output");
  if (profile.SND_MODE === 2) claim("VOICE_RX", "DFPlayer RX");
  claim("VIB_PIN", "vibration motor");
}

async function readHardwareConfig() {
  const client = await ensureSerial();
  try {
    log("[READ] Requesting hardware profile.");
    await client.sendLine(HW_PREFIX + "GET");
    const line = await client.readMatching(function (value) {
      return value.startsWith(HW_PREFIX + "PROFILE:") || value.startsWith(HW_PREFIX + "ERR:");
    }, 5000);
    if (line.startsWith(HW_PREFIX + "ERR:")) throw new Error("Transmitter rejected the read: " + line);
    const profile = {};
    line.slice((HW_PREFIX + "PROFILE:").length).split(":").forEach(function (pair) {
      const separator = pair.indexOf("=");
      if (separator > 0) profile[pair.slice(0, separator)] = Number(pair.slice(separator + 1));
    });
    CONFIG_ORDER.forEach(function (key) {
      if (!Number.isFinite(profile[key])) throw new Error("Hardware profile is missing " + key + ".");
    });
    if (profile.SCHEMA !== 1) throw new Error("This transmitter uses an unsupported hardware-profile schema.");
    writeHardwareForm(profile);
    log("[SUCCESS] Loaded schema 1 hardware profile / CRSF GPIO " + profile.CRSF + ".");
    setStatus("Hardware profile loaded. Review values before saving.", "good");
  } finally {
    await closeDevice();
  }
}

async function saveHardwareConfig() {
  const profile = readHardwareForm();
  validateHardwareProfile(profile);
  const client = await ensureSerial();
  try {
    const command = HW_PREFIX + "SET:" + CONFIG_ORDER.map(function (key) {
      return key + "=" + profile[key];
    }).join(":");
    log("[WRITE] Sending complete hardware profile.");
    await client.sendLine(command);
    const response = await client.readMatching(function (value) {
      return value === HW_PREFIX + "OK:SET:REBOOT" || value.startsWith(HW_PREFIX + "ERR:");
    }, 5000);
    if (response !== HW_PREFIX + "OK:SET:REBOOT") throw new Error("Transmitter rejected the profile: " + response);
    log("[SUCCESS] Profile staged in NVS; reboot required.");
    setStatus("Configuration saved. Reboot the transmitter to apply it.", "good");
  } finally {
    await closeDevice();
  }
}

async function bindDeviceTools() {
  if (!$("#device-tools")) return;
  renderSupport();
  renderHardwareForm();

  $("#device-install-button")?.addEventListener("click", async function () {
    setBusy(true);
    try {
      await runFlash("factory");
    } catch (error) {
      log("[ERROR] " + (error.message || error));
      setStatus(error.message || "Installation stopped.", "error");
    } finally {
      await closeDevice();
      setBusy(false);
    }
  });

  $("#device-update-button")?.addEventListener("click", async function () {
    setBusy(true);
    try {
      await runFlash("application");
    } catch (error) {
      log("[ERROR] " + (error.message || error));
      setStatus(error.message || "Update stopped.", "error");
    } finally {
      await closeDevice();
      setBusy(false);
    }
  });

  async function openConfig() {
    const panel = $("#device-config-panel");
    if (panel) panel.hidden = false;
    setBusy(true);
    try {
      await readHardwareConfig();
    } catch (error) {
      log("[ERROR] " + (error.message || error));
      setStatus(error.message || "Configuration read stopped.", "error");
    } finally {
      setBusy(false);
    }
  }

  $("#device-config-button")?.addEventListener("click", openConfig);
  $("#device-read-config-button")?.addEventListener("click", openConfig);
  $("#device-close-config-button")?.addEventListener("click", function () {
    $("#device-config-panel").hidden = true;
  });
  $("#device-refresh-config-button")?.addEventListener("click", openConfig);
  $("#device-save-config-button")?.addEventListener("click", async function () {
    if (!window.confirm("Save this complete hardware profile to the transmitter? Changes take effect after reboot and incorrect pins can prevent the display or controls from working.")) return;
    setBusy(true);
    try {
      await saveHardwareConfig();
    } catch (error) {
      log("[ERROR] " + (error.message || error));
      setStatus(error.message || "Configuration save stopped.", "error");
    } finally {
      setBusy(false);
    }
  });
  $("#device-default-config-button")?.addEventListener("click", function () {
    writeHardwareForm(DEFAULT_PROFILE);
    log("[READY] Reference defaults loaded locally; nothing has been written.");
    setStatus("Reference defaults loaded. Save only after checking every assignment.", "busy");
  });
}

bindDeviceTools();
window.addEventListener("beforeunload", function () {
  state.serial?.close().catch(function () {});
});
