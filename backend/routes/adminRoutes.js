
const express = require('express');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const {
  listUsers, updateUser, deleteUser,
  listAllAttendance, updateAttendance, deleteAttendance
} = require('../controllers/adminController');

const router = express.Router();
router.use(protect, isAdmin);


router.get('/users', listUsers);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

router.get('/attendance', listAllAttendance);
router.put('/attendance/:id', updateAttendance);
router.delete('/attendance/:id', deleteAttendance);

module.exports = router;
