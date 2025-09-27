import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NotFoundPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(10);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  // Auto redirect countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setShouldRedirect(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Handle redirect when countdown reaches 0
  useEffect(() => {
    if (shouldRedirect) {
      handleRedirect();
    }
  }, [shouldRedirect, user, navigate]);

  const handleRedirect = () => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin-dashboard');
      } else {
        navigate('/employee-dashboard');
      }
    } else {
      navigate('/login');
    }
  };

  const getRedirectPath = () => {
    if (user) {
      return user.role === 'admin' ? '/admin-dashboard' : '/employee-dashboard';
    }
    return '/login';
  };

  const getRedirectText = () => {
    if (user) {
      return user.role === 'admin' ? 'Admin Dashboard' : 'Employee Dashboard';
    }
    return 'Login Page';
  };

  const quickLinks = user ? [
    {
      title: user.role === 'admin' ? 'Admin Dashboard' : 'Employee Dashboard',
      description: user.role === 'admin' ? 'Manage system and employees' : 'View your attendance and profile',
      path: user.role === 'admin' ? '/admin-dashboard' : '/employee-dashboard',
      icon: user.role === 'admin' ? '👨‍💼' : '👤',
      color: user.role === 'admin' ? 'red' : 'green'
    },
    ...(user.role === 'admin' ? [
      {
        title: 'Employee Management',
        description: 'Manage employee accounts',
        path: '/admin-dashboard',
        icon: '👥',
        color: 'blue'
      },
      {
        title: 'Reports',
        description: 'Generate system reports',
        path: '/admin-dashboard',
        icon: '📊',
        color: 'purple'
      }
    ] : [
      {
        title: 'My Profile',
        description: 'Update your personal information',
        path: '/employee-dashboard',
        icon: '👤',
        color: 'blue'
      },
      {
        title: 'Leave Requests',
        description: 'Submit and track leave requests',
        path: '/employee-dashboard',
        icon: '📝',
        color: 'purple'
      }
    ])
  ] : [
    {
      title: 'Login',
      description: 'Sign in to your account',
      path: '/login',
      icon: '🔐',
      color: 'blue'
    },
    {
      title: 'Register',
      description: 'Create a new account',
      path: '/register',
      icon: '📝',
      color: 'green'
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      red: 'bg-red-50 border-red-200 hover:bg-red-100 text-red-700',
      green: 'bg-green-50 border-green-200 hover:bg-green-100 text-green-700',
      blue: 'bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700',
      purple: 'bg-purple-50 border-purple-200 hover:bg-purple-100 text-purple-700'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4">
      <div className="max-w-4xl mx-auto text-center">
        {/* 404 Animation */}
        <div className="relative mb-8">
          <div className="text-9xl font-bold text-gray-200 select-none animate-pulse">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl animate-bounce">🔍</div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Oops! Page Not Found
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            The page you're looking for doesn't exist or has been moved.
          </p>
          
          {user && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800">
                <span className="font-medium">Hi {user.name}!</span> 
                <span className="ml-2">You'll be redirected to your dashboard in</span>
                <span className="mx-2 font-bold text-2xl text-blue-600">{countdown}</span>
                <span>seconds</span>
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link
              to={getRedirectPath()}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium transition duration-200 inline-flex items-center justify-center"
            >
              <span className="mr-2">🏠</span>
              Go to {getRedirectText()}
            </Link>
            
            <button
              onClick={() => window.history.back()}
              className="bg-gray-600 text-white px-8 py-3 rounded-lg hover:bg-gray-700 focus:ring-4 focus:ring-gray-300 font-medium transition duration-200 inline-flex items-center justify-center"
            >
              <span className="mr-2">←</span>
              Go Back
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-300 font-medium transition duration-200 inline-flex items-center justify-center"
            >
              <span className="mr-2">🔄</span>
              Refresh Page
            </button>
          </div>

          {/* Error Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Error Details:</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p><span className="font-medium">URL:</span> {window.location.pathname}</p>
              <p><span className="font-medium">Status:</span> 404 - Not Found</p>
              <p><span className="font-medium">Time:</span> {new Date().toLocaleString()}</p>
              {user && <p><span className="font-medium">User:</span> {user.name} ({user.role})</p>}
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Quick Links
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickLinks.map((link, index) => (
              <Link
                key={index}
                to={link.path}
                className={`p-6 rounded-xl border-2 transition-all duration-200 hover:shadow-md ${getColorClasses(link.color)}`}
              >
                <div className="text-4xl mb-3">{link.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{link.title}</h3>
                <p className="text-sm opacity-75">{link.description}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Need Help?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center justify-center space-x-2 text-gray-600">
                <span>📧</span>
                <span>support@company.com</span>
              </div>
              <div className="flex items-center justify-center space-x-2 text-gray-600">
                <span>📞</span>
                <span>+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center justify-center space-x-2 text-gray-600">
                <span>💬</span>
                <span>Live Chat Support</span>
              </div>
            </div>
          </div>
          
          <p className="text-gray-500 text-sm mt-4">
            © 2024 Attendance Management System. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;