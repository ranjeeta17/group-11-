// controllers/adminSimpleAnalyticsController.js
const mongoose = require('mongoose');
const User = require('../models/User');
const Leave = require('../models/Leave');
const TimeRecord = require('../models/TimeRecord');
const Overtime = require('../models/Overtime');

const TZ = 'Australia/Brisbane';

function localISO(date, tz = TZ) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(date);
}
function startOfDay(d){ const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d){ const x = new Date(d); x.setHours(23,59,59,999); return x; }
function defaultBoundsNow() {
  const now = new Date();
  const from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
  const to   = endOfDay(new Date(now.getFullYear(), now.getMonth()+1, 0));
  return { from, to };
}
function parseBounds(query) {
  if (!query?.from && !query?.to) return defaultBoundsNow();
  const from = query.from ? startOfDay(new Date(query.from)) : startOfDay(new Date('1970-01-01'));
  const to   = query.to   ? endOfDay(new Date(query.to))     : endOfDay(new Date('2999-12-31'));
  return { from, to };
}

// controllers/adminSimpleAnalyticsController.js (only this function replaced)
const getCompanySummary = async (req, res) => {
  const label = 'getCompanySummary';
  try {
    const { from, to } = parseBounds(req.query);
    const fromISO = localISO(from, TZ);
    const toISO   = localISO(to, TZ);
    const { department } = req.query; // <-- NEW
    console.log(`📈 [${label}] range: ${fromISO} → ${toISO} (${TZ}) dept=${department || 'ALL'}`);

    // 1) Total employees (optionally filter by department)
    const userFilter = department ? { department } : {};
    const totalEmployees = await User.countDocuments(userFilter);
    console.log(`👥 [${label}] totalEmployees = ${totalEmployees} (filter=${JSON.stringify(userFilter)})`);

    // 2) Active employees now: users with an open session (logoutAt == null)
    // If department is provided, restrict to users in that department.
    let activeEmployeesNow = 0;
    if (department) {
      const deptUsers = await User.find({ department }).select('_id');
      const ids = deptUsers.map(u => u._id);
      const open = await TimeRecord.aggregate([
        { $match: { logoutAt: null, user: { $in: ids } } },
        { $group: { _id: '$user' } },
        { $count: 'count' }
      ]);
      activeEmployeesNow = open.length ? open[0].count : 0;
    } else {
      const open = await TimeRecord.aggregate([
        { $match: { logoutAt: null } },
        { $group: { _id: '$user' } },
        { $count: 'count' }
      ]);
      activeEmployeesNow = open.length ? open[0].count : 0;
    }
    console.log(`🟢 [${label}] activeEmployeesNow = ${activeEmployeesNow}`);

    // 3) Approved leaves overlapping [from..to]
    // If department is provided, filter by that department column on Leave.
    const leaveFilter = {
      status: 'approved',
      startDate: { $lte: to },
      endDate:   { $gte: from },
      ...(department ? { department } : {})
    };
    const totalLeavesApproved = await Leave.countDocuments(leaveFilter);
    console.log(`📝 [${label}] totalLeavesApproved = ${totalLeavesApproved} (filter=${JSON.stringify(leaveFilter)})`);

    // 4) Overtime hours in range (approved). If department is provided, restrict to that dept’s users.
    let overtimeHours = 0;
    if (department) {
      const deptUsers = await User.find({ department }).select('_id');
      const ids = deptUsers.map(u => u._id);
      const otAgg = await Overtime.aggregate([
        { $match: { status: 'approved', employeeId: { $in: ids }, date: { $gte: startOfDay(from), $lte: endOfDay(to) } } },
        { $project: { hours: { $cond: [{ $ifNull: ['$actualHours', false] }, '$actualHours', '$totalHours'] } } },
        { $group: { _id: null, sum: { $sum: '$hours' } } }
      ]);
      overtimeHours = Number((otAgg[0]?.sum || 0).toFixed(2));
    } else {
      const otAgg = await Overtime.aggregate([
        { $match: { status: 'approved', date: { $gte: startOfDay(from), $lte: endOfDay(to) } } },
        { $project: { hours: { $cond: [{ $ifNull: ['$actualHours', false] }, '$actualHours', '$totalHours'] } } },
        { $group: { _id: null, sum: { $sum: '$hours' } } }
      ]);
      overtimeHours = Number((otAgg[0]?.sum || 0).toFixed(2));
    }
    console.log(`⏱️ [${label}] overtimeHours = ${overtimeHours}`);

    const result = {
      success: true,
      range: { from: fromISO, to: toISO, tz: TZ },
      summary: { totalEmployees, activeEmployeesNow, totalLeavesApproved, overtimeHours }
    };

    console.log(`✅ [${label}] Response:\n${JSON.stringify(result, null, 2)}`);
    return res.json(result);
  } catch (err) {
    console.error(`❌ [${label}] error:`, err.stack || err);
    return res.status(500).json({
      success: false,
      message: 'Failed to compute summary',
      ...(process.env.NODE_ENV !== 'production' ? { error: String(err.message || err) } : {})
    });
  }
};


