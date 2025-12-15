// Object.js
// ======================================================
// Base Object — simplest spatial entity in the sim
// ======================================================

import { Vector2D } from "./geometry.js";
export const G = 6.67408e-11;

export class Object {
  static bodies = [];

  constructor({
    name = "Unnamed",
    position = new Vector2D(0, 0, true),
    velocity = new Vector2D(0, 0, true),
    mass = 1,
    sBody = false
  }) {
    this.name = name;
    this.sBody = sBody;

    // --- state ---
    this.realPosition = position.clone();
    this.realVelocity = sBody ? new Vector2D(0, 0, true) : velocity.clone();

    this.mass = mass;

    Object.bodies.push(this);
  }

  update(dt) {
    if (this.sBody) return;

    this.realPosition = this.realPosition.add(
      this.realVelocity.mul(dt)
    );
  }
}

export class Body extends Object {
  static influentialBodies = [];

  constructor({
    name,
    position,
    velocity,
    mass,
    radius,
    sBody = false,
    influential = false,
    motionMode = "kepler" // "kepler" | "nbody"
  }) {
    super({ name, position, velocity, mass, sBody });

    this.realRadius = radius;

    // behavior flags
    this.influential = influential;
    this.motionMode = motionMode;

    // orbital state
    this.parent = null;
    this.trajectory = null;

    // physics state
    this.netForce = new Vector2D(0, 0, true);

    if (this.influential) {
      Body.influentialBodies.push(this);
    }
  }

  // ----------------------------
  // Gravity force accumulation
  // ----------------------------
  computeGravity() {
    this.netForce = new Vector2D(0, 0, true);

    for (const other of Body.influentialBodies) {
      if (other === this) continue;

      const rVec = other.realPosition.sub(this.realPosition);
      const r2 = rVec.magSq();
      if (r2 === 0) continue;

      const forceMag = G * this.mass * other.mass / r2;
      this.netForce = this.netForce.add(
        rVec.normalize().mul(forceMag)
      );
    }
  }

  // ----------------------------
  // Unified update
  // ----------------------------
  update(dt) {
    if (this.sBody) return;

    if (this.motionMode === "kepler" && this.trajectory) {
      const nextPos = this.trajectory.nextPoint(dt);
      if (nextPos) {
        this.realPosition = nextPos;
      }
      return;
    }

    if (this.motionMode === "nbody") {
      this.computeGravity();

      const accel = this.netForce.div(this.mass);
      this.realVelocity = this.realVelocity.add(
        accel.mul(dt)
      );

      super.update(dt);
    }
  }
}