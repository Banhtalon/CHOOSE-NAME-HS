// Main Application Controller for CHOOSE-NAME-HS Ordered Classroom Exam Picker
import { RosterManager, RACER_PALETTE } from './roster.js';
import { ClassroomGamesEngine, GAME_DEFINITIONS } from './gamesEngine.js';
import { soundFX } from './audio.js';

const roster = new RosterManager();

let sequentialQueueTotal = 1;
let sequentialPickedEntries = [];
let lastAddedEntries = [];

const els = {
  workspaceSheet: document.getElementById('workspaceSheet'),
  theaterToggleBtn: document.getElementById('theaterToggleBtn'),
  theaterToggleLabel: document.getElementById('theaterToggleLabel'),
  soundToggleBtn: document.getElementById('soundToggleBtn'),
  soundToggleLabel: document.getElementById('soundToggleLabel'),
  fullscreenBtn: document.getElementById('fullscreenBtn'),
  gameTabs: document.getElementById('gameTabs'),
  stageTitle: document.getElementById('stageTitle'),
  stageSubtitle: document.getElementById('stageSubtitle'),
  pickModeSelect: document.getElementById('pickModeSelect'),
  durationSelect: document.getElementById('durationSelect'),
  excludeToggleBtn: document.getElementById('excludeToggleBtn'),
  playRaceBtn: document.getElementById('playRaceBtn'),
  playRaceBtnLabel: document.getElementById('playRaceBtnLabel'),
  hudPoolCount: document.getElementById('hudPoolCount'),
  hudCommentary: document.getElementById('hudCommentary'),
  liveLeadersList: document.getElementById('liveLeadersList'),
  // Sidebar Tabs & Views
  tabExamQueueBtn: document.getElementById('tabExamQueueBtn'),
  tabRosterBtn: document.getElementById('tabRosterBtn'),
  queueBadgeCount: document.getElementById('queueBadgeCount'),
  rosterBadgeCount: document.getElementById('rosterBadgeCount'),
  examQueueView: document.getElementById('examQueueView'),
  rosterManageView: document.getElementById('rosterManageView'),
  resetSessionBtn: document.getElementById('resetSessionBtn'),
  statQueued: document.getElementById('statQueued'),
  statDoneExam: document.getElementById('statDoneExam'),
  statRemaining: document.getElementById('statRemaining'),
  examOrderList: document.getElementById('examOrderList'),
  pickNextOneBtn: document.getElementById('pickNextOneBtn'),
  // Roster View Controls
  openImportBtn: document.getElementById('openImportBtn'),
  classSelect: document.getElementById('classSelect'),
  quickAddForm: document.getElementById('quickAddForm'),
  quickAddInput: document.getElementById('quickAddInput'),
  studentList: document.getElementById('studentList'),
  // Modals
  winnerModal: document.getElementById('winnerModal'),
  winnerTagText: document.getElementById('winnerTagText'),
  winnerModalHeading: document.getElementById('winnerModalHeading'),
  winnerSubtext: document.getElementById('winnerSubtext'),
  modalOrderCards: document.getElementById('modalOrderCards'),
  awardStarBtn: document.getElementById('awardStarBtn'),
  nextRaceBtn: document.getElementById('nextRaceBtn'),
  closeWinnerBtn: document.getElementById('closeWinnerBtn'),
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

function switchSidebarTab(tabName) {
  const isQueue = tabName === 'queue';
  els.tabExamQueueBtn.classList.toggle('is-active', isQueue);
  els.tabExamQueueBtn.setAttribute('aria-selected', String(isQueue));
  els.tabRosterBtn.classList.toggle('is-active', !isQueue);
  els.tabRosterBtn.setAttribute('aria-selected', String(!isQueue));
  els.examQueueView.hidden = !isQueue;
  els.rosterManageView.hidden = isQueue;
}

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

function renderExamOrderQueue() {
  const all = roster.getAllStudents();
  const ready = roster.getAvailableStudents();
  const queue = roster.examQueue;
  const doneCount = queue.filter((q) => q.done).length;

  els.queueBadgeCount.textContent = String(queue.length);
  els.rosterBadgeCount.textContent = String(all.length);
  els.statQueued.textContent = String(queue.length);
  els.statDoneExam.textContent = String(doneCount);
  els.statRemaining.textContent = String(ready.length);
  els.hudPoolCount.textContent = `${ready.length} Học sinh chờ gọi`;

  els.excludeToggleBtn.classList.toggle('is-on', roster.excludePicked);
  els.excludeToggleBtn.setAttribute('aria-pressed', String(roster.excludePicked));
  els.excludeToggleBtn.querySelector('span').textContent = roster.excludePicked
    ? 'Không gọi trùng người đã lên bảng: BẬT'
    : 'Không gọi trùng người đã lên bảng: TẮT';

  els.examOrderList.innerHTML = '';
  if (queue.length === 0) {
    const emptyBox = document.createElement('div');
    emptyBox.className = 'exam-empty-box';
    emptyBox.innerHTML = `
      <div class="exam-empty-title">Chưa có học sinh trong danh sách kiểm tra</div>
      <p>Nhấn nút <strong>QUAY CHỌN THỨ TỰ</strong> để trò chơi tự chạy và xếp thứ tự học sinh lên bảng (Số 1, Số 2, Số 3...).</p>
    `;
    els.examOrderList.appendChild(emptyBox);
    return;
  }

  // First non-done student is currently testing at the board
  const activeTestingIndex = queue.findIndex((q) => !q.done);

  queue.forEach((entry, idx) => {
    const isCurrent = idx === activeTestingIndex;
    const card = document.createElement('div');
    card.className =
      'exam-order-card' +
      (isCurrent ? ' is-current' : '') +
      (entry.done ? ' is-done' : '');

    const left = document.createElement('div');
    left.className = 'exam-order-left';

    const rankBadge = document.createElement('span');
    rankBadge.className = 'exam-rank-badge';
    rankBadge.textContent = `THỨ TỰ ${entry.orderNumber}`;

    const info = document.createElement('div');
    info.className = 'exam-student-info';

    const nameEl = document.createElement('span');
    nameEl.className = 'exam-student-name';
    nameEl.textContent = entry.name;

    const statusEl = document.createElement('span');
    statusEl.className = 'exam-student-status';
    if (entry.done) {
      statusEl.textContent = `Đã kiểm tra xong · ${entry.game}`;
    } else if (isCurrent) {
      statusEl.textContent = `ĐANG LÊN BẢNG KIỂM TRA · ${entry.game}`;
    } else if (idx === activeTestingIndex + 1) {
      statusEl.textContent = 'Chuẩn bị lên bảng tiếp theo';
    } else {
      statusEl.textContent = `Chờ tới lượt (#${entry.orderNumber})`;
    }

    info.appendChild(nameEl);
    info.appendChild(statusEl);
    left.appendChild(rankBadge);
    left.appendChild(info);

    const doneBtn = document.createElement('button');
    doneBtn.type = 'button';
    doneBtn.className = 'exam-done-btn';
    doneBtn.textContent = entry.done ? 'Hoàn tác' : 'Đã KT xong';
    doneBtn.addEventListener('click', () => {
      roster.toggleExamDone(entry.uid);
      renderExamOrderQueue();
    });

    card.appendChild(left);
    card.appendChild(doneBtn);
    els.examOrderList.appendChild(card);
  });
}

function renderRosterManageList() {
  const all = roster.getAllStudents();
  els.studentList.innerHTML = '';

  all.forEach((student, idx) => {
    const palette = RACER_PALETTE[student.colorIndex % RACER_PALETTE.length];
    const row = document.createElement('div');
    row.className = 'student-row' + (student.picked ? ' is-picked' : '');

    const identity = document.createElement('div');
    identity.className = 'student-identity';

    const badge = document.createElement('span');
    badge.className = 'student-badge';
    badge.style.backgroundColor = palette.badgeBg;
    badge.style.color = palette.badgeFg;
    badge.textContent = String(idx + 1);

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
    toggleBtn.title = student.picked ? 'Đưa trở lại danh sách chờ' : 'Đánh dấu vắng / đã gọi';
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
}

function renderLiveLeaders(names) {
  els.liveLeadersList.innerHTML = '';
  if (!names || !names.length) return;

  names.slice(0, 3).forEach((name, idx) => {
    const chip = document.createElement('div');
    chip.className = 'picked-winner-chip';

    const tag = document.createElement('span');
    tag.className = 'picked-order-tag';
    tag.style.backgroundColor = idx === 0 ? '#784F00' : '#334155';
    tag.textContent = `Dẫn đầu ${idx + 1}`;

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
    roster.resetExamSession();
    available = roster.getAvailableStudents();
    els.hudCommentary.textContent =
      'Tất cả học sinh trong lớp đã được gọi đủ 1 vòng! Đã làm mới danh sách kiểm tra.';
  }
  renderExamOrderQueue();
  renderRosterManageList();
  engine.setRoster(available, roster.examQueue.length);
}

function parsePickMode() {
  const val = els.pickModeSelect.value;
  if (val.startsWith('seq-')) {
    return { mode: 'sequential', count: Number(val.replace('seq-', '')) || 3 };
  }
  if (val.startsWith('order-')) {
    return { mode: 'ordered-batch', count: Number(val.replace('order-', '')) || 3 };
  }
  return { mode: 'single', count: 1 };
}

function triggerPlayButton(forceCount = null) {
  if (engine.state === 'running' || engine.state === 'countdown') return;

  const parsed = forceCount ? { mode: 'single', count: forceCount } : parsePickMode();
  const durationSec = Number(els.durationSelect.value) || 9;

  if (parsed.mode === 'sequential') {
    sequentialQueueTotal = parsed.count;
    sequentialPickedEntries = [];
    startNextSequentialLeg(durationSec);
  } else {
    sequentialQueueTotal = 1;
    sequentialPickedEntries = [];
    syncEngineRoster();
    els.playRaceBtn.classList.add('is-running');
    els.playRaceBtnLabel.textContent = 'ĐANG CHẠY ĐUA...';
    engine.startRound({
      durationSec,
      pickCount: parsed.count,
      currentQueueLength: roster.examQueue.length
    });
  }
}

function startNextSequentialLeg(durationSec) {
  syncEngineRoster();
  const legNumber = sequentialPickedEntries.length + 1;
  els.playRaceBtn.classList.add('is-running');
  els.playRaceBtnLabel.textContent = `ĐANG CHỌN LƯỢT ${legNumber}/${sequentialQueueTotal}...`;
  engine.startRound({
    durationSec,
    pickCount: 1,
    currentQueueLength: roster.examQueue.length
  });
}

function handleRoundWinners(winners) {
  const currentGame = GAME_DEFINITIONS.find((g) => g.id === engine.currentGameId);
  const gameTitle = currentGame ? currentGame.name : 'Trò chơi';

  const newEntries = roster.markWinnersInOrder(winners, gameTitle);
  renderExamOrderQueue();
  renderRosterManageList();
  switchSidebarTab('queue');

  if (sequentialQueueTotal > 1) {
    sequentialPickedEntries.push(...newEntries);
    if (
      sequentialPickedEntries.length < sequentialQueueTotal &&
      roster.getAvailableStudents().length > 0
    ) {
      const latest = newEntries[0];
      els.hudCommentary.textContent = `Đã xếp THỨ TỰ #${latest.orderNumber}: ${latest.name}! Đang chuẩn bị đua chọn người tiếp theo...`;
      setTimeout(() => {
        const durationSec = Math.max(5, Number(els.durationSelect.value) || 7);
        startNextSequentialLeg(durationSec);
      }, 1800);
      return;
    }
    lastAddedEntries = [...sequentialPickedEntries];
  } else {
    lastAddedEntries = newEntries;
  }

  els.playRaceBtn.classList.remove('is-running');
  els.playRaceBtnLabel.textContent = 'QUAY CHỌN THỨ TỰ';
  openWinnerModal(lastAddedEntries, gameTitle);
}

function openWinnerModal(entries, gameTitle) {
  els.winnerTagText.textContent = `KẾT QUẢ TỪ TRÒ CHƠI: ${gameTitle.toUpperCase()}`;
  els.winnerModalHeading.textContent =
    entries.length > 1
      ? `Đã Xếp Thứ Tự ${entries.length} Học Sinh Lên Kiểm Tra`
      : `Thứ Tự #${entries[0]?.orderNumber || 1}: ${entries[0]?.name || ''}`;
  els.winnerSubtext.textContent =
    'Thứ tự học sinh lên bảng kiểm tra đã được lưu vào Bảng Thứ Tự bên phải màn hình:';

  els.modalOrderCards.innerHTML = '';
  entries.forEach((entry) => {
    const row = document.createElement('div');
    row.className = 'modal-order-row';

    const num = document.createElement('span');
    num.className = 'modal-order-num';
    num.textContent = `THỨ TỰ #${entry.orderNumber}`;

    const name = document.createElement('span');
    name.className = 'modal-order-name';
    name.textContent = entry.name;

    row.appendChild(num);
    row.appendChild(name);
    els.modalOrderCards.appendChild(row);
  });

  els.awardStarBtn.disabled = false;
  els.awardStarBtn.textContent = 'Cộng +1 Sao Thưởng';
  els.winnerModal.hidden = false;
}

function closeWinnerModal() {
  els.winnerModal.hidden = true;
  syncEngineRoster();
}

// Event Listeners
els.tabExamQueueBtn.addEventListener('click', () => switchSidebarTab('queue'));
els.tabRosterBtn.addEventListener('click', () => switchSidebarTab('roster'));

els.theaterToggleBtn.addEventListener('click', () => {
  const isTheater = els.workspaceSheet.classList.toggle('is-theater');
  els.theaterToggleBtn.classList.toggle('is-active', isTheater);
  els.theaterToggleLabel.textContent = isTheater ? 'Hiện bảng thứ tự' : 'Rộng sân khấu';
  setTimeout(() => engine.resize(), 50);
});

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

els.resetSessionBtn.addEventListener('click', () => {
  roster.resetExamSession();
  syncEngineRoster();
  els.hudCommentary.textContent = 'Đã làm mới Bảng Thứ Tự Kiểm Tra cho tiết học mới!';
});

els.pickNextOneBtn.addEventListener('click', () => {
  triggerPlayButton(1);
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

els.awardStarBtn.addEventListener('click', () => {
  if (lastAddedEntries.length) {
    roster.addStarToStudents(lastAddedEntries.map((e) => e.studentId));
    soundFX.playWinFanfare();
    els.awardStarBtn.disabled = true;
    els.awardStarBtn.textContent = 'Đã Cộng +1 Sao!';
    renderRosterManageList();
  }
});

els.nextRaceBtn.addEventListener('click', () => {
  closeWinnerModal();
  triggerPlayButton();
});

els.closeWinnerBtn.addEventListener('click', () => {
  closeWinnerModal();
});

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

renderClassSelector();
syncEngineRoster();
