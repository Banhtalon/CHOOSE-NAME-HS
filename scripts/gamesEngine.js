// 60FPS HTML5 Canvas Arcade Engine for 5 Classroom Ordered Picker Games
import { RACER_PALETTE } from './roster.js';
import { soundFX } from './audio.js';
import {
  drawDetailedDuck,
  drawChibiMarbleOrb,
  drawDetailedKart,
  drawChibiAstronaut
} from './sprites.js';

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

function shortName(fullName, maxLen = 18) {
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
    subtitle: 'Vịt đua vượt sóng, ăn tia chớp tăng tốc để xếp thứ tự lên kiểm tra bài',
    badge: 'Đua Nước'
  },
  {
    id: 'plinko-drop',
    name: 'Tháp Bi Thú Cưng',
    subtitle: 'Viên bi thú cưng rơi qua ma trận chốt đinh vào Phễu Vàng chọn thứ tự kiểm tra',
    badge: 'Vật Lý 2D'
  },
  {
    id: 'kart-sprint',
    name: 'Siêu Xe F1 Đua Hạng',
    subtitle: 'Đường đua F1 kịch tính với hộp Nitro và pha Slow-Motion phân định thứ tự về đích',
    badge: 'Tốc Độ Cao'
  },
  {
    id: 'ufo-beam',
    name: 'Đĩa Bay Gọi Tên',
    subtitle: 'Đĩa bay UFO quét tia sáng nhá hàng hồi hộp trước khi hút lần lượt người lên bảng',
    badge: 'Hồi Hộp'
  },
  {
    id: 'bubble-royale',
    name: 'Đấu Trường Bong Bóng',
    subtitle: 'Bong bóng thú cưng né cầu gai, những người trụ lại cuối cùng được xếp thứ tự lên bảng',
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
    this.startingOrderOffset = 0;

    this.width = 1000;
    this.height = 580;
    this.dpr = 1;

    this.entities = [];
    this.hazards = [];
    this.particles = [];
    this.confetti = [];
    this.winners = [];
    this.preselectedWinners = [];
    this.finishedOrderList = [];

    this.elapsed = 0;
    this.countdownVal = 3;
    this.countdownTimer = 0;
    this.lastFrameTime = performance.now();
    this.cameraX = 0;
    this.commentaryCooldown = 0;

    this.ufo = { x: 400, y: 92, vx: 0, targetIdx: 0, phase: 'patrol', beamAlpha: 0 };

    this.handleResize = this.resize.bind(this);
    window.addEventListener('resize', this.handleResize);
    this.resize();
    this.setupIdleScene();
    this.loop(performance.now());
  }

  resize() {
    const parent = this.canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = Math.max(320, rect.width || 960);
    this.height = Math.max(380, rect.height || 580);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setRoster(students, currentQueueLength = 0) {
    this.startingOrderOffset = currentQueueLength;
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
      this.onCommentary(`Sẵn sàng: ${def.name} · Nhấn QUAY CHỌN THỨ TỰ để bắt đầu!`);
    }
  }

  setupIdleScene() {
    const list = this.students.slice(0, 40);
    const n = Math.max(1, list.length);
    this.cameraX = 0;
    this.finishedOrderList = [];

    const topPad = 86;
    const bottomPad = 64;
    const usableH = Math.max(220, this.height - topPad - bottomPad);

    // Spread characters cleanly across columns in idle mode so every character is large & unobstructed
    const cols = Math.min(5, Math.max(2, Math.ceil(n / 4)));
    const colSpan = Math.min(185, Math.max(120, (this.width - 220) / cols));

    this.entities = list.map((st, i) => {
      const palette = RACER_PALETTE[st.colorIndex % RACER_PALETTE.length];
      const laneY = topPad + ((i + 0.5) / n) * usableH;
      const col = i % cols;

      return {
        id: st.id,
        student: st,
        name: shortName(st.name),
        fullName: st.name,
        palette,
        accessory: st.accessory !== undefined ? st.accessory : i % 5,
        x: 110 + col * colSpan,
        y: laneY,
        baseY: laneY,
        vx: 0,
        vy: 0,
        speed: 1,
        progress: 0,
        finished: false,
        finishRank: 0,
        finishTime: Infinity,
        eliminated: false,
        boostTimer: 0,
        spinTimer: 0,
        phaseOffset: i * 1.1,
        radius: Math.max(17, Math.min(24, Math.floor(210 / Math.sqrt(n))))
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

    this.onLeaderboard(this.entities.slice(0, 4).map((e) => e.fullName));
  }

  setupTrackHazards() {
    this.trackLength = 2700;
    this.hazards = [];
    for (let i = 0; i < 16; i++) {
      this.hazards.push({
        x: 360 + i * 140 + cryptoRandom() * 55,
        y: 95 + cryptoRandom() * (this.height - 165),
        type: i % 2 === 0 ? 'boost' : 'hazard',
        radius: 22,
        phase: i * 0.7
      });
    }
  }

  setupPlinkoArena() {
    this.hazards = [];
    const rows = 6;
    const startY = 135;
    const endY = this.height - 105;
    const rowGap = (endY - startY) / rows;
    const cols = 9;
    const leftPad = 120;
    const rightPad = this.width - 120;
    const colGap = (rightPad - leftPad) / (cols - 1);

    for (let r = 0; r < rows; r++) {
      const offset = r % 2 === 1 ? colGap * 0.5 : 0;
      const count = r % 2 === 1 ? cols - 1 : cols;
      for (let c = 0; c < count; c++) {
        this.hazards.push({
          x: leftPad + offset + c * colGap,
          y: startY + r * rowGap,
          radius: 7,
          isBumper: (r === 2 || r === 4) && c % 3 === 1,
          hitTimer: 0
        });
      }
    }

    this.entities.forEach((e, idx) => {
      e.x = this.width * 0.5 + ((idx % 7) - 3) * 44;
      e.y = 76 + Math.floor(idx / 7) * 24;
      e.vx = (cryptoRandom() - 0.5) * 45;
      e.vy = 0;
      e.radius = 17;
    });
  }

  setupUfoArena() {
    const n = this.entities.length;
    const leftPad = 95;
    const usableW = Math.max(260, this.width - 190);
    this.entities.forEach((e, i) => {
      e.x = leftPad + ((i + 0.5) / Math.max(1, n)) * usableW;
      e.baseX = e.x;
      e.y = this.height - 86 - (i % 2) * 32;
      e.baseY = e.y;
    });
    this.ufo = {
      x: this.width * 0.5,
      y: 96,
      targetIdx: 0,
      phase: 'patrol',
      beamAlpha: 0.3
    };
  }

  setupBubbleArena() {
    const cx = this.width * 0.5;
    const cy = this.height * 0.52;
    this.entities.forEach((e, i) => {
      const angle = (i / Math.max(1, this.entities.length)) * Math.PI * 2;
      const dist = 65 + (i % 3) * 58;
      e.x = cx + Math.cos(angle) * dist;
      e.y = cy + Math.sin(angle) * (dist * 0.65);
      const spd = 85 + cryptoRandom() * 50;
      const dir = cryptoRandom() * Math.PI * 2;
      e.vx = Math.cos(dir) * spd;
      e.vy = Math.sin(dir) * spd;
      e.radius = Math.max(20, Math.min(26, Math.floor(195 / Math.sqrt(this.entities.length))));
      e.eliminated = false;
    });

    this.hazards = [
      { x: 160, y: 150, vx: 155, vy: 125, radius: 22, angle: 0 },
      { x: this.width - 160, y: this.height - 120, vx: -165, vy: -120, radius: 22, angle: 1.2 }
    ];
  }

  startRound({ durationSec = 9, pickCount = 1, currentQueueLength = 0 } = {}) {
    if (!this.students.length) return;
    this.startingOrderOffset = currentQueueLength;
    this.durationSec = Math.max(4, Number(durationSec) || 9);
    this.pickCount = Math.max(1, Math.min(this.students.length, Number(pickCount) || 1));

    this.setupIdleScene();

    // Fairly pre-select the true ordered winner(s) using cryptographic shuffle
    const fairOrder = shuffleFair(this.entities);
    this.preselectedWinners = fairOrder.slice(0, this.pickCount);
    const winnerIds = new Set(this.preselectedWinners.map((w) => w.id));

    // Stagger finish times slightly for #1, #2, #3 so they cross the finish line in distinct order!
    this.entities.forEach((e, idx) => {
      if (this.currentGameId === 'duck-derby' || this.currentGameId === 'kart-sprint') {
        e.x = 88 + (idx % 3) * 20;
      }
      const isWinner = winnerIds.has(e.id);
      const rankAmongWinners = this.preselectedWinners.findIndex((w) => w.id === e.id);
      e.isWinner = isWinner;
      e.winnerRank = isWinner ? rankAmongWinners : 999;
      e.scriptedFinishFactor = isWinner
        ? 1.08 - rankAmongWinners * 0.025
        : 0.72 + cryptoRandom() * 0.2;
      e.surgePhase = 1.4 + cryptoRandom() * 3.5;
    });

    if (this.currentGameId === 'bubble-royale') {
      const nonWinners = fairOrder.filter((e) => !winnerIds.has(e.id));
      nonWinners.forEach((e, idx) => {
        const frac = (idx + 0.5) / Math.max(1, nonWinners.length);
        e.scheduledPopTime = 0.9 + frac * (this.durationSec - 1.5);
      });
    }

    if (this.currentGameId === 'ufo-beam') {
      const nonWinners = fairOrder.filter((e) => !winnerIds.has(e.id));
      const fake1 = nonWinners[0] || this.preselectedWinners[0];
      const fake2 = nonWinners[1] || fake1;
      this.ufoSequence = [];
      this.ufoSequence.push({ target: fake1, until: this.durationSec * 0.25, mode: 'sweep' });
      this.ufoSequence.push({ target: fake2, until: this.durationSec * 0.48, mode: 'fakeout' });

      const remainFrac = 0.52 / Math.max(1, this.preselectedWinners.length);
      this.preselectedWinners.forEach((w, idx) => {
        this.ufoSequence.push({
          target: w,
          until: this.durationSec * (0.48 + (idx + 1) * remainFrac),
          mode: 'abduct',
          orderIndex: idx + 1
        });
      });
      this.ufoLastStep = -1;
    }

    this.state = 'countdown';
    this.countdownVal = 3;
    this.countdownTimer = 0;
    this.elapsed = 0;
    this.winners = [];
    this.finishedOrderList = [];
    this.confetti = [];
    this.particles = [];
    soundFX.playCountdown(3);
    this.onCommentary('Chuẩn bị chọn thứ tự lên kiểm tra... 3!');
  }

  recordEntityFinished(entity) {
    if (entity.finished) return;
    entity.finished = true;
    entity.finishTime = this.elapsed;
    this.finishedOrderList.push(entity);
    entity.finishRank = this.startingOrderOffset + this.finishedOrderList.length;
    this.spawnParticles(entity.x, entity.y, '#FFD60A', 16, 140);
    soundFX.playBoost();
    this.onCommentary(
      `THỨ TỰ #${entity.finishRank}: ${entity.fullName} đã được chọn lên kiểm tra!`
    );
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
        size: 3.5 + cryptoRandom() * 4
      });
    }
  }

  spawnConfetti() {
    this.confetti = [];
    const colors = ['#FFD60A', '#185ADB', '#D91B42', '#14804A', '#0E7490', '#FFFFFF'];
    for (let i = 0; i < 110; i++) {
      this.confetti.push({
        x: cryptoRandom() * this.width,
        y: -20 - cryptoRandom() * 180,
        vx: (cryptoRandom() - 0.5) * 95,
        vy: 120 + cryptoRandom() * 150,
        rot: cryptoRandom() * Math.PI * 2,
        vrot: (cryptoRandom() - 0.5) * 8,
        w: 8 + cryptoRandom() * 6,
        h: 4 + cryptoRandom() * 4,
        color: colors[i % colors.length]
      });
    }
  }

  finishRound() {
    if (this.state === 'celebrating') return;
    this.state = 'celebrating';

    // Ensure all preselected winners have their finishRank assigned in order
    this.preselectedWinners.forEach((w) => {
      if (!w.finished) {
        this.recordEntityFinished(w);
      }
    });

    this.winners = this.preselectedWinners.map((e) => e.student);
    this.spawnConfetti();
    soundFX.playWinFanfare();
    const summary = this.preselectedWinners
      .map((e, i) => `Số ${this.startingOrderOffset + i + 1}: ${e.fullName}`)
      .join(' · ');
    this.onCommentary(`HOÀN TẤT CHỌN THỨ TỰ: ${summary}!`);
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
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

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
          this.onCommentary('XUẤT PHÁT! Đang tìm người lên bảng theo thứ tự!');
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
    const startX = 88;
    const finishX = this.trackLength - 160;
    const totalDist = finishX - startX;
    const baseSpeed = totalDist / this.durationSec;

    let maxProg = 0;
    this.entities.forEach((e) => {
      if (e.progress > maxProg) maxProg = e.progress;
    });
    const slowMo =
      this.currentGameId === 'kart-sprint' && maxProg > 0.86 && this.finishedOrderList.length === 0
        ? 0.45
        : 1;
    const effDt = dt * slowMo;
    const progressFrac = Math.min(1.25, this.elapsed / this.durationSec);

    this.entities.forEach((e) => {
      if (e.finished) return;

      const wave =
        Math.sin(this.elapsed * 3.4 + e.phaseOffset) * 0.28 +
        Math.cos(this.elapsed * 2.1 + e.surgePhase) * 0.18;
      const earlyMultiplier = 1 + wave;
      const lateWeight = Math.max(0, Math.min(1, (progressFrac - 0.58) / 0.34));
      const targetMult = earlyMultiplier * (1 - lateWeight) + e.scriptedFinishFactor * lateWeight;

      let boostBonus = 1;
      if (e.boostTimer > 0) {
        e.boostTimer -= effDt;
        boostBonus = 1.4;
      } else if (e.spinTimer > 0) {
        e.spinTimer -= effDt;
        boostBonus = 0.58;
      }

      if (e.isWinner && progressFrac > 0.72) {
        const targetFinishTime = this.durationSec + e.winnerRank * 0.38;
        const remainingDist = Math.max(0, finishX - e.x);
        const remainingTime = Math.max(0.2, targetFinishTime - this.elapsed);
        e.vx = remainingDist / remainingTime;
      } else {
        e.vx = baseSpeed * targetMult * boostBonus;
      }

      e.x += e.vx * effDt;
      e.progress = Math.max(0, Math.min(1, (e.x - startX) / totalDist));

      for (const h of this.hazards) {
        const dx = e.x - h.x;
        const dy = e.y - h.y;
        if (Math.abs(dx) < 26 && Math.abs(dy) < 22) {
          if (h.type === 'boost' && e.boostTimer <= 0) {
            e.boostTimer = 0.65;
            this.spawnParticles(e.x, e.y, '#FFD60A', 6, 95);
            if (cryptoRandom() < 0.25) soundFX.playBoost();
          } else if (h.type === 'hazard' && !e.isWinner && progressFrac > 0.5 && e.spinTimer <= 0) {
            e.spinTimer = 0.45;
            if (cryptoRandom() < 0.2) soundFX.playWhirlpool();
          }
        }
      }

      if (e.x >= finishX && e.isWinner) {
        // Ensure winners finish in exact rank order (0, then 1, then 2...)
        const expectedRankIdx = this.finishedOrderList.length;
        if (e.winnerRank === expectedRankIdx) {
          e.x = finishX + 12;
          this.recordEntityFinished(e);
        } else {
          e.x = finishX - 6 - (e.winnerRank - expectedRankIdx) * 14;
        }
      } else if (e.x >= finishX - 18 && !e.isWinner) {
        e.x = finishX - 18;
      }
    });

    const sorted = [...this.entities].sort((a, b) => b.x - a.x);
    const activeLeader = this.entities.find((e) => !e.finished && e.isWinner) || sorted[0];
    if (activeLeader) {
      this.cameraX = Math.max(
        0,
        Math.min(this.trackLength - this.width, activeLeader.x - this.width * 0.56)
      );
    }

    this.onLeaderboard(sorted.slice(0, 4).map((e) => e.fullName));

    if (this.commentaryCooldown <= 0 && sorted[0] && this.finishedOrderList.length === 0) {
      this.commentaryCooldown = 1.6;
      if (maxProg > 0.72) {
        this.onCommentary(`Nước rút về đích! ${sorted[0].fullName} đang dẫn đầu đoàn đua!`);
        if (this.currentGameId === 'duck-derby') soundFX.playQuack();
        else soundFX.playKartRev();
      } else {
        const second = sorted[1] ? sorted[1].fullName : '';
        this.onCommentary(
          second
            ? `${sorted[0].fullName} đang tạm dẫn đầu, bám sát là ${second}!`
            : `${sorted[0].fullName} đang bứt tốc!`
        );
      }
    }

    if (
      this.finishedOrderList.length >= this.pickCount ||
      this.elapsed >= this.durationSec + this.pickCount * 0.45 + 1.2
    ) {
      this.finishRound();
    }
  }

  updatePlinkoGame(dt) {
    const funnelX = this.width * 0.5;
    const funnelY = this.height - 46;
    const gravity = 290;
    const progressFrac = this.elapsed / this.durationSec;

    this.entities.forEach((e, idx) => {
      if (e.finished) return;

      e.vy += gravity * dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;

      if (e.x < 85) {
        e.x = 85;
        e.vx = Math.abs(e.vx) * 0.8;
      } else if (e.x > this.width - 85) {
        e.x = this.width - 85;
        e.vx = -Math.abs(e.vx) * 0.8;
      }

      this.hazards.forEach((peg, pIdx) => {
        if (peg.hitTimer > 0) peg.hitTimer = Math.max(0, peg.hitTimer - dt);
        const dx = e.x - peg.x;
        const dy = e.y - peg.y;
        const dist = Math.hypot(dx, dy);
        const minDist = e.radius + (peg.isBumper ? 12 : peg.radius);
        if (dist < minDist && dist > 0.001) {
          const nx = dx / dist;
          const ny = dy / dist;
          e.x = peg.x + nx * minDist;
          e.y = peg.y + ny * minDist;
          const bounce = peg.isBumper ? 205 : 130;
          e.vx = nx * bounce + (cryptoRandom() - 0.5) * 60;
          e.vy = -Math.abs(ny * bounce * 0.68);
          peg.hitTimer = 0.22;
          if (cryptoRandom() < 0.18) soundFX.playPegPing(pIdx + idx);
        }
      });

      const expectedRankIdx = this.finishedOrderList.length;
      if (e.isWinner && e.winnerRank === expectedRankIdx && progressFrac > 0.68) {
        const pull = (funnelX - e.x) * 4.2;
        e.vx += pull * dt;
        e.vy = Math.max(e.vy, 145);
      } else if (e.y > funnelY - 45 && Math.abs(e.x - funnelX) < 70) {
        e.vx += (e.x < funnelX ? -190 : 190) * dt;
      }

      if (e.y >= funnelY) {
        if (
          e.isWinner &&
          e.winnerRank === expectedRankIdx &&
          progressFrac >= 0.75 &&
          Math.abs(e.x - funnelX) < 64
        ) {
          e.x = funnelX;
          e.y = funnelY;
          this.recordEntityFinished(e);
        } else {
          e.y = 58;
          e.x = this.width * 0.5 + (cryptoRandom() - 0.5) * 220;
          e.vy = 25;
        }
      }
    });

    const sorted = [...this.entities].sort((a, b) => b.y - a.y);
    this.onLeaderboard(sorted.slice(0, 4).map((e) => e.fullName));

    if (
      this.finishedOrderList.length >= this.pickCount ||
      this.elapsed >= this.durationSec + this.pickCount * 0.5 + 0.8
    ) {
      this.finishRound();
    }
  }

  updateUfoGame(dt) {
    const seqIdx = this.ufoSequence.findIndex((s) => this.elapsed <= s.until);
    const step = this.ufoSequence[seqIdx !== -1 ? seqIdx : this.ufoSequence.length - 1];

    if (seqIdx !== this.ufoLastStep && step) {
      this.ufoLastStep = seqIdx;
      if (step.mode === 'sweep') {
        soundFX.playUfoSweep();
        this.onCommentary('Đĩa bay UFO đang quét radar tìm học sinh lên bảng...');
      } else if (step.mode === 'fakeout') {
        soundFX.playUfoSweep();
        this.onCommentary(`UFO chiếu sáng ${step.target.fullName}... Liệu có phải người số 1?!`);
      } else if (step.mode === 'abduct' && step.target) {
        soundFX.playUfoBeam();
        this.recordEntityFinished(step.target);
      }
    }

    const targetX = step && step.target ? step.target.x : this.width * 0.5;
    this.ufo.x += (targetX - this.ufo.x) * Math.min(1, dt * 5.8);

    this.entities.forEach((e, i) => {
      if (e.finished) {
        e.y += (this.ufo.y + 26 - e.y) * dt * 4.5;
      } else {
        e.y = e.baseY - Math.abs(Math.sin(this.elapsed * 5 + i)) * 9;
      }
    });

    if (this.elapsed >= this.durationSec + 0.3) {
      this.finishRound();
    }
  }

  updateBubbleGame(dt) {
    const left = 65;
    const right = this.width - 65;
    const top = 78;
    const bottom = this.height - 54;

    this.hazards.forEach((h) => {
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.angle += dt * 4.5;
      if (h.x < left + h.radius || h.x > right - h.radius) h.vx *= -1;
      if (h.y < top + h.radius || h.y > bottom - h.radius) h.vy *= -1;
    });

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
        this.spawnParticles(e.x, e.y, e.palette.fill, 15, 160);
        soundFX.playBubblePop();
        const remain = this.entities.filter((x) => !x.eliminated).length;
        this.onCommentary(`BỤP! Bong bóng của ${e.fullName} vừa nổ! Còn ${remain} bạn trụ lại!`);
      }
    });

    const survivors = this.entities.filter((e) => !e.eliminated);
    this.onLeaderboard(survivors.slice(0, 4).map((e) => e.fullName));

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

    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const c of this.confetti) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.w * 0.5, -c.h * 0.5, c.w, c.h);
      ctx.restore();
    }

    // Live Ordered Exam Podium Strip inside Canvas when students finish
    if (this.finishedOrderList.length > 0) {
      this.renderCanvasOrderRibbon(ctx);
    }

    // Countdown Overlay
    if (this.state === 'countdown') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.58)';
      ctx.fillRect(0, 0, this.width, this.height);

      ctx.fillStyle = '#FFD60A';
      ctx.beginPath();
      ctx.arc(this.width * 0.5, this.height * 0.5, 68, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = '#0F172A';
      ctx.stroke();

      ctx.fillStyle = '#0F172A';
      ctx.font = '700 62px "Baloo 2", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(this.countdownVal), this.width * 0.5, this.height * 0.5 + 4);
    }
  }

  // Draws Name Tag cleanly BELOW the character so hats & faces are 100% visible!
  renderNameTag(ctx, x, y, text, palette, isLeader = false, finishRank = 0) {
    const label = finishRank > 0 ? `#${finishRank} ${text}` : text;
    ctx.font = '700 13px "Be Vietnam Pro", sans-serif';
    const padX = 9;
    const textW = ctx.measureText(label).width;
    const boxW = textW + padX * 2;
    const boxH = 22;
    const bx = x - boxW * 0.5;
    const by = y;

    ctx.fillStyle = finishRank > 0 ? '#FFD60A' : isLeader ? '#FEF3C7' : 'rgba(15, 23, 42, 0.92)';
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 6);
    ctx.fill();

    ctx.strokeStyle = finishRank > 0 || isLeader ? '#0F172A' : palette.fill;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.fillStyle = finishRank > 0 || isLeader ? '#0F172A' : '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, by + boxH * 0.5 + 0.5);
  }

  renderCanvasOrderRibbon(ctx) {
    const pad = 12;
    const y = this.height - 46;
    let curX = 14;

    this.finishedOrderList.slice(0, 5).forEach((ent) => {
      const text = `THỨ TỰ #${ent.finishRank}: ${ent.fullName}`;
      ctx.font = '700 13px "Be Vietnam Pro", sans-serif';
      const w = ctx.measureText(text).width + 24;

      ctx.fillStyle = '#FFD60A';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(curX, y, w, 32, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0F172A';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, curX + pad, y + 16.5);

      curX += w + 8;
    });
  }

  renderDuckDerby(ctx) {
    // Rich cerulean water
    ctx.fillStyle = '#0A6E9E';
    ctx.fillRect(0, 0, this.width, this.height);

    // Lush green riverbanks with wooden dock posts
    ctx.fillStyle = '#14804A';
    ctx.fillRect(0, 0, this.width, 62);
    ctx.fillRect(0, this.height - 32, this.width, 32);
    ctx.fillStyle = '#D9B36C';
    ctx.fillRect(0, 56, this.width, 9);
    ctx.fillRect(0, this.height - 38, this.width, 8);

    // Water ripples
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
    ctx.lineWidth = 2.2;
    const waveOffset = (this.cameraX * 0.6 + this.elapsed * 55) % 100;
    for (let y = 92; y < this.height - 50; y += 52) {
      for (let x = -waveOffset; x < this.width + 60; x += 100) {
        ctx.beginPath();
        ctx.arc(x, y, 18, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
      }
    }

    // River Boost Arrows & Whirlpools
    const finishX = (this.trackLength || 2700) - 160;
    for (const h of this.hazards) {
      const sx = h.x - this.cameraX;
      if (sx < -50 || sx > this.width + 50) continue;
      if (h.type === 'boost') {
        ctx.fillStyle = '#FFD60A';
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(sx + 16, h.y);
        ctx.lineTo(sx - 12, h.y - 12);
        ctx.lineTo(sx - 5, h.y);
        ctx.lineTo(sx - 12, h.y + 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#7CE8FF';
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.arc(sx, h.y, 16, this.elapsed * 4.5, this.elapsed * 4.5 + Math.PI * 1.45);
        ctx.stroke();
      }
    }

    // Finish Line Banner
    const finishScreenX = finishX - this.cameraX;
    if (finishScreenX > -40 && finishScreenX < this.width + 60) {
      const sq = 14;
      for (let y = 65; y < this.height - 38; y += sq) {
        const row = Math.floor((y - 65) / sq);
        ctx.fillStyle = row % 2 === 0 ? '#FFFFFF' : '#0F172A';
        ctx.fillRect(finishScreenX, y, sq, sq);
        ctx.fillStyle = row % 2 === 0 ? '#0F172A' : '#FFFFFF';
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

    // Sort by Y so lower ducks overlap naturally in 2.5D depth
    const byDepth = [...this.entities].sort((a, b) => a.y - b.y);
    byDepth.forEach((e) => {
      const sx = e.x - this.cameraX;
      if (sx < -80 || sx > this.width + 80) return;
      const bob = Math.sin(this.elapsed * 5.5 + e.phaseOffset) * 3.5;
      const dy = e.y + bob;
      const isLead = e.id === leaderId && this.state === 'running';

      drawDetailedDuck(ctx, sx, dy, {
        palette: e.palette,
        accessory: e.accessory,
        time: this.elapsed + e.phaseOffset,
        isBoosting: e.boostTimer > 0,
        isSpinning: e.spinTimer > 0,
        isLeader: isLead,
        finishRank: e.finishRank,
        scale: 1.38
      });

      this.renderNameTag(ctx, sx, dy + 20, e.name, e.palette, isLead, e.finishRank);
    });
  }

  renderPlinkoDrop(ctx) {
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.strokeRect(64, 58, this.width - 128, this.height - 76);

    const funnelX = this.width * 0.5;
    const funnelY = this.height - 44;
    ctx.fillStyle = '#FFD60A';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(funnelX - 75, funnelY - 15, 150, 32, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0F172A';
    ctx.font = '700 13px "Be Vietnam Pro", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PHỄU CHỌN THỨ TỰ', funnelX, funnelY + 1);

    for (const peg of this.hazards) {
      ctx.fillStyle = peg.hitTimer > 0 ? '#FFD60A' : peg.isBumper ? '#D91B42' : '#7CE8FF';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, peg.isBumper ? 13 : peg.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    this.entities.forEach((e) => {
      drawChibiMarbleOrb(ctx, e.x, e.y, e.radius, {
        palette: e.palette,
        accessory: e.accessory,
        isWinner: e.finished
      });
      this.renderNameTag(ctx, e.x, e.y + e.radius + 4, e.name, e.palette, false, e.finishRank);
    });
  }

  renderKartSprint(ctx) {
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 0, this.width, this.height);

    // Rumble curbs
    const stripeW = 32;
    const offset = Math.floor(this.cameraX) % (stripeW * 2);
    for (let x = -offset - stripeW * 2; x < this.width + stripeW * 2; x += stripeW) {
      const isRed = Math.floor((x + offset) / stripeW) % 2 === 0;
      ctx.fillStyle = isRed ? '#D91B42' : '#FFFFFF';
      ctx.fillRect(x, 58, stripeW, 14);
      ctx.fillRect(x, this.height - 34, stripeW, 14);
    }

    // Track lane lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.26)';
    ctx.lineWidth = 2.5;
    for (let y = 124; y < this.height - 50; y += 72) {
      for (let x = -(this.cameraX % 70); x < this.width; x += 70) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 36, y);
        ctx.stroke();
      }
    }

    // Mystery Nitro Pads
    for (const h of this.hazards) {
      const sx = h.x - this.cameraX;
      if (sx < -50 || sx > this.width + 50) continue;
      ctx.fillStyle = h.type === 'boost' ? '#14804A' : '#C98A14';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(sx - 13, h.y - 13, 26, 26, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 13px "Baloo 2", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(h.type === 'boost' ? 'N' : '?', sx, h.y + 1);
    }

    const finishX = (this.trackLength || 2700) - 160;
    const finishScreenX = finishX - this.cameraX;
    if (finishScreenX > -40 && finishScreenX < this.width + 60) {
      const sq = 14;
      for (let y = 72; y < this.height - 34; y += sq) {
        const r = Math.floor((y - 72) / sq);
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

    const byDepth = [...this.entities].sort((a, b) => a.y - b.y);
    byDepth.forEach((e) => {
      const sx = e.x - this.cameraX;
      if (sx < -80 || sx > this.width + 80) return;
      const isLead = e.id === leaderId && this.state === 'running';

      drawDetailedKart(ctx, sx, e.y, {
        palette: e.palette,
        time: this.elapsed + e.phaseOffset,
        isBoosting: e.boostTimer > 0,
        isLeader: isLead,
        scale: 1.38
      });

      this.renderNameTag(ctx, sx, e.y + 17, e.name, e.palette, isLead, e.finishRank);
    });
  }

  renderUfoBeam(ctx) {
    ctx.fillStyle = '#0B132B';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 45; i++) {
      const sx = (i * 113) % this.width;
      const sy = 58 + ((i * 61) % (this.height - 150));
      ctx.fillRect(sx, sy, i % 3 === 0 ? 3 : 2, i % 3 === 0 ? 3 : 2);
    }

    // Alien Planet Surface with Craters
    ctx.fillStyle = '#1C2541';
    ctx.fillRect(0, this.height - 74, this.width, 74);
    ctx.fillStyle = '#3A506B';
    ctx.fillRect(0, this.height - 78, this.width, 7);

    const ufoX = this.ufo.x;
    const ufoY = this.ufo.y;

    // Holographic Tractor Beam Cone + Energy Rings
    ctx.fillStyle = 'rgba(124, 232, 255, 0.24)';
    ctx.beginPath();
    ctx.moveTo(ufoX - 24, ufoY + 12);
    ctx.lineTo(ufoX - 82, this.height - 62);
    ctx.lineTo(ufoX + 82, this.height - 62);
    ctx.lineTo(ufoX + 24, ufoY + 12);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(124, 232, 255, 0.65)';
    ctx.lineWidth = 2;
    for (let r = 0; r < 3; r++) {
      const ry = this.height - 90 - (((this.elapsed * 90 + r * 95) % 260));
      if (ry > ufoY + 20) {
        const rw = 26 + ((ry - ufoY) / (this.height - ufoY)) * 48;
        ctx.beginPath();
        ctx.ellipse(ufoX, ry, rw, 7, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Chibi Astronauts
    this.entities.forEach((e) => {
      const isTargeted = Math.abs(ufoX - e.x) < 38;
      drawChibiAstronaut(ctx, e.x, e.y, {
        palette: e.palette,
        time: this.elapsed + e.phaseOffset,
        isTargeted,
        scale: 1.32
      });
      this.renderNameTag(ctx, e.x, e.y + 18, e.name, e.palette, isTargeted, e.finishRank);
    });

    // Detailed Mother-Ship UFO with Alien Pilot inside Dome
    ctx.save();
    ctx.translate(ufoX, ufoY);

    // Glass Dome
    ctx.fillStyle = '#7CE8FF';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, -6, 30, Math.PI, 0);
    ctx.fill();
    ctx.stroke();

    // Cute Green Alien Pilot inside dome
    ctx.fillStyle = '#14804A';
    ctx.beginPath();
    ctx.arc(0, -14, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.ellipse(-4, -15, 2.5, 3.5, -0.2, 0, Math.PI * 2);
    ctx.ellipse(4, -15, 2.5, 3.5, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Metallic Saucer Hull
    ctx.fillStyle = '#E2E8F0';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 4, 62, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Glowing Rim Lights
    const lights = [-42, -21, 0, 21, 42];
    lights.forEach((lx, idx) => {
      ctx.fillStyle = (idx + Math.floor(this.elapsed * 6)) % 2 === 0 ? '#FFD60A' : '#D91B42';
      ctx.beginPath();
      ctx.arc(lx, 4, 4.8, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  renderBubbleRoyale(ctx) {
    ctx.fillStyle = '#0B192C';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.strokeStyle = '#1E3E62';
    ctx.lineWidth = 3.5;
    ctx.strokeRect(58, 70, this.width - 116, this.height - 110);

    // Spiky Boss Mines
    for (const h of this.hazards) {
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.rotate(h.angle);
      ctx.fillStyle = '#D91B42';
      ctx.strokeStyle = '#FFD60A';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      const spikes = 10;
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? h.radius + 7 : h.radius - 5;
        const a = (i / (spikes * 2)) * Math.PI * 2;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FFD60A';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Cute Chibi Pets Floating Inside Translucent Bubbles
    const survivors = this.entities.filter((e) => !e.eliminated);
    survivors.forEach((e) => {
      const isLast = survivors.length <= this.pickCount && this.state !== 'idle';

      // Draw Chibi Pet inside the bubble
      drawChibiMarbleOrb(ctx, e.x, e.y, e.radius * 0.72, {
        palette: e.palette,
        accessory: e.accessory,
        isWinner: isLast
      });

      // Outer Translucent Soap/Energy Bubble Ring
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.fillStyle = 'rgba(124, 232, 255, 0.16)';
      ctx.strokeStyle = isLast ? '#FFD60A' : '#7CE8FF';
      ctx.lineWidth = isLast ? 4 : 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Bubble Specular Highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.beginPath();
      ctx.ellipse(-e.radius * 0.38, -e.radius * 0.38, e.radius * 0.25, e.radius * 0.13, -0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      this.renderNameTag(ctx, e.x, e.y + e.radius + 5, e.name, e.palette, isLast, e.finishRank);
    });
  }
}
