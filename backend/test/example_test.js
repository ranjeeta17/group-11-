// test/test.js
/* eslint-disable no-unused-expressions */
const { expect } = require('chai');
const sinon = require('sinon');
const mongoose = require('mongoose');

// Controllers
const employeeController = require('../controllers/employeeController');
const shiftController = require('../controllers/shiftController');
const leaveController = require('../controllers/leaveController');
const attendanceController = require('../controllers/attendanceController');
const adminController = require('../controllers/adminController'); // for updateAttendance

// Models & libs to stub
const User = require('../models/User');
const Shift = require('../models/Shift');
const Leave = require('../models/Leave');
const Attendance = require('../models/Attendance');
const bcrypt = require('bcryptjs');
const { ShiftFactory } = require('../factories/ShiftFactory');

// helpers
const mkRes = () => ({
  status: sinon.stub().returnsThis(),
  json: sinon.stub(),
});

const mkChainFind = (result) => {
  // supports .select().sort().skip().limit().populate() and thenable behavior
  const chain = {
    select: sinon.stub().returnsThis(),
    sort: sinon.stub().returnsThis(),
    skip: sinon.stub().returnsThis(),
    limit: sinon.stub().returnsThis(),
    populate: sinon.stub().returnsThis(),
    exec: sinon.stub().resolves(result),
  };
  chain.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  return chain;
};

const mkChainFindOne = (doc) => {
  const chain = { populate: sinon.stub().returnsThis(), exec: sinon.stub().resolves(doc) };
  chain.then = (resolve, reject) => Promise.resolve(doc).then(resolve, reject);
  return chain;
};

const mkReq = (overrides = {}) => ({
  params: {},
  query: {},
  body: {},
  headers: {},
  ip: '127.0.0.1',
  user: { id: new mongoose.Types.ObjectId().toString(), userId: new mongoose.Types.ObjectId().toString() },
  ...overrides,
});



/* ================================
 * Employee Profile Management:
 * ================================ */
