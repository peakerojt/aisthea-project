import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = "text-3xl" }) => {
  return (
    <div className={`flex items-center gap-3 font-bold tracking-widest uppercase ${className}`}>
      <span className="material-symbols-outlined text-primary text-4xl">diamond</span>
      <span>Aisthea</span>
    </div>
  );
};