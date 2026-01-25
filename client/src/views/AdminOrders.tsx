import React, { useState, useEffect } from 'react';

// Enhanced Mock Data with Items
const INITIAL_ORDERS = [
  { 
      id: '#ORD-7829', 
      customer: 'Eleanor Pena', 
      email: 'eleanor.p@example.com',
      date: 'Oct 24, 2024', 
      total: 1200.00, 
      status: 'Pending',
      address: '123 Fashion Ave, New York, NY 10001',
      items: [
          { name: 'Obsidian Structure Coat', sku: '9921-BLK', size: 'M', quantity: 1, price: 850, image: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?q=80&w=200&auto=format&fit=crop' },
          { name: 'Ankle Chelsea Boot', sku: '4421-LTH', size: '42', quantity: 1, price: 350, image: 'https://images.unsplash.com/photo-1614252369475-531eba835eb1?q=80&w=200&auto=format&fit=crop' }
      ]
  },
  { 
      id: '#ORD-7830', 
      customer: 'Guy Hawkins', 
      email: 'guy.h@example.com',
      date: 'Oct 24, 2024', 
      total: 450.00, 
      status: 'Pending',
      address: '456 Trend St, Los Angeles, CA 90012',
      items: [
          { name: 'Minimalist Gold Cuff', sku: '1004-GLD', size: 'One Size', quantity: 1, price: 450, image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?q=80&w=200&auto=format&fit=crop' }
      ]
  },
  { 
      id: '#ORD-7831', 
      customer: 'Courtney Henry', 
      email: 'c.henry@example.com',
      date: 'Oct 23, 2024', 
      total: 2850.00, 
      status: 'Shipping',
      address: '789 Couture Blvd, Paris, TX 75460',
      items: [
          { name: 'Velvet Noir Blazer', sku: '4022-VLT', size: 'L', quantity: 1, price: 950, image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=200&auto=format&fit=crop' },
          { name: 'Silk Asymmetric Dress', sku: '4099-SLK', size: 'M', quantity: 1, price: 1450, image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=200&auto=format&fit=crop' },
          { name: 'Mini Leather Tote', sku: 'BAG-001', size: 'OS', quantity: 1, price: 450, image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=200&auto=format&fit=crop' }
      ]
  },
  { 
      id: '#ORD-7832', 
      customer: 'Jerome Bell', 
      email: 'jerome.b@example.com',
      date: 'Oct 23, 2024', 
      total: 890.00, 
      status: 'Delivered',
      address: '321 Runway Rd, Miami, FL 33101',
      items: [
           { name: 'Midnight Rider Denim', sku: 'DEN-002', size: '32', quantity: 2, price: 445, image: 'https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?q=80&w=200&auto=format&fit=crop' }
      ]
  },
];

export const AdminOrders: React.FC = () => {
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewOrder, setViewOrder] = useState<typeof INITIAL_ORDERS[0] | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<typeof INITIAL_ORDERS[0] | null>(null);

  // Handle Printing
  useEffect(() => {
    if (invoiceOrder) {
        // Small timeout to ensure DOM is ready before print
        const timer = setTimeout(() => {
            window.print();
        }, 100);
        return () => clearTimeout(timer);
    }
  }, [invoiceOrder]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(orders.map(o => o.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkShip = () => {
      setOrders(prev => prev.map(o => selectedIds.includes(o.id) ? { ...o, status: 'Shipping' } : o));
      setSelectedIds([]);
  };

  const handleUpdateStatus = (id: string, newStatus: string) => {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
  };

  const isAllSelected = orders.length > 0 && orders.every(o => selectedIds.includes(o.id));

  return (
    <>
    <div className="p-8 max-w-[1600px] mx-auto h-full flex flex-col print:hidden">
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
          {/* Toolbar */}
          <div className={`flex items-center gap-8 border-b border-white/10 px-8 py-4 overflow-x-auto min-h-[64px] transition-colors ${selectedIds.length > 0 ? 'bg-primary/5' : ''}`}>
             {selectedIds.length > 0 ? (
                <div className="w-full flex items-center justify-between animate-fade-in">
                    <span className="text-sm font-bold text-white">{selectedIds.length} Selected</span>
                    <button 
                        onClick={handleBulkShip}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-red-700 text-white rounded text-xs uppercase tracking-wider font-bold transition-all shadow-lg"
                    >
                        <span className="material-symbols-outlined text-[18px]">local_shipping</span> Mark as Shipped
                    </button>
                </div>
             ) : (
                <>
                    <button className="text-sm font-medium text-primary border-b-2 border-primary pb-1 transition-colors relative whitespace-nowrap">All Orders</button>
                    <button className="text-sm font-medium text-white/40 hover:text-white pb-1 transition-colors relative whitespace-nowrap">Pending</button>
                    <button className="text-sm font-medium text-white/40 hover:text-white pb-1 transition-colors relative whitespace-nowrap">Shipping</button>
                    <button className="text-sm font-medium text-white/40 hover:text-white pb-1 transition-colors relative whitespace-nowrap">Delivered</button>
                </>
             )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="py-4 px-6 w-12">
                     <input 
                        type="checkbox" 
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                        className="rounded border-white/20 bg-transparent text-primary focus:ring-0 cursor-pointer" 
                     />
                  </th>
                  <th className="py-4 px-6 text-[10px] uppercase tracking-widest font-semibold text-white/40">Order ID</th>
                  <th className="py-4 px-6 text-[10px] uppercase tracking-widest font-semibold text-white/40">Customer</th>
                  <th className="py-4 px-6 text-[10px] uppercase tracking-widest font-semibold text-white/40">Date</th>
                  <th className="py-4 px-6 text-[10px] uppercase tracking-widest font-semibold text-white/40">Total</th>
                  <th className="py-4 px-6 text-[10px] uppercase tracking-widest font-semibold text-white/40">Status</th>
                  <th className="py-4 px-6 text-[10px] uppercase tracking-widest font-semibold text-white/40 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.map((order) => (
                  <tr key={order.id} className={`group hover:bg-white/[0.02] transition-colors ${selectedIds.includes(order.id) ? 'bg-primary/5' : ''}`}>
                    <td className="py-5 px-6">
                        <input 
                           type="checkbox" 
                           checked={selectedIds.includes(order.id)}
                           onChange={() => handleSelectRow(order.id)}
                           className="rounded border-white/20 bg-transparent text-primary focus:ring-0 cursor-pointer" 
                        />
                    </td>
                    <td className="py-5 px-6 font-medium text-sm text-white font-mono">{order.id}</td>
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/70">{order.customer.charAt(0)}</div>
                        <div className="flex flex-col">
                          <span className="text-sm text-white/80">{order.customer}</span>
                          <span className="text-[10px] text-white/40">{order.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-6 text-sm text-white/60">{order.date}</td>
                    <td className="py-5 px-6 text-sm text-white font-medium">${order.total.toFixed(2)}</td>
                    <td className="py-5 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                          order.status === 'Pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                          order.status === 'Shipping' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                          'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                             order.status === 'Pending' ? 'bg-amber-500 animate-pulse' : 
                             order.status === 'Shipping' ? 'bg-blue-500' :
                             'bg-emerald-500'
                        }`}></span> {order.status}
                      </span>
                    </td>
                    <td className="py-5 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setViewOrder(order)}
                            className="w-8 h-8 flex items-center justify-center rounded border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors" 
                            title="Preview Order"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>
                          <button 
                             onClick={() => setInvoiceOrder(order)}
                             className="w-8 h-8 flex items-center justify-center rounded border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors" 
                             title="Print Invoice"
                          >
                             <span className="material-symbols-outlined text-[18px]">print</span>
                          </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
       </div>

       {/* PREVIEW MODAL */}
       {viewOrder && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setViewOrder(null)}></div>
               <div className="relative bg-surface-dark border border-white/10 rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up">
                   <div className="p-6 border-b border-white/5 flex justify-between items-start">
                       <div>
                           <h3 className="text-xl font-bold text-white">Order {viewOrder.id}</h3>
                           <p className="text-sm text-gray-400 mt-1">{viewOrder.customer} • {viewOrder.items.length} Items</p>
                       </div>
                       <button onClick={() => setViewOrder(null)} className="text-gray-500 hover:text-white"><span className="material-symbols-outlined">close</span></button>
                   </div>
                   
                   <div className="p-6 max-h-[60vh] overflow-y-auto">
                       <div className="space-y-4">
                           {viewOrder.items.map((item, idx) => (
                               <div key={idx} className="flex gap-4 p-4 bg-white/5 rounded border border-white/5">
                                   <div className="w-16 h-20 bg-black rounded overflow-hidden shrink-0">
                                       <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                   </div>
                                   <div className="flex-1">
                                       <h4 className="text-white font-medium">{item.name}</h4>
                                       <p className="text-xs text-gray-500 font-mono mt-1">SKU: {item.sku}</p>
                                       <div className="flex gap-4 mt-2 text-sm">
                                           <span className="text-gray-400">Size: <span className="text-white">{item.size}</span></span>
                                           <span className="text-gray-400">Qty: <span className="text-white">{item.quantity}</span></span>
                                       </div>
                                   </div>
                                   <div className="text-right">
                                       <span className="text-white font-bold">${item.price}</span>
                                   </div>
                               </div>
                           ))}
                       </div>
                       
                       <div className="mt-8 flex justify-between items-start border-t border-white/10 pt-6">
                           <div className="text-sm text-gray-400 max-w-[200px]">
                               <p className="uppercase font-bold text-xs mb-2">Shipping Address</p>
                               <p>{viewOrder.address}</p>
                           </div>
                           <div className="text-right">
                               <p className="text-sm text-gray-400 uppercase font-bold mb-1">Total</p>
                               <p className="text-2xl font-black text-white">${viewOrder.total.toFixed(2)}</p>
                           </div>
                       </div>
                   </div>

                   <div className="p-6 bg-white/5 border-t border-white/5 flex justify-end gap-3">
                       <button onClick={() => { handleUpdateStatus(viewOrder.id, 'Shipping'); setViewOrder(null); }} className="px-4 py-2 bg-primary hover:bg-red-700 text-white text-xs font-bold uppercase tracking-widest rounded transition-all">
                           Mark Shipped & Close
                       </button>
                   </div>
               </div>
           </div>
       )}
    </div>

    {/* HIDDEN INVOICE COMPONENT (Visible only on print) */}
    {invoiceOrder && (
        <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-8 text-black">
            <div className="max-w-[80mm] mx-auto border-2 border-black p-4 font-mono text-sm">
                <div className="text-center border-b-2 border-black pb-4 mb-4">
                    <h1 className="text-2xl font-black uppercase tracking-wider mb-2">Aisthea</h1>
                    <p className="text-xs">Luxury Admin Invoice</p>
                    <p className="text-xs">{new Date().toLocaleDateString()}</p>
                </div>

                <div className="mb-6">
                    <p className="font-bold text-lg mb-1">{invoiceOrder.id}</p>
                    <p className="font-bold">{invoiceOrder.customer}</p>
                    <p className="text-xs mt-1 mb-4">{invoiceOrder.address}</p>
                    <p className="text-xs">Email: {invoiceOrder.email}</p>
                </div>

                <div className="border-t-2 border-b-2 border-black py-2 mb-4">
                    <div className="flex justify-between font-bold text-xs uppercase mb-2">
                        <span>Item</span>
                        <span>Qty</span>
                        <span>Price</span>
                    </div>
                    {invoiceOrder.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-xs mb-1">
                            <span className="truncate w-32">{item.name} ({item.size})</span>
                            <span>{item.quantity}</span>
                            <span>${item.price}</span>
                        </div>
                    ))}
                </div>

                <div className="flex justify-between items-center mb-8">
                    <span className="font-bold uppercase">Total</span>
                    <span className="font-black text-xl">${invoiceOrder.total.toFixed(2)}</span>
                </div>

                <div className="text-center text-[10px] uppercase">
                    <p>Thank you for your business.</p>
                    <p>www.aisthea.com</p>
                </div>
                
                {/* Barcode Mock */}
                <div className="mt-6 flex justify-center">
                    <div className="h-12 w-full bg-black/10 flex items-center justify-center font-libre-barcode text-3xl">
                        ||| || ||| | |||| ||
                    </div>
                </div>
            </div>
        </div>
    )}
    </>
  );
};