describe('Employee Profile Management:', () => {
  let sand;
  beforeEach(() => {
    sand = sinon.createSandbox();
    // silence noisy logs during negative-path tests
    sand.stub(console, 'error');
    sand.stub(console, 'warn');
  });
  afterEach(() => sand.restore());

  describe('getEmployees Function Test', () => {
    it('should return paginated employees successfully', async () => {
      const employees = [{ _id: 'u1', name: 'A' }, { _id: 'u2', name: 'B' }];
      sand.stub(User, 'find').returns(mkChainFind(employees));
      sand.stub(User, 'countDocuments').resolves(2);

      const req = mkReq({ query: { department: 'Eng', role: 'employee', isActive: 'true', page: 1, limit: 2 } });
      const res = mkRes();

      await employeeController.getEmployees(req, res);

      expect(res.json.calledOnce).to.be.true;
      const payload = res.json.firstCall.args[0];
      expect(payload.success).to.be.true;
      expect(payload.employees).to.have.length(2);
      expect(payload.pagination.totalCount).to.equal(2);
    });

    it('should return empty list if no employees match filters', async () => {
      sand.stub(User, 'find').returns(mkChainFind([]));
      sand.stub(User, 'countDocuments').resolves(0);

      const req = mkReq({ query: { department: 'X' } });
      const res = mkRes();

      await employeeController.getEmployees(req, res);
      expect(res.json.firstCall.args[0].employees).to.deep.equal([]);
    });

    it('should return 500 on database error', async () => {
      sand.stub(User, 'find').throws(new Error('DB fail'));
      const req = mkReq(), res = mkRes();

      await employeeController.getEmployees(req, res);
      expect(res.status.calledWith(500)).to.be.true;
    });
  });

  describe('getEmployeeById Function Test', () => {
    it('should return employee by id successfully', async () => {
      const employee = { _id: 'u1', name: 'Alice' };
      sand.stub(User, 'findById').returns({ select: sand.stub().resolves(employee) });

      const req = mkReq({ params: { id: 'u1' } });
      const res = mkRes();

      await employeeController.getEmployeeById(req, res);
      expect(res.json.firstCall.args[0].employee).to.deep.equal(employee);
    });

    it('should return 404 if employee is not found', async () => {
      sand.stub(User, 'findById').returns({ select: sand.stub().resolves(null) });

      const req = mkReq({ params: { id: 'missing' } });
      const res = mkRes();

      await employeeController.getEmployeeById(req, res);
      expect(res.status.calledWith(404)).to.be.true;
    });

    it('should return 500 on database error', async () => {
      sand.stub(User, 'findById').throws(new Error('boom'));

      const req = mkReq({ params: { id: 'x' } });
      const res = mkRes();

      await employeeController.getEmployeeById(req, res);
      expect(res.status.calledWith(500)).to.be.true;
    });
  });

  describe('createEmployee Function Test', () => {
    it('should create a new employee successfully', async () => {
      sand.stub(User, 'findOne').resolves(null);
      sand.stub(User.prototype, 'save').resolves();
      sand.stub(User.prototype, 'toJSON').returns({ _id: 'u1', name: 'New', email: 'n@e.com' });

      const req = mkReq({
        body: { name: ' New ', email: 'NE@E.COM', password: '123456', employeeId: 'E001', department: 'Eng' },
      });
      const res = mkRes();

      await employeeController.createEmployee(req, res);
      expect(res.status.calledWith(201)).to.be.true;
      expect(res.json.firstCall.args[0].employee).to.include({ name: 'New', email: 'n@e.com' });
    });

    it('should return 400 if required fields are missing', async () => {
      const req = mkReq({ body: { name: 'A' } });
      const res = mkRes();

      await employeeController.createEmployee(req, res);
      expect(res.status.calledWith(400)).to.be.true;
    });

    it('should return 400 if email or employeeId already exists', async () => {
      sand.stub(User, 'findOne').resolves({ email: 'x@y.com' });

      const req = mkReq({
        body: { name: 'A', email: 'x@y.com', password: '123456', employeeId: 'E1', department: 'D' },
      });
      const res = mkRes();

      await employeeController.createEmployee(req, res);
      expect(res.status.calledWith(400)).to.be.true;
    });
  });

  describe('updateEmployee Function Test', () => {
    it('should update employee and hash password when provided', async () => {
      const id = 'u1';
      const existing = { _id: id, email: 'old@e.com', role: 'employee' };
      sand.stub(User, 'findById').resolves(existing);
      sand.stub(User, 'findOne').resolves(null);
      sand.stub(bcrypt, 'genSalt').resolves('salt');
      sand.stub(bcrypt, 'hash').resolves('hashed');
      sand.stub(User, 'findByIdAndUpdate').resolves({ _id: id, name: 'New', email: 'new@e.com', role: 'employee' });

      const req = mkReq({
        params: { id },
        body: { name: ' New ', email: 'new@e.com', department: ' Eng ', password: '123456' },
      });
      const res = mkRes();

      await employeeController.updateEmployee(req, res);
      expect(res.json.firstCall.args[0].employee.email).to.equal('new@e.com');
    });

    it('should return 400 if required fields are missing', async () => {
      const req = mkReq({ params: { id: 'u1' }, body: { name: 'A' } });
      const res = mkRes();

      await employeeController.updateEmployee(req, res);
      expect(res.status.calledWith(400)).to.be.true;
    });

    it('should return 404 if employee is not found', async () => {
      sand.stub(User, 'findById').resolves(null);

      const req = mkReq({
        params: { id: 'missing' },
        body: { name: 'A', email: 'a@a.com', department: 'D' },
      });
      const res = mkRes();

      await employeeController.updateEmployee(req, res);
      expect(res.status.calledWith(404)).to.be.true;
    });
  });
});



/* ================================
 * Shift Management:
 * ================================ */
