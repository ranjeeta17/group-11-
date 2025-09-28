// controllers/employeeController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const employeeController = {
  // Get all employees with filtering
  getEmployees: async (req, res) => {
    try {
      const { department, role, isActive, page = 1, limit = 50 } = req.query;
      
      // Build filter object
      const filter = {};
      if (department) filter.department = department;
      if (role) filter.role = role;
      if (isActive !== undefined) filter.isActive = isActive === 'true';

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Fetch employees with filters
      const employees = await User.find(filter)
        .select('-password') // Exclude password field
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      // Get total count for pagination
      const totalCount = await User.countDocuments(filter);

      res.json({
        success: true,
        employees,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNext: skip + employees.length < totalCount,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error('Error fetching employees:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch employees'
      });
    }
  },

  // Get single employee by ID
  getEmployeeById: async (req, res) => {
    try {
      const { id } = req.params;
      
      const employee = await User.findById(id).select('-password');
      
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      res.json({
        success: true,
        employee
      });
    } catch (error) {
      console.error('Error fetching employee:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch employee'
      });
    }
  },

  // Create new employee
  createEmployee: async (req, res) => {
    try {
      const { name, email, password, employeeId, department, role = 'employee' } = req.body;

      // Validation
      if (!name || !email || !password || !employeeId || !department) {
        return res.status(400).json({
          success: false,
          message: 'All required fields must be provided'
        });
      }

      // Check if email already exists
      const existingUser = await User.findOne({ 
        $or: [{ email: email.toLowerCase() }, { employeeId }] 
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: existingUser.email === email.toLowerCase() 
            ? 'Email already exists' 
            : 'Employee ID already exists'
        });
      }

      // Validate password length
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
      }

      // Create new employee
      const employee = new User({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        employeeId: employeeId.trim(),
        department: department.trim(),
        role,
        isActive: true
      });

      await employee.save();

      // Return employee without password
      const employeeResponse = employee.toJSON();

      res.status(201).json({
        success: true,
        message: 'Employee created successfully',
        employee: employeeResponse
      });
    } catch (error) {
      console.error('Error creating employee:', error);
      
      // Handle duplicate key errors
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(400).json({
          success: false,
          message: `${field === 'email' ? 'Email' : 'Employee ID'} already exists`
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create employee'
      });
    }
  },

  // Update employee
  updateEmployee: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, department, role, password } = req.body;

      // Validation
      if (!name || !email || !department) {
        return res.status(400).json({
          success: false,
          message: 'Name, email, and department are required'
        });
      }

      // Check if employee exists
      const employee = await User.findById(id);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      // Check if email is already taken by another user
      if (email.toLowerCase() !== employee.email) {
        const existingUser = await User.findOne({ 
          email: email.toLowerCase(),
          _id: { $ne: id }
        });
        
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'Email already exists'
          });
        }
      }

      // Prepare update data
      const updateData = {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        department: department.trim(),
        role: role || employee.role
      };

      // If password is provided, hash it
      if (password && password.trim() !== '') {
        if (password.length < 6) {
          return res.status(400).json({
            success: false,
            message: 'Password must be at least 6 characters long'
          });
        }
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(password, salt);
      }

      // Update employee
      const updatedEmployee = await User.findByIdAndUpdate(
        id,
        updateData,
        { new: true, select: '-password' }
      );

      res.json({
        success: true,
        message: 'Employee updated successfully',
        employee: updatedEmployee
      });
    } catch (error) {
      console.error('Error updating employee:', error);
      
      // Handle duplicate key errors
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update employee'
      });
    }
  },

  // Toggle employee active status
  toggleEmployeeStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'isActive must be a boolean value'
        });
      }

      const employee = await User.findByIdAndUpdate(
        id,
        { isActive },
        { new: true, select: '-password' }
      );

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      res.json({
        success: true,
        message: `Employee ${isActive ? 'activated' : 'deactivated'} successfully`,
        employee
      });
    } catch (error) {
      console.error('Error toggling employee status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update employee status'
      });
    }
  },

  // Delete employee (soft delete by setting isActive to false)
  deleteEmployee: async (req, res) => {
    try {
      const { id } = req.params;

      // Check if employee exists
      const employee = await User.findById(id);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      // Prevent deleting the only admin
      if (employee.role === 'admin') {
        const adminCount = await User.countDocuments({ role: 'admin', isActive: true });
        if (adminCount <= 1) {
          return res.status(400).json({
            success: false,
            message: 'Cannot delete the only active admin user'
          });
        }
      }

      // Hard delete the employee
      await User.findByIdAndDelete(id);

      res.json({
        success: true,
        message: 'Employee deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting employee:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete employee'
      });
    }
  },

  // Get employee statistics
  getEmployeeStats: async (req, res) => {
    try {
      const stats = await User.aggregate([
        {
          $group: {
            _id: null,
            totalEmployees: { $sum: 1 },
            activeEmployees: {
              $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
            },
            inactiveEmployees: {
              $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] }
            },
            adminCount: {
              $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] }
            },
            employeeCount: {
              $sum: { $cond: [{ $eq: ['$role', 'employee'] }, 1, 0] }
            }
          }
        }
      ]);

      // Get department statistics
      const departmentStats = await User.aggregate([
        {
          $group: {
            _id: '$department',
            count: { $sum: 1 },
            activeCount: {
              $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
            }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      res.json({
        success: true,
        stats: stats[0] || {
          totalEmployees: 0,
          activeEmployees: 0,
          inactiveEmployees: 0,
          adminCount: 0,
          employeeCount: 0
        },
        departmentStats
      });
    } catch (error) {
      console.error('Error fetching employee stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch employee statistics'
      });
    }
  },

  // Get employees by department
  getEmployeesByDepartment: async (req, res) => {
    try {
      const { department } = req.params;
      
      const employees = await User.find({ 
        department, 
        isActive: true 
      }).select('-password');

      res.json({
        success: true,
        employees
      });
    } catch (error) {
      console.error('Error fetching employees by department:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch employees'
      });
    }
  }
};

module.exports = employeeController;