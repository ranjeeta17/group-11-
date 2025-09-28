// src/context/AuthContext.js
import { createContext, useContext, useEffect, useState } from 'react';
import axiosInstance from '../axiosConfig';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });

  const [loading, setLoading] = useState(true);

  // Check for existing token and validate user on app load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      
      if (token && userData) {
        try {
          // Validate token with backend
          const { data } = await axiosInstance.get('/api/auth/profile', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (data.success) {
            setUser(JSON.parse(userData));
          } else {
            // Token invalid, clear everything
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
          }
        } catch (error) {
          console.error('Token validation failed:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Update localStorage when user changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  const validateAdminKey = async (key) => {
    try {
      console.log("Sending adminKey:", key);
      const { data } = await axiosInstance.post(
        '/api/auth/validate-admin-key',
        { adminKey: key },
        { headers: { 'Content-Type': 'application/json' } }
      );
      console.log("Response:", data);
      return data.success;
    } catch (err) {
      console.error("Validation error:", err.response?.data || err.message);
      return false;
    }
  };

  const login = async (email, password) => {
    try {
      const { data } = await axiosInstance.post('/api/auth/login', { email, password });
      
      // Store the JWT token in localStorage - this is crucial!
      localStorage.setItem('token', data.token);
      console.log('Token saved to localStorage:', data.token);
      
      // Set user data
      const userData = {
        id: data.user.id, 
        name: data.user.name, 
        email: data.user.email, 
        role: data.user.role,
        employeeId: data.user.employeeId,
        department: data.user.department,
        isActive: data.user.isActive
      };
      
      setUser(userData);
      
      return data;
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Login failed';
      throw new Error(msg);
    }
  };

  const register = async (registrationData) => {
    try {
      const { data } = await axiosInstance.post('/api/auth/register', registrationData);
      console.log('Registration response:', data);
      
      // Store the JWT token in localStorage
      localStorage.setItem('token', data.token);
      console.log('Token saved to localStorage:', data.token);
      
      // Set user data
      const userData = {
        id: data.user.id, 
        name: data.user.name, 
        email: data.user.email, 
        role: data.user.role,
        employeeId: data.user.employeeId,
        department: data.user.department,
        isActive: data.user.isActive
      };
      
      setUser(userData);
      
      return data;
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Register failed';
      throw new Error(msg);
    }
  };

  const logout = () => {
    // Clear both token and user data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Helper function to get current token
  const getToken = () => {
    return localStorage.getItem('token');
  };

  // Helper function to check if user is admin
  const isAdmin = () => {
    return user && user.role === 'admin';
  };

  // Helper function to check if user is authenticated
  const isAuthenticated = () => {
    return user !== null && localStorage.getItem('token') !== null;
  };

  const value = {
    user,
    setUser,
    login,
    register,
    logout,
    validateAdminKey,
    getToken,
    isAdmin,
    isAuthenticated,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};