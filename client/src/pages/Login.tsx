import React, { useState } from 'react';
import { ViewState } from '../types';
import { AuthLayout } from '../layouts/AuthLayout';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

interface LoginProps {
  setView: (view: ViewState) => void;
}

export const Login: React.FC<LoginProps> = ({ setView }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const user = await login(email, password);

    if (user) {
      if (user.roles.includes('Admin')) {
        setView('ADMIN_DASHBOARD');
      } else {
        setView('STORE_HOME');
      }
    }
  };

  return (
    <AuthLayout
      backgroundImage="https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=2000"
      setView={setView}
    >
      <div className="mb-12">
        <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-4">Account</p>
        <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter mb-2">Welcome Back</h1>
        <p className="text-gray-400">Please enter your details to access your curated feed.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Email Input */}
        <div className="relative group">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block py-4 px-0 w-full text-base text-white bg-transparent border-0 border-b border-gray-700 appearance-none focus:outline-none focus:ring-0 focus:border-white peer transition-colors"
            placeholder=" "
            required
            disabled={isLoading}
          />
          <label className="absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-white peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6 font-medium tracking-wide uppercase">
            Email Address
          </label>
        </div>

        {/* Password Input */}
        <div className="relative group mb-2">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block py-4 px-0 w-full text-base text-white bg-transparent border-0 border-b border-gray-700 appearance-none focus:outline-none focus:ring-0 focus:border-white peer transition-colors pr-10"
            placeholder=" "
            required
            disabled={isLoading}
          />
          <label className="absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-white peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6 font-medium tracking-wide uppercase">
            Password
          </label>
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-0 top-3 text-gray-500 hover:text-white transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <div className="flex justify-end">
          <button type="button" className="text-xs text-gray-400 hover:text-white transition-colors font-medium">Forgot Password?</button>
        </div>

        <div className="flex flex-col gap-4 mt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary hover:bg-red-700 text-white font-bold text-sm uppercase tracking-[0.15em] py-4 rounded-sm transition-all shadow-lg shadow-primary/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Signing In...
              </>
            ) : 'Sign In'}
          </button>

          <button type="button" className="w-full bg-transparent border border-white/20 hover:border-white text-white font-bold text-sm uppercase tracking-[0.15em] py-4 rounded-sm transition-all flex items-center justify-center gap-2 group">
            <span className="w-4 h-4 bg-white rounded-full flex items-center justify-center text-black font-serif font-bold text-[10px]">G</span>
            Continue with Google
          </button>
        </div>
      </form>

      <div className="mt-12 text-center">
        <p className="text-gray-500 text-sm">
          New to Aisthea? <button onClick={() => setView('AUTH_SIGNUP')} className="text-white font-bold hover:underline underline-offset-4 ml-1">Create an Account</button>
        </p>
      </div>

      <div className="mt-8 pt-8 border-t border-white/5 flex justify-between items-center text-xs text-gray-600">
        <button onClick={() => setView('ADMIN_DASHBOARD')} className="hover:text-gray-400">Admin Login</button>
        <span>Privacy & Terms</span>
      </div>
    </AuthLayout>
  );
};
