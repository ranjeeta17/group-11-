// models/Leave.js
const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  employeeName: {
    type: String,
    required: true
  },
  employeeEmail: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  leaveType: {
    type: String,
    enum: ['annual', 'sick', 'personal', 'maternity', 'paternity', 'emergency', 'unpaid'],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  totalDays: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  rejectionReason: {
    type: String,
    maxlength: 500
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
leaveSchema.index({ employeeId: 1, status: 1 });
leaveSchema.index({ department: 1, status: 1 });
leaveSchema.index({ startDate: 1, endDate: 1 });
leaveSchema.index({ createdAt: -1 });

// Virtual for formatted dates
leaveSchema.virtual('formattedStartDate').get(function() {
  return this.startDate.toLocaleDateString();
});

leaveSchema.virtual('formattedEndDate').get(function() {
  return this.endDate.toLocaleDateString();
});

// Method to calculate working days (excluding weekends)
leaveSchema.methods.calculateWorkingDays = function() {
  const start = new Date(this.startDate);
  const end = new Date(this.endDate);
  let workingDays = 0;
  
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
      workingDays++;
    }
  }
  
  return workingDays;
};

// Pre-save middleware to calculate total days
leaveSchema.pre('save', function(next) {
  if (this.isModified('startDate') || this.isModified('endDate')) {
    this.totalDays = this.calculateWorkingDays();
  }
  next();
});

module.exports = mongoose.model('Leave', leaveSchema);