// components/admin/ShiftManagement.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const ShiftManagement = ({ onBack }) => {
  const { user } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [errors, setErrors] = useState({});
  const [submitLoading, setSubmitLoading] = useState(false);

  const [newShift, setNewShift] = useState({
    employeeId: '',
    date: '',
    startTime: '',
    endTime: '',
    shiftType: 'regular',
    notes: ''
  });

  const shiftTypes = [
    { value: 'regular', label: 'Regular Shift', color: 'blue' },
    { value: 'overtime', label: 'Overtime', color: 'orange' },
    { value: 'night', label: 'Night Shift', color: 'purple' },
    { value: 'weekend', label: 'Weekend', color: 'green' },
    { value: 'holiday', label: 'Holiday', color: 'red' }
  ];

  useEffect(() => {
    fetchShifts();
    fetchEmployees();
  }, [currentWeek]);

  const fetchShifts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const startOfWeek = getStartOfWeek(currentWeek);
      const endOfWeek = getEndOfWeek(currentWeek);
      
      const response = await fetch(`http://localhost:5001/api/admin/shifts?startDate=${startOfWeek.toISOString()}&endDate=${endOfWeek.toISOString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setShifts(data.shifts);
      } else {
        console.error('Failed to fetch shifts:', data.message);
        setShifts([]);
      }
    } catch (error) {
      console.error('Error fetching shifts:', error);
      setShifts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/admin/employees?status=active', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setEmployees(data.employees);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
    }
  };

  const handleAddShift = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setErrors({});

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/admin/shifts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newShift)
      });

      const data = await response.json();
      if (data.success) {
        setShifts([...shifts, data.shift]);
        setShowAddModal(false);
        setNewShift({
          employeeId: '',
          date: '',
          startTime: '',
          endTime: '',
          shiftType: 'regular',
          notes: ''
        });
      } else {
        setErrors({ submit: data.message });
      }
    } catch (error) {
      console.error('Error adding shift:', error);
      setErrors({ submit: 'Failed to add shift' });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEditShift = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setErrors({});

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/admin/shifts/${selectedShift._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(selectedShift)
      });

      const data = await response.json();
      if (data.success) {
        setShifts(shifts.map(shift => 
          shift._id === selectedShift._id ? data.shift : shift
        ));
        setShowEditModal(false);
        setSelectedShift(null);
      } else {
        setErrors({ submit: data.message });
      }
    } catch (error) {
      console.error('Error updating shift:', error);
      setErrors({ submit: 'Failed to update shift' });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteShift = async (shiftId) => {
    if (!window.confirm('Are you sure you want to delete this shift?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/admin/shifts/${shiftId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setShifts(shifts.filter(shift => shift._id !== shiftId));
      }
    } catch (error) {
      console.error('Error deleting shift:', error);
    }
  };

  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  const getEndOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + 6;
    return new Date(d.setDate(diff));
  };

  const getWeekDays = () => {
    const startOfWeek = getStartOfWeek(currentWeek);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getShiftsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return shifts.filter(shift => shift.date.split('T')[0] === dateStr);
  };

  const formatTime = (time) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getShiftTypeColor = (type) => {
    const shiftType = shiftTypes.find(st => st.value === type);
    return shiftType ? shiftType.color : 'gray';
  };

  const calculateHours = (startTime, endTime) => {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    if (end < start) {
      end.setDate(end.getDate() + 1);
    }
    return Math.round((end - start) / (1000 * 60 * 60) * 100) / 100;
  };

  const openEditModal = (shift) => {
    setSelectedShift({...shift});
    setShowEditModal(true);
  };

  const weekDays = getWeekDays();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading shifts...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
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
          <h2 className="text-2xl font-bold text-gray-900">Shift Management</h2>
          <p className="text-gray-600 mt-2">Manage employee shifts and schedules</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
        >
          Add Shift
        </button>
      </div>

      {/* Week Navigation */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex justify-between items-center">
          <button
            onClick={() => {
              const newWeek = new Date(currentWeek);
              newWeek.setDate(currentWeek.getDate() - 7);
              setCurrentWeek(newWeek);
            }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition duration-200"
          >
            ← Previous Week
          </button>
          
          <h3 className="text-lg font-medium text-gray-900">
            Week of {getStartOfWeek(currentWeek).toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </h3>
          
          <button
            onClick={() => {
              const newWeek = new Date(currentWeek);
              newWeek.setDate(currentWeek.getDate() + 7);
              setCurrentWeek(newWeek);
            }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition duration-200"
          >
            Next Week →
          </button>
        </div>
      </div>

      {/* Weekly Calendar View */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="grid grid-cols-7 gap-0">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
            <div key={day} className="bg-gray-50 p-4 text-center font-medium text-gray-700 border-b">
              {day}
            </div>
          ))}
          
          {weekDays.map((date, index) => {
            const dayShifts = getShiftsForDate(date);
            const isToday = date.toDateString() === new Date().toDateString();
            
            return (
              <div key={index} className={`min-h-32 p-2 border-r border-b ${isToday ? 'bg-blue-50' : ''}`}>
                <div className={`text-sm font-medium mb-2 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                  {date.getDate()}
                </div>
                
                <div className="space-y-1">
                  {dayShifts.map((shift) => {
                    const employee = employees.find(emp => emp._id === shift.employeeId);
                    const shiftColor = getShiftTypeColor(shift.shiftType);
                    
                    return (
                      <div
                        key={shift._id}
                        className={`text-xs p-1 rounded cursor-pointer hover:opacity-80 bg-${shiftColor}-100 text-${shiftColor}-800 border border-${shiftColor}-200`}
                        onClick={() => openEditModal(shift)}
                      >
                        <div className="font-medium truncate">
                          {employee ? employee.name : 'Unknown'}
                        </div>
                        <div>
                          {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                        </div>
                        <div className="text-xs opacity-75">
                          {calculateHours(shift.startTime, shift.endTime)}h
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Shift Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Shifts</p>
              <p className="text-2xl font-bold text-gray-900">{shifts.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">⏰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Hours</p>
              <p className="text-2xl font-bold text-green-600">
                {shifts.reduce((total, shift) => 
                  total + calculateHours(shift.startTime, shift.endTime), 0
                ).toFixed(1)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">🌙</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Night Shifts</p>
              <p className="text-2xl font-bold text-orange-600">
                {shifts.filter(shift => shift.shiftType === 'night').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">⚡</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Overtime</p>
              <p className="text-2xl font-bold text-purple-600">
                {shifts.filter(shift => shift.shiftType === 'overtime').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Shift Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Shift</h3>
              
              <form onSubmit={handleAddShift} className="space-y-4">
                {errors.submit && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {errors.submit}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Employee *</label>
                  <select
                    value={newShift.employeeId}
                    onChange={(e) => setNewShift({...newShift, employeeId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select Employee</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>
                        {emp.name} ({emp.employeeId})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                  <input
                    type="date"
                    value={newShift.date}
                    onChange={(e) => setNewShift({...newShift, date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Time *</label>
                    <input
                      type="time"
                      value={newShift.startTime}
                      onChange={(e) => setNewShift({...newShift, startTime: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Time *</label>
                    <input
                      type="time"
                      value={newShift.endTime}
                      onChange={(e) => setNewShift({...newShift, endTime: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Shift Type</label>
                  <select
                    value={newShift.shiftType}
                    onChange={(e) => setNewShift({...newShift, shiftType: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    {shiftTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={newShift.notes}
                    onChange={(e) => setNewShift({...newShift, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Optional notes..."
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-200 disabled:opacity-50"
                  >
                    {submitLoading ? 'Adding...' : 'Add Shift'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Shift Modal */}
      {showEditModal && selectedShift && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Edit Shift</h3>
                <button
                  onClick={() => handleDeleteShift(selectedShift._id)}
                  className="text-red-600 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
              
              <form onSubmit={handleEditShift} className="space-y-4">
                {errors.submit && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {errors.submit}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Employee *</label>
                  <select
                    value={selectedShift.employeeId}
                    onChange={(e) => setSelectedShift({...selectedShift, employeeId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>
                        {emp.name} ({emp.employeeId})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                  <input
                    type="date"
                    value={selectedShift.date ? selectedShift.date.split('T')[0] : ''}
                    onChange={(e) => setSelectedShift({...selectedShift, date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Time *</label>
                    <input
                      type="time"
                      value={selectedShift.startTime}
                      onChange={(e) => setSelectedShift({...selectedShift, startTime: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Time *</label>
                    <input
                      type="time"
                      value={selectedShift.endTime}
                      onChange={(e) => setSelectedShift({...selectedShift, endTime: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Shift Type</label>
                  <select
                    value={selectedShift.shiftType}
                    onChange={(e) => setSelectedShift({...selectedShift, shiftType: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    {shiftTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={selectedShift.notes || ''}
                    onChange={(e) => setSelectedShift({...selectedShift, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Optional notes..."
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-200 disabled:opacity-50"
                  >
                    {submitLoading ? 'Updating...' : 'Update Shift'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftManagement;