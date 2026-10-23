// Main Application Controller for CHOOSE-NAME-HS Classroom Picker
import { RosterManager, RACER_PALETTE } from './roster.js';
import { ClassroomGamesEngine, GAME_DEFINITIONS } from './gamesEngine.js';
import { soundFX } from './audio.js';

const roster = new RosterManager();

// Sequential multi-pick state ("Chọn lần lượt từng người")
let sequentialQueueTotal = 1;
let sequentialPickedSoFar = [];
let lastRoundWinners = [];

const els = {
  classSelect: document.getElementById('classSelect'),
  openImportBtn: document.getElementById('openImportBtn'),
  quickAddForm: document.getElementById('quickAddForm'),
  quickAddInput: document.getElementById('quickAddInput'),
  statTotal: document.getElementById('statTotal'),
  statReady: document.getElementById('statReady'),
  statPicked: document.getElementById('statPicked'),
  studentList: document.getElementById('studentList'),
  resetPickedBtn: document.getElementById('resetPickedBtn'),
  clearHistoryBtn: document.getElementById('clearHistoryBtn'),
  gameTabs: document.getElementById('gameTabs'),
  stageTitle: document.getElementById('stageTitle'),
  stageSubtitle: document.getElementById('stageSubtitle'),
  pickModeSelect: document.getElementById('pickModeSelect'),
  durationSelect: document.getElementById('durationSelect'),
  excludeToggleBtn: document.getElementById('excludeToggleBtn'),
  playRaceBtn: document.getElementById('playRaceBtn'),
  playRaceBtnLabel: document.getElementById('playRaceBtnLabel'),
  soundToggleBtn: document.getElementById('soundToggleBtn'),
  soundToggleLabel: document.getElementById('soundToggleLabel'),
  fullscreenBtn: document.getElementById('fullscreenBtn'),
  hudPoolCount: document.getElementById('hudPoolCount'),
  hudCommentary: document.getElementById('hudCommentary'),
  liveLeadersList: document.getElementById('liveLeadersList'),
  pickedHistoryList: document.getElementById('pickedHistoryList'),
  // Winner Modal
  winnerModal: document.getElementById('winnerModal'),
  winnerTagText: document.getElementById('winnerTagText'),
  winnerNameDisplay: document.getElementById('winnerNameDisplay'),
  winnerSubtext: document.getElementById('winnerSubtext'),
  awardStarBtn: document.getElementById('awardStarBtn'),
  nextRaceBtn: document.getElementById('nextRaceBtn'),
  closeWinnerBtn: document.getElementById('closeWinnerBtn'),
  // Import Modal
  importModal: document.getElementById('importModal'),
  importClassName: document.getElementById('importClassName'),
  importTextarea: document.getElementById('importTextarea'),
  saveImportBtn: document.getElementById('saveImportBtn'),
  cancelImportBtn: document.getElementById('cancelImportBtn'),
  canvas: document.getElementById('gameCanvas')
};

const engine = new ClassroomGamesEngine(els.canvas, {
  onCommentary: (msg) => {
    els.hudCommentary.textContent = msg;
  },
  onLeaderboard: (topNames) => {
    renderLiveLeaders(topNames);
  },
  onRoundComplete: (winners) => {
    handleRoundWinners(winners);
  }
});

function renderClassSelector() {
  els.classSelect.innerHTML = '';
  Object.values(roster.classes).forEach((cls) => {
    const opt = document.createElement('option');
    opt.value = cls.id;
    opt.textContent = cls.name;
    if (cls.id === roster.activeClassId) opt.selected = true;
    els.classSelect.appendChild(opt);
  });
}

