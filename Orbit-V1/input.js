// input.js — global input manager

export const Input = {
    keys: {},        // current frame key states
    prevKeys: {},    // last frame key states

    init() {
        window.addEventListener("keydown", (e) => {
            this.keys[e.code] = true;
        });

        window.addEventListener("keyup", (e) => {
            this.keys[e.code] = false;
        });
    },

    // call this once each frame
    update() {
        this.prevKeys = { ...this.keys };
    },

    // true if key is currently held
    isDown(code) {
        return !!this.keys[code];
    },

    // true on the EXACT frame the key was pressed
    pressed(code) {
        return this.isDown(code) && !this.prevKeys[code];
    },

    // true on the frame the key was released
    released(code) {
        return !this.isDown(code) && this.prevKeys[code];
    }
};
