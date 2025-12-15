// Trajectory.js
// ======================================================
// Two-body orbital trajectory (interpretation layer)
// Real units ONLY: meters, m/s, kg, seconds
// No forces, no rendering, no integration
// ======================================================

import { gravitationalConstant } from "./rigidBody.js";
import { Vector2D } from "./geometry.js";

export class Trajectory {
  constructor(body, parent) {
    this.body = body;
    this.parent = parent;

    this.valid = false;

    // --- future rendezvous / targeting (NOT computed yet)
    this.target = null;
    this.targetRelativeVelocity = null;
    this.targetSeparation = null;
    this.closestApproach = null;
    this.timeToClosestApproach = null;

    this.refresh();
  }

  // --------------------------------------------------
  // Recompute trajectory from current state vectors
  // --------------------------------------------------
  refresh() {
    if (!this.body || !this.parent) {
      this.valid = false;
      return null;
    }
    return this.getTrajectoryElements();
  }

  // --------------------------------------------------
  // Orbital elements solver (elliptical + hyperbolic)
  // --------------------------------------------------
  getTrajectoryElements() {
    const body = this.body;
    const parent = this.parent;

    // -----------------------------
    // Relative state vectors
    // -----------------------------
    this.rVec = new Vector2D(
      body.x - parent.x,
      body.y - parent.y,
      true
    );

    this.vVec = new Vector2D(
      body.vx - parent.vx,
      body.vy - parent.vy,
      true
    );

    this.r = this.rVec.r;
    this.v = this.vVec.r;

    if (this.r === 0) {
      this.valid = false;
      return null;
    }

    // -----------------------------
    // Gravitational parameter
    // -----------------------------
    this.mu = gravitationalConstant * parent.mass;

    // -----------------------------
    // Specific angular momentum (scalar in 2D)
    // -----------------------------
    this.h = this.rVec.cross(this.vVec);

    // -----------------------------
    // Specific orbital energy
    // -----------------------------
    this.energy = 0.5 * this.v * this.v - this.mu / this.r;

    // -----------------------------
    // Semi-major axis
    // -----------------------------
    if (Math.abs(this.energy) > 1e-12) {
      this.a = -this.mu / (2 * this.energy);
    } else {
      this.a = Infinity; // parabolic limit
    }

    // -----------------------------
    // Eccentricity vector
    // e⃗ = ((v² − μ/r) r⃗ − (r⃗·v⃗) v⃗) / μ
    // -----------------------------
    const v2_minus_mu_r = this.v * this.v - this.mu / this.r;

    this.eVec = this.rVec
      .mul(v2_minus_mu_r)
      .sub(this.vVec.mul(this.rVec.dot(this.vVec)))
      .div(this.mu);

    this.e = this.eVec.r;

    // -----------------------------
    // Semi-latus rectum
    // -----------------------------
    this.p = (this.h * this.h) / this.mu;

    // -----------------------------
    // Orbit classification
    // -----------------------------
    if (this.e < 1) {
      this.orbitType = "elliptical";
      this.isBound = true;
    } else if (Math.abs(this.e - 1) < 1e-6) {
      this.orbitType = "parabolic";
      this.isBound = false;
    } else {
      this.orbitType = "hyperbolic";
      this.isBound = false;
    }

    // -----------------------------
    // Argument of periapsis (ω)
    // -----------------------------
    this.omega =
      this.e > 1e-10 ? this.eVec.angle : this.rVec.angle;

    // -----------------------------
    // True anomaly (ν), signed
    // -----------------------------
    this.nu =
      this.e > 1e-10
        ? this.eVec.signedAngleTo(this.rVec)
        : 0;

    // -----------------------------
    // Apsides
    // -----------------------------
    if (this.isBound) {
      this.periapsis = this.a * (1 - this.e);
      this.apoapsis = this.a * (1 + this.e);
    } else {
      this.periapsis = this.a * (1 - this.e);
      this.apoapsis = Infinity;
    }

    // -----------------------------
    // Period & mean motion (elliptical only)
    // -----------------------------
    if (this.isBound) {
      this.period =
        2 * Math.PI * Math.sqrt(
          Math.pow(this.a, 3) / this.mu
        );
      this.meanMotion = Math.sqrt(
        this.mu / Math.pow(this.a, 3)
      );
    } else {
      this.period = Infinity;
      this.meanMotion = NaN;
    }

    // -----------------------------
    // Anomalies & time-to-apsides
    // -----------------------------
    this.eccentricAnomaly = NaN;
    this.meanAnomaly = NaN;
    this.timeSincePeriapsis = NaN;
    this.timeToPeriapsis = Infinity;
    this.timeToApoapsis = Infinity;

    if (this.isBound && this.e > 1e-10) {
      const E = trueToEccentricAnomaly(this.nu, this.e);
      const M = normalizeAngle(E - this.e * Math.sin(E));

      this.eccentricAnomaly = E;
      this.meanAnomaly = M;

      const n = this.meanMotion;
      const T = this.period;

      const tSince = M / n;
      this.timeSincePeriapsis = tSince;

      this.timeToPeriapsis = (T - tSince) % T;

      const deltaMToAp = normalizeAngle(Math.PI - M);
      this.timeToApoapsis = deltaMToAp / n;
    }

    this.valid = true;
    return this;
  }

