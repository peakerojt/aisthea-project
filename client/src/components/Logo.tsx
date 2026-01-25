import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = "text-3xl" }) => {
  return (
    <div className={`flex items-center font-bold tracking-widest uppercase ${className}`}>
      <span>Aisthea</span>
    </div>
  );
};