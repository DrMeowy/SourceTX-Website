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

  // This is a bounded visual preview of the firmware dashboard. It never opens
  // a serial port, controls a vehicle, or writes firmware.
  const dashboardModels = [
    {
      name: "MODEL 01",
      description: "NO DESCRIPTION",
      image: "assets/images/source_tx_buggy_128x82.png",
    },
    {
      name: "ROCK CRAWLER",
      description: "TRAIL / 4WD",
      image: "assets/images/source_tx_crawler_128x82.png",
    },
    {
      name: "BLUE BEAST",
      description: "HIGH GRIP / 4WD",
      image: "assets/images/source_tx_beast_blue_128x82.png",
    },
  ];

  const dashboardScreen = $("#tx-screen");
  const dashboardImage = $("#tx-model-image");
  const dashboardModelName = $("#tx-model-name");
  const dashboardHeaderModel = $("#tx-header-model");
  const dashboardDescription = $("#tx-model-description");
  const dashboardClockTime = $("#tx-clock-time");
  const dashboardClockDate = $("#tx-clock-date");
  const dashboardToast = $("#tx-demo-toast");
  let dashboardToastTimer;
  let dashboardModelIndex = 0;
  let dashboardLinkOnline = true;
  let dashboardLinkQuality = 100;

  const dashboardTimers = {
    1: { seconds: 0, running: false },
    2: { seconds: 600, running: false },
  };

  const showDashboardToast = (message) => {
    if (!dashboardToast) return;
    window.clearTimeout(dashboardToastTimer);
    dashboardToast.textContent = message;
    dashboardToast.classList.add("is-visible");
    dashboardToastTimer = window.setTimeout(() => dashboardToast.classList.remove("is-visible"), 1800);
  };

  const renderDashboardClock = () => {
    const now = new Date();
    const time = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(now);
    const date = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(now);
    if (dashboardClockTime) dashboardClockTime.textContent = time;
    if (dashboardClockDate) dashboardClockDate.textContent = date;
  };

  renderDashboardClock();
  window.setInterval(renderDashboardClock, 1000);

  const formatDashboardTimer = (seconds) => {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
    const remainder = (seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${remainder}`;
  };

  const syncDashboardTimer = (timerNumber) => {
    const timer = dashboardTimers[timerNumber];
    const value = $(`#tx-timer-${timerNumber}`);
    const state = $(`#tx-timer-${timerNumber}-state`);
    if (value) value.textContent = formatDashboardTimer(timer.seconds);
    if (state) state.textContent = timer.running ? "RUNNING" : "STOPPED";
    $(`.tx-timer-${timerNumber}`)?.classList.toggle("is-running", timer.running);
  };

  const syncDashboardTimers = () => {
    syncDashboardTimer(1);
    syncDashboardTimer(2);
  };

  let dashboardTimerInterval;
  const tickDashboardTimers = () => {
    Object.entries(dashboardTimers).forEach(([timerNumber, timer]) => {
      if (!timer.running) return;
      timer.seconds += timerNumber === "1" ? 1 : -1;
      if (timer.seconds <= 0 && timerNumber === "2") {
        timer.seconds = 0;
        timer.running = false;
      }
      syncDashboardTimer(Number(timerNumber));
    });
    if (!Object.values(dashboardTimers).some((timer) => timer.running)) {
      window.clearInterval(dashboardTimerInterval);
      dashboardTimerInterval = undefined;
    }
  };

  const toggleDashboardTimer = (timerNumber) => {
    const timer = dashboardTimers[timerNumber];
    timer.running = !timer.running;
    syncDashboardTimer(timerNumber);
    if (timer.running && !dashboardTimerInterval) dashboardTimerInterval = window.setInterval(tickDashboardTimers, 1000);
    showDashboardToast(`TIMER ${timerNumber} / ${timer.running ? "RUNNING" : "STOPPED"}`);
  };

  const renderDashboardModel = () => {
    const model = dashboardModels[dashboardModelIndex];
    const label = `${String(dashboardModelIndex + 1).padStart(2, "0")}: ${model.name}`;
    if (dashboardImage) {
      dashboardImage.src = model.image;
      dashboardImage.alt = `${model.name} model preview`;
    }
    if (dashboardModelName) dashboardModelName.textContent = label;
    if (dashboardHeaderModel) dashboardHeaderModel.textContent = label;
    if (dashboardDescription) dashboardDescription.textContent = model.description;
  };

  const renderDashboardLink = () => {
    dashboardScreen?.classList.toggle("is-linked", dashboardLinkOnline);
    const signal = $("#tx-signal-state");
    const lq = $("#tx-lq");
    const packet = $("#tx-packet");
    const power = $("#tx-power");
    const signalBars = dashboardScreen ? $$(".tx-signal-bars i", dashboardScreen) : [];
    const activeBars = Math.ceil(dashboardLinkQuality / 20);
    const rssi = Math.round(30 + (100 - dashboardLinkQuality) * 0.85);

    if (signal) signal.textContent = dashboardLinkOnline ? `RSSI -${rssi} dBm` : "NO LINK";
    if (lq) lq.textContent = dashboardLinkOnline ? `LQ ${dashboardLinkQuality}%` : "LQ --%";
    if (packet) packet.textContent = dashboardLinkOnline ? "250 Hz" : "--";
    if (power) power.textContent = dashboardLinkOnline ? "500mW" : "--mW";
    signalBars.forEach((bar, index) => bar.classList.toggle("is-active", dashboardLinkOnline && index < activeBars));
  };

  const updateDashboardTelemetry = () => {
    if (!dashboardLinkOnline) return;
    const slowWave = Math.sin(Date.now() / 4300) * 19;
    const fastWave = Math.sin(Date.now() / 1600) * 5;
    dashboardLinkQuality = Math.max(45, Math.min(100, Math.round(76 + slowWave + fastWave)));
    renderDashboardLink();
  };

  window.setInterval(updateDashboardTelemetry, 1400);

  const dashboardChannelBars = $$("#tx-channel-bars .tx-channel-bar");
  const setDashboardChannelHeight = (channelIndex, height) => {
    const fill = dashboardChannelBars[channelIndex]?.querySelector("b");
    if (fill) fill.style.height = `${height}%`;
  };

  const animateAnalogChannels = () => {
    for (let channelIndex = 0; channelIndex < 4; channelIndex += 1) {
      setDashboardChannelHeight(channelIndex, Math.round(30 + Math.random() * 55));
    }
  };

  const animateSwitchChannels = () => {
    const switchLevels = [0, 50, 100];
    for (let channelIndex = 4; channelIndex < 8; channelIndex += 1) {
      const nextLevel = switchLevels[Math.floor(Math.random() * switchLevels.length)];
      setDashboardChannelHeight(channelIndex, nextLevel);
    }
  };

  window.setInterval(animateAnalogChannels, 1100);
  window.setInterval(animateSwitchChannels, 2400);

  const handleDashboardAction = (action) => {
    if (["model", "cycle-model"].includes(action)) {
      dashboardModelIndex = (dashboardModelIndex + 1) % dashboardModels.length;
      renderDashboardModel();
      showDashboardToast(`MODEL SELECT / ${dashboardModels[dashboardModelIndex].name}`);
      return;
    }

    if (["signal", "toggle-link"].includes(action)) {
      dashboardLinkOnline = !dashboardLinkOnline;
      renderDashboardLink();
      showDashboardToast(dashboardLinkOnline ? "SIGNAL / LINK ACTIVE" : "SIGNAL / NO LINK");
      return;
    }

    if (["timer1", "timer2"].includes(action)) {
      toggleDashboardTimer(Number(action.slice(-1)));
      return;
    }

    const messages = {
      settings: "SETTINGS / firmware options",
      clock: "CLOCK / dashboard time",
      battery: "BATTERY / TX 8.4V / RX 11.1V / 3S LiPo",
      tx: "TX / packet and power telemetry",
      channels: "CHANNEL MONITOR / 12 channels",
      trim: "TRIM / SUB-TRIM screen",
      servo: "SERVO VIEW / output monitor",
      expo: "DR / EXPO / response curves",
      mixers: "MIXERS / model-aware routing",
    };
    if (messages[action]) showDashboardToast(messages[action]);
  };

  $$('[data-dashboard-action]').forEach((button) => {
    button.addEventListener("click", () => handleDashboardAction(button.dataset.dashboardAction));
  });

  renderDashboardModel();
  renderDashboardLink();
  syncDashboardTimers();

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
