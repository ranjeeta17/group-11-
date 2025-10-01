// controllers/adminAnalyticsController.js
const mongoose = require('mongoose');
const User = require('../models/User');
const TimeRecord = require('../models/TimeRecord');
const Leave = require('../models/Leave');
const PDFDocument = require('pdfkit');

const TZ = 'Australia/Brisbane';

/** Turn a JS Date into YYYY-MM-DD string in the given time zone */
function localISO(date, tz = TZ) {
  const s = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year:'numeric', month:'2-digit', day:'2-digit' }).format(date);
  return s; // YYYY-MM-DD
}

/** Build [startDate, endDate] inclusive (both in local days) from ?dateRange */
function getBounds(dateRange = 'this_month', tz = TZ) {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  const setStartOfDay = (d) => d.setHours(0,0,0,0);
  const setEndOfDay = (d) => d.setHours(23,59,59,999);

  switch (dateRange) {
    case 'today':
      setStartOfDay(start);
      setEndOfDay(end);
      break;
    case 'this_week': {
      // Monday -> Sunday
      const dow = now.getDay() || 7; // 1..7
      start.setDate(now.getDate() - (dow - 1));
      setStartOfDay(start);
      end.setDate(start.getDate() + 6);
      setEndOfDay(end);
      break;
    }
    case 'last_month': {
      start.setMonth(now.getMonth() - 1, 1);
      setStartOfDay(start);
      end.setMonth(start.getMonth() + 1, 0); // last day of that month
      setEndOfDay(end);
      break;
    }
    case 'this_year': {
      start.setMonth(0, 1);
      setStartOfDay(start);
      end.setMonth(11, 31);
      setEndOfDay(end);
      break;
    }
    case 'this_month':
    default:
      start.setDate(1);
      setStartOfDay(start);
      end.setMonth(start.getMonth() + 1, 0);
      setEndOfDay(end);
  }

  // Represent bounds in local-day strings so we can match loginLocal/logoutLocal
  const fromISO = localISO(start, tz);
  const toISO = localISO(end, tz);

  return { from: fromISO, to: toISO, fromDate: start, toDate: end };
}

/**
 * A session is counted for day D if (loginLocal.dateISO <= D) AND (logout is null OR logoutLocal.dateISO >= D).
 * That means the session overlapped that local day at least at some point.
 */
function matchSessionsOverlappingLocalDayRange(fromISO, toISO) {
  return {
    $match: {
      'loginLocal.dateISO': { $lte: toISO },
      $or: [
        { logoutAt: null },
        { 'logoutLocal.dateISO': { $gte: fromISO } }
      ]
    }
  };
}

