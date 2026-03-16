// ----- RigidBody class with PCA, SOI, and Path Rendering -----
import { METERS_PER_PIXEL } from './geometry.js';



export const gravitationalConstant = 6.67408e-11;


export class RigidBody {
    static bodies = [];
    static influentialBodies = [];

    constructor({
        x = 0, y = 0,
        vx = 0, vy = 0,
        mass = 1,
        fx = 0, fy = 0,
        sObject = false,
        name = 'Unnamed'
    } = {}) {

        // Current physical state
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;

        this.mass = mass;
        this.name = name;

        // External forces
        this.externalFx = fx;
        this.externalFy = fy;
        this.netFx = fx;
        this.netFy = fy;

        // Static bodies don't move
        this.sObject = sObject;

        this.orbitingBody = null; 
        this.orbitPath = [];

        this.hasInfluence = mass > 1e15; // Arbitrary threshold10

        // PCA/N-body mode
        this.mode = "nbody";        // "nbody" | "pca"
        this.parent = null;         // SOI parent
        this.elements = null;       // orbital elements

        this.lastElementsUpdateTime = 0;


        RigidBody.bodies.push(this);
        if (this.hasInfluence){
            RigidBody.influentialBodies.push(this);
        }
    }

    resetNetForce() {
        this.netFx = this.externalFx;
        this.netFy = this.externalFy;
    }

    handleInteractions(list) {

        for (const other of list) {
            if (other === this) continue;

            const dx = other.x - this.x;
            const dy = other.y - this.y;
            const dxM = dx * METERS_PER_PIXEL;
            const dyM = dy * METERS_PER_PIXEL;

            const distSq = dxM * dxM + dyM * dyM;
            if (distSq < 1) continue;

            const dist = Math.sqrt(distSq);
            const F = gravitationalConstant * this.mass * other.mass / distSq;

            const fx = F * dxM / dist;
            const fy = F * dyM / dist;

            this.netFx += fx;
            this.netFy += fy;
        }
    }

    findgreatestInfluencer() {
        let greatest = null;
        let maxForce = 0;

        //loop through influential bodies
        for (let other of RigidBody.influentialBodies) {
            if (other === this) continue;

            const dx = other.x - this.x;
            const dy = other.y - this.y;
            const dxM = dx * METERS_PER_PIXEL;
            const dyM = dy * METERS_PER_PIXEL;

            const distSq = dxM * dxM + dyM * dyM;

            if (gravitationalConstant * this.mass * other.mass / distSq > maxForce) {
                greatest = other;
                maxForce = gravitationalConstant * this.mass * other.mass / distSq;
            }
        }
        this.orbitingBody = greatest;
        //console.log("Greatest Influencer for " + this.name + " is " + greatest.name);
        return greatest;
    }

    orbitElements(parent) {
        if (!parent) return null;
    
        // --- relative position in meters ---
        const rx_m = (this.x - parent.x) * METERS_PER_PIXEL;
        const ry_m = (this.y - parent.y) * METERS_PER_PIXEL;
    
        // --- relative velocity in m/s ---
        const vx_m = (this.vx - parent.vx) * METERS_PER_PIXEL;
        const vy_m = (this.vy - parent.vy) * METERS_PER_PIXEL;
    
        const r = Math.hypot(rx_m, ry_m);
        const v = Math.hypot(vx_m, vy_m);
    
        // ✅ use ONLY parent mass here (matches your force law)
        const mu = gravitationalConstant * parent.mass;
    
        // specific angular momentum
        const h = rx_m * vy_m - ry_m * vx_m;
    
        // dot product
        const rv = rx_m * vx_m + ry_m * vy_m;
    
        // eccentricity vector
        const ex = ((v*v - mu/r) * rx_m - rv * vx_m) / mu;
        const ey = ((v*v - mu/r) * ry_m - rv * vy_m) / mu;
        const e = Math.hypot(ex, ey);
    
        // semi-major axis
        const a = 1 / (2/r - v*v/mu);
    
        // semi-latus rectum
        const p = (h*h) / mu;
    
        // argument of periapsis
        const omega = Math.atan2(ey, ex);
    
        // true anomaly
        const nu = Math.atan2(
            rx_m * ey - ry_m * ex,
            rx_m * ex + ry_m * ey
        );
    
        // apoapsis / periapsis
        let apoapsis, periapsis;
        if (e < 1) {
            apoapsis = a * (1 + e);
            periapsis = a * (1 - e);
        } else {
            apoapsis = Infinity;
            periapsis = a * (1 - e);
        }
    
        return {
            a, apoapsis, periapsis,
            e, ex, ey,
            p, mu, h,
            omega, nu,
            r, v,
            rx: rx_m, ry: ry_m,
            vx: vx_m, vy: vy_m
        };
    }
    
      
    
   

    
    update(dt, simTime) {
        if (!this.sObject) {
            const ax = this.netFx / this.mass;
            const ay = this.netFy / this.mass;

            this.vx += (ax / METERS_PER_PIXEL) * dt;
            this.vy += (ay / METERS_PER_PIXEL) * dt;

            this.x += this.vx * dt;
            this.y += this.vy * dt;
        }

    }

    

    // ----------------------------------------------------------
    // STATIC LOOP
    // ----------------------------------------------------------

    static updateAll(dt, simTime) {
        for (const b of RigidBody.bodies) b.resetNetForce();
        for (const b of RigidBody.bodies) b.handleInteractions(RigidBody.bodies);
        for (const b of RigidBody.bodies) b.update(dt, simTime);
    }

}
