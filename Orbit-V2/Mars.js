import { SpriteBody } from "./planetBase.js";

export class Mars extends SpriteBody {
  constructor(parent, theta = 1.1) {
    super({
      name: "Mars",
      mass: 6.4171e23,
      radius: 3_389_500,
      texture: "./Public/Mars.png",
      color: "#f08b57",
      pathColor: "#f08b57",
      spriteFadeKmPerPx: 2200,
      parent,
      semimajor: 227_939_200_000,
      theta,
      sBody: false,
      influential: true,
      motionMode: "kepler",
    });
  }
}
