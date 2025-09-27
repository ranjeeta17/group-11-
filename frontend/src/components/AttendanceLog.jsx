import { useEffect, useState } from 'react';
import axiosInstance from '../axiosConfig';
import { useAuth } from '../context/AuthContext';

function fmtParts(d) {
  if (!d) return { day: '-', date: '-', time: '-' };
  const dt = new Date(d);
  return {
    day: dt.toLocaleDateString(undefined, { weekday: 'short' }),
    date: dt.toLocaleDateString(),
    time: dt.toLocaleTimeString(),
  };
}
function fmtDuration(ms) {
  if (ms == null || ms < 0) return '-';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(ss)}`;
}

export default function AttendanceLog() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axiosInstance.get('/api/attendance/my', {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setRows(data);
      } catch (err) {
        console.error(err);
        alert('Failed to load attendance log');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">My Login/Logout History</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 border">User</th>
              <th className="px-4 py-2 border">Login (Day)</th>
              <th className="px-4 py-2 border">Login (Date)</th>
              <th className="px-4 py-2 border">Login (Time)</th>
              <th className="px-4 py-2 border">Logout (Day)</th>
              <th className="px-4 py-2 border">Logout (Date)</th>
              <th className="px-4 py-2 border">Logout (Time)</th>
              <th className="px-4 py-2 border">Duration</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const lin = fmtParts(r.loginAt);
              const lout = fmtParts(r.logoutAt);
              const durMs = r.logoutAt ? (new Date(r.logoutAt) - new Date(r.loginAt)) : null;
              const dur = fmtDuration(durMs);
              return (
                <tr key={r._id}>
                  <td className="px-4 py-2 border">{user?.name || 'Me'}</td>
                  <td className="px-4 py-2 border">{lin.day}</td>
                  <td className="px-4 py-2 border">{lin.date}</td>
                  <td className="px-4 py-2 border">{lin.time}</td>
                  <td className="px-4 py-2 border">{lout.day}</td>
                  <td className="px-4 py-2 border">{lout.date}</td>
                  <td className="px-4 py-2 border">{lout.time}</td>
                  <td className="px-4 py-2 border">{dur}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
