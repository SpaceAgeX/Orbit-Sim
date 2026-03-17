// Ship.js
// V2 ship with V1-style controls (thrust, rotation) and triangle rendering

import { Body } from "./object.js";
import { Vector2D, kmToPixels, clamp, effectiveKmPerPixel, view } from "./geometry.js";

// Simple key tracking (per-frame "pressed" + held state)
const inputState = {
  initialized: false,
  down: new Set(),
  pressed: new Set(),
};

const ensureInput = () => {
  if (inputState.initialized) return;
  inputState.initialized = true;

  window.addEventListener("keydown", (e) => {
    if (!inputState.down.has(e.code)) {
      inputState.pressed.add(e.code);
    }
    inputState.down.add(e.code);
  });

  window.addEventListener("keyup", (e) => {
    inputState.down.delete(e.code);
    inputState.pressed.delete(e.code);
  });
};

const isDown = (code) => inputState.down.has(code);
const consumePressed = (code) => {
  const has = inputState.pressed.has(code);
  inputState.pressed.delete(code);
  return has;
};
const clearPressed = () => inputState.pressed.clear();

const SHIP_MASS_KG = 1000;
const SHIP_RADIUS_M = 8; // meters
const THROTTLE_RATE_PER_SEC = 0.5;
const ROTATION_RATE_RAD = 1.5;
const MAX_THRUST_N = 100000;
const normalizeAngle = (a) => {
  const twoPi = Math.PI * 2;
  a = a % twoPi;
  return a < -Math.PI ? a + twoPi : a > Math.PI ? a - twoPi : a;
};

export class Ship extends Body {
  constructor() {
    super({
      name: "Ship",
      position: new Vector2D(6371000 + SHIP_RADIUS_M, 0, true),   // meters (resting on Earth surface)
      velocity: new Vector2D(0, 0, true),  // m/s
      mass: SHIP_MASS_KG,
      radius: SHIP_RADIUS_M,                  // meters
      sBody: false,
      influential: false,
      motionMode: "nbody",
      controlable: true
    });

    this.angle = Math.PI / 2; // radians, 0 = facing up (negative Y)
    this.thrustPercent = 0;
    this.thrustMaxN = MAX_THRUST_N;
    this.localMode = "physics";
    this.externalForce = new Vector2D(0, 0, true);
    this.autopilotMode = null; // "prograde" | "retrograde" | "radialOut" | "radialIn" | null

    ensureInput();
  }

  setAutopilotMode(mode) {
    this.autopilotMode = mode;
  }

  getAutopilotVector() {
    const parent = this.parent;

    const relVelocity = parent
      ? this.realVelocity.sub(parent.realVelocity)
      : this.realVelocity;
    const relPosition = parent
      ? this.realPosition.sub(parent.realPosition)
      : this.realPosition;

    const mode = this.autopilotMode;
    if (!mode) return null;

    const velMag = relVelocity.mag();
    const posMag = relPosition.mag();

    if (mode === "prograde" && velMag > 0) {
      return relVelocity.normalize();
    }
    if (mode === "retrograde" && velMag > 0) {
      return relVelocity.normalize().mul(-1);
    }
    if (mode === "radialOut" && posMag > 0) {
      return relPosition.normalize();
    }
    if (mode === "radialIn" && posMag > 0) {
      return relPosition.normalize().mul(-1);
    }

    return null;
  }

  applyAutopilotRotation(dt) {
    const targetVec = this.getAutopilotVector();
    if (!targetVec) return false;

    const desiredAngle = Math.atan2(targetVec.x, -targetVec.y);
    let diff = normalizeAngle(desiredAngle - this.angle);

    const maxStep = ROTATION_RATE_RAD * dt;
    if (Math.abs(diff) <= maxStep) {
      this.angle = desiredAngle;
      return true;
    }

    this.angle = normalizeAngle(this.angle + Math.sign(diff) * maxStep);
    return true;
  }

  applyControls(dt, normalizedWarp) {
    // Controls always enabled for consistent response speed
    const controlsEnabled = true;

    if (!controlsEnabled) {
      this.thrustPercent = 0;
      this.externalForce = new Vector2D(0, 0, true);
      clearPressed();
      return;
    }

    // Throttle hold
    if (isDown("ShiftLeft") || isDown("ShiftRight")) {
      this.thrustPercent += THROTTLE_RATE_PER_SEC * dt;
    }
    if (isDown("ControlLeft") || isDown("ControlRight")) {
      this.thrustPercent -= THROTTLE_RATE_PER_SEC * dt;
    }

    // Instant cuts/pegs
    if (consumePressed("KeyX")) {
      this.thrustPercent = 0;
    }
    if (consumePressed("KeyZ")) {
      this.thrustPercent = 1;
    }

    // Rotation (manual unless autopilot is active)
    const autopilotActive = this.autopilotMode && this.applyAutopilotRotation(dt);

    if (!autopilotActive) {
      if (isDown("KeyA")) {
        this.angle -= ROTATION_RATE_RAD * dt;
      }
      if (isDown("KeyD")) {
        this.angle += ROTATION_RATE_RAD * dt;
      }
    }

    // Normalize angle to keep numbers small
    this.angle = normalizeAngle(this.angle);

    // Clamp throttle to [0, 1]
    this.thrustPercent = clamp(this.thrustPercent, 0, 1);

    // Apply thrust force in facing direction
    const thrustN = this.thrustPercent * this.thrustMaxN;
    const thrustFx = thrustN * Math.sin(this.angle);
    const thrustFy = -thrustN * Math.cos(this.angle);
    this.externalForce = new Vector2D(thrustFx, thrustFy, true);

    clearPressed();
  }

