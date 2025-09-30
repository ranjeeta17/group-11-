import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import axiosInstance from '../../axiosConfig';

const MyAttendance = ({ onBack }) => {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()); // 0-11
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);

  const months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];

  // Build from/to (inclusive) for selected month in local timezone
  const range = useMemo(() => {
    const from = new Date(Date.UTC(currentYear, currentMonth, 1, 0, 0, 0));
    const to = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59)); // end of month
    const toISO = to.toISOString().slice(0, 10);
    const fromISO = from.toISOString().slice(0, 10);
    return { fromISO, toISO };
  }, [currentMonth, currentYear]);

  useEffect(() => {
    setPage(1);
  }, [currentMonth, currentYear]);

  useEffect(() => {
    fetchTimeRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.fromISO, range.toISO, page]);

  const fetchTimeRecords = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axiosInstance.get('/api/time-records/mine'); // no params
console.log('My records (no filters):', data);

          console.log('Time records API response:', data);

      if (data.success) {
        setRecords(data.records || []);
        const p = data.pagination || {};
        setHasNext(Boolean(p.hasNext));
      } else {
        setRecords([]);
        setHasNext(false);
      }
    } catch (e) {
      console.error('Error fetching time records:', e);
      setError(e?.response?.data?.message || 'Failed to load time records');
      setRecords([]);
      setHasNext(false);
    } finally {
      setLoading(false);
    }
  };

  // Helpers
  const fmtDate = (isoDateStr) => {
    if (!isoDateStr) return '-';
    try {
      const d = new Date(isoDateStr);
      return d.toLocaleDateString();
    } catch { return '-'; }
  };

  const fmtTime = (isoDateStr) => {
    if (!isoDateStr) return '-';
    try {
      const d = new Date(isoDateStr);
      return d.toLocaleTimeString();
    } catch { return '-'; }
  };

  const hoursFromMinutes = (m) => (m == null ? '-' : (m / 60).toFixed(2));

  const summary = useMemo(() => {
    if (!records?.length) {
      return { sessions: 0, totalHours: 0, averageHours: 0, openSessions: 0 };
    }
    const totalMinutes = records.reduce((sum, r) => sum + (r.durationMinutes || 0), 0);
    const sessions = records.length;
    const openSessions = records.filter(r => !r.logoutAt).length;
    const totalHours = +(totalMinutes / 60).toFixed(2);
    const averageHours = +(totalHours / sessions).toFixed(2);
    return { sessions, totalHours, averageHours, openSessions };
  }, [records]);

  const getStatusPill = (rec) => {
    const isOpen = !rec.logoutAt;
    const label = isOpen ? 'Open' : 'Closed';
    const cls = isOpen
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-green-100 text-green-800';
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading time records...</p>
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
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Back Button */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-gray-100 hover:text-gray-300 font-medium inline-flex items-center transition duration-200"
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My Time Records</h2>
        <p className="text-gray-300 mt-1">Your login and logout sessions and durations (Brisbane time)</p>
      </div>

      {/* Month/Year Filter */}
      {/* <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h3 className="text-lg font-medium text-gray-900">Filter by Month</h3>
          <div className="flex space-x-4">
            <select
              value={currentMonth}
              onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              {months.map((month, index) => (
                <option key={index} value={index}>{month}</option>
              ))}
            </select>
            <select
              value={currentYear}
              onChange={(e) => setCurrentYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={2023}>2023</option>
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>
          </div>
        </div>
      </div> */}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <p className="text-sm font-medium text-gray-600">Sessions</p>
          <p className="text-3xl font-bold text-gray-900">{summary.sessions}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <p className="text-sm font-medium text-gray-600">Onging</p>
          <p className="text-3xl font-bold text-yellow-600">{summary.openSessions}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <p className="text-sm font-medium text-gray-600">Total Hours</p>
          <p className="text-3xl font-bold text-blue-600">{summary.totalHours}h</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <p className="text-sm font-medium text-gray-600">Avg Hours</p>
          <p className="text-3xl font-bold text-purple-600">{summary.averageHours}h</p>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Sessions — {months[currentMonth]} {currentYear}
          </h3>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className={`px-3 py-1.5 rounded-md border text-sm ${page <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
            >
              Prev
            </button>
            <span className="text-sm text-gray-600">Page {page}</span>
            <button
              disabled={!hasNext}
              onClick={() => setPage(p => p + 1)}
              className={`px-3 py-1.5 rounded-md border text-sm ${!hasNext ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
            >
              Next
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                    No sessions found for this period.
                  </td>
                </tr>
              )}
              {records.map((rec) => {
                const localIn = rec.loginLocal || {};
                const localOut = rec.logoutLocal || {};

                // Prefer precomputed local strings from API; fallback to ISO fields
                const dateStr = localIn.dateISO || (rec.loginAt ? new Date(rec.loginAt).toISOString().slice(0,10) : '-');
                const dayName = localIn.dayName || '-';
                const inTime = localIn.time || (rec.loginAt ? new Date(rec.loginAt).toLocaleTimeString() : '-');
                const outTime = localOut.time || (rec.logoutAt ? new Date(rec.logoutAt).toLocaleTimeString() : '-');

                const duration = rec.durationMinutes != null
                  ? `${hoursFromMinutes(rec.durationMinutes)}h`
                  : (rec.logoutAt ? '-' : '—');

                return (
                  <tr key={rec._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{dateStr}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{dayName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{inTime}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rec.logoutAt ? outTime : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{duration}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusPill(rec)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {rec.userAgent ? rec.userAgent.split(')')[0] + ')' : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </main>
  );
};

export default MyAttendance;
