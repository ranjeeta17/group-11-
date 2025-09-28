import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axiosInstance from '../../axiosConfig';

const MyAttendance = ({ onBack }) => {
  const { user } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [stats, setStats] = useState({
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    totalHours: 0,
    averageHours: 0
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    fetchAttendanceData();
  }, [currentMonth, currentYear]);

  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get('/api/attendance/my-attendance', {
        params: {
          month: currentMonth + 1,
          year: currentYear
        }
      });

      if (data.success) {
        setAttendanceRecords(data.records);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      setAttendanceRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present':
        return 'bg-green-100 text-green-800';
      case 'Late':
        return 'bg-yellow-100 text-yellow-800';
      case 'Absent':
        return 'bg-red-100 text-red-800';
      case 'Half Day':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const attendanceRate = stats.totalDays > 0 ? ((stats.presentDays / stats.totalDays) * 100).toFixed(1) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading attendance records...</p>
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
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">My Attendance</h2>
        <p className="text-gray-600 mt-2">Track your daily attendance and working hours</p>
      </div>

      {/* Month/Year Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Filter by Month</h3>
          <div className="flex space-x-4">
            <select
              value={currentMonth}
              onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {months.map((month, index) => (
                <option key={index} value={index}>{month}</option>
              ))}
            </select>
            <select
              value={currentYear}
              onChange={(e) => setCurrentYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={2023}>2023</option>
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Total Days</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalDays}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Present</p>
            <p className="text-3xl font-bold text-green-600">{stats.presentDays}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Absent</p>
            <p className="text-3xl font-bold text-red-600">{stats.absentDays}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Late</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.lateDays}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Total Hours</p>
            <p className="text-3xl font-bold text-blue-600">{stats.totalHours}h</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
            <p className="text-3xl font-bold text-purple-600">{attendanceRate}%</p>
          </div>
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Attendance Records - {months[currentMonth]} {currentYear}
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check In
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check Out
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendanceRecords.map((record) => (
                <tr key={record._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(record.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.totalHours ? `${record.totalHours}h` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {record.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {attendanceRecords.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No attendance records found for this period</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyAttendance;