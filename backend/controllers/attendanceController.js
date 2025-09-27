const Attendance = require('../models/Attendance');


const getMyAttendance = async (req, res) => {
  try {
    const list = await Attendance.find({ userId: req.user.id })
      .sort({ loginAt: -1 })
      .limit(100);
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};


const markLogin = async (req, res) => {
  try {
    const doc = await Attendance.create({
      userId: req.user.id,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      loginAt: new Date(),
    });
    return res.status(201).json(doc);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};


const markLogout = async (req, res) => {
  try {
    const updated = await Attendance.findOneAndUpdate(
      { userId: req.user.id, logoutAt: null },
      { logoutAt: new Date() },
      { new: true, sort: { loginAt: -1 } }
    );
    if (!updated) return res.status(404).json({ message: 'No active session found' });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { getMyAttendance, markLogin, markLogout };
