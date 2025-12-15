// /public/ui.js
// UI module (single source of truth for UI state: time scale + sim clock + HUD setters)

let _timeScale = 1;     // warp multiplier (1x, 5x, etc)
let _simSeconds = 0;    // accumulated simulation time in seconds

let _clockEls = null;   // cached DOM refs for clock
let _uiApi = null;      // last initUI return (optional)

// ---------- helpers ----------
const pad2 = (n) => String(Math.floor(n)).padStart(2, "0");

const cacheClockEls = () => {
  _clockEls = {
    years: document.getElementById("clockYears"),
    days: document.getElementById("clockDays"),
    hours: document.getElementById("clockHours"),
    minutes: document.getElementById("clockMinutes"),
    seconds: document.getElementById("clockSeconds"),
  };
};

const renderClock = () => {
  if (!_clockEls) cacheClockEls();
  if (!_clockEls) return;

  const SEC_PER_MIN = 60;
  const SEC_PER_HOUR = 60 * 60;
  const SEC_PER_DAY = 24 * SEC_PER_HOUR;
  const SEC_PER_YEAR = 365 * SEC_PER_DAY; // simple calendar for now

  let t = Math.max(0, _simSeconds);

  const years = Math.floor(t / SEC_PER_YEAR);
  t -= years * SEC_PER_YEAR;

  const days = Math.floor(t / SEC_PER_DAY);
  t -= days * SEC_PER_DAY;

  const hours = Math.floor(t / SEC_PER_HOUR);
  t -= hours * SEC_PER_HOUR;

  const minutes = Math.floor(t / SEC_PER_MIN);
  t -= minutes * SEC_PER_MIN;

  const seconds = Math.floor(t);

  if (_clockEls.years) _clockEls.years.textContent = String(years);
  if (_clockEls.days) _clockEls.days.textContent = String(days);
  if (_clockEls.hours) _clockEls.hours.textContent = pad2(hours);
  if (_clockEls.minutes) _clockEls.minutes.textContent = pad2(minutes);
  if (_clockEls.seconds) _clockEls.seconds.textContent = pad2(seconds);
};

// exported: used by index.js loop
export function addSimTime(dtSeconds) {
  if (!Number.isFinite(dtSeconds)) return;
  _simSeconds += dtSeconds;
  renderClock();
}

// exported: used by index.js loop
export function getTimeScale() {
  return _timeScale;
}

// optional: if you ever want to set absolute sim-time
export function setSimTime(seconds) {
  _simSeconds = Math.max(0, Number(seconds) || 0);
  renderClock();
}

