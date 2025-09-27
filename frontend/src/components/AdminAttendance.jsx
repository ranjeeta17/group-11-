import { useEffect, useState } from 'react';
import axiosInstance from '../axiosConfig';
import { useAuth } from '../context/AuthContext';
import { ADMIN_EMAIL } from '../config/admin';

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
// convert Date -> "YYYY-MM-DDTHH:mm" for <input type="datetime-local">
function toLocalInputValue(date) {
  if (!date) return '';
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  const hh = String(d.getHours()).padStart(2,'0');
  const mi = String(d.getMinutes()).padStart(2,'0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export default function AdminAttendance() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ loginAt: '', logoutAt: '' });

  const load = async () => {
    setErr('');
    try {
      const { data } = await axiosInstance.get('/api/admin/attendance', {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setRows(data);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || 'Failed to load');
    }
  };

  useEffect(() => { load(); }, []);

  const startEdit = (r) => {
    setEditingId(r._id);
    setForm({
      loginAt: toLocalInputValue(r.loginAt),
      logoutAt: r.logoutAt ? toLocalInputValue(r.logoutAt) : '',
    });
  };
  const cancel = () => {
    setEditingId(null);
    setForm({ loginAt: '', logoutAt: '' });
  };

  const save = async (id) => {
    try {
      await axiosInstance.put(`/api/admin/attendance/${id}`, {
        loginAt: form.loginAt ? new Date(form.loginAt).toISOString() : undefined,
        logoutAt: form.logoutAt ? new Date(form.logoutAt).toISOString() : null,
      }, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      await load();
      cancel();
    } catch (e) {
      alert(e?.response?.data?.message || e.message || 'Save failed');
    }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this attendance record?')) return;
    try {
      await axiosInstance.delete(`/api/admin/attendance/${id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      await load();
    } catch (e) {
      alert(e?.response?.data?.message || e.message || 'Delete failed');
    }
  };

  if (user?.email !== ADMIN_EMAIL) return <div className="p-6">Admin only.</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">All Users Attendance</h2>
      {err && <div className="bg-red-100 text-red-700 p-3 mb-3 rounded">{err}</div>}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 border">User</th>
              <th className="px-4 py-2 border">Email</th>
              <th className="px-4 py-2 border">Login (Day)</th>
              <th className="px-4 py-2 border">Login (Date)</th>
              <th className="px-4 py-2 border">Login (Time)</th>
              <th className="px-4 py-2 border">Logout (Day)</th>
              <th className="px-4 py-2 border">Logout (Date)</th>
              <th className="px-4 py-2 border">Logout (Time)</th>
              <th className="px-4 py-2 border">Duration</th>
              <th className="px-4 py-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const lin = fmtParts(r.loginAt);
              const lout = fmtParts(r.logoutAt);
              const durMs = r.logoutAt ? (new Date(r.logoutAt) - new Date(r.loginAt)) : null;
              const dur = fmtDuration(durMs);

              const isEditing = editingId === r._id;

              return (
                <tr key={r._id}>
                  <td className="px-4 py-2 border">{r.userId?.name || '—'}</td>
                  <td className="px-4 py-2 border">{r.userId?.email || '—'}</td>

                  {/* Login columns */}
                  <td className="px-4 py-2 border">{lin.day}</td>
                  <td className="px-4 py-2 border">
                    {isEditing ? (
                      <input
                        type="datetime-local"
                        className="border p-1"
                        value={form.loginAt}
                        onChange={(e)=>setForm({...form, loginAt:e.target.value})}
                      />
                    ) : lin.date}
                  </td>
                  <td className="px-4 py-2 border">{lin.time}</td>

                  {/* Logout columns */}
                  <td className="px-4 py-2 border">{lout.day}</td>
                  <td className="px-4 py-2 border">
                    {isEditing ? (
                      <input
                        type="datetime-local"
                        className="border p-1"
                        value={form.logoutAt}
                        onChange={(e)=>setForm({...form, logoutAt:e.target.value})}
                      />
                    ) : lout.date}
                  </td>
                  <td className="px-4 py-2 border">{lout.time}</td>

                  <td className="px-4 py-2 border">{dur}</td>

                  <td className="px-4 py-2 border">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <button className="bg-green-600 text-white px-3 py-1 rounded" onClick={()=>save(r._id)}>Save</button>
                        <button className="bg-gray-500 text-white px-3 py-1 rounded" onClick={cancel}>Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={()=>startEdit(r)}>Edit</button>
                        <button className="bg-red-600 text-white px-3 py-1 rounded" onClick={()=>del(r._id)}>Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
