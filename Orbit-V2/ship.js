import { Body } from "./object.js";
import { Vector2D, kmToPixels } from "./geometry.js";    



const SHIP_MASS_KG = 1000;



export class Ship extends Body {
    constructor() {
        super({
          name: "Earth",
          position: new Vector2D(500, 0, true),   // world origin (meters)
          velocity: new Vector2D(8000, 0, true),
          mass: SHIP_MASS_KG,
          radius: 1000,
          sBody: false,                          // static
          influential: false,                   // produces gravity
          motionMode: "nbody"                 // irrelevant, Earth does not move
        });
    
        
    }

    update(dt){
        super.update(dt);
        //draw the ship as a circle
    }
    draw(ctx) {
        const radiusPx = kmToPixels(this.radius);
    
        ctx.save();
        ctx.translate(
            this.realPosition.x,
            this.realPosition.y
        );
    
        ctx.beginPath();
        ctx.arc(0, 0, radiusPx, 0, Math.PI * 2);
        ctx.fillStyle = "white";
        ctx.fill();
    
        ctx.restore();
        
    }
}