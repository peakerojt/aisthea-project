
import React, { useState, useRef, useEffect } from 'react';
import { ViewState } from '../types';
import { useProducts } from '../contexts/ProductContext';
import { CheckCircle2, Link as LinkIcon } from 'lucide-react';

interface UploadedImage {
  id: string;
  url: string;
}

interface VariantOption {
  id: number;
  name: string;
  values: string[];
}

interface VariantItem {
  id: string;
  name: string;
  price: string;
  stock: string;
  lowStockThreshold: string;
  sku: string;
  image: string | null;
}

export const AdminCreateProduct: React.FC<{ setView: (v: ViewState) => void }> = ({ setView }) => {
  const { addProduct } = useProducts();
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Product Base Info
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [baseSku, setBaseSku] = useState('');
  const [category, setCategory] = useState('Coats & Jackets');
  const [stock, setStock] = useState('0'); // For Simple Product Mode
  const [status, setStatus] = useState<'In Stock' | 'Out of Stock'>('In Stock');
  const [manualImageUrl, setManualImageUrl] = useState('');

  // Variant Image Upload Refs
  const variantFileInputRef = useRef<HTMLInputElement>(null);
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);

  // Variant State
  const [hasVariants, setHasVariants] = useState(false);
  const [options, setOptions] = useState<VariantOption[]>([
    { id: 1, name: 'Color', values: ['Black', 'White'] },
    { id: 2, name: 'Size', values: ['S', 'M', 'L'] }
  ]);
  const [variants, setVariants] = useState<VariantItem[]>([]);
  
  // Toast
  const [toast, setToast] = useState<{message: string, visible: boolean} | null>(null);

  // Variant Generation Effect
  useEffect(() => {
    if (!hasVariants) {
        setVariants([]);
        return;
    }

    const validOptions = options.filter(o => o.values.length > 0);
    if (validOptions.length === 0) {
      setVariants([]);
      return;
    }

    const cartesian = (a: any[], b: any[]) => [].concat(...a.map(d => b.map(e => [].concat(d, e))));
    let combinations = validOptions[0].values.map(v => [v]);
    
    for (let i = 1; i < validOptions.length; i++) {
        combinations = cartesian(combinations, validOptions[i].values);
    }

    const newVariantNames = combinations.map(combo => combo.join(' / '));
    
    setVariants(prev => {
        return newVariantNames.map(name => {
            const existing = prev.find(v => v.name === name);
            if (existing) return existing;

            // Generate SKU based on Base SKU + Options
            // e.g. BASE-S-RED
            const skuSuffix = name.split(' / ').map(s => s.substring(0, 3).toUpperCase()).join('-');
            const generatedSku = baseSku ? `${baseSku}-${skuSuffix}` : `SKU-${Math.floor(Math.random() * 10000)}-${skuSuffix}`;

            return {
                id: Math.random().toString(36).substr(2, 9),
                name,
                price: basePrice || '', // Inherit base price
                stock: '0',
                lowStockThreshold: '10', // Default threshold
                sku: generatedSku,
                image: null
            };
        });
    });
  }, [options, hasVariants]); 

  // Image Handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
    if (e.target) e.target.value = '';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const processFiles = (fileList: FileList) => {
    const validFiles = Array.from(fileList).filter(file => file.type.startsWith('image/'));
    
    if (validFiles.length === 0) return;

    const newImages = validFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      url: URL.createObjectURL(file)
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  const handleAddManualImage = () => {
    if(!manualImageUrl) return;
    
    const newImage = {
        id: Math.random().toString(36).substr(2, 9),
        url: manualImageUrl
    };
    setImages(prev => [...prev, newImage]);
    setManualImageUrl('');
  };

  const handleReorderDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation();
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleReorderDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...images];
    const draggedItem = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedItem);
    
    setImages(newImages);
    setDraggedIndex(index);
  };
  
  const handleReorderDragEnd = () => {
    setDraggedIndex(null);
  };

  const removeImage = (index: number) => {
    setImages(prev => {
        // We generally shouldn't revoke URL if it's external (manual input), but browsers handle this safely usually
        // Only revoke if blob
        const imgToRemove = prev[index];
        if (imgToRemove.url.startsWith('blob:')) {
            URL.revokeObjectURL(imgToRemove.url); 
        }
        return prev.filter((_, i) => i !== index);
    });
  };

  // Variant Option Handlers
  const addOption = () => {
    setOptions([...options, { id: Date.now(), name: '', values: [] }]);
  };

  const removeOption = (id: number) => {
    setOptions(options.filter(o => o.id !== id));
  };

  const updateOptionName = (id: number, name: string) => {
    setOptions(options.map(o => o.id === id ? { ...o, name } : o));
  };

  const handleValueKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = e.currentTarget.value.trim();
      if (val) {
        const option = options.find(o => o.id === id);
        if (option && !option.values.includes(val)) {
           setOptions(options.map(o => o.id === id ? { ...o, values: [...o.values, val] } : o));
        }
        e.currentTarget.value = '';
      }
    }
  };

  const removeValue = (id: number, val: string) => {
     setOptions(options.map(o => o.id === id ? { ...o, values: o.values.filter(v => v !== val) } : o));
  };

  const isColorValue = (val: string) => {
      const s = new Option().style;
      s.color = val;
      return s.color !== '';
  };

  // Variant Data Handlers
  const updateVariant = (id: string, field: keyof VariantItem, value: any) => {
      setVariants(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const triggerVariantImageUpload = (id: string) => {
    setActiveVariantId(id);
    variantFileInputRef.current?.click();
  };

  const handleVariantFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && activeVariantId) {
        const url = URL.createObjectURL(e.target.files[0]);
        updateVariant(activeVariantId, 'image', url);
    }
    if (e.target) e.target.value = '';
    setActiveVariantId(null);
  };

  // Bulk Actions
  const handleApplyPriceToAll = () => {
    if (!basePrice) return;
    if (window.confirm(`Update all ${variants.length} variants to price $${basePrice}?`)) {
        setVariants(prev => prev.map(v => ({ ...v, price: basePrice })));
    }
  };

  const handleRegenerateSkus = () => {
    if (window.confirm('This will overwrite all existing variant SKUs. Continue?')) {
        setVariants(prev => prev.map(v => {
            const skuSuffix = v.name.split(' / ').map(s => s.substring(0, 3).toUpperCase()).join('-');
            const generatedSku = baseSku ? `${baseSku}-${skuSuffix}` : `SKU-${Math.floor(Math.random() * 10000)}-${skuSuffix}`;
            return { ...v, sku: generatedSku };
        }));
    }
  };

  const handleSyncVariantData = () => {
    if (!basePrice && !baseSku) return;

    const confirmMsg = `This will sync all variants with:\n` +
        (basePrice ? `• Base Price: $${basePrice}\n` : '') +
        (baseSku ? `• Base SKU Prefix: ${baseSku}\n` : '') +
        `\nAre you sure you want to proceed?`;

    if (window.confirm(confirmMsg)) {
        setVariants(prev => prev.map(v => {
            const updates: Partial<VariantItem> = {};
            if (basePrice) updates.price = basePrice;
            if (baseSku) {
                 const skuSuffix = v.name.split(' / ').map(s => s.substring(0, 3).toUpperCase()).join('-');
                 updates.sku = `${baseSku}-${skuSuffix}`;
            }
            return { ...v, ...updates };
        }));
    }
  };

  const getStockStatus = (stock: number, threshold: number) => {
      if (stock === 0) return { label: 'Out of Stock', color: 'text-red-500 bg-red-500/10 border-red-500/20 icon-red' };
      if (stock <= threshold) return { label: 'Low Stock', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20 icon-amber' };
      return { label: 'In Stock', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 icon-emerald' };
  };

  // SAVE PRODUCT LOGIC
  const handleSaveProduct = () => {
      if (!productName || !basePrice) {
          alert('Product Name and Price are required.');
          return;
      }

      // Calculate Total Stock
      let finalStock = 0;
      if (hasVariants) {
          finalStock = variants.reduce((sum, v) => sum + Number(v.stock || 0), 0);
      } else {
          finalStock = Number(stock || 0);
      }

      // Determine Status
      let finalStatus: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
      if (finalStock === 0) finalStatus = 'Out of Stock';
      else if (finalStock < 10) finalStatus = 'Low Stock';
      else finalStatus = 'In Stock';

      // Construct Payload
      const newProduct = {
          name: productName,
          sku: baseSku || `SKU-${Date.now()}`,
          price: Number(basePrice),
          stock: finalStock,
          status: finalStatus,
          image: images.length > 0 ? images[0].url : 'https://images.unsplash.com/photo-1551028919-38f42197624c?q=80&w=200', // Default if no image
          category: category,
          description: description
      };

      addProduct(newProduct);
      
      setToast({ message: 'Product Added Successfully', visible: true });
      
      setTimeout(() => {
          setView('ADMIN_PRODUCTS');
      }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-bg-dark relative">
       
       {/* Toast Notification */}
       {toast && toast.visible && (
         <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
            <div className="bg-surface-dark border border-white/10 shadow-2xl rounded-full px-6 py-3 flex items-center gap-3">
               <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                  <CheckCircle2 size={12} strokeWidth={4} />
               </span>
               <span className="text-sm font-medium text-white">{toast.message}</span>
            </div>
         </div>
       )}

       <header className="h-16 min-h-[64px] border-b border-white/5 flex items-center justify-between px-8 bg-surface-dark/50 backdrop-blur-md sticky top-0 z-10">
         <div>
           <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
             <button onClick={() => setView('ADMIN_DASHBOARD')} className="hover:text-white">Dashboard</button>
             <span className="text-[10px] material-symbols-outlined">chevron_right</span>
             <button onClick={() => setView('ADMIN_PRODUCTS')} className="hover:text-white">Products</button>
             <span className="text-[10px] material-symbols-outlined">chevron_right</span>
             <span className="text-white">Create</span>
           </div>
           <h2 className="text-lg font-bold text-white leading-none">Create New Product</h2>
         </div>
         <div className="flex items-center gap-4">
           <button onClick={() => setView('ADMIN_PRODUCTS')} className="text-sm font-medium text-gray-400 hover:text-white px-4 py-2">Discard</button>
           <button 
             onClick={handleSaveProduct}
             className="flex items-center justify-center gap-2 bg-primary hover:bg-red-700 text-white text-sm font-bold tracking-wide px-6 py-2.5 rounded shadow-lg shadow-primary/20"
           >
             <span className="material-symbols-outlined text-lg">save</span> SAVE PRODUCT
           </button>
         </div>
       </header>

       <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
         <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
           <div className="lg:col-span-8 flex flex-col gap-6">
              <div className="bg-surface-dark rounded-lg p-8 border border-white/5">
                <div className="flex flex-col gap-6">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-400">Product Name *</span>
                    <input 
                      type="text" 
                      placeholder="e.g., NOIR SILK TRENCH" 
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-white/20 focus:border-primary focus:ring-0 text-3xl font-bold placeholder:text-white/20 px-0 py-2 text-white transition-colors" 
                    />
                  </label>
                  <div className="flex flex-col gap-3 mt-4">
                    <span className="text-sm font-medium text-gray-400">Description</span>
                    <textarea 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded p-4 text-base text-white placeholder:text-gray-600 focus:border-primary focus:ring-1 focus:ring-primary min-h-[200px]" 
                        placeholder="Enter product details..."
                    ></textarea>
                  </div>
                </div>
              </div>

              {/* Media Upload Section */}
              <div className="bg-surface-dark rounded-lg p-8 border border-white/5">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-white font-medium">Media</h3>
                    <div className="flex gap-2">
                        {images.length > 0 && (
                             <button 
                                onClick={() => {
                                    images.forEach(img => {
                                        if (img.url.startsWith('blob:')) URL.revokeObjectURL(img.url);
                                    });
                                    setImages([]);
                                }}
                                className="text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-red-500 transition-colors"
                             >
                                Clear All
                            </button>
                        )}
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs font-bold uppercase tracking-wider text-primary hover:text-white transition-colors"
                        >
                            Add Media
                        </button>
                    </div>
                </div>
                
                {/* Manual Image URL Input */}
                <div className="flex gap-2 mb-4">
                   <div className="relative flex-1">
                      <LinkIcon size={16} className="absolute left-3 top-2.5 text-gray-500" />
                      <input 
                         type="text" 
                         value={manualImageUrl}
                         onChange={(e) => setManualImageUrl(e.target.value)}
                         placeholder="Paste image URL (e.g. Unsplash)"
                         className="w-full bg-black/20 border border-white/10 rounded px-3 pl-10 py-2 text-sm text-white focus:border-primary focus:ring-0"
                      />
                   </div>
                   <button 
                     onClick={handleAddManualImage}
                     disabled={!manualImageUrl}
                     className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                   >
                     Add URL
                   </button>
                </div>

                <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleFileSelect} 
                />

                {images.length === 0 ? (
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragEnter}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-lg transition-all cursor-pointer h-48 flex flex-col items-center justify-center gap-4 group ${isDragActive ? 'border-primary bg-primary/10' : 'border-white/10 bg-black/20 hover:bg-black/40 hover:border-gray-500'}`}
                    >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center border group-hover:scale-110 transition-transform ${isDragActive ? 'bg-primary text-white border-primary' : 'bg-surface-dark text-gray-400 border-white/10'}`}>
                            <span className="material-symbols-outlined text-2xl">cloud_upload</span>
                        </div>
                        <div className="text-center">
                            <p className="text-white font-medium">{isDragActive ? 'Drop files here' : 'Click to upload'}</p>
                            <p className="text-gray-500 text-sm mt-1">{isDragActive ? 'Release to upload' : 'Drag and drop multiple images here'}</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 transition-all">
                        {images.map((img, index) => (
                            <div 
                                key={img.id}
                                draggable
                                onDragStart={(e) => handleReorderDragStart(e, index)}
                                onDragOver={(e) => handleReorderDragOver(e, index)}
                                onDragEnd={handleReorderDragEnd}
                                className={`relative aspect-[3/4] rounded-lg overflow-hidden group cursor-move border transition-all ${draggedIndex === index ? 'border-primary opacity-50 scale-95' : 'border-white/10 bg-white/5 hover:border-white/30'}`}
                            >
                                <img src={img.url} alt="" className="w-full h-full object-cover pointer-events-none" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                     <button onClick={(e) => { e.stopPropagation(); removeImage(index); }} className="w-8 h-8 flex items-center justify-center bg-red-500/80 hover:bg-red-600 rounded-full text-white backdrop-blur-sm transition-colors shadow-lg">
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                     </button>
                                </div>
                                {index === 0 && (
                                    <div className="absolute top-2 left-2 px-2 py-1 bg-primary text-white text-[10px] font-bold uppercase tracking-wider rounded shadow-lg">
                                        Main
                                    </div>
                                )}
                                <div className="absolute bottom-2 right-2 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white/80 font-mono">
                                    {index + 1}
                                </div>
                            </div>
                        ))}
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDragOver={handleDragEnter}
                            onDrop={handleDrop}
                            className={`aspect-[3/4] border-2 border-dashed rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${isDragActive ? 'border-primary bg-primary/10' : 'border-white/10 bg-black/20 hover:bg-black/40 hover:border-gray-500'}`}
                        >
                            <span className={`material-symbols-outlined text-2xl ${isDragActive ? 'text-primary' : 'text-gray-400'}`}>add</span>
                            <span className={`text-xs font-medium uppercase tracking-wide ${isDragActive ? 'text-primary' : 'text-gray-500'}`}>Add More</span>
                        </div>
                    </div>
                )}
              </div>

              {/* Variants Section */}
              <div className="bg-surface-dark rounded-lg p-8 border border-white/5">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-white font-medium">Product Variants</h3>
                        <p className="text-xs text-gray-500 mt-1">Manage stock levels and SKUs per variant.</p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={hasVariants}
                            onChange={(e) => setHasVariants(e.target.checked)}
                            className="rounded border-white/20 bg-transparent text-primary focus:ring-0" 
                        />
                        <span className="text-sm text-gray-400">Enable Variants</span>
                    </label>
                </div>
                
                {/* SIMPLE INVENTORY WHEN VARIANTS DISABLED */}
                {!hasVariants && (
                    <div className="animate-fade-in space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-xs text-gray-500 font-medium">Stock Quantity</label>
                                <input 
                                    type="number" 
                                    value={stock}
                                    onChange={(e) => setStock(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded text-white p-3 text-sm focus:border-primary focus:ring-0" 
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-xs text-gray-500 font-medium">Status</label>
                                <select 
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as any)}
                                    className="w-full bg-black/20 border border-white/10 rounded text-white p-3 text-sm focus:border-primary focus:ring-0"
                                >
                                    <option value="In Stock">In Stock</option>
                                    <option value="Out of Stock">Out of Stock</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {hasVariants && (
                    <div className="space-y-8 animate-fade-in">
                        {/* Options Definition */}
                        <div className="space-y-4">
                            {options.map((option) => (
                                <div key={option.id} className="p-4 bg-black/20 rounded border border-white/5">
                                    <div className="flex flex-col md:flex-row gap-4 mb-2">
                                        <div className="w-full md:w-1/3">
                                            <label className="text-xs text-gray-500 font-medium mb-1 block">Attribute Name</label>
                                            <input 
                                                type="text" 
                                                value={option.name}
                                                onChange={(e) => updateOptionName(option.id, e.target.value)}
                                                className="w-full bg-surface-dark border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-primary focus:ring-0"
                                                placeholder="e.g. Size"
                                            />
                                            {/* Presets */}
                                            <div className="flex gap-2 mt-2">
                                                {['Size', 'Color', 'Material', 'Style'].map(type => (
                                                    <button 
                                                        key={type}
                                                        onClick={() => updateOptionName(option.id, type)}
                                                        className={`text-[10px] uppercase font-bold px-2 py-1 rounded border transition-colors ${option.name === type ? 'bg-primary text-white border-primary' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'}`}
                                                    >
                                                        {type}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-xs text-gray-500 font-medium mb-1 block">Values (Enter to add)</label>
                                            <div className="flex-1 bg-surface-dark border border-white/10 rounded px-3 py-1.5 min-h-[38px] flex flex-wrap gap-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
                                                {option.values.map(val => (
                                                    <span key={val} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 text-xs text-white border border-white/10">
                                                        {isColorValue(val) && (
                                                            <span className="w-2 h-2 rounded-full border border-white/20 mr-1" style={{ backgroundColor: val }}></span>
                                                        )}
                                                        {val} 
                                                        <button onClick={() => removeValue(option.id, val)} className="hover:text-red-400 flex items-center ml-1"><span className="material-symbols-outlined text-[14px]">close</span></button>
                                                    </span>
                                                ))}
                                                <input 
                                                    type="text"
                                                    placeholder={option.values.length === 0 ? `e.g. ${option.name === 'Color' ? 'Black, White' : 'S, M, L'}` : ""}
                                                    onKeyDown={(e) => handleValueKeyDown(e, option.id)}
                                                    className="bg-transparent border-none p-0 text-sm text-white focus:ring-0 w-full min-w-[120px]"
                                                />
                                            </div>
                                        </div>
                                        <button onClick={() => removeOption(option.id)} className="self-end p-2 text-gray-500 hover:text-red-500 md:mb-1"><span className="material-symbols-outlined">delete</span></button>
                                    </div>
                                </div>
                            ))}
                            <button onClick={addOption} className="text-xs font-bold text-primary uppercase tracking-wide flex items-center gap-2 hover:text-white transition-colors mt-2">
                                <span className="material-symbols-outlined text-lg">add_circle</span> Add Attribute
                            </button>
                        </div>

                        {/* Variants Table */}
                        {variants.length > 0 && (
                            <div className="space-y-4 pt-4 border-t border-white/5">
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    ref={variantFileInputRef}
                                    onChange={handleVariantFileSelect}
                                />
                                
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Preview Variants ({variants.length})</h4>
                                    
                                    {/* Bulk Actions */}
                                    <div className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded border border-white/10">
                                        <span className="text-[10px] uppercase font-bold text-gray-500 mr-2">Bulk Actions:</span>
                                        <button 
                                            onClick={handleApplyPriceToAll}
                                            disabled={!basePrice}
                                            className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${basePrice ? 'text-primary hover:text-white' : 'text-gray-600 cursor-not-allowed'}`}
                                        >
                                            Apply Price
                                        </button>
                                        <div className="w-px h-3 bg-white/10"></div>
                                        <button 
                                            onClick={handleRegenerateSkus}
                                            className="text-[10px] font-bold uppercase tracking-wider text-primary hover:text-white transition-colors"
                                        >
                                            Sync SKUs
                                        </button>
                                        <div className="w-px h-3 bg-white/10"></div>
                                        <button 
                                            onClick={handleSyncVariantData}
                                            disabled={!basePrice && !baseSku}
                                            className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${basePrice || baseSku ? 'text-primary hover:text-white' : 'text-gray-600 cursor-not-allowed'}`}
                                        >
                                            Sync Data
                                        </button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto border border-white/10 rounded">
                                    <table className="w-full text-left text-sm min-w-[800px]">
                                        <thead className="bg-white/5 text-xs uppercase font-bold text-gray-500">
                                            <tr>
                                                <th className="px-4 py-3 border-b border-white/10 w-20">Img</th>
                                                <th className="px-4 py-3 border-b border-white/10 w-48">Variant / SKU</th>
                                                <th className="px-4 py-3 border-b border-white/10 w-32">Price</th>
                                                <th className="px-4 py-3 border-b border-white/10 w-48">Inventory Control</th>
                                                <th className="px-4 py-3 border-b border-white/10 w-32 text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {variants.map((variant, i) => {
                                                const status = getStockStatus(Number(variant.stock), Number(variant.lowStockThreshold));
                                                
                                                return (
                                                <tr key={variant.id} className="group hover:bg-white/5">
                                                    {/* Image Column */}
                                                    <td className="px-4 py-3">
                                                        <div className="w-10 h-12 bg-white/5 rounded border border-white/10 flex items-center justify-center overflow-hidden relative group/img cursor-pointer" onClick={() => triggerVariantImageUpload(variant.id)}>
                                                            {variant.image ? (
                                                                <>
                                                                    <img src={variant.image} alt="Variant" className="w-full h-full object-cover" />
                                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity" onClick={(e) => { e.stopPropagation(); updateVariant(variant.id, 'image', null); }}>
                                                                        <span className="material-symbols-outlined text-xs text-white">close</span>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <span className="material-symbols-outlined text-gray-500 group-hover:text-white transition-colors">add_photo_alternate</span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Variant Info / SKU */}
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-col">
                                                            <span className="text-white font-bold text-sm mb-1 flex items-center gap-2">
                                                                {variant.name}
                                                                {i === 0 && <span className="w-1.5 h-1.5 rounded-full bg-primary" title="Default Variant"></span>}
                                                            </span>
                                                            <input 
                                                                type="text" 
                                                                value={variant.sku}
                                                                onChange={(e) => updateVariant(variant.id, 'sku', e.target.value)}
                                                                placeholder="SKU"
                                                                className="w-full bg-transparent border-0 border-b border-white/10 p-0 text-[11px] text-gray-400 font-mono focus:border-primary focus:ring-0 focus:text-white transition-colors" 
                                                            />
                                                        </div>
                                                    </td>

                                                    {/* Price */}
                                                    <td className="px-4 py-3">
                                                        <div className="relative">
                                                            <span className="absolute left-2 top-1.5 text-gray-500 text-xs">$</span>
                                                            <input 
                                                                type="number" 
                                                                value={variant.price}
                                                                onChange={(e) => updateVariant(variant.id, 'price', e.target.value)}
                                                                className="w-full bg-black/20 border border-white/10 rounded pl-5 pr-2 py-1.5 text-xs text-white focus:border-primary focus:ring-0 transition-colors" 
                                                            />
                                                        </div>
                                                    </td>

                                                    {/* Inventory Control Matrix */}
                                                    <td className="px-4 py-3">
                                                        <div className="flex gap-2">
                                                            <div className="flex-1">
                                                                <label className="text-[9px] text-gray-500 uppercase font-bold block mb-1">Stock</label>
                                                                <input 
                                                                    type="number" 
                                                                    value={variant.stock}
                                                                    onChange={(e) => updateVariant(variant.id, 'stock', e.target.value)}
                                                                    className="w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-xs text-white font-bold focus:border-primary focus:ring-0 text-center" 
                                                                />
                                                            </div>
                                                            <div className="flex-1">
                                                                <label className="text-[9px] text-gray-500 uppercase font-bold block mb-1">Alert At</label>
                                                                <input 
                                                                    type="number" 
                                                                    value={variant.lowStockThreshold}
                                                                    onChange={(e) => updateVariant(variant.id, 'lowStockThreshold', e.target.value)}
                                                                    className="w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-xs text-gray-400 focus:border-white focus:text-white focus:ring-0 text-center" 
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Status Badge */}
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${status.color}`}>
                                                            {status.label === 'In Stock' && <span className="w-1.5 h-1.5 rounded-full bg-current"></span>}
                                                            {status.label === 'Low Stock' && <span className="material-symbols-outlined text-[10px]">warning</span>}
                                                            {status.label === 'Out of Stock' && <span className="material-symbols-outlined text-[10px]">error</span>}
                                                            {status.label}
                                                        </span>
                                                    </td>
                                                </tr>
                                            )})}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
              </div>
           </div>

           <div className="lg:col-span-4 flex flex-col gap-6">
             <div className="bg-surface-dark rounded-lg p-6 border border-white/5">
               <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Status</h3>
               <select className="w-full bg-black/20 border border-white/10 rounded text-white p-3 focus:border-primary focus:ring-0">
                 <option>Draft</option>
                 <option>Active</option>
                 <option>Archived</option>
               </select>
               <div className="mt-4 space-y-2">
                 <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="rounded border-white/20 bg-transparent text-primary focus:ring-0" /> <span className="text-sm text-white">Online Store</span></label>
                 <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="rounded border-white/20 bg-transparent text-primary focus:ring-0" /> <span className="text-sm text-white">Instagram Shop</span></label>
               </div>
             </div>

             <div className="bg-surface-dark rounded-lg p-6 border border-white/5 space-y-5">
               <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Organization</h3>
               <div className="flex flex-col gap-2">
                 <label className="text-xs text-gray-500 font-medium">Category</label>
                 <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded text-white p-2.5 text-sm focus:border-primary focus:ring-0"
                 >
                   <option value="Coats & Jackets">Coats & Jackets</option>
                   <option value="Dresses">Dresses</option>
                   <option value="Accessories">Accessories</option>
                   <option value="Bottoms">Bottoms</option>
                   <option value="Shoes">Shoes</option>
                 </select>
               </div>
               <div className="flex flex-col gap-2">
                  <label className="text-xs text-gray-500 font-medium">Collection</label>
                  <input type="text" placeholder="e.g. FW24" className="w-full bg-black/20 border border-white/10 rounded text-white p-2.5 text-sm focus:border-primary focus:ring-0" />
               </div>
               <div className="flex flex-col gap-2">
                  <label className="text-xs text-gray-500 font-medium">Base SKU</label>
                  <input 
                    type="text" 
                    placeholder="e.g. TRENCH-001" 
                    value={baseSku}
                    onChange={(e) => setBaseSku(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded text-white p-2.5 text-sm focus:border-primary focus:ring-0 font-mono" 
                  />
                  <p className="text-[10px] text-gray-600">Variants will use this as a prefix.</p>
               </div>
             </div>

             <div className="bg-surface-dark rounded-lg p-6 border border-white/5 space-y-5">
               <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Pricing</h3>
               <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                     <label className="text-xs text-gray-500 font-medium">Base Price *</label>
                     <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-500 text-sm">$</span>
                        <input 
                            type="number" 
                            placeholder="0.00" 
                            value={basePrice}
                            onChange={(e) => setBasePrice(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded text-white pl-7 pr-3 py-2.5 text-sm focus:border-primary focus:ring-0" 
                        />
                     </div>
                  </div>
                  <div className="flex flex-col gap-2">
                     <label className="text-xs text-gray-500 font-medium">Sale Price</label>
                     <div className="relative"><span className="absolute left-3 top-2.5 text-gray-500 text-sm">$</span><input type="number" placeholder="0.00" className="w-full bg-black/20 border border-white/10 rounded text-white pl-7 pr-3 py-2.5 text-sm focus:border-primary focus:ring-0" /></div>
                  </div>
               </div>
             </div>
           </div>
         </div>
       </div>
    </div>
  );
};
