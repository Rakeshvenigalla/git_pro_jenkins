/**
 * Space Invaders - Game Engine
 * A complete Space Invaders implementation using HTML5 Canvas
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ─── Constants ────────────────────────────────────────────────────────────────
const COLS = 11;
const ROWS = 5;
const ALIEN_W = 36;
const ALIEN_H = 28;
const ALIEN_PAD_X = 16;
const ALIEN_PAD_Y = 14;
const PLAYER_W = 48;
const PLAYER_H = 24;
const BULLET_W = 3;
const BULLET_H = 14;
const BOMB_W = 4;
const BOMB_H = 14;
const BARRIER_COLS = 4;

// ─── Game State ───────────────────────────────────────────────────────────────
let state = {};

function initGame() {
    state = {
        score: 0,
        lives: 3,
        level: 1,
        phase: 'playing', // 'playing' | 'gameover' | 'win' | 'paused'
        player: {
            x: canvas.width / 2 - PLAYER_W / 2,
            y: canvas.height - 60,
            speed: 5,
            movingLeft: false,
            movingRight: false,
        },
        bullets: [],
        bombs: [],
        aliens: buildAliens(),
        barriers: buildBarriers(),
        alienDir: 1,
        alienSpeed: 0.5,
        alienDropDist: 0,
        alienBombRate: 0.002,
        explosions: [],
        lastBulletTime: 0,
        bulletCooldown: 350,
        frameCount: 0,
        animTick: 0,
    };
}

function buildAliens() {
    const aliens = [];
    const startX = 60;
    const startY = 80;
    const types = [0, 0, 1, 1, 2]; // 0=squid,1=crab,2=octopus

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            aliens.push({
                x: startX + c * (ALIEN_W + ALIEN_PAD_X),
                y: startY + r * (ALIEN_H + ALIEN_PAD_Y),
                type: types[r],
                alive: true,
                frame: 0,
            });
        }
    }
    return aliens;
}

function buildBarriers() {
    const barriers = [];
    const totalW = canvas.width;
    const spacing = totalW / (BARRIER_COLS + 1);
    for (let i = 0; i < BARRIER_COLS; i++) {
        const bx = spacing * (i + 1) - 28;
        const by = canvas.height - 120;
        const blocks = [];
        // Build shield shape (4 rows, 7 cols with notch at bottom)
        const shape = [
            [0,1,1,1,1,1,0],
            [1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1],
            [1,1,0,0,0,1,1],
        ];
        for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col]) {
                    blocks.push({ x: bx + col * 8, y: by + row * 8, hp: 3 });
                }
            }
        }
        barriers.push(blocks);
    }
    return barriers;
}

// ─── Input Handling ───────────────────────────────────────────────────────────
const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space') e.preventDefault();
    if (e.code === 'KeyP') togglePause();
    if ((e.code === 'Enter' || e.code === 'Space') && (state.phase === 'gameover' || state.phase === 'win')) {
        startNewGame();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// Mobile / touch controls
document.getElementById('btnLeft').addEventListener('pointerdown', () => keys['ArrowLeft'] = true);
document.getElementById('btnLeft').addEventListener('pointerup', () => keys['ArrowLeft'] = false);
document.getElementById('btnRight').addEventListener('pointerdown', () => keys['ArrowRight'] = true);
document.getElementById('btnRight').addEventListener('pointerup', () => keys['ArrowRight'] = false);
document.getElementById('btnFire').addEventListener('pointerdown', () => keys['Space'] = true);
document.getElementById('btnFire').addEventListener('pointerup', () => keys['Space'] = false);

function togglePause() {
    if (state.phase === 'playing') state.phase = 'paused';
    else if (state.phase === 'paused') state.phase = 'playing';
}

// ─── Game Logic ───────────────────────────────────────────────────────────────
function update(timestamp) {
    if (state.phase !== 'playing') return;

    state.frameCount++;
    if (state.frameCount % 20 === 0) state.animTick ^= 1;

    // Player movement
    const p = state.player;
    if (keys['ArrowLeft'] || keys['KeyA']) p.x = Math.max(0, p.x - p.speed);
    if (keys['ArrowRight'] || keys['KeyD']) p.x = Math.min(canvas.width - PLAYER_W, p.x + p.speed);

    // Player shoot
    if ((keys['Space'] || keys['ArrowUp']) && timestamp - state.lastBulletTime > state.bulletCooldown) {
        state.bullets.push({ x: p.x + PLAYER_W / 2 - BULLET_W / 2, y: p.y, speed: 8 });
        state.lastBulletTime = timestamp;
        playSound('shoot');
    }

    // Move bullets
    state.bullets = state.bullets.filter(b => {
        b.y -= b.speed;
        return b.y > -BULLET_H;
    });

    // Move bombs
    state.bombs = state.bombs.filter(b => {
        b.y += b.speed;
        b.frame = (b.frame + 1) % 4;
        return b.y < canvas.height;
    });

    // Move aliens
    updateAliens();

    // Alien drops bombs randomly
    if (Math.random() < state.alienBombRate) {
        dropAlienBomb();
    }

    // Collision: bullets vs aliens
    for (let i = state.bullets.length - 1; i >= 0; i--) {
        const bullet = state.bullets[i];
        for (const alien of state.aliens) {
            if (!alien.alive) continue;
            if (rectOverlap(bullet.x, bullet.y, BULLET_W, BULLET_H,
                alien.x, alien.y, ALIEN_W, ALIEN_H)) {
                alien.alive = false;
                state.bullets.splice(i, 1);
                state.score += (2 - alien.type) * 10 + 10;
                addExplosion(alien.x + ALIEN_W / 2, alien.y + ALIEN_H / 2);
                playSound('explode');
                updateScore();
                break;
            }
        }
    }

    // Collision: bullets vs barriers
    for (let i = state.bullets.length - 1; i >= 0; i--) {
        const bullet = state.bullets[i];
        if (damageBarrier(bullet.x, bullet.y, BULLET_W, BULLET_H)) {
            state.bullets.splice(i, 1);
        }
    }

    // Collision: bombs vs player
    for (let i = state.bombs.length - 1; i >= 0; i--) {
        const bomb = state.bombs[i];
        if (rectOverlap(bomb.x, bomb.y, BOMB_W, BOMB_H,
            p.x, p.y, PLAYER_W, PLAYER_H)) {
            state.bombs.splice(i, 1);
            loseLife();
        }
    }

    // Collision: bombs vs barriers
    for (let i = state.bombs.length - 1; i >= 0; i--) {
        const bomb = state.bombs[i];
        if (damageBarrier(bomb.x, bomb.y, BOMB_W, BOMB_H)) {
            state.bombs.splice(i, 1);
        }
    }

    // Aliens reach player level
    for (const alien of state.aliens) {
        if (alien.alive && alien.y + ALIEN_H >= p.y) {
            gameOver();
            return;
        }
    }

    // Check win
    if (state.aliens.every(a => !a.alive)) {
        nextLevel();
        return;
    }

    // Update explosions
    state.explosions = state.explosions.filter(e => {
        e.life--;
        return e.life > 0;
    });
}

function updateAliens() {
    const alive = state.aliens.filter(a => a.alive);
    if (alive.length === 0) return;

    const leftmost = Math.min(...alive.map(a => a.x));
    const rightmost = Math.max(...alive.map(a => a.x + ALIEN_W));
    const speed = state.alienSpeed * (1 + (COLS * ROWS - alive.length) * 0.03);

    let shouldDrop = false;
    if (rightmost + speed > canvas.width - 10 && state.alienDir === 1) {
        state.alienDir = -1;
        shouldDrop = true;
    } else if (leftmost - speed < 10 && state.alienDir === -1) {
        state.alienDir = 1;
        shouldDrop = true;
    }

    for (const alien of state.aliens) {
        if (!alien.alive) continue;
        alien.x += speed * state.alienDir;
        if (shouldDrop) alien.y += 20;
    }
}

function dropAlienBomb() {
    const alive = state.aliens.filter(a => a.alive);
    if (alive.length === 0) return;
    // Pick a random alien from the bottom of each column
    const cols = {};
    for (const alien of alive) {
        const colKey = Math.round(alien.x);
        if (!cols[colKey] || cols[colKey].y < alien.y) cols[colKey] = alien;
    }
    const shooters = Object.values(cols);
    if (shooters.length === 0) return;
    const shooter = shooters[Math.floor(Math.random() * shooters.length)];
    state.bombs.push({
        x: shooter.x + ALIEN_W / 2 - BOMB_W / 2,
        y: shooter.y + ALIEN_H,
        speed: 3 + state.level * 0.3,
        frame: 0
    });
}

function damageBarrier(bx, by, bw, bh) {
    for (const barrier of state.barriers) {
        for (let i = barrier.length - 1; i >= 0; i--) {
            const block = barrier[i];
            if (rectOverlap(bx, by, bw, bh, block.x, block.y, 8, 8)) {
                block.hp--;
                if (block.hp <= 0) barrier.splice(i, 1);
                return true;
            }
        }
    }
    return false;
}

function rectOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function addExplosion(x, y) {
    state.explosions.push({ x, y, life: 18 });
}

function loseLife() {
    state.lives--;
    addExplosion(state.player.x + PLAYER_W / 2, state.player.y + PLAYER_H / 2);
    playSound('die');
    updateLives();
    if (state.lives <= 0) {
        gameOver();
    } else {
        // Brief invincibility reset
        state.player.x = canvas.width / 2 - PLAYER_W / 2;
    }
}

function gameOver() {
    state.phase = 'gameover';
    playSound('gameover');
    submitScore();
}

function nextLevel() {
    state.level++;
    state.phase = 'playing';
    state.bullets = [];
    state.bombs = [];
    state.aliens = buildAliens();
    state.barriers = buildBarriers();
    state.alienDir = 1;
    state.alienSpeed = 0.5 + state.level * 0.15;
    state.alienBombRate = 0.002 + state.level * 0.0005;
    state.player.x = canvas.width / 2 - PLAYER_W / 2;
    updateLevel();
}

function startNewGame() {
    initGame();
    updateScore();
    updateLives();
    updateLevel();
}

// ─── Drawing ──────────────────────────────────────────────────────────────────
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Starfield background
    drawStars();

    if (state.phase === 'paused') {
        drawHUD();
        drawOverlay('PAUSED', '#00ff88', 'Press P to Resume');
        return;
    }

    // Barriers
    for (const barrier of state.barriers) {
        for (const block of barrier) {
            const alpha = block.hp / 3;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#00ff88';
            ctx.fillRect(block.x, block.y, 8, 8);
        }
    }
    ctx.globalAlpha = 1;

    // Aliens
    for (const alien of state.aliens) {
        if (!alien.alive) continue;
        drawAlien(alien);
    }

    // Player
    if (state.phase !== 'gameover') {
        drawPlayer(state.player);
    }

    // Bullets
    for (const b of state.bullets) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#aaffff';
        ctx.shadowBlur = 6;
        ctx.fillRect(b.x, b.y, BULLET_W, BULLET_H);
        ctx.shadowBlur = 0;
    }

    // Bombs
    for (const b of state.bombs) {
        const bombColors = ['#ff4444', '#ff8800', '#ffcc00', '#ff4444'];
        ctx.fillStyle = bombColors[b.frame % bombColors.length];
        ctx.shadowColor = '#ff4444';
        ctx.shadowBlur = 8;
        ctx.fillRect(b.x, b.y, BOMB_W, BOMB_H);
        ctx.shadowBlur = 0;
    }

    // Explosions
    for (const e of state.explosions) {
        const t = e.life / 18;
        ctx.globalAlpha = t;
        ctx.strokeStyle = `hsl(${30 + (1 - t) * 30}, 100%, 60%)`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const len = (1 - t) * 20;
            ctx.beginPath();
            ctx.moveTo(e.x, e.y);
            ctx.lineTo(e.x + Math.cos(angle) * len, e.y + Math.sin(angle) * len);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    // Ground line
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 30);
    ctx.lineTo(canvas.width, canvas.height - 30);
    ctx.stroke();

    // Overlays
    if (state.phase === 'gameover') {
        drawOverlay('GAME OVER', '#ff4444', `Score: ${state.score} | Press ENTER to retry`);
    } else if (state.phase === 'win') {
        drawOverlay('YOU WIN!', '#ffdd00', `Score: ${state.score} | Press ENTER for next wave`);
    }
}

// Pseudo-random but consistent stars
const STARS = Array.from({ length: 80 }, (_, i) => ({
    x: (i * 137.5) % 600,
    y: (i * 97.3) % 500,
    r: Math.random() < 0.2 ? 1.5 : 1,
    alpha: 0.3 + Math.random() * 0.5
}));

function drawStars() {
    ctx.fillStyle = '#ffffff';
    for (const s of STARS) {
        ctx.globalAlpha = s.alpha;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

function drawPlayer(p) {
    ctx.fillStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 10;

    // Body
    ctx.fillRect(p.x + 4, p.y + 10, PLAYER_W - 8, PLAYER_H - 10);
    // Cannon
    ctx.fillRect(p.x + PLAYER_W / 2 - 3, p.y, 6, 14);
    // Wings
    ctx.fillRect(p.x, p.y + 14, 12, 10);
    ctx.fillRect(p.x + PLAYER_W - 12, p.y + 14, 12, 10);

    ctx.shadowBlur = 0;
}

function drawAlien(alien) {
    const f = state.animTick;
    ctx.fillStyle = ['#ff6b6b', '#ffd93d', '#6bcb77'][alien.type];
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 8;

    const x = alien.x;
    const y = alien.y;

    // Pixel art aliens using small rect blocks
    const sprites = [
        // Squid (type 0) - two frames
        [
            [[0,0,1,0,0,0,1,0,0],[0,1,1,1,1,1,1,1,0],[1,1,0,1,1,1,0,1,1],[1,1,1,1,1,1,1,1,1],[0,1,0,1,1,1,0,1,0],[0,0,1,0,0,0,1,0,0]],
            [[1,0,1,0,0,0,1,0,1],[0,1,1,1,1,1,1,1,0],[1,1,0,1,1,1,0,1,1],[1,1,1,1,1,1,1,1,1],[0,1,1,0,0,0,1,1,0],[1,0,0,1,0,1,0,0,1]],
        ],
        // Crab (type 1)
        [
            [[0,1,0,0,0,0,0,1,0],[1,0,1,1,1,1,1,0,1],[1,1,1,1,1,1,1,1,1],[1,1,0,1,1,1,0,1,1],[0,1,1,1,1,1,1,1,0],[0,1,0,0,0,0,0,1,0]],
            [[0,1,0,0,0,0,0,1,0],[0,0,1,1,1,1,1,0,0],[0,1,1,1,1,1,1,1,0],[1,1,0,1,1,1,0,1,1],[1,1,1,1,1,1,1,1,1],[1,0,1,0,0,0,1,0,1]],
        ],
        // Octopus (type 2)
        [
            [[0,0,1,1,1,1,0,0],[0,1,1,1,1,1,1,0],[1,1,1,1,1,1,1,1],[1,1,0,1,1,0,1,1],[1,1,1,1,1,1,1,1],[0,0,1,0,0,1,0,0]],
            [[0,0,1,1,1,1,0,0],[1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1],[0,1,0,1,1,0,1,0],[0,1,1,1,1,1,1,0],[1,0,0,0,0,0,0,1]],
        ]
    ];

    const sprite = sprites[alien.type][f % 2];
    const pw = ALIEN_W / sprite[0].length;
    const ph = ALIEN_H / sprite.length;

    for (let r = 0; r < sprite.length; r++) {
        for (let c = 0; c < sprite[r].length; c++) {
            if (sprite[r][c]) {
                ctx.fillRect(x + c * pw, y + r * ph, pw - 1, ph - 1);
            }
        }
    }

    ctx.shadowBlur = 0;
}

function drawOverlay(title, color, subtitle) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = color;
    ctx.font = 'bold 48px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 20);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#cccccc';
    ctx.font = '16px "Courier New", monospace';
    ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 30);
    ctx.textAlign = 'left';
}

function drawHUD() {
    // No-op: HUD is in HTML
}

// ─── UI Updates ───────────────────────────────────────────────────────────────
function updateScore() {
    document.getElementById('score').textContent = state.score;
}
function updateLives() {
    document.getElementById('lives').textContent = '♥'.repeat(Math.max(0, state.lives));
}
function updateLevel() {
    document.getElementById('level').textContent = state.level;
}

// ─── Sound (Web Audio API) ────────────────────────────────────────────────────
let audioCtx = null;

function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function playSound(type) {
    try {
        const ac = getAudioCtx();
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain);
        gain.connect(ac.destination);

        const sounds = {
            shoot:   { freq: 880, endFreq: 440, dur: 0.08, type: 'square', vol: 0.15 },
            explode: { freq: 150, endFreq: 40,  dur: 0.25, type: 'sawtooth', vol: 0.3 },
            die:     { freq: 400, endFreq: 50,  dur: 0.5,  type: 'sawtooth', vol: 0.4 },
            gameover:{ freq: 220, endFreq: 55,  dur: 1.2,  type: 'sawtooth', vol: 0.4 },
        };

        const s = sounds[type] || sounds.shoot;
        osc.type = s.type;
        osc.frequency.setValueAtTime(s.freq, ac.currentTime);
        osc.frequency.exponentialRampToValueAtTime(s.endFreq, ac.currentTime + s.dur);
        gain.gain.setValueAtTime(s.vol, ac.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + s.dur);
        osc.start(ac.currentTime);
        osc.stop(ac.currentTime + s.dur);
    } catch (e) {}
}

// ─── Score Submission ─────────────────────────────────────────────────────────
async function submitScore() {
    const name = prompt('Enter your name for the leaderboard:', 'Player') || 'Anonymous';
    try {
        await fetch('api/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, score: state.score })
        });
        await loadLeaderboard();
    } catch (e) {
        console.warn('Could not submit score:', e);
    }
}

async function loadLeaderboard() {
    try {
        const res = await fetch('api/scores');
        const data = await res.json();
        const el = document.getElementById('leaderboard');
        if (!el) return;
        el.innerHTML = data.map((s, i) =>
            `<div class="score-row"><span>#${i + 1} ${s.name}</span><span>${s.score}</span></div>`
        ).join('');
    } catch (e) {
        console.warn('Could not load leaderboard:', e);
    }
}

// ─── Game Loop ────────────────────────────────────────────────────────────────
function loop(timestamp) {
    update(timestamp);
    draw();
    requestAnimationFrame(loop);
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
    initGame();
    updateScore();
    updateLives();
    updateLevel();
    loadLeaderboard();
    requestAnimationFrame(loop);
});
