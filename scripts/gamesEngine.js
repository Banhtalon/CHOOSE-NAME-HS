// 60FPS HTML5 Canvas Arcade Engine for 5 Classroom Random Picker Games
import { RACER_PALETTE } from './roster.js';
import { soundFX } from './audio.js';

function cryptoRandom() {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    return arr[0] / 4294967296;
  }
  return Math.random();
}

function shuffleFair(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(cryptoRandom() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function shortName(fullName, maxLen = 16) {
  if (fullName.length <= maxLen) return fullName;
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    const lastTwo = parts.slice(-2).join(' ');
    if (lastTwo.length <= maxLen) return lastTwo;
  }
  return fullName.slice(0, maxLen - 1) + '…';
}

export const GAME_DEFINITIONS = [
  {
    id: 'duck-derby',
    name: 'Đua Vịt Sông Xanh',
    subtitle: 'Đàn vịt vượt sóng, né xoáy nước và bứt tốc về vạch đích cờ caro',
    badge: 'Đua Nước'
  },
  {
    id: 'plinko-drop',
    name: 'Tháp Bi Ziczac',
    subtitle: 'Bi pha lê thả từ đỉnh tháp va chạm chốt đinh tìm đường vào Phễu Vàng',
    badge: 'Vật Lý 2D'
  },
  {
    id: 'kart-sprint',
    name: 'Đua Xe F1 Siêu Tốc',
    subtitle: 'Đường đua F1 kịch tính với hộp vật phẩm Nitro và pha Slow-Motion cán đích',
    badge: 'Tốc Độ Cao'
  },
  {
    id: 'ufo-beam',
    name: 'Đĩa Bay Bắt Cóc',
    subtitle: 'Đĩa bay UFO quét tia sáng nhá hàng hồi hộp trước khi hút người được chọn',
    badge: 'Hồi Hộp'
  },
  {
    id: 'bubble-royale',
    name: 'Bong Bóng Sinh Tồn',
    subtitle: 'Đấu trường bong bóng né cầu gai, người trụ lại cuối cùng giành chiến thắng',
    badge: 'Sinh Tồn'
  }
];

export class ClassroomGamesEngine {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onCommentary = callbacks.onCommentary || (() => {});
    this.onLeaderboard = callbacks.onLeaderboard || (() => {});
    this.onRoundComplete = callbacks.onRoundComplete || (() => {});

    this.currentGameId = 'duck-derby';
    this.students = [];
    this.state = 'idle'; // 'idle' | 'countdown' | 'running' | 'celebrating'
    this.durationSec = 9;
    this.pickCount = 1;

    this.width = 900;
    this.height = 430;
    this.dpr = 1;

    this.entities = [];
    this.hazards = [];
    this.particles = [];
    this.confetti = [];
    this.winners = [];
    this.preselectedWinners = [];

    this.elapsed = 0;
    this.countdownVal = 3;
    this.countdownTimer = 0;
    this.lastFrameTime = performance.now();
    this.cameraX = 0;
    this.commentaryCooldown = 0;

    // UFO specific state
    this.ufo = { x: 400, y: 78, vx: 0, targetIdx: 0, phase: 'patrol', beamAlpha: 0, fakeoutCount: 0 };

    this.handleResize = this.resize.bind(this);
    window.addEventListener('resize', this.handleResize);
    this.resize();
    this.setupIdleScene();
    this.loop(performance.now());
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = Math.max(320, rect.width || 900);
    this.height = Math.max(320, rect.height || 430);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setRoster(students) {
    this.students = students.length
      ? students
      : [{ id: 'demo', name: 'Hãy thêm học sinh', colorIndex: 0, accessory: 0 }];
    if (this.state === 'idle' || this.state === 'celebrating') {
      this.setupIdleScene();
    }
  }

  setGame(gameId) {
    this.currentGameId = gameId;
    this.state = 'idle';
    this.confetti = [];
    this.particles = [];
    this.setupIdleScene();
    const def = GAME_DEFINITIONS.find((g) => g.id === gameId);
    if (def) {
      this.onCommentary(`Sẵn sàng: ${def.name} · Nhấn BẮT ĐẦU ĐUA để chọn học sinh!`);
    }
  }

  setupIdleScene() {
    const list = this.students.slice(0, 40);
    const n = Math.max(1, list.length);
    this.cameraX = 0;
    this.entities = list.map((st, i) => {
      const palette = RACER_PALETTE[st.colorIndex % RACER_PALETTE.length];
      const topPad = 76;
      const bottomPad = 38;
      const usableH = Math.max(160, this.height - topPad - bottomPad);
      const laneY = topPad + ((i + 0.5) / n) * usableH;

      return {
        id: st.id,
        student: st,
        name: shortName(st.name),
        fullName: st.name,
        palette,
        accessory: st.accessory || i % 5,
        x: 90 + (i % 5) * 125,
        y: laneY,
        baseY: laneY,
        vx: 0,
        vy: 0,
        speed: 1,
        progress: 0,
        finished: false,
        finishTime: Infinity,
        eliminated: false,
        eliminatedAt: Infinity,
        boostTimer: 0,
        spinTimer: 0,
        phaseOffset: i * 0.9,
        radius: Math.max(13, Math.min(20, Math.floor(190 / Math.sqrt(n))))
      };
    });

    if (this.currentGameId === 'plinko-drop') {
      this.setupPlinkoArena();
    } else if (this.currentGameId === 'ufo-beam') {
      this.setupUfoArena();
    } else if (this.currentGameId === 'bubble-royale') {
      this.setupBubbleArena();
    } else {
      this.setupTrackHazards();
    }

    this.onLeaderboard(this.entities.slice(0, 5).map((e) => e.fullName));
  }

  setupTrackHazards() {
    this.trackLength = 2400;
    this.hazards = [];
    for (let i = 0; i < 14; i++) {
      this.hazards.push({
        x: 340 + i * 135 + cryptoRandom() * 60,
        y: 84 + cryptoRandom() * (this.height - 130),
        type: i % 2 === 0 ? 'boost' : 'hazard',
        radius: 18,
        phase: i * 0.7
      });
    }
  }

  setupPlinkoArena() {
    this.hazards = [];
    const rows = 6;
    const startY = 115;
    const endY = this.height - 86;
    const rowGap = (endY - startY) / rows;
    const cols = 9;
    const leftPad = 110;
    const rightPad = this.width - 110;
    const colGap = (rightPad - leftPad) / (cols - 1);

    for (let r = 0; r < rows; r++) {
      const offset = r % 2 === 1 ? colGap * 0.5 : 0;
      const count = r % 2 === 1 ? cols - 1 : cols;
      for (let c = 0; c < count; c++) {
        this.hazards.push({
          x: leftPad + offset + c * colGap,
          y: startY + r * rowGap,
          radius: 6,
          isBumper: (r === 2 || r === 4) && c % 3 === 1,
          hitTimer: 0
        });
      }
    }

    this.entities.forEach((e, idx) => {
      e.x = this.width * 0.5 + ((idx % 7) - 3) * 26;
      e.y = 66 + Math.floor(idx / 7) * 14;
      e.vx = (cryptoRandom() - 0.5) * 40;
      e.vy = 0;
      e.radius = 12;
    });
  }

  setupUfoArena() {
    const n = this.entities.length;
    const leftPad = 85;
    const usableW = Math.max(240, this.width - 170);
    this.entities.forEach((e, i) => {
      e.x = leftPad + ((i + 0.5) / Math.max(1, n)) * usableW;
      e.baseX = e.x;
      e.y = this.height - 62 - (i % 2) * 22;
      e.baseY = e.y;
      e.abductProgress = 0;
    });
    this.ufo = {
      x: this.width * 0.5,
      y: 84,
      targetIdx: 0,
      phase: 'patrol',
      beamAlpha: 0.25,
      spotlightWidth: 54
    };
  }

  setupBubbleArena() {
    const cx = this.width * 0.5;
    const cy = this.height * 0.54;
    this.entities.forEach((e, i) => {
      const angle = (i / Math.max(1, this.entities.length)) * Math.PI * 2;
      const dist = 50 + (i % 3) * 42;
      e.x = cx + Math.cos(angle) * dist;
      e.y = cy + Math.sin(angle) * (dist * 0.65);
      const spd = 75 + cryptoRandom() * 45;
      const dir = cryptoRandom() * Math.PI * 2;
      e.vx = Math.cos(dir) * spd;
      e.vy = Math.sin(dir) * spd;
      e.radius = Math.max(16, Math.min(24, Math.floor(170 / Math.sqrt(this.entities.length))));
      e.eliminated = false;
    });

    this.hazards = [
      { x: 140, y: 130, vx: 135, vy: 110, radius: 18, angle: 0 },
      { x: this.width - 140, y: this.height - 90, vx: -145, vy: -105, radius: 18, angle: 1.2 }
    ];
  }

  startRound({ durationSec = 9, pickCount = 1 } = {}) {
    if (!this.students.length) return;
    this.durationSec = Math.max(4, Number(durationSec) || 9);
    this.pickCount = Math.max(1, Math.min(this.students.length, Number(pickCount) || 1));

    this.setupIdleScene();

    // Fairly pre-select the true winner(s) using cryptographic shuffle
    const fairOrder = shuffleFair(this.entities);
    this.preselectedWinners = fairOrder.slice(0, this.pickCount);
    const winnerIds = new Set(this.preselectedWinners.map((w) => w.id));

    // Assign dramatic speed curves / elimination schedules so winners triumph at the climax
    this.entities.forEach((e, idx) => {
      if (this.currentGameId === 'duck-derby' || this.currentGameId === 'kart-sprint') {
        e.x = 76 + (idx % 3) * 16;
      }
      const isWinner = winnerIds.has(e.id);
      const rankAmongWinners = this.preselectedWinners.findIndex((w) => w.id === e.id);
      e.isWinner = isWinner;
      e.winnerRank = isWinner ? rankAmongWinners : 999;
      e.scriptedFinishFactor = isWinner
        ? 1.04 + (this.pickCount - rankAmongWinners) * 0.018
        : 0.78 + cryptoRandom() * 0.21;
      e.surgePhase = 1.5 + cryptoRandom() * 3.5;
    });

    // For Bubble Royale, schedule non-winners to pop across the duration
    if (this.currentGameId === 'bubble-royale') {
      const nonWinners = fairOrder.filter((e) => !winnerIds.has(e.id));
      nonWinners.forEach((e, idx) => {
        const frac = (idx + 0.6) / Math.max(1, nonWinners.length);
        e.scheduledPopTime = 1.0 + frac * (this.durationSec - 1.6);
      });
    }

    // For UFO Beam, build fake-out target sequence ending on the real winner
    if (this.currentGameId === 'ufo-beam') {
      const nonWinners = fairOrder.filter((e) => !winnerIds.has(e.id));
      const fake1 = nonWinners[0] || this.preselectedWinners[0];
      const fake2 = nonWinners[1] || fake1;
      const fake3 = nonWinners[2] || fake2;
      this.ufoSequence = [
        { target: fake1, until: this.durationSec * 0.28, mode: 'sweep' },
        { target: fake2, until: this.durationSec * 0.54, mode: 'fakeout' },
        { target: fake3, until: this.durationSec * 0.76, mode: 'fakeout' },
        { target: this.preselectedWinners[0], until: this.durationSec * 1.05, mode: 'abduct' }
      ];
      this.ufoLastStep = -1;
    }

    this.state = 'countdown';
    this.countdownVal = 3;
    this.countdownTimer = 0;
    this.elapsed = 0;
    this.winners = [];
    this.confetti = [];
    this.particles = [];
    soundFX.playCountdown(3);
    this.onCommentary('Chuẩn bị xuất phát... 3!');
  }

  spawnParticles(x, y, color, count = 12, speed = 120) {
    for (let i = 0; i < count; i++) {
      const a = cryptoRandom() * Math.PI * 2;
      const s = (0.3 + cryptoRandom() * 0.7) * speed;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        color,
        life: 0.45 + cryptoRandom() * 0.35,
        maxLife: 0.8,
        size: 3 + cryptoRandom() * 4
      });
    }
  }

  spawnConfetti() {
    this.confetti = [];
    const colors = ['#FFD60A', '#185ADB', '#D91B42', '#14804A', '#0E7490', '#FFFFFF'];
    for (let i = 0; i < 95; i++) {
      this.confetti.push({
        x: cryptoRandom() * this.width,
        y: -20 - cryptoRandom() * 180,
        vx: (cryptoRandom() - 0.5) * 90,
        vy: 110 + cryptoRandom() * 140,
        rot: cryptoRandom() * Math.PI * 2,
        vrot: (cryptoRandom() - 0.5) * 8,
        w: 7 + cryptoRandom() * 6,
        h: 4 + cryptoRandom() * 4,
        color: colors[i % colors.length]
      });
    }
  }

  finishRound() {
    if (this.state === 'celebrating') return;
    this.state = 'celebrating';
    this.winners = this.preselectedWinners.map((e) => e.student);
    this.spawnConfetti();
    soundFX.playWinFanfare();
    const names = this.winners.map((w) => w.name).join(', ');
    this.onCommentary(`CHÚC MỪNG CHIẾN THẮNG: ${names}!`);
    this.onRoundComplete(this.winners);
  }

  loop(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastFrameTime) / 1000));
    this.lastFrameTime = now;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Update confetti
    for (const c of this.confetti) {
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rot += c.vrot * dt;
      if (c.y > this.height + 20) {
        c.y = -10;
        c.x = cryptoRandom() * this.width;
      }
    }

    if (this.state === 'idle') {
      this.elapsed += dt;
      return;
    }

    if (this.state === 'countdown') {
      this.countdownTimer += dt;
      if (this.countdownTimer >= 0.72) {
        this.countdownTimer = 0;
        this.countdownVal -= 1;
        if (this.countdownVal > 0) {
          soundFX.playCountdown(this.countdownVal);
          this.onCommentary(`Sẵn sàng xuất phát... ${this.countdownVal}!`);
        } else {
          soundFX.playCountdown(0);
          this.state = 'running';
          this.elapsed = 0;
          this.onCommentary('XUẤT PHÁT! Cuộc đua bắt đầu!');
        }
      }
      return;
    }

    if (this.state !== 'running') return;

    this.elapsed += dt;
    this.commentaryCooldown -= dt;

    if (this.currentGameId === 'duck-derby' || this.currentGameId === 'kart-sprint') {
      this.updateRaceGame(dt);
    } else if (this.currentGameId === 'plinko-drop') {
      this.updatePlinkoGame(dt);
    } else if (this.currentGameId === 'ufo-beam') {
      this.updateUfoGame(dt);
    } else if (this.currentGameId === 'bubble-royale') {
      this.updateBubbleGame(dt);
    }
  }

  updateRaceGame(dt) {
    const startX = 90;
    const finishX = this.trackLength - 140;
    const totalDist = finishX - startX;
    const baseSpeed = totalDist / this.durationSec;

    // Slow-mo photo finish for kart-sprint when leader reaches 88%
    let maxProg = 0;
    this.entities.forEach((e) => {
      if (e.progress > maxProg) maxProg = e.progress;
    });
    const slowMo = this.currentGameId === 'kart-sprint' && maxProg > 0.87 && maxProg < 0.995 ? 0.42 : 1;
    const effDt = dt * slowMo;

    const progressFrac = Math.min(1.15, this.elapsed / this.durationSec);

    this.entities.forEach((e) => {
      if (e.finished) return;

      // Rubber-banding + dramatic surges in first 75%, then converge to scripted fair outcome
      const wave = Math.sin(this.elapsed * 3.4 + e.phaseOffset) * 0.28 + Math.cos(this.elapsed * 2.1 + e.surgePhase) * 0.18;
      const earlyMultiplier = 1 + wave;
      const lateWeight = Math.max(0, Math.min(1, (progressFrac - 0.62) / 0.32));
      const targetMult = earlyMultiplier * (1 - lateWeight) + e.scriptedFinishFactor * lateWeight;

      let boostBonus = 1;
      if (e.boostTimer > 0) {
        e.boostTimer -= effDt;
        boostBonus = 1.42;
      } else if (e.spinTimer > 0) {
        e.spinTimer -= effDt;
        boostBonus = 0.55;
      }

      // Guarantee winning duck/kart crosses finish cleanly at durationSec
      if (e.isWinner && progressFrac > 0.78) {
        const remainingDist = Math.max(0, finishX - e.x);
        const remainingTime = Math.max(0.25, this.durationSec - this.elapsed + e.winnerRank * 0.18);
        const neededSpeed = remainingDist / remainingTime;
        e.vx = neededSpeed;
      } else {
        e.vx = baseSpeed * targetMult * boostBonus;
      }

      e.x += e.vx * effDt;
      e.progress = Math.max(0, Math.min(1, (e.x - startX) / totalDist));

      // Check interactions with track hazards/boosts
      for (const h of this.hazards) {
        const dx = e.x - h.x;
        const dy = e.y - h.y;
        if (Math.abs(dx) < 22 && Math.abs(dy) < 20) {
          if (h.type === 'boost' && e.boostTimer <= 0) {
            e.boostTimer = 0.65;
            this.spawnParticles(e.x, e.y, '#FFD60A', 6, 90);
            if (cryptoRandom() < 0.25) soundFX.playBoost();
          } else if (h.type === 'hazard' && !e.isWinner && progressFrac > 0.5 && e.spinTimer <= 0) {
            e.spinTimer = 0.45;
            if (cryptoRandom() < 0.2) soundFX.playWhirlpool();
          }
        }
      }

      if (e.x >= finishX) {
        e.x = finishX;
        e.finished = true;
        e.finishTime = this.elapsed;
      }
    });

    // Sort leaderboard by X position
    const sorted = [...this.entities].sort((a, b) => b.x - a.x);
    const leader = sorted[0];
    this.cameraX = Math.max(0, Math.min(this.trackLength - this.width, leader.x - this.width * 0.58));

    this.onLeaderboard(sorted.slice(0, 5).map((e) => e.fullName));

    if (this.commentaryCooldown <= 0 && leader) {
      this.commentaryCooldown = 1.6;
      if (slowMo < 1) {
        this.onCommentary(`PHOTO FINISH! ${leader.fullName} đang so kè từng centimet trước vạch đích!`);
      } else if (maxProg > 0.72) {
        this.onCommentary(`Nước rút cuối cùng! ${leader.fullName} đang dẫn đầu đoàn đua!`);
        if (this.currentGameId === 'duck-derby') soundFX.playQuack();
        else soundFX.playKartRev();
      } else {
        const second = sorted[1] ? sorted[1].fullName : '';
        this.onCommentary(
          second
            ? `${leader.fullName} đang tạm dẫn đầu, bám sát phía sau là ${second}!`
            : `${leader.fullName} đang bứt phá mạnh mẽ!`
        );
      }
    }

    const finishedWinners = this.preselectedWinners.filter((w) => w.finished);
    if (finishedWinners.length >= this.pickCount || this.elapsed >= this.durationSec + 1.4) {
      this.finishRound();
    }
  }

  updatePlinkoGame(dt) {
    const funnelX = this.width * 0.5;
    const funnelY = this.height - 34;
    const gravity = 280;
    const progressFrac = this.elapsed / this.durationSec;

    this.entities.forEach((e, idx) => {
      if (e.finished) return;

      e.vy += gravity * dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;

      // Side walls
      if (e.x < 70) {
        e.x = 70;
        e.vx = Math.abs(e.vx) * 0.8;
      } else if (e.x > this.width - 70) {
        e.x = this.width - 70;
        e.vx = -Math.abs(e.vx) * 0.8;
      }

      // Peg collisions
      this.hazards.forEach((peg, pIdx) => {
        if (peg.hitTimer > 0) peg.hitTimer = Math.max(0, peg.hitTimer - dt);
        const dx = e.x - peg.x;
        const dy = e.y - peg.y;
        const dist = Math.hypot(dx, dy);
        const minDist = e.radius + peg.radius;
        if (dist < minDist && dist > 0.001) {
          const nx = dx / dist;
          const ny = dy / dist;
          e.x = peg.x + nx * minDist;
          e.y = peg.y + ny * minDist;
          const bounce = peg.isBumper ? 195 : 125;
          e.vx = nx * bounce + (cryptoRandom() - 0.5) * 55;
          e.vy = -Math.abs(ny * bounce * 0.68);
          peg.hitTimer = 0.2;
          if (cryptoRandom() < 0.18) soundFX.playPegPing(pIdx + idx);
        }
      });

      // Guide winner toward center Championship Funnel in final 28%
      if (e.isWinner && progressFrac > 0.72) {
        const pull = (funnelX - e.x) * 3.8;
        e.vx += pull * dt;
        e.vy = Math.max(e.vy, 135);
      } else if (!e.isWinner && e.y > funnelY - 38 && Math.abs(e.x - funnelX) < 58 && progressFrac > 0.65) {
        // Deflect non-winners slightly away from Championship Funnel so only winners enter it
        e.vx += (e.x < funnelX ? -180 : 180) * dt;
      }

      // Bottom boundary: if winner enters funnel at climax, finish! Otherwise warp back to top
      if (e.y >= funnelY) {
        if (e.isWinner && progressFrac >= 0.82 && Math.abs(e.x - funnelX) < 54) {
          e.x = funnelX;
          e.y = funnelY;
          e.finished = true;
          this.spawnParticles(funnelX, funnelY, '#FFD60A', 22, 160);
        } else {
          // Teleport back to top drop chute for another cascade
          e.y = 54;
          e.x = this.width * 0.5 + (cryptoRandom() - 0.5) * 160;
          e.vy = 20;
        }
      }
    });

    const sorted = [...this.entities].sort((a, b) => b.y - a.y);
    this.onLeaderboard(sorted.slice(0, 5).map((e) => e.fullName));

    if (this.commentaryCooldown <= 0 && sorted[0]) {
      this.commentaryCooldown = 1.6;
      this.onCommentary(`Bi của ${sorted[0].fullName} đang áp sát Phễu Vàng Vô Địch!`);
    }

    const finishedWinners = this.preselectedWinners.filter((w) => w.finished);
    if (finishedWinners.length >= this.pickCount || this.elapsed >= this.durationSec + 0.6) {
      this.finishRound();
    }
  }

  updateUfoGame(dt) {
    const seqIdx = this.ufoSequence.findIndex((s) => this.elapsed <= s.until);
    const step = this.ufoSequence[seqIdx !== -1 ? seqIdx : this.ufoSequence.length - 1];

    if (seqIdx !== this.ufoLastStep) {
      this.ufoLastStep = seqIdx;
      if (step.mode === 'sweep') {
        soundFX.playUfoSweep();
        this.onCommentary(`Đĩa bay UFO đang quét radar trên bầu trời...`);
      } else if (step.mode === 'fakeout') {
        soundFX.playUfoSweep();
        this.onCommentary(`UFO đang khóa tia sáng vào ${step.target.fullName}... Phải người này không?!`);
      } else if (step.mode === 'abduct') {
        soundFX.playUfoBeam();
        this.onCommentary(`KÍCH HOẠT TIA TRACTOR BEAM! Đĩa bay đã chọn ${step.target.fullName}!`);
      }
    }

    const targetX = step.target ? step.target.x : this.width * 0.5;
    this.ufo.x += (targetX - this.ufo.x) * Math.min(1, dt * 5.2);

    // Astronauts hop nervously on the ground
    this.entities.forEach((e, i) => {
      if (step.mode === 'abduct' && e.id === step.target.id && Math.abs(this.ufo.x - e.x) < 28) {
        e.y += (this.ufo.y + 24 - e.y) * dt * 3.8;
        this.ufo.beamAlpha = 0.85;
      } else {
        e.y = e.baseY - Math.abs(Math.sin(this.elapsed * 5 + i)) * 8;
      }
    });

    if (this.elapsed >= this.durationSec) {
      this.finishRound();
    }
  }

  updateBubbleGame(dt) {
    const left = 54;
    const right = this.width - 54;
    const top = 68;
    const bottom = this.height - 34;

    // Move spiky hazards
    this.hazards.forEach((h) => {
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.angle += dt * 4.5;
      if (h.x < left + h.radius || h.x > right - h.radius) h.vx *= -1;
      if (h.y < top + h.radius || h.y > bottom - h.radius) h.vy *= -1;
    });

    // Move bubbles and pop scheduled non-winners
    this.entities.forEach((e) => {
      if (e.eliminated) return;

      e.x += e.vx * dt;
      e.y += e.vy * dt;

      if (e.x < left + e.radius) {
        e.x = left + e.radius;
        e.vx = Math.abs(e.vx);
      } else if (e.x > right - e.radius) {
        e.x = right - e.radius;
        e.vx = -Math.abs(e.vx);
      }
      if (e.y < top + e.radius) {
        e.y = top + e.radius;
        e.vy = Math.abs(e.vy);
      } else if (e.y > bottom - e.radius) {
        e.y = bottom - e.radius;
        e.vy = -Math.abs(e.vy);
      }

      if (!e.isWinner && this.elapsed >= e.scheduledPopTime) {
        e.eliminated = true;
        this.spawnParticles(e.x, e.y, e.palette.fill, 14, 150);
        soundFX.playBubblePop();
        this.onCommentary(`BỤP! Bong bóng của ${e.fullName} vừa nổ! Còn ${this.entities.filter((x) => !x.eliminated).length} bạn trụ lại!`);
      }
    });

    const survivors = this.entities.filter((e) => !e.eliminated);
    this.onLeaderboard(survivors.slice(0, 5).map((e) => e.fullName));

    if (survivors.length <= this.pickCount || this.elapsed >= this.durationSec) {
      this.finishRound();
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    if (this.currentGameId === 'duck-derby') {
      this.renderDuckDerby(ctx);
    } else if (this.currentGameId === 'plinko-drop') {
      this.renderPlinkoDrop(ctx);
    } else if (this.currentGameId === 'kart-sprint') {
      this.renderKartSprint(ctx);
    } else if (this.currentGameId === 'ufo-beam') {
      this.renderUfoBeam(ctx);
    } else if (this.currentGameId === 'bubble-royale') {
      this.renderBubbleRoyale(ctx);
    }

    // Particles
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Confetti
    for (const c of this.confetti) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.w * 0.5, -c.h * 0.5, c.w, c.h);
      ctx.restore();
    }

    // Countdown Overlay
    if (this.state === 'countdown') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
      ctx.fillRect(0, 0, this.width, this.height);

      ctx.fillStyle = '#FFD60A';
      ctx.beginPath();
      ctx.arc(this.width * 0.5, this.height * 0.5, 58, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#0F172A';
      ctx.stroke();

      ctx.fillStyle = '#0F172A';
      ctx.font = '700 54px "Baloo 2", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(this.countdownVal), this.width * 0.5, this.height * 0.5 + 3);
    }
  }

  renderNameTag(ctx, x, y, text, palette, isLeader = false) {
    ctx.font = '600 12px "Be Vietnam Pro", sans-serif';
    const padX = 7;
    const textW = ctx.measureText(text).width;
    const boxW = textW + padX * 2;
    const boxH = 20;
    const bx = x - boxW * 0.5;
    const by = y - boxH;

    ctx.fillStyle = isLeader ? '#FFD60A' : '#0F172A';
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 5);
    ctx.fill();

    ctx.strokeStyle = isLeader ? '#0F172A' : palette.fill;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = isLeader ? '#0F172A' : '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, by + boxH * 0.5 + 0.5);
  }

  renderDuckDerby(ctx) {
    // River background
    ctx.fillStyle = '#0A6699';
    ctx.fillRect(0, 0, this.width, this.height);

    // River banks
    ctx.fillStyle = '#14804A';
    ctx.fillRect(0, 0, this.width, 56);
    ctx.fillRect(0, this.height - 26, this.width, 26);
    ctx.fillStyle = '#D9B36C';
    ctx.fillRect(0, 52, this.width, 8);
    ctx.fillRect(0, this.height - 32, this.width, 8);

    // Animated water wave lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 2;
    const waveOffset = (this.cameraX * 0.6 + this.elapsed * 55) % 90;
    for (let y = 82; y < this.height - 40; y += 44) {
      for (let x = -waveOffset; x < this.width + 60; x += 90) {
        ctx.beginPath();
        ctx.arc(x, y, 16, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
      }
    }

    // Hazards & Boosts in River
    const finishX = (this.trackLength || 2400) - 140;
    for (const h of this.hazards) {
      const sx = h.x - this.cameraX;
      if (sx < -40 || sx > this.width + 40) continue;
      if (h.type === 'boost') {
        ctx.fillStyle = '#FFD60A';
        ctx.beginPath();
        ctx.moveTo(sx + 12, h.y);
        ctx.lineTo(sx - 10, h.y - 10);
        ctx.lineTo(sx - 4, h.y);
        ctx.lineTo(sx - 10, h.y + 10);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.strokeStyle = '#7CE8FF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, h.y, 12, this.elapsed * 4, this.elapsed * 4 + Math.PI * 1.4);
        ctx.stroke();
      }
    }

    // Checkered Finish Line
    const finishScreenX = finishX - this.cameraX;
    if (finishScreenX > -40 && finishScreenX < this.width + 60) {
      const sq = 12;
      for (let y = 60; y < this.height - 32; y += sq) {
        const row = Math.floor((y - 60) / sq);
        ctx.fillStyle = row % 2 === 0 ? '#FFFFFF' : '#0F172A';
        ctx.fillRect(finishScreenX, y, sq, sq);
        ctx.fillStyle = row % 2 === 0 ? '#0F172A' : '#FFFFFF';
        ctx.fillRect(finishScreenX + sq, y, sq, sq);
      }
    }

    // Find current leader
    let leaderId = null;
    let maxX = -1;
    this.entities.forEach((e) => {
      if (e.x > maxX) {
        maxX = e.x;
        leaderId = e.id;
      }
    });

    // Draw Ducks
    this.entities.forEach((e) => {
      const sx = e.x - this.cameraX;
      if (sx < -60 || sx > this.width + 60) return;
      const bob = Math.sin(this.elapsed * 6 + e.phaseOffset) * 3;
      const dy = e.y + bob;

      ctx.save();
      ctx.translate(sx, dy);
      if (e.spinTimer > 0) {
        ctx.rotate(this.elapsed * 12);
      }

      // Turbo flame
      if (e.boostTimer > 0) {
        ctx.fillStyle = '#00F5D4';
        ctx.beginPath();
        ctx.moveTo(-14, 2);
        ctx.lineTo(-28 - (this.elapsed * 40 % 8), -5);
        ctx.lineTo(-28 - (this.elapsed * 40 % 8), 8);
        ctx.closePath();
        ctx.fill();
      }

      // Duck body
      ctx.fillStyle = e.palette.fill;
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 3, 15, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Duck head
      ctx.beginPath();
      ctx.arc(10, -6, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Beak
      ctx.fillStyle = '#FF7B00';
      ctx.beginPath();
      ctx.moveTo(17, -8);
      ctx.lineTo(25, -5);
      ctx.lineTo(17, -2);
      ctx.closePath();
      ctx.fill();

      // Eye
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(12, -8, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Cute Crown on Leader
      if (e.id === leaderId && this.state === 'running') {
        ctx.fillStyle = '#FFD60A';
        ctx.beginPath();
        ctx.moveTo(4, -14);
        ctx.lineTo(6, -21);
        ctx.lineTo(10, -16);
        ctx.lineTo(14, -21);
        ctx.lineTo(16, -14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
      this.renderNameTag(ctx, sx, dy - 18, e.name, e.palette, e.id === leaderId && this.state === 'running');
    });
  }

  renderPlinkoDrop(ctx) {
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, this.width, this.height);

    // Side chute borders
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.strokeRect(58, 52, this.width - 116, this.height - 64);

    // Championship Golden Funnel at bottom center
    const funnelX = this.width * 0.5;
    const funnelY = this.height - 34;
    ctx.fillStyle = '#FFD60A';
    ctx.beginPath();
    ctx.roundRect(funnelX - 58, funnelY - 12, 116, 26, 8);
    ctx.fill();
    ctx.fillStyle = '#0F172A';
    ctx.font = '700 12px "Be Vietnam Pro", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PHỄU VÔ ĐỊCH', funnelX, funnelY + 1);

    // Draw Pegs
    for (const peg of this.hazards) {
      ctx.fillStyle = peg.hitTimer > 0 ? '#FFD60A' : peg.isBumper ? '#D91B42' : '#7CE8FF';
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, peg.isBumper ? 10 : peg.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Student Marbles
    this.entities.forEach((e) => {
      ctx.fillStyle = e.palette.fill;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      this.renderNameTag(ctx, e.x, e.y - e.radius - 4, e.name, e.palette, e.finished);
    });
  }

  renderKartSprint(ctx) {
    // Asphalt Track
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 0, this.width, this.height);

    // Red & White Rumble Strips
    const stripeW = 28;
    const offset = Math.floor(this.cameraX) % (stripeW * 2);
    for (let x = -offset - stripeW * 2; x < this.width + stripeW * 2; x += stripeW) {
      const isRed = Math.floor((x + offset) / stripeW) % 2 === 0;
      ctx.fillStyle = isRed ? '#D91B42' : '#FFFFFF';
      ctx.fillRect(x, 54, stripeW, 12);
      ctx.fillRect(x, this.height - 26, stripeW, 12);
    }

    // Lane dividers
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;
    for (let y = 115; y < this.height - 40; y += 64) {
      for (let x = -(this.cameraX % 60); x < this.width; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 32, y);
        ctx.stroke();
      }
    }

    // Mystery Boost Pads on Track
    for (const h of this.hazards) {
      const sx = h.x - this.cameraX;
      if (sx < -40 || sx > this.width + 40) continue;
      ctx.fillStyle = h.type === 'boost' ? '#14804A' : '#D9822B';
      ctx.fillRect(sx - 10, h.y - 10, 20, 20);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(sx - 10, h.y - 10, 20, 20);
    }

    // Finish line
    const finishX = (this.trackLength || 2400) - 140;
    const finishScreenX = finishX - this.cameraX;
    if (finishScreenX > -40 && finishScreenX < this.width + 60) {
      const sq = 12;
      for (let y = 66; y < this.height - 26; y += sq) {
        const r = Math.floor((y - 66) / sq);
        ctx.fillStyle = r % 2 === 0 ? '#FFFFFF' : '#0F172A';
        ctx.fillRect(finishScreenX, y, sq, sq);
        ctx.fillStyle = r % 2 === 0 ? '#0F172A' : '#FFFFFF';
        ctx.fillRect(finishScreenX + sq, y, sq, sq);
      }
    }

    let leaderId = null;
    let maxX = -1;
    this.entities.forEach((e) => {
      if (e.x > maxX) {
        maxX = e.x;
        leaderId = e.id;
      }
    });

    // Draw F1 Karts
    this.entities.forEach((e) => {
      const sx = e.x - this.cameraX;
      if (sx < -60 || sx > this.width + 60) return;

      ctx.save();
      ctx.translate(sx, e.y);

      // Nitro exhaust
      if (e.boostTimer > 0) {
        ctx.fillStyle = '#FFD60A';
        ctx.beginPath();
        ctx.moveTo(-18, -3);
        ctx.lineTo(-34, 0);
        ctx.lineTo(-18, 4);
        ctx.closePath();
        ctx.fill();
      }

      // Wheels
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(-13, -10, 8, 4);
      ctx.fillRect(7, -10, 8, 4);
      ctx.fillRect(-13, 6, 8, 4);
      ctx.fillRect(7, 6, 8, 4);

      // Car chassis
      ctx.fillStyle = e.palette.fill;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-16, -7, 34, 14, 4);
      ctx.fill();
      ctx.stroke();

      // Driver helmet
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      this.renderNameTag(ctx, sx, e.y - 14, e.name, e.palette, e.id === leaderId && this.state === 'running');
    });
  }

  renderUfoBeam(ctx) {
    // Deep Space Backdrop
    ctx.fillStyle = '#0B132B';
    ctx.fillRect(0, 0, this.width, this.height);

    // Stars
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 36; i++) {
      const sx = (i * 97) % this.width;
      const sy = 56 + ((i * 53) % (this.height - 140));
      ctx.fillRect(sx, sy, 2, 2);
    }

    // Alien Planet Surface
    ctx.fillStyle = '#1C2541';
    ctx.fillRect(0, this.height - 54, this.width, 54);
    ctx.fillStyle = '#3A506B';
    ctx.fillRect(0, this.height - 58, this.width, 6);

    // Tractor Beam Cone
    const ufoX = this.ufo.x;
    const ufoY = this.ufo.y;
    ctx.fillStyle = 'rgba(124, 232, 255, 0.24)';
    ctx.beginPath();
    ctx.moveTo(ufoX - 18, ufoY + 10);
    ctx.lineTo(ufoX - 64, this.height - 46);
    ctx.lineTo(ufoX + 64, this.height - 46);
    ctx.lineTo(ufoX + 18, ufoY + 10);
    ctx.closePath();
    ctx.fill();

    // Astronaut Students
    this.entities.forEach((e) => {
      const isTargeted = Math.abs(ufoX - e.x) < 32;
      ctx.save();
      ctx.translate(e.x, e.y);

      // Suit body
      ctx.fillStyle = e.palette.fill;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-9, -6, 18, 20, 6);
      ctx.fill();
      ctx.stroke();

      // Helmet
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, -12, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(0, -12, 5.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      this.renderNameTag(ctx, e.x, e.y - 26, e.name, e.palette, isTargeted);
    });

    // UFO Saucer
    ctx.save();
    ctx.translate(ufoX, ufoY);
    ctx.fillStyle = '#7CE8FF';
    ctx.beginPath();
    ctx.arc(0, -6, 22, Math.PI, 0);
    ctx.fill();

    ctx.fillStyle = '#CBD5E1';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 2, 46, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Saucer lights
    const lights = [-28, -14, 0, 14, 28];
    lights.forEach((lx, idx) => {
      ctx.fillStyle = idx % 2 === 0 ? '#FFD60A' : '#D91B42';
      ctx.beginPath();
      ctx.arc(lx, 2, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  renderBubbleRoyale(ctx) {
    ctx.fillStyle = '#0B192C';
    ctx.fillRect(0, 0, this.width, this.height);

    // Arena boundary ring
    ctx.strokeStyle = '#1E3E62';
    ctx.lineWidth = 3;
    ctx.strokeRect(50, 64, this.width - 100, this.height - 92);

    // Spiky Obstacles
    for (const h of this.hazards) {
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.rotate(h.angle);
      ctx.fillStyle = '#D91B42';
      ctx.strokeStyle = '#FFD60A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const spikes = 8;
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? h.radius + 5 : h.radius - 5;
        const a = (i / (spikes * 2)) * Math.PI * 2;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Student Bubbles
    const survivors = this.entities.filter((e) => !e.eliminated);
    survivors.forEach((e) => {
      const isLast = survivors.length <= this.pickCount && this.state !== 'idle';
      ctx.save();
      ctx.translate(e.x, e.y);

      ctx.fillStyle = e.palette.fill;
      ctx.strokeStyle = isLast ? '#FFD60A' : '#FFFFFF';
      ctx.lineWidth = isLast ? 4 : 2;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Bubble shine dot
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.beginPath();
      ctx.arc(-e.radius * 0.35, -e.radius * 0.35, e.radius * 0.22, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      this.renderNameTag(ctx, e.x, e.y - e.radius - 4, e.name, e.palette, isLast);
    });
  }
}
