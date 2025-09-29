import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
  const [step, setStep] = useState(1); // 1: Admin Key, 2: Registration Form, 3: Success
  const [adminKey, setAdminKey] = useState('');
  const [keyError, setKeyError] = useState('');
  const [keyLoading, setKeyLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'employee',
    department: '',
    employeeId: ''
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { validateAdminKey, register } = useAuth();
  const navigate = useNavigate();

  const departments = [
    'Engineering',
    'Marketing', 
    'Sales',
    'Human Resources',
    'Finance',
    'Operations',
    'Customer Support',
    'IT',
    'Design',
    'Legal',
    'Research & Development'
  ];

  // Step 1: Validate Admin Key
  const handleKeyValidation = async (e) => {
    e.preventDefault();
    
    if (!adminKey.trim()) {
      setKeyError('Admin access key is required');
      return;
    }

    setKeyLoading(true);
    setKeyError('');

    try {
      const isValid = await validateAdminKey(adminKey.trim());
      if (isValid) {
        setStep(2); // Move to registration form
      } else {
        setKeyError('Invalid admin access key');
      }
    } catch (err) {
      setKeyError('Server error. Please try again.');
    }
    finally {
      setKeyLoading(false);
    }
  };

  // Step 2: Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear specific field error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }

    // Auto-generate employee ID if name changes
    if (name === 'name' && value.trim()) {
      const generatedId = generateEmployeeId(value);
      if (!formData.employeeId) {
        setFormData(prev => ({
          ...prev,
          employeeId: generatedId
        }));
      }
    }
  };

  // Generate employee ID from name
  const generateEmployeeId = (name) => {
    const nameParts = name.trim().split(' ');
    const initials = nameParts.map(part => part.charAt(0).toUpperCase()).join('');
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `EMP${initials}${randomNum}`;
  };

  // Step 2: Validate registration form
  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    } else if (!/^[a-zA-Z\s]+$/.test(formData.name.trim())) {
      newErrors.name = 'Name can only contain letters and spaces';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Employee ID validation
    if (!formData.employeeId.trim()) {
      newErrors.employeeId = 'Employee ID is required';
    } else if (formData.employeeId.trim().length < 4) {
      newErrors.employeeId = 'Employee ID must be at least 4 characters';
    }

    // Department validation
    if (!formData.department) {
      newErrors.department = 'Please select a department';
    }

    // Role validation
    if (!formData.role) {
      newErrors.role = 'Please select a role';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 2: Submit registration
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Scroll to first error
      const firstError = Object.keys(errors)[0];
      const element = document.querySelector(`[name="${firstError}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
      }
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const registrationData = {

        name: formData.name.trim(),
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        role: formData.role,
        department: formData.department,
        employeeId: formData.employeeId.trim()
      };

      await register(registrationData);
      setStep(3); // Move to success page
    } catch (err) {
      setErrors({
        submit: err.response?.data?.message || 'Registration failed. Please try again.'
      });
      
      // Scroll to top to show error
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  // Reset form and go back to admin key step
  const goBack = () => {
    setStep(1);
    setAdminKey('');
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'employee',
      department: '',
      employeeId: ''
    });
    setErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  // Navigate to login after successful registration
  const goToLogin = () => {
    navigate('/login');
  };

  // Step 1: Admin Key Validation
  if (step === 1) {
    return (
      <main style={{
                minHeight: "100vh",
                width: "100%",
                backgroundImage: "url('/background.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                fontFamily: "Afacad, sans-serif"
              }}
              className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mx-auto mb-4">
              <img src="/timetrackr11_main.svg" alt="timetrackr11 logo" className="h-12" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Admin Authorization Required</h2>
            <p className="text-black">Enter admin access key to register new user</p>
          </div>
          
          <form onSubmit={handleKeyValidation} className="space-y-6">
            {keyError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-center">
                <div className="flex items-center justify-center">
                  <span className="text-red-500 mr-2"><img src="/warning.svg" alt="warning" className="h-6" /></span>
                  {keyError}
                </div>
              </div>
            )}
            
            <div>
              <label htmlFor="adminKey" className="block text-sm font-medium text-black mb-2">
                Admin Access Key *
              </label>
              <div className="relative">
                <input
                  type="password"
                  id="adminKey"
                  value={adminKey}
                  onChange={(e) => {
                    setAdminKey(e.target.value);
                    setKeyError('');
                  }}
                  required
                  placeholder="Enter admin access key"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                />
                {/* <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <span className="text-gray-400">🔑</span>
                </div> */}
              </div>
            </div>
            
            <button
              type="submit"
              disabled={keyLoading || !adminKey.trim()}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {keyLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Validating...
                </div>
              ) : (
                'Validate Access Key'
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-black">
              Have a TimeTrackr11 account?{" "}
              <Link to="/login" className="text-red-600 font-bold">
                SIGN IN
              </Link>
            </p>
          </div>
          
          {/* Demo key for testing */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm font-medium text-yellow-800 mb-2 text-center">Demo Access Key</p>
            <div className="text-center">
              <code className="bg-yellow-100 px-3 py-1 rounded-md text-yellow-900 font-mono text-sm cursor-pointer"
                    onClick={() => setAdminKey('ADMIN-SECRET-2024')}>
                ADMIN-SECRET-2024
              </code>
            </div>
            <p className="text-xs text-yellow-700 mt-2 text-center">Click to use</p>
          </div>
        </div>
      </main>
    );
  }

  // Step 3: Success Page
  if (step === 3) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-500 to-blue-600 px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">✅</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Registration Successful!</h2>
          <p className="text-gray-600 mb-6">
            Your account has been created successfully. You can now sign in with your credentials.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-2">Account Details:</p>
            <div className="text-left space-y-1">
              <p className="text-sm"><span className="font-medium">Name:</span> {formData.name}</p>
              <p className="text-sm"><span className="font-medium">Email:</span> {formData.email}</p>
              <p className="text-sm"><span className="font-medium">Employee ID:</span> {formData.employeeId}</p>
              <p className="text-sm"><span className="font-medium">Department:</span> {formData.department}</p>
              <p className="text-sm"><span className="font-medium">Role:</span> {formData.role}</p>
            </div>
          </div>
          
          <button
            onClick={goToLogin}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-300 font-medium transition duration-200"
          >
            Continue to Login
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Registration Form
  return (
    <main style={{fontFamily: "Afacad, sans-serif"}}className="min-h-screen bg-white flex">
      {/* left */}
      <div className="w-2/5 h-screen flex items-center justify-center"
          style={{
        background: "url('/background.png') center/cover no-repeat"
      }}>
      <img src="/timetrackr11_page.svg" alt="TimeTrackr11 Logo" className="h-20" />
      </div>

      <div className="w-3/5 p-10">
          {/* Header */}
          <div className="text-center mb-8 relative">
            <button
              onClick={goBack}
              className="absolute left-0 top-0 text-gray-500 hover:text-gray-700 text-xl transition duration-200"
            >
              ← Back
            </button>
            {/* <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">👤</span>
            </div> */}
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Create New Account</h2>
            <p className="text-gray-600">Fill out the information below to register</p>
            <div className="mt-3 inline-block bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
              ✓ Admin key verified
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Submit Error */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                <div className="flex items-center">
                  <span className="text-red-500 mr-2">⚠️</span>
                  {errors.submit}
                </div>
              </div>
            )}
            
            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div className="md:col-span-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter your full name"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition duration-200 ${
                    errors.name 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <span className="mr-1">⚠️</span>
                    {errors.name}
                  </p>
                )}
              </div>
              
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="your.email@company.com"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition duration-200 ${
                    errors.email 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <span className="mr-1">⚠️</span>
                    {errors.email}
                  </p>
                )}
              </div>
              
              {/* Employee ID */}
              <div>
                <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-2">
                  Employee ID <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  id="employeeId"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleChange}
                  required
                  placeholder="EMP001"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition duration-200 ${
                    errors.employeeId 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                />
                {errors.employeeId && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <span className="mr-1">⚠️</span>
                    {errors.employeeId}
                  </p>
                )}
              </div>
              
              {/* Department */}
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
                  Department <span className="text-red-600">*</span>
                </label>
                <select
                  id="department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  required
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition duration-200 ${
                    errors.department 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                {errors.department && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <span className="mr-1">⚠️</span>
                    {errors.department}
                  </p>
                )}
              </div>
              
              {/* Role */}
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                  Role <span className="text-red-600">*</span>
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent transition duration-200 ${
                    errors.role 
                      ? 'border-red-300 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Administrator</option>
                </select>
                {errors.role && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <span className="mr-1">⚠️</span>
                    {errors.role}
                  </p>
                )}
              </div>
              
              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Create a strong password"
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:border-transparent transition duration-200 ${
                      errors.password 
                        ? 'border-red-300 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <img src="/visible.svg" alt="visible" className="h-5" /> : <img src="/invisible.svg" alt="invisible" className="h-5" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Must contain uppercase, lowercase, and number
                </p>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <span className="mr-1">⚠️</span>
                    {errors.password}
                  </p>
                )}
              </div>
              
              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    placeholder="Re-enter your password"
                    className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:border-transparent transition duration-200 ${
                      errors.confirmPassword 
                        ? 'border-red-300 focus:ring-red-500' 
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <img src="/visible.svg" alt="visible" className="h-5" /> : <img src="/invisible.svg" alt="invisible" className="h-5" />}
                  </button>
                </div>
                {formData.password && formData.confirmPassword && formData.password === formData.confirmPassword && (
                  <p className="mt-1 text-sm text-green-600 flex items-center">
                    <span className="mr-1">✅</span>
                    Passwords match
                  </p>
                )}
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <span className="mr-1">⚠️</span>
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            </div>
            
            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 text-white py-4 px-6 rounded-lg hover:bg-red-800 font-bold text-lg transition"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                    Creating Account...
                  </div>
                ) : (
                  'Create Account'
                )}
              </button>
            </div>
          </form>
          
          {/* Footer */}
          <div className="mt-6 text-center border-t pt-6">
            <p className="text-black">
              Have a TimeTrackr11 account?{' '}
              <Link to="/login" className="text-red-600 hover:text-red-800 font-bold">
                SIGN IN
              </Link>
            </p>
          </div>
        </div>
    </main>
  );
};

export default RegisterPage;