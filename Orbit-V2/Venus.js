import { SpriteBody } from "./planetBase.js";

export class Venus extends SpriteBody {
  constructor(parent, theta = 0.3) {
    super({
      name: "Venus",
      mass: 4.8675e24,
      radius: 6_051_800,
      texture: "./Public/Venus.png",
      color: "#f5d0a9",
      pathColor: "#f5d0a9",
      spriteFadeKmPerPx: 2000,
      parent,
      semimajor: 108_209_475_000,
      theta,
      sBody: false,
      influential: true,
      motionMode: "kepler",
    });
  }
}
