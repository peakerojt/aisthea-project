import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, DollarSign, TrendingUp, Users, ShoppingBag } from 'lucide-react';

// Mock Data
const REVENUE_DATA = [
  { name: 'Week 1', revenue: 4200 },
  { name: 'Week 2', revenue: 3800 },
  { name: 'Week 3', revenue: 6500 },
  { name: 'Week 4', revenue: 5100 },
  { name: 'Week 5', revenue: 7800 },
  { name: 'Week 6', revenue: 9200 },
  { name: 'Week 7', revenue: 8400 },
];

const TRAFFIC_DATA = [
  { name: 'Direct', value: 45, color: '#E2241D' }, // Primary Red
  { name: 'Instagram', value: 30, color: '#FFFFFF' }, // White
  { name: 'TikTok', value: 15, color: '#525252' }, // Dark Gray
  { name: 'Facebook', value: 10, color: '#262626' }, // Darker Gray
];

const BEST_SELLERS = [
    { id: 1, name: 'Obsidian Structure Coat', sold: 124, revenue: 105400, img: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?q=80&w=100&auto=format&fit=crop' },
    { id: 2, name: 'Velvet Noir Blazer', sold: 89, revenue: 84550, img: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=100&auto=format&fit=crop' },
    { id: 3, name: 'Midnight Silk Wrap', sold: 76, revenue: 34200, img: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=100&auto=format&fit=crop' },
    { id: 4, name: 'Ankle Chelsea Boot', sold: 52, revenue: 18200, img: 'https://images.unsplash.com/photo-1614252369475-531eba835eb1?q=80&w=100&auto=format&fit=crop' },
];

const MetricCard: React.FC<{ title: string; value: string; change: string; isPositive: boolean; icon: React.ElementType }> = ({ title, value, change, isPositive, icon: Icon }) => (
    <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface-dark border border-white/5 p-6 rounded-lg relative overflow-hidden group"
    >
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-full bg-white/5 text-white/70 group-hover:bg-primary/10 group-hover:text-primary transition-colors`}>
                <Icon size={20} />
            </div>
            <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${isPositive ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
                {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {change}
            </div>
        </div>
        <h3 className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">{title}</h3>
        <p className="text-3xl font-black text-white">{value}</p>
    </motion.div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface-dark border border-white/10 p-3 rounded shadow-xl">
          <p className="text-white text-xs font-bold uppercase tracking-wide mb-1">{label}</p>
          <p className="text-primary text-sm font-bold">
            ${payload[0].value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
};

export const AdminAnalytics: React.FC = () => {
  return (
    <div className="p-8 max-w-[1600px] mx-auto h-full flex flex-col gap-8 overflow-y-auto custom-scrollbar">
        {/* Header */}
        <header className="flex items-center justify-between">
            <div>
                <h2 className="text-2xl font-bold text-white">Performance Analytics</h2>
                <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Real-time business insights</p>
            </div>
            <div className="flex bg-surface-dark border border-white/10 rounded-lg p-1">
                {['Today', 'Week', 'Month', 'Year'].map(range => (
                    <button key={range} className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors ${range === 'Month' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}>
                        {range}
                    </button>
                ))}
            </div>
        </header>

        {/* Section 1: Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard title="Total Revenue" value="$45,231.89" change="+12.5%" isPositive={true} icon={DollarSign} />
            <MetricCard title="Net Profit" value="$21,402.50" change="+8.2%" isPositive={true} icon={TrendingUp} />
            <MetricCard title="Conversion Rate" value="3.2%" change="-0.4%" isPositive={false} icon={Users} />
            <MetricCard title="Avg. Order Value" value="$152.00" change="+2.1%" isPositive={true} icon={ShoppingBag} />
        </div>

        {/* Section 2: Main Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
            {/* Revenue Area Chart */}
            <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-2 bg-surface-dark border border-white/5 rounded-lg p-6 flex flex-col"
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-white">Revenue Over Time</h3>
                    <button className="text-xs text-primary font-bold uppercase tracking-wider hover:text-white transition-colors">View Report</button>
                </div>
                <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={REVENUE_DATA}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#E2241D" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#E2241D" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis 
                                dataKey="name" 
                                stroke="#666" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false} 
                                dy={10}
                            />
                            <YAxis 
                                stroke="#666" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false} 
                                tickFormatter={(value) => `$${value}`} 
                                dx={-10}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#E2241D', strokeWidth: 1, strokeDasharray: '4 4' }} />
                            <Area 
                                type="monotone" 
                                dataKey="revenue" 
                                stroke="#E2241D" 
                                strokeWidth={3} 
                                fillOpacity={1} 
                                fill="url(#colorRevenue)" 
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* Traffic Sources Donut Chart */}
            <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="lg:col-span-1 bg-surface-dark border border-white/5 rounded-lg p-6 flex flex-col"
            >
                <h3 className="text-lg font-bold text-white mb-6">Traffic Sources</h3>
                <div className="flex-1 w-full min-h-0 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={TRAFFIC_DATA}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {TRAFFIC_DATA.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#121212', borderColor: '#333', borderRadius: '4px' }}
                                itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Centered Label */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                            <span className="block text-2xl font-black text-white">12.5k</span>
                            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Visitors</span>
                        </div>
                    </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-y-2">
                    {TRAFFIC_DATA.map((item) => (
                        <div key={item.name} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                            <span className="text-xs text-gray-400">{item.name}</span>
                            <span className="text-xs font-bold text-white ml-auto">{item.value}%</span>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>

        {/* Section 3: Best Sellers */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-surface-dark border border-white/5 rounded-lg p-8"
        >
            <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-wide">Top Performing Products</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                            <th className="py-3 px-4 w-16">Image</th>
                            <th className="py-3 px-4">Product Name</th>
                            <th className="py-3 px-4 text-center">Units Sold</th>
                            <th className="py-3 px-4 text-right">Revenue</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {BEST_SELLERS.map((product) => (
                            <tr key={product.id} className="group hover:bg-white/[0.02] transition-colors">
                                <td className="py-4 px-4">
                                    <div className="w-10 h-12 bg-black rounded overflow-hidden">
                                        <img src={product.img} alt={product.name} className="w-full h-full object-cover" />
                                    </div>
                                </td>
                                <td className="py-4 px-4">
                                    <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">{product.name}</span>
                                </td>
                                <td className="py-4 px-4 text-center">
                                    <span className="text-sm font-mono text-gray-300">{product.sold}</span>
                                </td>
                                <td className="py-4 px-4 text-right">
                                    <span className="text-sm font-mono font-bold text-emerald-400">${product.revenue.toLocaleString()}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </motion.div>
    </div>
  );
};
