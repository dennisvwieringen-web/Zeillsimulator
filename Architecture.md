\# Architecture



\## File Structure

\* `index.html`: Main container, holds the `<canvas>` element and UI overlays.

\* `style.css`: Styling for the UI elements (HUD, menu).

\* `js/`

&nbsp;   \* `main.js`: Entry point, initializes the game loop.

&nbsp;   \* `input.js`: Handles keyboard listeners (Arrow keys, W/S).

&nbsp;   \* `boat.js`: Class containing boat state (position, heading, speed, sail angles). Contains the physics logic for calculating speed based on wind angle vs. sail angle.

&nbsp;   \* `wind.js`: Constant definitions for wind direction and force.

&nbsp;   \* `renderer.js`: Handles drawing the boat, sails, island, and wind indicators on the canvas.



\## Key Logic (Physics)

\* \*\*Wind Angle:\*\* Calculated relative to the boat's heading.

\* \*\*Sail Efficiency:\*\* A function that compares `CurrentSailAngle` with `OptimalSailAngle` (based on wind).

&nbsp;   \* `Efficiency = 1.0 - abs(Optimal - Current)`

\* \*\*State Machine:\*\*

&nbsp;   \* `SAILING`: Normal movement.

&nbsp;   \* `IN\_IRONS` (In de wind): No speed, drifting backward.

&nbsp;   \* `TACKING/GYBING`: Transition states where sail side flips.