async function computeOverview({ fromISO, toISO }) {
  const [totalEmployees, activeEmployees, departmentAgg] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ isActive: true }),
    User.aggregate([{ $group: { _id: '$department' } }])
  ]);

  // Total leaves in range (approved, overlapping the window)
  const totalLeavesTaken = await Leave.countDocuments({
    status: 'approved',
    $or: [
      { startDate: { $lte: new Date(toISO) }, endDate: { $gte: new Date(fromISO) } }
    ]
  });

  // Attendance “average” across range:
  // For each local day, distinct users present. Then average% over the number of days.
  const days = [];
  {
    const fromD = new Date(fromISO);
    const toD = new Date(toISO);
    for (let d = new Date(fromD); d <= toD; d.setDate(d.getDate() + 1)) {
      days.push(localISO(d));
    }
  }

  // Preload present per day using TimeRecord
  const records = await TimeRecord.aggregate([
    matchSessionsOverlappingLocalDayRange(fromISO, toISO),
    {
      $project: {
        user: 1,
        // clamp the overlap window to [fromISO, toISO]
        startDay: '$loginLocal.dateISO',
        endDay: {
          $ifNull: ['$logoutLocal.dateISO', toISO]
        }
      }
    }
  ]);

  const presentByDay = new Map(days.map(d => [d, new Set()]));
  records.forEach(r => {
    // add the user to each day between startDay..endDay
    let cur = new Date(r.startDay);
    const end = new Date(r.endDay);
    if (cur < new Date(fromISO)) cur = new Date(fromISO);
    if (end > new Date(toISO)) end.setTime(new Date(toISO).getTime());
    for (let d = new Date(cur); d <= end; d.setDate(d.getDate() + 1)) {
      const key = localISO(d);
      if (presentByDay.has(key)) presentByDay.get(key).add(String(r.user));
    }
  });

  const attendancePercents = days.map(d => {
    const present = presentByDay.get(d)?.size || 0;
    return totalEmployees ? (present / totalEmployees) * 100 : 0;
  });
  const avgAttendance = attendancePercents.length
    ? Number((attendancePercents.reduce((a,b)=>a+b,0)/attendancePercents.length).toFixed(1))
    : 0;

  // Overtime hours (sum across range). We consider overtime as >8h per user per local day.
  // First, compute daily totals per user.
  const dailyUserMinutes = await TimeRecord.aggregate([
    matchSessionsOverlappingLocalDayRange(fromISO, toISO),
    {
      $project: {
        user: 1,
        loginAt: 1,
        logoutAt: 1,
        // Use already saved duration if available; otherwise compute minutes at query-time
        durationMinutes: {
          $cond: [
            { $ifNull: ['$durationMinutes', false] },
            '$durationMinutes',
            {
              $divide: [
                { $subtract: [{ $ifNull: ['$logoutAt', new Date()] }, '$loginAt'] },
                60000
              ]
            }
          ]
        },
        startDay: '$loginLocal.dateISO',
        endDay: { $ifNull: ['$logoutLocal.dateISO', toISO] }
      }
    },
    // WARNING: Accurate splitting across days is complex; as an approximation, attribute the whole duration to startDay.
    // If you want exact split per calendar day, you'd need to pre-split server-side at write time.
    { $group: { _id: { user: '$user', day: '$startDay' }, minutes: { $sum: '$durationMinutes' } } },
    {
      $group: {
        _id: '$_id.user',
        overtimeMinutes: {
          $sum: {
            $max: [0, { $subtract: ['$minutes', 8 * 60] }]
          }
        }
      }
    }
  ]);

  const overtimeHours = Number((dailyUserMinutes.reduce((a, r) => a + (r.overtimeMinutes || 0), 0) / 60).toFixed(1));

  return {
    totalEmployees,
    activeEmployees,
    avgAttendance,
    totalLeavesTaken,
    overtimeHours,
    departments: departmentAgg.length
  };
}

async function computeAttendanceTab({ fromISO, toISO }) {
  // By Department: % attendance across the range
  const employees = await User.find({}, 'department').lean();
  const deptEmployees = new Map(); // dept -> Set(userIds)
  employees.forEach(u => {
    const d = u.department || '—';
    if (!deptEmployees.has(d)) deptEmployees.set(d, new Set());
  });

  // daily presence by dept
  const timeAgg = await TimeRecord.aggregate([
    matchSessionsOverlappingLocalDayRange(fromISO, toISO),
    {
      $project: {
        user: 1,
        startDay: '$loginLocal.dateISO',
        endDay: { $ifNull: ['$logoutLocal.dateISO', toISO] }
      }
    }
  ]);

  // Build userId -> department
  const userDept = new Map();
  const users = await User.find({}, 'department').lean();
  users.forEach(u => userDept.set(String(u._id), u.department || '—'));

  // Build day list
  const days = [];
  {
    const fromD = new Date(fromISO);
    const toD = new Date(toISO);
    for (let d = new Date(fromD); d <= toD; d.setDate(d.getDate() + 1)) {
      days.push(localISO(d));
    }
  }

  // track present sets per day
  const presentByDay = new Map(days.map(d => [d, new Set()]));
  timeAgg.forEach(r => {
    let cur = new Date(r.startDay);
    const end = new Date(r.endDay);
    if (cur < new Date(fromISO)) cur = new Date(fromISO);
    if (end > new Date(toISO)) end.setTime(new Date(toISO).getTime());
    for (let d = new Date(cur); d <= end; d.setDate(d.getDate() + 1)) {
      const key = localISO(d);
      if (presentByDay.has(key)) presentByDay.get(key).add(String(r.user));
    }
  });

  // By department attendance%
  const byDepartment = [];
  for (const [dept, set] of deptEmployees.entries()) {
    // members
    const members = users.filter(u => (u.department || '—') === dept).map(u => String(u._id));
    const memberSet = new Set(members);
    const totalSlots = members.length * days.length || 1;
    let presentSlots = 0;
    days.forEach(d => {
      const present = presentByDay.get(d) || new Set();
      members.forEach(uid => { if (present.has(uid)) presentSlots++; });
    });
    const attendance = Number(((presentSlots / totalSlots) * 100).toFixed(1));
    byDepartment.push({ department: dept, attendance });
  }
  byDepartment.sort((a,b)=>b.attendance-a.attendance);

  // Daily trend (present / absent / late)
  // Late rule: first session of user has loginLocal.time > '09:15:00'
  const nineFifteen = '09:15:00';
  // prefetch first login each day
  const firstLogins = await TimeRecord.aggregate([
    matchSessionsOverlappingLocalDayRange(fromISO, toISO),
    {
      $group: {
        _id: { user: '$user', day: '$loginLocal.dateISO' },
        firstLogin: { $min: '$loginLocal.time' }
      }
    }
  ]);

  const firstByDay = new Map(days.map(d => [d, new Map()])); // day -> (user -> time)
  firstLogins.forEach(r => {
    const day = r._id.day;
    const uid = String(r._id.user);
    if (firstByDay.has(day)) firstByDay.get(day).set(uid, r.firstLogin);
  });

  const totalEmployees = users.length;
  const daily = days.map(d => {
    const presentUsers = presentByDay.get(d) || new Set();
    let late = 0;
    presentUsers.forEach(uid => {
      const t = firstByDay.get(d)?.get(uid);
      if (t && t > nineFifteen) late++;
    });
    const present = presentUsers.size;
    const absent = Math.max(0, totalEmployees - present);
    return { date: d, present, absent, late };
  });

  return { byDepartment, daily };
}