function renderRosterPanel() {
  const all = roster.getAllStudents();
  const ready = roster.getAvailableStudents();
  const pickedCount = all.filter((s) => s.picked).length;

  els.statTotal.textContent = String(all.length);
  els.statReady.textContent = String(ready.length);
  els.statPicked.textContent = String(pickedCount);
  els.hudPoolCount.textContent = `${ready.length} Học sinh tham gia`;

  els.excludeToggleBtn.classList.toggle('is-on', roster.excludePicked);
  els.excludeToggleBtn.setAttribute('aria-pressed', String(roster.excludePicked));
  els.excludeToggleBtn.querySelector('span').textContent = roster.excludePicked
    ? 'Loại trừ người đã gọi: BẬT'
    : 'Loại trừ người đã gọi: TẮT';

  els.studentList.innerHTML = '';
  all.forEach((student) => {
    const palette = RACER_PALETTE[student.colorIndex % RACER_PALETTE.length];
    const row = document.createElement('div');
    row.className = 'student-row' + (student.picked ? ' is-picked' : '');

    const identity = document.createElement('div');
    identity.className = 'student-identity';

    const badge = document.createElement('span');
    badge.className = 'student-badge';
    badge.style.backgroundColor = palette.badgeBg;
    badge.style.color = palette.badgeFg;
    badge.textContent = roster.getInitials(student.name);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'student-name';
    nameSpan.textContent = student.name;

    identity.appendChild(badge);
    identity.appendChild(nameSpan);

    const meta = document.createElement('div');
    meta.className = 'student-meta';

    if (student.stars > 0) {
      const starPill = document.createElement('span');
      starPill.className = 'star-pill';
      starPill.textContent = `+${student.stars} Sao`;
      meta.appendChild(starPill);
    }

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'row-action-btn';
    toggleBtn.title = student.picked ? 'Đưa trở lại danh sách đua' : 'Đánh dấu đã gọi / vắng mặt';
    toggleBtn.setAttribute('aria-label', toggleBtn.title);
    toggleBtn.innerHTML = student.picked
      ? '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 10l4 4 8-8"/></svg>'
      : '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="10" r="6"/></svg>';
    toggleBtn.addEventListener('click', () => {
      roster.togglePicked(student.id);
      syncEngineRoster();
    });

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'row-action-btn';
    delBtn.title = 'Xóa học sinh';
    delBtn.setAttribute('aria-label', 'Xóa ' + student.name);
    delBtn.innerHTML =
      '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l8 8M14 6l-8 8"/></svg>';
    delBtn.addEventListener('click', () => {
      roster.removeStudent(student.id);
      syncEngineRoster();
    });

    meta.appendChild(toggleBtn);
    meta.appendChild(delBtn);

    row.appendChild(identity);
    row.appendChild(meta);
    els.studentList.appendChild(row);
  });

  renderPickedHistory();
}

function renderPickedHistory() {
  els.pickedHistoryList.innerHTML = '';
  if (!roster.sessionHistory.length) {
    const chip = document.createElement('div');
    chip.className = 'picked-winner-chip';
    const tag = document.createElement('span');
    tag.className = 'picked-order-tag';
    tag.style.backgroundColor = '#334155';
    tag.textContent = 'Sẵn sàng';
    const label = document.createElement('span');
    label.textContent = 'Nhấn BẮT ĐẦU ĐUA để gọi học sinh đầu tiên';
    chip.appendChild(tag);
    chip.appendChild(label);
    els.pickedHistoryList.appendChild(chip);
    return;
  }

  roster.sessionHistory.slice(0, 3).forEach((item, index) => {
    const chip = document.createElement('div');
    chip.className = 'picked-winner-chip';

    const orderTag = document.createElement('span');
    orderTag.className = 'picked-order-tag';
    orderTag.textContent = `#${roster.sessionHistory.length - index}`;

    const name = document.createElement('span');
    name.textContent = item.name;

    chip.appendChild(orderTag);
    chip.appendChild(name);
    els.pickedHistoryList.appendChild(chip);
  });
}

function renderLiveLeaders(names) {
  els.liveLeadersList.innerHTML = '';
  if (!names || !names.length) {
    const empty = document.createElement('span');
    empty.className = 'empty-hint';
    empty.textContent = 'Đang chờ xuất phát...';
    els.liveLeadersList.appendChild(empty);
    return;
  }

  names.slice(0, 2).forEach((name, idx) => {
    const chip = document.createElement('div');
    chip.className = 'picked-winner-chip';

    const tag = document.createElement('span');
    tag.className = 'picked-order-tag';
    tag.style.backgroundColor = idx === 0 ? '#784F00' : '#334155';
    tag.textContent = `Hạng ${idx + 1}`;

    const label = document.createElement('span');
    label.textContent = name;

    chip.appendChild(tag);
    chip.appendChild(label);
    els.liveLeadersList.appendChild(chip);
  });
}

