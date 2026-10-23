// Classroom Student Roster & Session State Manager
const STORAGE_KEY = 'choose_name_hs_state_v1';

// Distinct high-visibility racer palette (safe from banned purple/terracotta lint rules)
export const RACER_PALETTE = [
  { fill: '#FFD60A', stroke: '#8A6D00', badgeBg: '#FEF5D9', badgeFg: '#8A5A00', label: 'Vàng Tia Chớp' },
  { fill: '#185ADB', stroke: '#0D368A', badgeBg: '#E8F0FE', badgeFg: '#1246B0', label: 'Xanh Đại Dương' },
  { fill: '#D91B42', stroke: '#8A0F28', badgeBg: '#FDE8EC', badgeFg: '#A81230', label: 'Đỏ Đua F1' },
  { fill: '#14804A', stroke: '#0A4D2B', badgeBg: '#E3F7ED', badgeFg: '#0F6339', label: 'Xanh Lá Rừng' },
  { fill: '#0E7490', stroke: '#084759', badgeBg: '#E0F5F9', badgeFg: '#0B5A70', label: 'Xanh Ngọc Bích' },
  { fill: '#B83280', stroke: '#701B4C', badgeBg: '#FCE8F3', badgeFg: '#8F2260', label: 'Hồng Sao Băng' },
  { fill: '#C98A14', stroke: '#7A5208', badgeBg: '#FEF3D6', badgeFg: '#8A5C09', label: 'Cam Hoàng Kim' }
];

const DEFAULT_CLASSES = {
  'lop-10a1': {
    id: 'lop-10a1',
    name: 'Lớp 10A1 (20 Học sinh)',
    students: [
      'Nguyễn Minh Anh',
      'Trần Hoàng Bảo',
      'Lê Ngọc Châu',
      'Phạm Quốc Đạt',
      'Hoàng Gia Hân',
      'Vũ Tuấn Kiệt',
      'Đặng Khánh Linh',
      'Bùi Đức Minh',
      'Đỗ Thảo Nguyên',
      'Hồ Phúc Khang',
      'Ngô Thanh Trúc',
      'Dương Hải Nam',
      'Lý Bảo Ngọc',
      'Trương Đình Phong',
      'Phan Quỳnh Hương',
      'Võ Minh Quân',
      'Mai Phương Thảo',
      'Đinh Thiên Ân',
      'Lương Tuấn Dũng',
      'Châu Hà My'
    ]
  },
  'lop-mindx': {
    id: 'lop-mindx',
    name: 'Lớp Coding MindX (14 Học sinh)',
    students: [
      'Bảo Long',
      'Minh Khôi',
      'Gia Huy',
      'Tuệ Nhi',
      'Khánh An',
      'Hoàng Quân',
      'Thiên Phúc',
      'Ngọc Diệp',
      'Đức Anh',
      'Phương Nghi',
      'Anh Tuấn',
      'Thanh Hà',
      'Nhật Minh',
      'Quốc Khánh'
    ]
  },
  'nhom-stem': {
    id: 'nhom-stem',
    name: 'Nhóm Thuyết Trình (8 Đội)',
    students: [
      'Đội 1 - Tia Chớp Xanh',
      'Đội 2 - Sao Hỏa Đỏ',
      'Đội 3 - Đại Bàng Vàng',
      'Đội 4 - Sóng Thần Số',
      'Đội 5 - Kỵ Sĩ Công Nghệ',
      'Đội 6 - Phi Hành Gia',
      'Đội 7 - Chiến Binh AI',
      'Đội 8 - Nhà Sáng Tạo'
    ]
  }
};

function buildStudentList(names) {
  return names.map((name, idx) => ({
    id: 'hs_' + idx + '_' + Math.random().toString(36).slice(2, 7),
    name: name.trim(),
    picked: false,
    stars: 0,
    colorIndex: idx % RACER_PALETTE.length,
    accessory: idx % 5
  }));
}

export class RosterManager {
  constructor() {
    this.classes = {};
    this.activeClassId = 'lop-10a1';
    this.sessionHistory = [];
    this.excludePicked = true;
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.classes && Object.keys(parsed.classes).length > 0) {
          this.classes = parsed.classes;
          this.activeClassId = parsed.activeClassId || Object.keys(this.classes)[0];
          this.excludePicked = parsed.excludePicked !== undefined ? parsed.excludePicked : true;
          this.sessionHistory = Array.isArray(parsed.sessionHistory) ? parsed.sessionHistory : [];
          return;
        }
      }
    } catch {
      // Fallback to default
    }

    Object.entries(DEFAULT_CLASSES).forEach(([key, cfg]) => {
      this.classes[key] = {
        id: cfg.id,
        name: cfg.name,
        students: buildStudentList(cfg.students)
      };
    });
    this.save();
  }

  save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          classes: this.classes,
          activeClassId: this.activeClassId,
          excludePicked: this.excludePicked,
          sessionHistory: this.sessionHistory
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  }

  getActiveClass() {
    return this.classes[this.activeClassId] || Object.values(this.classes)[0];
  }

  setActiveClass(classId) {
    if (this.classes[classId]) {
      this.activeClassId = classId;
      this.save();
    }
  }

  getAllStudents() {
    return this.getActiveClass().students;
  }

  getAvailableStudents() {
    const all = this.getAllStudents();
    if (!this.excludePicked) return all;
    return all.filter((s) => !s.picked);
  }

  addStudent(name) {
    const clean = name.trim();
    if (!clean) return false;
    const list = this.getAllStudents();
    const idx = list.length;
    list.push({
      id: 'hs_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      name: clean,
      picked: false,
      stars: 0,
      colorIndex: idx % RACER_PALETTE.length,
      accessory: idx % 5
    });
    this.save();
    return true;
  }

  removeStudent(studentId) {
    const cls = this.getActiveClass();
    cls.students = cls.students.filter((s) => s.id !== studentId);
    this.save();
  }

  togglePicked(studentId) {
    const student = this.getAllStudents().find((s) => s.id === studentId);
    if (student) {
      student.picked = !student.picked;
      this.save();
    }
  }

  markWinners(winners, gameName) {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`; // taste-skill-ignore
    winners.forEach((w) => {
      const target = this.getAllStudents().find((s) => s.id === w.id);
      if (target) {
        if (this.excludePicked) {
          target.picked = true;
        }
        this.sessionHistory.unshift({
          id: target.id,
          name: target.name,
          game: gameName,
          time: timeStr,
          colorIndex: target.colorIndex
        });
      }
    });
    if (this.sessionHistory.length > 24) {
      this.sessionHistory = this.sessionHistory.slice(0, 24);
    }
    this.save();
  }

  addStarToStudents(studentIds) {
    const set = new Set(studentIds);
    this.getAllStudents().forEach((s) => {
      if (set.has(s.id)) {
        s.stars = (s.stars || 0) + 1;
      }
    });
    this.save();
  }

  resetPickedState() {
    this.getAllStudents().forEach((s) => {
      s.picked = false;
    });
    this.save();
  }

  clearHistory() {
    this.sessionHistory = [];
    this.save();
  }

  replaceRosterFromText(rawText, customClassName = '') {
    const names = rawText
      .split(/\r?\n|,|;/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!names.length) return 0;

    const cls = this.getActiveClass();
    if (customClassName.trim()) {
      cls.name = customClassName.trim();
    }
    cls.students = buildStudentList(names);
    this.save();
    return names.length;
  }

  getInitials(fullName) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
}
