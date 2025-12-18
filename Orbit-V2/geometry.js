// geometry.js
// =====================================================
// Geometry & Camera Utilities (V2)
// - Vector2D (real-space math)
// - View / pan / zoom (screen-space only)
// =====================================================

/* =====================================================
   Vector2D — Real-space math only
   Units: meters, m/s, radians
===================================================== */

export class Vector2D {
  constructor(a = 0, b = 0, cartesian = true) {
    if (cartesian) {
      this.x = a;
      this.y = b;
      this._updatePolar();
    } else {
      // polar input: a = r, b = angle (rad)
      this.r = a;
      this.angle = b;
      this._updateCartesian();
    }
  }

  // --- internal sync ---
  _updatePolar() {
    this.r = Math.hypot(this.x, this.y);
    this.angle = Math.atan2(this.y, this.x);
  }

  _updateCartesian() {
    this.x = this.r * Math.cos(this.angle);
    this.y = this.r * Math.sin(this.angle);
  }

  _syncFromCartesian(x, y) {
    this.x = x;
    this.y = y;
    this._updatePolar();
    return this;
  }

  _syncFromPolar(r, angle) {
    this.r = r;
    this.angle = angle;
    this._updateCartesian();
    return this;
  }

  // --- cloning & setters ---
  clone() {
    return new Vector2D(this.x, this.y, true);
  }

  setCartesian(x, y) {
    return this._syncFromCartesian(x, y);
  }

  setPolar(r, angle) {
    return this._syncFromPolar(r, angle);
  }

  // --- arithmetic (immutable) ---
  add(v) { return new Vector2D(this.x + v.x, this.y + v.y, true); }
  sub(v) { return new Vector2D(this.x - v.x, this.y - v.y, true); }
  mul(s) { return new Vector2D(this.x * s, this.y * s, true); }
  div(s) { return new Vector2D(this.x / s, this.y / s, true); }

  // --- dot & cross ---
  dot(v) { return this.x * v.x + this.y * v.y; }
  cross(v) { return this.x * v.y - this.y * v.x; }

  // --- magnitudes ---
  mag() { return this.r; }
  magSq() { return this.x * this.x + this.y * this.y; }

  normalize() {
    if (this.r === 0) return new Vector2D(0, 0, true);
    return this.div(this.r);
  }

  // --- angles & rotation ---
  angleTo(v) {
    const denom = this.r * v.r;
    if (denom === 0) return 0;
    const cos = this.dot(v) / denom;
    return Math.acos(Math.max(-1, Math.min(1, cos)));
  }

  signedAngleTo(v) {
    return Math.atan2(this.cross(v), this.dot(v));
  }

  rotate(rad) {
    return new Vector2D(this.r, this.angle + rad, false);
  }

  perpendicular() {
    return new Vector2D(-this.y, this.x, true);
  }

  projectOnto(v) {
    const scale = this.dot(v) / v.magSq();
    return v.mul(scale);
  }

  toString(p = 3) {
    return `Vector2D(x=${this.x.toFixed(p)}, y=${this.y.toFixed(p)}, r=${this.r.toFixed(p)}, θ=${this.angle.toFixed(p)})`;
  }
}

/* =====================================================
   View / Camera utilities (screen-space only)
===================================================== */

// --- scale constants (used ONLY for drawing) ---
export const KM_PER_PIXEL = 10;
const METERS_PER_PIXEL = KM_PER_PIXEL * 1000;

// View bounds (km-per-pixel based zoom limits)
// Allow very large scales to see the full solar system
export const MIN_KM_PER_PIXEL = 1;
export const MAX_KM_PER_PIXEL = 10_000_000;

export const MIN_ZOOM = KM_PER_PIXEL / MAX_KM_PER_PIXEL;
export const MAX_ZOOM = KM_PER_PIXEL / MIN_KM_PER_PIXEL;

// Camera state
export const view = {
  zoom: 0.5,
  panX: 400,
  panY: 200
};

// --- helpers ---
export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function effectiveKmPerPixel() {
  return KM_PER_PIXEL / view.zoom;
}

export function kmToPixels(km) {
  return km / KM_PER_PIXEL;
}

export function mToPixels(m) {
  return m / METERS_PER_PIXEL;
}


// --- canvas DPI resize ---
export function resizeCanvasToWindow(canvas, ctx) {
  const cssWidth = window.innerWidth;
  const cssHeight = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.floor(cssWidth * dpr);
  canvas.height = Math.floor(cssHeight * dpr);
  canvas.style.width = cssWidth + "px";
  canvas.style.height = cssHeight + "px";

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

export function getCanvasCssSize(canvas) {
  const dpr = window.devicePixelRatio || 1;
  return {
    width: canvas.width / dpr,
    height: canvas.height / dpr
  };
}

// --- zoom internals ---
function clampZoom(targetZoom) {
  return clamp(targetZoom, MIN_ZOOM, MAX_ZOOM);
}

function zoomAt(canvas, px, py, deltaSteps) {
  const kmPerPx = effectiveKmPerPixel();
  const sensitivity = 0.12 * (1 + Math.log10(1 + kmPerPx));
  const zoomFactor = Math.exp(deltaSteps * sensitivity);

  const targetZoom = clampZoom(view.zoom * zoomFactor);
  if (targetZoom === view.zoom) return;

  const worldX = (px - view.panX) / view.zoom;
  const worldY = (py - view.panY) / view.zoom;

  view.zoom = targetZoom;
  view.panX = px - worldX * view.zoom;
  view.panY = py - worldY * view.zoom;
}

// --- pan / zoom interaction ---
export function attachPanZoom(canvas) {
  let isPanning = false;
  let lastX = 0;
  let lastY = 0;
  let activePointer = null;

  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const steps = -Math.sign(e.deltaY) * Math.min(1, Math.abs(e.deltaY) / 100);
      zoomAt(canvas, e.offsetX, e.offsetY, steps);
    },
    { passive: false }
  );

  canvas.addEventListener("pointerdown", (e) => {
    isPanning = true;
    activePointer = e.pointerId;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!isPanning || e.pointerId !== activePointer) return;
    view.panX += e.clientX - lastX;
    view.panY += e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
  });

  function endPan(e) {
    if (e.pointerId !== activePointer) return;
    isPanning = false;
    canvas.releasePointerCapture(e.pointerId);
    activePointer = null;
  }

  canvas.addEventListener("pointerup", endPan);
  canvas.addEventListener("pointercancel", endPan);
  canvas.addEventListener("pointerleave", endPan);

  // Keyboard zoom (optional)
  window.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    const dir = e.key === "ArrowUp" ? 1 : -1;
    zoomAt(canvas, canvas.clientWidth / 2, canvas.clientHeight / 2, dir);
  });
}
