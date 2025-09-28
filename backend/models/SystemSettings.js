const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['general', 'security', 'notifications', 'backup', 'attendance'],
    required: true
  },
  settingKey: {
    type: String,
    required: true
  },
  settingValue: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  description: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Compound index to ensure unique category-key combination
systemSettingsSchema.index({ category: 1, settingKey: 1 }, { unique: true });

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
