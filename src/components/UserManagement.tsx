import React, { useState, useEffect } from "react";
import { User, Shield, ShieldOff, Trash2, Edit2, Check, X, UserPlus } from "lucide-react";

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  
  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdate = async (id: string, updates: any) => {
    try {
      await fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updates)
      });
      fetchUsers();
      setEditingId(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este usuario?")) return;
    try {
      await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchUsers();
    } catch (e) {
      console.error(e);
    }
  };

  const startEdit = (user: any) => {
    setEditingId(user.id);
    setEditForm({ name: user.name, role: user.role, isBlocked: user.isBlocked, passwordHash: "" });
  };

  if (loading) return <div className="text-white/50 text-sm">Cargando usuarios...</div>;

  return (
    <div className="bg-[#1c1b1b] rounded-3xl border border-white/5 p-6 mb-10 overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-lg text-[#e5e2e1] flex items-center gap-2">
          <User className="w-5 h-5 text-[#818cf8]" />
          Gestión de Cuentas y Accesos
        </h3>
        <span className="bg-[#818cf8]/10 text-[#818cf8] text-xs font-mono px-3 py-1 rounded-full">
          {users.length} Usuarios
        </span>
      </div>

      <div className="overflow-x-auto custom-scrollbar pb-4">
        <table className="w-full text-left text-sm text-[#c6c5d5]">
          <thead className="text-xs uppercase bg-[#201f1f] text-white/50 border-b border-white/5">
            <tr>
              <th className="px-4 py-3 rounded-tl-xl">Usuario</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right rounded-tr-xl">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-4">
                  {editingId === u.id ? (
                    <input
                      type="text"
                      className="bg-black/30 border border-white/10 rounded px-2 py-1 text-white text-sm w-full outline-none"
                      value={editForm.name}
                      onChange={e => setEditForm({...editForm, name: e.target.value})}
                    />
                  ) : (
                    <div>
                      <div className="font-medium text-white">{u.name}</div>
                      <div className="text-xs text-white/40 font-mono mt-0.5">{u.email}</div>
                    </div>
                  )}
                </td>
                <td className="px-4 py-4">
                  {editingId === u.id ? (
                    <select
                      className="bg-black/30 border border-white/10 rounded px-2 py-1 text-white text-sm outline-none"
                      value={editForm.role}
                      onChange={e => setEditForm({...editForm, role: e.target.value})}
                    >
                      <option value="user">Usuario</option>
                      <option value="admin">Administrador</option>
                    </select>
                  ) : (
                    <span className={`px-2.5 py-1 text-[10px] font-mono rounded-full border ${u.role === 'admin' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-white/5 text-white/60 border-white/10'}`}>
                      {u.role.toUpperCase()}
                    </span>
                  )}
                </td>
                <td className="px-4 py-4">
                  {editingId === u.id ? (
                    <button
                      onClick={() => setEditForm({...editForm, isBlocked: !editForm.isBlocked})}
                      className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${editForm.isBlocked ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}
                    >
                      {editForm.isBlocked ? <ShieldOff className="w-3 h-3"/> : <Shield className="w-3 h-3"/>}
                      {editForm.isBlocked ? "Bloqueado" : "Activo"}
                    </button>
                  ) : (
                    <span className={`flex items-center gap-1.5 text-xs ${u.isBlocked ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {u.isBlocked ? <ShieldOff className="w-3 h-3"/> : <CheckCircle className="w-3 h-3"/>}
                      {u.isBlocked ? 'Bloqueado' : 'Activo'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-4 text-right">
                  {editingId === u.id ? (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingId(null)} className="p-1.5 text-white/40 hover:text-white bg-white/5 rounded-lg"><X className="w-4 h-4"/></button>
                      <button onClick={() => handleUpdate(u.id, editForm)} className="p-1.5 text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 rounded-lg"><Check className="w-4 h-4"/></button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => startEdit(u)} className="p-1.5 text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 rounded-lg"><Edit2 className="w-4 h-4"/></button>
                      <button onClick={() => handleDelete(u.id)} className="p-1.5 text-rose-400 hover:text-rose-300 bg-rose-500/10 rounded-lg"><Trash2 className="w-4 h-4"/></button>
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
};

const CheckCircle = ({className}: {className?: string}) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);
