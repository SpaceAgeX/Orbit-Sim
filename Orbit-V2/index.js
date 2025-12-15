import { Earth } from "./Earth.js";
import { Ship } from "./ship.js";
import { Moon } from "./moon.js";
import { view, resizeCanvasToWindow, attachPanZoom } from "./geometry.js";
import { initUI, getTimeScale, getWarpMode, addSimTime } from "./ui.js";

const METERS_PER_KM = 1000;
const STANDARD_GRAVITY = 9.80665;
const RAD_TO_DEG = 180 / Math.PI;

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
// UI initialization
// ------------------------------------------------------

const ui = initUI();

// ------------------------------------------------------
// World setup
// ------------------------------------------------------

const earth = new Earth();
const ship = new Ship();
const moon = new Moon();

// Center camera on Earth
view.panX = canvas.width / 2;
view.panY = canvas.height / 2;


// ------------------------------------------------------
// Time
// ------------------------------------------------------

let lastTime = performance.now();

// Initialize trajectory before the loop starts
ship.computeTrajectory();
moon.computeTrajectory();

// ------------------------------------------------------
// Formatting helpers
// ------------------------------------------------------

function formatDistance(meters) {
  if (!Number.isFinite(meters)) return "--";
  const abs = Math.abs(meters);
  if (abs >= 1e9) return `${(meters / 1e9).toFixed(2)} Gm`;
  if (abs >= 1e6) return `${(meters / 1e6).toFixed(2)} Mm`;
  if (abs >= 1e3) return `${(meters / 1e3).toFixed(1)} km`;
  return `${meters.toFixed(0)} m`;
}

function formatVelocity(mps) {
  return Number.isFinite(mps) ? `${mps.toFixed(0)} m/s` : "--";
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return "--";
  const sign = seconds < 0 ? "-" : "";
  let t = Math.abs(seconds);
  const hours = Math.floor(t / 3600);
  t -= hours * 3600;
  const minutes = Math.floor(t / 60);
  t -= minutes * 60;
  const secs = Math.floor(t);
  if (hours > 0) return `${sign}${hours}:${minutes}:${secs}`;
  if (minutes > 0) return `${sign}${minutes}:${secs}`;
  return `${sign}${secs}s`;
}

const toDegrees = (rad) => rad * RAD_TO_DEG;

function formatHeading(degrees) {
  if (!Number.isFinite(degrees)) return "--";
  const normalized = ((degrees % 360) + 360) % 360;
  return `${normalized.toFixed(0).padStart(3, "0")} \u00B0`;
}

function buildOrbitalReadouts(trajectory, parent) {
  const empty = {
    apoapsis: "--",
    timeToAp: "--",
    periapsis: "--",
    timeToPe: "--",
    eccentricity: "--",
    period: "--",
    semiMajorAxis: "--",
    argumentOfPeriapsis: "--",
  };

  if (!trajectory || !trajectory.valid || !parent) {
    return empty;
  }

  const { a, e, omega, mu } = trajectory;
  const parentRadiusMeters = parent.realRadius * METERS_PER_KM;

  const apoapsis = a * (1 + e) - parentRadiusMeters;
  const periapsis = a * (1 - e) - parentRadiusMeters;
  const period = e < 1 ? 2 * Math.PI * Math.sqrt(Math.abs(a ** 3) / mu) : NaN;

  return {
    ...empty,
    apoapsis: formatDistance(apoapsis),
    periapsis: formatDistance(periapsis),
    eccentricity: Number.isFinite(e) ? e.toFixed(3) : "--",
    period: Number.isFinite(period) ? formatDuration(period) : "--",
    semiMajorAxis: formatDistance(a),
    argumentOfPeriapsis: Number.isFinite(omega) ? `${toDegrees(omega).toFixed(1)} \u00B0` : "--",
  };
}

function collectTelemetry() {
  const parent = ship.parent ?? earth;
  const relativePos = parent ? ship.realPosition.sub(parent.realPosition) : ship.realPosition;
  const altitudeMeters = parent
    ? relativePos.mag() - parent.realRadius * METERS_PER_KM
    : relativePos.mag();

  const speed = ship.realVelocity.mag();
  const accelMs2 = ship.netForce?.mag ? ship.netForce.mag() / ship.mass : 0;
  const headingRad = Math.atan2(ship.realVelocity.y, ship.realVelocity.x);

  const orbital = buildOrbitalReadouts(ship.trajectory, parent);

  return {
    ...orbital,
    altitude: formatDistance(altitudeMeters),
    velocity: formatVelocity(speed),
    accel: Number.isFinite(accelMs2) ? `${(accelMs2 / STANDARD_GRAVITY).toFixed(2)} g` : "--",
    heading: formatHeading(toDegrees(headingRad)),
    headingRad,
    thrustPct: 0,

    // Targeting (placeholder values for now)
    targetRelVel: "--",
    targetSeparation: "--",
    targetClosest: "--",
    targetTimeCA: "--",

    // Body info
    bodySelected: parent?.name || "Earth",
    bodyMass: parent?.mass ? `${parent.mass.toExponential(2)} kg` : "--",
    bodySituation: ship.motionMode === "kepler" ? "On rails" : "Simulated",
    bodySOI: parent?.name || "--",
    bodyLockedOn: ship.motionMode === "kepler" ? "No" : "Yes",

    // Maneuver (placeholders)
    manDeltaV: "--",
    manDuration: "--",
    manBurnStart: "--",
    manTWR: "--",
    manHeading: "--",
  };
}

// ------------------------------------------------------
// Main loop
// ------------------------------------------------------

function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  const scale = getTimeScale();
  const warpMode = getWarpMode();
  const simDt = dt * scale;

  addSimTime(simDt);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.setTransform(view.zoom, 0, 0, view.zoom, view.panX, view.panY);

  earth.draw(ctx);

  moon.update(simDt);
  moon.draw(ctx);

  ship.update(simDt, warpMode);
  ship.draw(ctx);

  ui.setData(collectTelemetry());

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