function syncEngineRoster() {
  let available = roster.getAvailableStudents();
  if (available.length === 0 && roster.getAllStudents().length > 0) {
    roster.resetPickedState();
    available = roster.getAvailableStudents();
    els.hudCommentary.textContent = 'Tất cả học sinh đã được gọi đủ 1 vòng! Hệ thống tự động làm mới danh sách.';
  }
  renderRosterPanel();
  engine.setRoster(available);
}

function parsePickMode() {
  const val = els.pickModeSelect.value;
  if (val.startsWith('seq-')) {
    return { mode: 'sequential', count: Number(val.replace('seq-', '')) || 2 };
  }
  if (val.startsWith('top-')) {
    return { mode: 'simultaneous', count: Number(val.replace('top-', '')) || 3 };
  }
  return { mode: 'single', count: 1 };
}

function triggerPlayButton() {
  if (engine.state === 'running' || engine.state === 'countdown') return;

  const { mode, count } = parsePickMode();
  const durationSec = Number(els.durationSelect.value) || 9;

  if (mode === 'sequential') {
    sequentialQueueTotal = count;
    sequentialPickedSoFar = [];
    startNextSequentialLeg(durationSec);
  } else {
    sequentialQueueTotal = 1;
    sequentialPickedSoFar = [];
    syncEngineRoster();
    els.playRaceBtn.classList.add('is-running');
    els.playRaceBtnLabel.textContent = 'ĐANG CHẠY ĐUA...';
    engine.startRound({ durationSec, pickCount: count });
  }
}

function startNextSequentialLeg(durationSec) {
  syncEngineRoster();
  const legNumber = sequentialPickedSoFar.length + 1;
  els.playRaceBtn.classList.add('is-running');
  els.playRaceBtnLabel.textContent = `ĐANG CHỌN NGƯỜI ${legNumber}/${sequentialQueueTotal}...`;
  engine.startRound({ durationSec, pickCount: 1 });
}

function handleRoundWinners(winners) {
  const currentGame = GAME_DEFINITIONS.find((g) => g.id === engine.currentGameId);
  const gameTitle = currentGame ? currentGame.name : 'Trò chơi';

  roster.markWinners(winners, gameTitle);
  renderRosterPanel();

  if (sequentialQueueTotal > 1) {
    sequentialPickedSoFar.push(...winners);
    if (sequentialPickedSoFar.length < sequentialQueueTotal && roster.getAvailableStudents().length > 0) {
      const pickedName = winners[0] ? winners[0].name : '';
      els.hudCommentary.textContent = `Đã chọn Lượt ${sequentialPickedSoFar.length}/${sequentialQueueTotal}: ${pickedName}! Chuẩn bị đua lượt tiếp theo...`;
      setTimeout(() => {
        const durationSec = Math.max(5, Number(els.durationSelect.value) || 7);
        startNextSequentialLeg(durationSec);
      }, 1900);
      return;
    }
    lastRoundWinners = [...sequentialPickedSoFar];
  } else {
    lastRoundWinners = winners;
  }

  els.playRaceBtn.classList.remove('is-running');
  els.playRaceBtnLabel.textContent = 'BẮT ĐẦU ĐUA';
  openWinnerModal(lastRoundWinners, gameTitle);
}

function openWinnerModal(winners, gameTitle) {
  const names = winners.map((w) => w.name).join(' · ');
  els.winnerTagText.textContent =
    winners.length > 1
      ? `KẾT QUẢ ${winners.length} HỌC SINH ĐƯỢC CHỌN (${gameTitle.toUpperCase()})`
      : `NHÀ VÔ ĐỊCH ${gameTitle.toUpperCase()}`;
  els.winnerNameDisplay.textContent = names;
  els.winnerSubtext.textContent = roster.excludePicked
    ? 'Học sinh này đã được đánh dấu vào danh sách Đã Gọi để lượt sau không bị trùng.'
    : 'Sẵn sàng cho câu hỏi hoặc thử thách trên bảng!';
  els.awardStarBtn.disabled = false;
  els.awardStarBtn.textContent = 'Cộng +1 Sao Thưởng';
  els.winnerModal.hidden = false;
}

