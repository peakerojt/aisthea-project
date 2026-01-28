import React, { useState } from 'react';
import { Search, Download, MoreHorizontal, X, Star, AlertTriangle, User, Mail, Phone, Calendar, ShoppingBag, CreditCard } from 'lucide-react';

// Mock Data
interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  totalOrders: number;
  totalSpent: number;
  status: 'VIP' | 'New' | 'High Return Rate' | 'Active';
  lastActive: string;
  joinDate: string;
  notes: string;
  recentOrders: { id: string; date: string; amount: number; items: number }[];
}

const CUSTOMERS_DATA: Customer[] = [
  {
    id: 'CUST-001',
    name: 'Isabella Vancier',
    email: 'isabella.v@example.com',
    phone: '+1 (555) 012-3456',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
    totalOrders: 42,
    totalSpent: 12450.00,
    status: 'VIP',
    lastActive: '2 hours ago',
    joinDate: 'Oct 2022',
    notes: 'Prefers discreet packaging. Always buys the Spring collection immediately.',
    recentOrders: [
        { id: '#ORD-9921', date: 'Oct 24, 2024', amount: 850.00, items: 2 },
        { id: '#ORD-8812', date: 'Sep 12, 2024', amount: 1200.00, items: 3 },
    ]
  },
  {
    id: 'CUST-002',
    name: 'Marcus Thorne',
    email: 'm.thorne@design.co',
    phone: '+1 (555) 987-6543',
    totalOrders: 1,
    totalSpent: 450.00,
    status: 'New',
    lastActive: '1 day ago',
    joinDate: 'Oct 2024',
    notes: '',
    recentOrders: [
        { id: '#ORD-7721', date: 'Oct 23, 2024', amount: 450.00, items: 1 },
    ]
  },
  {
    id: 'CUST-003',
    name: 'Sarah Jenkins',
    email: 'sarah.j@example.com',
    phone: '+1 (555) 456-7890',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop',
    totalOrders: 12,
    totalSpent: 3200.00,
    status: 'High Return Rate',
    lastActive: '5 days ago',
    joinDate: 'Jan 2023',
    notes: 'High return rate (approx 40%). Often orders multiple sizes and returns all but one.',
    recentOrders: [
        { id: '#ORD-6612', date: 'Oct 15, 2024', amount: 900.00, items: 4 },
        { id: '#ORD-5521', date: 'Aug 01, 2024', amount: 250.00, items: 1 },
    ]
  },
  {
    id: 'CUST-004',
    name: 'Alexander Grey',
    email: 'alex.grey@corp.com',
    phone: '+44 20 7123 4567',
    totalOrders: 8,
    totalSpent: 1850.00,
    status: 'Active',
    lastActive: '1 week ago',
    joinDate: 'Mar 2023',
    notes: 'Interested in bespoke suits. Contact when new wool fabrics arrive.',
    recentOrders: [
        { id: '#ORD-4421', date: 'Oct 10, 2024', amount: 450.00, items: 1 },
        { id: '#ORD-3312', date: 'Jun 15, 2024', amount: 1400.00, items: 3 },
    ]
  },
];

