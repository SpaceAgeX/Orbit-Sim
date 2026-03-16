// ----- Geometry & Drawing helpers -----

// Sizing/scaling
export const KM_PER_PIXEL = 10;
export const METERS_PER_PIXEL = KM_PER_PIXEL * 1000;

// View (pan/zoom) defined by km-per-pixel bounds
export const MIN_KM_PER_PIXEL = 1;   // closest view (highest detail)
export const MAX_KM_PER_PIXEL = 2000; // farthest view
export const MIN_ZOOM = KM_PER_PIXEL / MAX_KM_PER_PIXEL;
export const MAX_ZOOM = KM_PER_PIXEL / MIN_KM_PER_PIXEL;

export const view = { zoom: 0.5, panX: 400, panY: 200 };

export function kmToPixels(km) {
  return km / KM_PER_PIXEL;
}
export function mpsToPixelsPerSecond(mps) {
  return mps / METERS_PER_PIXEL;
}
export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function effectiveKmPerPixel() {
  return KM_PER_PIXEL / view.zoom;
}

// Canvas DPI-resize
export function resizeCanvasToWindow(canvas, ctx) {
  const cssWidth = window.innerWidth;
  const cssHeight = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(cssWidth * dpr);
  canvas.height = Math.floor(cssHeight * dpr);
  canvas.style.width = cssWidth + 'px';
  canvas.style.height = cssHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

export function getCanvasCssSize(canvas) {
  const dpr = window.devicePixelRatio || 1;
  return { width: canvas.width / dpr, height: canvas.height / dpr };
}

function clampZoomToLimits(canvas, targetZoom) {
  return clamp(targetZoom, MIN_ZOOM, MAX_ZOOM);
}

function zoomAt(canvas, pointerX, pointerY, deltaSteps) {
  const kmPerPx = effectiveKmPerPixel();
  const sensitivity = 0.12 * (1 + Math.log10(1 + kmPerPx));
  const zoomFactor = Math.exp(deltaSteps * sensitivity);
  const targetZoom = clampZoomToLimits(canvas, view.zoom * zoomFactor);
  if (targetZoom === view.zoom) return;

  const worldX = (pointerX - view.panX) / view.zoom;
  const worldY = (pointerY - view.panY) / view.zoom;
  view.zoom = targetZoom;
  view.panX = pointerX - worldX * view.zoom;
  view.panY = pointerY - worldY * view.zoom;
}

// Pan/zoom interaction
export function attachPanZoom(canvas) {
  let isPanning = false;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let activePointerId = null;

  canvas.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      const pointerX = event.offsetX;
      const pointerY = event.offsetY;
      const deltaSteps = -Math.sign(event.deltaY || -1) * Math.min(1, Math.abs(event.deltaY) / 100);
      zoomAt(canvas, pointerX, pointerY, deltaSteps);
    },
    { passive: false }
  );

  canvas.addEventListener('pointerdown', (event) => {
    isPanning = true;
    activePointerId = event.pointerId;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!isPanning || event.pointerId !== activePointerId) return;
    const dx = event.clientX - lastPointerX;
    const dy = event.clientY - lastPointerY;
    view.panX += dx;
    view.panY += dy;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
  });

  function endPan(event) {
    if (event.pointerId !== activePointerId) return;
    isPanning = false;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    activePointerId = null;
  }
  canvas.addEventListener('pointerup', endPan);
  canvas.addEventListener('pointercancel', endPan);
  canvas.addEventListener('pointerleave', endPan);

  window.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    const direction = event.key === 'ArrowUp' ? 1 : -1;
    const pointerX = canvas.clientWidth / 2;
    const pointerY = canvas.clientHeight / 2;
    zoomAt(canvas, pointerX, pointerY, direction);
  });
}

// Drawing helpers for arrows/triangles
const TRI_SIDE = 24;
const TRI_HEIGHT = (Math.sqrt(3) / 2) * TRI_SIDE;

export function drawTriangleForBody(ctx, body, dirX, dirY, distanceFromCenter, color) {
  const length = Math.hypot(dirX, dirY);
  if (length < 0.0001) return;
  const ux = dirX / length;
  const uy = dirY / length;
  const baseCenterX = body.x + ux * distanceFromCenter;
  const baseCenterY = body.y + uy * distanceFromCenter;
  const perpX = -uy;
  const perpY = ux;
  const halfBase = TRI_SIDE / 2;

  const leftX = baseCenterX + perpX * halfBase;
  const leftY = baseCenterY + perpY * halfBase;
  const rightX = baseCenterX - perpX * halfBase;
  const rightY = baseCenterY - perpY * halfBase;
  const tipX = baseCenterX + ux * TRI_HEIGHT;
  const tipY = baseCenterY + uy * TRI_HEIGHT;

  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(leftX, leftY);
  ctx.lineTo(rightX, rightY);
  ctx.lineTo(tipX, tipY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
