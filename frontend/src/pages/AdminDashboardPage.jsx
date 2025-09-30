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

const AdminDashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'leaves', 'employees', etc.
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState({
    totalEmployees: 156,
    presentToday: 142,
    onLeave: 8,
    lateArrivals: 6,
    pendingLeaveRequests: 12,
    overtimeHours: 45,
    newRegistrations: 3,
    systemUptime: '99.8%'
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

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

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
    //   color: 'blue',
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

  // Function to render different views
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

  // Main dashboard view
  const renderDashboardView = () => (
    <>
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Employees</p>
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
              <p className="text-sm font-medium text-gray-600">Present Today</p>
              <p className="text-3xl font-bold text-gray-900">{stats.presentToday}</p>
              <p className="text-xs text-gray-500 mt-1">{((stats.presentToday / stats.totalEmployees) * 100).toFixed(1)}% attendance</p>
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

  // Get current view title for header
  const getCurrentViewTitle = () => {
    switch (currentView) {
      case 'dashboard':
        return 'Admin Dashboard';
      case 'leaves':
        return 'Leave Management';
      case 'employees':
        return 'Employee Management';
      case 'shifts':
        return 'Shift Management';
      case 'overtime':
        return 'Overtime Tracking';
      case 'analytics':
        return 'Analytics & Reports';
      case 'settings':
        return 'System Settings';
      default:
        return 'Admin Dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">
                {getCurrentViewTitle()}
              </h1>
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
                <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-medium">
                  Administrator
                </span>
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