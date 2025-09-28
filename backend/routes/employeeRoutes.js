// routes/employeeRoutes.js
const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Apply admin-only middleware to all routes (since this is admin employee management)
router.use(requireAdmin);

// GET /api/admin/employees - Get all employees with filtering and pagination
router.get('/', employeeController.getEmployees);

// GET /api/admin/employees/stats - Get employee statistics
router.get('/stats', employeeController.getEmployeeStats);

// GET /api/admin/employees/department/:department - Get employees by department
router.get('/department/:department', employeeController.getEmployeesByDepartment);

// GET /api/admin/employees/:id - Get single employee by ID
router.get('/:id', employeeController.getEmployeeById);

// POST /api/admin/employees - Create new employee
router.post('/', employeeController.createEmployee);

// PUT /api/admin/employees/:id - Update employee
router.put('/:id', employeeController.updateEmployee);

// PATCH /api/admin/employees/:id/toggle-status - Toggle employee active status
router.patch('/:id/toggle-status', employeeController.toggleEmployeeStatus);

// DELETE /api/admin/employees/:id - Delete employee
router.delete('/:id', employeeController.deleteEmployee);

module.exports = router;