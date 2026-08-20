import React, { useState, useEffect } from 'react';
import { Activity, Cpu, Database, Network, Shield, Terminal as TerminalIcon, Users, Link as LinkIcon, Check, Trash2, Key } from 'lucide-react';
import { UserProfile } from '../types';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export const AdminView: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [tunnelStatus, setTunnelStatus] = useState<string>("Buscando enlace...");
  
  useEffect(() => {
    // Simulate incoming neural data
    const interval = setInterval(() => {
      const types = ['[NET]', '[SYS]', '[MEM]', '[SEC]'];
      const actions = ['Intercepting neural path', 'Garbage collection cycle', 'Quantum state aligned', 'Vector DB synced'];
      const newLog = `${types[Math.floor(Math.random() * types.length)]} ${new Date().toISOString().split('T')[1].slice(0, 8)} - ${actions[Math.floor(Math.random() * actions.length)]} 0x${Math.floor(Math.random()*16777215).toString(16).toUpperCase()}`;
      setLogs(prev => [newLog, ...prev].slice(0, 15));
    }, 1500);

    // Fetch real admin data
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => {
          if (!r.ok) throw new Error("Not OK");
          return r.json();
        })
        .then(d => {
          if (Array.isArray(d.users)) setUsers(d.users);
          else setUsers([]);
        })
        .catch(err => {
          console.error("Error fetching users:", err);
          setUsers([]);
        });

      // Fetch tunnel status and start if not running
      fetch('/api/admin/tunnel/status', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => {
          if (d.url) {
            setPublicUrl(d.url);
            setTunnelStatus("Túnel Seguro Activo");
          } else {
            setTunnelStatus("Generando túnel cuántico...");
            fetch('/api/admin/tunnel/start', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
              .then(r => r.json())
              .then(d2 => {
                if (d2.url) {
                  setPublicUrl(d2.url);
                  setTunnelStatus("Túnel Seguro Activo");
                } else {
                  setTunnelStatus("Error al iniciar el túnel remoto");
                }
              }).catch(() => setTunnelStatus("Fallo en la conexión del túnel"));
          }
        })
        .catch(() => setTunnelStatus("Desconectado"));
    }

    return () => clearInterval(interval);
  }, []);

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar este perfil permanentemente?")) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setUsers(users.filter(u => u.id !== userId));
      else alert("Error al eliminar usuario.");
    } catch (err) { alert("Error de red"); }
  };

  const handleChangePassword = async (userId: string) => {
    const newPass = window.prompt("Introduce la nueva contraseña para este usuario (mínimo 4 caracteres):");
    if (!newPass) return;
    if (newPass.length < 4) { alert("La contraseña debe tener al menos 4 caracteres."); return; }
    
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ passwordHash: newPass })
      });
      if (res.ok) alert("Contraseña actualizada exitosamente.");
      else alert("Error al actualizar la contraseña.");
    } catch (err) { alert("Error de red"); }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      } else {
        const data = await res.json();
        alert(data.error || "Error al actualizar el rol.");
      }
    } catch (err) {
      alert("Error de red");
    }
  };

  const handleNewProfile = async () => {
    const name = window.prompt("Nombre del nuevo usuario:");
    if (!name) return;
    const email = window.prompt("Email o identificador del usuario:");
    if (!email) return;
    const password = window.prompt("Contraseña (mínimo 4 caracteres):");
    if (!password || password.length < 4) { alert("Contraseña inválida."); return; }
    
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      if (res.ok) {
        const data = await res.json();
        setUsers([...users, { id: data.user.id, name: data.user.name, email: data.user.email, role: data.user.role }]);
      } else {
        const errData = await res.json();
        alert("Error: " + errData.error);
      }
    } catch (err) { alert("Error de red"); }
  };

  return (
    <div className="flex-1 ml-0 md:ml-[var(--sidebar-width)] transition-all duration-300 min-h-screen bg-[#0a0a0c] text-[#e5e2e1] pt-24 px-6 pb-20 relative overflow-hidden font-mono">
      {/* Background FX */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/10 via-[#0a0a0c] to-[#0a0a0c] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 mb-2 uppercase tracking-widest flex items-center gap-4">
              <Shield className="w-10 h-10 text-indigo-500" />
              Centro de Comando Neural
            </h1>
            <p className="text-[#818cf8]/60 uppercase tracking-widest text-xs">Administración Global A.R.I.A. v5.0 // Acceso Nivel 1</p>
          </div>
          <div className="flex gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-500 text-xs font-bold uppercase">Online</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* CPU Card */}
          <div className="bg-black/50 border border-indigo-500/30 rounded-2xl p-6 backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-indigo-500/5 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500" />
            <div className="flex justify-between items-start mb-4">
              <Cpu className="w-8 h-8 text-indigo-400" />
              <span className="text-2xl font-light text-indigo-300">42%</span>
            </div>
            <h3 className="text-sm uppercase tracking-wider text-gray-400 mb-2">Carga Cognitiva (CPU)</h3>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 w-[42%] shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
            </div>
          </div>

          {/* Memory Card */}
          <div className="bg-black/50 border border-cyan-500/30 rounded-2xl p-6 backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-cyan-500/5 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500" />
            <div className="flex justify-between items-start mb-4">
              <Database className="w-8 h-8 text-cyan-400" />
              <span className="text-2xl font-light text-cyan-300">1.2 GB</span>
            </div>
            <h3 className="text-sm uppercase tracking-wider text-gray-400 mb-2">Memoria Contextual</h3>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 w-[65%] shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
            </div>
          </div>

          {/* Network Card */}
          <div className="bg-black/50 border border-rose-500/30 rounded-2xl p-6 backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-rose-500/5 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500" />
            <div className="flex justify-between items-start mb-4">
              <Network className="w-8 h-8 text-rose-400" />
              <span className="text-2xl font-light text-rose-300">12ms</span>
            </div>
            <h3 className="text-sm uppercase tracking-wider text-gray-400 mb-2">Latencia API</h3>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-rose-500 w-[15%] shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
            </div>
          </div>
        </div>

        {/* Sliders and Matrix Terminal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Matrix Terminal */}
          <div className="bg-black/80 border border-emerald-500/30 rounded-2xl p-6 h-80 flex flex-col shadow-[0_0_30px_rgba(16,185,129,0.1)]">
            <div className="flex items-center gap-3 border-b border-emerald-500/30 pb-4 mb-4">
              <TerminalIcon className="w-5 h-5 text-emerald-500" />
              <h3 className="uppercase tracking-widest text-emerald-500 text-sm font-bold">Terminal de Auditoría Neural</h3>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col-reverse space-y-reverse space-y-1">
              {logs.map((log, i) => (
                <div key={i} className="text-emerald-400/80 text-xs">
                  {log}
                </div>
              ))}
            </div>
          </div>

          {/* Personality Controls */}
          <div className="bg-black/50 border border-white/10 rounded-2xl p-6 h-80 flex flex-col">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-6">
              <Activity className="w-5 h-5 text-[#818cf8]" />
              <h3 className="uppercase tracking-widest text-[#818cf8] text-sm font-bold">Calibración de Personalidad</h3>
            </div>
            
            <div className="flex-1 space-y-8">
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-2 uppercase">
                  <span>Creatividad (Temperatura)</span>
                  <span className="text-indigo-400">0.7</span>
                </div>
                <input type="range" min="0" max="100" defaultValue="70" className="w-full accent-indigo-500 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer" />
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-2 uppercase">
                  <span>Rigor Analítico</span>
                  <span className="text-cyan-400">Alto</span>
                </div>
                <input type="range" min="0" max="100" defaultValue="85" className="w-full accent-cyan-500 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer" />
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-2 uppercase">
                  <span>Longitud de Respuesta</span>
                  <span className="text-rose-400">Media</span>
                </div>
                <input type="range" min="0" max="100" defaultValue="50" className="w-full accent-rose-500 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer" />
              </div>
            </div>
          </div>
        </div>

        {/* Legacy Admin Controls Restored */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Tunnel Sharing */}
          <div className="bg-black/50 border border-indigo-500/30 rounded-2xl p-6 relative overflow-hidden lg:col-span-1">
            <div className="flex items-center gap-3 mb-6">
              <LinkIcon className="w-6 h-6 text-indigo-400" />
              <h3 className="uppercase tracking-widest text-indigo-400 text-sm font-bold">Enlace Remoto</h3>
            </div>
            <p className="text-sm text-gray-400 mb-4 leading-relaxed">
              Comparte este enlace para que otros puedan acceder a A.R.I.A desde cualquier lugar del mundo usando tu servidor local.
            </p>
            {publicUrl ? (
              <div className="bg-black border border-indigo-500/50 rounded-xl p-4 flex flex-col gap-2">
                <span className="text-xs text-emerald-400 font-mono flex items-center gap-2"><Check className="w-3 h-3"/> {tunnelStatus}</span>
                <code className="text-indigo-300 text-sm break-all">{publicUrl}</code>
              </div>
            ) : (
              <div className="text-xs text-rose-400 animate-pulse font-mono">Generando túnel cuántico...</div>
            )}
          </div>

          {/* User Management */}
          <div className="bg-black/50 border border-cyan-500/30 rounded-2xl p-6 relative overflow-hidden lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-cyan-400" />
                <h3 className="uppercase tracking-widest text-cyan-400 text-sm font-bold">Gestión de Perfiles</h3>
              </div>
              <button onClick={handleNewProfile} className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 px-4 py-2 rounded-lg text-xs uppercase font-bold hover:bg-cyan-500/40 transition-colors">
                + Nuevo Perfil
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase text-gray-500 tracking-wider">
                    <th className="pb-3 px-4">Usuario</th>
                    <th className="pb-3 px-4">Rol</th>
                    <th className="pb-3 px-4">Estado</th>
                    <th className="pb-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(users) && users.map(u => (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-4 px-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-cyan-900/50 flex items-center justify-center text-cyan-400 font-bold border border-cyan-500/30">
                          {u.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <span className="text-sm font-medium text-gray-300">{u.name}</span>
                      </td>
                      <td className="py-4 px-4">
                        <select
                          value={u.role === 'super_admin' ? 'admin' : u.role}
                          onChange={(e) => handleChangeRole(u.id, e.target.value)}
                          className={`text-[10px] px-2 py-1 rounded-full uppercase font-bold tracking-wider outline-none cursor-pointer appearance-none ${
                            u.role === 'admin' || u.role === 'super_admin'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          <option value="user" className="bg-[#0a0a0c] text-blue-400">USER</option>
                          <option value="admin" className="bg-[#0a0a0c] text-rose-400">ADMIN</option>
                        </select>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-emerald-400 text-xs flex items-center gap-1"><Check className="w-3 h-3"/> Activo</span>
                      </td>
                      <td className="py-4 px-4 flex justify-end gap-2">
                        <button onClick={() => handleChangePassword(u.id)} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 transition-colors" title="Cambiar Contraseña">
                          <Key className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteUser(u.id)} className="p-2 bg-gray-800 hover:bg-rose-900/50 rounded-lg text-rose-500 transition-colors" title="Eliminar Perfil">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!Array.isArray(users) || users.length === 0) && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-500 text-sm">
                        No hay perfiles registrados o no se pudo conectar a la base de datos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