export const AdminCustomers: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeNote, setActiveNote] = useState('');

  const filteredCustomers = CUSTOMERS_DATA.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  const handleRowClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setActiveNote(customer.notes);
  };

  const handleCloseDrawer = () => {
    setSelectedCustomer(null);
  };

  const handleExport = () => {
    alert('Exporting CSV...');
  };

  const handleSaveNote = () => {
      // In a real app, this would be an API call
      alert('Note saved!');
  };

  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'VIP': 
            return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 text-yellow-500 text-[10px] font-bold uppercase tracking-wide shadow-[0_0_10px_rgba(234,179,8,0.1)]"><Star size={10} fill="currentColor" /> VIP</span>;
          case 'High Return Rate': 
            return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-red-500/30 bg-red-500/10 text-red-500 text-[10px] font-bold uppercase tracking-wide"><AlertTriangle size={10} /> Risk</span>;
          case 'New':
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-500 text-[10px] font-bold uppercase tracking-wide">New</span>;
          default:
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full border border-white/10 bg-white/5 text-gray-400 text-[10px] font-bold uppercase tracking-wide">Active</span>;
      }
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto h-full flex flex-col relative overflow-hidden">
        {/* HEADER */}
       <header className="h-20 flex items-center justify-between mb-8">
         <div>
           <h2 className="text-2xl font-bold text-white">Customer Base</h2>
           <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Manage relationships & insights</p>
         </div>
         <div className="flex gap-4">
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors" size={18} />
                <input 
                    type="text" 
                    placeholder="Search by name, email, or phone..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-surface-dark border border-white/10 rounded-full py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 w-[320px] transition-all" 
                />
            </div>
            <button 
                onClick={handleExport}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded transition-all"
            >
                <Download size={16} /> Export CSV
            </button>
         </div>
       </header>

       {/* TABLE */}
       <div className="bg-surface-dark border border-white/5 rounded-xl shadow-2xl flex flex-col flex-1 overflow-hidden">
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02]">
                        <th className="py-4 px-6 text-[10px] uppercase tracking-widest font-semibold text-white/40">Customer</th>
                        <th className="py-4 px-6 text-[10px] uppercase tracking-widest font-semibold text-white/40">Phone</th>
                        <th className="py-4 px-6 text-[10px] uppercase tracking-widest font-semibold text-white/40 text-center">Orders</th>
                        <th className="py-4 px-6 text-[10px] uppercase tracking-widest font-semibold text-white/40">Total Spent (LTV)</th>
                        <th className="py-4 px-6 text-[10px] uppercase tracking-widest font-semibold text-white/40">Status</th>
                        <th className="py-4 px-6 text-[10px] uppercase tracking-widest font-semibold text-white/40">Last Active</th>
                        <th className="py-4 px-6 text-[10px] uppercase tracking-widest font-semibold text-white/40 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {filteredCustomers.map(customer => (
                        <tr 
                            key={customer.id} 
                            onClick={() => handleRowClick(customer)}
                            className="group hover:bg-white/[0.02] transition-colors cursor-pointer"
                        >
                            <td className="py-4 px-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-white/10 border border-white/5 overflow-hidden flex items-center justify-center shrink-0">
                                        {customer.avatar ? (
                                            <img src={customer.avatar} alt={customer.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-sm font-bold text-white">{customer.name.charAt(0)}</span>
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">{customer.name}</span>
                                        <span className="text-xs text-gray-500">{customer.email}</span>
                                    </div>
                                </div>
                            </td>
                            <td className="py-4 px-6 text-sm text-gray-400 font-mono">{customer.phone}</td>
                            <td className="py-4 px-6 text-sm text-white font-bold text-center">{customer.totalOrders}</td>
                            <td className="py-4 px-6">
                                <span className={`text-sm font-bold font-mono ${customer.totalSpent > 1000 ? 'text-emerald-400' : 'text-white'}`}>
                                    ${customer.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </td>
                            <td className="py-4 px-6">{getStatusBadge(customer.status)}</td>
                            <td className="py-4 px-6 text-sm text-gray-500">{customer.lastActive}</td>
                            <td className="py-4 px-6 text-right">
                                <button className="p-2 text-gray-500 hover:text-white rounded hover:bg-white/5 transition-colors">
                                    <MoreHorizontal size={20} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
             </table>
          </div>
       </div>

       {/* SIDE DRAWER (QUICK VIEW) */}
       {selectedCustomer && (
         <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={handleCloseDrawer}></div>
            <div className="relative w-full max-w-md bg-[#0A0A0A] h-full shadow-2xl border-l border-white/10 flex flex-col animate-fade-in overflow-hidden">
                
                {/* Drawer Header */}
                <div className="p-6 border-b border-white/5 flex items-start justify-between bg-surface-dark">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-white/10 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                            {selectedCustomer.avatar ? (
                                <img src={selectedCustomer.avatar} alt={selectedCustomer.name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-2xl font-bold text-white">{selectedCustomer.name.charAt(0)}</span>
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">{selectedCustomer.name}</h2>
                            <p className="text-xs text-gray-500 mt-1">Customer since {selectedCustomer.joinDate}</p>
                            <div className="mt-2">{getStatusBadge(selectedCustomer.status)}</div>
                        </div>
                    </div>
                    <button onClick={handleCloseDrawer} className="text-gray-500 hover:text-white transition-colors"><X size={24} /></button>
                </div>

                {/* Drawer Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                    
                    {/* Contact Info */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Contact Details</h3>
                        <div className="flex items-center gap-3 text-sm text-gray-300">
                            <Mail size={16} className="text-white/40" />
                            {selectedCustomer.email}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-300">
                            <Phone size={16} className="text-white/40" />
                            {selectedCustomer.phone}
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-surface-dark p-4 rounded border border-white/5">
                            <div className="flex items-center gap-2 text-white/40 mb-2">
                                <ShoppingBag size={14} />
                                <span className="text-[10px] uppercase font-bold tracking-wider">Orders</span>
                            </div>
                            <span className="text-2xl font-bold text-white">{selectedCustomer.totalOrders}</span>
                        </div>
                        <div className="bg-surface-dark p-4 rounded border border-white/5">
                            <div className="flex items-center gap-2 text-white/40 mb-2">
                                <CreditCard size={14} />
                                <span className="text-[10px] uppercase font-bold tracking-wider">LTV</span>
                            </div>
                            <span className={`text-2xl font-bold ${selectedCustomer.totalSpent > 1000 ? 'text-emerald-400' : 'text-white'}`}>
                                ${selectedCustomer.totalSpent.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Notes Section */}
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">Private Notes</h3>
                            <button onClick={handleSaveNote} className="text-[10px] font-bold uppercase tracking-wider text-primary hover:text-white">Save</button>
                        </div>
                        <textarea 
                            value={activeNote}
                            onChange={(e) => setActiveNote(e.target.value)}
                            className="w-full h-32 bg-white/5 border border-white/10 rounded p-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                            placeholder="Add internal notes about this customer..."
                        />
                    </div>

                    {/* Purchase History */}
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Last 5 Orders</h3>
                        <div className="space-y-3">
                            {selectedCustomer.recentOrders.length > 0 ? (
                                selectedCustomer.recentOrders.map(order => (
                                    <div key={order.id} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded hover:bg-white/5 transition-colors cursor-pointer">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-white">{order.id}</span>
                                            <span className="text-xs text-gray-500">{order.date}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-sm font-medium text-white">${order.amount.toFixed(2)}</span>
                                            <span className="text-xs text-gray-500">{order.items} {order.items === 1 ? 'item' : 'items'}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500 italic">No recent orders found.</p>
                            )}
                        </div>
                    </div>

                    {/* Dangerous Actions */}
                    <div className="pt-6 border-t border-white/5">
                        <button className="w-full py-3 border border-white/10 hover:bg-red-900/20 hover:border-red-500/30 hover:text-red-500 text-gray-400 text-xs font-bold uppercase tracking-widest rounded transition-all">
                            Ban Customer
                        </button>
                    </div>

                </div>
            </div>
         </div>
       )}
    </div>
  );
};