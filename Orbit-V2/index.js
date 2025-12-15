// index.js
// ======================================================
// Entry point — world + camera + UI (correct API)
// ======================================================
console.log("index.js running");

import { Earth } from "./Earth.js";
import {
  view,
  resizeCanvasToWindow,
  attachPanZoom,
  effectiveKmPerPixel
} from "./geometry.js";

import { initUI, getTimeScale, addSimTime } from "./ui.js";

// ------------------------------------------------------
// Canvas setup
// ------------------------------------------------------

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d", { alpha: false });

function onResize() {
  resizeCanvasToWindow(canvas, ctx);
}
window.addEventListener("resize", onResize);
onResize();

attachPanZoom(canvas);

// ------------------------------------------------------
// UI initialization ✅
// ------------------------------------------------------

const ui = initUI();



// ------------------------------------------------------
// World setup
// ------------------------------------------------------

const earth = new Earth();

// Center camera on Earth
view.panX = canvas.width / 2;
view.panY = canvas.height / 2;

// ------------------------------------------------------
// Time
// ------------------------------------------------------

let simTime = 0;
let lastTime = performance.now();

// ------------------------------------------------------
// Main loop
// ------------------------------------------------------

function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  simTime += dt;

  // ----------------------
  // Render
  // ----------------------

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.setTransform(
    view.zoom,
    0,
    0,
    view.zoom,
    view.panX,
    view.panY
  );

  earth.draw(ctx);

  // ----------------------
  // UI update (push data)
  // ----------------------

  ui.setData({
  // --- HUD ---
  altitude: "0 m",
  velocity: "0 m/s",
  accel: "0.00 g",
  //degree symbol
  heading: "000°",
  thrustPct: 0,

  // --- Orbital ---
  apoapsis: "—",
  timeToAp: "—",
  periapsis: "—",
  timeToPe: "—",
  eccentricity: "—",
  period: "—",
  sma: "—",
  argumentOfPeriapsis: "—",

  // --- Target ---
  targetRelVel: "—",
  targetSeparation: "—",
  targetClosest: "—",
  targetTimeCA: "—",

  // --- Body ---
  bodySelected: "Earth",
  bodyMass: "5.97e24 kg",
  bodySituation: "Static",
  bodySOI: "—",
  bodyLockedOn: "No",

  // --- Maneuver ---
  manDeltaV: "—",
  manDuration: "—",
  manBurnStart: "—",
  manTWR: "—",
  manHeading: "—"
  });

  // ----------------------
  // Time
  // ----------------------

  const scale = getTimeScale();   // from warp buttons
  const simDt = dt * scale;

  addSimTime(simDt);


  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
