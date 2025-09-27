import React from 'react';

const UserInfoCard = ({ user, title = "User Information" }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-4 border-b">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Name</label>
          <p className="text-gray-900 font-medium bg-gray-50 px-3 py-2 rounded-lg">{user?.name}</p>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Email</label>
          <p className="text-gray-900 font-medium bg-gray-50 px-3 py-2 rounded-lg">{user?.email}</p>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Role</label>
          <p className="text-gray-900 font-medium bg-gray-50 px-3 py-2 rounded-lg capitalize">{user?.role}</p>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Department</label>
          <p className="text-gray-900 font-medium bg-gray-50 px-3 py-2 rounded-lg">{user?.department}</p>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Employee ID</label>
          <p className="text-gray-900 font-medium bg-gray-50 px-3 py-2 rounded-lg">{user?.employeeId}</p>
        </div>
      </div>
    </div>
  );
};

export default UserInfoCard;