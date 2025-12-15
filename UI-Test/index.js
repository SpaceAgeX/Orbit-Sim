window.addEventListener("DOMContentLoaded", () => {
  const setCSSVarPct = (name, pct) => {
    document.documentElement.style.setProperty(name, (pct / 100).toString());
  };

  // Hover-to-reveal warp buttons (matches V1 clock behavior)
  const timePanel = document.getElementById("timePanel");
  const warpButtons = document.getElementById("warpButtons");
  const thrustFill = document.getElementById("thrustFill");
  const thrustArrow = document.getElementById("thrustArrow");
  const velocityValue = document.getElementById("velocityValue");
  const accelValue = document.getElementById("accelValue");
  const headingValue = document.getElementById("headingValue");
  const thrustLabel = document.getElementById("thrustLabel");

  if (timePanel && warpButtons) {
    const modeSets = [
      { name: "Physics", values: [1,2,3,5,8,10,12,15,20] },
      { name: "Standard", values: [1,5,10,50,100,1000,10000,100000] },
    ];
    let modeIndex = 0;
    let activeScale = 1;

    const fmtLabel = (v) => v >= 1000 ? `${v/1000}k` : `${v}`;

    const renderButtons = () => {
      warpButtons.innerHTML = "";

      // Mode toggle first
      const toggle = document.createElement("button");
      toggle.textContent = modeSets[modeIndex].name;
      toggle.dataset.modeToggle = "true";
      toggle.addEventListener("click", () => {
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
        btn.textContent = `${fmtLabel(val)}x`;
        btn.dataset.scale = val;
        btn.classList.toggle("active", val === activeScale);
        btn.addEventListener("click", () => {
          activeScale = val;
          updateActiveButtons();
        });
        warpButtons.appendChild(btn);
        if (idx < modeSets[modeIndex].values.length - 1) addSep();
      });
    };

    const updateActiveButtons = () => {
      warpButtons.querySelectorAll("button[data-scale]").forEach((btn) => {
        const val = Number(btn.dataset.scale);
        btn.classList.toggle("active", val === activeScale);
      });
    };

    renderButtons();

    const showWarp = () => warpButtons.classList.add("visible");
    const hideWarp = () => warpButtons.classList.remove("visible");

    timePanel.addEventListener("mouseenter", showWarp);
    timePanel.addEventListener("mouseleave", hideWarp);
    timePanel.addEventListener("pointerenter", showWarp);
    timePanel.addEventListener("pointerleave", hideWarp);
  }

  if (thrustFill) {
    const setThrust = (pct) => {
      const clamped = Math.max(0, Math.min(100, pct));
      thrustFill.style.height = `${clamped}%`;

      if (thrustLabel) {
        thrustLabel.textContent = `${clamped.toFixed(0)}%`;
      }
    };

    setThrust(35);

  
  }

  // Navball rendering (standalone)
  const navball = document.getElementById("navball");
  const ctx = navball?.getContext("2d");

  if (navball && ctx) {
    const cx = navball.width / 2;
    const cy = navball.height / 2;
    const radius = Math.min(cx, cy) - 10;

    let heading = Math.PI / 6; // static demo
    let prograde = Math.PI / 3;
    let radialOut = Math.PI / 2;

    const normalize = (a) => {
      a %= 2 * Math.PI;
      return a < 0 ? a + 2 * Math.PI : a;
    };

    const drawRing = (r, color) => {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, 2 * Math.PI);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    const drawEdgeMarker = (angle, color) => {
      angle = normalize(angle);
      const ang = angle - Math.PI / 2;
      const x = radius * Math.cos(ang);
      const y = radius * Math.sin(ang);
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    };

    const drawHeadingTriangle = (angle) => {
      ctx.save();
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, -24);
      ctx.lineTo(9, -4);
      ctx.lineTo(-9, -4);
      ctx.closePath();
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(255,255,255,0.25)";
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.restore();
    };

    const drawNavball = () => {
      ctx.clearRect(0, 0, navball.width, navball.height);
      ctx.save();
      ctx.translate(cx, cy);

      // Background with rim gradient
      const rimGradient = ctx.createRadialGradient(0, 0, radius * 0.45, 0, 0, radius);
      rimGradient.addColorStop(0, "#0c0f17");
      rimGradient.addColorStop(1, "#111827");
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, 2 * Math.PI);
      ctx.fillStyle = rimGradient;
      ctx.fill();

      // Horizon band
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 0.9, radius * 0.45, 0, 0, 2 * Math.PI);
      const horizonGradient = ctx.createLinearGradient(0, -radius * 0.45, 0, radius * 0.45);
      horizonGradient.addColorStop(0, "rgba(34, 211, 238, 0.18)");
      horizonGradient.addColorStop(0.5, "rgba(17, 24, 39, 0.2)");
      horizonGradient.addColorStop(1, "rgba(248, 114, 114, 0.18)");
      ctx.fillStyle = horizonGradient;
      ctx.fill();

      // Concentric rings + crosshair
      drawRing(radius * 0.35, "rgba(255, 255, 255, 0.1)");
      drawRing(radius * 0.6, "rgba(255, 255, 255, 0.08)");

      ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-radius + 6, 0);
      ctx.lineTo(radius - 6, 0);
      ctx.moveTo(0, -radius + 6);
      ctx.lineTo(0, radius - 6);
      ctx.stroke();

      // Compass ticks
      for (let i = 0; i < 48; i++) {
        const ang = (i * Math.PI) / 24;
        const inner = radius - (i % 12 === 0 ? 12 : 6);
        const outer = radius - 2;
        ctx.beginPath();
        ctx.moveTo(inner * Math.cos(ang), inner * Math.sin(ang));
        ctx.lineTo(outer * Math.cos(ang), outer * Math.sin(ang));
        ctx.lineWidth = i % 12 === 0 ? 2 : 1;
        ctx.strokeStyle = "#6b7280";
        ctx.stroke();
      }

      // Edge markers
      drawEdgeMarker(prograde - heading, "#facc15");              // Prograde
      drawEdgeMarker(prograde - heading + Math.PI, "#f87272");    // Retrograde
      drawEdgeMarker(radialOut - heading, "#22d3ee");             // Radial Out
      drawEdgeMarker(radialOut - heading + Math.PI, "#e879f9");   // Radial In

      // Heading triangle + center dot
      drawHeadingTriangle(heading);
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fill();

      ctx.restore();
    };

    drawNavball();
  }

  // Demo values for HUD text
  if (velocityValue) velocityValue.textContent = "1200 m/s";
  if (accelValue) accelValue.textContent = "3.50 g";
  if (headingValue) headingValue.textContent = "15.0°";
  // Legend buttons: make glow only when pressed
  const toggleButtons = Array.from(document.querySelectorAll(".legend-btn"));
  const markerButtons = Array.from(document.querySelectorAll(".legend-dot-btn"));

  // SAS/RCS can toggle independently
  toggleButtons.forEach((btn) => {
    btn.addEventListener("click", () => btn.classList.toggle("active"));
  });

  // Only one marker active at a time; disabled markers ignore clicks
  markerButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.disabled === "true") return;
      const alreadyActive = btn.classList.contains("active");
      markerButtons.forEach((b) => b.classList.remove("active"));
      if (!alreadyActive) {
        btn.classList.add("active");
      }
    });
  });

  // Pause menu + scaling controls
  const pauseOverlay = document.getElementById("pauseOverlay");
  const pauseWindow = document.getElementById("pauseWindow");
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

  infoTabs.forEach((btn) => {
    btn.addEventListener("click", () => showInfoTab(btn.dataset.tab));
  });

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
    pauseTitle && (pauseTitle.textContent = "Paused");
    mainMenu?.classList.remove("hidden");
    settingsPanel?.classList.add("hidden");
    backButton?.classList.add("hidden");
  };

  const showSettings = () => {
    pauseTitle && (pauseTitle.textContent = "Settings");
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

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (pauseOverlay?.classList.contains("visible")) {
        closePause();
      } else {
        openPause();
      }
    }
  });

  pauseOverlay?.addEventListener("click", (e) => {
    if (e.target === pauseOverlay) {
      closePause();
    }
  });

  pauseClose?.addEventListener("click", closePause);
  resumeButton?.addEventListener("click", closePause);

  settingsButton?.addEventListener("click", showSettings);
  backButton?.addEventListener("click", showMainMenu);
  quitButton?.addEventListener("click", closePause);
});
