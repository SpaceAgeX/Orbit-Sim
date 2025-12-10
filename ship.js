//Earth Object
import { RigidBody } from './rigidBody.js';
import {
    view, kmToPixels, METERS_PER_PIXEL
} from './geometry.js';
import { showPathEnable, getTimeScale } from './UI.js';
import { Input } from "./input.js";



const SHIP_MASS_KG = 1000;


//inherit the rigidBody class
export class Ship extends RigidBody {
    constructor({ x=0, y=0, vx=0, vy=0, mass=SHIP_MASS_KG, fx=0, fy=0, sObject = false} = {}) {
        super({ x, y, vx, vy, mass, fx, fy, sObject });
    
        this.color = "#FFFFFF";
        this.symbolThresholdKmPerPx = 50;
        this.name = "Ship";
        this.hasPath = true;

        this.angle = 0;  // facing angle in radians
    
        this.thrustPercent = 0;
        this.thrustMaxN = 10000;
        this.thrustN = 0;
    
        
        this.radiusKM = 1;      // not used physically
        this.radiusPX = 12;     // click hitbox
    
        this.parent = this.findgreatestInfluencer();
        this.orbit = this.orbitElements(this.parent);
    }
    update(dt) {
        super.update(dt);

        const controlsEnabled = getTimeScale() <= 1;

        if (controlsEnabled) {
            // throttle up
            if (Input.isDown("ShiftLeft") || Input.isDown("ShiftRight")) {
                this.thrustPercent = Math.min(this.thrustPercent + 0.5 * dt, 1);
            }
        
            // throttle down
            if (Input.isDown("ControlLeft") || Input.isDown("ControlRight")) {
                this.thrustPercent = Math.max(this.thrustPercent - 0.5 * dt, 0);
            }
        
            // instant 0
            if (Input.pressed("KeyX")) {
                this.thrustPercent = 0;
            }
        
            // instant full
            if (Input.pressed("KeyZ")) {
                this.thrustPercent = 1;
            }
    
            // a/d keys rotate the ship
            if (Input.isDown("KeyA")) {
                this.angle -= 1.5 * dt; // rotate left
            }
            if (Input.isDown("KeyD")) {
                this.angle += 1.5 * dt; // rotate right
            }
        } else {
            this.thrustPercent = 0;
        }

        this.thustN = this.thrustPercent * this.thrustMaxN;

        // apply thrust force in facing direction
        const thrustFx = this.thustN * Math.sin(this.angle);
        const thrustFy = -this.thustN * Math.cos(this.angle);

        this.externalFx = thrustFx;
        this.externalFy = thrustFy;
    }
    drawTriangle(ctx, x, y, height, width, angle = 0, color = "white") {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width / 2, -height / 2);
        ctx.lineTo(-width / 2, -height / 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    draw(ctx) {
        if (showPathEnable) {
            this.parent = this.findgreatestInfluencer();
            this.orbit = this.parent ? this.orbitElements(this.parent) : null;
            this.drawPath(ctx, this.orbit, this.parent);
        }
    
        ctx.save();  // ← ← ← FIX: this was missing!
    
        // MOVE drawing origin to ship position
        ctx.translate(this.x, this.y);
    
        // ROTATE entire ship
        ctx.rotate(this.angle + Math.PI);
    
        // draw flame, nozzle, body..      
        

        if (this.thrustPercent > 0) {
            const flameLength =
                (10 * this.thrustPercent) +
                (Math.random()*1 - 0.5) * this.thrustPercent;
    
            const flameWidth = 4.5;
    
            this.drawTriangle(
                ctx,
                0,                       // local X
                -(10 + flameLength / 2),    // local Y
                -flameLength,            // height
                flameWidth,              // width
                0,                       // NO rotation here
                "orange"
            );
        }
    
        // 🚀 Nozzle
        this.drawTriangle(
            ctx,
            0,
            -7,
            7,
            5,
            0,
            "grey"
        );
    
        // 🚀 Body
        this.drawTriangle(
            ctx,
            0,
            0,
            15,
            10,
            0,
            this.color
        );
    
        ctx.restore();
    }

    drawPath(ctx, elements, parent) {
        if (!elements || !parent) return;
    
        const { e, p, omega } = elements;
        if (!Number.isFinite(e) || !Number.isFinite(p) || p <= 0) return;
    
        const SAMPLES = 300;
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = Math.max(1 / view.zoom, 0.8);
    
        let nuStart, nuEnd;
    
        if (e < 1) {
            // ---- Elliptic orbit: full 0 → 2π ----
            nuStart = 0;
            nuEnd = Math.PI * 2;
    
        } else {
            // ---- Hyperbolic orbit: draw only ONE branch ----
            // true anomaly limit = arccos(-1/e)
            const nuMax = Math.acos(-1 / e);
    
            // you can use parent-relative direction to choose correct branch
            // but defaulting to -nuMax → +nuMax draws the correct one
            nuStart = -nuMax;
            nuEnd = +nuMax;
        }
    
        let first = true;
        for (let i = 0; i <= SAMPLES; i++) {
            const t = i / SAMPLES;
            const nu = nuStart + t * (nuEnd - nuStart);
    
            const denom = 1 + e * Math.cos(nu);
            if (Math.abs(denom) < 1e-6) continue;
    
            const rMeters = p / denom;
            if (rMeters < 0) continue;  // avoid invalid side of hyperbola
    
            const rPixels = rMeters / METERS_PER_PIXEL;
            const angle = omega + nu;
    
            const worldX = parent.x + rPixels * Math.cos(angle);
            const worldY = parent.y + rPixels * Math.sin(angle);
    
            if (first) {
                ctx.moveTo(worldX, worldY);
                first = false;
            } else {
                ctx.lineTo(worldX, worldY);
            }
        }
    
        ctx.stroke();
        ctx.restore();
    }
    
    

}




