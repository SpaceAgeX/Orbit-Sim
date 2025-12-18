import { SpriteBody } from "./planetBase.js";

const SUN_RADIUS_M = 696_340_000;
const SUN_MASS_KG = 1.9885e30;

export class Sun extends SpriteBody {
  constructor() {
    super({
      name: "Sun",
      mass: SUN_MASS_KG,
      radius: SUN_RADIUS_M,
      texture: "./Public/Sol.png",
      color: "#ffdd6f",
      pathColor: "#ffdd6f",
      spriteFadeKmPerPx: 8000,
      parent: null,
      semimajor: null,
      theta: 0,
      sBody: true,
      influential: true,
      motionMode: "kepler",
    });
  }
}
