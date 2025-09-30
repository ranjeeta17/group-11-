// controllers/timeRecordController.js
const TimeRecord = require('../models/TimeRecord');

const TZ = 'Australia/Brisbane';

function toLocalParts(date, timeZone = TZ) {
  // Safely produce local date/time/day using Intl
  const d = new Date(date);
  const dayName = new Intl.DateTimeFormat('en-AU', { weekday: 'long', timeZone }).format(d);
  const dateISO = new Intl.DateTimeFormat('en-CA', { // en-CA gives YYYY-MM-DD
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone
  }).format(d);
  // convert from "YYYY-MM-DD" ensured by en-CA
  const [yyyy, mm, dd] = dateISO.split('-');
  const time = new Intl.DateTimeFormat('en-AU', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone
  }).format(d);
  return { dateISO: `${yyyy}-${mm}-${dd}`, time, dayName, tz: timeZone };
}

// --- Create a check-in (manual endpoint or called after login) ---
const checkIn = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    // Prevent overlapping sessions: close any dangling record (optional: or reject)
    const open = await TimeRecord.findOne({ user: userId, logoutAt: null }).sort({ loginAt: -1 });
    if (open) {
      // If you prefer rejecting instead, swap this block.
      open.logoutAt = new Date();
      open.logoutLocal = toLocalParts(open.logoutAt);
      open.durationMinutes = Math.round((open.logoutAt - open.loginAt) / 60000);
      await open.save();
    }

    const now = new Date();
    const meta = {
      user: userId,
      loginAt: now,
      loginLocal: toLocalParts(now),
      userAgent: req.headers['user-agent'],
      ip: req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress
    };

    const record = await TimeRecord.create(meta);
    return res.status(201).json({ success: true, record });
  } catch (err) {
    console.error('checkIn error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create time record' });
  }
};

// --- Create a check-out (manual endpoint or called on /logout) ---
const checkOut = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    const record = await TimeRecord.findOne({ user: userId, logoutAt: null }).sort({ loginAt: -1 });
    if (!record) {
      return res.status(404).json({ success: false, message: 'No open session to check out' });
    }

    record.logoutAt = new Date();
    record.logoutLocal = toLocalParts(record.logoutAt);
    record.durationMinutes = Math.round((record.logoutAt - record.loginAt) / 60000);
    await record.save();

    return res.json({ success: true, record });
  } catch (err) {
    console.error('checkOut error:', err);
    return res.status(500).json({ success: false, message: 'Failed to close time record' });
  }
};

// --- Get my records (paginated & filterable by date range) ---
const getMyRecords = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { page = 1, limit = 10, from, to, openOnly } = req.query;
    const filter = { user: userId };
    if (openOnly === 'true') filter.logoutAt = null;
    if (from || to) {
      filter.loginAt = {};
      if (from) filter.loginAt.$gte = new Date(from);
      if (to)   filter.loginAt.$lte = new Date(to);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, total] = await Promise.all([
      TimeRecord.find(filter).sort({ loginAt: -1 }).skip(skip).limit(parseInt(limit)),
      TimeRecord.countDocuments(filter)
    ]);

    res.json({
      success: true,
      records: items,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalCount: total
      }
    });
  } catch (err) {
    console.error('getMyRecords error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch time records' });
  }
};
// --- Present today (distinct users with a session overlapping *today* in Brisbane) ---
const presentTodayCount = async (req, res) => {
  try {
    // Use your own helper so "today" is Brisbane's date string (YYYY-MM-DD)
    const todayLocalISO = toLocalParts(new Date(), TZ).dateISO;

    // Overlap rule in LOCAL (Brisbane) terms:
    // loginLocal.dateISO <= today  AND  (logoutAt == null OR logoutLocal.dateISO >= today)
    const pipeline = [
      {
        $match: {
          'loginLocal.dateISO': { $lte: todayLocalISO },
          $or: [
            { logoutAt: null },
            { 'logoutLocal.dateISO': { $gte: todayLocalISO } }
          ]
        }
      },
      { $group: { _id: '$user' } },
      { $count: 'count' }
    ];

    const result = await TimeRecord.aggregate(pipeline);
    const count = result.length ? result[0].count : 0;

    return res.json({
      success: true,
      count,
      day: todayLocalISO,
      tz: TZ
    });
  } catch (err) {
    console.error('presentTodayCount error:', err);
    return res.status(500).json({ success: false, message: 'Failed to compute present today' });
  }
};

// --- Admin list (by user/department/date range) ---
const adminList = async (req, res) => {
  try {
    const { userId, from, to, department, page = 1, limit = 10, openOnly } = req.query;
    const filter = {};
    if (userId) filter.user = userId;
    if (openOnly === 'true') filter.logoutAt = null;
    if (from || to) {
      filter.loginAt = {};
      if (from) filter.loginAt.$gte = new Date(from);
      if (to)   filter.loginAt.$lte = new Date(to);
    }

    let query = TimeRecord.find(filter).populate('user', 'name email department role');
    if (department) {
      // Filter by joined user department after populate using $lookup would be better,
      // but for simplicity we’ll filter in-memory after fetch. For big data, use aggregate.
      query = query.sort({ loginAt: -1 });
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const itemsRaw = await query.skip(skip).limit(parseInt(limit));
      const items = department ? itemsRaw.filter(r => r.user?.department === department) : itemsRaw;
      const totalRaw = await TimeRecord.countDocuments(filter);
      // Note: total here is approximate if department filter used—switch to aggregate for exact.
      return res.json({
        success: true,
        records: items,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalRaw / parseInt(limit)),
          totalCount: totalRaw
        }
      });
    } else {
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const [items, total] = await Promise.all([
        query.sort({ loginAt: -1 }).skip(skip).limit(parseInt(limit)),
        TimeRecord.countDocuments(filter)
      ]);
      return res.json({
        success: true,
        records: items,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalCount: total
        }
      });
    }
  } catch (err) {
    console.error('adminList error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch time records' });
  }
};

module.exports = { checkIn, checkOut, getMyRecords, adminList, toLocalParts,presentTodayCount };
