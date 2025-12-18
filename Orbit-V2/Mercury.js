import { SpriteBody } from "./planetBase.js";

export class Mercury extends SpriteBody {
  constructor(parent, theta = 0) {
    super({
      name: "Mercury",
      mass: 3.3011e23,
      radius: 2_439_700,
      texture: "./Public/Mercury.png",
      color: "#c7c1b9",
      pathColor: "#c7c1b9",
      spriteFadeKmPerPx: 1200,
      parent,
      semimajor: 57_909_227_000,
      theta,
      sBody: false,
      influential: true,
      motionMode: "kepler",
    });
  }
}