// ---------- main init ----------
export function initUI(initialData = {}) {
  const setCSSVarPct = (name, pct) => {
    document.documentElement.style.setProperty(name, (pct / 100).toString());
  };

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el && value !== undefined && value !== null) el.textContent = String(value);
  };

  // cache clock refs once and render immediately
  cacheClockEls();
  renderClock();

  // Hover-to-reveal warp buttons (matches V1 clock behavior)
  const timePanel = document.getElementById("timePanel");
  const warpButtons = document.getElementById("warpButtons");

  const thrustFill = document.getElementById("thrustFill");
  const thrustLabel = document.getElementById("thrustLabel");
  const velocityValue = document.getElementById("velocityValue");
  const accelValue = document.getElementById("accelValue");
  const headingValue = document.getElementById("headingValue");

  // -----------------------------
  // TIME WARP UI (hover + click fallback)
  // -----------------------------
  if (timePanel && warpButtons) {
    const modeSets = [
      { name: "Physics", values: [1, 2, 3, 5, 8, 10, 12, 15, 20] },
      { name: "Fixed Low", values: [1, 5, 10, 50, 100, 1000, 10000, 100000] },
      { name: "Fixed High", values: [1, 10, 1000, 10000, 100000, 1000000, 10000000, 100000000] }
    ];
    let modeIndex = 0;

   
    const fmtLabel = (v) => {
      if (v >= 1_000_000) {
        return `${Math.round(v / 1_000_000)}M`;
      }

      if (v >= 1_000) {
        return `${Math.round(v / 1_000)}K`;
      }

      return `${v}x`;
    };






    const updateActiveButtons = () => {
      warpButtons.querySelectorAll("button[data-scale]").forEach((btn) => {
        const val = Number(btn.dataset.scale);
        btn.classList.toggle("active", val === _timeScale);
      });
    };

    const renderButtons = () => {
      warpButtons.innerHTML = "";

      // Mode toggle first
      const toggle = document.createElement("button");
      toggle.textContent = modeSets[modeIndex].name;
      toggle.dataset.modeToggle = "true";
      toggle.addEventListener("click", (e) => {
        e.stopPropagation();
        modeIndex = (modeIndex + 1) % modeSets.length;
        renderButtons();
      });
      warpButtons.appendChild(toggle);

      const addSep = () => {
        const sep = document.createElement("div");
        sep.className = "clock-separator";
        warpButtons.appendChild(sep);
      };

      addSep();

      modeSets[modeIndex].values.forEach((val, idx) => {
        const btn = document.createElement("button");
        btn.textContent = `${fmtLabel(val)}`;
        btn.dataset.scale = String(val);
        btn.classList.toggle("active", val === _timeScale);
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          _timeScale = val;
          updateActiveButtons();
        });
        warpButtons.appendChild(btn);
        if (idx < modeSets[modeIndex].values.length - 1) addSep();
      });
    };

    renderButtons();

    const showWarp = () => warpButtons.classList.add("visible");
    const hideWarp = () => warpButtons.classList.remove("visible");

    // hover behavior
    timePanel.addEventListener("mouseenter", showWarp);
    timePanel.addEventListener("mouseleave", hideWarp);
    timePanel.addEventListener("pointerenter", showWarp);
    timePanel.addEventListener("pointerleave", hideWarp);

    // click fallback (helps if hover is blocked by CSS/pointer-events quirks)
    timePanel.addEventListener("click", (e) => {
      // don’t toggle when clicking a warp button itself
      if (e.target && e.target.closest && e.target.closest("#warpButtons")) return;
      warpButtons.classList.toggle("visible");
    });

    // clicking anywhere else closes it
    document.addEventListener("click", (e) => {
      if (!warpButtons.classList.contains("visible")) return;
      const inside = e.target && e.target.closest && e.target.closest("#timePanel");
      if (!inside) hideWarp();
    });
  }

  // -----------------------------
  // THRUST UI
  // -----------------------------
  let setThrustFn = () => {};
  if (thrustFill) {
    const setThrust = (pct) => {
      const clamped = Math.max(0, Math.min(100, Number(pct) || 0));
      thrustFill.style.height = `${clamped}%`;
      if (thrustLabel) thrustLabel.textContent = `${clamped.toFixed(0)}%`;
    };

    setThrustFn = setThrust;
    setThrustFn(0);
  }

  // -----------------------------
  // NAVBALL (continuous redraw so it never stays blank)
  // -----------------------------
  const navball = document.getElementById("navball");
  const navCtx = navball ? navball.getContext("2d") : null;

  if (navball && navCtx) {
    const cx = navball.width / 2;
    const cy = navball.height / 2;
    const radius = Math.min(cx, cy) - 10;

    // state (later you can feed real values in setData)
    const navState = {
      heading: Math.PI / 6,     // radians
      prograde: Math.PI / 3,    // radians
      radialOut: Math.PI / 2,   // radians
    };

    const normalize = (a) => {
      a %= 2 * Math.PI;
      return a < 0 ? a + 2 * Math.PI : a;
    };

    const drawRing = (r, color) => {
      navCtx.beginPath();
      navCtx.arc(0, 0, r, 0, 2 * Math.PI);
      navCtx.strokeStyle = color;
      navCtx.lineWidth = 1;
      navCtx.stroke();
    };

    const drawEdgeMarker = (angle, color) => {
      angle = normalize(angle);
      const ang = angle - Math.PI / 2;
      const x = radius * Math.cos(ang);
      const y = radius * Math.sin(ang);
      navCtx.beginPath();
      navCtx.arc(x, y, 7, 0, 2 * Math.PI);
      navCtx.fillStyle = color;
      navCtx.fill();
    };

    const drawHeadingTriangle = (angle) => {
      navCtx.save();
      navCtx.rotate(angle);
      navCtx.beginPath();
      navCtx.moveTo(0, -24);
      navCtx.lineTo(9, -4);
      navCtx.lineTo(-9, -4);
      navCtx.closePath();
      navCtx.fillStyle = "#ffffff";
      navCtx.shadowColor = "rgba(255,255,255,0.25)";
      navCtx.shadowBlur = 6;
      navCtx.fill();
      navCtx.restore();
    };

    const drawNavball = () => {
      navCtx.clearRect(0, 0, navball.width, navball.height);
      navCtx.save();
      navCtx.translate(cx, cy);

      // Background with rim gradient
      const rimGradient = navCtx.createRadialGradient(0, 0, radius * 0.45, 0, 0, radius);
      rimGradient.addColorStop(0, "#0c0f17");
      rimGradient.addColorStop(1, "#111827");
      navCtx.beginPath();
      navCtx.arc(0, 0, radius, 0, 2 * Math.PI);
      navCtx.fillStyle = rimGradient;
      navCtx.fill();

      // Horizon band
      navCtx.beginPath();
      navCtx.ellipse(0, 0, radius * 0.9, radius * 0.45, 0, 0, 2 * Math.PI);
      const horizonGradient = navCtx.createLinearGradient(0, -radius * 0.45, 0, radius * 0.45);
      horizonGradient.addColorStop(0, "rgba(34, 211, 238, 0.18)");
      horizonGradient.addColorStop(0.5, "rgba(17, 24, 39, 0.2)");
      horizonGradient.addColorStop(1, "rgba(248, 114, 114, 0.18)");
      navCtx.fillStyle = horizonGradient;
      navCtx.fill();

      // Concentric rings + crosshair
      drawRing(radius * 0.35, "rgba(255, 255, 255, 0.1)");
      drawRing(radius * 0.6, "rgba(255, 255, 255, 0.08)");

      navCtx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      navCtx.lineWidth = 1;
      navCtx.beginPath();
      navCtx.moveTo(-radius + 6, 0);
      navCtx.lineTo(radius - 6, 0);
      navCtx.moveTo(0, -radius + 6);
      navCtx.lineTo(0, radius - 6);
      navCtx.stroke();

      // Compass ticks
      for (let i = 0; i < 48; i++) {
        const ang = (i * Math.PI) / 24;
        const inner = radius - (i % 12 === 0 ? 12 : 6);
        const outer = radius - 2;
        navCtx.beginPath();
        navCtx.moveTo(inner * Math.cos(ang), inner * Math.sin(ang));
        navCtx.lineTo(outer * Math.cos(ang), outer * Math.sin(ang));
        navCtx.lineWidth = i % 12 === 0 ? 2 : 1;
        navCtx.strokeStyle = "#6b7280";
        navCtx.stroke();
      }

      // Edge markers
      drawEdgeMarker(navState.prograde - navState.heading, "#facc15"); // Prograde
      drawEdgeMarker(navState.prograde - navState.heading + Math.PI, "#f87272"); // Retrograde
      drawEdgeMarker(navState.radialOut - navState.heading, "#22d3ee"); // Radial Out
      drawEdgeMarker(navState.radialOut - navState.heading + Math.PI, "#e879f9"); // Radial In

      // Heading triangle + center dot
      drawHeadingTriangle(navState.heading);
      navCtx.beginPath();
      navCtx.arc(0, 0, 3, 0, 2 * Math.PI);
      navCtx.fillStyle = "rgba(255,255,255,0.8)";
      navCtx.fill();

      navCtx.restore();
    };

    // Continuous render loop (fixes “blank canvas” cases)
    const navLoop = () => {
      drawNavball();
      requestAnimationFrame(navLoop);
    };
    requestAnimationFrame(navLoop);

    // Hook state updates via applyData below
    // (we’ll update navState inside applyData using headingRad/progradeRad/radialOutRad)
    initUI._navState = navState; // internal stash
  }

  // Demo values for HUD text (safe defaults)
  if (velocityValue) velocityValue.textContent = "0 m/s";
  if (accelValue) accelValue.textContent = "0.00 g";
  if (headingValue) headingValue.textContent = "—";

  // Legend buttons: make glow only when pressed
  const toggleButtons = Array.from(document.querySelectorAll(".legend-btn"));
  const markerButtons = Array.from(document.querySelectorAll(".legend-dot-btn"));

  toggleButtons.forEach((btn) => {
    btn.addEventListener("click", () => btn.classList.toggle("active"));
  });

  markerButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.disabled === "true") return;
      const alreadyActive = btn.classList.contains("active");
      markerButtons.forEach((b) => b.classList.remove("active"));
      if (!alreadyActive) btn.classList.add("active");
    });
  });

  // Pause menu + scaling controls
  const pauseOverlay = document.getElementById("pauseOverlay");
  const pauseClose = document.getElementById("pauseClose");
  const pauseTitle = document.getElementById("pauseTitle");
  const settingsPanel = document.getElementById("settingsPanel");
  const mainMenu = document.getElementById("mainMenu");
  const backButton = document.getElementById("settingsBack");
  const resumeButton = document.querySelector('[data-action="resume"]');
  const settingsButton = document.querySelector('[data-open="settings"]');
  const quitButton = document.querySelector('[data-action="quit"]');

  const infoTabs = Array.from(document.querySelectorAll(".info-tab"));
  const infoPanels = Array.from(document.querySelectorAll(".info-content"));

  const showInfoTab = (name) => {
    infoTabs.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === name));
    infoPanels.forEach((panel) => panel.classList.toggle("hidden", panel.dataset.tabPanel !== name));
  };

  infoTabs.forEach((btn) => btn.addEventListener("click", () => showInfoTab(btn.dataset.tab)));
  showInfoTab("orbital");

  const sliders = [
    { id: "uiScaleRange", valueId: "uiScaleValue", varName: "--ui-scale" },
    { id: "clockScaleRange", valueId: "clockScaleValue", varName: "--clock-scale" },
    { id: "altitudeScaleRange", valueId: "altitudeScaleValue", varName: "--altitude-scale" },
    { id: "navballScaleRange", valueId: "navballScaleValue", varName: "--navball-scale" },
    { id: "minimapScaleRange", valueId: "minimapScaleValue", varName: "--minimap-scale" },
    { id: "infoScaleRange", valueId: "infoScaleValue", varName: "--info-scale" },
  ];

  const applySlider = (slider, display) => {
    const val = Number(slider.value);
    display.textContent = `${val}%`;
    setCSSVarPct(slider.dataset.varName, val);
  };

  sliders.forEach(({ id, valueId, varName }) => {
    const slider = document.getElementById(id);
    const display = document.getElementById(valueId);
    if (!slider || !display) return;
    slider.dataset.varName = varName;
    applySlider(slider, display);
    slider.addEventListener("input", () => applySlider(slider, display));
  });

  const showMainMenu = () => {
    if (pauseTitle) pauseTitle.textContent = "Paused";
    mainMenu?.classList.remove("hidden");
    settingsPanel?.classList.add("hidden");
    backButton?.classList.add("hidden");
  };

  const showSettings = () => {
    if (pauseTitle) pauseTitle.textContent = "Settings";
    mainMenu?.classList.add("hidden");
    settingsPanel?.classList.remove("hidden");
    backButton?.classList.remove("hidden");
  };

  const openPause = () => {
    if (!pauseOverlay) return;
    showMainMenu();
    pauseOverlay.classList.add("visible");
    document.body.classList.add("paused");
  };

  const closePause = () => {
    if (!pauseOverlay) return;
    pauseOverlay.classList.remove("visible");
    document.body.classList.remove("paused");
    showMainMenu();
  };

  const togglePause = () => {
    if (pauseOverlay?.classList.contains("visible")) closePause();
    else openPause();
  };

  // ESC key to toggle pause
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      togglePause();
    }
  });

  pauseOverlay?.addEventListener("click", (e) => {
    if (e.target === pauseOverlay) closePause();
  });

  pauseClose?.addEventListener("click", closePause);
  resumeButton?.addEventListener("click", closePause);
  settingsButton?.addEventListener("click", showSettings);
  backButton?.addEventListener("click", showMainMenu);
  quitButton?.addEventListener("click", closePause);

  // ✅ setData: includes SMA + omega; also updates navball state if provided
  const applyData = (data) => {
    setText("altitudeValue", data.altitude);
    setText("velocityValue", data.velocity);
    setText("accelValue", data.accel);
    setText("headingValue", data.heading);

    setText("apoapsisValue", data.apoapsis);
    setText("timeToApValue", data.timeToAp);
    setText("periapsisValue", data.periapsis);
    setText("timeToPeValue", data.timeToPe);
    setText("eccentricityValue", data.eccentricity);
    setText("periodValue", data.period);

    setText("semimajorValue", data.semiMajorAxis ?? data.sma ?? data.SMA);
    setText("argumentValue", data.omega ?? data.argumentOfPeriapsis);

    setText("targetRelVel", data.targetRelVel);
    setText("targetSeparation", data.targetSeparation);
    setText("targetClosest", data.targetClosest);
    setText("targetTimeCA", data.targetTimeCA);

    setText("bodySelected", data.bodySelected);
    setText("bodyMass", data.bodyMass);
    setText("bodySituation", data.bodySituation);
    setText("bodySOI", data.bodySOI);
    setText("bodyLockedOn", data.bodyLockedOn);

    setText("manDeltaV", data.manDeltaV);
    setText("manDuration", data.manDuration);
    setText("manBurnStart", data.manBurnStart);
    setText("manTWR", data.manTWR);
    setText("manHeading", data.manHeading);

    if (typeof data.thrustPct === "number") setThrustFn(data.thrustPct);

    // Optional real navball driving (radians). If not provided, it stays demo.
    const ns = initUI._navState;
    if (ns) {
      if (typeof data.headingRad === "number") ns.heading = data.headingRad;
      if (typeof data.progradeRad === "number") ns.prograde = data.progradeRad;
      if (typeof data.radialOutRad === "number") ns.radialOut = data.radialOutRad;
    }
  };

  applyData(initialData);

  const getScaleValues = () => ({
    ui: Number(document.getElementById("uiScaleRange")?.value || 0),
    clock: Number(document.getElementById("clockScaleRange")?.value || 0),
    altitude: Number(document.getElementById("altitudeScaleRange")?.value || 0),
    navball: Number(document.getElementById("navballScaleRange")?.value || 0),
    minimap: Number(document.getElementById("minimapScaleRange")?.value || 0),
    info: Number(document.getElementById("infoScaleRange")?.value || 0),
  });

  _uiApi = {
    setData: applyData,
    getScales: getScaleValues,
    openPause,
    closePause,
    togglePause,
  };

  return _uiApi;
}
