// components/employee/MyLeaves.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axiosInstance from '../../axiosConfig';

const MyLeaves = ({ onBack }) => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    page: 1
  });

  const [newLeave, setNewLeave] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const [errors, setErrors] = useState({});
  const [submitLoading, setSubmitLoading] = useState(false);

  const leaveTypes = {
    annual: 'Annual Leave',
    sick: 'Sick Leave',
    personal: 'Personal Leave',
    maternity: 'Maternity Leave',
    paternity: 'Paternity Leave',
    emergency: 'Emergency Leave',
    unpaid: 'Unpaid Leave'
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800'
  };

  useEffect(() => {
    fetchLeaves();
    fetchBalance();
  }, [filters]);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      queryParams.append('page', filters.page);
      queryParams.append('limit', '10');

      const { data } = await axiosInstance.get(`/api/leaves/my-leaves?${queryParams}`);
      if (data.success) {
        setLeaves(data.leaves);
      }
    } catch (error) {
      console.error('Error fetching leaves:', error);
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBalance = async () => {
    try {
      const { data } = await axiosInstance.get('/api/leaves/balance');
      if (data.success) {
        setBalance(data.balance);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const validateLeave = () => {
    const newErrors = {};

    if (!newLeave.leaveType) {
      newErrors.leaveType = 'Leave type is required';
    }

    if (!newLeave.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!newLeave.endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (!newLeave.reason.trim()) {
      newErrors.reason = 'Reason is required';
    }

    if (newLeave.startDate && newLeave.endDate) {
      const start = new Date(newLeave.startDate);
      const end = new Date(newLeave.endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (start < today) {
        newErrors.startDate = 'Start date cannot be in the past';
      }

      if (end < start) {
        newErrors.endDate = 'End date cannot be before start date';
      }

      // Check if user has enough leave balance
      if (balance && newLeave.leaveType && balance[newLeave.leaveType]) {
        const requestedDays = calculateDays();
        const remaining = balance[newLeave.leaveType].remaining;
        if (requestedDays > remaining && newLeave.leaveType !== 'unpaid') {
          newErrors.leaveType = `Not enough ${leaveTypes[newLeave.leaveType]} balance. Available: ${remaining} days`;
        }
      }
    }

    return newErrors;
  };

  const calculateDays = () => {
    if (newLeave.startDate && newLeave.endDate) {
      const start = new Date(newLeave.startDate);
      const end = new Date(newLeave.endDate);
      let workingDays = 0;
      
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dayOfWeek = date.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
          workingDays++;
        }
      }
      
      return workingDays;
    }
    return 0;
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setErrors({});

    const validationErrors = validateLeave();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSubmitLoading(false);
      return;
    }

    try {
      const { data } = await axiosInstance.post('/api/leaves', newLeave);

      if (data.success) {
        setLeaves([data.leave, ...leaves]);
        setShowApplyModal(false);
        setNewLeave({
          leaveType: '',
          startDate: '',
          endDate: '',
          reason: ''
        });
        fetchBalance(); // Refresh balance
        setErrors({});
      }
    } catch (error) {
      console.error('Error applying leave:', error);
      setErrors({ submit: error.response?.data?.message || 'Failed to apply for leave' });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCancelLeave = async (leaveId) => {
    if (!window.confirm('Are you sure you want to cancel this leave request?')) {
      return;
    }

    try {
      const { data } = await axiosInstance.patch(`/api/leaves/${leaveId}/cancel`);

      if (data.success) {
        setLeaves(leaves.map(leave => 
          leave._id === leaveId ? { ...leave, status: 'cancelled' } : leave
        ));
        fetchBalance(); // Refresh balance
      }
    } catch (error) {
      console.error('Error cancelling leave:', error);
      alert('Failed to cancel leave request');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTodayDate = () => {
    const today = new Date();
    today.setDate(today.getDate() + 1); // Minimum tomorrow
    return today.toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your leaves...</p>
        </div>
      </div>
    );
  }

  return (
  <main style={{
              minHeight: "100vh",
              width: "100%",
              backgroundImage: "url('/background.png')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              fontFamily: "Afacad, sans-serif"
            }}>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="text-gray-100 hover:text-gray-300 font-medium inline-flex items-center transition duration-200"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Leave Requests</h2>
            <p className="text-gray-300 mt-2">Manage your leave applications and view balance</p>
          </div>
          <button
            onClick={() => setShowApplyModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
          >
            Apply for Leave
          </button>
        </div>

        {/* Leave Balance Cards */}
        {balance && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Annual Leave</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Allowed:</span>
                  <span className="text-sm font-medium">{balance.annual?.allowed || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Used:</span>
                  <span className="text-sm font-medium">{balance.annual?.used || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Remaining:</span>
                  <span className="text-sm font-medium text-green-600">{balance.annual?.remaining || 0}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Sick Leave</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Allowed:</span>
                  <span className="text-sm font-medium">{balance.sick?.allowed || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Used:</span>
                  <span className="text-sm font-medium">{balance.sick?.used || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Remaining:</span>
                  <span className="text-sm font-medium text-green-600">{balance.sick?.remaining || 0}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Leave</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Allowed:</span>
                  <span className="text-sm font-medium">{balance.personal?.allowed || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Used:</span>
                  <span className="text-sm font-medium">{balance.personal?.used || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Remaining:</span>
                  <span className="text-sm font-medium text-green-600">{balance.personal?.remaining || 0}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Emergency Leave</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Allowed:</span>
                  <span className="text-sm font-medium">{balance.emergency?.allowed || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Used:</span>
                  <span className="text-sm font-medium">{balance.emergency?.used || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Remaining:</span>
                  <span className="text-sm font-medium text-green-600">{balance.emergency?.remaining || 0}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filter Leave Requests</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="md:col-span-2 flex items-end">
              <button
                onClick={() => setFilters({ status: '', page: 1 })}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition duration-200"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Leave Requests Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Your Leave Requests</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Leave Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaves.map((leave) => (
                  <tr key={leave._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {leaveTypes[leave.leaveType]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{formatDate(leave.startDate)}</div>
                      <div className="text-gray-500">to {formatDate(leave.endDate)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {leave.totalDays} day{leave.totalDays !== 1 ? 's' : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[leave.status]}`}>
                        {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {leave.reason}
                      {leave.rejectionReason && (
                        <div className="text-red-600 text-xs mt-1">
                          Rejected: {leave.rejectionReason}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {leave.status === 'pending' ? (
                        <button
                          onClick={() => handleCancelLeave(leave._id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Cancel
                        </button>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {leaves.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No leave requests found</p>
            </div>
          )}
        </div>

        {/* Apply Leave Modal */}
        {showApplyModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Apply for Leave</h3>
                
                <form onSubmit={handleApplyLeave} className="space-y-4">
                  {errors.submit && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                      {errors.submit}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type *</label>
                      <select
                        value={newLeave.leaveType}
                        onChange={(e) => setNewLeave({...newLeave, leaveType: e.target.value})}
                        className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                          errors.leaveType ? 'border-red-300' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select Leave Type</option>
                        {Object.entries(leaveTypes).map(([key, value]) => (
                          <option key={key} value={key}>
                            {value}
                            {balance && balance[key] && ` (${balance[key].remaining} remaining)`}
                          </option>
                        ))}
                      </select>
                      {errors.leaveType && <p className="mt-1 text-sm text-red-600">{errors.leaveType}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                      <input
                        type="date"
                        value={newLeave.startDate}
                        onChange={(e) => setNewLeave({...newLeave, startDate: e.target.value})}
                        min={getTodayDate()}
                        className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                          errors.startDate ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                      <input
                        type="date"
                        value={newLeave.endDate}
                        onChange={(e) => setNewLeave({...newLeave, endDate: e.target.value})}
                        min={newLeave.startDate || getTodayDate()}
                        className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                          errors.endDate ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700">
                        {calculateDays()} working day{calculateDays() !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reason *</label>
                    <textarea
                      value={newLeave.reason}
                      onChange={(e) => setNewLeave({...newLeave, reason: e.target.value})}
                      placeholder="Please provide a reason for your leave request..."
                      rows={4}
                      maxLength={500}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                        errors.reason ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.reason && <p className="mt-1 text-sm text-red-600">{errors.reason}</p>}
                    <p className="mt-1 text-xs text-gray-500">{newLeave.reason.length}/500 characters</p>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowApplyModal(false)}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition duration-200 disabled:opacity-50"
                    >
                      {submitLoading ? 'Submitting...' : 'Submit Application'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default MyLeaves;