(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  // Navigation stays usable on touch screens without adding a framework.
  const header = $(".site-header");
  const menuToggle = $("#menu-toggle");
  const siteNav = $("#site-nav");

  const closeMenu = () => {
    if (!menuToggle || !siteNav) return;
    menuToggle.classList.remove("is-open");
    siteNav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
  };

  menuToggle?.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    menuToggle.classList.toggle("is-open", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  });

  $$(".site-nav a").forEach((link) => link.addEventListener("click", closeMenu));

  const updateHeader = () => header?.classList.toggle("is-scrolled", window.scrollY > 18);
  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();

  // The capability grid is intentionally a plain filter, so all content remains crawlable.
  const filterButtons = $$("[data-filter]");
  const capabilityCards = $$(".capability-card");

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      filterButtons.forEach((item) => {
        const selected = item === button;
        item.classList.toggle("is-selected", selected);
        item.setAttribute("aria-pressed", String(selected));
      });
      capabilityCards.forEach((card) => {
        card.dataset.hidden = filter !== "all" && card.dataset.category !== filter ? "true" : "false";
      });
    });
  });

  // System explorer content mirrors the reference hardware and firmware docs.
  const explorerContent = {
    inputs: {
      kicker: "01 / INPUT SURFACE",
      title: "Start with a control surface you can account for.",
      description: "The reference target names every important input: two analog controls, five navigation buttons, a touch panel, and explicit optional GPIO assignments.",
      metrics: [["GPIO 6 / 5", "steering / throttle"], ["35–39", "navigation"], ["480×320", "touch display"]],
      lines: ["STEERING      ADC / GPIO 6", "THROTTLE      ADC / GPIO 5", "NAVIGATION    GPIO 35–39 / ACTIVE LOW", "TOUCH         FT6x36 / I²C 0x38"],
    },
    engine: {
      kicker: "02 / MODEL ENGINE",
      title: "Make the model the unit of control.",
      description: "Calibration, channel mapping, response shaping, mixes, drive modes, telemetry actions, and failsafe profiles are edited in the context of the selected vehicle.",
      metrics: [["20", "catalog slots"], ["16", "CRSF channels"], ["21", "public schema"]],
      lines: ["MODEL         ACTIVE / 01 OF 20", "PROCESSING    CURVES + EXPO + MIXES", "VEHICLE       4WS / DUAL ESC / AUX", "STORAGE       VERIFIED NVS / RECOVERY"],
    },
    link: {
      kicker: "03 / LINK + SAFETY",
      title: "Send bounded output, listen for context.",
      description: "The external ExpressLRS / CRSF module carries the output schedule while telemetry and transport health feed the visible safety state back into the operator view.",
      metrics: [["250 Hz", "CRSF schedule"], ["400 kbaud", "radio UART"], ["P-256", "OTA trust root"]],
      lines: ["CRSF          GPIO 42 / 400 KBAUD", "OUTPUT        16 CHANNELS / SCHEDULED", "TELEMETRY     LINK + RX + GPS + RPM", "SAFETY        PREFLIGHT / INHIBIT / ROLLBACK"],
    },
  };

  const explorerTabs = $$("[data-explorer]");
  const explorerKicker = $("#explorer-kicker");
  const explorerHeading = $("#explorer-heading");
  const explorerDescription = $("#explorer-description");
  const explorerMetrics = $("#explorer-metrics");
  const explorerList = $("#explorer-list");

  const renderExplorer = (key) => {
    const content = explorerContent[key];
    if (!content || !explorerHeading || !explorerList) return;

    explorerTabs.forEach((tab) => {
      const active = tab.dataset.explorer === key;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    explorerKicker.textContent = content.kicker;
    explorerHeading.textContent = content.title;
    explorerDescription.textContent = content.description;
    explorerMetrics.innerHTML = content.metrics
      .map(([value, label]) => `<div class="explorer-metric"><strong>${value}</strong><span>${label}</span></div>`)
      .join("");
    explorerList.innerHTML = content.lines.map((line) => `<li>${line}</li>`).join("");
  };

  explorerTabs.forEach((tab) => tab.addEventListener("click", () => renderExplorer(tab.dataset.explorer)));
  renderExplorer("inputs");

  // The console is a bounded visual demo. It never opens a serial port or writes firmware.
  const steeringSlider = $("#steering-slider");
  const throttleSlider = $("#throttle-slider");
  const steeringValue = $("#steering-value");
  const throttleValue = $("#throttle-value");
  const channelElements = {
    1: [$("#channel-1-value"), $("#channel-1-fill")],
    2: [$("#channel-2-value"), $("#channel-2-fill")],
    4: [$("#channel-4-value"), $("#channel-4-fill")],
  };

  const signedPercent = (value) => `${value >= 0 ? "+" : ""}${value}%`;
  const setChannel = (channel, microseconds) => {
    const elements = channelElements[channel];
    if (!elements) return;
    const [valueElement, fillElement] = elements;
    valueElement.textContent = String(microseconds);
    fillElement.style.width = `${Math.max(0, Math.min(100, (microseconds - 1000) / 10))}%`;
  };

  const updateConsole = () => {
    const steering = Number(steeringSlider?.value || 0);
    const throttle = Number(throttleSlider?.value || 0);
    const mix = Math.round(steering * 0.38 - throttle * 0.08);
    const steeringUs = 1500 + Math.round(steering * 5);
    const throttleUs = 1500 + Math.round(throttle * 5);
    const mixUs = 1500 + mix * 5;

    if (steeringValue) steeringValue.textContent = signedPercent(steering);
    if (throttleValue) throttleValue.textContent = signedPercent(throttle);
    setChannel(1, steeringUs);
    setChannel(2, throttleUs);
    setChannel(4, mixUs);
  };

  steeringSlider?.addEventListener("input", updateConsole);
  throttleSlider?.addEventListener("input", updateConsole);
  updateConsole();

  // Copyable pinout values make the hardware reference practical at a workbench.
  const toast = $("#toast");
  let toastTimer;
  const showToast = (message) => {
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 1800);
  };

  $$("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const value = button.dataset.copy;
      try {
        await navigator.clipboard.writeText(value);
        showToast(`${value} copied to clipboard`);
      } catch {
        showToast(value);
      }
    });
  });

  // Release badges use GitHub as the live source, with documented local fallbacks.
  const releaseTargets = [
    {
      repo: "DrMeowy/SourceTX-Updates",
      badge: "#firmware-version",
      fallback: "v1.98",
      releaseLink: "#firmware-release-link",
    },
    {
      repo: "DrMeowy/SourceTX-Companion",
      badge: "#windows-version",
      fallback: "v0.1.5",
      download: "#windows-download",
      assetPattern: /\.exe$|\.zip$/i,
    },
    {
      repo: "DrMeowy/-SourceTX-Companion-Android",
      badge: "#android-version",
      fallback: "v0.2.8",
      download: "#android-download",
      assetPattern: /\.apk$/i,
    },
  ];

  const setFallback = (target) => {
    const badge = $(target.badge);
    if (badge) badge.textContent = target.fallback;
  };

  const hydrateRelease = async (target) => {
    setFallback(target);
    try {
      const response = await fetch(`https://api.github.com/repos/${target.repo}/releases/latest`, {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (!response.ok) return;
      const release = await response.json();
      const tag = release.tag_name || target.fallback;
      const badge = $(target.badge);
      if (badge) badge.textContent = tag;

      const releaseLink = target.releaseLink ? $(target.releaseLink) : null;
      if (releaseLink && release.html_url) releaseLink.href = release.html_url;

      const download = target.download ? $(target.download) : null;
      if (download && Array.isArray(release.assets) && target.assetPattern) {
        const asset = release.assets.find((item) => target.assetPattern.test(item.name));
        if (asset?.browser_download_url) download.href = asset.browser_download_url;
      }
    } catch {
      // The fallback is the intended offline experience when GitHub rate-limits the page.
    }
  };

  releaseTargets.forEach((target) => hydrateRelease(target));

  const currentYear = $("#current-year");
  if (currentYear) currentYear.textContent = String(new Date().getFullYear());
})();
