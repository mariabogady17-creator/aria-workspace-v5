import React, { useState, useEffect } from 'react';
import { LoginScene } from './LoginScene';
import { User, LogIn, UserPlus, AlertCircle, Loader2 } from 'lucide-react';

interface LocalUser {
  id: string;
  name: string;
  email: string;
}

interface LoginViewProps {
  onLoginSuccess: (token: string, user: LocalUser) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [users, setUsers] = useState<LocalUser[]>([]);
  const [mode, setMode] = useState<'select' | 'signin' | 'signup'>('select');
  const [selectedUser, setSelectedUser] = useState<LocalUser | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    setMode('signin');
  }, []);

  const handleSelectUser = (u: LocalUser) => {
    setSelectedUser(u);
    setEmail(u.email);
    setMode('signin');
    setError('');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Credenciales incorrectas');
      
      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear cuenta');
      
      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const phaseTexts = [
    { title: 'Traverse the neural pathway', sub: 'Limitless potential.' },
    { title: 'The universe at your fingertips', sub: 'Infinite possibilities.' },
    { title: 'Enter a new dimension of workflow', sub: 'Seamless transitions.' },
    { title: 'Everything revolves around your growth', sub: 'Total control.' }
  ];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black flex items-center justify-center font-sans">
      <LoginScene className="absolute inset-0 z-0 pointer-events-none" onPhaseChange={setPhaseIndex} />

      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-end px-12 py-6 gap-8 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded text-xs font-mono tracking-widest">
          <span className="text-white/40">SYS.STATUS:</span>
          <span className="text-teal-400 font-semibold drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]">OPTIMAL</span>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-10 px-16 pb-20 pointer-events-none">
        <div className="text-[11px] tracking-[4px] uppercase text-white/40 mb-3 animate-fade-in-up">
          {phaseTexts[phaseIndex]?.sub}
        </div>
        <div className="text-4xl md:text-5xl font-extralight text-white max-w-2xl leading-tight tracking-tight animate-fade-in-up animation-delay-100">
          {phaseTexts[phaseIndex]?.title}
        </div>
      </div>

      <div className="relative z-20 w-full max-w-md p-10 bg-[#060312]/90 backdrop-blur-xl border border-indigo-500/20 rounded-3xl shadow-[0_40px_80px_rgba(0,0,0,0.85),_0_0_80px_rgba(100,50,180,0.08),_inset_0_1px_0_rgba(255,255,255,0.06)]">
        <h2 className="text-2xl font-light tracking-[6px] text-white text-center mb-1">A.R.I.A.</h2>
        <p className="text-[10px] tracking-[3px] text-white/30 text-center uppercase mb-10">Workspace Edition</p>

        {error && (
          <div className="flex items-center gap-2 text-rose-400 bg-rose-500/10 p-3 rounded-xl mb-6 text-sm border border-rose-500/20">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-5">
            <div>
              <label className="block text-[10px] tracking-[1.8px] text-white/30 uppercase mb-2">Email</label>
              <input
                type="text"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-light outline-none focus:border-indigo-500/50 focus:bg-white/10 focus:shadow-[0_0_28px_rgba(130,70,210,0.12)] transition-all"
                  placeholder="tu@email.com o Usuario"
                  required
                />
              </div>

            <div>
              <label className="block text-[10px] tracking-[1.8px] text-white/30 uppercase mb-2">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-light outline-none focus:border-indigo-500/50 focus:bg-white/10 focus:shadow-[0_0_28px_rgba(130,70,210,0.12)] transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative w-full p-4 mt-4 bg-gradient-to-br from-indigo-600/80 to-purple-600/80 border border-indigo-400/40 rounded-xl text-white text-[11px] font-medium tracking-[2.5px] uppercase hover:shadow-[0_0_36px_rgba(150,80,230,0.3)] hover:-translate-y-[1px] transition-all disabled:opacity-65 disabled:pointer-events-none overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              {loading ? <Loader2 className="w-4 h-4 mx-auto animate-spin" /> : 'Iniciar Sesión'}
            </button>
            
            <div className="text-center mt-6 pt-4 border-t border-white/5">
              <button type="button" onClick={() => setMode('signup')} className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[11px] text-white hover:bg-white/10 transition-colors tracking-widest uppercase font-medium">
                Crear una cuenta nueva
              </button>
            </div>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-[10px] tracking-[1.8px] text-white/30 uppercase mb-2">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-light outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all"
                placeholder="Tu nombre completo"
                required
              />
            </div>
            
            <div>
              <label className="block text-[10px] tracking-[1.8px] text-white/30 uppercase mb-2">Email</label>
              <input
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-light outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all"
                placeholder="tu@email.com o Usuario"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] tracking-[1.8px] text-white/30 uppercase mb-2">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full p-3.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-light outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative w-full p-4 mt-2 bg-gradient-to-br from-indigo-600/80 to-purple-600/80 border border-indigo-400/40 rounded-xl text-white text-[11px] font-medium tracking-[2.5px] uppercase hover:shadow-[0_0_36px_rgba(150,80,230,0.3)] transition-all disabled:opacity-65"
            >
              {loading ? <Loader2 className="w-4 h-4 mx-auto animate-spin" /> : 'Crear Cuenta'}
            </button>

            <div className="text-center mt-6 pt-4 border-t border-white/5">
              <button type="button" onClick={() => setMode('signin')} className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[11px] text-white hover:bg-white/10 transition-colors tracking-widest uppercase font-medium">
                Ya tengo cuenta
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
