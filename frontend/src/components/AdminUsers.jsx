import { useEffect, useState } from 'react';
import axiosInstance from '../../axiosConfig';
import { useAuth } from '../../context/AuthContext';
import { ADMIN_EMAIL } from '../../config/admin';

export default function AdminUsers() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');

  const load = async () => {
    setErr('');
    try {
      const { data } = await axiosInstance.get('/api/admin/users', {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setRows(data);
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || 'Failed to load users');
    }
  };

  useEffect(() => { load();  }, []);

  const startEdit = (u) => {
    setEditingId(u._id);
    setForm({ name: u.name || '', email: u.email || '', password: '' });
  };
  const cancel = () => {
    setEditingId(null);
    setForm({ name: '', email: '', password: '' });
  };

  const save = async (id) => {
    try {
      await axiosInstance.put(`/api/admin/users/${id}`, form, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      await load();
      cancel();
    } catch (e) {
      alert(e?.response?.data?.message || e.message || 'Save failed');
    }
  };

  const del = async (id, email) => {
    if (!window.confirm(`Delete user ${email}? This will also delete their attendance records.`)) return;
    try {
      await axiosInstance.delete(`/api/admin/users/${id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      await load();
    } catch (e) {
      alert(e?.response?.data?.message || e.message || 'Delete failed');
    }
  };

  // optional: hide page if not admin email (frontend guard; backend still enforces)
  if (user?.email !== ADMIN_EMAIL) return <div className="p-6">Admin only.</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Manage Users</h2>
      {err && <div className="bg-red-100 text-red-700 p-3 mb-3 rounded">{err}</div>}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 border">Name</th>
              <th className="px-4 py-2 border">Email</th>
              <th className="px-4 py-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u._id}>
                <td className="px-4 py-2 border">
                  {editingId === u._id ? (
                    <input className="border p-1" value={form.name} onChange={(e)=>setForm({...form, name:e.target.value})}/>
                  ) : u.name}
                </td>
                <td className="px-4 py-2 border">
                  {editingId === u._id ? (
                    <input className="border p-1" value={form.email} onChange={(e)=>setForm({...form, email:e.target.value})}/>
                  ) : u.email}
                </td>
                <td className="px-4 py-2 border">
                  {editingId === u._id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        placeholder="New password (optional)"
                        className="border p-1"
                        value={form.password}
                        onChange={(e)=>setForm({...form, password:e.target.value})}
                      />
                      <button className="bg-green-600 text-white px-3 py-1 rounded" onClick={()=>save(u._id)}>Save</button>
                      <button className="bg-gray-500 text-white px-3 py-1 rounded" onClick={cancel}>Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={()=>startEdit(u)}>Edit</button>
                      <button className="bg-red-600 text-white px-3 py-1 rounded" onClick={()=>del(u._id, u.email)}>Delete</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
