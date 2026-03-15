// Data models and helpers - Firebase enabled
let students = [];
let attendance = [];

// Firebase functions (imported automatically)
async function loadData() {
  try {
    await window.firebaseReady;
    students = await window.loadStudents?.() || [];
    attendance = await window.loadAttendance?.() || [];
  } catch (error) {
    console.error('Firebase load error:', error);
    // Fallback to localStorage
    const studentsData = localStorage.getItem('attendance_students');
    const attendanceData = localStorage.getItem('attendance_records');
    if (studentsData) students = JSON.parse(studentsData);
    if (attendanceData) attendance = JSON.parse(attendanceData);
  }
}


async function saveData() {
  // No need, individual saves handle it
}


// Get current week number (ISO week)
function getWeekNumber(date = new Date()) {
  date = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

// Get Arabic day name - ALLOW ALL DAYS
function getCurrentDay() {
  const date = new Date();
  const formatter = new Intl.DateTimeFormat('ar-SA', { weekday: 'long' });
  const dayName = formatter.format(date);
  
  const dayMap = {
    'الأحد': 1,
    'الإثنين': 2,
    'الثلاثاء': 3,
    'الأربعاء': 4,
    'الخميس': 5,
    'الجمعة': 6,
    'السبت': 7
  };
  const dayNum = dayMap[dayName] || 1;
  
  return { dayName, dayNum, allowed: true }; // Always allowed
}


// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Calculate student stats (client-side cache)
function getStudentStats(studentId) {
  const records = attendance.filter(r => r.studentId === studentId);
  const totalDays = new Set(records.map(r => `${r.weekNum}-${r.day}-${r.part}`)).size;
  const present = records.filter(r => r.status === 'present').length;
  const absent = totalDays - present;
  const percentage = totalDays > 0 ? Math.round((present / totalDays) * 100) : 0;
  return { totalDays, present, absent, percentage };
}

// Validate part registration rules
async function validateRegistration(studentId, part, weekNum, dayNum) {
  const todayRecords = attendance.filter(r => 
    r.studentId === studentId && 
    r.weekNum === weekNum && 
    r.day === dayNum
  );
  
  const hasPart1 = todayRecords.some(r => r.part === 1);
  const hasPart2 = todayRecords.some(r => r.part === 2);
  
  if (part === 3) {
    // Part3 allowed with Part1 or Part2 or alone
    return true;
  }
  
  if ((part === 1 && hasPart2) || (part === 2 && hasPart1)) {
    return false; // Cannot register both main parts same day
  }
  
  return true;
}


// Get today's stats
function getTodayStats() {
  const today = getCurrentDay();
  if (!today.allowed) return { present: 0, absent: 0 };
  
  const todayKey = `${getWeekNumber()}-${today.dayNum}`;
  const todayAttendance = attendance.filter(r => 
    `${r.weekNum}-${r.day}-${r.part}`.startsWith(todayKey)
  );
  
  const presentStudents = new Set(todayAttendance.filter(r => r.status === 'present').map(r => r.studentId));
  const totalStudents = students.length;
  const present = presentStudents.size;
  const absent = totalStudents - present;
  return { present, absent };
}

// Top absentee
function getTopAbsentee() {
  const stats = students.map(s => ({...getStudentStats(s.id), ...s}));
  return stats.sort((a, b) => b.absent - a.absent)[0] || {name: '--'};
}

