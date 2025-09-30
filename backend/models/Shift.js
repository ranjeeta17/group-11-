const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  shiftType: { 
    type: String, 
    required: true, 
    enum: ['morning', 'evening', 'night'],
    index: true 
  },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: ['assigned', 'confirmed', 'completed', 'cancelled'], 
    default: 'assigned' 
  },
  notes: { type: String, trim: true }
}, { timestamps: true });

shiftSchema.index({ userId: 1, startTime: 1, endTime: 1 });

module.exports = mongoose.model('Shift', shiftSchema);
