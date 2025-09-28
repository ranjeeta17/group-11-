const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  checkInTime: {
    type: Date
  },
  checkOutTime: {
    type: Date
  },
  totalHours: {
    type: Number,
    default: 0,
    min: 0
  },
  breakTime: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half_day'],
    default: 'present'
  },
  location: {
    type: String,
    trim: true
  },
  ipAddress: {
    type: String
  },
  checkInNote: {
    type: String,
    trim: true
  },
  checkOutNote: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Compound index for unique employee-date combination
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

// Calculate total hours before saving
attendanceSchema.pre('save', function(next) {
  if (this.checkInTime && this.checkOutTime) {
    const diffMs = this.checkOutTime - this.checkInTime;
    this.totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
  }
  next();
});

module.exports = mongoose.model('Attendance', attendanceSchema);
