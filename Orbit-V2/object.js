// Object.js
// ======================================================
// Base Object - simplest spatial entity in the sim
// ======================================================

import { Vector2D } from "./geometry.js";
import { Trajectory } from "./trajectory.js";
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
    this.trajectoryTime = 0;

    // physics state
    this.netForce = new Vector2D(0, 0, true);

    if (this.influential) {
      Body.influentialBodies.push(this);
    }
  }

  findGreatestInfluencer() {
    let greatest = null;
    let maxForce = 0;

    for (const other of Body.influentialBodies) {
      if (other === this) continue;

      // Vector from this to other (meters)
      const rVec = other.realPosition.sub(this.realPosition);
      const distSq = rVec.r * rVec.r;

      if (distSq === 0) continue;

      // Newtonian gravity magnitude
      const force = G * this.mass * other.mass / distSq;

      if (force > maxForce) {
        maxForce = force;
        greatest = other;
      }
    }

    this.parent = greatest;
    return greatest;
  }

  switchState(targetWarpMode = "physics", dt = 0) {
    // physics warp -> run full n-body, fixed warp -> stay on Kepler rails
    const targetMotionMode = targetWarpMode === "physics" ? "nbody" : "kepler";

    if (this.motionMode === targetMotionMode) {
      return;
    }

    if (targetMotionMode === "kepler") {
      this.parent = this.findGreatestInfluencer();

      if (!this.parent) {
        console.warn("Kepler switch failed: no parent found");
        return;
      }

      this.trajectory = new Trajectory(this, this.parent);
      // Snap body state to the freshly-built Kepler solution so position/velocity stay continuous
      const stateNow = this.trajectory.nextState(0);
      if (stateNow?.position && stateNow?.velocity) {
        this.realPosition = stateNow.position;
        this.realVelocity = stateNow.velocity;
      }
      this.trajectoryTime = 0;
      this.motionMode = "kepler";
      return;
    }

    // Switching back to live physics: sample current Kepler state (include this frame's dt) before releasing the rails
    if (this.motionMode === "kepler" && this.trajectory) {
      const sampleTime = this.trajectoryTime + dt;
      const { position, velocity } = this.trajectory.nextState(sampleTime);
      this.realPosition = position;
      this.realVelocity = velocity;
      this.trajectoryTime = sampleTime;
    }
    this.motionMode = "nbody";
  }

  computeTrajectory() {
    this.parent = this.findGreatestInfluencer();
    this.trajectory = new Trajectory(this, this.parent);
    this.trajectoryTime = 0;
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
      this.trajectoryTime += dt;
      const nextState = this.trajectory.nextState(this.trajectoryTime);
      if (nextState?.position && nextState?.velocity) {
        this.realPosition = nextState.position;
        this.realVelocity = nextState.velocity;
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
      return;
    }

    // Fallback: if an unknown mode slips through, drift at current velocity
    super.update(dt);
  }
}
