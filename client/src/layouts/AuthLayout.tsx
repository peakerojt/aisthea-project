import React from 'react';
import { Logo } from '../components/Logo';
import { ViewState } from '../types';

interface AuthLayoutProps {
  children: React.ReactNode;
  backgroundImage: string;
  setView: (view: ViewState) => void;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, backgroundImage, setView }) => {
  return (
    <div className="flex min-h-screen w-full bg-black">
      {/* Left Side: Image */}
      <div className="hidden lg:block w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] hover:scale-110 ease-linear" style={{ backgroundImage: `url(${backgroundImage})` }}></div>
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="absolute top-10 left-10 z-10">
           <button onClick={() => setView('STORE_HOME')} className="text-white hover:opacity-80 transition-opacity">
             <Logo className="text-3xl" />
           </button>
        </div>
      </div>

      {/* Right Side: Form Content */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 bg-black relative">
         <div className="lg:hidden absolute top-8 left-8 cursor-pointer z-20" onClick={() => setView('STORE_HOME')}>
            <Logo className="text-xl" />
         </div>
         <div className="w-full max-w-[420px] animate-fade-in flex flex-col justify-center">
            {children}
         </div>
      </div>
    </div>
  );
};
