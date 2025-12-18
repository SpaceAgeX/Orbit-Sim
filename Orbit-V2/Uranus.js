import { SpriteBody } from "./planetBase.js";

export class Uranus extends SpriteBody {
  constructor(parent, theta = 0.4) {
    super({
      name: "Uranus",
      mass: 8.681e25,
      radius: 25_362_000,
      texture: "./Public/Uranus.png",
      color: "#9cd7f5",
      pathColor: "#9cd7f5",
      spriteFadeKmPerPx: 6000,
      parent,
      semimajor: 2_872_460_000_000,
      theta,
      sBody: false,
      influential: true,
      motionMode: "kepler",
    });
  }
}
