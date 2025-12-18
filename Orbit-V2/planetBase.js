import { Body, G } from "./object.js";
import {
  Vector2D,
  kmToPixels,
  mToPixels,
  effectiveKmPerPixel,
  view,
  clamp,
} from "./geometry.js";

const DEFAULT_SPRITE_FADE_KM_PER_PX = 1200;

function circularVelocity(parentMass, orbitalRadiusMeters) {
  return Math.sqrt((G * parentMass) / orbitalRadiusMeters);
}

export class SpriteBody extends Body {
  constructor({
    name,
    mass,
    radius,
    texture,
    color = "#ffffff",
    pathColor = null,
    spriteFadeKmPerPx = DEFAULT_SPRITE_FADE_KM_PER_PX,
    parent = null,
    semimajor = null,
    theta = 0,
    sBody = false,
    influential = true,
    motionMode = "kepler",
  }) {
    // If we have an orbit, derive initial position/velocity
    let position = new Vector2D(0, 0, true);
    let velocity = new Vector2D(0, 0, true);

    if (parent && semimajor) {
      position = new Vector2D(semimajor, theta, false);
      const speed = circularVelocity(parent.mass, semimajor);
      velocity = new Vector2D(speed, theta + Math.PI / 2, false);
      // shift into world frame
      position = parent.realPosition.add(position);
      velocity = parent.realVelocity.add(velocity);
    }

    super({
      name,
      position,
      velocity,
      mass,
      radius,
      sBody,
      influential,
      motionMode,
    });

    this.parent = parent;

    this.image = new Image();
    this.image.src = texture;
    this.color = color;
    this.pathColor = pathColor || color;
    this.spriteFadeKmPerPx = spriteFadeKmPerPx;

    if (this.parent && !this.sBody) {
      this.computeTrajectory();
    }
  }

  drawPath(ctx) {
    if (!this.trajectory || !this.parent) return;

    const { e, p, omega } = this.trajectory;
    const parentPos = this.parent.realPosition;

    const maxNu = e < 1 ? Math.PI * 2 : Math.acos(-1 / e) * 0.999;
    const steps = 360;
    const dNu = (2 * maxNu) / steps;

    ctx.save();
    ctx.beginPath();

    let first = true;
    for (let i = -steps / 2; i <= steps / 2; i++) {
      const nu = i * dNu;
      const r = p / (1 + e * Math.cos(nu));

      const xOrb = r * Math.cos(nu);
      const yOrb = r * Math.sin(nu);

      const cosO = Math.cos(omega);
      const sinO = Math.sin(omega);

      const xRot = xOrb * cosO - yOrb * sinO;
      const yRot = xOrb * sinO + yOrb * cosO;

      const xWorld = parentPos.x + xRot;
      const yWorld = parentPos.y + yRot;

      const xPx = kmToPixels(xWorld / 1000);
      const yPx = kmToPixels(yWorld / 1000);

      if (first) {
        ctx.moveTo(xPx, yPx);
        first = false;
      } else {
        ctx.lineTo(xPx, yPx);
      }
    }

    ctx.strokeStyle = this.pathColor;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 2 / Math.max(1e-6, view.zoom);
    ctx.stroke();
    ctx.restore();
  }

  draw(ctx) {
    if (this.trajectory && this.parent) {
      this.drawPath(ctx);
    }

    const xPx = kmToPixels(this.realPosition.x / 1000);
    const yPx = kmToPixels(this.realPosition.y / 1000);

    const kmPerPx = effectiveKmPerPixel();
    const useDot = kmPerPx >= this.spriteFadeKmPerPx || !this.image.complete;

    if (useDot) {
      const screenRadiusPx = clamp(
        mToPixels(this.realRadius) * view.zoom,
        3,
        this.name === "Sun" ? 16 : 10
      );
      const radius = screenRadiusPx / Math.max(1e-6, view.zoom);

      ctx.save();
      ctx.beginPath();
      ctx.fillStyle = this.color;
      ctx.globalAlpha = 0.95;
      ctx.arc(xPx, yPx, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    const sizePx = mToPixels(this.realRadius) * 2;

    ctx.save();
    ctx.translate(xPx, yPx);
    ctx.drawImage(this.image, -sizePx / 2, -sizePx / 2, sizePx, sizePx);
    ctx.restore();
  }
}

// convenience export
export { circularVelocity };
