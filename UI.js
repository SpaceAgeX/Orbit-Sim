// ----- UI: clock + time scale -----
import { view } from "./geometry.js";
import { RigidBody } from "./rigidBody.js";


const TIME_SCALE_STEPS = [1, 5, 10, 50, 100, 500, 1000, 5000, 10000, 50000];

let timeScale = TIME_SCALE_STEPS[0];
let simTime = 0; // seconds

export let showPathEnable = true;

let warpButtonsContainer = null;
let warpButtonsList = [];


let contextTarget = null;

export function initContextMenu(onSelect, onCameraTarget) {
  const canvas = document.getElementById("game");
  const menu = document.getElementById("contextMenu");
  const selectBtn = document.getElementById("ctxSelect");
  const cameraBtn = document.getElementById("ctxCamera");

  // Right-click handler
  canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left - view.panX) / view.zoom;
    const my = (e.clientY - rect.top - view.panY) / view.zoom;

    contextTarget = null;
    for (const body of RigidBody.bodies) {
      const dx = mx - body.x;
      const dy = my - body.y;
      if (dx * dx + dy * dy <= body.radiusPX * body.radiusPX) {
        contextTarget = body;
        break;
      }
    }

    if (!contextTarget) return;

    // Position + show menu
    menu.style.display = "block";
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
  });

  // "Select Body"
  selectBtn.addEventListener("click", () => {
    if (contextTarget) onSelect(contextTarget);
    menu.style.display = "none";
  });

  // "Set Camera Target"
  cameraBtn.addEventListener("click", () => {
    if (contextTarget) onCameraTarget(contextTarget);
    menu.style.display = "none";
  });

  // Hide on click outside
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target)) menu.style.display = "none";
  });
}



export function getTimeScale() {
  return timeScale;
}

export function setTimeScale(val) {
  const sanitized = Math.max(1, Number(val) || 1);
  timeScale = sanitized;
  syncTimeScaleUI();
}

export function getSimTime() {
  return simTime;
}

export function addSimTime(dt) {
  simTime += dt;
  updateClockSegments(simTime);
}

document.getElementById("showPath").value

const showPathCheckbox = document.getElementById("showPath");

showPathCheckbox.addEventListener("change", () => {
    if (showPathCheckbox.checked) {
        showPathEnable = true;
    }
    else {
        showPathEnable = false;
    }
});

// Break sim time into Y / D / H / M / S
function breakdownTime(seconds) {
  const SECONDS_PER_DAY = 86400;
  const SECONDS_PER_YEAR = SECONDS_PER_DAY * 365;

  const years = Math.floor(seconds / SECONDS_PER_YEAR);
  let remaining = seconds % SECONDS_PER_YEAR;

  const days = Math.floor(remaining / SECONDS_PER_DAY);
  remaining = remaining % SECONDS_PER_DAY;

  const hours = Math.floor(remaining / 3600);
  remaining = remaining % 3600;

  const minutes = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);

  return { years, days, hours, minutes, seconds: secs };
}

function pad2(n) {
  return n.toString().padStart(2, "0");
}

function updateClockSegments(seconds) {
  const els = {
    years: document.getElementById("clockYears"),
    days: document.getElementById("clockDays"),
    hours: document.getElementById("clockHours"),
    minutes: document.getElementById("clockMinutes"),
    seconds: document.getElementById("clockSeconds"),
  };
  if (!els.years || !els.days || !els.hours || !els.minutes || !els.seconds) return;

  const t = breakdownTime(seconds);

  els.years.textContent = pad2(t.years);
  els.days.textContent = pad2(t.days);
  els.hours.textContent = pad2(t.hours);
  els.minutes.textContent = pad2(t.minutes);
  els.seconds.textContent = pad2(t.seconds);
}

export function ensureClockUI() {
  // make sure initial 0 is shown properly
  updateClockSegments(simTime);
}

function syncTimeScaleUI() {
  if (warpButtonsContainer) {
    if (timeScale === 1) {
      warpButtonsContainer.classList.remove("visible");
    } else {
      warpButtonsContainer.classList.add("visible");
    }
  }

  if (warpButtonsList.length) {
    warpButtonsList.forEach((btn) => {
      const btnScale = Number(btn.dataset.scale);
      const isActive = Number.isFinite(btnScale) && btnScale === timeScale;
      btn.classList.toggle("active", isActive);
    });
  }
}

// =====================================================
// TIME SCALE UI 
// =====================================================

