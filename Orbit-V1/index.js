// ----- Entry: setup, bodies, loop -----

import {
  KM_PER_PIXEL, METERS_PER_PIXEL,
  view, resizeCanvasToWindow, getCanvasCssSize,
  attachPanZoom, kmToPixels
} from './geometry.js';

import { RigidBody, gravitationalConstant } from './rigidBody.js';
import { ensureClockUI, initContextMenu, ensureTimeScaleUI, updateScaleUI, getTimeScale, addSimTime, updateSelectedBody, setTimeScale } from './UI.js';

import { Earth } from './earth.js';
import { Ship } from './ship.js';
import { Moon } from './moon.js';

import { Input } from "./input.js";
Input.init();

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });

// camera velocity-follow state
let cameraTarget = null;
let lastCamTargetX = null;
let lastCamTargetY = null;


// Resize & interactions
function onResize() { resizeCanvasToWindow(canvas, ctx); }
window.addEventListener('resize', onResize);
onResize();
attachPanZoom(canvas);

// UI
ensureClockUI();
ensureTimeScaleUI();


// Sample bodies (Earth + ship)
const { width: W, height: H } = getCanvasCssSize(canvas);
const centerX = W / 2;
const centerY = H / 2;

const earth = new Earth({ x: centerX, y: centerY });

const SHIP_ALTITUDE_KM = 550;
const orbitRadiusKm = earth.radiusKM + SHIP_ALTITUDE_KM;
const orbitRadiusPx = kmToPixels(orbitRadiusKm);
const orbitalSpeedMps = Math.sqrt(gravitationalConstant * earth.mass / orbitRadiusKm * 1000)/1000;

const ship = new Ship({
  x: centerX + orbitRadiusPx, y: centerY,
  vy: -(orbitalSpeedMps / METERS_PER_PIXEL),
});



const MOON_SEMI_MAJOR_KM = 384_400;
const MOON_ORBITAL_SPEED_MPS = 1022;
const moon = new Moon({
  x: centerX + kmToPixels(MOON_SEMI_MAJOR_KM),
  y: centerY,
  vy: -(MOON_ORBITAL_SPEED_MPS / METERS_PER_PIXEL),
});


// default selection
let selectedBody = ship;
updateSelectedBody(selectedBody, METERS_PER_PIXEL);

// initialize context menu UI
initContextMenu(
  // --- SELECT BODY ---
  (body) => {
    selectedBody = body;
    updateSelectedBody(selectedBody, METERS_PER_PIXEL);
  },

  // --- CAMERA TARGET ---
  (body) => {
    cameraTarget = body;
    document.getElementById("CameraTarget").textContent = body.name;

    // Center exactly ONCE when the user selects the target
    const { width: W, height: H } = getCanvasCssSize(canvas);
    view.panX = W / 2 - body.x * view.zoom;
    view.panY = H / 2 - body.y * view.zoom;

    // Prepare for velocity-based tracking
    lastCamTargetX = body.x;
    lastCamTargetY = body.y;
  }
);


// ===== NOTE: Clicking empty space NO LONGER unlocks camera =====
// (Removed the auto-unlock behavior you previously had)


// Physics Update
function update(dt) {
  RigidBody.updateAll(dt);
}


// Rendering
function draw() {

  // VELOCITY-MATCHED CAMERA LOCK
  if (cameraTarget) {

    // if first frame after setting target
    if (lastCamTargetX === null) {
      lastCamTargetX = cameraTarget.x;
      lastCamTargetY = cameraTarget.y;
    }

    // compute delta motion of the target (world coords → screen coords)
    const dx = (cameraTarget.x - lastCamTargetX) * view.zoom;
    const dy = (cameraTarget.y - lastCamTargetY) * view.zoom;

    // shift camera by same amount → match its velocity
    view.panX -= dx;
    view.panY -= dy;

    // update memory
    lastCamTargetX = cameraTarget.x;
    lastCamTargetY = cameraTarget.y;
  }

  // background
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const kmPerPx = view.zoom > 0 ? (KM_PER_PIXEL / view.zoom) : Infinity;

  // world-space render
  ctx.save();
  ctx.translate(view.panX, view.panY);
  ctx.scale(view.zoom, view.zoom);

  earth.draw(ctx);
  ship.draw(ctx);
  moon.draw(ctx);

  ctx.restore();

  updateScaleUI(kmPerPx);
}


// Stable loop with sub-steps + time-scale clock
let lastTime = performance.now();

function loop(now) {
  const rawDt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;

  if (Input.pressed("KeyC")) {
    setTimeScale(1);
  }

  const timeScale = getTimeScale();
  let scaledDt = rawDt * timeScale;

  const MAX_STEP = 1 / 120;
  let remaining = scaledDt;

  while (remaining > 0) {
    const step = Math.min(MAX_STEP, remaining);
    update(step);
    remaining -= step;
  }

  addSimTime(scaledDt);
  updateSelectedBody(selectedBody, METERS_PER_PIXEL);

  Input.update();

  draw();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
