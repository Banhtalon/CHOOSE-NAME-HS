// High-Detail 2D Vector Character & Prop Sprite Renderer for Classroom Arcade
// Code-drawn custom vector illustrations (no external image assets required)

export function drawDetailedDuck(ctx, x, y, opts = {}) {
  const {
    palette = { fill: '#FFD60A', stroke: '#8A6D00' },
    accessory = 0,
    time = 0,
    isBoosting = false,
    isSpinning = false,
    isLeader = false,
    finishRank = 0,
    scale = 1.35
  } = opts;

  ctx.save();
  ctx.translate(x, y);
  if (isSpinning) {
    ctx.rotate(time * 10);
  } else {
    const tilt = isBoosting ? -0.14 : Math.sin(time * 5.5) * 0.05;
    ctx.rotate(tilt);
  }
  ctx.scale(scale, scale);

  // 1. Water Foam Wake & Splash
  ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
  const wakeWave = Math.sin(time * 12) * 2.5;
  ctx.beginPath();
  ctx.ellipse(-18, 11 + wakeWave * 0.3, 9, 3.5, 0, 0, Math.PI * 2);
  ctx.ellipse(-28, 9 - wakeWave * 0.3, 6, 2.5, 0, 0, Math.PI * 2);
  ctx.ellipse(12, 12, 7, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Turbo Flame Jet when boosting
  if (isBoosting) {
    const flameLen = 22 + Math.sin(time * 35) * 7;
    ctx.fillStyle = '#00F5D4';
    ctx.beginPath();
    ctx.moveTo(-16, 4);
    ctx.lineTo(-16 - flameLen, -5);
    ctx.lineTo(-16 - flameLen * 0.7, 3);
    ctx.lineTo(-16 - flameLen * 1.1, 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFD60A';
    ctx.beginPath();
    ctx.moveTo(-15, 4);
    ctx.lineTo(-15 - flameLen * 0.6, 0);
    ctx.lineTo(-15 - flameLen * 0.65, 8);
    ctx.closePath();
    ctx.fill();
  }

  // 3. Paddling Webbed Foot under water line
  const footAngle = Math.sin(time * (isBoosting ? 22 : 11)) * 0.45;
  ctx.save();
  ctx.translate(-4, 11);
  ctx.rotate(footAngle);
  ctx.fillStyle = '#FF7B00';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-8, 6);
  ctx.lineTo(-2, 7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 4. Sculpted Duck Body with Tail Feathers
  ctx.fillStyle = palette.fill;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-19, -2); // Perky tail tip
  ctx.quadraticCurveTo(-22, 6, -14, 11);
  ctx.quadraticCurveTo(0, 15, 14, 10);
  ctx.quadraticCurveTo(20, 5, 15, -2);
  ctx.quadraticCurveTo(4, -5, -8, -1);
  ctx.quadraticCurveTo(-14, -4, -19, -2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Glossy chest highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
  ctx.beginPath();
  ctx.ellipse(6, 5, 7, 3.5, -0.25, 0, Math.PI * 2);
  ctx.fill();

  // 5. Animated Flapping Wing
  const wingFlap = isBoosting ? Math.sin(time * 28) * 0.38 : Math.sin(time * 7) * 0.08;
  ctx.save();
  ctx.translate(-2, 3);
  ctx.rotate(wingFlap);
  ctx.fillStyle = palette.fill;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1.9;
  ctx.beginPath();
  ctx.moveTo(6, -2);
  ctx.quadraticCurveTo(-8, -5, -12, 2);
  ctx.quadraticCurveTo(-7, 8, 4, 6);
  ctx.quadraticCurveTo(9, 3, 6, -2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 6. Cute Round Duck Head
  ctx.fillStyle = palette.fill;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(10, -8, 10.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Forehead shine
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.beginPath();
  ctx.ellipse(7, -14, 4.5, 2, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // 7. Sculpted 3D Orange Duck Bill
  ctx.fillStyle = '#FF8800';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1.8;
  // Upper bill
  ctx.beginPath();
  ctx.moveTo(18, -11);
  ctx.quadraticCurveTo(28, -11, 29, -6.5);
  ctx.quadraticCurveTo(23, -4.5, 18, -6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Lower bill (opens when boosting)
  if (isBoosting) {
    ctx.fillStyle = '#D91B42';
    ctx.beginPath();
    ctx.arc(21, -5.5, 3, 0, Math.PI);
    ctx.fill();
  }
  ctx.fillStyle = '#FF6D00';
  ctx.beginPath();
  ctx.moveTo(18, -6);
  ctx.quadraticCurveTo(25, -4, 26, -2.5);
  ctx.quadraticCurveTo(20, -2, 17, -4.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 8. Expressive Kawaii Eye + Rosy Cheek
  ctx.fillStyle = '#FF6B8B';
  ctx.beginPath();
  ctx.ellipse(10, -4.5, 3.2, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(13.5, -9, 3.1, 0, Math.PI * 2);
  ctx.fill();

  // Eye catchlights
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(14.4, -10.1, 1.2, 0, Math.PI * 2);
  ctx.arc(12.6, -8.1, 0.65, 0, Math.PI * 2);
  ctx.fill();

  // Determined eyebrow when boosting or leading
  if (isBoosting || isLeader) {
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, -13.5);
    ctx.lineTo(16.5, -11.5);
    ctx.stroke();
  }

  // 9. Accessories / Hats
  if (isLeader || finishRank === 1) {
    // Golden Championship Crown
    ctx.fillStyle = '#FFD60A';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(3, -16);
    ctx.lineTo(4, -25);
    ctx.lineTo(8.5, -20);
    ctx.lineTo(11, -26);
    ctx.lineTo(13.5, -20);
    ctx.lineTo(18, -25);
    ctx.lineTo(17, -16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#D91B42';
    ctx.beginPath();
    ctx.arc(10.5, -19, 1.6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const hatType = accessory % 5;
    if (hatType === 0) {
      // Red Ninja Headband with fluttering tails
      ctx.fillStyle = '#D91B42';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.4;
      ctx.fillRect(1, -15, 17, 3.5);
      ctx.strokeRect(1, -15, 17, 3.5);
      const wave = Math.sin(time * 15) * 3;
      ctx.beginPath();
      ctx.moveTo(1, -14);
      ctx.quadraticCurveTo(-7, -17 + wave, -12, -13 + wave);
      ctx.lineTo(-10, -10 + wave);
      ctx.closePath();
      ctx.fill();
    } else if (hatType === 1) {
      // Cool Pixel Sunglasses
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(9, -11.5, 9, 4.5);
      ctx.fillStyle = '#7CE8FF';
      ctx.fillRect(10.5, -10.5, 3, 2);
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(3, -10);
      ctx.lineTo(9, -10);
      ctx.stroke();
    } else if (hatType === 2) {
      // Spinning Propeller Beanie
      ctx.fillStyle = '#185ADB';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(9.5, -15.5, 6.5, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFD60A';
      const propW = Math.cos(time * 20) * 8;
      ctx.fillRect(9.5 - Math.abs(propW), -23, Math.abs(propW) * 2, 2.5);
      ctx.fillRect(8.5, -22, 2, 4);
    } else if (hatType === 3) {
      // Cute White Sailor Cap
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(3, -21, 13, 6, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#185ADB';
      ctx.fillRect(3, -17, 13, 2.2);
    } else {
      // Cute Sprout Leaf on Head
      ctx.strokeStyle = '#14804A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(9, -17);
      ctx.quadraticCurveTo(9, -24, 13, -25);
      ctx.stroke();
      ctx.fillStyle = '#14804A';
      ctx.beginPath();
      ctx.ellipse(14, -25, 4, 2.2, -0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

export function drawChibiMarbleOrb(ctx, x, y, radius, opts = {}) {
  const { palette = { fill: '#185ADB' }, accessory = 0, isWinner = false } = opts;
  ctx.save();
  ctx.translate(x, y);

  // Cute Animal Ears on top of Gacha Orb
  const earType = accessory % 3;
  ctx.fillStyle = palette.fill;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2;
  if (earType === 0) {
    // Cat ears
    ctx.beginPath();
    ctx.moveTo(-radius * 0.75, -radius * 0.45);
    ctx.lineTo(-radius * 0.9, -radius * 1.25);
    ctx.lineTo(-radius * 0.2, -radius * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(radius * 0.75, -radius * 0.45);
    ctx.lineTo(radius * 0.9, -radius * 1.25);
    ctx.lineTo(radius * 0.2, -radius * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (earType === 1) {
    // Bear round ears
    ctx.beginPath();
    ctx.arc(-radius * 0.7, -radius * 0.75, radius * 0.36, 0, Math.PI * 2);
    ctx.arc(radius * 0.7, -radius * 0.75, radius * 0.36, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    // Bunny long ears
    ctx.beginPath();
    ctx.ellipse(-radius * 0.42, -radius * 1.1, radius * 0.24, radius * 0.55, -0.15, 0, Math.PI * 2);
    ctx.ellipse(radius * 0.42, -radius * 1.1, radius * 0.24, radius * 0.55, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Main Orb Body
  ctx.fillStyle = palette.fill;
  ctx.strokeStyle = isWinner ? '#FFD60A' : '#FFFFFF';
  ctx.lineWidth = isWinner ? 3.5 : 2.2;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Inner Kawaii Face
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(-radius * 0.32, -1, 2.3, 0, Math.PI * 2);
  ctx.arc(radius * 0.32, -1, 2.3, 0, Math.PI * 2);
  ctx.fill();

  // White eye sparkles
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(-radius * 0.32 + 0.7, -1.8, 0.9, 0, Math.PI * 2);
  ctx.arc(radius * 0.32 + 0.7, -1.8, 0.9, 0, Math.PI * 2);
  ctx.fill();

  // Cute smile
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, 1.5, 3, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  // Glass Capsule Shine
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.beginPath();
  ctx.ellipse(-radius * 0.35, -radius * 0.42, radius * 0.32, radius * 0.16, -0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawDetailedKart(ctx, x, y, opts = {}) {
  const {
    palette = { fill: '#D91B42' },
    time = 0,
    isBoosting = false,
    isLeader = false,
    scale = 1.35
  } = opts;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // 1. Nitro Exhaust Flame
  if (isBoosting) {
    const fl = 18 + Math.sin(time * 40) * 6;
    ctx.fillStyle = '#00F5D4';
    ctx.beginPath();
    ctx.moveTo(-20, -2);
    ctx.lineTo(-20 - fl, -7);
    ctx.lineTo(-20 - fl * 0.75, 0);
    ctx.lineTo(-20 - fl, 7);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFD60A';
    ctx.beginPath();
    ctx.moveTo(-20, -1);
    ctx.lineTo(-20 - fl * 0.55, -4);
    ctx.lineTo(-20 - fl * 0.55, 4);
    ctx.closePath();
    ctx.fill();
  }

  // 2. Fluttering Driver Scarf
  ctx.fillStyle = '#FFD60A';
  const scarfWave = Math.sin(time * 20) * 3;
  ctx.beginPath();
  ctx.moveTo(-4, -9);
  ctx.quadraticCurveTo(-14, -13 + scarfWave, -21, -9 + scarfWave);
  ctx.lineTo(-19, -5 + scarfWave);
  ctx.closePath();
  ctx.fill();

  // 3. Rear Spoiler Wing
  ctx.fillStyle = '#0F172A';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-18, -2);
  ctx.lineTo(-23, -12);
  ctx.lineTo(-16, -12);
  ctx.lineTo(-14, -2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 4. Kart Chassis Body
  ctx.fillStyle = palette.fill;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-19, 6);
  ctx.lineTo(22, 6);
  ctx.quadraticCurveTo(26, 2, 21, -2);
  ctx.lineTo(8, -4);
  ctx.lineTo(-15, -4);
  ctx.quadraticCurveTo(-20, 0, -19, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Racing stripe
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(-12, 0, 28, 2.5);

  // 5. Chibi Driver Helmet & Visor
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(1, -8, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Tinted Visor
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.roundRect(2, -11, 6.5, 4.5, 2);
  ctx.fill();
  ctx.fillStyle = '#7CE8FF';
  ctx.fillRect(3.5, -10, 3, 1.5);

  // Crown on Leader
  if (isLeader) {
    ctx.fillStyle = '#FFD60A';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-4, -15);
    ctx.lineTo(-3, -22);
    ctx.lineTo(1, -18);
    ctx.lineTo(5, -22);
    ctx.lineTo(6, -15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // 6. Front & Rear Racing Wheels with Alloy Rims
  const wheelPositions = [-12, 13];
  wheelPositions.forEach((wx) => {
    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(wx, 6.5, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFD60A';
    ctx.beginPath();
    ctx.arc(wx, 6.5, 2.2, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

export function drawChibiAstronaut(ctx, x, y, opts = {}) {
  const { palette = { fill: '#185ADB' }, time = 0, isTargeted = false, scale = 1.3 } = opts;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Target selection halo under feet
  if (isTargeted) {
    ctx.fillStyle = 'rgba(255, 214, 10, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 14, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Oxygen Backpack
  ctx.fillStyle = '#CBD5E1';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(-13, -7, 6, 14, 3);
  ctx.fill();
  ctx.stroke();

  // Suit Body
  ctx.fillStyle = palette.fill;
  ctx.beginPath();
  ctx.roundRect(-9, -8, 18, 18, 6);
  ctx.fill();
  ctx.stroke();

  // Waving Arms
  const armWave = isTargeted ? Math.sin(time * 18) * 6 : Math.sin(time * 5) * 2;
  ctx.strokeStyle = palette.fill;
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-8, -2);
  ctx.lineTo(-14, -6 - armWave);
  ctx.moveTo(8, -2);
  ctx.lineTo(14, -6 + armWave);
  ctx.stroke();

  // Space Helmet
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -14, 10.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Antenna on Helmet
  ctx.beginPath();
  ctx.moveTo(0, -24.5);
  ctx.lineTo(0, -29);
  ctx.stroke();
  ctx.fillStyle = isTargeted ? '#FFD60A' : palette.fill;
  ctx.beginPath();
  ctx.arc(0, -30, 2.8, 0, Math.PI * 2);
  ctx.fill();

  // Glossy Space Visor
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.roundRect(-7, -18, 14, 8.5, 4);
  ctx.fill();

  ctx.fillStyle = '#7CE8FF';
  ctx.beginPath();
  ctx.ellipse(-2.5, -15, 3.5, 1.6, -0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