  // --------------------------------------------------
  // Polar orbit equation r(ν)
  // --------------------------------------------------
  radiusAtTrueAnomaly(nu) {
    if (!this.valid) return NaN;
    const denom = 1 + this.e * Math.cos(nu);
    if (Math.abs(denom) < 1e-8) return Infinity;
    return this.p / denom;
  }

  // --------------------------------------------------
  // Position relative to parent at true anomaly ν
  // --------------------------------------------------
  positionAtTrueAnomaly(nu) {
    const r = this.radiusAtTrueAnomaly(nu);
    if (!Number.isFinite(r)) return null;
    return new Vector2D(r, this.omega + nu, false);
  }

  // --------------------------------------------------
  // Advance along orbit by dt (seconds)
  // For on-rails bodies ONLY
  // --------------------------------------------------
  nextPoint(dt) {
    if (!this.valid || !this.isBound) return null;

    const M_next = normalizeAngle(
      this.meanAnomaly + this.meanMotion * dt
    );

    const E_next = solveKepler(M_next, this.e);
    const nu_next = eccentricToTrueAnomaly(E_next, this.e);

    // Update stored anomalies (important for continuous motion)
    this.meanAnomaly = M_next;
    this.eccentricAnomaly = E_next;
    this.nu = nu_next;

    return this.positionAtTrueAnomaly(nu_next);
  }

  // --------------------------------------------------
  // Future rendezvous API (NOT implemented yet)
  // --------------------------------------------------
  setTarget(targetBody) {
    this.target = targetBody;
  }

  //toString function
  toString() {
    //return all the orbital variables
    return (
      "Orbit(" +
      "a=" +
      this.a +
      ", e=" +  
      this.e +
      ", i=" +
      this.i +
      ", ω=" +
      this.omega +
      ", ν=" +
      this.nu +
      ", periapsis=" +
      this.periapsis +
      ", apoapsis=" +
      this.apoapsis +
      ", period=" +
      this.period +
      ", meanMotion=" +
      this.meanMotion +
      ", timeSincePeriapsis=" +
      this.timeSincePeriapsis +
      ", timeToPeriapsis=" +
      this.timeToPeriapsis +
      ", timeToApoapsis=" +
      this.timeToApoapsis +
      ")"
    );
  }
}

// ======================================================
// Helper functions (file-local)
// ======================================================

function trueToEccentricAnomaly(nu, e) {
  const t = Math.tan(nu / 2);
  const factor = Math.sqrt((1 - e) / (1 + e));
  return 2 * Math.atan(factor * t);
}

function eccentricToTrueAnomaly(E, e) {
  const cosNu =
    (Math.cos(E) - e) / (1 - e * Math.cos(E));
  const sinNu =
    (Math.sqrt(1 - e * e) * Math.sin(E)) /
    (1 - e * Math.cos(E));
  return Math.atan2(sinNu, cosNu);
}

function solveKepler(M, e) {
  let E = e < 0.8 ? M : Math.PI;

  for (let i = 0; i < 10; i++) {
    const f = E - e * Math.sin(E) - M;
    const fp = 1 - e * Math.cos(E);
    E = E - f / fp;
  }
  return E;
}

function normalizeAngle(rad) {
  const twoPi = 2 * Math.PI;
  let a = rad % twoPi;
  if (a < 0) a += twoPi;
  return a;
}
