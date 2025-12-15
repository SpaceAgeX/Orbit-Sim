// Earth Object — Static Image
import { RigidBody } from './rigidBody.js';
import { kmToPixels } from './geometry.js';

const EARTH_RADIUS_KM = 6371;
const EARTH_MASS_KG = 5.972e24;

export class Earth extends RigidBody {

    constructor({ x=0, y=0, vx=0, vy=0, mass=EARTH_MASS_KG, fx=0, fy=0, sObject=true } = {}) {
        super({ x, y, vx, vy, mass, fx, fy, sObject });

        this.radiusKM = EARTH_RADIUS_KM;
        this.radiusPX = Math.max(30, kmToPixels(EARTH_RADIUS_KM));
        this.name = "Earth";

        // Load static Earth image (NOT a sprite sheet)
        this.sprite = new Image();
        this.sprite.src = "Public/Earth.png";
    }

    draw(ctx) {
        ctx.save();

        if (this.sprite.complete) {
            // Draw static Earth image centered
            ctx.drawImage(
                this.sprite,
                this.x - this.radiusPX,
                this.y - this.radiusPX,
                this.radiusPX * 2,
                this.radiusPX * 2
            );
        } else {
            // fallback: draw a circle until image loads
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radiusPX, 0, Math.PI * 2);
            ctx.fillStyle = "#3A86FF";
            ctx.fill();
        }

        ctx.restore();

        this.findgreatestInfluencer();
    }
}
