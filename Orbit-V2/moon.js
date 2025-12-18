import { SpriteBody } from "./planetBase.js";

const MOON_MASS_KG = 7.342e22;
const MOON_RADIUS_M = 1_737_400;

export class Moon extends SpriteBody {
  constructor(parent, theta = 0) {
    super({
      name: "Moon",
      mass: MOON_MASS_KG,
      radius: MOON_RADIUS_M,
      texture: "./Public/Moon.png",
      color: "#cfd1d6",
      pathColor: "rgba(255,255,255,0.65)",
      spriteFadeKmPerPx: 900,
      parent,
      semimajor: 384_400_000,
      theta,
      sBody: false,
      influential: true,
      motionMode: "kepler",
    });
  }
}
