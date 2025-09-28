// components/employee/MySchedule.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axiosInstance from '../../axiosConfig';

const MySchedule = ({ onBack }) => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [upcomingShifts, setUpcomingShifts] = useState([]);

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    fetchScheduleData();
  }, [currentWeek]);

  const fetchScheduleData = async () => {
    setLoading(true);
    try {
      const startOfWeek = getStartOfWeek(currentWeek);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const { data } = await axiosInstance.get('/api/schedule/my-schedule', {
        params: {
          startDate: startOfWeek.toISOString().split('T')[0],
          endDate: endOfWeek.toISOString().split('T')[0]
        }
      });

      if (data.success) {
        setSchedules(data.schedules);
        setUpcomingShifts(data.upcomingShifts || []);
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
      setSchedules([]);
      setUpcomingShifts([]);
    } finally {
      setLoading(false);
    }
  };

  const getStartOfWeek = (date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day;
    return new Date(start.setDate(diff));
  };

  const getWeekDates = () => {
    const startOfWeek = getStartOfWeek(currentWeek);
    const dates = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(date);
    }
    
    return dates;
  };

  const getScheduleForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return schedules.find(s => s.date === dateStr);
  };

  const navigateWeek = (direction) => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + (direction * 7));
    setCurrentWeek(newWeek);
  };

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getShiftTypeColor = (shiftType) => {
    switch (shiftType) {
      case 'morning':
        return 'bg-blue-100 text-blue-800';
      case 'afternoon':
        return 'bg-green-100 text-green-800';
      case 'evening':
        return 'bg-orange-100 text-orange-800';
      case 'night':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getCurrentWeekRange = () => {
    const dates = getWeekDates();
    const start = dates[0];
    const end = dates[6];
    
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Back Button */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center transition duration-200"
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Schedule</h2>
          <p className="text-gray-600 mt-2">View your weekly work schedule and upcoming shifts</p>
        </div>
        
        {/* Week Navigation */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigateWeek(-1)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition duration-200"
          >
            ←
          </button>
          <span className="text-lg font-medium text-gray-900 min-w-max">
            {getCurrentWeekRange()}
          </span>
          <button
            onClick={() => navigateWeek(1)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition duration-200"
          >
            →
          </button>
          <button
            onClick={() => setCurrentWeek(new Date())}
            className="px-3 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition duration-200"
          >
            Today
          </button>
        </div>
      </div>

      {/* Weekly Schedule Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="grid grid-cols-7 divide-x divide-gray-200">
          {getWeekDates().map((date, index) => {
            const schedule = getScheduleForDate(date);
            const today = isToday(date);
            
            return (
              <div key={index} className={`p-4 min-h-48 ${today ? 'bg-blue-50' : 'bg-white'}`}>
                <div className="text-center mb-3">
                  <div className={`text-sm font-medium ${today ? 'text-blue-600' : 'text-gray-500'}`}>
                    {daysOfWeek[date.getDay()]}
                  </div>
                  <div className={`text-lg font-bold ${today ? 'text-blue-700' : 'text-gray-900'}`}>
                    {date.getDate()}
                  </div>
                </div>
                
                {schedule ? (
                  <div className="space-y-2">
                    <div className={`px-3 py-2 rounded-lg text-center ${getShiftTypeColor(schedule.shiftType)}`}>
                      <div className="text-sm font-medium capitalize">{schedule.shiftType} Shift</div>
                      <div className="text-xs mt-1">
                        {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                      </div>
                    </div>
                    
                    {schedule.breakTime && (
                      <div className="text-xs text-gray-500 text-center">
                        Break: {formatTime(schedule.breakStart)} - {formatTime(schedule.breakEnd)}
                      </div>
                    )}
                    
                    {schedule.location && (
                      <div className="text-xs text-gray-600 text-center">
                        📍 {schedule.location}
                      </div>
                    )}
                    
                    {schedule.notes && (
                      <div className="text-xs text-gray-500 text-center italic">
                        {schedule.notes}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 text-sm">
                    No shift scheduled
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Shifts Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Shifts */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Upcoming Shifts</h3>
          
          {upcomingShifts.length > 0 ? (
            <div className="space-y-4">
              {upcomingShifts.slice(0, 5).map((shift) => (
                <div key={shift._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">
                      {new Date(shift.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getShiftTypeColor(shift.shiftType)}`}>
                    {shift.shiftType}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <div className="text-4xl mb-2">📅</div>
              <p>No upcoming shifts scheduled</p>
            </div>
          )}
        </div>

        {/* Schedule Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">This Week Summary</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">Total Scheduled Hours</div>
                <div className="text-sm text-gray-500">This week</div>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {schedules.reduce((total, schedule) => {
                  if (schedule.startTime && schedule.endTime) {
                    const start = new Date(`2000-01-01T${schedule.startTime}`);
                    const end = new Date(`2000-01-01T${schedule.endTime}`);
                    const hours = (end - start) / (1000 * 60 * 60);
                    return total + hours;
                  }
                  return total;
                }, 0)}h
              </div>
            </div>

            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">Working Days</div>
                <div className="text-sm text-gray-500">This week</div>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {schedules.filter(s => s.startTime && s.endTime).length}
              </div>
            </div>

            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">Most Common Shift</div>
                <div className="text-sm text-gray-500">This week</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-purple-600 capitalize">
                  {schedules.length > 0 
                    ? schedules.reduce((acc, curr) => {
                        acc[curr.shiftType] = (acc[curr.shiftType] || 0) + 1;
                        return acc;
                      }, {})
                    : 'None'
                  }
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">Next Shift</div>
                <div className="text-sm text-gray-500">Coming up</div>
              </div>
              <div className="text-right">
                {upcomingShifts.length > 0 ? (
                  <div>
                    <div className="text-sm font-medium text-orange-600">
                      {new Date(upcomingShifts[0].date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTime(upcomingShifts[0].startTime)}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">None scheduled</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Policies & Guidelines */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Schedule Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Shift Types</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">Morning</span>
                <span className="text-sm text-gray-600">6:00 AM - 2:00 PM</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">Afternoon</span>
                <span className="text-sm text-gray-600">2:00 PM - 10:00 PM</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium">Evening</span>
                <span className="text-sm text-gray-600">6:00 PM - 12:00 AM</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">Night</span>
                <span className="text-sm text-gray-600">10:00 PM - 6:00 AM</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-3">Important Notes</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Schedule changes must be requested 48 hours in advance</p>
              <p>• Break times are automatically scheduled for shifts over 6 hours</p>
              <p>• Contact your supervisor for shift swaps or time-off requests</p>
              <p>• Check your schedule weekly for any updates or changes</p>
              <p>• Report any scheduling conflicts immediately</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MySchedule;