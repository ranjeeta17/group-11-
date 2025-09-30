const Shift = require('../models/Shift');
const User = require('../models/User');
const { ShiftFactory } = require('../factories/ShiftFactory');
const { UserDefinedStrategy, AutoWeeklyStrategy, getShiftWindowForType } = require('../strategies/ShiftAssignmentStrategy');

const DEV_DIAG = process.env.DEBUG_ERRORS === 'true';

const getAllShifts = async (req, res) => {
  try {
    const { userId, shiftType, status, startDate, endDate } = req.query;
    const filter = {};

    if (userId) filter.userId = userId;
    if (shiftType) filter.shiftType = shiftType;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.startTime = {};
      if (startDate) filter.startTime.$gte = new Date(startDate);
      if (endDate) filter.startTime.$lte = new Date(endDate);
    }

    const shifts = await Shift.find(filter)
      .populate('userId', 'name email')
      .populate('assignedBy', 'name email')
      .sort({ startTime: -1 })
      .limit(1000);

    res.json(shifts);
  } catch (error) {
    console.error('[getAllShifts] error:', error);
    res.status(500).json({ message: DEV_DIAG ? error.message : 'Server error fetching shifts' });
  }
};

const getMyShifts = async (req, res) => {
  try {
    const { status, upcoming } = req.query;
    const filter = { userId: req.user.userId || req.user.id };

    if (status) filter.status = status;
    if (upcoming === 'true') {
      filter.startTime = { $gte: new Date() };
    }

    const shifts = await Shift.find(filter)
      .populate('assignedBy', 'name email')
      .sort({ startTime: 1 });

    res.json(shifts);
  } catch (error) {
    console.error('[getMyShifts] error:', error);
    res.status(500).json({ message: DEV_DIAG ? error.message : 'Server error fetching user shifts' });
  }
};

const assignShift = async (req, res) => {
  try {
    const { userId, shiftType, strategy = 'userDefined', notes } = req.body;
    const { date, startDate, startTime, endTime } = req.body;

    if (!userId || !shiftType) {
      return res.status(400).json({ message: 'userId and shiftType are required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let plan;
    if (startTime && endTime) {
      const s = new Date(startTime);
      const e = new Date(endTime);
      if (!(s instanceof Date) || isNaN(s) || !(e instanceof Date) || isNaN(e)) {
        return res.status(400).json({ message: 'Invalid startTime or endTime' });
      }
      plan = { type: 'single', canAssign: true, startTime: s, endTime: e };
    } else {
      let planner;
      let planPayload = {};
      switch ((strategy || '').toLowerCase()) {
        case 'autoweekly':
          planner = new AutoWeeklyStrategy();
          planPayload = { startDate };
          if (!planPayload.startDate) {
            return res.status(400).json({ message: 'startDate is required for autoWeekly strategy' });
          }
          break;
        case 'userdefined':
        default:
          planner = new UserDefinedStrategy();
          planPayload = { date };
          if (!planPayload.date) {
            return res.status(400).json({ message: 'date is required for userDefined strategy' });
          }
          break;
      }

      plan = await planner.plan(userId, shiftType, planPayload);
    }
    if (plan.canAssign === false) {
      return res.status(400).json({ message: plan.reason || 'Cannot assign shift(s)' });
    }

    const created = [];
    if (plan.type === 'single') {
      const shift = ShiftFactory.createShift(shiftType, userId, plan.startTime, plan.endTime, req.user.userId || req.user.id, notes);
      shift.validate();
      const newShift = await shift.create();
      created.push(newShift);
    } else if (plan.type === 'batch') {
      for (const item of plan.items) {
        const shift = ShiftFactory.createShift(shiftType, userId, item.startTime, item.endTime, req.user.userId || req.user.id, notes);
        shift.validate();
        const newShift = await shift.create();
        created.push(newShift);
      }
    }

    const ids = created.map(s => s._id);
    const populated = await Shift.find({ _id: { $in: ids } })
      .populate('userId', 'name email')
      .populate('assignedBy', 'name email')
      .sort({ startTime: 1 });

    res.status(201).json(populated);
  } catch (error) {
    console.error('[assignShift] error:', error);
    res.status(500).json({ message: DEV_DIAG ? error.message : 'Server error assigning shift' });
  }
};

const adminUpdateShift = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, shiftType, date, notes } = req.body;

    const shift = await Shift.findById(id);
    if (!shift) return res.status(404).json({ message: 'Shift not found' });

    if (userId) {
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: 'User not found' });
      shift.userId = userId;
    }
    if (shiftType && date) {
      const { startTime, endTime } = getShiftWindowForType(shiftType, date);
      shift.shiftType = shiftType;
      shift.startTime = startTime;
      shift.endTime = endTime;
    } else if (shiftType) {
      const d = new Date(shift.startTime);
      const { startTime, endTime } = getShiftWindowForType(shiftType, new Date(d.getFullYear(), d.getMonth(), d.getDate()));
      shift.shiftType = shiftType;
      shift.startTime = startTime;
      shift.endTime = endTime;
    } else if (date) {
      const { startTime, endTime } = getShiftWindowForType(shift.shiftType, date);
      shift.startTime = startTime;
      shift.endTime = endTime;
    }
    if (typeof notes === 'string') shift.notes = notes;

    const saved = await shift.save();
    const populatedShift = await Shift.findById(saved._id)
      .populate('userId', 'name email')
      .populate('assignedBy', 'name email');
    res.json(populatedShift);
  } catch (error) {
    console.error('[adminUpdateShift] error:', error);
    res.status(500).json({ message: DEV_DIAG ? error.message : 'Server error updating shift' });
  }
};

const updateShiftStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const validStatuses = ['assigned', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const shift = await Shift.findById(id);
    if (!shift) {
      return res.status(404).json({ message: 'Shift not found' });
    }

    if (shift.userId.toString() !== (req.user.userId || req.user.id).toString()) {
      return res.status(403).json({ message: 'You can only update your own shifts' });
    }

    shift.status = status;
    const updatedShift = await shift.save();

    const populatedShift = await Shift.findById(updatedShift._id)
      .populate('userId', 'name email')
      .populate('assignedBy', 'name email');

    res.json(populatedShift);
  } catch (error) {
    console.error('[updateShiftStatus] error:', error);
    res.status(500).json({ message: DEV_DIAG ? error.message : 'Server error updating shift status' });
  }
};

const deleteShift = async (req, res) => {
  try {
    const { id } = req.params;

    const shift = await Shift.findById(id);
    if (!shift) {
      return res.status(404).json({ message: 'Shift not found' });
    }

    await Shift.findByIdAndDelete(id);
    res.json({ message: 'Shift deleted successfully' });
  } catch (error) {
    console.error('[deleteShift] error:', error);
    res.status(500).json({ message: DEV_DIAG ? error.message : 'Server error deleting shift' });
  }
};

const getShiftStats = async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;
    const matchFilter = {};

    if (userId) matchFilter.userId = userId;
    if (startDate || endDate) {
      matchFilter.startTime = {};
      if (startDate) matchFilter.startTime.$gte = new Date(startDate);
      if (endDate) matchFilter.startTime.$lte = new Date(endDate);
    }

    const stats = await Shift.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$shiftType',
          count: { $sum: 1 },
          confirmed: {
            $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
          },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      }
    ]);

    res.json(stats);
  } catch (error) {
    console.error('[getShiftStats] error:', error);
    res.status(500).json({ message: DEV_DIAG ? error.message : 'Server error fetching shift statistics' });
  }
};

const getShiftInfo = async (req, res) => {
  try {
    const shiftTypes = ShiftFactory.getShiftTypes();
    const timeRanges = ShiftFactory.getShiftTimeRanges();

    res.json({
      shiftTypes,
      timeRanges,
      strategies: ['userDefined', 'autoWeekly']
    });
  } catch (error) {
    console.error('[getShiftInfo] error:', error);
    res.status(500).json({ message: DEV_DIAG ? error.message : 'Server error fetching shift info' });
  }
};

module.exports = {
  getAllShifts,
  getMyShifts,
  assignShift,
  adminUpdateShift,
  updateShiftStatus,
  deleteShift,
  getShiftStats,
  getShiftInfo
};



