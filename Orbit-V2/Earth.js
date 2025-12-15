// Earth.js
// ======================================================
// Earth — static, influential body
// Uses real-world constants
// Draw-only specialization of Body
// ======================================================

import { Body } from "./object.js";
import { Vector2D, kmToPixels } from "./geometry.js";

// ------------------------------------------------------
// Real Earth constants
// ------------------------------------------------------

const EARTH_RADIUS_KM = 6371;
const EARTH_RADIUS_M = EARTH_RADIUS_KM * 1000;
const EARTH_MASS_KG = 5.972e24;

// ------------------------------------------------------
// Asset
// ------------------------------------------------------

const EARTH_IMAGE_SRC = "./public/Earth.png";

export class Earth extends Body {
  constructor() {
    super({
      name: "Earth",
      position: new Vector2D(0, 0, true),   // world origin (meters)
      velocity: new Vector2D(0, 0, true),
      mass: EARTH_MASS_KG,
      radius: EARTH_RADIUS_M,
      sBody: true,                          // static
      influential: true,                   // produces gravity
      motionMode: "kepler"                 // irrelevant, Earth does not move
    });

    // --- rendering ---
    this.image = new Image();
    this.image.src = EARTH_IMAGE_SRC;
  }

  // --------------------------------------------------
  // Draw Earth
  // ctx is already pan/zoom transformed
  // --------------------------------------------------
  draw(ctx) {
    const radiusPx = kmToPixels(this.radius);

    ctx.save();
    ctx.translate(
      this.realPosition.x,
      this.realPosition.y
    );

    ctx.drawImage(
      this.image,
      -radiusPx,
      -radiusPx,
      radiusPx * 2,
      radiusPx * 2
    );

    ctx.restore();
  }
}
