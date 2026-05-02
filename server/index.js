const express = require('express');
const http    = require('http');
const path    = require('path');
const fs      = require('fs');
const { Server } = require('socket.io');
const cors    = require('cors');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.get('/health', (_req, res) => res.json({ ok: true }));

// Serve built frontend
// Try two possible locations (handles different deploy environments)
const distCandidates = [
  path.join(__dirname, '../dist'),
  path.join(process.cwd(), 'dist'),
  path.join(__dirname, 'dist'),
];
const distDir = distCandidates.find(p => fs.existsSync(path.join(p, 'index.html')));

console.log('__dirname   :', __dirname);
console.log('cwd         :', process.cwd());
console.log('dist found  :', distDir ?? 'NOT FOUND');

if (distDir) {
  app.use(express.static(distDir));
}

app.get(/.*/, (_req, res) => {
  if (distDir) {
    res.sendFile(path.join(distDir, 'index.html'));
  } else {
    res.status(503).send('Frontend not built yet — dist folder missing');
  }
});

// ── Game constants (must match client) ──────────────────
const CANVAS_WIDTH  = 400;
const CANVAS_HEIGHT = 700;
const BIRD_X        = 80;
const BIRD_RADIUS   = 16;
const GRAVITY       = 0.45;
const FLAP_STRENGTH = -7.0;
const MAX_FALL_VEL  = 12;
const PIPE_WIDTH    = 60;
const PIPE_GAP      = 190;
const PIPE_SPEED    = 3;
const PIPE_INTERVAL = 90;
const PIPE_MIN_TOP  = 80;
const PIPE_MAX_TOP  = CANVAS_HEIGHT - PIPE_GAP - 80;
const GROUND_Y      = CANVAS_HEIGHT - 60;
const TICK_MS       = 1000 / 30; // 30 fps — good balance of smoothness vs CPU

// ── Rooms ────────────────────────────────────────────────
const rooms = new Map(); // roomId → Room

function makeRoom(roomId) {
  return {
    id: roomId,
    players: {},
    pipes: [],
    started: false,
    finished: false,
    countdown: 0,
    frame: 0,
    interval: null,         // game loop interval
    countdownInterval: null, // countdown interval (tracked separately so reset can clear it)
    podium: [],
    hostId: null,
  };
}

function spawnPipe() {
  const topHeight = PIPE_MIN_TOP + Math.random() * (PIPE_MAX_TOP - PIPE_MIN_TOP);
  return { x: CANVAS_WIDTH + PIPE_WIDTH, topHeight, bottomY: topHeight + PIPE_GAP, scored: false };
}

function stepRoom(room) {
  if (!room.started || room.finished) return;
  room.frame++;

  // Move pipes
  room.pipes = room.pipes
    .map((p) => ({ ...p, x: p.x - PIPE_SPEED }))
    .filter((p) => p.x + PIPE_WIDTH > -10);

  if (room.frame % PIPE_INTERVAL === 0) {
    room.pipes.push(spawnPipe());
  }

  let alivePlayers = 0;

  Object.entries(room.players).forEach(([id, p]) => {
    if (!p.alive) return;

    // Physics
    p.velocity = Math.min(p.velocity + GRAVITY, MAX_FALL_VEL);
    p.y += p.velocity;

    // Score
    room.pipes.forEach((pipe) => {
      if (!pipe.scored && pipe.x + PIPE_WIDTH < BIRD_X - BIRD_RADIUS) {
        pipe.scored = true;
        p.score++;
      }
    });

    // Collision: ground/ceiling
    if (p.y + BIRD_RADIUS >= GROUND_Y || p.y - BIRD_RADIUS <= 0) {
      p.alive = false;
    }

    // Collision: pipes
    if (p.alive) {
      for (const pipe of room.pipes) {
        const bLeft  = BIRD_X - BIRD_RADIUS + 4;
        const bRight = BIRD_X + BIRD_RADIUS - 4;
        const bTop   = p.y - BIRD_RADIUS + 4;
        const bBot   = p.y + BIRD_RADIUS - 4;
        const inX    = bRight > pipe.x + 4 && bLeft < pipe.x + PIPE_WIDTH - 4;
        const inTop  = bTop < pipe.topHeight;
        const inBot  = bBot > pipe.bottomY;
        if (inX && (inTop || inBot)) { p.alive = false; break; }
      }
    }

    if (p.alive) alivePlayers++;
  });

  const totalPlayers = Object.keys(room.players).length;

  // Check win condition
  if (totalPlayers > 1 && alivePlayers <= 1) {
    finishRoom(room);
  } else if (totalPlayers === 1 && alivePlayers === 0) {
    finishRoom(room);
  }
}

