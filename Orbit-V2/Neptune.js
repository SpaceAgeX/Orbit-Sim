import { SpriteBody } from "./planetBase.js";

export class Neptune extends SpriteBody {
  constructor(parent, theta = 1.9) {
    super({
      name: "Neptune",
      mass: 1.024e26,
      radius: 24_622_000,
      texture: "./Public/Neptune.png",
      color: "#6ea7ff",
      pathColor: "#6ea7ff",
      spriteFadeKmPerPx: 6500,
      parent,
      semimajor: 4_495_060_000_000,
      theta,
      sBody: false,
      influential: true,
      motionMode: "kepler",
    });
  }
}
