import React, { useState } from "react";
import { Mail, Lock, ArrowRight, Activity, X, LogIn, UserCheck } from "lucide-react";
import { UserProfile } from "../types";

interface LoginModalProps {
  onLoginSuccess: (user: UserProfile) => void;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess, onClose }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mockUser: UserProfile = {
      name: email ? email.split("@")[0] : "Demo User",
      email: email || "user@aria.workspace",
      isPro: true,
    };
    onLoginSuccess(mockUser);
  };

  const handleDemoSignIn = () => {
    onLoginSuccess({
      name: "Jesús Trosell",
      email: "jesus.a.trosell@gmail.com",
      isPro: true,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#1a1a1a]/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 shadow-[-4px_-4px_12px_rgba(255,255,255,0.03),6px_6px_16px_rgba(0,0,0,0.6)]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-[#c6c5d5] hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo area */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-[#201f1f] border border-white/10 flex items-center justify-center text-[#818cf8] mb-3 shadow-[0_0_20px_rgba(129,140,248,0.3)]">
            <Activity className="w-8 h-8" />
          </div>
          <h1 className="font-bold text-3xl text-[#e5e2e1] tracking-tight">A.R.I.A.</h1>
          <p className="text-sm text-[#c6c5d5] mt-1">Sign in to your intelligent workspace</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          {/* Email */}
          <div className="relative">
            <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#c6c5d5]" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full bg-[#1c1b1b] text-[#e5e2e1] text-sm rounded-full py-3.5 pl-12 pr-4 border border-white/10 focus:ring-2 focus:ring-[#818cf8] focus:outline-none transition-all placeholder:text-[#c6c5d5]/50"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#c6c5d5]" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-[#1c1b1b] text-[#e5e2e1] text-sm rounded-full py-3.5 pl-12 pr-4 border border-white/10 focus:ring-2 focus:ring-[#818cf8] focus:outline-none transition-all placeholder:text-[#c6c5d5]/50"
            />
          </div>

          <div className="flex justify-end text-xs">
            <a href="#" onClick={(e) => e.preventDefault()} className="text-[#818cf8] hover:underline font-mono">
              Forgot password?
            </a>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            className="w-full bg-[#818cf8] text-[#101b8a] font-bold py-4 rounded-full shadow-[0_0_20px_rgba(129,140,248,0.3)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2"
          >
            <span>Sign In</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="w-full flex items-center gap-4 my-6">
          <div className="h-px bg-white/10 flex-1" />
          <span className="text-xs font-mono text-[#c6c5d5]">or continue with</span>
          <div className="h-px bg-white/10 flex-1" />
        </div>

        {/* Demo Instant Login */}
        <button
          onClick={handleDemoSignIn}
          className="w-full bg-[#201f1f] hover:bg-[#353534] text-[#e5e2e1] text-xs font-semibold py-3.5 rounded-full border border-white/10 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
        >
          <UserCheck className="w-4 h-4 text-[#818cf8]" />
          <span>Quick Demo Sign In</span>
        </button>
      </div>
    </div>
  );
};
