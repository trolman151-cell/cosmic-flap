export const CANVAS_WIDTH  = 400;
export const CANVAS_HEIGHT = 700;

// Bird
export const BIRD_X        = 80;
export const BIRD_RADIUS   = 16;
export const GRAVITY       = 0.45;
export const FLAP_STRENGTH = -8.5;
export const MAX_FALL_VEL  = 12;

// Pipes
export const PIPE_WIDTH    = 60;
export const PIPE_GAP      = 170;
export const PIPE_SPEED    = 3;
export const PIPE_SPAWN_X  = CANVAS_WIDTH + PIPE_WIDTH;
export const PIPE_INTERVAL = 90; // frames between spawns
export const PIPE_MIN_TOP  = 80;
export const PIPE_MAX_TOP  = CANVAS_HEIGHT - PIPE_GAP - 80;

// Ground
export const GROUND_HEIGHT = 60;
export const GROUND_Y      = CANVAS_HEIGHT - GROUND_HEIGHT;

// Stars (background)
export const STAR_COUNT    = 80;
