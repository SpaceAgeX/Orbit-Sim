export const METERS_PER_KM = 1000;
export const STANDARD_GRAVITY = 9.80665;
export const RAD_TO_DEG = 180 / Math.PI;

export const toDegrees = (rad) => rad * RAD_TO_DEG;

export function formatDistance(meters) {
  if (!Number.isFinite(meters)) return "--";
  const abs = Math.abs(meters);
  if (abs >= 1e9) return `${(meters / 1e9).toFixed(2)} Gm`;
  if (abs >= 1e6) return `${(meters / 1e6).toFixed(2)} Mm`;
  if (abs >= 1e3) return `${(meters / 1e3).toFixed(1)} km`;
  return `${meters.toFixed(0)} m`;
}

export function formatVelocity(mps) {
  return Number.isFinite(mps) ? `${mps.toFixed(0)} m/s` : "--";
}

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return "--";
  const sign = seconds < 0 ? "-" : "";
  let t = Math.abs(seconds);
  const days = Math.floor(t / 86400);
  t -= days * 86400;
  const hours = Math.floor(t / 3600);
  t -= hours * 3600;
  const minutes = Math.floor(t / 60);
  t -= minutes * 60;
  const secs = Math.floor(t);
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  return `${sign}${days}d ${hh}:${mm}:${ss}`;
}

export function formatHeading(degrees) {
  if (!Number.isFinite(degrees)) return "--";
  const normalized = ((degrees % 360) + 360) % 360;
  return `${normalized.toFixed(0).padStart(3, "0")} \u00B0`;
}

function buildOrbitalReadouts(body, parent) {
  const empty = {
    apoapsis: "--",
    timeToAp: "--",
    periapsis: "--",
    timeToPe: "--",
    eccentricity: "--",
    period: "--",
    semiMajorAxis: "--",
    argumentOfPeriapsis: "--",
  };

  if (!body || !body.trajectory || !body.trajectory.valid || !parent) {
    return empty;
  }

  const { trajectory } = body;
  const { a, e, omega, mu } = trajectory;
  const parentRadiusMeters = parent.realRadius;

  const apoapsis = a * (1 + e) - parentRadiusMeters;
  const periapsis = a * (1 - e) - parentRadiusMeters;
  const period = e < 1 ? 2 * Math.PI * Math.sqrt(Math.abs(a ** 3) / mu) : NaN;
  const timeToApsides = trajectory.getTimeToApsides
    ? trajectory.getTimeToApsides(body.trajectoryTime)
    : { timeToAp: NaN, timeToPe: NaN };

  return {
    ...empty,
    apoapsis: formatDistance(apoapsis),
    timeToAp: formatDuration(timeToApsides.timeToAp),
    periapsis: formatDistance(periapsis),
    timeToPe: formatDuration(timeToApsides.timeToPe),
    eccentricity: Number.isFinite(e) ? e.toFixed(4) : "--",
    period: Number.isFinite(period) ? formatDuration(period) : "--",
    semiMajorAxis: formatDistance(a),
    argumentOfPeriapsis: Number.isFinite(omega) ? `${toDegrees(omega).toFixed(1)} \u00B0` : "--",
  };
}

function deriveSituation(target, parent) {
  if (!parent || !target || !target.trajectory) return "--";
  const periMeters = target.trajectory.a
    ? target.trajectory.a * (1 - target.trajectory.e) - parent.realRadius
    : NaN;
  if (Number.isFinite(periMeters) && periMeters <= 0) return "Collision";
  const e = target.trajectory.e;
  if (Number.isFinite(e)) {
    if (e < 1) return "Orbit";
    if (e >= 1) return "Escape";
  }
  return "--";
}

