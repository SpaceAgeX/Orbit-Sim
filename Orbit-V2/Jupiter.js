import { SpriteBody } from "./planetBase.js";

export class Jupiter extends SpriteBody {
  constructor(parent, theta = 0.8) {
    super({
      name: "Jupiter",
      mass: 1.898e27,
      radius: 69_911_000,
      texture: "./Public/Jupiter.png",
      color: "#f8cfa9",
      pathColor: "#f8cfa9",
      spriteFadeKmPerPx: 5000,
      parent,
      semimajor: 778_570_000_000,
      theta,
      sBody: false,
      influential: true,
      motionMode: "kepler",
    });
  }
}
