// src/pages/AdminDashboardPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

import LeaveManagement from '../components/admin/LeaveManagement';
import EmployeeManagement from '../components/admin/EmployeeManagement';
import ShiftManagement from '../components/admin/ShiftManagement';
import OvertimeTracking from '../components/admin/OvertimeTracking';
import AnalyticsReports from '../components/admin/AnalyticsReports';
import SystemSettings from '../components/admin/SystemSettings';
import axiosInstance from '../axiosConfig';

const AdminDashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [currentView, setCurrentView] = useState('dashboard');
  const [currentTime, setCurrentTime] = useState(new Date());

  const [loadingTiles, setLoadingTiles] = useState(true);
  const [tilesError, setTilesError] = useState('');

  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    onLeave: 0,
    pendingLeaveRequests: 0,
    overtimeHours: 0,            // this week
    systemUptime: '—'
  });
  
  // const [recentActivities, setRecentActivities] = useState([
  //   {
  //     id: 1,
  //     icon: '👤',
  //     message: 'Sarah Johnson registered as new employee',
  //     time: '2 minutes ago',
  //     type: 'registration'
  //   },
  //   {
  //     id: 2,
  //     icon: '📝',
  //     message: 'Mike Chen submitted leave request for Dec 25-27',
  //     time: '15 minutes ago',
  //     type: 'leave'
  //   },
  //   {
  //     id: 3,
  //     icon: '✅',
  //     message: 'Alice Brown checked in at 9:15 AM',
  //     time: '32 minutes ago',
  //     type: 'attendance'
  //   },
  //   {
  //     id: 4,
  //     icon: '⏰',
  //     message: 'David Lee worked 2 hours overtime yesterday',
  //     time: '1 hour ago',
  //     type: 'overtime'
  //   },
  //   {
  //     id: 5,
  //     icon: '🎯',
  //     message: 'Weekly attendance report generated',
  //     time: '2 hours ago',
  //     type: 'report'
  //   }
  // ]);

  // tick clock each minute
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // ---- Helpers for date ranges ----
  const todayISO = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const da = `${d.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${da}`; // YYYY-MM-DD
  }, []);

  const weekRange = useMemo(() => {
    // Monday -> Sunday in local time
    const now = new Date();
    const day = now.getDay() || 7; // 1..7 (Mon..Sun)
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(now.getDate() - (day - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const toISO = (d) => d.toISOString().slice(0, 10);
    return { from: toISO(monday), to: toISO(sunday) };
  }, []);

  // ---- Fetch & compute tiles from APIs ----
  useEffect(() => {
    const loadTiles = async () => {
      setLoadingTiles(true);
      setTilesError('');

      try {
        // employees + leaves + presentToday
        const [empRes, leavesRes, presentRes] = await Promise.all([
          axiosInstance.get('/api/auth/employees'),
          axiosInstance.get('/api/leaves/admin/leaves', { params: { page: 1, limit: 200 } }),
          axiosInstance.get('/api/admin/present-today')
        ]);

        const totalEmployees = empRes?.data?.employees?.length || 0;

        const leaves = leavesRes?.data?.leaves || [];
        const today = new Date(todayISO);
        const onLeave = leaves.filter(l =>
          l.status === 'approved' &&
          new Date(l.startDate) <= today &&
          new Date(l.endDate) >= today
        ).length;
        const pendingLeaveRequests = leaves.filter(l => l.status === 'pending').length;

        const presentToday = presentRes?.data?.count ?? 0;

        const overtimeHours = 0; // placeholder, add later

        setStats(prev => ({
          ...prev,
          totalEmployees,
          presentToday,
          onLeave,
          pendingLeaveRequests,
          overtimeHours,
          systemUptime: '99.8%'
        }));
      } catch (err) {
        console.error('Admin tiles load error:', err);
        setTilesError(err?.response?.data?.message || 'Failed to load dashboard data');
      } finally {
        setLoadingTiles(false);
      }
    };


    loadTiles();
  }, [todayISO, weekRange.from, weekRange.to]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigateToView = (view) => {
    setCurrentView(view);
  };

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
    // {
    //   icon: '⚙️',
    //   title: 'System Settings',
    //   description: 'Configure system preferences',
    //   count: 'Config',
    //   color: 'gray',
    //   action: () => setCurrentView('settings')
    // }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-gray-50 border-[#2E4A8A]]-800 text-black'
    };
    return colors[color] || colors.blue;
  };

  const getButtonColorClasses = (color) => {
    const colors = {
      blue: 'bg-[#2E4A8A] text-white hover:bg-[#1b2a4a]'
    };
    return colors[color] || colors.blue;
  };

  const renderDashboardView = () => (
    <>
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
              <p className="text-3xl font-bold text-gray-900">
                {loadingTiles ? '—' : stats.totalEmployees}
              </p>
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
              <p className="text-sm font-medium text-gray-600">Present Today</p>
              <p className="text-3xl font-bold text-gray-900">
                {loadingTiles ? '—' : stats.presentToday}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {loadingTiles || stats.totalEmployees === 0
                  ? '—'
                  : `${((stats.presentToday / stats.totalEmployees) * 100).toFixed(1)}% attendance`}
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
              <p className="text-3xl font-bold text-gray-900">
                {loadingTiles ? '—' : stats.onLeave}
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                {loadingTiles ? '—' : `${stats.pendingLeaveRequests} pending requests`}
              </p>
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
              <p className="text-3xl font-bold text-gray-900">
                {loadingTiles ? '—' : stats.overtimeHours}
              </p>
              <p className="text-xs text-purple-600 mt-1">This week</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">⏰</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {quickActions.map((action, index) => (
                <div
                  key={index}
                  className={`border-2 rounded-xl p-6 transition-all duration-200 hover:shadow-md cursor-pointer ${getColorClasses(action.color)}`}
                  onClick={action.action}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-3xl">{action.icon}</div>
                    <div className="text-right">
                      <span className="text-2xl font-bold">
                        {action.title === 'Overtime Tracking' && loadingTiles ? '—' : action.count}
                      </span>
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
            {tilesError && (
              <div className="mt-4 text-sm text-red-600">Error: {tilesError}</div>
            )}
          </div>
        </div>

        {/* Recent Activities */}
        {/* <div className="xl:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Recent Activities</h2>
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View All
              </button>
            </div>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition duration-200">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-sm">{activity.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 leading-tight">{activity.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div> */}

          {/* System Status */}
          {/* <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">System Status</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">System Uptime</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-600">{stats.systemUptime}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Database</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-600">Connected</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">API Status</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-600">Operational</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Last Backup</span>
                <span className="text-sm text-gray-500">2 hours ago</span>
              </div>
            </div>
          </div>
        </div> */}
      </div>

      {/* Admin Profile Card */}
      {/* <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-8">
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
      </div> */} 
    </>
  );

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

  const getCurrentViewTitle = () => {
    switch (currentView) {
      case 'dashboard': return 'Admin Dashboard';
      case 'leaves': return 'Leave Management';
      case 'employees': return 'Employee Management';
      case 'shifts': return 'Shift Management';
      case 'overtime': return 'Overtime Tracking';
      case 'analytics': return 'Analytics & Reports';
      // case 'settings': return 'System Settings';
      default: return 'Admin Dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">{getCurrentViewTitle()}</h1>
              {currentView === 'dashboard' && (
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
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">Welcome, {user?.name}</p>
                <p className="text-xs text-gray-500">{user?.department} • {user?.employeeId}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-medium">Administrator</span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-1 text-[#2E4A8A] rounded-[9px] hover:bg-[#2E4A8A] hover:text-white mr-2"
                >
                  Logout
                </button>
                {/* <Link to="/profile"  */}
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
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {renderCurrentView()}
      </main>
    </div>
  );
};

export default AdminDashboardPage;