export function ensureTimeScaleUI() {
  const panel = document.getElementById("timePanel");
  const warpButtons = document.getElementById("warpButtons");
  if (!panel || !warpButtons) return;

  warpButtonsContainer = warpButtons;
  warpButtonsList = Array.from(
    warpButtons.querySelectorAll("button[data-scale]")
  );

  const stopButton = document.getElementById("warpStopButton");

  // Hover only opens when at 1x
  panel.addEventListener("mouseenter", () => {
    warpButtons.classList.add("visible");
  });

  panel.addEventListener("mouseleave", () => {
    if (timeScale === 1) {
      warpButtons.classList.remove("visible");
    }
  });

  // Button click
  warpButtonsList.forEach((btn) => {
    const val = Number(btn.dataset.scale);
    btn.addEventListener("click", () => setTimeScale(val));
  });

  if (stopButton) {
    stopButton.addEventListener("click", () => setTimeScale(1));
  }

  // Initialize
  syncTimeScaleUI();
}


//settings
//if the showPath is true, show the path

// =====================================================
// SCALE HUD
// =====================================================




export function updateScaleUI(kmPerPx) {
  const text = document.getElementById("scaleText");
  if (text) {
    text.textContent = `${kmPerPx.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })} km / px`;
  }
}

export function updateSelectedBody(body, METERS_PER_PIXEL) {

  const nameEL = document.getElementById("bodyName");
  const massEl = document.getElementById("bodyMass");
  const parentEl = document.getElementById("bodyParent");
  const speedEl = document.getElementById("speedValue");
  const altitudeEl = document.getElementById("altitudeValue");
  const apoapsisEl = document.getElementById("apoapsisValue");
  const periapsisEl = document.getElementById("periapsisValue");
  const semiMajorEl = document.getElementById("semiMajorValue");
  const eccValueEl = document.getElementById("eccValue");
  const periodValueEl = document.getElementById("periodValue");

  if (nameEL) {
    nameEL.textContent = body?.name || "—";
  }

  if (massEl) {
    massEl.textContent = body ? `${body.mass.toExponential(3)} kg` : "—";
  }

  

  if (body.sObject){
    parentEl.textContent = "N/A";
    speedEl.textContent = "N/A";
    altitudeEl.textContent = "N/A";
    apoapsisEl.textContent = "N/A";
    periapsisEl.textContent = "N/A";
    semiMajorEl.textContent = "N/A";
    eccValueEl.textContent = "N/A";
    periodValueEl.textContent = "N/A";
    return;
  }

  if (parentEl) {
    parentEl.textContent = body && body.parent ? body.parent.name : "—";
    //console.log("parent: " + parentEl.textContent);
  }
   
  if (speedEl) {
    if ('orbit' in body && body.orbit) {
      //speed relative to parent
      const vx = body.vx - body.parent.vx;
      const vy = body.vy - body.parent.vy;
      const speedMps = Math.sqrt(vx * vx + vy * vy) * METERS_PER_PIXEL;
      speedEl.textContent = `${speedMps.toFixed(2)} m/s`;
    }
  }
  else {
      speedEl.textContent = "—";
  }
 
  //find the altitude relative to parent's surface
  if (altitudeEl) {
    if (body && body.parent) {
      const dx = (body.x - body.parent.x) * METERS_PER_PIXEL;
      const dy = (body.y - body.parent.y) * METERS_PER_PIXEL;
      const distanceM = Math.sqrt(dx * dx + dy * dy);
      const altitudeM = distanceM - (body.parent.radiusKM * 1000);
      altitudeEl.textContent = `${(altitudeM / 1000).toFixed(2)} km`;
    } else {
      altitudeEl.textContent = `—`;
    }
  }
  if (apoapsisEl) {
    if ('orbit' in body && body.orbit) {
      apoapsisEl.textContent = `${((body.orbit.apoapsis-(body.parent.radiusKM * 1000)) / 1000).toFixed(2)} km`;
    } else {
      apoapsisEl.textContent = `—`;
    }
  }
  if (periapsisEl) {
    if ('orbit' in body && body.orbit) {
      periapsisEl.textContent = `${((body.orbit.periapsis-(body.parent.radiusKM * 1000)) / 1000).toFixed(2)} km`;
    } else {
      periapsisEl.textContent = `—`;
    }
  }
  if (semiMajorEl) {
    if ('orbit' in body && body.orbit) {
      semiMajorEl.textContent = `${(body.orbit.a / 1000).toFixed(2)} km`;
    } else {
      semiMajorEl.textContent = `—`;
    }
  }
  if (eccValueEl) {
    if ('orbit' in body && body.orbit) {
      eccValueEl.textContent = `${body.orbit.e.toFixed(4)}`;
    } else {
      eccValueEl.textContent = `—`;
    }
  }
  //calculate orbital period in d, h:m:s
  if (periodValueEl) {
    if ('orbit' in body && body.orbit) {
      const mu = body.orbit.mu;
      const a = body.orbit.a;
      const periodSeconds = 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / mu);
      const breakdown = breakdownTime(periodSeconds);
      periodValueEl.textContent = `${breakdown.days}d ${pad2(breakdown.hours)}h:${pad2(breakdown.minutes)}m:${pad2(breakdown.seconds)}s`;
    }
  } else {
      periodValueEl.textContent = `—`;
  }

  
}



