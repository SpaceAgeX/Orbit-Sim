import { Ship } from "./ship.js";
import { Earth } from "./earth.js";
import { Moon } from "./moon.js";
import { circularVelocity } from "./planetBase.js";
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

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d", { alpha: false });

let selectedBody = null;
let cameraTarget = null;

function onResize() {
  resizeCanvasToWindow(canvas, ctx);
  // Keep the camera centered on the active target after resizing
  if (cameraTarget) {
    centerCameraOnBody(cameraTarget);
  }
}
window.addEventListener("resize", onResize);

view.panX = canvas.width / 2;
view.panY = canvas.height / 2;
view.zoom = 0.1;

attachPanZoom(canvas);

const ui = initUI();
ui.setCanvasRef(canvas);

const ship = new Ship();
const earth = new Earth();
const moon = new Moon(earth);

// Initial resize should happen after initial camera target is set
onResize();
const moonOrbitRadius = 384_400_000;
const moonOrbitSpeed = circularVelocity(earth.mass, moonOrbitRadius);

const pickableBodies = [earth, moon, ship];

selectedBody = ship;
cameraTarget = ship;
let targetBody = null;
let lastCameraTargetPos = null;

centerCameraOnBody(earth, { x: 50, y: 25 });
lastCameraTargetPos = { x: earth.realPosition.x, y: earth.realPosition.y };

// Ensure the slider matches initial zoom
ui.updateScaleDisplay();

let lastTime = performance.now();

const surfaceOffset = new Vector2D(earth.realRadius + ship.realRadius, 0, true);
ship.realPosition = earth.realPosition.add(surfaceOffset);
ship.realVelocity = earth.realVelocity.clone();
ship.groundedOn = earth;
ship.groundedNormal = surfaceOffset.normalize();

moon.realPosition = earth.realPosition.add(new Vector2D(moonOrbitRadius, 0, true));
moon.realVelocity = earth.realVelocity.add(new Vector2D(0, -moonOrbitSpeed, true));

moon.computeTrajectory();
ship.computeTrajectory();

function centerCameraOnBody(body, offset = { x: 0, y: 0 }) {
  if (!body) return;
  const width = canvas.width;
  const height = canvas.height;
  const bodyXWorld = kmToPixels(body.realPosition.x / METERS_PER_KM);
  const bodyYWorld = kmToPixels(body.realPosition.y / METERS_PER_KM);

  view.panX = width / 2 - bodyXWorld * view.zoom + offset.x;
  view.panY = height / 2 - bodyYWorld * view.zoom + offset.y;
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

function syncBodyWarpMode(body, warpMode, dt) {
  if (!body || body.sBody || typeof body.switchState !== "function") return;

  const targetMotionMode = warpMode === "physics" ? "nbody" : "kepler";
  if (body.motionMode !== targetMotionMode) {
    body.switchState(warpMode, dt);
  }

  if (targetMotionMode === "kepler" && (!body.trajectory || !body.parent)) {
    body.computeTrajectory();
  }
}

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
        fallbackParent: earth,
        cameraTarget,
        targetBody,
        ensureTrajectory,
      })
    );
  },
  onFocus: (body) => {
    setCameraTarget(body);
  },
  onTarget: (body) => {
    targetBody = body || null;
    ui.setData(
      collectTelemetry(selectedBody, {
        defaultBody: ship,
        fallbackParent: earth,
        cameraTarget,
        targetBody,
        ensureTrajectory,
      })
    );
  },
});

window.addEventListener("keydown", (event) => {
  if (event.key === "c" || event.key === "C") {
    ui?.setTimeScale?.(1);
  }
});

document.addEventListener("attitude-mode", (event) => {
  const mode = event.detail?.mode || null;
  if (typeof ship.setAutopilotMode === "function") {
    ship.setAutopilotMode(mode);
  }
});

function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  const scale = getTimeScale();
  const warpMode = getWarpMode();
  const simDt = dt * scale;

  addSimTime(simDt);

  syncBodyWarpMode(moon, warpMode, simDt);
  syncBodyWarpMode(ship, warpMode, simDt);

  moon.update(simDt);
  ship.update(dt, simDt, warpMode);
  applyCameraFollow();

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.setTransform(view.zoom, 0, 0, view.zoom, view.panX, view.panY);

  earth.draw(ctx);
  moon.draw(ctx);
  ship.draw(ctx);

  ui.setData(
    collectTelemetry(selectedBody, {
      defaultBody: ship,
      fallbackParent: earth,
      cameraTarget,
      targetBody,
      ensureTrajectory,
    })
  );

  // Update scale display
  ui.updateScaleDisplay();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
