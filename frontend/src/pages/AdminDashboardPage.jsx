import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// Import all management components
import LeaveManagement from '../components/admin/LeaveManagement';
import EmployeeManagement from '../components/admin/EmployeeManagement';
import ShiftManagement from '../components/admin/ShiftManagement';
import OvertimeTracking from '../components/admin/OvertimeTracking';
import AnalyticsReports from '../components/admin/AnalyticsReports';
import SystemSettings from '../components/admin/SystemSettings';

const API_BASE = 'http://localhost:5001';

// helpers to build a YYYY-MM-DD range (this month)
function toYYYYMMDD(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
function getThisMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: toYYYYMMDD(start), to: toYYYYMMDD(end) };
}

const AdminDashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('dashboard');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Dashboard stats (these drive the 4 cards)
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    onLeave: 0,
    lateArrivals: 0,            // not provided by summary API (placeholder)
    pendingLeaveRequests: 0,    // not provided by summary API (placeholder)
    overtimeHours: 0,
    newRegistrations: 0,        // placeholder
    systemUptime: '—'           // placeholder
  });

  // Load summary when the page mounts (and every minute to keep “Present” fresh)
  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('token');
        const { from, to } = getThisMonthRange();

        const params = new URLSearchParams({
          from,
          to,
          _: Date.now().toString(), // cache-buster
        });

        const response = await fetch(`${API_BASE}/api/admin/summary?${params.toString()}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          cache: 'no-store'
        });

        if (!response.ok) {
          console.error('Summary HTTP error:', response.status);
          return;
        }

        const json = await response.json();
        if (!json?.success) {
          console.error('Summary API returned success=false:', json);
          return;
        }

        const s = json.summary || {};
        setStats(prev => ({
          ...prev,
          totalEmployees: Number(s.totalEmployees ?? 0),
          presentToday: Number(s.activeEmployeesNow ?? 0),
          onLeave: Number(s.totalLeavesApproved ?? 0),
          overtimeHours: Number(s.overtimeHours ?? 0)
          // pendingLeaveRequests / lateArrivals / newRegistrations are placeholders
        }));
      } catch (err) {
        console.error('Failed to load company summary:', err);
      }
    };

    // initial load
    load();

    // refresh every 60s so “Present” stays current
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  // Clock tick every minute (UI nicety)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigateToView = (view) => setCurrentView(view);

  const quickActions = [
    {
      icon: <img src="/emplyee.svg" alt="employee management" className="h-20" />,
      title: 'Employee Management',
      description: 'Add, edit, or manage employee accounts',
      count: stats.totalEmployees,
      color: 'blue',
      action: () => setCurrentView('employees')
    },
    {
      icon: <img src="/leaveRequest.svg" alt="leave request" className="h-20" />,
      title: 'Leave Requests',
      description: 'Review and approve pending leave requests',
      count: stats.pendingLeaveRequests,
      color: 'blue',
      action: () => setCurrentView('leaves')
    },
    {
      icon: <img src="/calendar.svg" alt="calendar" className="h-20" />,
      title: 'Shift Management',
      description: 'Assign and schedule employee shifts',
      count: '24/7',
      color: 'blue',
      action: () => setCurrentView('shifts')
    },
    {
      icon: <img src="/overtime.svg" alt="overtime" className="h-20" />,
      title: 'Overtime Tracking',
      description: 'Monitor and approve overtime hours',
      count: `${stats.overtimeHours}h`,
      color: 'blue',
      action: () => setCurrentView('overtime')
    },
    {
      icon: '📊',
      title: 'Analytics & Reports',
      description: 'Generate detailed attendance reports',
      count: 'View',
      color: 'blue',
      action: () => setCurrentView('analytics')
    },
  ];

  const getColorClasses = (color) => {
    const colors = { blue: 'bg-gray-50 border-[#2E4A8A]]-800 text-black' };
    return colors[color] || colors.blue;
  };
  const getButtonColorClasses = (color) => {
    const colors = { blue: 'bg-[#2E4A8A] text-white hover:bg-[#1b2a4a]' };
    return colors[color] || colors.blue;
  };

  // View switcher
  const renderCurrentView = () => {
    switch (currentView) {
      case 'leaves':
        return <LeaveManagement onBack={() => setCurrentView('dashboard')} />;
      case 'employees':
        return <EmployeeManagement onBack={() => setCurrentView('dashboard')} />;
      case 'shifts':
        return <ShiftManagement onBack={() => setCurrentView('dashboard')} />;
      case 'overtime':
        return <OvertimeTracking onBack={() => setCurrentView('dashboard')} />;
      case 'analytics':
        return <AnalyticsReports onBack={() => setCurrentView('dashboard')} />;
      case 'settings':
        return <SystemSettings onBack={() => setCurrentView('dashboard')} />;
      default:
        return renderDashboardView();
    }
  };

  // Dashboard cards (now driven by API)
  const renderDashboardView = () => (
    <>
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Employees</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalEmployees}</p>
              <p className="text-xs text-green-600 mt-1">↗ +3 this month</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Present</p>
              <p className="text-3xl font-bold text-gray-900">{stats.presentToday}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.totalEmployees ? ((stats.presentToday / stats.totalEmployees) * 100).toFixed(1) : '0.0'}% attendance
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">On Leave</p>
              <p className="text-3xl font-bold text-gray-900">{stats.onLeave}</p>
              <p className="text-xs text-yellow-600 mt-1">{stats.pendingLeaveRequests} pending requests</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📝</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overtime Hours</p>
              <p className="text-3xl font-bold text-gray-900">{stats.overtimeHours}</p>
              <p className="text-xs text-purple-600 mt-1">This month</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">⏰</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {quickActions.map((action, index) => (
                <div
                  key={index}
                  className={`border-2 rounded-xl p-6 transition-all duration-200 hover:shadow-md cursor-pointer ${getColorClasses(action.color)}`}
                  onClick={action.action}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-3xl">{action.icon}</div>
                    <div className="text-right">
                      <span className="text-2xl font-bold">{action.count}</span>
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{action.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{action.description}</p>
                  <button
                    className={`w-full text-white py-2 px-4 rounded-lg font-medium transition duration-200 ${getButtonColorClasses(action.color)}`}
                  >
                    Manage
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Admin Profile Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-4 border-b border-gray-200">
          Administrator Profile
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Full Name</label>
            <p className="text-gray-900 font-medium bg-gray-50 px-4 py-3 rounded-lg">{user?.name}</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Email</label>
            <p className="text-gray-900 font-medium bg-gray-50 px-4 py-3 rounded-lg">{user?.email}</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Role</label>
            <p className="text-gray-900 font-medium bg-red-50 px-4 py-3 rounded-lg capitalize text-red-700">
              {user?.role}
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Department</label>
            <p className="text-gray-900 font-medium bg-gray-50 px-4 py-3 rounded-lg">{user?.department}</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Employee ID</label>
            <p className="text-gray-900 font-medium bg-blue-50 px-4 py-3 rounded-lg text-blue-700">
              {user?.employeeId}
            </p>
          </div>
        </div>
      </div>
    </>
  );

  const getCurrentViewTitle = () => {
    switch (currentView) {
      case 'dashboard': return 'Admin Dashboard';
      case 'leaves': return 'Leave Management';
      case 'employees': return 'Employee Management';
      case 'shifts': return 'Shift Management';
      case 'overtime': return 'Overtime Tracking';
      case 'analytics': return 'Analytics & Reports';
      case 'settings': return 'System Settings';
      default: return 'Admin Dashboard';
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen"
      style={{ fontFamily: 'Afacad, sans-serif' }}>
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="flex items-center h-16">
          <img src="/timetrackr11_page.svg" alt="TimeTrackr11" className="h-10 ml-10" />
          <div className="flex-1 mx-auto px-4">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">
                  {currentTime.toLocaleString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">Welcome, {user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.department} • {user?.employeeId}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-medium">
                    Administrator
                  </span>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-1 text-[#2E4A8A] rounded-[9px] hover:bg-[#2E4A8A] hover:text-white mr-2"
                  >
                    Logout
                  </button>
                  <button
                    onClick={() => navigateToView('profile')}
                    className="px-4 py-1 group flex items-center justify-center">
                    <img src="/profile.svg" alt="Profile Logo" className="h-12 block group-hover:hidden" />
                    <img src="/profile_hover.svg" alt="Hover Profile Logo" className="h-12 hidden group-hover:block" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {renderCurrentView()}
      </main>
    </div>
  );
};

export default AdminDashboardPage;
