// components/employee/MySchedule.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axiosInstance from '../../axiosConfig.jsx';

const MySchedule = ({ onBack }) => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [filterShiftType, setFilterShiftType] = useState('all'); // all | morning | evening | night

  const fetchMyShifts = useCallback(async () => {
    try {
      const response = await axiosInstance.get(`/api/shifts/my`);
      setShifts(response.data || []);
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

  const handleClearFilters = () => {
    setFilterShiftType('all');
  };

  // Map DB values to Figma labels
  const displayShiftType = (type) => {
    const t = String(type || '').toLowerCase();
    if (t === 'morning') return 'Afternoon' === 'Morning' ? 'Morning' : 'Morning'; // safety
    if (t === 'evening') return 'Afternoon';
    if (t === 'night') return 'Midnight';
    return type || '—';
  };

  // Keep DB values for filter comparison; only the label differs
  const filteredShifts = useMemo(() => {
    return shifts.filter((s) =>
      filterShiftType === 'all'
        ? true
        : String(s.shiftType || '').toLowerCase() === filterShiftType
    );
  }, [shifts, filterShiftType]);

  // DD-MMM-YYYY, h:mm:ss AM/PM
  const formatDateTime = (iso) => {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    const dd = pad(d.getDate());
    const mon = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const yyyy = d.getFullYear();
    let h = d.getHours();
    const m = pad(d.getMinutes());
    const s = pad(d.getSeconds());
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 === 0 ? 12 : h % 12;
    return `${dd}-${mon}-${yyyy}, ${h}:${m}:${s} ${ampm}`;
  };

  if (loading) {
    return (
      <main className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading your shifts...</p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Back */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="text-lg text-gray-600 hover:text-gray-300 font-medium inline-flex items-center transition duration-200"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900" style={{ textShadow: '2px 2px 4px white' }}>
            My Schedule
          </h2>
          <p className="text-lg text-gray-500 mt-2">
            View your weekly work schedule and upcoming shifts
          </p>
        </div>

        {/* Filters Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4">
            <h3 className="text-base font-semibold text-gray-900">Filters</h3>
          </div>
          <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {/* Shift Type (system default select) */}
            <div>
              <label className="block text-sm text-gray-600 mb-2">Shift Type</label>
              <select
                value={filterShiftType}
                onChange={(e) => setFilterShiftType(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="all">All Types</option>
                <option value="morning">Morning</option>
                <option value="evening">Afternoon</option>
                <option value="night">Midnight</option>
              </select>
            </div>

            {/* Clear Filters button */}
            <div className="md:col-span-2 flex md:justify-start">
              <button
                onClick={handleClearFilters}
                className="bg-[#2E4A8A] text-white px-4 py-2 rounded-lg shadow-md hover:bg-white hover:text-black transition duration-200 self-end"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Employees Table Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="text-base font-semibold text-gray-900">Employees</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Shift Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Dates &amp; Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    End Dates &amp; Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned By
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {filteredShifts.map((shift) => (
                  <tr key={shift._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {displayShiftType(shift.shiftType)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(shift.startTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(shift.endTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {shift.assignedBy?.name || 'System Admin'}
                    </td>
                  </tr>
                ))}

                {filteredShifts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500">
                      No shifts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
};

export default MySchedule;
