import React from 'react';

const DashboardCard = ({ icon, title, description, buttonText, onClick, buttonColor = "blue" }) => {
  const buttonColors = {
    blue: "bg-blue-600 hover:bg-blue-700",
    green: "bg-green-600 hover:bg-green-700",
    purple: "bg-purple-600 hover:bg-purple-700",
    red: "bg-red-600 hover:bg-red-700"
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition duration-200">
      <div className="flex items-start">
        <div className="text-4xl mb-4">{icon}</div>
        <div className="ml-4 flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-gray-600 mt-2 mb-4">{description}</p>
          <button
            onClick={onClick}
            className={`${buttonColors[buttonColor]} text-white px-4 py-2 rounded-lg transition duration-200`}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardCard;
