import { Ship } from "./ship.js";
import { G } from "./object.js";
import { Sun } from "./Sun.js";
import { Mercury } from "./Mercury.js";
import { Venus } from "./Venus.js";
import { Earth } from "./Earth.js";
import { Moon } from "./Moon.js";
import { Mars } from "./Mars.js";
import { Jupiter } from "./Jupiter.js";
import { Saturn } from "./Saturn.js";
import { Uranus } from "./Uranus.js";
import { Neptune } from "./Neptune.js";
import {
  view,
  resizeCanvasToWindow,
  attachPanZoom,
  kmToPixels,
  Vector2D,
} from "./geometry.js";
import { initUI, getTimeScale, getWarpMode, addSimTime } from "./UI/ui.js";
import { collectTelemetry, METERS_PER_KM } from "./UI/format.js";
import { initContextMenu } from "./UI/contextMenu.js";

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

const ship = new Ship();
const sun = new Sun();
const mercury = new Mercury(sun);
const venus = new Venus(sun);
const earth = new Earth(sun);
const moon = new Moon(earth);
const mars = new Mars(sun);
const jupiter = new Jupiter(sun);
const saturn = new Saturn(sun);
const uranus = new Uranus(sun);
const neptune = new Neptune(sun);

const planets = [mercury, venus, earth, mars, jupiter, saturn, uranus, neptune];
const pickableBodies = [sun, ...planets, moon, ship];

let selectedBody = ship;
let cameraTarget = earth;
let lastCameraTargetPos = null;

// Center camera on Earth to start
view.panX = canvas.width / 2;
view.panY = canvas.height / 2;
view.zoom = 0.002;
centerCameraOnBody(earth);
lastCameraTargetPos = { x: earth.realPosition.x, y: earth.realPosition.y };

// ------------------------------------------------------
// Time
// ------------------------------------------------------

let lastTime = performance.now();

// Place ship on Earth's surface (resting, no initial velocity relative to Earth)
if (earth) {
  const surfaceOffset = new Vector2D(earth.realRadius + ship.realRadius, 0, true);
  ship.realPosition = earth.realPosition.add(surfaceOffset);
  ship.realVelocity = earth.realVelocity.clone();
  ship.groundedOn = earth;
  ship.groundedNormal = surfaceOffset.normalize();
}

// Prime trajectories for orbiters
planets.forEach((p) => p.computeTrajectory());
moon.computeTrajectory();
ship.computeTrajectory();

// ------------------------------------------------------
// Camera helpers
// ------------------------------------------------------
function centerCameraOnBody(body) {
  if (!body) return;
  const width = canvas.width;
  const height = canvas.height;
  const bodyXWorld = kmToPixels(body.realPosition.x / METERS_PER_KM);
  const bodyYWorld = kmToPixels(body.realPosition.y / METERS_PER_KM);

  view.panX = width / 2 - bodyXWorld * view.zoom;
  view.panY = height / 2 - bodyYWorld * view.zoom;
}

function setCameraTarget(body) {
  cameraTarget = body;
  lastCameraTargetPos = body
    ? { x: body.realPosition.x, y: body.realPosition.y }
    : null;
  if (body) {
    centerCameraOnBody(body);
  }
}

function applyCameraFollow() {
  if (!cameraTarget || !lastCameraTargetPos) return;

  const dxMeters = cameraTarget.realPosition.x - lastCameraTargetPos.x;
  const dyMeters = cameraTarget.realPosition.y - lastCameraTargetPos.y;

  const dxWorld = kmToPixels(dxMeters / METERS_PER_KM);
  const dyWorld = kmToPixels(dyMeters / METERS_PER_KM);

  view.panX -= dxWorld * view.zoom;
  view.panY -= dyWorld * view.zoom;

  lastCameraTargetPos = {
    x: cameraTarget.realPosition.x,
    y: cameraTarget.realPosition.y,
  };
}

function ensureTrajectory(body) {
  if (!body || body.sBody || body.motionMode !== "kepler") return;
  if (!body.trajectory || !body.parent) {
    body.computeTrajectory();
  }
}

// ------------------------------------------------------
// Context menu wiring
// ------------------------------------------------------

initContextMenu({
  canvas,
  view,
  pickableBodies,
  onSelect: (body) => {
    selectedBody = body;
    ensureTrajectory(selectedBody);
    ui.setData(
      collectTelemetry(selectedBody, {
        defaultBody: ship,
        fallbackParent: sun,
        cameraTarget,
        ensureTrajectory,
      })
    );
  },
  onFocus: (body) => {
    setCameraTarget(body);
  },
  onTarget: () => {
    // placeholder
  },
});

// ------------------------------------------------------
// Keyboard shortcuts
// ------------------------------------------------------

window.addEventListener("keydown", (e) => {
  if (e.key === "c" || e.key === "C") {
    ui?.setTimeScale?.(1);
  }
});

// Attitude hold (legend buttons)
document.addEventListener("attitude-mode", (e) => {
  const mode = e.detail?.mode || null;
  if (typeof ship.setAutopilotMode === "function") {
    ship.setAutopilotMode(mode);
  }
});

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

sun.update(simDt);
planets.forEach((p) => p.update(simDt));
moon.update(simDt);
ship.update(simDt, warpMode);
applyCameraFollow();

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.setTransform(view.zoom, 0, 0, view.zoom, view.panX, view.panY);

sun.draw(ctx);
planets.forEach((p) => p.draw(ctx));
moon.draw(ctx);
ship.draw(ctx);

  ui.setData(
    collectTelemetry(selectedBody, {
      defaultBody: ship,
      fallbackParent: sun,
      cameraTarget,
      ensureTrajectory,
    })
  );

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
