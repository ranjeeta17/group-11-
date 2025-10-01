import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';

function toYYYYMMDD(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function rangeFromDateRange(dateRange) {
  const now = new Date();
  let from, to;
  switch (dateRange) {
    case 'today': {
      const s = new Date(now); s.setHours(0,0,0,0);
      const e = new Date(now); e.setHours(23,59,59,999);
      from = toYYYYMMDD(s); to = toYYYYMMDD(e);
      break;
    }
    case 'this_week': {
      const dow = now.getDay() || 7; // Mon..Sun
      const start = new Date(now); start.setDate(now.getDate() - (dow - 1)); start.setHours(0,0,0,0);
      const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999);
      from = toYYYYMMDD(start); to = toYYYYMMDD(end);
      break;
    }
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      from = toYYYYMMDD(start); to = toYYYYMMDD(end);
      break;
    }
    case 'this_year': {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      from = toYYYYMMDD(start); to = toYYYYMMDD(end);
      break;
    }
    case 'this_month':
    default: {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      from = toYYYYMMDD(start); to = toYYYYMMDD(end);
    }
  }
  return { from, to };
}

const API_BASE = 'http://localhost:5001';

const AnalyticsReports = ({ onBack }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('this_month');

  // Department filter
  const [departments, setDepartments] = useState(['All Departments']);
  const [selectedDept, setSelectedDept] = useState('All Departments');

  // Company summary (supports department filter)
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Employee summary
  const [employeeId, setEmployeeId] = useState('');
  const [employeeSummary, setEmployeeSummary] = useState(null);
  const [empLoading, setEmpLoading] = useState(false);

  // Report generator (optional)
  const [reportType, setReportType] = useState('attendance');
  const [generateLoading, setGenerateLoading] = useState(false);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'attendance', label: 'Employee Summary' },
  ];

  const reportTypes = [
    { value: 'attendance', label: 'Attendance Report' },
    { value: 'leaves', label: 'Leave Report' },
    { value: 'overtime', label: 'Overtime Report' },
    { value: 'payroll', label: 'Payroll Summary' },
    { value: 'department', label: 'Department Analysis' },
    { value: 'employee', label: 'Employee Performance' }
  ];

  const { from, to } = useMemo(() => rangeFromDateRange(dateRange), [dateRange]);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/auth/employees`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
          
        });
        const data = await res.json();
        if (data?.success && Array.isArray(data.employees)) {
          const uniq = Array.from(
            new Set(
              data.employees
                .map(e => (e.department || '').trim())
                .filter(Boolean)
            )
          ).sort();
          setDepartments(['All Departments', ...uniq]);
        } else {
          setDepartments(['All Departments']);
        }
      } catch (e) {
        console.error('Load departments error:', e);
        setDepartments(['All Departments']);
      }
    })();
  }, []);

  useEffect(() => {
    fetchCompanySummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, selectedDept]);

  async function fetchCompanySummary() {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ from, to });
      if (selectedDept && selectedDept !== 'All Departments') {
        params.append('department', selectedDept);
      }

      const response = await fetch(`${API_BASE}/api/admin/summary?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data?.success) {
        setSummary(data.summary);
      } else {
        console.error('Failed to fetch company summary', data);
        setSummary(null);
      }
    } catch (err) {
      console.error('Company summary error:', err);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }

  async function fetchEmployeeSummary() {
    if (!employeeId.trim()) return;
    setEmpLoading(true);
    try {
      const token = localStorage.getItem('token');
      const qs = new URLSearchParams({ from, to }).toString();
      const safeId = encodeURIComponent(employeeId.trim());

      const response = await fetch(`${API_BASE}/api/admin/employee/${safeId}/summary?${qs}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }, cache: 'no-store'
      });

      const data = await response.json();
      if (data?.success) {
        setEmployeeSummary(data.employee);
      } else {
        console.error('Failed to fetch employee summary', data);
        setEmployeeSummary(null);
      }
    } catch (err) {
      console.error('Employee summary error:', err);
      setEmployeeSummary(null);
    } finally {
      setEmpLoading(false);
    }
  }

  
  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
            <div className="ml-4">
              <h4 className="text-lg font-medium text-gray-900 mb-1">
                Total Employees {selectedDept !== 'All Departments' ? `(${selectedDept})` : ''}
              </h4>
              <p className="text-3xl font-bold text-blue-600">{summary?.totalEmployees ?? '—'}</p>
              <p className="text-sm text-gray-500">
                {selectedDept === 'All Departments' ? 'Company-wide' : 'Filtered by department'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-2">Present Today</h4>
          <p className="text-3xl font-bold text-green-600">{summary?.activeEmployeesNow ?? '—'}</p>
          <p className="text-sm text-gray-500">Logged in (not logged out)</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-2">Approved Leaves</h4>
          <p className="text-3xl font-bold text-yellow-600">{summary?.totalLeavesApproved ?? '—'}</p>
          <p className="text-sm text-gray-500">Overlapping {from} → {to}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-2">Overtime (hrs)</h4>
          <p className="text-3xl font-bold text-indigo-600">{summary?.overtimeHours ?? '—'}</p>
          <p className="text-sm text-gray-500">Approved overtime in range</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-2">Range</h4>
          <p className="text-lg text-gray-900">{from} → {to}</p>
          <p className="text-sm text-gray-500">Australia/Brisbane</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-2">Performance</h4>
          <p className="text-3xl font-bold text-green-600">Good</p>
          <p className="text-sm text-gray-500">Demo label</p>
        </div>
      </div>
    </div>
  );

  const renderEmployeeSummary = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Lookup Employee Summary</h3>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <input
            type="text"
            placeholder="Enter Employee ID (e.g., E0001)"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="bg-white border px-4 py-2 rounded-md text-black w-full sm:w-64"
          />
          <button
            onClick={fetchEmployeeSummary}
            disabled={empLoading || !employeeId.trim()}
            className="bg-[#2E4A8A] text-white px-4 py-2 rounded-md shadow hover:bg-white hover:text-black transition"
          >
            {empLoading ? 'Loading...' : 'Fetch'}
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">Range: {from} → {to}</p>
      </div>

      {employeeSummary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-2">Profile</h4>
            <div className="text-sm text-gray-800 space-y-1">
              <div><span className="font-semibold">Name:</span> {employeeSummary.profile?.name}</div>
              <div><span className="font-semibold">Email:</span> {employeeSummary.profile?.email}</div>
              <div><span className="font-semibold">Department:</span> {employeeSummary.profile?.department}</div>
              <div><span className="font-semibold">Role:</span> {employeeSummary.profile?.role}</div>
              <div><span className="font-semibold">Employee ID:</span> {employeeSummary.profile?.employeeId}</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-2">Attendance</h4>
            <div className="text-sm text-gray-800 space-y-1">
              <div><span className="font-semibold">Present Days:</span> {employeeSummary.presentDays}</div>
              <div><span className="font-semibold">Present Today:</span> {employeeSummary.openSessionNow ? 'Yes' : 'No'}</div>
              <div><span className="font-semibold">Last Login (UTC):</span> {employeeSummary.lastLoginAt ? new Date(employeeSummary.lastLoginAt).toLocaleString() : '—'}</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-2">Leave & Overtime</h4>
            <div className="text-sm text-gray-800 space-y-1">
              <div><span className="font-semibold">Approved Leaves:</span> {employeeSummary.leavesApproved?.count}</div>
              <div><span className="font-semibold">Total Leave Days:</span> {employeeSummary.leavesApproved?.totalDays}</div>
              <div><span className="font-semibold">Overtime (hrs):</span> {employeeSummary.overtimeHours}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderCurrentTab = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'attendance': return renderEmployeeSummary();
      default: return renderOverview();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-lg text-white hover:text-gray-300 font-medium inline-flex items-center transition duration-200">
          ← Back to Dashboard
        </button>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900" style={{ textShadow: '2px 2px 4px white' }}>
            Analytics & Reports
          </h2>
          <p className="text-lg text-gray-300 mt-2">
            {selectedDept === 'All Departments' ? 'Company summary' : `Department: ${selectedDept}`}
          </p>
        </div>

        {/* Report generator */}
        <div className="flex space-x-3">
          <select 
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="bg-white text-black px-4 py-2 rounded-lg shadow-md transition duration-200"
          >
            {reportTypes.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
         
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-4 py-4 text-lg font-medium border-b-2 ${
                activeTab === tab.id
                  ? 'bg-white text-[#2E4A8A] font-semibold rounded-t-lg px-3'
                  : 'border-transparent text-white hover:text-[#2E4A8A] hover:border-gray-300'
              }`}>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Range + Department selectors */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex space-x-3">
          {/* <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-white text-black px-4 py-2 rounded-lg shadow-md transition duration-200"
          >
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_year">This Year</option>
          </select>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-white text-black px-4 py-2 rounded-lg shadow-md transition duration-200"
          >
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select> */}
        </div>

        {selectedDept !== 'All Departments' && (
          <button
            onClick={() => setSelectedDept('All Departments')}
            className="text-sm text-white underline hover:text-[#2E4A8A]"
          >
            Clear department filter
          </button>
        )}
      </div>

      {/* Content */}
      {renderCurrentTab()}
    </div>
  );
};

export default AnalyticsReports;