  update(dt, simDt, warpMode) {
    const normalizedWarp = warpMode === "physics" || !warpMode ? "physics" : "fixed";

    // Always update trajectory when in physics mode so it's ready for switching
    if (this.motionMode === "nbody") {
      this.computeTrajectory();
    }

    if (normalizedWarp !== this.localMode) {
      this.switchState(normalizedWarp, simDt);
      this.localMode = normalizedWarp;
    }

    this.applyControls(dt, normalizedWarp);

    super.update(simDt);
  }
  

  draw(ctx) {
    const xPx = kmToPixels(this.realPosition.x / 1000);
    const yPx = kmToPixels(this.realPosition.y / 1000);
    const kmPerPx = effectiveKmPerPixel();
    const showIndicator = kmPerPx >= 40;

    this.drawPath(ctx);
    const bodyHeight = 24;
    const bodyWidth = 16;

    if (showIndicator) {
      const indicatorRadius = 12 / Math.max(1e-6, view.zoom);
      const innerRadius = 4 / Math.max(1e-6, view.zoom);

      ctx.save();
      ctx.beginPath();
      ctx.arc(xPx, yPx, indicatorRadius, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(124, 255, 212, 0.95)";
      ctx.lineWidth = 2 / Math.max(1e-6, view.zoom);
      ctx.shadowColor = "rgba(124, 255, 212, 0.55)";
      ctx.shadowBlur = 10 / Math.max(1e-6, view.zoom);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(xPx, yPx, innerRadius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(124, 255, 212, 0.95)";
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(xPx - indicatorRadius * 1.4, yPx);
      ctx.lineTo(xPx + indicatorRadius * 1.4, yPx);
      ctx.moveTo(xPx, yPx - indicatorRadius * 1.4);
      ctx.lineTo(xPx, yPx + indicatorRadius * 1.4);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(xPx, yPx);
    ctx.rotate(this.angle + Math.PI);

    if (this.thrustPercent > 0) {
      const flameLength =
        16 * this.thrustPercent +
        (Math.random() - 0.5) * 2 * this.thrustPercent;
      const flameWidth = 7;

      this.drawTriangle(
        ctx,
        0,
        -(10 + flameLength / 2),
        -flameLength,
        flameWidth,
        "orange"
      );
    }

    // Nozzle
    this.drawTriangle(ctx, 0, -11, 11, 8, "grey");

    // Body
    this.drawTriangle(ctx, 0, 0, bodyHeight, bodyWidth, "white");

    ctx.restore();

    
  }

  drawTriangle(ctx, x, y, height, width, color = "white") {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width / 2, -height / 2);
    ctx.lineTo(-width / 2, -height / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawPath(ctx) {
    if (!this.trajectory || !this.parent) return;

    const {
        e,
        p,
        omega
    } = this.trajectory;

    const parentPos = this.parent.realPosition;

    // How much of the orbit to draw
    // Ellipse: full 0 to 2pi
    // Hyperbola: limited range
    const maxNu = e < 1
        ? Math.PI * 2
        : Math.acos(-1 / e) * 0.999;

    const steps = 300;
    const dNu = (2 * maxNu) / steps;

    ctx.save();
    ctx.beginPath();

    let first = true;

    for (let i = -steps / 2; i <= steps / 2; i++) {
        const nu = i * dNu;

        const r = p / (1 + e * Math.cos(nu));

        // Position in orbital plane (meters)
        const xOrb = r * Math.cos(nu);
        const yOrb = r * Math.sin(nu);

        // Rotate by argument of periapsis
        const cosO = Math.cos(omega);
        const sinO = Math.sin(omega);

        const xRot = xOrb * cosO - yOrb * sinO;
        const yRot = xOrb * sinO + yOrb * cosO;

        // World position (meters)
        const xWorld = parentPos.x + xRot;
        const yWorld = parentPos.y + yRot;

        // meters -> km -> pixels
        const xPx = kmToPixels(xWorld / 1000);
        const yPx = kmToPixels(yWorld / 1000);

        if (first) {
        ctx.moveTo(xPx, yPx);
        first = false;
        } else {
        ctx.lineTo(xPx, yPx);
        }
    }

    ctx.strokeStyle = "rgba(40, 220, 255, 0.28)";
    ctx.lineWidth = 6 / Math.max(1e-6, view.zoom);
    ctx.shadowColor = "rgba(40, 220, 255, 0.22)";
    ctx.shadowBlur = 18 / Math.max(1e-6, view.zoom);
    ctx.stroke();

    ctx.strokeStyle = "rgba(130, 245, 255, 0.95)";
    ctx.lineWidth = 2.4 / Math.max(1e-6, view.zoom);
    ctx.shadowColor = "rgba(120, 240, 255, 0.55)";
    ctx.shadowBlur = 10 / Math.max(1e-6, view.zoom);
    ctx.stroke();

    ctx.restore();
    }

}
