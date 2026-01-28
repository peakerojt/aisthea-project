
import React, { useState } from 'react';
import { useProducts } from '../contexts/ProductContext';
import { RestockItem, PurchaseOrder } from '../types';
import { Plus, Search, Trash2, PackageCheck } from 'lucide-react';

export const AdminRestock: React.FC = () => {
  const { products, purchaseOrders, receiveStock, createPurchaseOrder } = useProducts();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // New PO State
  const [supplier, setSupplier] = useState('');
  const [poItems, setPoItems] = useState<RestockItem[]>([]);

  const handleAddItem = (productId: string) => {
      const product = products.find(p => p.id === productId);
      if (!product) return;

      const existingItem = poItems.find(i => i.productId === productId);
      if (existingItem) {
          // Increment quantity if already added
          setPoItems(prev => prev.map(i => i.productId === productId ? { ...i, quantity: i.quantity + 10 } : i));
      } else {
          setPoItems(prev => [
              ...prev,
              { productId: product.id, productName: product.name, sku: product.sku, quantity: 10, unitCost: 0 }
          ]);
      }
      setSearchTerm(''); // Clear search to show table
  };

  const handleUpdateItem = (productId: string, field: keyof RestockItem, value: number) => {
      setPoItems(prev => prev.map(i => i.productId === productId ? { ...i, [field]: value } : i));
  };

  const handleRemoveItem = (productId: string) => {
      setPoItems(prev => prev.filter(i => i.productId !== productId));
  };

  const calculateTotal = () => {
      return poItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
  };

  const handleSubmitPO = () => {
      if (!supplier || poItems.length === 0) return;

      const newPO: PurchaseOrder = {
          id: `#PO-${Math.floor(1000 + Math.random() * 9000)}`,
          supplier,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          items: poItems,
          totalCost: calculateTotal(),
          status: 'Pending'
      };

      createPurchaseOrder(newPO);
      setIsModalOpen(false);
      // Reset form
      setSupplier('');
      setPoItems([]);
  };

  const handleReceiveStock = (po: PurchaseOrder) => {
      if (window.confirm(`Confirm receipt of ${po.items.length} SKUs from ${po.supplier}? This will update live inventory.`)) {
          receiveStock(po);
      }
  };

  const filteredSearchProducts = searchTerm 
      ? products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.includes(searchTerm))
      : [];

  return (
    <div className="p-8 max-w-[1600px] mx-auto h-full flex flex-col relative">
      <header className="h-20 flex items-center justify-between mb-8">
        <div>
           <h2 className="text-2xl font-bold text-white">Stock Intake</h2>
           <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Manage inbound shipments & Purchase Orders</p>
        </div>
        <button 
           onClick={() => setIsModalOpen(true)}
           className="bg-primary hover:bg-red-700 text-white text-xs font-bold uppercase tracking-[0.1em] px-6 py-3 rounded shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
        >
           <Plus size={18} /> Create Restock
        </button>
      </header>

      {/* History Table */}
      <div className="bg-surface-dark border border-white/5 rounded-xl shadow-2xl flex-1 overflow-hidden flex flex-col">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead className="bg-white/[0.02]">
                  <tr className="text-[10px] uppercase tracking-widest text-white/50 border-b border-white/5">
                     <th className="px-6 py-4 font-semibold">PO ID</th>
                     <th className="px-6 py-4 font-semibold">Supplier</th>
                     <th className="px-6 py-4 font-semibold">Date</th>
                     <th className="px-6 py-4 font-semibold text-center">Items</th>
                     <th className="px-6 py-4 font-semibold text-right">Total Cost</th>
                     <th className="px-6 py-4 font-semibold">Status</th>
                     <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  {purchaseOrders.map((po) => (
                     <tr key={po.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 font-mono text-sm text-white">{po.id}</td>
                        <td className="px-6 py-4 text-sm text-gray-300 font-medium">{po.supplier}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{po.date}</td>
                        <td className="px-6 py-4 text-sm text-center text-white">{po.items.reduce((acc, i) => acc + i.quantity, 0)}</td>
                        <td className="px-6 py-4 text-sm text-right text-emerald-400 font-bold">${po.totalCost.toLocaleString()}</td>
                        <td className="px-6 py-4">
                           <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              po.status === 'Pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                           }`}>
                              {po.status === 'Pending' ? 'Pending' : 'Received'}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                           {po.status === 'Pending' && (
                              <button 
                                 onClick={() => handleReceiveStock(po)}
                                 className="text-[10px] font-bold uppercase tracking-wider text-primary hover:text-white border border-primary/30 hover:border-white/50 px-3 py-1.5 rounded transition-all flex items-center gap-1 ml-auto"
                              >
                                 <PackageCheck size={14} /> Receive Stock
                              </button>
                           )}
                           {po.status === 'Received' && (
                              <span className="text-[10px] text-gray-600 uppercase font-bold tracking-wider">Completed</span>
                           )}
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {/* CREATE MODAL */}
      {isModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
            <div className="relative bg-[#0F0F0F] border border-white/10 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in-up">
               
               {/* Modal Header */}
               <div className="p-6 border-b border-white/5 flex justify-between items-center bg-surface-dark">
                  <h3 className="text-xl font-bold text-white uppercase tracking-tight">Create Purchase Order</h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white transition-colors"><Plus size={24} className="rotate-45" /></button>
               </div>

               {/* Modal Content */}
               <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  
                  {/* Step 1: Supplier */}
                  <div className="space-y-4">
                     <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Step 1: Supplier Info</label>
                     <div className="grid grid-cols-2 gap-4">
                        <select 
                           value={supplier} 
                           onChange={(e) => setSupplier(e.target.value)}
                           className="bg-black/20 border border-white/10 rounded px-4 py-3 text-white text-sm focus:border-primary focus:ring-0"
                        >
                           <option value="">Select Supplier...</option>
                           <option value="Milan Silk Factory">Milan Silk Factory</option>
                           <option value="Tokyo Denim Co.">Tokyo Denim Co.</option>
                           <option value="Paris Leather Atelier">Paris Leather Atelier</option>
                           <option value="Local Warehouse">Local Warehouse</option>
                        </select>
                        <input type="text" placeholder="Reference No. (Optional)" className="bg-black/20 border border-white/10 rounded px-4 py-3 text-white text-sm focus:border-primary focus:ring-0" />
                     </div>
                  </div>

                  {/* Step 2: Items */}
                  <div className="space-y-4">
                     <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Step 2: Add Products</label>
                     
                     {/* Product Search */}
                     <div className="relative z-20">
                        <div className="relative">
                           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                           <input 
                              type="text" 
                              placeholder="Search products by name or SKU..." 
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white text-sm focus:border-primary focus:ring-0"
                           />
                        </div>
                        {/* Autocomplete Dropdown */}
                        {filteredSearchProducts.length > 0 && (
                           <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A1A] border border-white/10 rounded-lg shadow-xl max-h-60 overflow-y-auto z-30">
                              {filteredSearchProducts.map(p => (
                                 <button 
                                    key={p.id}
                                    onClick={() => handleAddItem(p.id)}
                                    className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center justify-between border-b border-white/5 last:border-0"
                                 >
                                    <div className="flex items-center gap-3">
                                       <img src={p.image} className="w-8 h-10 object-cover bg-white/5 rounded-sm" alt="" />
                                       <div>
                                          <p className="text-sm font-bold text-white">{p.name}</p>
                                          <p className="text-xs text-gray-500 font-mono">SKU: {p.sku}</p>
                                       </div>
                                    </div>
                                    <span className="text-xs text-primary font-bold uppercase tracking-wider">Add +</span>
                                 </button>
                              ))}
                           </div>
                        )}
                     </div>

                     {/* Selected Items Table */}
                     {poItems.length > 0 ? (
                        <div className="border border-white/10 rounded-lg overflow-hidden">
                           <table className="w-full text-left">
                              <thead className="bg-white/5 text-[10px] uppercase font-bold text-gray-500">
                                 <tr>
                                    <th className="px-4 py-2">Product</th>
                                    <th className="px-4 py-2 w-32">Quantity</th>
                                    <th className="px-4 py-2 w-32">Unit Cost</th>
                                    <th className="px-4 py-2 w-32 text-right">Subtotal</th>
                                    <th className="px-4 py-2 w-12"></th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                 {poItems.map((item) => (
                                    <tr key={item.productId} className="group">
                                       <td className="px-4 py-3">
                                          <p className="text-sm font-bold text-white">{item.productName}</p>
                                          <p className="text-xs text-gray-500 font-mono">{item.sku}</p>
                                       </td>
                                       <td className="px-4 py-3">
                                          <input 
                                             type="number" 
                                             value={item.quantity} 
                                             min="1"
                                             onChange={(e) => handleUpdateItem(item.productId, 'quantity', parseInt(e.target.value) || 0)}
                                             className="w-full bg-black/40 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-primary focus:ring-0 text-center"
                                          />
                                       </td>
                                       <td className="px-4 py-3">
                                          <div className="relative">
                                             <span className="absolute left-2 top-1.5 text-gray-500 text-xs">$</span>
                                             <input 
                                                type="number" 
                                                value={item.unitCost} 
                                                min="0"
                                                onChange={(e) => handleUpdateItem(item.productId, 'unitCost', parseFloat(e.target.value) || 0)}
                                                className="w-full bg-black/40 border border-white/10 rounded pl-5 pr-2 py-1 text-sm text-white focus:border-primary focus:ring-0 text-right"
                                             />
                                          </div>
                                       </td>
                                       <td className="px-4 py-3 text-right text-sm text-white font-mono">
                                          ${(item.quantity * item.unitCost).toLocaleString()}
                                       </td>
                                       <td className="px-4 py-3 text-right">
                                          <button onClick={() => handleRemoveItem(item.productId)} className="text-gray-600 hover:text-red-500 transition-colors">
                                             <Trash2 size={16} />
                                          </button>
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     ) : (
                        <div className="text-center py-8 border border-dashed border-white/10 rounded-lg">
                           <p className="text-gray-500 text-sm">No items added to this order yet.</p>
                        </div>
                     )}
                  </div>
               </div>

               {/* Footer / Summary */}
               <div className="p-6 border-t border-white/5 bg-surface-dark flex justify-between items-center">
                  <div>
                     <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Total Estimated Cost</p>
                     <p className="text-3xl font-black text-white tracking-tight">${calculateTotal().toLocaleString()}</p>
                  </div>
                  <div className="flex gap-4">
                     <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors">Cancel</button>
                     <button 
                        onClick={handleSubmitPO}
                        disabled={!supplier || poItems.length === 0}
                        className="bg-primary hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-[0.1em] px-8 py-3 rounded shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
                     >
                        Confirm Order
                     </button>
                  </div>
               </div>

            </div>
         </div>
      )}
    </div>
  );
};
