// components/admin/ShiftManagement.jsx
import React, { useState, useEffect } from 'react';
import axiosInstance from '../../axiosConfig.jsx';
import { useAuth } from '../../context/AuthContext';

const ShiftManagement = ({ onBack }) => {
  const { user } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignForm, setAssignForm] = useState({
    userId: '',
    shiftType: 'morning',
    strategy: 'userDefined',
    date: '',
    startDate: '',
    notes: ''
  });
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState('');
  const [editForm, setEditForm] = useState({ userId: '', shiftType: 'morning', date: '', notes: '' });

  const getWindowForType = (shiftType, dateStr) => {
    const base = new Date(dateStr);
    const y = base.getFullYear();
    const m = base.getMonth();
    const d = base.getDate();
    const mk = (yy, mm, dd, hh, mi) => new Date(yy, mm, dd, hh, mi, 0, 0);
    switch ((shiftType || '').toLowerCase()) {
      case 'morning':
        return { startTime: mk(y, m, d, 6, 0), endTime: mk(y, m, d, 14, 0) };
      case 'evening':
        return { startTime: mk(y, m, d, 14, 0), endTime: mk(y, m, d, 22, 0) };
      case 'night':
        return { startTime: mk(y, m, d, 22, 0), endTime: mk(y, m, d + 1, 6, 0) };
      default:
        return null;
    }
  };

  const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && aEnd > bStart;

  useEffect(() => {
    fetchShifts();
    fetchUsers();
  }, []);

  const fetchShifts = async () => {
    try {
      let response;
      try {
        response = await axiosInstance.get('/api/shifts/all');
      } catch (err) {
        if (err?.response?.status === 404) {
          // Fallback to Assignment2-style endpoint
          response = await axiosInstance.get('/api/shifts');
        } else {
          throw err;
        }
      }
      setShifts(response.data || []);
    } catch (error) {
      console.error('Error fetching shifts:', error);
      const msg = error?.response?.data?.message || error?.message || 'Failed to fetch shifts';
      alert(`Failed to fetch shifts: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      // Reuse existing admin employees list
      const response = await axiosInstance.get('/api/auth/employees');
      if (response.data?.employees) {
        setUsers(response.data.employees);
      } else {
        // fallback: attempt another admin users endpoint if exists
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  const handleAssignShift = async (e) => {
    e.preventDefault();
    try {
      const base = {
        userId: assignForm.userId,
        shiftType: assignForm.shiftType,
        strategy: assignForm.strategy,
        notes: assignForm.notes
      };
      const payload = assignForm.strategy === 'autoWeekly'
        ? { ...base, startDate: assignForm.startDate }
        : { ...base, date: assignForm.date };

      if (assignForm.strategy === 'autoWeekly') {
        if (!assignForm.startDate) throw new Error('Start Date is required');
        const baseDate = new Date(assignForm.startDate);
        const conflicts = [];
        for (let i = 0; i < 7; i += 1) {
          const d = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + i);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const win = getWindowForType(assignForm.shiftType, `${yyyy}-${mm}-${dd}`);
          const hasConflict = shifts.some(s => overlaps(new Date(s.startTime), new Date(s.endTime), win.startTime, win.endTime));
          if (hasConflict) conflicts.push(`${yyyy}-${mm}-${dd}`);
        }
        if (conflicts.length > 0) {
          alert(`Assignment blocked. Conflicts on: ${conflicts.join(', ')}`);
          return;
        }
      } else {
        if (!assignForm.date) throw new Error('Date is required');
        const win = getWindowForType(assignForm.shiftType, assignForm.date);
        const hasConflict = shifts.some(s => overlaps(new Date(s.startTime), new Date(s.endTime), win.startTime, win.endTime));
        if (hasConflict) {
          alert('Assignment blocked. There is already a shift in this time window.');
          return;
        }
      }

      await axiosInstance.post('/api/shifts/assign', payload);
      alert('Shift assigned successfully');
      setShowAssignForm(false);
      setAssignForm({
        userId: '',
        shiftType: 'morning',
        strategy: 'userDefined',
        date: '',
        startDate: '',
        notes: ''
      });
      fetchShifts();
    } catch (error) {
      console.error('Error assigning shift:', error);
      alert(error.response?.data?.message || 'Failed to assign shift');
    }
  };

  const openEditShift = (shift) => {
    setEditingShiftId(shift._id);
    const dateStr = new Date(shift.startTime);
    const yyyy = dateStr.getFullYear();
    const mm = String(dateStr.getMonth() + 1).padStart(2, '0');
    const dd = String(dateStr.getDate()).padStart(2, '0');
    setEditForm({
      userId: shift.userId?._id || '',
      shiftType: shift.shiftType,
      date: `${yyyy}-${mm}-${dd}`,
      notes: shift.notes || ''
    });
    setShowEditForm(true);
  };

  const handleEditShift = async (e) => {
    e.preventDefault();
    try {
      const win = getWindowForType(editForm.shiftType, editForm.date);
      const hasConflict = shifts.some(s => s._id !== editingShiftId && overlaps(new Date(s.startTime), new Date(s.endTime), win.startTime, win.endTime));
      if (hasConflict) {
        alert('Update blocked. There is already a shift in this time window.');
        return;
      }

      await axiosInstance.put(`/api/shifts/${editingShiftId}`, {
        userId: editForm.userId,
        shiftType: editForm.shiftType,
        date: editForm.date,
        notes: editForm.notes
      });
      alert('Shift updated successfully');
      setShowEditForm(false);
      setEditingShiftId('');
      fetchShifts();
    } catch (error) {
      console.error('Error updating shift:', error);
      alert(error.response?.data?.message || 'Failed to update shift');
    }
  };

  const handleDeleteShift = async (shiftId) => {
    if (window.confirm('Are you sure you want to delete this shift?')) {
      try {
        await axiosInstance.delete(`/api/shifts/${shiftId}`);
        alert('Shift deleted successfully');
        fetchShifts();
      } catch (error) {
        console.error('Error deleting shift:', error);
        alert('Failed to delete shift');
      }
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
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading shifts...</p>
        </div>
      </div>
    );
  }

  return (
    <main>
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
           <button
          onClick={onBack}
          className="text-lg text-gray-600 hover:text-gray-300 font-medium inline-flex items-center transition duration-200">
          ← Back to Dashboard
        </button>
      </div>
      

      <div className="flex justify-between items-center mb-8">
        <div>
        <h2 className="text-2xl font-bold text-gray-900"
            style={{ textShadow: '2px 2px 4px white' }}>Shift Management</h2>
          <p className="text-lg text-gray-500 mt-2">Manage employee shifts and schedules</p>
        </div>
                <button
          onClick={() => setShowAssignForm(true)}
          className="bg-[#2E4A8A] text-white px-4 py-2 rounded-lg shadow-md hover:bg-white hover:text-black transition duration-200"
        >
          Assign New Shift
        </button>
      </div>

      {showAssignForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 max-w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Assign New Shift</h3>
            <form onSubmit={handleAssignShift}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">User</label>
                <select value={assignForm.userId} onChange={(e) => setAssignForm({...assignForm, userId: e.target.value})} className="w-full p-2 border rounded" required>
                  <option value="">Select User</option>
                  {users.map(u => (
                    <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Shift Type</label>
                <select value={assignForm.shiftType} onChange={(e) => setAssignForm({...assignForm, shiftType: e.target.value})} className="w-full p-2 border rounded" required>
                  <option value="morning">Morning (6:00 AM - 2:00 PM)</option>
                  <option value="evening">Evening (2:00 PM - 10:00 PM)</option>
                  <option value="night">Night (10:00 PM - 6:00 AM)</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Strategy</label>
                <select value={assignForm.strategy} onChange={(e) => setAssignForm({ ...assignForm, strategy: e.target.value })} className="w-full p-2 border rounded">
                  <option value="userDefined">User Defined (single day)</option>
                  <option value="autoWeekly">Auto Weekly (7 days)</option>
                </select>
              </div>

              {assignForm.strategy === 'autoWeekly' ? (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Start Date</label>
                  <input type="date" value={assignForm.startDate} onChange={(e) => setAssignForm({ ...assignForm, startDate: e.target.value })} className="w-full p-2 border rounded" required />
                </div>
              ) : (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Date</label>
                  <input type="date" value={assignForm.date} onChange={(e) => setAssignForm({ ...assignForm, date: e.target.value })} className="w-full p-2 border rounded" required />
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Notes</label>
                <textarea value={assignForm.notes} onChange={(e) => setAssignForm({...assignForm, notes: e.target.value})} className="w-full p-2 border rounded" rows="3" />
              </div>

              <div className="flex gap-2">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Assign Shift</button>
                <button type="button" onClick={() => setShowAssignForm(false)} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr>
              <th>Employee Name</th>
              <th>Shift Type</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Status</th>
              <th>Assigned By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((shift) => (
              <tr key={shift._id}>
                <td className="px-4 py-2 border">{shift.userId?.name || 'Unknown User'}</td>
                <td className="px-4 py-2 border"><span className={`px-2 py-1 rounded text-xs ${getShiftTypeColor(shift.shiftType)}`}>{shift.shiftType}</span></td>
                <td className="px-4 py-2 border">{formatDateTime(shift.startTime)}</td>
                <td className="px-4 py-2 border">{formatDateTime(shift.endTime)}</td>
                <td className="px-4 py-2 border"><span className={`px-2 py-1 rounded text-xs ${getStatusColor(shift.status)}`}>{shift.status}</span></td>
                <td className="px-4 py-2 border">{shift.assignedBy?.name || 'Unknown'}</td>
                <td className="px-4 py-2 border">
                  <button onClick={() => openEditShift(shift)} className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600 mr-2">Edit</button>
                  <button onClick={() => handleDeleteShift(shift._id)} className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showEditForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 max-w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Edit Shift</h3>
            <form onSubmit={handleEditShift}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">User</label>
                <select value={editForm.userId} onChange={(e) => setEditForm({ ...editForm, userId: e.target.value })} className="w-full p-2 border rounded" required>
                  <option value="">Select User</option>
                  {users.map(u => (<option key={u._id} value={u._id}>{u.name} ({u.email})</option>))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Shift Type</label>
                <select value={editForm.shiftType} onChange={(e) => setEditForm({ ...editForm, shiftType: e.target.value })} className="w-full p-2 border rounded" required>
                  <option value="morning">Morning (6:00 AM - 2:00 PM)</option>
                  <option value="evening">Evening (2:00 PM - 10:00 PM)</option>
                  <option value="night">Night (10:00 PM - 6:00 AM)</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Date</label>
                <input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} className="w-full p-2 border rounded" required />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Notes</label>
                <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} className="w-full p-2 border rounded" rows="3" />
              </div>

              <div className="flex gap-2">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Save</button>
                <button type="button" onClick={() => setShowEditForm(false)} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </main>
  );
};

export default ShiftManagement;