describe('Shift Management:', () => {
  let sand;
  beforeEach(() => {
    sand = sinon.createSandbox();
    sand.stub(console, 'error');
    sand.stub(console, 'warn');
  });
  afterEach(() => sand.restore());

  describe('getAllShifts Function Test', () => {
    it('should return filtered shifts successfully', async () => {
      const docs = [{ _id: 's1' }];
      sand.stub(Shift, 'find').returns(mkChainFind(docs));

      const req = mkReq({ query: { userId: 'u1', shiftType: 'morning', status: 'assigned' } });
      const res = mkRes();

      await shiftController.getAllShifts(req, res);
      expect(res.json.calledWith(docs)).to.be.true;
    });

    it('should apply date range filters successfully', async () => {
      const docs = [{ _id: 's2' }];
      sand.stub(Shift, 'find').returns(mkChainFind(docs));

      const req = mkReq({ query: { startDate: '2025-01-01', endDate: '2025-12-31' } });
      const res = mkRes();

      await shiftController.getAllShifts(req, res);
      expect(res.json.calledWith(docs)).to.be.true;
    });

    it('should return 500 on database error', async () => {
      sand.stub(Shift, 'find').throws(new Error('fail'));
      const req = mkReq();
      const res = mkRes();

      await shiftController.getAllShifts(req, res);
      expect(res.status.calledWith(500)).to.be.true;
    });
  });

  describe('assignShift Function Test', () => {
    it('should create shift with explicit start and end time successfully', async () => {
      sand.stub(User, 'findById').resolves({ _id: 'u1' });

      sand.stub(ShiftFactory, 'createShift').callsFake((type, uid, st, et) => ({
        validate: () => {},
        create: async () => ({
          _id: new mongoose.Types.ObjectId(),
          userId: uid,
          shiftType: type,
          startTime: st,
          endTime: et,
        }),
      }));

      sand.stub(Shift, 'find').returns(mkChainFind([{ _id: 'sh1' }]));

      const req = mkReq({
        body: {
          userId: 'u1',
          shiftType: 'morning',
          startTime: '2025-10-01T09:00:00Z',
          endTime: '2025-10-01T17:00:00Z',
        },
      });
      const res = mkRes();

      await shiftController.assignShift(req, res);
      expect(res.status.calledWith(201)).to.be.true;
      expect(res.json.firstCall.args[0]).to.deep.equal([{ _id: 'sh1' }]);
    });

    it('should return 400 if userId or shiftType is missing', async () => {
      const req = mkReq({ body: {} });
      const res = mkRes();

      await shiftController.assignShift(req, res);
      expect(res.status.calledWith(400)).to.be.true;
    });

    it('should return 404 if user is not found', async () => {
      sand.stub(User, 'findById').resolves(null);

      const req = mkReq({ body: { userId: 'uX', shiftType: 'morning', date: '2025-10-01' } });
      const res = mkRes();

      await shiftController.assignShift(req, res);
      expect(res.status.calledWith(404)).to.be.true;
    });
  });

  describe('updateShiftStatus Function Test', () => {
    it('should allow user to update own shift status', async () => {
      const id = new mongoose.Types.ObjectId().toString();
      const owner = new mongoose.Types.ObjectId().toString();

      const shiftDoc = {
        _id: id,
        userId: owner,
        status: 'assigned',
        save: sand.stub().resolvesThis(),
      };
      const populateStub = sand.stub().resolves({ _id: id, userId: owner, status: 'confirmed' });

      sand.stub(Shift, 'findById')
        .onFirstCall().resolves(shiftDoc)
        .onSecondCall().returns({ populate: populateStub });

      const req = mkReq({ params: { id }, user: { id: owner, userId: owner }, body: { status: 'confirmed' } });
      const res = mkRes();

      await shiftController.updateShiftStatus(req, res);
      expect(shiftDoc.save.calledOnce).to.be.true;
      expect(populateStub.calledOnce).to.be.true;
      expect(res.json.calledOnce).to.be.true;
    });

    it('should return 400 if status value is invalid', async () => {
      const req = mkReq({ params: { id: 'x' }, body: { status: 'weird' } });
      const res = mkRes();

      await shiftController.updateShiftStatus(req, res);
      expect(res.status.calledWith(400)).to.be.true;
    });

    it('should return 403 if user tries to modify others shift', async () => {
      sand.stub(Shift, 'findById').resolves({ _id: 's1', userId: 'owner' });

      const req = mkReq({
        params: { id: 's1' },
        user: { id: 'another', userId: 'another' },
        body: { status: 'confirmed' },
      });
      const res = mkRes();

      await shiftController.updateShiftStatus(req, res);
      expect(res.status.calledWith(403)).to.be.true;
    });
  });

  describe('deleteShift Function Test', () => {
    it('should delete shift successfully when it exists', async () => {
      sand.stub(Shift, 'findById').resolves({ _id: 's1' });
      sand.stub(Shift, 'findByIdAndDelete').resolves();

      const req = mkReq({ params: { id: 's1' } });
      const res = mkRes();

      await shiftController.deleteShift(req, res);
      expect(res.json.calledWith({ message: 'Shift deleted successfully' })).to.be.true;
    });

    it('should return 404 if shift is not found', async () => {
      sand.stub(Shift, 'findById').resolves(null);

      const req = mkReq({ params: { id: 'missing' } });
      const res = mkRes();

      await shiftController.deleteShift(req, res);
      expect(res.status.calledWith(404)).to.be.true;
    });

    it('should return 500 on database error', async () => {
      sand.stub(Shift, 'findById').throws(new Error('x'));

      const req = mkReq({ params: { id: 'x' } });
      const res = mkRes();

      await shiftController.deleteShift(req, res);
      expect(res.status.calledWith(500)).to.be.true;
    });
  });
});



/* ================================
 * Leave Management:
 * ================================ */
describe('Leave Management:', () => {
  let sand;
  beforeEach(() => {
    sand = sinon.createSandbox();
    sand.stub(console, 'error');
    sand.stub(console, 'warn');
  });
  afterEach(() => sand.restore());

  describe('createLeave Function Test', () => {
    it('should create leave successfully', async () => {
      const today = new Date();
      const start = new Date(today.getTime() + 24 * 3600 * 1000);
      const end = new Date(today.getTime() + 2 * 24 * 3600 * 1000);

      sand.stub(User, 'findById').returns({ select: sand.stub().resolves({ _id: 'u1', name: 'N', email: 'e', department: 'D' }) });
      sand.stub(Leave, 'findOne').resolves(null);
      sand.stub(Leave.prototype, 'save').resolves();

      const req = mkReq({
        body: { leaveType: 'annual', startDate: start.toISOString(), endDate: end.toISOString(), reason: 'Holiday' },
        user: { userId: 'u1' },
      });
      const res = mkRes();

      await leaveController.createLeave(req, res);
      expect(res.status.calledWith(201)).to.be.true;
    });

    it('should return 400 if required fields are missing', async () => {
      const req = mkReq({ body: {}, user: { userId: 'u1' } });
      const res = mkRes();

      await leaveController.createLeave(req, res);
      expect(res.status.calledWith(400)).to.be.true;
    });

    it('should return 400 if overlapping leave exists', async () => {
      const today = new Date();
      const start = new Date(today.getTime() + 24 * 3600 * 1000);
      const end = new Date(today.getTime() + 2 * 24 * 3600 * 1000);

      sand.stub(User, 'findById').returns({ select: sand.stub().resolves({ _id: 'u1', name: 'N', email: 'e', department: 'D' }) });
      sand.stub(Leave, 'findOne').resolves({ _id: 'existing' });

      const req = mkReq({
        body: { leaveType: 'annual', startDate: start.toISOString(), endDate: end.toISOString(), reason: 'Holiday' },
        user: { userId: 'u1' },
      });
      const res = mkRes();

      await leaveController.createLeave(req, res);
      expect(res.status.calledWith(400)).to.be.true;
    });
  });

  describe('getEmployeeLeaves Function Test', () => {
    it('should return paginated leaves successfully', async () => {
      sand.stub(Leave, 'find').returns(mkChainFind([{ _id: 'l1' }]));
      sand.stub(Leave, 'countDocuments').resolves(1);

      const req = mkReq({ query: { page: 1, limit: 10 }, user: { userId: 'u1' } });
      const res = mkRes();

      await leaveController.getEmployeeLeaves(req, res);
      expect(res.json.calledOnce).to.be.true;
    });

    it('should filter leaves by status successfully', async () => {
      sand.stub(Leave, 'find').returns(mkChainFind([]));
      sand.stub(Leave, 'countDocuments').resolves(0);

      const req = mkReq({ query: { status: 'pending' }, user: { userId: 'u1' } });
      const res = mkRes();

      await leaveController.getEmployeeLeaves(req, res);
      expect(res.json.calledOnce).to.be.true;
    });

    it('should return 500 on database error', async () => {
      sand.stub(Leave, 'find').throws(new Error('x'));

      const req = mkReq({ user: { userId: 'u1' } });
      const res = mkRes();

      await leaveController.getEmployeeLeaves(req, res);
      expect(res.status.calledWith(500)).to.be.true;
    });
  });

  describe('cancelLeave Function Test', () => {
    it('should cancel pending leave of current user successfully', async () => {
      const doc = { status: 'pending', save: sand.stub().resolvesThis() };
      sand.stub(Leave, 'findOne').resolves(doc);

      const req = mkReq({ params: { id: 'l1' }, user: { userId: 'u1' } });
      const res = mkRes();

      await leaveController.cancelLeave(req, res);
      expect(doc.save.calledOnce).to.be.true;
      expect(res.json.calledOnce).to.be.true;
    });

    it('should return 404 if leave is not found or not cancellable', async () => {
      sand.stub(Leave, 'findOne').resolves(null);

      const req = mkReq({ params: { id: 'x' }, user: { userId: 'u1' } });
      const res = mkRes();

      await leaveController.cancelLeave(req, res);
      expect(res.status.calledWith(404)).to.be.true;
    });

    it('should return 500 on database error', async () => {
      sand.stub(Leave, 'findOne').throws(new Error('oops'));

      const req = mkReq({ params: { id: 'x' }, user: { userId: 'u1' } });
      const res = mkRes();

      await leaveController.cancelLeave(req, res);
      expect(res.status.calledWith(500)).to.be.true;
    });
  });

  describe('updateLeaveStatus Function Test', () => {
    it('should approve pending leave successfully', async () => {
      const doc = {
        _id: 'l1',
        status: 'pending',
        save: sand.stub().resolvesThis(),
        populate: sand.stub().resolvesThis(),
      };
      sand.stub(Leave, 'findOne').resolves(doc);

      const req = mkReq({ params: { id: 'l1' }, body: { status: 'approved' }, user: { userId: 'admin' } });
      const res = mkRes();

      await leaveController.updateLeaveStatus(req, res);
      expect(res.json.calledOnce).to.be.true;
    });

    it('should return 400 if status value is invalid', async () => {
      const req = mkReq({ params: { id: 'l1' }, body: { status: 'weird' } });
      const res = mkRes();

      await leaveController.updateLeaveStatus(req, res);
      expect(res.status.calledWith(400)).to.be.true;
    });

    it('should return 404 if pending leave is not found', async () => {
      sand.stub(Leave, 'findOne').resolves(null);

      const req = mkReq({ params: { id: 'lX' }, body: { status: 'approved' } });
      const res = mkRes();

      await leaveController.updateLeaveStatus(req, res);
      expect(res.status.calledWith(404)).to.be.true;
    });
  });
});