async function computeLeavesTab({ fromISO, toISO }) {
  const byTypeAgg = await Leave.aggregate([
    {
      $match: {
        status: { $in: ['approved','pending','rejected','cancelled'] },
        $or: [{ startDate: { $lte: new Date(toISO) }, endDate: { $gte: new Date(fromISO) } }]
      }
    },
    { $group: { _id: '$leaveType', count: { $sum: 1 } } }
  ]);
  const total = byTypeAgg.reduce((a, x) => a + x.count, 0) || 1;
  const byType = byTypeAgg.map(x => ({
    type: (x._id || '').replace(/^\w/, c => c.toUpperCase()),
    count: x.count,
    percentage: Number(((x.count / total) * 100).toFixed(1))
  }));

  const byDepartmentAgg = await Leave.aggregate([
    {
      $match: {
        status: { $in: ['approved','pending','rejected','cancelled'] },
        $or: [{ startDate: { $lte: new Date(toISO) }, endDate: { $gte: new Date(fromISO) } }]
      }
    },
    { $group: { _id: '$department', leaves: { $sum: 1 } } },
    { $sort: { leaves: -1 } }
  ]);

  const byDepartment = byDepartmentAgg.map(x => ({ department: x._id || '—', leaves: x.leaves }));
  return { byType, byDepartment };
}

async function computeOvertimeTab({ fromISO, toISO }) {
  // daily minutes per user (approx: attribute session to login day)
  const perUser = await TimeRecord.aggregate([
    matchSessionsOverlappingLocalDayRange(fromISO, toISO),
    {
      $project: {
        user: 1,
        durationMinutes: {
          $cond: [
            { $ifNull: ['$durationMinutes', false] },
            '$durationMinutes',
            { $divide: [{ $subtract: [{ $ifNull: ['$logoutAt', new Date()] }, '$loginAt'] }, 60000] }
          ]
        },
        startDay: '$loginLocal.dateISO'
      }
    },
    { $group: { _id: { user: '$user', day: '$startDay' }, minutes: { $sum: '$durationMinutes' } } },
    {
      $group: {
        _id: '$_id.user',
        overtimeMinutes: { $sum: { $max: [0, { $subtract: ['$minutes', 8 * 60] }] } }
      }
    }
  ]);

  const users = await User.find({}, 'name department').lean();
  const uMap = new Map(users.map(u => [String(u._id), u]));

  const byEmployee = perUser
    .map(r => ({
      name: uMap.get(String(r._id))?.name || 'Unknown',
      hours: Number(((r.overtimeMinutes || 0) / 60).toFixed(1)),
      department: uMap.get(String(r._id))?.department || '—'
    }))
    .sort((a,b)=>b.hours-a.hours)
    .slice(0, 10);

  // by department
  const byDepartmentMap = new Map(); // dept -> hours
  byEmployee.forEach(e => {
    byDepartmentMap.set(e.department, (byDepartmentMap.get(e.department) || 0) + e.hours);
  });
  const byDepartment = Array.from(byDepartmentMap.entries())
    .map(([department, hours]) => ({ department, hours: Number(hours.toFixed(1)) }))
    .sort((a,b)=>b.hours-a.hours);

  const totalHours = Number((byEmployee.reduce((a,x)=>a+x.hours,0)).toFixed(1));
  return { totalHours, byEmployee, byDepartment };
}

