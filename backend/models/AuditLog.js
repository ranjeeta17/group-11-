const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  action: {
    type: String,
    required: true,
    trim: true
  },
  tableName: {
    type: String,
    required: true,
    trim: true
  },
  recordId: {
    type: mongoose.Schema.Types.ObjectId
  },
  oldValues: {
    type: mongoose.Schema.Types.Mixed
  },
  newValues: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: { 
    createdAt: true, 
    updatedAt: false 
  }
});

// Index for efficient querying
auditLogSchema.index({ tableName: 1, recordId: 1 });
auditLogSchema.index({ userId: 1, action: 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);