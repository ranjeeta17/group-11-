// components/employee/MySchedule.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../../axiosConfig.jsx';

const MySchedule = ({ onBack }) => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMyShifts = useCallback(async () => {
    try {
      const response = await axiosInstance.get(`/api/shifts/my`);
      setShifts(response.data);
    } catch (error) {
      console.error('Error fetching shifts:', error);
      setShifts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyShifts();
  }, [fetchMyShifts]);

  const handleStatusUpdate = async (shiftId, newStatus) => {
    try {
      await axiosInstance.put(`/api/shifts/${shiftId}/status`, { status: newStatus });
      fetchMyShifts();
    } catch (error) {
      console.error('Error updating shift status:', error);
      alert(error.response?.data?.message || 'Failed to update shift status');
    }
  };

  const formatDateTime = (dateTime) => new Date(dateTime).toLocaleString();

  const getStatusColor = (status) => {
    switch (status) {
      case 'assigned': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getShiftTypeColor = (type) => {
    switch (type) {
      case 'morning': return 'bg-orange-100 text-orange-800';
      case 'evening': return 'bg-purple-100 text-purple-800';
      case 'night': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <main className="flex items-center justify-center">
        <div>Loading your shifts...</div>
      </main>
    );
  }

  return (
    <div className="bg-white max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Back Button */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-lg text-gray-500 hover:text-gray-300 font-medium inline-flex items-center transition duration-200">
          ← Back to Dashboard
        </button>
      </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900"
            style={{ textShadow: '2px 2px 4px white' }}>My Schedule</h2>
          <p className="text-lg text-gray-300 mt-2">View your weekly work schedule and upcoming shifts</p>
        </div>
        <div className="p-2 text-white  rounded-lg transition duration-200"></div>

     {shifts.length === 0 ? (
          <div className="text-white/90 ">No shifts found.</div>
        ) : (
          <div className="space-y-4">
            {shifts.map((shift) => (
              <div key={shift._id} className="bg-white/95 rounded-lg shadow p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getShiftTypeColor(shift.shiftType)}`}>
                      {shift.shiftType}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">Assigned by: {shift.assignedBy?.name || 'Unknown'}</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-500">Start</div>
                    <div className="text-gray-700">{formatDateTime(shift.startTime)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">End</div>
                    <div className="text-gray-700">{formatDateTime(shift.endTime)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
};

export default MySchedule;