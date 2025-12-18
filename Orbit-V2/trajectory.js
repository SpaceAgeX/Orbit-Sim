// trajectory.js
// =====================================================
// Keplerian trajectory (V2 - STATE SAFE)
// Proper Kepler propagation (elliptic + hyperbolic)
// Units: meters, seconds, radians
// =====================================================

import { Vector2D } from "./geometry.js";

const G = 6.67408e-11;

function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

function normalizeAngle(a) {
  const t = 2 * Math.PI;
  a = a % t;
  return a < 0 ? a + t : a;
}

export class Trajectory {
  constructor(body, parent) {
    this.body = body;
    this.parent = parent;

    this.valid = false;

    // Elements
    this.mu = 0;
    this.h = 0;

    this.e = 0;
    this.eVec = new Vector2D(0, 0, true);

    this.a = 0;
    this.p = 0;

    this.omega = 0;

    // Epoch anomalies
    this.M0 = 0;   // mean anomaly at epoch (elliptic) OR mean hyperbolic anomaly (hyperbolic)
    this.n = 0;    // mean motion (elliptic/hyperbolic)

    if (!body || !parent) return;
    this._computeElements();
  }

  _computeElements() {
    const rVec = this.body.realPosition.sub(this.parent.realPosition);
    const vVec = this.body.realVelocity.sub(this.parent.realVelocity);

    const r = rVec.r;
    const v = vVec.r;
    if (r === 0) return;

    const mu = G * this.parent.mass;

    // specific angular momentum (scalar in 2D)
    const h = rVec.cross(vVec);
    const dir = Math.sign(h) || 1; // sign encodes prograde (CCW) vs retrograde (CW)

    // eccentricity vector
    // eVec = [ (v^2 - mu/r) rVec - (r·v) vVec ] / mu
    const rv = rVec.dot(vVec);
    const eVec = rVec.mul(v * v - mu / r).sub(vVec.mul(rv)).div(mu);
    const e = eVec.r;

    // semi-major axis
    const a = 1 / (2 / r - (v * v) / mu);

    // semi-latus rectum
    const p = (h * h) / mu;

    // argument of periapsis (2D: angle of eVec)
    const omega = e > 1e-12 ? eVec.angle : 0;

    // true anomaly at epoch (angle from periapsis to r)
    // nu0 = atan2( r x e, r · e )
    const nu0 = -Math.atan2(rVec.cross(eVec), rVec.dot(eVec));

    this.mu = mu;
    this.h = h;
    this.dir = dir;
    this.e = e;
    this.eVec = eVec;
    this.a = a;
    this.p = p;
    this.omega = omega;

    // Mean motion & epoch mean anomaly (elliptic/hyperbolic)
    if (e < 1) {
      // Elliptic
      // carry direction into mean motion so retrograde stays retrograde
      this.n = dir * Math.sqrt(mu / Math.abs(a ** 3));

      // Convert nu0 -> E0
      const cosNu = Math.cos(nu0);
      const sinNu = Math.sin(nu0);

      const sqrt1me2 = Math.sqrt(1 - e * e);

      const cosE = (e + cosNu) / (1 + e * cosNu);
      const sinE = (sqrt1me2 * sinNu) / (1 + e * cosNu);

      const E0 = Math.atan2(sinE, cosE);
      const M0 = E0 - e * Math.sin(E0);

      // keep sign for retrograde; normalize only for prograde for stability
      this.M0 = dir < 0 ? M0 : normalizeAngle(M0);
      this.valid = Number.isFinite(this.n) && Number.isFinite(this.M0);
      return;
    }

    // Hyperbolic (e > 1)
    if (e > 1) {
      // a will be negative for hyperbola
      this.n = dir * Math.sqrt(mu / Math.abs(a ** 3));

      // Convert nu0 -> F0 (hyperbolic anomaly)
      // tanh(F/2) = sqrt((e-1)/(e+1)) * tan(nu/2)
      const t = Math.tan(nu0 / 2);
      const k = Math.sqrt((e - 1) / (e + 1));
      const tanhF2 = k * t;

      // F0 = 2 * atanh(tanhF2)
      const F0 = 2 * 0.5 * Math.log((1 + tanhF2) / (1 - tanhF2));
      const M0 = e * Math.sinh(F0) - F0;

      this.M0 = M0;
      this.valid = Number.isFinite(this.n) && Number.isFinite(this.M0);
      return;
    }

    // Parabolic / near-parabolic not supported yet
    this.valid = false;
  }

  // Newton solve: E - e sinE = M
  _solveE(M) {
    const e = this.e;
    let E = M;
    for (let i = 0; i < 12; i++) {
      const f = E - e * Math.sin(E) - M;
      const fp = 1 - e * Math.cos(E);
      const d = f / fp;
      E -= d;
      if (Math.abs(d) < 1e-10) break;
    }
    return E;
  }

  // Newton solve: e sinhF - F = M
  _solveF(M) {
    const e = this.e;
    let F = Math.asinh(M / e); // decent starter
    for (let i = 0; i < 14; i++) {
      const f = e * Math.sinh(F) - F - M;
      const fp = e * Math.cosh(F) - 1;
      const d = f / fp;
      F -= d;
      if (Math.abs(d) < 1e-10) break;
    }
    return F;
  }