export function collectTelemetry(body, options = {}) {
  const {
    defaultBody = null,
    fallbackParent = null,
    cameraTarget = null,
    targetBody = null,
    ensureTrajectory = null,
  } = options;

  const target = body || defaultBody;
  const navSource = defaultBody || target;

  // -----------------------------
  // Navball + HUD (always ship-centric when available)
  // -----------------------------
  const navParent = navSource?.parent ?? fallbackParent ?? null;
  const navRelPos = navSource
    ? (navParent ? navSource.realPosition.sub(navParent.realPosition) : navSource.realPosition)
    : null;
  const navRelVel = navSource
    ? (navParent ? navSource.realVelocity.sub(navParent.realVelocity) : navSource.realVelocity)
    : null;

  const normalizeAngle = (a) => {
    const twoPi = 2 * Math.PI;
    const wrapped = a % twoPi;
    return wrapped < 0 ? wrapped + twoPi : wrapped;
  };

  const toNavballAngle = (angle) => normalizeAngle(angle + Math.PI / 2);

  const headingVector =
    navSource && navSource.angle != null
      ? { x: Math.sin(navSource.angle), y: -Math.cos(navSource.angle) }
      : navRelVel || { x: 0, y: 0 };

  const navHeadingRad = toNavballAngle(Math.atan2(headingVector.y, headingVector.x));

  const progradeAngle = navRelVel && navRelVel.r > 0 ? Math.atan2(navRelVel.y, navRelVel.x) : null;
  const radialAngle = navRelPos && navRelPos.r > 0 ? Math.atan2(navRelPos.y, navRelPos.x) : null;

  const navProgradeRad = progradeAngle != null ? toNavballAngle(progradeAngle) : navHeadingRad;
  const navRadialOutRad = radialAngle != null ? toNavballAngle(radialAngle) : navHeadingRad;

  const feltAccelMs2 =
    navSource?.externalForce?.mag && navSource.mass
      ? navSource.externalForce.mag() / navSource.mass
      : 0;
  const navSpeed = navRelVel ? navRelVel.mag() : 0;

  const navballTelemetry = {
    heading: formatHeading(toDegrees(navHeadingRad)),
    headingRad: navHeadingRad,
    progradeRad: navProgradeRad,
    radialOutRad: navRadialOutRad,
    accel: Number.isFinite(feltAccelMs2) ? `${(feltAccelMs2 / STANDARD_GRAVITY).toFixed(2)} g` : "--",
    velocity: formatVelocity(navSpeed),
    thrustPct: navSource?.thrustPercent != null ? navSource.thrustPercent * 100 : 0,
  };

  // If nothing is selected/available, still feed navball data
  if (!target) {
    return {
      ...navballTelemetry,
    };
  }

  if (typeof ensureTrajectory === "function") {
    ensureTrajectory(target);
  }

  const parent = target.parent ?? fallbackParent ?? null;
  const relativePos = parent ? target.realPosition.sub(parent.realPosition) : target.realPosition;
  const relativeVel = parent ? target.realVelocity.sub(parent.realVelocity) : target.realVelocity;
  const altitudeMeters = parent
    ? relativePos.mag() - (parent.realRadius)
    : relativePos.mag();

  const orbital = buildOrbitalReadouts(target, parent);
  const situation = deriveSituation(target, parent);
  const relativeTargetVelocity =
    targetBody && navSource
      ? navSource.realVelocity.sub(targetBody.realVelocity).mag()
      : NaN;
  const targetSeparation =
    targetBody && navSource
      ? navSource.realPosition.sub(targetBody.realPosition).mag()
      : NaN;

  if (target.sBody) {
    return {
      ...orbital,
      altitude: "--",
      velocity: navballTelemetry.velocity,
      accel: navballTelemetry.accel,
      heading: navballTelemetry.heading,
      headingRad: navballTelemetry.headingRad,
      progradeRad: navballTelemetry.progradeRad,
      radialOutRad: navballTelemetry.radialOutRad,
      thrustPct: navballTelemetry.thrustPct,
      targetRelVel: formatVelocity(relativeTargetVelocity),
      targetSeparation: formatDistance(targetSeparation),
      targetClosest: "--",
      targetTimeCA: "--",
      bodySelected: target?.name || "--",
      bodyMass: target?.mass ? `${target.mass.toExponential(2)} kg` : "--",
      bodySituation: "--",
      bodySOI: "--",
      bodyLockedOn: cameraTarget?.name || "None",
      manDeltaV: "--",
      manDuration: "--",
      manBurnStart: "--",
      manTWR: "--",
      manHeading: "--",
    };
  }

  return {
    ...orbital,
    altitude: formatDistance(altitudeMeters),
    velocity: navballTelemetry.velocity,
    accel: navballTelemetry.accel,
    heading: navballTelemetry.heading,
    headingRad: navballTelemetry.headingRad,
    progradeRad: navballTelemetry.progradeRad,
    radialOutRad: navballTelemetry.radialOutRad,
    thrustPct: navballTelemetry.thrustPct,

      targetRelVel: formatVelocity(relativeTargetVelocity),
      targetSeparation: formatDistance(targetSeparation),
      targetClosest: "--",
      targetTimeCA: "--",

    bodySelected: target?.name || "--",
    bodyMass: target?.mass ? `${target.mass.toExponential(2)} kg` : "--",
    bodySituation: situation,
    bodySOI: parent?.name || "--",
    bodyLockedOn: cameraTarget?.name || "None",

    manDeltaV: "--",
    manDuration: "--",
    manBurnStart: "--",
    manTWR: "--",
    manHeading: "--",
  };
}