async function computeDepartmentsTab({ fromISO, toISO }) {
  const users = await User.find({}, 'department').lean();
  const departments = Array.from(new Set(users.map(u => u.department || '—')));

  // simple counts
  const employeesByDept = new Map();
  departments.forEach(d => employeesByDept.set(d, 0));
  users.forEach(u => employeesByDept.set(u.department || '—', (employeesByDept.get(u.department || '—') || 0) + 1));

  // attendance by dept (reuse attendance computation)
  const attendance = await computeAttendanceTab({ fromISO, toISO });
  const attendanceByDept = new Map(attendance.byDepartment.map(x => [x.department, x.attendance]));

  // leaves by dept
  const leavesAgg = await Leave.aggregate([
    {
      $match: {
        status: { $in: ['approved','pending','rejected','cancelled'] },
        $or: [{ startDate: { $lte: new Date(toISO) }, endDate: { $gte: new Date(fromISO) } }]
      }
    },
    { $group: { _id: '$department', leaves: { $sum: 1 } } }
  ]);
  const leavesByDept = new Map(leavesAgg.map(x => [x._id || '—', x.leaves]));

  // overtime by dept (reuse overtime)
  const ot = await computeOvertimeTab({ fromISO, toISO });
  const otByDept = new Map(ot.byDepartment.map(d => [d.department, d.hours]));

  return departments.map(d => ({
    name: d,
    employees: employeesByDept.get(d) || 0,
    attendance: Number((attendanceByDept.get(d) || 0).toFixed(1)),
    leaves: leavesByDept.get(d) || 0,
    overtime: Number((otByDept.get(d) || 0).toFixed(1))
  })).sort((a,b)=>b.employees-a.employees);
}

/** GET /api/admin/analytics */
const getAnalytics = async (req, res) => {
  try {
    const { dateRange = 'this_month', type = 'overview' } = req.query;
    const { from, to } = getBounds(dateRange, TZ);

    const payload = { };
    if (type === 'overview') {
      payload.overview = await computeOverview({ fromISO: from, toISO: to });
    } else if (type === 'attendance') {
      payload.attendance = await computeAttendanceTab({ fromISO: from, toISO: to });
    } else if (type === 'leaves') {
      payload.leaves = await computeLeavesTab({ fromISO: from, toISO: to });
    } else if (type === 'overtime') {
      payload.overtime = await computeOvertimeTab({ fromISO: from, toISO: to });
    } else if (type === 'departments') {
      payload.departments = await computeDepartmentsTab({ fromISO: from, toISO: to });
    } else {
      // full bundle if unknown
      payload.overview = await computeOverview({ fromISO: from, toISO: to });
      payload.attendance = await computeAttendanceTab({ fromISO: from, toISO: to });
      payload.leaves = await computeLeavesTab({ fromISO: from, toISO: to });
      payload.overtime = await computeOvertimeTab({ fromISO: from, toISO: to });
      payload.departments = await computeDepartmentsTab({ fromISO: from, toISO: to });
    }

    return res.json({ success: true, analytics: payload });
  } catch (err) {
    console.error('getAnalytics error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
};

/** POST /api/admin/reports/generate  -> returns a small real PDF */
const generateReport = async (req, res) => {
  try {
    const { type = 'attendance', dateRange = 'this_month' } = req.body || {};
    const { from, to } = getBounds(dateRange, TZ);

    // Pull a small summary to print
    const overview = await computeOverview({ fromISO: from, toISO: to });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_report_${from}_to_${to}.pdf`);

    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    doc.pipe(res);

    doc.fontSize(18).text(`${type.replace(/^\w/, c => c.toUpperCase())} Report`, { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Range: ${from} → ${to} (${TZ})`);
    doc.moveDown(1);

    doc.fontSize(14).text('Overview', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12)
      .text(`Total Employees: ${overview.totalEmployees}`)
      .text(`Active Employees: ${overview.activeEmployees}`)
      .text(`Avg Attendance: ${overview.avgAttendance}%`)
      .text(`Total Leaves (overlapping): ${overview.totalLeavesTaken}`)
      .text(`Overtime (hrs): ${overview.overtimeHours}`);

    doc.end();
  } catch (err) {
    console.error('generateReport error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate report' });
  }
};

module.exports = { getAnalytics, generateReport };
