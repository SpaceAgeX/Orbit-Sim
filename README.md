# Orbital Mechanics Simulator

A browser-based 2D orbital simulation using Newtonian gravity.  
The system models Earth, the Moon, and a satellite with real orbital mechanics, a dynamic camera, and UI panels displaying simulation time, orbital parameters, and settings.

---

## Visual Assets

Earth and Moon artwork sourced from:

PixelPlanets — https://github.com/Deep-Fold/PixelPlanets  
(Refer to their repository for licensing information)

---

## Technology

Built using:

- Vanilla JavaScript
- HTML5 Canvas

All physics are implemented manually without external simulation libraries.

---

## Features

### Real Newtonian Gravity

All bodies interact gravitationally using the universal gravitational constant.  
Physics integration is implemented in `rigidBody.js`, including:

- Force accumulation
- Velocity and position updates
- Orbital parameter calculations:
  - Semi-major axis
  - Eccentricity
  - Periapsis and apoapsis
  - Orbital period

---

### Earth–Moon System

Defined in `index.js` using scaled real-world values.  
The Moon dynamically computes its orbital elements and draws its orbit path, implemented in `moon.js`.

---

### Satellite

A fully simulated satellite orbiting Earth, using the same gravitational physics and orbital calculations.  
Selectable via mouse input.  
Defined in `satellite.js`.

---

### Camera System

Implemented in `geometry.js` and supports:

- Panning
- Zooming
- Target tracking

The camera can lock onto a body and follow its motion to keep it centered.

---

## UI Panels (UI.js)

The interface includes multiple panels:

---

### Time Panel

- Displays simulation clock (years, days, hours, minutes, seconds)
- Time warp controls (1× to 10,000×)
- Smooth expansion on hover

---

### Orbit Information Panel

Shows live orbital data for the selected body:

- Speed
- Altitude
- Apoapsis
- Periapsis
- Semi-major axis
- Eccentricity
- Orbital period

---

### Body Information Panel

Displays:

- Selected body
- Locked camera target
- Parent body
- Object mass

---

### General Settings

Includes options to:

- Toggle orbit path visibility
- Toggle true-size rendering
- Display km-per-pixel scale

---

## Controls

### Mouse Input

| Action | Input |
|--------|-------|
| Select body | Left click |
| Open context menu (selection or camera target) | Right click |
| Pan camera | Left-click + drag |
| Zoom | Mouse wheel |

---

### Keyboard — Camera

| Action | Input |
|--------|-------|
| Zoom in | Arrow Up |
| Zoom out | Arrow Down |
| Rotate Left | A |
| Rotate Right | D |
| Throttle Up | Shift |
| Throttle Down | Ctrl |
| Increase Max Thrust | R |
| Decrease Max Thrust | F |


---

### Time Warp

Time warp values are selected via UI buttons.

Keyboard shortcut:

- C resets simulation to 1×.

---

### UI Toggles

Located in the Settings panel:

- Orbit path display toggle

---

### Context Menu Options

Accessible by right-clicking a body:

- Select Body
- Set Camera Target

These update UI information and camera behavior dynamically.

---

## Project Structure

index.html – Canvas and UI layout
style.css – UI styling and layout
index.js – Simulation setup, main loop, rendering
geometry.js – Camera transforms, scaling utilities
rigidBody.js – Core N-body physics engine and orbital math
earth.js – Earth definition and drawing logic
moon.js – Moon definition and orbit path rendering
satellite.js – Satellite simulation and drawing
UI.js – Time panel, settings, orbit information, menus
input.js – Reserved for future input handling

yaml
Copy code

---

## Assets

Earth and Moon pixel art provided by:

PixelPlanets — https://github.com/Deep-Fold/PixelPlanets