  /**
   * Kepler propagation
   * @param {number} t Seconds since this trajectory's epoch
   * @returns {{position: Vector2D, velocity: Vector2D}}
   */
  nextState(t) {
    if (!this.valid) {
      return {
        position: this.body.realPosition.clone(),
        velocity: this.body.realVelocity.clone(),
      };
    }

    const e = this.e;
    const mu = this.mu;

    // Parent state at "now" (V2: parent can move; for Earth it's static)
    const parentPos = this.parent.realPosition;
    const parentVel = this.parent.realVelocity;

    // --------------------------
    // ELLIPTIC
    // --------------------------
    if (e < 1) {
      const a = this.a;

      const rawM = this.M0 + this.n * t;
      const M = this.n >= 0 ? normalizeAngle(rawM) : rawM;
      const E = this._solveE(M);

      const cosE = Math.cos(E);
      const sinE = Math.sin(E);

      const sqrt1me2 = Math.sqrt(1 - e * e);

      // Orbital plane position (periapsis-aligned)
      const xOrb = a * (cosE - e);
      const yOrb = a * (sqrt1me2 * sinE);

      // Radius factor
      const r = a * (1 - e * cosE);
      const invR = 1 / Math.max(1e-12, r);

      // Orbital plane velocity
      // vx = -a n sinE / (1 - e cosE)
      // vy =  a n sqrt(1-e^2) cosE / (1 - e cosE)
      // a^2 factor keeps velocity magnitude consistent with vis-viva (see derivation)
      const fac = a * a * this.n * invR;
      const vxOrb = -fac * sinE;
      const vyOrb = fac * sqrt1me2 * cosE;

      // Rotate by omega into inertial frame
      const cosO = Math.cos(this.omega);
      const sinO = Math.sin(this.omega);

      const posRel = new Vector2D(
        xOrb * cosO - yOrb * sinO,
        xOrb * sinO + yOrb * cosO,
        true
      );

      const velRel = new Vector2D(
        vxOrb * cosO - vyOrb * sinO,
        vxOrb * sinO + vyOrb * cosO,
        true
      );

      return {
        position: parentPos.add(posRel),
        velocity: parentVel.add(velRel),
      };
    }

    // --------------------------
    // HYPERBOLIC
    // --------------------------
    if (e > 1) {
      const a = this.a; // negative
      const M = this.M0 + this.n * t;

      const F = this._solveF(M);

      const coshF = Math.cosh(F);
      const sinhF = Math.sinh(F);

      // In hyperbolic orbit, use |a|
      const absA = Math.abs(a);
      const sqrtEm1 = Math.sqrt(e * e - 1);

      // Position in periapsis-aligned frame
      const xOrb = absA * (e - coshF);
      const yOrb = absA * (sqrtEm1 * sinhF);

      // r = absA (e coshF - 1)
      const r = absA * (e * coshF - 1);
      const invR = 1 / Math.max(1e-12, r);

      // Velocity
      // from standard hyperbolic parametric derivatives
      // retain full a^2 factor for correct hyperbolic speed
      const fac = absA * absA * this.n * invR;
      const vxOrb = -fac * sinhF;
      const vyOrb = fac * sqrtEm1 * coshF;

      const cosO = Math.cos(this.omega);
      const sinO = Math.sin(this.omega);

      const posRel = new Vector2D(
        xOrb * cosO - yOrb * sinO,
        xOrb * sinO + yOrb * cosO,
        true
      );

      const velRel = new Vector2D(
        vxOrb * cosO - vyOrb * sinO,
        vxOrb * sinO + vyOrb * cosO,
        true
      );

      return {
        position: parentPos.add(posRel),
        velocity: parentVel.add(velRel),
      };
    }

    // Parabolic fallback (not supported)
    
    return {
      position: this.body.realPosition.clone(),
      velocity: this.body.realVelocity.clone(),
    };
  }

  getTimeToApsides(t = 0) {
    if (!this.valid || this.e >= 1) {
      return { timeToPe: null, timeToAp: null };
    }

    const TWO_PI = 2 * Math.PI;

    const n = this.n;
    const nAbs = Math.abs(n);
    if (!Number.isFinite(nAbs) || nAbs === 0) {
      return { timeToPe: null, timeToAp: null };
    }

    // current mean anomaly (normalized)
    const M = normalizeAngle(this.M0 + n * t);

    // targets
    const Mpe = 0;        // periapsis
    const Map = Math.PI;  // apoapsis

    // If n < 0, M decreases with time, so "forward in time" wraps the other way.
    const deltaForward = (target) => {
      if (n >= 0) {
        return (target - M + TWO_PI) % TWO_PI;
      }
      return (M - target + TWO_PI) % TWO_PI;
    };

    const dMpe = deltaForward(Mpe);
    const dMap = deltaForward(Map);

    return {
      timeToPe: dMpe / nAbs,
      timeToAp: dMap / nAbs,
    };
  }


}
