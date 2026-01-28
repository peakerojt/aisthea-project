import React, { useState } from 'react';
import { ViewState } from '../types';
import { AuthLayout } from '../layouts/AuthLayout';
import { Eye, EyeOff } from 'lucide-react';

interface SignupProps {
  setView: (view: ViewState) => void;
}

export const Signup: React.FC<SignupProps> = ({ setView }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      newsletter: true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate signup
    setView('STORE_HOME');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value, type, checked } = e.target;
      setFormData(prev => ({
          ...prev,
          [name]: type === 'checkbox' ? checked : value
      }));
  };

  return (
    <AuthLayout 
      backgroundImage="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=2000"
      setView={setView}
    >
      <div className="mb-10">
        <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-4">Membership</p>
        <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter mb-2">Join The Club</h1>
        <p className="text-gray-400">Create an account to unlock exclusive collections and personalized curation.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        
        {/* Full Name */}
        <div className="relative group">
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="block py-3 px-0 w-full text-base text-white bg-transparent border-0 border-b border-gray-700 appearance-none focus:outline-none focus:ring-0 focus:border-primary peer transition-colors"
            placeholder=" "
            required
          />
          <label className="absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-primary peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6 font-medium tracking-wide uppercase">
            Full Name
          </label>
        </div>

        {/* Email */}
        <div className="relative group">
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="block py-3 px-0 w-full text-base text-white bg-transparent border-0 border-b border-gray-700 appearance-none focus:outline-none focus:ring-0 focus:border-primary peer transition-colors"
            placeholder=" "
            required
          />
          <label className="absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-primary peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6 font-medium tracking-wide uppercase">
            Email Address
          </label>
        </div>

        {/* Password */}
        <div className="relative group">
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="block py-3 px-0 w-full text-base text-white bg-transparent border-0 border-b border-gray-700 appearance-none focus:outline-none focus:ring-0 focus:border-primary peer transition-colors pr-10"
            placeholder=" "
            required
          />
          <label className="absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-primary peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6 font-medium tracking-wide uppercase">
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

        {/* Confirm Password */}
        <div className="relative group mb-2">
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="block py-3 px-0 w-full text-base text-white bg-transparent border-0 border-b border-gray-700 appearance-none focus:outline-none focus:ring-0 focus:border-primary peer transition-colors"
            placeholder=" "
            required
          />
          <label className="absolute text-sm text-gray-500 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-focus:text-primary peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6 font-medium tracking-wide uppercase">
            Confirm Password
          </label>
        </div>

        {/* Newsletter Checkbox */}
        <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative flex items-center">
                <input 
                    type="checkbox" 
                    name="newsletter" 
                    checked={formData.newsletter} 
                    onChange={handleChange}
                    className="peer appearance-none w-5 h-5 border border-gray-600 rounded-sm bg-transparent checked:bg-primary checked:border-primary transition-all"
                />
                <span className="material-symbols-outlined text-white text-sm absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100 pointer-events-none">check</span>
            </div>
            <span className="text-sm text-gray-400 group-hover:text-white transition-colors">Subscribe to our newsletter for exclusive drops.</span>
        </label>

        <div className="flex flex-col gap-4 mt-6">
          <button type="submit" className="w-full bg-primary hover:bg-red-700 text-white font-bold text-sm uppercase tracking-[0.15em] py-4 rounded-sm transition-all shadow-lg shadow-primary/20">
            Create Account
          </button>
        </div>
      </form>

      <div className="mt-10 text-center">
        <p className="text-gray-500 text-sm">
          Already have an account? <button onClick={() => setView('AUTH_LOGIN')} className="text-white font-bold hover:underline underline-offset-4 ml-1">Sign In</button>
        </p>
      </div>
    </AuthLayout>
  );
};
