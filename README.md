# Orbital Mechanics Simulator

A browser-based 2D Earth-Moon orbital simulator built with vanilla JavaScript and HTML5 canvas.

The current build includes:

- Earth as the central body
- The Moon orbiting Earth
- A controllable ship starting at Earth's surface
- Two time warp modes
- Camera focus, targeting, and orbital readouts

## Controls

### Mouse

| Action | Input |
|---|---|
| Pan camera | Left click + drag |
| Zoom | Mouse wheel |
| Open body context menu | Right click on Earth, Moon, or Ship |

Notes:

- Mouse-wheel zoom is centered on the screen, not the cursor.
- The ship has an enlarged click radius so it is easier to right-click.

### Keyboard

| Action | Input |
|---|---|
| Rotate ship left | `A` |
| Rotate ship right | `D` |
| Throttle up | `Shift` |
| Throttle down | `Ctrl` |
| Cut throttle to 0% | `X` |
| Set throttle to 100% | `Z` |
| Zoom in | `Arrow Up` |
| Zoom out | `Arrow Down` |
| Reset time warp to `1x` | `C` |
| Open / close pause menu | `Esc` |

### Context Menu

Right-clicking a body opens:

- `Select Body`
- `Set Camera Focus`
- `Set Target`

These work on the ship as well as Earth and Moon.

## Running

Serve the project from the repo root:

```powershell
cd c:\Users\X\Documents\Programs\WebDev\Orbit
python -m http.server 8000
```

Then open:

`http://localhost:8000`

## Time Warp

The clock panel supports two warp systems:

### Physics Warp

- Uses full Newtonian gravity
- Updates all active bodies with n-body physics
- Ship controls and thrust are enabled in this mode
- Available warp steps: `1x`, `2x`, `3x`, `5x`, `8x`, `10x`, `12x`, `15x`, `20x`

### Fixed Warp

- Uses Kepler-style orbital rails
- Each moving body follows the single body exerting the strongest gravitational influence
- Intended for faster stable orbital time acceleration
- Available warp steps: `1x`, `5x`, `10x`, `50x`, `100x`, `1000x`, `10000x`, `100000x`

Notes:

- The warp tray is attached to the clock UI.
- Clicking the mode button switches between `Physics` and `Fixed`.
- Pressing `C` returns warp to `1x`.

## UI

### Time Panel

- Simulation clock
- Warp mode toggle
- Warp speed buttons

### Orbital Data

Shows values for the selected body, including:

- Apoapsis
- Periapsis
- Time to apoapsis
- Time to periapsis
- Eccentricity
- Period
- Semi-major axis
- Argument of periapsis

### Body Status

Shows:

- Selected body
- Mass
- Situation
- Sphere of influence / parent body
- Current camera focus

### Target Data

Shows target-relative readouts when a target is set:

- Relative velocity
- Separation

### Nav / Flight UI

- Velocity
- Heading
- Acceleration
- Throttle bar
- Navball
- Attitude hold buttons

## Visual Behavior

- The Moon starts to the right of Earth and orbits counterclockwise.
- The ship draws a highlighted orbital path.
- When zoomed far enough out, the ship displays a visibility indicator so it remains easy to find.

## Project Structure

- [main.js](/c:/Users/X/Documents/Programs/WebDev/Orbit/main.js): app entry, world setup, main loop
- [geometry.js](/c:/Users/X/Documents/Programs/WebDev/Orbit/geometry.js): camera, zoom, coordinate helpers
- [object.js](/c:/Users/X/Documents/Programs/WebDev/Orbit/object.js): body state, gravity, Kepler/n-body switching
- [ship.js](/c:/Users/X/Documents/Programs/WebDev/Orbit/ship.js): ship controls, drawing, trajectory rendering
- [planetBase.js](/c:/Users/X/Documents/Programs/WebDev/Orbit/planetBase.js): sprite body base class
- [UI/ui.js](/c:/Users/X/Documents/Programs/WebDev/Orbit/UI/ui.js): HUD, warp controls, pause/settings UI
- [UI/contextMenu.js](/c:/Users/X/Documents/Programs/WebDev/Orbit/UI/contextMenu.js): right-click body menu
- [UI/format.js](/c:/Users/X/Documents/Programs/WebDev/Orbit/UI/format.js): telemetry formatting

## Assets

Earth and Moon pixel art provided by:

PixelPlanets  
https://github.com/Deep-Fold/PixelPlanets