const getEmployeeSummary = async (req, res) => {
  const label = 'getEmployeeSummary';
  try {
    const { employeeId } = req.params;
    const { from, to } = parseBounds(req.query);
    const fromISO = localISO(from, TZ);
    const toISO   = localISO(to, TZ);
    console.log(`📈 [${label}] employeeId=${employeeId} range: ${fromISO} → ${toISO} (${TZ})`);

    const user = await User.findOne({ employeeId })
      .select('name email department role employeeId isActive');
    if (!user) {
      console.warn(`⚠️ [${label}] employee not found: ${employeeId}`);
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const lastSession = await TimeRecord.findOne({ user: user._id }).sort({ loginAt: -1 });
    const openSessionNow = !!(lastSession && !lastSession.logoutAt);
    const lastLoginAt = lastSession?.loginAt || null;
    console.log(`🟢 [${label}] openSessionNow=${openSessionNow} lastLoginAt=${lastLoginAt || '—'}`);

    // Distinct present local days overlapped
    const trs = await TimeRecord.aggregate([
      {
        $match: {
          user: user._id,
          'loginLocal.dateISO': { $lte: toISO },
          $or: [
            { logoutAt: null },
            { 'logoutLocal.dateISO': { $gte: fromISO } }
          ]
        }
      },
      {
        $project: {
          startDay: '$loginLocal.dateISO',
          endDay:   { $ifNull: ['$logoutLocal.dateISO', toISO] }
        }
      }
    ]);

    const daySet = new Set();
    trs.forEach(r => {
      let cur = new Date(r.startDay);
      const end = new Date(r.endDay);
      if (cur < new Date(fromISO)) cur = new Date(fromISO);
      const e = end > new Date(toISO) ? new Date(toISO) : end;
      for (let d = new Date(cur); d <= e; d.setDate(d.getDate() + 1)) {
        daySet.add(localISO(d, TZ));
      }
    });
    const presentDays = daySet.size;
    console.log(`✅ [${label}] presentDays=${presentDays}`);

    // Approved leaves overlapping [from..to]
    const leavesAgg = await Leave.aggregate([
      {
        $match: {
          employeeId: user._id,
          status: 'approved',
          startDate: { $lte: to },
          endDate:   { $gte: from }
        }
      },
      { $group: { _id: null, requests: { $sum: 1 }, totalDays: { $sum: '$totalDays' } } }
    ]);
    const leavesApproved = {
      count: leavesAgg[0]?.requests || 0,
      totalDays: leavesAgg[0]?.totalDays || 0
    };
    console.log(`📝 [${label}] leavesApproved = ${JSON.stringify(leavesApproved)}`);

    // Approved overtime in range
    const otAgg = await Overtime.aggregate([
      {
        $match: {
          employeeId: user._id,
          status: 'approved',
          date: { $gte: startOfDay(from), $lte: endOfDay(to) }
        }
      },
      {
        $project: {
          hours: {
            $cond: [
              { $ifNull: ['$actualHours', false] },
              '$actualHours',
              '$totalHours'
            ]
          }
        }
      },
      { $group: { _id: null, sum: { $sum: '$hours' } } }
    ]);
    const overtimeHours = Number((otAgg[0]?.sum || 0).toFixed(2));
    console.log(`⏱️ [${label}] overtimeHours=${overtimeHours}`);

    const response = {
      success: true,
      range: { from: fromISO, to: toISO, tz: TZ },
      employee: {
        profile: user,
        lastLoginAt,
        openSessionNow,
        presentDays,
        leavesApproved,
        overtimeHours
      }
    };

    console.log(`✅ [${label}] Response:\n${JSON.stringify(response, null, 2)}`);
    return res.json(response);
  } catch (err) {
    console.error(`❌ [${label}] error:`, err.stack || err);
    return res.status(500).json({
      success: false,
      message: 'Failed to compute employee summary',
      ...(process.env.NODE_ENV !== 'production' ? { error: String(err.message || err) } : {})
    });
  }
};

module.exports = { getCompanySummary, getEmployeeSummary };
