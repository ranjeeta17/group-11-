
const User = require('../models/User');
const Attendance = require('../models/Attendance');

//hh
const listUsers = async (_req, res) => {
  try {
    const users = await User.find().select('-password').sort({ name: 1 });
    res.json(users);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

const updateUser = async (req, res) => {
  const { name, email, password } = req.body || {};
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (password) user.password = password; 
    const saved = await user.save();
    res.json({ _id: saved.id, name: saved.name, email: saved.email });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

const deleteUser = async (req, res) => {
  try {
    const id = req.params.id;
    const del = await User.findByIdAndDelete(id);
    if (!del) return res.status(404).json({ message: 'User not found' });

    // delete attendance records for this user
    await Attendance.deleteMany({ userId: id });

    // OPTIONAL: also delete tasks if you want
    // const Task = require('../models/Task');
    // await Task.deleteMany({ user: id });

    res.json({ message: 'User and related attendance deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

// ---- ATTENDANCE ----
const listAllAttendance = async (req, res) => {
  try {
    const filter = {};
    if (req.query.userId) filter.userId = req.query.userId;

    const rows = await Attendance.find(filter)
      .populate('userId', 'name email')
      .sort({ loginAt: -1 })
      .limit(2000);
    res.json(rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

const updateAttendance = async (req, res) => {
  try {
    const { loginAt, logoutAt } = req.body || {};
    const updated = await Attendance.findByIdAndUpdate(
      req.params.id,
      {
        ...(loginAt !== undefined ? { loginAt: new Date(loginAt) } : {}),
        ...(logoutAt !== undefined ? { logoutAt: logoutAt ? new Date(logoutAt) : null } : {}),
      },
      { new: true }
    ).populate('userId', 'name email');
    if (!updated) return res.status(404).json({ message: 'Attendance not found' });
    res.json(updated);
  } catch (e) { res.status(500).json({ message: e.message }); }
};

const deleteAttendance = async (req, res) => {
  try {
    const del = await Attendance.findByIdAndDelete(req.params.id);
    if (!del) return res.status(404).json({ message: 'Attendance not found' });
    res.json({ message: 'Attendance record deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
};

module.exports = {
  listUsers, updateUser, deleteUser,
  listAllAttendance, updateAttendance, deleteAttendance
};