function closeWinnerModal() {
  els.winnerModal.hidden = true;
  syncEngineRoster();
}

// Event Listeners
els.classSelect.addEventListener('change', () => {
  roster.setActiveClass(els.classSelect.value);
  syncEngineRoster();
});

els.quickAddForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const val = els.quickAddInput.value;
  if (roster.addStudent(val)) {
    els.quickAddInput.value = '';
    syncEngineRoster();
  }
});

els.resetPickedBtn.addEventListener('click', () => {
  roster.resetPickedState();
  syncEngineRoster();
  els.hudCommentary.textContent = 'Đã khôi phục toàn bộ học sinh vào danh sách sẵn sàng đua!';
});

els.clearHistoryBtn.addEventListener('click', () => {
  roster.clearHistory();
  renderPickedHistory();
});

els.excludeToggleBtn.addEventListener('click', () => {
  roster.excludePicked = !roster.excludePicked;
  roster.save();
  syncEngineRoster();
});

els.playRaceBtn.addEventListener('click', () => {
  triggerPlayButton();
});

els.soundToggleBtn.addEventListener('click', () => {
  const on = soundFX.toggle();
  els.soundToggleBtn.classList.toggle('is-muted', !on);
  els.soundToggleLabel.textContent = on ? 'Âm thanh: BẬT' : 'Âm thanh: TẮT';
});

els.fullscreenBtn.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
});

els.gameTabs.querySelectorAll('[data-game-id]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const gameId = btn.getAttribute('data-game-id');
    els.gameTabs.querySelectorAll('[data-game-id]').forEach((b) => {
      b.classList.toggle('is-active', b === btn);
      b.setAttribute('aria-selected', String(b === btn));
    });
    const def = GAME_DEFINITIONS.find((g) => g.id === gameId);
    if (def) {
      els.stageTitle.textContent = def.name;
      els.stageSubtitle.textContent = def.subtitle;
    }
    engine.setGame(gameId);
  });
});

// Winner Modal buttons
els.awardStarBtn.addEventListener('click', () => {
  if (lastRoundWinners.length) {
    roster.addStarToStudents(lastRoundWinners.map((w) => w.id));
    soundFX.playWinFanfare();
    els.awardStarBtn.disabled = true;
    els.awardStarBtn.textContent = 'Đã Cộng +1 Sao!';
    renderRosterPanel();
  }
});

els.nextRaceBtn.addEventListener('click', () => {
  closeWinnerModal();
  triggerPlayButton();
});

els.closeWinnerBtn.addEventListener('click', () => {
  closeWinnerModal();
});

// Bulk Import Modal
els.openImportBtn.addEventListener('click', () => {
  const cls = roster.getActiveClass();
  els.importClassName.value = cls.name;
  els.importTextarea.value = cls.students.map((s) => s.name).join('\n');
  els.importModal.hidden = false;
});

els.cancelImportBtn.addEventListener('click', () => {
  els.importModal.hidden = true;
});

els.saveImportBtn.addEventListener('click', () => {
  const count = roster.replaceRosterFromText(els.importTextarea.value, els.importClassName.value);
  if (count > 0) {
    renderClassSelector();
    syncEngineRoster();
    els.importModal.hidden = true;
    els.hudCommentary.textContent = `Đã cập nhật danh sách lớp thành công với ${count} học sinh!`;
  }
});

// Keyboard Shortcuts for Teacher Convenience
window.addEventListener('keydown', (e) => {
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  if (e.code === 'Space') {
    e.preventDefault();
    if (!els.winnerModal.hidden) {
      closeWinnerModal();
    } else {
      triggerPlayButton();
    }
  } else if (e.key >= '1' && e.key <= '5') {
    const idx = Number(e.key) - 1;
    const tabBtns = els.gameTabs.querySelectorAll('[data-game-id]');
    if (tabBtns[idx]) tabBtns[idx].click();
  }
});

// Initialize on load
renderClassSelector();
syncEngineRoster();
