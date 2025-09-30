// components/employee/MyProfile.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axiosInstance from '../../axiosConfig';

const MyProfile = ({ onBack }) => {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    department: '',
    employeeId: '',
    role: '',
    phone: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: '',
    joiningDate: '',
    manager: ''
  });
  const [originalData, setOriginalData] = useState({});
  const [errors, setErrors] = useState({});
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get('/api/auth/profile');
      if (data.success) {
        const userData = {
          name: data.user.name || '',
          email: data.user.email || '',
          department: data.user.department || '',
          employeeId: data.user.employeeId || '',
          role: data.user.role || '',
          phone: data.user.phone || '',
          address: data.user.address || '',
          emergencyContact: data.user.emergencyContact || '',
          emergencyPhone: data.user.emergencyPhone || '',
          joiningDate: data.user.joiningDate || '',
          manager: data.user.manager || ''
        };
        setProfileData(userData);
        setOriginalData(userData);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateProfile = () => {
    const newErrors = {};

    if (!profileData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!profileData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(profileData.email)) {
      newErrors.email = 'Email format is invalid';
    }

    if (profileData.phone && !/^\d{10,}$/.test(profileData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    return newErrors;
  };

  const handleSaveProfile = async () => {
    const validationErrors = validateProfile();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      const { data } = await axiosInstance.put('/api/auth/profile', profileData);
      if (data.success) {
        setUser(prev => ({ ...prev, ...data.user }));
        setOriginalData(profileData);
        setEditMode(false);
        setErrors({});
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setErrors({ submit: error.response?.data?.message || 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setProfileData(originalData);
    setEditMode(false);
    setErrors({});
  };

  const validatePassword = () => {
    const newErrors = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    return newErrors;
  };

  const handleChangePassword = async () => {
    const validationErrors = validatePassword();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      const { data } = await axiosInstance.post('/api/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (data.success) {
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordForm(false);
        setErrors({});
        alert('Password changed successfully');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setErrors({ password: error.response?.data?.message || 'Failed to change password' });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !profileData.name) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
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
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="text-lg text-white hover:text-gray-300 font-medium inline-flex items-center transition duration-200">
            ← Back to Dashboard
          </button>
        </div>

        {/* Header */}
        <div className="flex justify-end items-center mb-8">
          {/* <div>
            <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
            <p className="text-gray-600 mt-2">Manage your personal information and account settings</p>
          </div> */}
          {!editMode && (
            <button
              onClick={() => setEditMode(true)}
              className="bg-[#2E4A8A] text-white px-4 py-2 rounded-lg shadow-md hover:bg-white hover:text-black transition duration-200"
            >
              Edit Profile
            </button>
          )}
        </div>

        {/* Profile Information */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-8">
          <div className="flex justify-between items-center mb-6 pb-3"
            style={{ 
              borderBottom: "3px solid #2E4A8A",
              boxShadow: "0 1px 0 rgba(0, 0, 0, 0.25)",
             }}>
            <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>

            {editMode && (
              <div className="space-x-3">
                <button
                  onClick={handleCancelEdit}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {errors.submit}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <label style={{
                    color: "#9A8E8E",
                    fontFamily: "Afacad, sans-serif",
                    fontSize: "18px",
                    fontStyle: "normal",
                    fontWeight: "normal",
                    lineHeight: "normal",
                  }}>Full Name</label>
                {editMode ? (
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                ) : (
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{profileData.name}</p>
                )}
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

              <div>
                <label style={{
                    color: "#9A8E8E",
                    fontFamily: "Afacad, sans-serif",
                    fontSize: "18px",
                    fontStyle: "normal",
                    fontWeight: "normal",
                    lineHeight: "normal",
                  }}>Email</label>
                {editMode ? (
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                      errors.email ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                ) : (
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{profileData.email}</p>
                )}
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label style={{
                    color: "#9A8E8E",
                    fontFamily: "Afacad, sans-serif",
                    fontSize: "18px",
                    fontStyle: "normal",
                    fontWeight: "normal",
                    lineHeight: "normal",
                  }}>Phone Number</label>
                {editMode ? (
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                      errors.phone ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                ) : (
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{profileData.phone || 'Not provided'}</p>
                )}
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
              </div>

              <div>
                <label style={{
                    color: "#9A8E8E",
                    fontFamily: "Afacad, sans-serif",
                    fontSize: "18px",
                    fontStyle: "normal",
                    fontWeight: "normal",
                    lineHeight: "normal",
                  }}>Address</label>
                {editMode ? (
                  <textarea
                    value={profileData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{profileData.address || 'Not provided'}</p>
                )}
              </div>
            </div>

            {/* Work Information & Emergency Contact */}
            <div className="space-y-4">
              <div>
                <label style={{
                    color: "#9A8E8E",
                    fontFamily: "Afacad, sans-serif",
                    fontSize: "18px",
                    fontStyle: "normal",
                    fontWeight: "normal",
                    lineHeight: "normal",
                  }}>Employee ID</label>
                <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{profileData.employeeId}</p>
              </div>

              <div>
                <label style={{
                    color: "#9A8E8E",
                    fontFamily: "Afacad, sans-serif",
                    fontSize: "18px",
                    fontStyle: "normal",
                    fontWeight: "normal",
                    lineHeight: "normal",
                  }}>Department</label>
                <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{profileData.department}</p>
              </div>

              <div>
                <label style={{
                    color: "#9A8E8E",
                    fontFamily: "Afacad, sans-serif",
                    fontSize: "18px",
                    fontStyle: "normal",
                    fontWeight: "normal",
                    lineHeight: "normal",
                  }}>Role</label>
                <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md capitalize">{profileData.role}</p>
              </div>

              <div>
                <label style={{
                    color: "#9A8E8E",
                    fontFamily: "Afacad, sans-serif",
                    fontSize: "18px",
                    fontStyle: "normal",
                    fontWeight: "normal",
                    lineHeight: "normal",
                  }}>Emergency Contact</label>
                {editMode ? (
                  <input
                    type="text"
                    value={profileData.emergencyContact}
                    onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{profileData.emergencyContact || 'Not provided'}</p>
                )}
              </div>

              <div>
                <label style={{
                    color: "#9A8E8E",
                    fontFamily: "Afacad, sans-serif",
                    fontSize: "18px",
                    fontStyle: "normal",
                    fontWeight: "normal",
                    lineHeight: "normal",
                  }}>Emergency Phone</label>
                {editMode ? (
                  <input
                    type="tel"
                    value={profileData.emergencyPhone}
                    onChange={(e) => handleInputChange('emergencyPhone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">{profileData.emergencyPhone || 'Not provided'}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Section */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Security Settings</h3>
            <button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              {showPasswordForm ? 'Cancel' : 'Change Password'}
            </button>
          </div>

          {showPasswordForm && (
            <div className="max-w-md space-y-4">
              {errors.password && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {errors.password}
                </div>
              )}

              <div>
                <label style={{
                    color: "#9A8E8E",
                    fontFamily: "Afacad, sans-serif",
                    fontSize: "18px",
                    fontStyle: "normal",
                    fontWeight: "normal",
                    lineHeight: "normal",
                  }}>Current Password</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    errors.currentPassword ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.currentPassword && <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>}
              </div>

              <div>
                <label style={{
                    color: "#9A8E8E",
                    fontFamily: "Afacad, sans-serif",
                    fontSize: "18px",
                    fontStyle: "normal",
                    fontWeight: "normal",
                    lineHeight: "normal",
                  }}>New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    errors.newPassword ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.newPassword && <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>}
              </div>

              <div>
                <label style={{
                    color: "#9A8E8E",
                    fontFamily: "Afacad, sans-serif",
                    fontSize: "18px",
                    fontStyle: "normal",
                    fontWeight: "normal",
                    lineHeight: "normal",
                  }}>Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
              </div>

              <button
                onClick={handleChangePassword}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200 disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default MyProfile;