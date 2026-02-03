import React, { useState } from 'react';
import { ViewState } from '../types';
import { AuthLayout } from '../layouts/AuthLayout';
import { Eye, EyeOff } from 'lucide-react';
import { authService } from '../services/auth.service';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
const signupSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters long'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  confirmPassword: z.string(),
  newsletter: z.boolean(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type SignupFormInputs = z.infer<typeof signupSchema>;

interface SignupProps {
  setView: (view: ViewState) => void;
}

export const Signup: React.FC<SignupProps> = ({ setView }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormInputs>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      fullName: '',
      confirmPassword: '',
      newsletter: true,
    },
  });

  const onSubmit = async (data: SignupFormInputs) => {
    setServerError(null);
    try {
      await authService.register({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
      });
      // Login or redirect to login
      setView('AUTH_LOGIN');
    } catch (err: any) {
      setServerError(err.message || 'Registration failed');
    }
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

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {serverError && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-sm mb-2">
            {serverError}
          </div>
        )}

        {/* Full Name */}
        <div className="relative group">
          <input
            type="text"
            {...register('fullName')}
            className={`block py-3 px-0 w-full text-base text-white bg-transparent border-0 border-b appearance-none focus:outline-none focus:ring-0 peer transition-colors ${errors.fullName ? 'border-red-500 focus:border-red-500' : 'border-gray-700 focus:border-primary'
              }`}
            placeholder=" "
          />
          <label className={`absolute text-sm duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6 font-medium tracking-wide uppercase ${errors.fullName ? 'text-red-500 peer-focus:text-red-500' : 'text-gray-500 peer-focus:text-primary'
            }`}>
            Full Name
          </label>
          {errors.fullName && <span className="text-xs text-red-500 mt-1">{errors.fullName.message}</span>}
        </div>

        {/* Email */}
        <div className="relative group">
          <input
            type="email"
            {...register('email')}
            className={`block py-3 px-0 w-full text-base text-white bg-transparent border-0 border-b appearance-none focus:outline-none focus:ring-0 peer transition-colors ${errors.email ? 'border-red-500 focus:border-red-500' : 'border-gray-700 focus:border-primary'
              }`}
            placeholder=" "
          />
          <label className={`absolute text-sm duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6 font-medium tracking-wide uppercase ${errors.email ? 'text-red-500 peer-focus:text-red-500' : 'text-gray-500 peer-focus:text-primary'
            }`}>
            Email Address
          </label>
          {errors.email && <span className="text-xs text-red-500 mt-1">{errors.email.message}</span>}
        </div>

        {/* Password */}
        <div className="relative group">
          <input
            type={showPassword ? 'text' : 'password'}
            {...register('password')}
            className={`block py-3 px-0 w-full text-base text-white bg-transparent border-0 border-b appearance-none focus:outline-none focus:ring-0 peer transition-colors pr-10 ${errors.password ? 'border-red-500 focus:border-red-500' : 'border-gray-700 focus:border-primary'
              }`}
            placeholder=" "
          />
          <label className={`absolute text-sm duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6 font-medium tracking-wide uppercase ${errors.password ? 'text-red-500 peer-focus:text-red-500' : 'text-gray-500 peer-focus:text-primary'
            }`}>
            Password
          </label>
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-0 top-3 text-gray-500 hover:text-white transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          {errors.password && <span className="text-xs text-red-500 mt-1 absolute -bottom-5 left-0">{errors.password.message}</span>}
        </div>

        {/* Confirm Password */}
        <div className="relative group mb-2">
          <input
            type="password"
            {...register('confirmPassword')}
            className={`block py-3 px-0 w-full text-base text-white bg-transparent border-0 border-b appearance-none focus:outline-none focus:ring-0 peer transition-colors ${errors.confirmPassword ? 'border-red-500 focus:border-red-500' : 'border-gray-700 focus:border-primary'
              }`}
            placeholder=" "
          />
          <label className={`absolute text-sm duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:left-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6 font-medium tracking-wide uppercase ${errors.confirmPassword ? 'text-red-500 peer-focus:text-red-500' : 'text-gray-500 peer-focus:text-primary'
            }`}>
            Confirm Password
          </label>
          {errors.confirmPassword && <span className="text-xs text-red-500 mt-1 absolute -bottom-5 left-0">{errors.confirmPassword.message}</span>}
        </div>

        {/* Newsletter Checkbox */}
        <label className="flex items-center gap-3 cursor-pointer group mt-4">
          <div className="relative flex items-center">
            <input
              type="checkbox"
              {...register('newsletter')}
              className="peer appearance-none w-5 h-5 border border-gray-600 rounded-sm bg-transparent checked:bg-primary checked:border-primary transition-all"
            />
            <span className="material-symbols-outlined text-white text-sm absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100 pointer-events-none">check</span>
          </div>
          <span className="text-sm text-gray-400 group-hover:text-white transition-colors">Subscribe to our newsletter for exclusive drops.</span>
        </label>

        <div className="flex flex-col gap-4 mt-6">
          <button type="submit" disabled={isSubmitting} className="w-full bg-primary hover:bg-red-700 text-white font-bold text-sm uppercase tracking-[0.15em] py-4 rounded-sm transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed">
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
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
