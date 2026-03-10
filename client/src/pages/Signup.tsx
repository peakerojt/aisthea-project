import React, { useState } from 'react';
import { ViewState } from '../types';
import { AuthLayout } from '../layouts/AuthLayout';
import Eye from 'lucide-react/dist/esm/icons/eye';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import { authService } from '../services/auth.service';
import { useAuth } from '../contexts/AuthContext';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnimatePresence, motion } from 'framer-motion';
import { passwordValidation, passwordRequirements, calculatePasswordStrength } from '../utils/validationUtils';

const signupSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters long'),
  email: z.string().email('Invalid email address'),
  password: passwordValidation,
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

const ValidationItem = React.memo(({ met, text }: { met: boolean; text: string }) => (
  <div className={`flex items-center gap-2 text-[10px] transition-colors ${met ? 'text-green-500' : 'text-gray-500'}`}>
    <span className={`w-3 h-3 rounded-full flex items-center justify-center border ${met ? 'border-green-500 bg-green-500/20' : 'border-gray-600'}`}>
      {met && <span className="text-[8px]">✓</span>}
    </span>
    {text}
  </div>
));

const PasswordStrengthMeter = React.memo(({ control }: { control: any }) => {
  const passwordValue = useWatch({
    control,
    name: "password",
    defaultValue: ""
  });

  const strength = calculatePasswordStrength(passwordValue);

  return (
    <AnimatePresence>
      {passwordValue && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="w-full mt-2 bg-gray-900/90 p-3 rounded-sm border border-gray-800 backdrop-blur-sm overflow-hidden"
        >
          <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden mb-2">
            <motion.div
              className={`h-full rounded-full transition-colors duration-300 ${strength <= 2 ? 'bg-red-500' : strength <= 4 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
              initial={{ width: 0 }}
              animate={{ width: `${(strength / 5) * 100}%` }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            />
          </div>
          <p className="text-[10px] text-gray-400 mb-2 uppercase tracking-wider font-bold">Password Requirements:</p>
          <div className="grid grid-cols-1 gap-1">
            <ValidationItem met={passwordValue.length >= passwordRequirements.minLength} text={`At least ${passwordRequirements.minLength} characters`} />
            <ValidationItem met={passwordRequirements.hasUpperCase.test(passwordValue)} text="ABC One uppercase letter" />
            <ValidationItem met={passwordRequirements.hasLowerCase.test(passwordValue)} text="abc One lowercase letter" />
            <ValidationItem met={passwordRequirements.hasNumber.test(passwordValue)} text="123 One number" />
            <ValidationItem met={passwordRequirements.hasSpecialChar.test(passwordValue)} text="#$& One special char" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export const Signup: React.FC<SignupProps> = ({ setView }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
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
    mode: 'onChange'
  });

  const { register: registerUser } = useAuth();

  const onSubmit = async (data: SignupFormInputs) => {
    setServerError(null);
    try {
      // Register user - no longer auto-logs in
      const response = await authService.register({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
      });

      // Store email for verification page
      sessionStorage.setItem('pendingVerificationEmail', data.email);

      // Redirect to email verification page
      setView('EMAIL_VERIFICATION');
    } catch (error) {
            const err = error as Error | { message?: string; error?: string; data?: unknown };
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
            autoComplete="off"
            {...register('fullName')}
            className={`block py-4 px-0 w-full text-base text-white bg-transparent border-0 border-b appearance-none focus:outline-none focus:ring-0 peer transition-colors ${errors.fullName ? 'border-red-500 focus:border-red-500' : 'border-gray-700 focus:border-primary'
              }`}
            placeholder=" "
          />
          <label className={`absolute text-sm duration-300 transform -translate-y-6 scale-75 top-3 z-0 origin-[0] peer-focus:left-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6 font-medium tracking-wide uppercase pointer-events-none ${errors.fullName ? 'text-red-500 peer-focus:text-red-500' : 'text-gray-500 peer-focus:text-primary'
            }`}>
            Full Name
          </label>
          <div className="mt-1 h-4">
            <span className={`text-xs text-red-500 transition-opacity duration-200 ${errors.fullName ? 'opacity-100' : 'opacity-0'}`}>
              {errors.fullName?.message || "Placeholder"}
            </span>
          </div>
        </div>

        {/* Email */}
        <div className="relative group">
          <input
            type="email"
            autoComplete="off"
            {...register('email')}
            className={`block py-4 px-0 w-full text-base text-white bg-transparent border-0 border-b appearance-none focus:outline-none focus:ring-0 peer transition-colors ${errors.email ? 'border-red-500 focus:border-red-500' : 'border-gray-700 focus:border-primary'
              }`}
            placeholder=" "
          />
          <label className={`absolute text-sm duration-300 transform -translate-y-6 scale-75 top-3 z-0 origin-[0] peer-focus:left-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6 font-medium tracking-wide uppercase pointer-events-none ${errors.email ? 'text-red-500 peer-focus:text-red-500' : 'text-gray-500 peer-focus:text-primary'
            }`}>
            Email Address
          </label>
          <div className="mt-1 h-4">
            <span className={`text-xs text-red-500 transition-opacity duration-200 ${errors.email ? 'opacity-100' : 'opacity-0'}`}>
              {errors.email?.message || "Placeholder"}
            </span>
          </div>
        </div>

        {/* Password */}
        <div className="relative group">
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            {...register('password')}
            className={`block py-4 px-0 w-full text-base text-white bg-transparent border-0 border-b appearance-none focus:outline-none focus:ring-0 peer transition-colors pr-10 ${errors.password ? 'border-red-500 focus:border-red-500' : 'border-gray-700 focus:border-primary'
              }`}
            placeholder=" "
          />
          <label className={`absolute text-sm duration-300 transform -translate-y-6 scale-75 top-3 z-0 origin-[0] peer-focus:left-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6 font-medium tracking-wide uppercase pointer-events-none ${errors.password ? 'text-red-500 peer-focus:text-red-500' : 'text-gray-500 peer-focus:text-primary'
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

          {/* Password Strength Indicator */}
          <div className="mt-1 min-h-[1.25rem]">
            <span className={`text-xs text-red-500 block transition-opacity duration-200 ${errors.password ? 'opacity-100' : 'opacity-0'}`}>
              {errors.password?.message || "Placeholder"}
            </span>
          </div>

          <PasswordStrengthMeter control={control} />
        </div>

        {/* Confirm Password */}
        <div className="relative group mb-2">
          <input
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
            className={`block py-4 px-0 w-full text-base text-white bg-transparent border-0 border-b appearance-none focus:outline-none focus:ring-0 peer transition-colors ${errors.confirmPassword ? 'border-red-500 focus:border-red-500' : 'border-gray-700 focus:border-primary'
              }`}
            placeholder=" "
          />
          <label className={`absolute text-sm duration-300 transform -translate-y-6 scale-75 top-3 z-0 origin-[0] peer-focus:left-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6 font-medium tracking-wide uppercase pointer-events-none ${errors.confirmPassword ? 'text-red-500 peer-focus:text-red-500' : 'text-gray-500 peer-focus:text-primary'
            }`}>
            Confirm Password
          </label>
          <div className="mt-1 h-4">
            <span className={`text-xs text-red-500 transition-opacity duration-200 ${errors.confirmPassword ? 'opacity-100' : 'opacity-0'}`}>
              {errors.confirmPassword?.message || "Placeholder"}
            </span>
          </div>
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

          {/* OR Divider */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#0a0a0a] px-4 text-gray-500 font-bold tracking-wider">Or</span>
            </div>
          </div>

          {/* Google Sign-Up Button */}
          <button
            type="button"
            onClick={() => window.location.href = `${import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'}/api/auth/google`}
            disabled={isSubmitting}
            className="w-full bg-white hover:bg-gray-100 text-gray-900 font-bold text-sm uppercase tracking-[0.15em] py-4 rounded-sm transition-all flex items-center justify-center gap-3 cursor-pointer border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Sign up with Google
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
