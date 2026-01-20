import React from 'react';

const orders = [
  { id: '#ORD-7829', customer: 'Eleanor Pena', date: 'Oct 24, 2024', total: '$1,200.00', status: 'Pending' },
  { id: '#ORD-7830', customer: 'Guy Hawkins', date: 'Oct 24, 2024', total: '$450.00', status: 'Pending' },
  { id: '#ORD-7831', customer: 'Courtney Henry', date: 'Oct 23, 2024', total: '$2,850.00', status: 'Pending' },
  { id: '#ORD-7832', customer: 'Jerome Bell', date: 'Oct 23, 2024', total: '$890.00', status: 'Pending' },
  { id: '#ORD-7833', customer: 'Arlene McCoy', date: 'Oct 23, 2024', total: '$3,400.00', status: 'Pending' },
];

export const AdminOrders: React.FC = () => {
  return (
    <div className="p-8 max-w-[1600px] mx-auto h-full flex flex-col">
       <header className="h-20 flex items-center justify-between mb-8">
         <div>
           <h2 className="text-2xl font-bold text-white">Order Management</h2>
           <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Manage and track all customer orders</p>
         </div>
         <div className="relative group hidden md:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/40">search</span>
            <input type="text" placeholder="Search orders..." className="bg-surface-dark border border-white/10 rounded-full py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 w-64 transition-all" />
         </div>
       </header>

       <div className="bg-surface-dark border border-white/5 rounded-xl overflow-hidden shadow-2xl flex flex-col flex-1">
          <div className="flex items-center gap-8 border-b border-white/10 px-8 pt-4 overflow-x-auto">
             <button className="pb-4 text-sm font-medium text-white/40 hover:text-white transition-colors relative whitespace-nowrap">All Orders</button>
             <button className="pb-4 text-sm font-medium text-primary border-b-2 border-primary transition-colors relative whitespace-nowrap">Pending <span className="ml-2 px-1.5 py-0.5 bg-primary/20 text-primary text-[10px] rounded-full">12</span></button>
             <button className="pb-4 text-sm font-medium text-white/40 hover:text-white transition-colors relative whitespace-nowrap">Shipping</button>
             <button className="pb-4 text-sm font-medium text-white/40 hover:text-white transition-colors relative whitespace-nowrap">Delivered</button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="py-4 px-6 text-[10px] uppercase tracking-widest font-semibold text-white/40">Order ID</th>
                  <th className="py-4 px-6 text-[10px] uppercase tracking-widest font-semibold text-white/40">Customer</th>
                  <th className="py-4 px-6 text-[10px] uppercase tracking-widest font-semibold text-white/40">Date</th>
                  <th className="py-4 px-6 text-[10px] uppercase tracking-widest font-semibold text-white/40">Total</th>
                  <th className="py-4 px-6 text-[10px] uppercase tracking-widest font-semibold text-white/40">Status</th>
                  <th className="py-4 px-6 text-[10px] uppercase tracking-widest font-semibold text-white/40 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.map((order, i) => (
                  <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="py-5 px-6 font-medium text-sm text-white font-mono">{order.id}</td>
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/70">{order.customer.split(' ')[0][0]}{order.customer.split(' ')[1][0]}</div>
                        <div className="flex flex-col">
                          <span className="text-sm text-white/80">{order.customer}</span>
                          <span className="text-[10px] text-white/40">customer@example.com</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-6 text-sm text-white/60">{order.date}</td>
                    <td className="py-5 px-6 text-sm text-white font-medium">{order.total}</td>
                    <td className="py-5 px-6">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Pending
                      </span>
                    </td>
                    <td className="py-5 px-6 text-right">
                      <button className="inline-flex items-center justify-between gap-2 px-3 py-1.5 rounded border border-white/10 text-xs font-medium text-white/60 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all w-36 ml-auto">
                        Update Status <span className="material-symbols-outlined text-sm">expand_more</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
       </div>
    </div>
  );
};