/* =========================================
 * Attendance Tracking & Reporting:
 * ========================================= */
describe('Attendance Tracking & Reporting:', () => {
  let sand;
  beforeEach(() => {
    sand = sinon.createSandbox();
    sand.stub(console, 'error');
    sand.stub(console, 'warn');
  });
  afterEach(() => sand.restore());

  describe('getMyAttendance Function Test', () => {
    it('should return last 100 attendance records successfully', async () => {
      sand.stub(Attendance, 'find').returns(mkChainFind([{ _id: 'a1' }]));
      const req = mkReq({ user: { id: 'u1' } });
      const res = mkRes();

      await attendanceController.getMyAttendance(req, res);
      expect(res.json.calledWith([{ _id: 'a1' }])).to.be.true;
    });

    it('should return empty list if user has no attendance', async () => {
      sand.stub(Attendance, 'find').returns(mkChainFind([]));
      const req = mkReq({ user: { id: 'u1' } });
      const res = mkRes();

      await attendanceController.getMyAttendance(req, res);
      expect(res.json.calledWith([])).to.be.true;
    });

    it('should return 500 on database error', async () => {
      sand.stub(Attendance, 'find').throws(new Error('x'));
      const req = mkReq({ user: { id: 'u1' } });
      const res = mkRes();

      await attendanceController.getMyAttendance(req, res);
      expect(res.status.calledWith(500)).to.be.true;
    });
  });

  describe('markLogin Function Test', () => {
    it('should create login record successfully', async () => {
      sand.stub(Attendance, 'create').resolves({ _id: 'a1' });
      const req = mkReq({ headers: { 'user-agent': 'ua' }, user: { id: 'u1' } });
      const res = mkRes();

      await attendanceController.markLogin(req, res);
      expect(res.status.calledWith(201)).to.be.true;
      expect(res.json.calledWith({ _id: 'a1' })).to.be.true;
    });

    it('should return 500 on database error', async () => {
      sand.stub(Attendance, 'create').throws(new Error('x'));
      const req = mkReq({ headers: { 'user-agent': 'ua' }, user: { id: 'u1' } });
      const res = mkRes();

      await attendanceController.markLogin(req, res);
      expect(res.status.calledWith(500)).to.be.true;
    });

    it('should include userAgent and ip from request payload', async () => {
      let captured;
      sand.stub(Attendance, 'create').callsFake(async (payload) => { captured = payload; return { _id: 'a1' }; });
      const req = mkReq({ headers: { 'user-agent': 'MyUA' }, ip: '1.2.3.4', user: { id: 'u1' } });
      const res = mkRes();

      await attendanceController.markLogin(req, res);
      expect(captured.userAgent).to.equal('MyUA');
      expect(captured.ip).to.equal('1.2.3.4');
    });
  });

  describe('markLogout Function Test', () => {
    it('should close latest active session successfully', async () => {
      const updated = { _id: 'a1', logoutAt: new Date() };
      sand.stub(Attendance, 'findOneAndUpdate').resolves(updated);

      const req = mkReq({ user: { id: 'u1' } });
      const res = mkRes();

      await attendanceController.markLogout(req, res);
      expect(res.json.calledWith(updated)).to.be.true;
    });

    it('should return 404 if no active session is found', async () => {
      sand.stub(Attendance, 'findOneAndUpdate').resolves(null);

      const req = mkReq({ user: { id: 'u1' } });
      const res = mkRes();

      await attendanceController.markLogout(req, res);
      expect(res.status.calledWith(404)).to.be.true;
    });

    it('should return 500 on database error', async () => {
      sand.stub(Attendance, 'findOneAndUpdate').throws(new Error('x'));

      const req = mkReq({ user: { id: 'u1' } });
      const res = mkRes();

      await attendanceController.markLogout(req, res);
      expect(res.status.calledWith(500)).to.be.true;
    });
  });

  // NEW: updateAttendance Function Test (adminController)
  describe('updateAttendance Function Test', () => {
    it('should update attendance record successfully', async () => {
      const id = new mongoose.Types.ObjectId().toString();
      const updatedDoc = {
        _id: id,
        userId: { _id: 'u1', name: 'Alice', email: 'a@ex.com' },
        loginAt: new Date('2025-10-01T09:00:00Z'),
        logoutAt: new Date('2025-10-01T17:00:00Z'),
      };

      // findByIdAndUpdate(...).populate('userId') shape
      const populateStub = sand.stub().resolves(updatedDoc);
      sand.stub(Attendance, 'findByIdAndUpdate').returns({ populate: populateStub });

      const req = mkReq({
        params: { id },
        body: { loginAt: '2025-10-01T09:00:00Z', logoutAt: '2025-10-01T17:00:00Z' },
      });
      const res = mkRes();

      await adminController.updateAttendance(req, res);
      expect(populateStub.calledOnce).to.be.true;
      expect(res.json.calledWith(updatedDoc)).to.be.true;
    });

    it('should return 404 if attendance is not found', async () => {
      const id = new mongoose.Types.ObjectId().toString();
      const populateStub = sand.stub().resolves(null);
      sand.stub(Attendance, 'findByIdAndUpdate').returns({ populate: populateStub });

      const req = mkReq({ params: { id }, body: { logoutAt: null } });
      const res = mkRes();

      await adminController.updateAttendance(req, res);
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledWithMatch({ message: 'Attendance not found' })).to.be.true;
    });

    it('should return 500 on database error', async () => {
      const id = new mongoose.Types.ObjectId().toString();
      sand.stub(Attendance, 'findByIdAndUpdate').throws(new Error('DB error'));

      const req = mkReq({ params: { id }, body: { loginAt: '2025-10-01T09:00:00Z' } });
      const res = mkRes();

      await adminController.updateAttendance(req, res);
      expect(res.status.calledWith(500)).to.be.true;
    });
  });
});
