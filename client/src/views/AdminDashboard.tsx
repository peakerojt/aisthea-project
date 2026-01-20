import React from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

const data = [
  { name: 'Mon', value: 4000 },
  { name: 'Tue', value: 3000 },
  { name: 'Wed', value: 5000 },
  { name: 'Thu', value: 2780 },
  { name: 'Fri', value: 1890 },
  { name: 'Sat', value: 6390 },
  { name: 'Sun', value: 3490 },
];

export const AdminDashboard: React.FC = () => {
  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-fade-in">
      <header className="flex justify-between items-end pb-4 border-b border-white/5">
        <div>
           <p className="text-xs font-bold text-primary tracking-[0.2em] uppercase mb-2">Admin Portal • v2.4</p>
           <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Overview</h2>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <input type="text" placeholder="Search..." className="bg-surface-dark border-none rounded-lg py-2.5 pl-4 pr-10 text-sm text-white focus:ring-1 focus:ring-primary w-64" />
            <span className="material-symbols-outlined absolute right-3 top-2.5 text-gray-500 text-lg">search</span>
          </div>
          <button className="w-10 h-10 rounded-full bg-surface-dark flex items-center justify-center hover:bg-white/10 relative">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 size-2 bg-primary rounded-full animate-pulse"></span>
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Revenue', value: '$124.5k', change: '+12% from last month', icon: 'payments', color: 'text-green-500' },
          { label: 'Pending Orders', value: '24', change: 'Action required', icon: 'pending_actions', color: 'text-primary' },
          { label: 'Low Stock', value: '12', change: 'Items below threshold', icon: 'inventory_2', color: 'text-yellow-500' },
          { label: 'Total Customers', value: '1.2k', change: '+58 this week', icon: 'group', color: 'text-green-500' }
        ].map((stat, i) => (
          <div key={i} className="bg-surface-dark border border-white/5 p-6 rounded hover:border-white/20 transition-all group relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <span className="material-symbols-outlined text-6xl">{stat.icon}</span>
             </div>
             <div className="relative z-10">
               <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-4">{stat.label}</p>
               <h3 className="text-3xl font-bold text-white mb-2">{stat.value}</h3>
               <div className={`flex items-center gap-1 text-xs font-medium ${stat.color}`}>
                  <span className="material-symbols-outlined text-sm">{stat.color.includes('green') ? 'trending_up' : 'info'}</span>
                  <span>{stat.change}</span>
               </div>
             </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart */}
        <div className="lg:col-span-8 bg-surface-dark p-8 rounded border border-white/5 shadow-lg flex flex-col">
           <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-bold uppercase tracking-wide text-white">Size Performance</h3>
             <div className="flex gap-2">
               <button className="px-3 py-1.5 text-xs font-bold text-white bg-white/5 rounded">Weekly</button>
               <button className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-white">Monthly</button>
             </div>
           </div>
           
           <div className="flex flex-col gap-4 flex-1 justify-center">
             {['XS', 'S', 'M', 'L', 'XL'].map((size, i) => {
               const width = [25, 45, 65, 55, 20][i];
               return (
                 <div key={size} className="group">
                   <div className="flex justify-between text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                     <span>{size}</span><span className="text-white">{width}%</span>
                   </div>
                   <div className="h-4 bg-[#222] w-full rounded overflow-hidden">
                     <div className="h-full bg-gradient-to-r from-primary to-[#ff4d46] relative group-hover:brightness-125 transition-all duration-500 ease-out" style={{ width: `${width}%` }}></div>
                   </div>
                 </div>
               );
             })}
           </div>
        </div>

        {/* Trending Product */}
        <div className="lg:col-span-4 bg-surface-dark rounded border border-white/5 overflow-hidden flex flex-col shadow-lg">
           <div className="h-56 bg-cover bg-center relative group" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1000&auto=format&fit=crop)' }}>
             <div className="absolute inset-0 bg-gradient-to-t from-surface-dark via-transparent to-transparent opacity-90"></div>
             <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest text-white border border-white/20">Top Trending</div>
             <div className="absolute bottom-6 left-6 right-6">
               <p className="text-primary text-xs font-bold uppercase tracking-[0.2em] mb-2">Winter Collection</p>
               <p className="text-2xl font-bold text-white leading-tight">Midnight Silk Wrap</p>
             </div>
           </div>
           <div className="p-6 flex flex-col gap-5 flex-1 bg-surface-dark relative z-10 -mt-2">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <span className="text-gray-400 text-sm font-medium">Total Revenue</span>
                <span className="text-white font-bold font-mono">$12,402</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <span className="text-gray-400 text-sm font-medium">Units Sold</span>
                <span className="text-white font-bold font-mono">482</span>
              </div>
              <button className="w-full py-3 bg-white text-black hover:bg-gray-200 text-xs font-black tracking-widest uppercase rounded transition-colors flex items-center justify-center gap-2 mt-auto">
                 Restock Now <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};