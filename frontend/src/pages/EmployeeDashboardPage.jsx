import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import MyLeaves from '../components/employee/MyLeaves';
import MyAttendance from '../components/employee/MyAttendance';
import MyProfile from '../components/employee/MyProfile';
import MyReports from '../components/employee/MyReports';
import MySchedule from '../components/employee/MySchedule';
import axiosInstance from '../axiosConfig';

const EmployeeDashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentView, setCurrentView] = useState('dashboard');
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [todayWorkTime, setTodayWorkTime] = useState('7h 45m');
  
  const [stats, setStats] = useState({
    totalWorkDays: 22,
    attendedDays: 20,
    leavesUsed: 5,
    leavesRemaining: 16,
    thisMonthHours: 168,
    overtimeHours: 8,
    pendingRequests: 2,
    lastLogin: '2024-01-15 09:15 AM',
    attendanceRate: 90.9
  });

  const [todaySchedule, setTodaySchedule] = useState({
    shift: 'Morning Shift',
    startTime: '09:00 AM',
    endTime: '05:00 PM',
    breakTime: '12:00 PM - 01:00 PM',
    status: 'In Progress'
  });

  const [recentActivities, setRecentActivities] = useState([
    {
      id: 1,
      icon: '✅',
      message: 'Checked in at 9:15 AM',
      time: '2 hours ago',
      type: 'checkin'
    },
    {
      id: 2,
      icon: '📝',
      message: 'Leave request approved for Dec 25-27',
      time: '1 day ago',
      type: 'leave'
    },
    {
      id: 3,
      icon: '⏰',
      message: 'Overtime hours added: 2.5 hours',
      time: '2 days ago',
      type: 'overtime'
    },
    {
      id: 4,
      icon: '📊',
      message: 'Monthly attendance report generated',
      time: '3 days ago',
      type: 'report'
    }
  ]);
  const [openSession, setOpenSession] = useState(null); // current open time record (or null)
