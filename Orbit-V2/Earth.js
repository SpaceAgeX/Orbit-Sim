import { SpriteBody } from "./planetBase.js";

const EARTH_RADIUS_M = 6_371_000;
const EARTH_MASS_KG = 5.972e24;

export class Earth extends SpriteBody {
  constructor(parent, theta = 0.6) {
    super({
      name: "Earth",
      mass: EARTH_MASS_KG,
      radius: EARTH_RADIUS_M,
      texture: "./Public/Earth.png",
      color: "#69b7ff",
      pathColor: "#69b7ff",
      spriteFadeKmPerPx: 6000,
      parent,
      semimajor: 149_598_023_000,
      theta,
      sBody: false,
      influential: true,
      motionMode: "kepler",
    });
  }
}
