import { RigidBody } from './rigidBody.js';
import { view, kmToPixels, METERS_PER_PIXEL } from './geometry.js';

const MOON_MASS_KG = 7.34767309e22;
const MOON_RADIUS_KM = 1737.4;

export class Moon extends RigidBody {
    constructor({ x=0, y=0, vx=0, vy=0, mass=MOON_MASS_KG, fx=0, fy=0, sObject=false } = {}) {
        super({ x, y, vx, vy, mass, fx, fy, sObject });

        this.radiusKM = MOON_RADIUS_KM;
        this.radiusPX = Math.max(4, kmToPixels(MOON_RADIUS_KM));
        this.name = "Moon";

        // Load static Moon image
        this.sprite = new Image();
        this.sprite.src = "Public/Moon.png";

        this.parent = this.findgreatestInfluencer();
        this.orbit = this.orbitElements(this.parent);
    }

    draw(ctx) {
        // Update orbit parent
        this.parent = this.findgreatestInfluencer();
        this.orbit = this.parent ? this.orbitElements(this.parent) : null;

        // Draw orbit path
        this.drawPath(ctx, this.orbit, this.parent);

        ctx.save();

        if (this.sprite.complete) {
            ctx.drawImage(
                this.sprite,
                this.x - this.radiusPX,
                this.y - this.radiusPX,
                this.radiusPX * 2,
                this.radiusPX * 2
            );
        } else {
            // fallback circle
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radiusPX, 0, Math.PI * 2);
            ctx.fillStyle = "#D9D9D9";
            ctx.fill();
        }

        ctx.restore();
    }



    drawPath(ctx, elements, parent) {
        if (!elements || !parent) return;
    
        const { e, p, omega } = elements;
        if (!Number.isFinite(e) || !Number.isFinite(p) || p <= 0) return;
    
        const SAMPLES = 300;
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = "rgba(220, 220, 220, 0.3)";;
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