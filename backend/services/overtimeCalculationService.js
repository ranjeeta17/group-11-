const TimeRecord = require('../models/TimeRecord');
const Shift = require('../models/Shift');
const Overtime = require('../models/Overtime');
const User = require('../models/User');

/**
 * Calculate overtime for a completed time record
 * @param {Object} timeRecord - The completed time record
 * @returns {Object} - Overtime calculation result
 */
const calculateOvertimeForTimeRecord = async (timeRecord) => {
  try {
    // Get the shift for this user on the same day
    const loginDate = new Date(timeRecord.loginAt);
    const startOfDay = new Date(loginDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(loginDate);
    endOfDay.setHours(23, 59, 59, 999);

    const shift = await Shift.findOne({
      userId: timeRecord.user,
      startTime: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['assigned', 'confirmed', 'completed'] }
    });

    if (!shift) {
      return { hasOvertime: false, message: 'No shift found for this day' };
    }

    // Calculate shift duration in minutes
    const shiftDurationMs = shift.endTime - shift.startTime;
    const shiftDurationMinutes = Math.round(shiftDurationMs / (1000 * 60));
    const shiftDurationHours = shiftDurationMinutes / 60;

    // Get actual work duration
    const actualDurationMinutes = timeRecord.durationMinutes || 0;
    const actualDurationHours = actualDurationMinutes / 60;

    // Calculate overtime
    const overtimeMinutes = Math.max(0, actualDurationMinutes - shiftDurationMinutes);
    const overtimeHours = overtimeMinutes / 60;

    if (overtimeHours <= 0) {
      return { 
        hasOvertime: false, 
        message: 'No overtime - worked within assigned shift hours',
        shiftHours: shiftDurationHours,
        actualHours: actualDurationHours
      };
    }

    // Check if overtime record already exists for this date
    const existingOvertime = await Overtime.findOne({
      employeeId: timeRecord.user,
      date: startOfDay
    });

    if (existingOvertime) {
      return { 
        hasOvertime: true, 
        message: 'Overtime record already exists for this date',
        overtimeRecord: existingOvertime,
        overtimeHours,
        shiftHours: shiftDurationHours,
        actualHours: actualDurationHours
      };
    }

    // Create automatic overtime record
    const overtimeRecord = new Overtime({
      employeeId: timeRecord.user,
      date: startOfDay,
      startTime: shift.endTime.toTimeString().slice(0, 5), // Format as HH:MM
      endTime: new Date(timeRecord.logoutAt).toTimeString().slice(0, 5),
      totalHours: Math.round(overtimeHours * 100) / 100, // Round to 2 decimal places
      reason: 'Automatic overtime calculation - worked beyond assigned shift',
      description: `Worked ${actualDurationHours.toFixed(2)}h vs assigned ${shiftDurationHours.toFixed(2)}h shift`,
      status: 'pending', // Requires admin approval
      actualStartTime: shift.endTime,
      actualEndTime: timeRecord.logoutAt,
      actualHours: overtimeHours
    });

    await overtimeRecord.save();
    await overtimeRecord.populate('employeeId', 'name email department employeeId');

    return {
      hasOvertime: true,
      message: 'Overtime automatically calculated and recorded',
      overtimeRecord,
      overtimeHours,
      shiftHours: shiftDurationHours,
      actualHours: actualDurationHours
    };

  } catch (error) {
    console.error('Error calculating overtime:', error);
    return { 
      hasOvertime: false, 
      error: 'Failed to calculate overtime',
      message: error.message 
    };
  }
};

/**
 * Process overtime calculation for all completed time records
 * @param {Date} fromDate - Start date for processing
 * @param {Date} toDate - End date for processing
 */
const processOvertimeForDateRange = async (fromDate, toDate) => {
  try {
    const timeRecords = await TimeRecord.find({
      logoutAt: { $ne: null }, // Only completed records
      loginAt: { $gte: fromDate, $lte: toDate }
    }).populate('user', 'name email department employeeId');

    const results = [];
    
    for (const record of timeRecords) {
      const overtimeResult = await calculateOvertimeForTimeRecord(record);
      results.push({
        timeRecordId: record._id,
        employee: record.user?.name || 'Unknown',
        ...overtimeResult
      });
    }

    return results;
  } catch (error) {
    console.error('Error processing overtime for date range:', error);
    throw error;
  }
};

/**
 * Get overtime summary for an employee
 * @param {String} employeeId - Employee ID
 * @param {Date} fromDate - Start date
 * @param {Date} toDate - End date
 */
const getEmployeeOvertimeSummary = async (employeeId, fromDate, toDate) => {
  try {
    const overtimeRecords = await Overtime.find({
      employeeId,
      date: { $gte: fromDate, $lte: toDate }
    }).sort({ date: -1 });

    const totalOvertimeHours = overtimeRecords.reduce((sum, record) => {
      return sum + (record.actualHours || record.totalHours);
    }, 0);

    const pendingHours = overtimeRecords
      .filter(record => record.status === 'pending')
      .reduce((sum, record) => sum + (record.actualHours || record.totalHours), 0);

    const approvedHours = overtimeRecords
      .filter(record => record.status === 'approved')
      .reduce((sum, record) => sum + (record.actualHours || record.totalHours), 0);

    return {
      totalRecords: overtimeRecords.length,
      totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
      pendingHours: Math.round(pendingHours * 100) / 100,
      approvedHours: Math.round(approvedHours * 100) / 100,
      records: overtimeRecords
    };
  } catch (error) {
    console.error('Error getting employee overtime summary:', error);
    throw error;
  }
};

/**
 * Get company-wide overtime statistics
 * @param {Date} fromDate - Start date
 * @param {Date} toDate - End date
 */
const getCompanyOvertimeStats = async (fromDate, toDate) => {
  try {
    const stats = await Overtime.aggregate([
      {
        $match: {
          date: { $gte: fromDate, $lte: toDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalHours: { $sum: { $ifNull: ['$actualHours', '$totalHours'] } }
        }
      }
    ]);

    const totalRecords = await Overtime.countDocuments({
      date: { $gte: fromDate, $lte: toDate }
    });

    const totalHours = await Overtime.aggregate([
      {
        $match: {
          date: { $gte: fromDate, $lte: toDate },
          status: 'approved'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $ifNull: ['$actualHours', '$totalHours'] } }
        }
      }
    ]);

    return {
      totalRecords,
      totalApprovedHours: totalHours[0]?.total || 0,
      byStatus: stats
    };
  } catch (error) {
    console.error('Error getting company overtime stats:', error);
    throw error;
  }
};

module.exports = {
  calculateOvertimeForTimeRecord,
  processOvertimeForDateRange,
  getEmployeeOvertimeSummary,
  getCompanyOvertimeStats
};
