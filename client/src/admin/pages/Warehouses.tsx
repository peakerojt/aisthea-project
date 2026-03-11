import { useState, useEffect } from 'react';
import { api } from '@/common/utils/api';

interface Warehouse {
    warehouseId: number;
    name: string;
    address: string | null;
    isActive: boolean;
    createdAt: string;
    inventoryCount: number;
}

interface InventoryItem {
    inventoryId: number;
    variantId: number;
    quantity: number;
    reservedQuantity: number;
    availableStock: number;
    sku: string;
    productName: string;
    variantLabel: string;
}

export default function Warehouses() {
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedWarehouse, setSelectedWarehouse] = useState<(Warehouse & { inventory: InventoryItem[] }) | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', address: '' });
    const [saving, setSaving] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);

    const loadWarehouses = async () => {
        try {
            setLoading(true);
            const resp = await api.get<{ success: boolean; data: Warehouse[] }>('/api/warehouses');
            setWarehouses(resp.data ?? []);
        } catch (error) {
            const e = error as Error | { message?: string; error?: string; data?: unknown };
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadWarehouses(); }, []);

    const loadDetail = async (warehouseId: number) => {
        try {
            setDetailLoading(true);
            const resp = await api.get<{ success: boolean; data: any }>(`/api/warehouses/${warehouseId}`);
            setSelectedWarehouse(resp.data);
        } catch (error) {
            const e = error as Error | { message?: string; error?: string; data?: unknown };
            setError(e.message);
        } finally {
            setDetailLoading(false);
        }
    };

    const createWarehouse = async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        try {
            await api.post('/api/warehouses', { name: form.name, address: form.address || undefined });
            setForm({ name: '', address: '' });
            setShowForm(false);
            loadWarehouses();
        } catch (error) {
            const e = error as Error | { message?: string; error?: string; data?: unknown };
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (warehouse: Warehouse) => {
        try {
            await api.patch(`/api/warehouses/${warehouse.warehouseId}`, { isActive: !warehouse.isActive });
            loadWarehouses();
        } catch (error) {
            const e = error as Error | { message?: string; error?: string; data?: unknown };
            setError(e.message);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading warehouses…</div>;

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Warehouse Management</h1>
                <button
                    onClick={() => setShowForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    + New Warehouse
                </button>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                    {error}
                    <button onClick={() => setError(null)} className="ml-2 text-red-500">✕</button>
                </div>
            )}

            {showForm && (
                <div className="mb-6 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                    <h2 className="text-lg font-semibold mb-3">New Warehouse</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Warehouse name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                            <input
                                type="text"
                                value={form.address}
                                onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Warehouse address"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={createWarehouse}
                            disabled={saving}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                        >
                            {saving ? 'Creating…' : 'Create'}
                        </button>
                        <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {warehouses.map(w => (
                    <div key={w.warehouseId} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition">
                        <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-gray-900">{w.name}</h3>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${w.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {w.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        {w.address && <p className="text-sm text-gray-500 mb-2">{w.address}</p>}
                        <p className="text-sm text-gray-600 mb-3">
                            <span className="font-medium">{w.inventoryCount}</span> SKUs tracked
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => loadDetail(w.warehouseId)}
                                className="flex-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
                            >
                                View Inventory
                            </button>
                            <button
                                onClick={() => toggleActive(w)}
                                className={`px-3 py-1.5 text-sm rounded-lg transition ${w.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                            >
                                {w.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Inventory Detail Panel */}
            {selectedWarehouse && (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between p-4 border-b">
                        <h2 className="text-lg font-semibold">
                            {selectedWarehouse.name} — Inventory
                        </h2>
                        <button onClick={() => setSelectedWarehouse(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                    {detailLoading ? (
                        <div className="p-6 text-center text-gray-500">Loading…</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-gray-600 font-medium">Product</th>
                                        <th className="px-4 py-3 text-left text-gray-600 font-medium">SKU</th>
                                        <th className="px-4 py-3 text-right text-gray-600 font-medium">On Hand</th>
                                        <th className="px-4 py-3 text-right text-gray-600 font-medium">Reserved</th>
                                        <th className="px-4 py-3 text-right text-gray-600 font-medium">Available</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {selectedWarehouse.inventory.map(item => (
                                        <tr key={item.inventoryId} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900">{item.productName}</div>
                                                {item.variantLabel && <div className="text-xs text-gray-500">{item.variantLabel}</div>}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 font-mono text-xs">{item.sku}</td>
                                            <td className="px-4 py-3 text-right">{item.quantity}</td>
                                            <td className="px-4 py-3 text-right text-amber-600">{item.reservedQuantity}</td>
                                            <td className={`px-4 py-3 text-right font-semibold ${item.availableStock <= 5 ? 'text-red-600' : 'text-green-600'}`}>
                                                {item.availableStock}
                                            </td>
                                        </tr>
                                    ))}
                                    {selectedWarehouse.inventory.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-gray-400">No inventory tracked in this warehouse yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
