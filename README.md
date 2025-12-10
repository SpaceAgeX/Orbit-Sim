Orbital Mechanics Simulator

A browser-based 2D orbital simulation using Newtonian gravity.
The system models Earth, the Moon, and a satellite with real orbital mechanics, a fully dynamic camera, and UI panels for simulation time, orbital parameters, and settings.

Visual assets for Earth and Moon are sourced from:

PixelPlanets
https://github.com/Deep-Fold/PixelPlanets

The simulation is implemented in vanilla JavaScript and rendered using HTML5 Canvas.

Features
Real Newtonian Gravity

All bodies interact gravitationally using the universal gravitational constant.
Physics integration is implemented in rigidBody.js, including:

Force accumulation

Velocity and position updates

Orbital element calculation (semi-major axis, eccentricity, periapsis, apoapsis, orbital period)

Earth–Moon System

Defined in index.js using real-world scaled values.
The Moon computes and draws its orbital path dynamically (moon.js).

Satellite

A fully simulated satellite orbiting Earth.
Uses the same gravitational physics and orbit-element math (satellite.js).
Selectable by mouse.

Camera System

Camera logic (panning, zooming, target locking) is handled in geometry.js.
The camera can track a selected body by matching its velocity, keeping it centered.

UI Panels

UI is managed by UI.js and includes:

Time Panel

Simulation clock (years/days/hours/minutes/seconds)

Time warp controls (1× to 10,000×)

Smooth UI expansion on hover

Orbit Information Panel

Shows for the selected body:

Speed

Altitude

Apoapsis

Periapsis

Semi-major axis

Eccentricity

Orbital period

Body Information Panel

Selected body

Locked camera target

Parent body

Object mass

General Settings

Toggle orbit path visibility

True-size body rendering toggle

Display of km-per-pixel scale

Controls

Below is the complete list of all key and mouse controls currently implemented in the code.

Mouse Controls
Action	Input
Select body	Left click
Open context menu (select/camera-target)	Right click
Pan camera	Left-click drag
Zoom	Mouse wheel
Camera Controls
Action	Input
Zoom in	Arrow Up
Zoom out	Arrow Down
Reset camera target to selected body	C
Time Warp Controls

These are defined in the UI and controlled by clicking, but also include internal input handling:

Action	Input
Reset to 1× speed	C (also resets camera target)

(Time warp values themselves are selected via UI buttons, not keys.)

UI Toggles
Action	Input
Toggle orbit path display	Checkbox in Settings panel
Toggle true-size rendering	Checkbox in Settings panel
Context Menu Options

Accessible via right-click on a body:

Select Body

Set Camera Target

These options dynamically update information panels and the camera lock.

Project Structure
index.html        – Layout and container for canvas and UI panels
style.css         – Styling for UI components and simulation window
index.js          – Simulation setup, main loop, rendering, camera logic
geometry.js       – Zoom/pan, canvas transforms, scaling utilities
rigidBody.js      – Core N-body physics engine, orbital element math
earth.js          – Earth definition and drawing
moon.js           – Moon definition and orbit path drawing
satellite.js      – Satellite definition and orbit path drawing
UI.js             – Time panel, settings panel, orbit information, context menus
input.js          – Reserved for future input handling

Assets

Earth and Moon artwork originate from:

PixelPlanets
https://github.com/Deep-Fold/PixelPlanets

Please refer to that repository for licensing information.
