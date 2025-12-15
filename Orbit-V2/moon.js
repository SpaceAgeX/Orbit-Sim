// moon.js

import { Body } from "./object.js";
import { Vector2D, kmToPixels } from "./geometry.js";
import { effectiveKmPerPixel } from "./geometry.js";


const MOON_MASS_KG = 7.342e22;
const MOON_RADIUS_M = 1737400; // real Moon radius

export class Moon extends Body {
  constructor() {
    super({
      name: "Moon",
      position: new Vector2D(384400000, 0, true),   // meters from Earth
      velocity: new Vector2D(0, -1022, true),        // m/s orbital velocity
      mass: MOON_MASS_KG,
      radius: MOON_RADIUS_M,
      sBody: false,
      influential: true,
      motionMode: "kepler", // 🔒 always kepler
    });

    this.image = new Image();
    this.image.src = "Public/Moon.png";
  }

  /**
   * Moon ignores warp mode completely.
   * It always stays on Kepler rails.
   */
  update(dt /* warpMode intentionally ignored */) {
    if (this.motionMode !== "kepler") {
      this.switchState("kepler");
    }

    super.update(dt);
  }

  draw(ctx) {
    if (!this.image.complete) return;

    this.drawPath(ctx);
    
    const xPx = kmToPixels(this.realPosition.x / 1000);
    const yPx = kmToPixels(this.realPosition.y / 1000);

    // Scale visually so it's visible (not to real scale)
    const visualRadiusKm = 2000; // tweak for appearance
    const sizePx = kmToPixels(visualRadiusKm) * 2;

    ctx.save();
    ctx.translate(xPx, yPx);

    ctx.drawImage(
      this.image,
      -sizePx / 2,
      -sizePx / 2,
      sizePx,
      sizePx
    );

    ctx.restore();
  }

  /**
   * Optional: draw orbital path (same as ship)
   */
  drawPath(ctx) {
    
    if (!this.trajectory || !this.parent) return;

    const {
        e,
        p,
        omega
    } = this.trajectory;

    const parentPos = this.parent.realPosition;

    // How much of the orbit to draw
    // Ellipse: full 0 → 2π
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

        // meters → km → pixels
        const xPx = kmToPixels(xWorld / 1000);
        const yPx = kmToPixels(yWorld / 1000);

        if (first) {
        ctx.moveTo(xPx, yPx);
        first = false;
        } else {
        ctx.lineTo(xPx, yPx);
        }
    }

    ctx.strokeStyle = "rgba(220, 220, 220, 0.3)";
    ctx.lineWidth = 10;
    ctx.stroke();

    ctx.restore();
  }
}
