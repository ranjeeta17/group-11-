const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String, // Format: "HH:MM"
    required: true
  },
  endTime: {
    type: String, // Format: "HH:MM"
    required: true
  },
  shiftType: {
    type: String,
    enum: ['regular', 'overtime', 'night', 'weekend', 'holiday'],
    default: 'regular'
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'missed', 'cancelled'],
    default: 'scheduled'
  },
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  totalHours: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Calculate total hours before saving
shiftSchema.pre('save', function(next) {
  if (this.startTime && this.endTime) {
    const start = new Date(`2000-01-01T${this.startTime}`);
    const end = new Date(`2000-01-01T${this.endTime}`);
    
    // Handle overnight shifts
    if (end < start) {
      end.setDate(end.getDate() + 1);
    }
    
    const diffMs = end - start;
    this.totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
  }
  next();
});

// Compound index to prevent duplicate shifts
shiftSchema.index({ employeeId: 1, date: 1, startTime: 1 }, { unique: true });

module.exports = mongoose.model('Shift', shiftSchema);
