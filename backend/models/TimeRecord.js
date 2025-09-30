// models/TimeRecord.js
const mongoose = require('mongoose');

const TimeRecordSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // UTC instants (source of truth)
    loginAt:  { type: Date, required: true },
    logoutAt: { type: Date, default: null },

    // Convenience fields captured at login using a chosen timezone (Australia/Brisbane)
    loginLocal: {
      dateISO: { type: String },      // e.g., "2025-09-30"
      time:    { type: String },      // e.g., "14:05:12"
      dayName: { type: String },      // e.g., "Tuesday"
      tz:      { type: String, default: 'Australia/Brisbane' }
    },

    // Same for logout (filled at checkout)
    logoutLocal: {
      dateISO: { type: String, default: null },
      time:    { type: String, default: null },
      dayName: { type: String, default: null },
      tz:      { type: String, default: 'Australia/Brisbane' }
    },

    // Duration in minutes (filled at checkout)
    durationMinutes: { type: Number, default: null },

    // Optional metadata
    userAgent: { type: String },
    ip:        { type: String }
  },
  { timestamps: true }
);

// Helpful compound index for quick admin queries
TimeRecordSchema.index({ user: 1, loginAt: -1 });

module.exports = mongoose.model('TimeRecord', TimeRecordSchema);