function finishRoom(room) {
  room.finished = true;
  clearInterval(room.interval);       room.interval = null;
  clearInterval(room.countdownInterval); room.countdownInterval = null;

  // Build podium sorted by score desc then by time of death (alive players last)
  const sorted = Object.entries(room.players)
    .sort(([, a], [, b]) => {
      if (a.alive !== b.alive) return a.alive ? -1 : 1;
      return b.score - a.score;
    });

  room.podium = sorted.map(([id, p], i) => ({
    id,
    name: p.name,
    skinId: p.skinId,
    score: p.score,
    rank: i + 1,
  }));

  broadcastState(room);
}

function broadcastState(room) {
  io.to(room.id).emit('room:state', {
    roomId: room.id,
    players: room.players,
    pipes: room.pipes,
    started: room.started,
    finished: room.finished,
    countdown: room.countdown,
    podium: room.podium,
    hostId: room.hostId,
  });
}

function startCountdown(room) {
  // Clear any previous countdown that might still be running
  if (room.countdownInterval) { clearInterval(room.countdownInterval); room.countdownInterval = null; }

  room.countdown = 3;
  broadcastState(room);

  room.countdownInterval = setInterval(() => {
    room.countdown--;
    if (room.countdown <= 0) {
      clearInterval(room.countdownInterval);
      room.countdownInterval = null;
      room.countdown = 0;
      room.started = true;
      Object.values(room.players).forEach((p) => {
        p.y = CANVAS_HEIGHT / 2;
        p.velocity = 0;
        p.alive = true;
        p.score = 0;
      });
      room.pipes = [];
      room.frame = 0;
      broadcastState(room);
      room.interval = setInterval(() => {
        stepRoom(room);
        broadcastState(room);
      }, TICK_MS);
    } else {
      broadcastState(room);
    }
  }, 1000);
}

// ── Socket events ────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`+ ${socket.id}`);

  socket.on('room:join', ({ roomId, name, skinId }) => {
    let room = rooms.get(roomId);
    if (!room) {
      room = makeRoom(roomId);
      rooms.set(roomId, room);
    }

    if (room.started && !room.finished) {
      socket.emit('room:error', 'Game already in progress');
      return;
    }

    socket.join(roomId);
    socket.data.roomId = roomId;

    // First player in becomes host
    if (!room.hostId) room.hostId = socket.id;

    room.players[socket.id] = {
      id: socket.id,
      name: name || 'Pilot',
      skinId: skinId || 'cyan',
      y: CANVAS_HEIGHT / 2,
      velocity: 0,
      alive: true,
      score: 0,
    };

    socket.emit('room:joined', { roomId, playerId: socket.id });
    broadcastState(room);
    console.log(`  ${socket.id} joined room ${roomId} (${Object.keys(room.players).length} players)`);
  });

  socket.on('player:flap', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    const p = room.players[socket.id];
    if (!p || !p.alive || !room.started) return;
    p.velocity = FLAP_STRENGTH;
  });

  socket.on('room:start', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room || room.started) return;
    if (room.hostId !== socket.id) return; // only host can start
    if (Object.keys(room.players).length < 1) return;
    startCountdown(room);
  });

  // Reset room back to waiting state — only process the first reset per match
  socket.on('room:reset', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    if (!room.started && !room.finished) return; // already reset, ignore duplicate resets

    // Clear both intervals so nothing fires after reset
    clearInterval(room.interval);       room.interval = null;
    clearInterval(room.countdownInterval); room.countdownInterval = null;

    room.started   = false;
    room.finished  = false;
    room.pipes     = [];
    room.frame     = 0;
    room.countdown = 0;
    room.podium    = [];
    Object.values(room.players).forEach((p) => {
      p.y = CANVAS_HEIGHT / 2;
      p.velocity = 0;
      p.alive = true;
      p.score = 0;
    });
    broadcastState(room);
    console.log(`  Room ${roomId} reset by ${socket.id}`);
  });

  socket.on('disconnect', () => {
    console.log(`- ${socket.id}`);
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    delete room.players[socket.id];

    if (Object.keys(room.players).length === 0) {
      clearInterval(room.interval);
      clearInterval(room.countdownInterval);
      rooms.delete(roomId);
    } else {
      // Migrate host to next available player
      if (room.hostId === socket.id) {
        room.hostId = Object.keys(room.players)[0];
        console.log(`  Host migrated to ${room.hostId} in room ${roomId}`);
      }
      const alive = Object.values(room.players).filter((p) => p.alive).length;
      if (room.started && !room.finished && alive <= 1) finishRoom(room);
      else broadcastState(room);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Cosmic Flap server on :${PORT}`);

  // Keep Render free tier awake — ping /health every 14 minutes
  const selfUrl = process.env.RENDER_EXTERNAL_URL;
  if (selfUrl) {
    setInterval(() => {
      fetch(`${selfUrl}/health`)
        .then(() => console.log('keep-alive ping ok'))
        .catch((e) => console.warn('keep-alive ping failed:', e.message));
    }, 14 * 60 * 1000);
  }
});
