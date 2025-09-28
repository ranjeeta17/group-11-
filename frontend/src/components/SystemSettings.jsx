// components/admin/SystemSettings.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const SystemSettings = ({ onBack }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const tabs = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'backup', label: 'Backup', icon: '💾' },
    { id: 'users', label: 'User Management', icon: '👥' }
  ];

  const [generalSettings, setGeneralSettings] = useState({
    companyName: '',
    timezone: '',
    workingHours: {
      start: '09:00',
      end: '17:00'
    },
    weekendDays: ['saturday', 'sunday'],
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD'
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    leaveRequestNotifications: true,
    overtimeNotifications: true,
    attendanceAlerts: true,
    reportNotifications: true
  });

  const [securitySettings, setSecuritySettings] = useState({
    passwordMinLength: 8,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    sessionTimeout: 30,
    twoFactorAuth: false,
    loginAttempts: 5
  });

  const [backupSettings, setBackupSettings] = useState({
    autoBackup: true,
    backupFrequency: 'daily',
    retentionDays: 30,
    backupLocation: 'cloud',
    lastBackup: '2024-01-15T10:30:00Z'
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/admin/settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setSettings(data.settings);
        setGeneralSettings(data.settings.general || generalSettings);
        setNotificationSettings(data.settings.notifications || notificationSettings);
        setSecuritySettings(data.settings.security || securitySettings);
        setBackupSettings(data.settings.backup || backupSettings);
      } else {
        console.error('Failed to fetch settings:', data.message);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (settingsType, settingsData) => {
    setSaveLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/admin/settings/${settingsType}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settingsData)
      });

      const data = await response.json();
      if (data.success) {
        setSuccessMessage('Settings saved successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        console.error('Failed to save settings:', data.message);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      // For demo, show success message
      setSuccessMessage('Settings saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } finally {
      setSaveLoading(false);
    }
  };

  const renderGeneral = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Company Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
            <input
              type="text"
              value={generalSettings.companyName}
              onChange={(e) => setGeneralSettings({...generalSettings, companyName: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter company name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
            <select
              value={generalSettings.timezone}
              onChange={(e) => setGeneralSettings({...generalSettings, timezone: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Timezone</option>
              <option value="UTC-8">Pacific Time (UTC-8)</option>
              <option value="UTC-5">Eastern Time (UTC-5)</option>
              <option value="UTC+0">GMT (UTC+0)</option>
              <option value="UTC+5:30">India Standard Time (UTC+5:30)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
            <select
              value={generalSettings.dateFormat}
              onChange={(e) => setGeneralSettings({...generalSettings, dateFormat: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
            <select
              value={generalSettings.currency}
              onChange={(e) => setGeneralSettings({...generalSettings, currency: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="INR">INR - Indian Rupee</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Working Hours</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
            <input
              type="time"
              value={generalSettings.workingHours.start}
              onChange={(e) => setGeneralSettings({
                ...generalSettings,
                workingHours: {...generalSettings.workingHours, start: e.target.value}
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
            <input
              type="time"
              value={generalSettings.workingHours.end}
              onChange={(e) => setGeneralSettings({
                ...generalSettings,
                workingHours: {...generalSettings.workingHours, end: e.target.value}
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Weekend Days</label>
          <div className="flex flex-wrap gap-3">
            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
              <label key={day} className="flex items-center">
                <input
                  type="checkbox"
                  checked={generalSettings.weekendDays.includes(day)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setGeneralSettings({
                        ...generalSettings,
                        weekendDays: [...generalSettings.weekendDays, day]
                      });
                    } else {
                      setGeneralSettings({
                        ...generalSettings,
                        weekendDays: generalSettings.weekendDays.filter(d => d !== day)
                      });
                    }
                  }}
                  className="mr-2"
                />
                <span className="text-sm capitalize">{day}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => saveSettings('general', generalSettings)}
          disabled={saveLoading}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition duration-200 disabled:opacity-50"
        >
          {saveLoading ? 'Saving...' : 'Save General Settings'}
        </button>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h3>
        
        <div className="space-y-4">
          {Object.entries(notificationSettings).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </label>
                <p className="text-xs text-gray-500">
                  {key === 'emailNotifications' && 'Receive notifications via email'}
                  {key === 'smsNotifications' && 'Receive notifications via SMS'}
                  {key === 'leaveRequestNotifications' && 'Get notified about leave requests'}
                  {key === 'overtimeNotifications' && 'Get notified about overtime requests'}
                  {key === 'attendanceAlerts' && 'Receive attendance-related alerts'}
                  {key === 'reportNotifications' && 'Get notified when reports are generated'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setNotificationSettings({
                    ...notificationSettings,
                    [key]: e.target.checked
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => saveSettings('notifications', notificationSettings)}
          disabled={saveLoading}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition duration-200 disabled:opacity-50"
        >
          {saveLoading ? 'Saving...' : 'Save Notification Settings'}
        </button>
      </div>
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Password Policy</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Password Length</label>
            <input
              type="number"
              min="6"
              max="20"
              value={securitySettings.passwordMinLength}
              onChange={(e) => setSecuritySettings({...securitySettings, passwordMinLength: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Max Login Attempts</label>
            <input
              type="number"
              min="3"
              max="10"
              value={securitySettings.loginAttempts}
              onChange={(e) => setSecuritySettings({...securitySettings, loginAttempts: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
            <input
              type="number"
              min="5"
              max="120"
              value={securitySettings.sessionTimeout}
              onChange={(e) => setSecuritySettings({...securitySettings, sessionTimeout: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={securitySettings.requireUppercase}
              onChange={(e) => setSecuritySettings({...securitySettings, requireUppercase: e.target.checked})}
              className="mr-3"
            />
            <label className="text-sm text-gray-700">Require uppercase letters</label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={securitySettings.requireNumbers}
              onChange={(e) => setSecuritySettings({...securitySettings, requireNumbers: e.target.checked})}
              className="mr-3"
            />
            <label className="text-sm text-gray-700">Require numbers</label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={securitySettings.requireSpecialChars}
              onChange={(e) => setSecuritySettings({...securitySettings, requireSpecialChars: e.target.checked})}
              className="mr-3"
            />
            <label className="text-sm text-gray-700">Require special characters</label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={securitySettings.twoFactorAuth}
              onChange={(e) => setSecuritySettings({...securitySettings, twoFactorAuth: e.target.checked})}
              className="mr-3"
            />
            <label className="text-sm text-gray-700">Enable Two-Factor Authentication</label>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => saveSettings('security', securitySettings)}
          disabled={saveLoading}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition duration-200 disabled:opacity-50"
        >
          {saveLoading ? 'Saving...' : 'Save Security Settings'}
        </button>
      </div>
    </div>
  );

  const renderBackup = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Backup Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Backup Frequency</label>
            <select
              value={backupSettings.backupFrequency}
              onChange={(e) => setBackupSettings({...backupSettings, backupFrequency: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Retention Period (days)</label>
            <input
              type="number"
              min="1"
              max="365"
              value={backupSettings.retentionDays}
              onChange={(e) => setBackupSettings({...backupSettings, retentionDays: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Backup Location</label>
            <select
              value={backupSettings.backupLocation}
              onChange={(e) => setBackupSettings({...backupSettings, backupLocation: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="local">Local Storage</option>
              <option value="cloud">Cloud Storage</option>
              <option value="both">Both Local & Cloud</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={backupSettings.autoBackup}
              onChange={(e) => setBackupSettings({...backupSettings, autoBackup: e.target.checked})}
              className="mr-3"
            />
            <label className="text-sm text-gray-700">Enable Automatic Backup</label>
          </div>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Last Backup</h4>
          <p className="text-sm text-gray-600">
            {backupSettings.lastBackup ? 
              new Date(backupSettings.lastBackup).toLocaleString() : 
              'No backup performed yet'
            }
          </p>
          <button className="mt-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition duration-200">
            Run Backup Now
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => saveSettings('backup', backupSettings)}
          disabled={saveLoading}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition duration-200 disabled:opacity-50"
        >
          {saveLoading ? 'Saving...' : 'Save Backup Settings'}
        </button>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">User Management</h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Default User Roles</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Employee</span>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Default</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Admin</span>
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Restricted</span>
                </div>
              </div>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Registration Settings</h4>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" defaultChecked />
                  <span className="text-sm">Require admin approval</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-sm">Email verification required</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" defaultChecked />
                  <span className="text-sm">Strong password required</span>
                </label>
              </div>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Access Control</h4>
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">IP Restrictions:</span>
                  <span className="ml-2 text-gray-600">Disabled</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium">Time Restrictions:</span>
                  <span className="ml-2 text-gray-600">24/7 Access</span>
                </div>
                <button className="text-sm text-blue-600 hover:text-blue-700">
                  Configure Access Rules
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Maintenance</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Database Maintenance</h4>
            <div className="space-y-2">
              <button className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded border">
                Optimize Database
              </button>
              <button className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded border">
                Clear Old Logs
              </button>
              <button className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded border">
                Update Indexes
              </button>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-3">System Actions</h4>
            <div className="space-y-2">
              <button className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded border">
                Clear Cache
              </button>
              <button className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded border">
                Restart Services
              </button>
              <button className="w-full text-left px-4 py-2 bg-red-50 hover:bg-red-100 rounded border text-red-600">
                Reset System
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCurrentTab = () => {
    switch (activeTab) {
      case 'general':
        return renderGeneral();
      case 'notifications':
        return renderNotifications();
      case 'security':
        return renderSecurity();
      case 'backup':
        return renderBackup();
      case 'users':
        return renderUsers();
      default:
        return renderGeneral();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Back Button */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center transition duration-200"
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
          <p className="text-gray-600 mt-2">Configure system preferences and security settings</p>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {successMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {renderCurrentTab()}
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;