const [elapsedSec, setElapsedSec] = useState(0);


  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch employee stats
  useEffect(() => {
    fetchEmployeeStats();
  }, []);

  const fetchEmployeeStats = async () => {
    try {
      // You can add API calls here to fetch real data
      // const { data } = await axiosInstance.get('/api/employee/stats');
      // setStats(data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Fetch the current open session once on mount and every 60s (in case another tab checks out)
useEffect(() => {
  const refreshOpenSession = async () => {
    try {
      const { data } = await axiosInstance.get('/api/time-records/mine', {
        params: { openOnly: true, limit: 1 }
      });
      setOpenSession((data?.records && data.records[0]) || null);
    } catch (e) {
      console.error('Failed to load open session', e);
      setOpenSession(null);
    }
  };

  refreshOpenSession();
  const sync = setInterval(refreshOpenSession, 60000);
  return () => clearInterval(sync);
}, []);

// Tick the live timer every second while there is an open session
useEffect(() => {
  if (!openSession?.loginAt) {
    setElapsedSec(0);
    return;
  }
  const start = new Date(openSession.loginAt).getTime();

  const tick = () => {
    const now = Date.now();
    setElapsedSec(Math.max(0, Math.floor((now - start) / 1000)));
  };

  tick(); // compute immediately
  const t = setInterval(tick, 1000);
  return () => clearInterval(t);
}, [openSession]);

  const liveHHMM = (() => {
    const h = Math.floor(elapsedSec / 3600);
    const m = Math.floor((elapsedSec % 3600) / 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  })();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCheckIn = () => {
    setIsCheckedIn(true);
    
  };

  const handleCheckOut = () => {
    setIsCheckedIn(false);
   
  };

  const navigateToView = (view) => {
    setCurrentView(view);
  };

  const goBackToDashboard = () => {
    setCurrentView('dashboard');
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'leaves':
        return <MyLeaves onBack={goBackToDashboard} />;
      case 'attendance':
        return <MyAttendance onBack={goBackToDashboard} />;
      case 'profile':
        return <MyProfile onBack={goBackToDashboard} />;
      case 'reports':
        return <MyReports onBack={goBackToDashboard} />;
      case 'schedule':
        return <MySchedule onBack={goBackToDashboard} />;
      default:
        return renderDashboardView();
    }
  };

  const quickActions = [
    {
      icon: <img src="/myAttendance.svg" alt="Attendance" className="h-20" />,
      title: 'My Attendance',
      description: 'View your daily attendance records',
      value: `${stats.attendedDays}/${stats.totalWorkDays}`,
      subtext: 'This month',
      color: 'blue',
      action: () => navigateToView('attendance')
    },
    {
      icon: <img src="/leaveRequest.svg" alt="Attendance" className="h-20" />,
      title: 'Leave Request',
      description: 'Submit new leave applications',
      value: stats.pendingRequests,
      subtext: 'Pending requests',
      color: 'blue',
      action: () => navigateToView('leaves')
    },
    {
      icon: <img src="/calendar.svg" alt="schedule" className="h-20" />,
      title: 'My Schedule',
      description: 'View your shift assignments',
      value: todaySchedule.shift.split(' ')[0],
      subtext: 'Current shift',
      color: 'blue',
      action: () => navigateToView('schedule')
    },
    {
      icon: <img src="/overtime.svg" alt="overtime" className="h-20" />,
      title: 'Overtime',
      description: 'Track your extra working hours',
      value: `${stats.overtimeHours}h`,
      subtext: 'This month',
      color: 'blue',
      action: () => console.log('Overtime clicked')
    },
    // {
    //   icon: '👤',
    //   title: 'My Profile',
    //   description: 'Update personal information',
    //   value: 'Edit',
    //   subtext: 'Profile settings',
    //   color: 'indigo',
    //   action: () => navigateToView('profile')
    // },
    // {
    //   icon: '📊',
    //   title: 'Reports',
    //   description: 'Download attendance reports',
    //   value: 'View',
    //   subtext: 'Monthly reports',
    //   color: 'gray',
    //   action: () => navigateToView('reports')
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
    <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
    
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"> 
           <div className="lg:col-span-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white p-6"> 
            <div className="flex items-center justify-between"> <div> 
              <h2 className="text-xl font-semibold mb-2">Today's Schedule</h2> 
              <div className="space-y-1 text-blue-100"> <p>
                <span className="font-medium">Shift:</span> {todaySchedule.shift}</p> 
                <p><span className="font-medium">Time:</span> {todaySchedule.startTime} - {todaySchedule.endTime}</p> 
                <p><span className="font-medium">Break:</span> {todaySchedule.breakTime}</p> <p><span className="font-medium">Worked:</span> {todayWorkTime}</p> 
                </div> 
                </div> 
                <div className="text-right"> <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mb-2">
                   <span className="text-3xl">📅</span> </div> <span className="bg-green-400 bg-opacity-80 px-3 py-1 rounded-full text-xs font-medium"> {todaySchedule.status} </span> 
                   </div> 
                   </div>
                    </div>  
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"> 
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Live</h3> 
                    <p className="text-black text-center">
                    <span className="text-xl  font-bold tracking-wider">
                      {openSession ? liveHHMM : '—'}
                    </span><br></br>
                    {openSession && (
                      <span className="ml-2 text-xs text-black-100">
                        since {openSession.loginLocal?.time} ({openSession.loginLocal?.dayName})
                      </span>
                    )}
                      </p>
                     </div> 
                 </div>
       

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Attendance Rate</p>
              <p className="text-3xl font-bold text-gray-900">{stats.attendanceRate}%</p>
              <p className="text-xs text-green-600 mt-1">{stats.attendedDays} of {stats.totalWorkDays} days</p>
            </div>
            <div className="w-12 h-12 flex items-center justify-center">
              <span className="text-2xl"><img src="/present.svg" alt="Attendance" /></span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Leave Balance</p>
              <p className="text-3xl font-bold text-gray-900">{stats.leavesRemaining}</p>
              <p className="text-xs text-blue-600 mt-1">{stats.leavesUsed} used this year</p>
            </div>
            <div className="w-12 h-12 flex items-center justify-center">
              <span className="text-2xl"><img src="/calendar.svg" alt="Leave Balance" /></span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Hours This Month</p>
              <p className="text-3xl font-bold text-gray-900">{stats.thisMonthHours}h</p>
              <p className="text-xs text-purple-600 mt-1">+{stats.overtimeHours}h overtime</p>
            </div>
            <div className="w-12 h-12 flex items-center justify-center">
              <span className="text-2xl"><img src="/latecomer.svg" alt="Late" /></span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Requests</p>
              <p className="text-3xl font-bold text-gray-900">{stats.pendingRequests}</p>
              <p className="text-xs text-orange-600 mt-1">Awaiting approval</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📝</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">My Services</h2>
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
                      <span className="text-2xl font-bold">{action.value}</span>
                      <p className="text-xs opacity-75">{action.subtext}</p>
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{action.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{action.description}</p>
                  <button
                    className={`w-full text-white py-2 px-4 rounded-lg font-medium transition duration-200 ${getButtonColorClasses(action.color)}`}
                  >
                    Access
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activities & Profile Summary */}
        <div className="xl:col-span-1 space-y-6">
          {/* Recent Activities */}
          {/* <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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

          {/* Quick Stats */}
          {/* <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Stats</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600">📈</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Performance</p>
                    <p className="text-xs text-gray-500">This month</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-green-600">Excellent</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600">🎯</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Goals</p>
                    <p className="text-xs text-gray-500">Completion rate</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-blue-600">85%</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600">⭐</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Rating</p>
                    <p className="text-xs text-gray-500">Overall score</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-purple-600">4.8/5</span>
              </div>
            </div>
          </div> */}
        </div>
      </div>

      {/* Employee Profile Card */}
      {/* <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-4 border-b border-gray-200">
          Employee Profile
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
            <p className="text-gray-900 font-medium bg-green-50 px-4 py-3 rounded-lg capitalize text-green-700">
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
        </div> */}

        {/* Additional Info */}
        {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 pt-6 border-t border-gray-200">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Joining Date</label>
            <p className="text-gray-900 font-medium bg-gray-50 px-4 py-3 rounded-lg">March 15, 2023</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Manager</label>
            <p className="text-gray-900 font-medium bg-gray-50 px-4 py-3 rounded-lg">Sarah Wilson</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Last Login</label>
            <p className="text-gray-900 font-medium bg-gray-50 px-4 py-3 rounded-lg">{stats.lastLogin}</p>
          </div>
        </div>
      </div> */}
    </main>
  );

  // Show login required message if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please log in to access your dashboard.</p>
          <button 
            onClick={() => navigate('/login')}
            className="mt-4 text-blue-600 hover:text-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">
                {currentView === 'dashboard' ? 'My Dashboard' : 
                 currentView === 'leaves' ? 'My Leaves' :
                 currentView === 'attendance' ? 'My Attendance' :
                 currentView === 'profile' ? 'My Profile' :
                 currentView === 'reports' ? 'My Reports' :
                 currentView === 'schedule' ? 'My Schedule' : 'Dashboard'}
              </h1>
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
                {/* <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
                  Employee
                </span> */}
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

      {/* Render current view */}
      {renderCurrentView()}
    </div>
  );
};

export default EmployeeDashboardPage;