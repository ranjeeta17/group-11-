const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    loginAt: { type: Date, required: true, default: Date.now },
    logoutAt: { type: Date, default: null },
    userAgent: { type: String },
    ip: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Attendance', attendanceSchema);
