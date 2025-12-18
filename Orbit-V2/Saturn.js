import { SpriteBody } from "./planetBase.js";

export class Saturn extends SpriteBody {
  constructor(parent, theta = 1.5) {
    super({
      name: "Saturn",
      mass: 5.683e26,
      radius: 58_232_000,
      texture: "./Public/Saturn.png",
      color: "#e8d6a8",
      pathColor: "#e8d6a8",
      spriteFadeKmPerPx: 5000,
      parent,
      semimajor: 1_433_530_000_000,
      theta,
      sBody: false,
      influential: true,
      motionMode: "kepler",
    });
  }
}
