import React, { useState, useEffect } from 'react';
import { StoreHeader } from '../components/StoreHeader';
import { ViewState, CategoryType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { userService, UserProfile, Address, RecentOrder } from '../services/user.service';
import { getImageUrl } from '../utils/cloudinary';

interface StoreProfileProps {
  setView: (v: ViewState) => void;
  setCategory: (c: CategoryType) => void;
}

export const StoreProfile: React.FC<StoreProfileProps> = ({ setView, setCategory }) => {
  const { user, logout } = useAuth();

  // State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expandable sections state
  const [expandedSection, setExpandedSection] = useState<string | null>('personal');

  // Edit mode states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ fullName: '', phone: '' });

  // Address form state
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [addressForm, setAddressForm] = useState({
    recipientName: '',
    phone: '',
    addressLine: '',
    city: '',
    district: '',
    isDefault: false,
  });

  // Avatar upload state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Load profile data
  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const [profileData, addressesData, ordersData] = await Promise.all([
        userService.getProfile(),
        userService.getAddresses(),
        userService.getRecentOrders(5),
      ]);

      setProfile(profileData);
      setAddresses(addressesData);
      setRecentOrders(ordersData);
      setProfileForm({
        fullName: profileData.fullName,
        phone: profileData.phone || '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setView('STORE_HOME');
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Profile edit handlers
  const handleSaveProfile = async () => {
    try {
      const updatedProfile = await userService.updateProfile(profileForm);
      setProfile(updatedProfile);
      setIsEditingProfile(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    }
  };

  const handleCancelEditProfile = () => {
    if (profile) {
      setProfileForm({
        fullName: profile.fullName,
        phone: profile.phone || '',
      });
    }
    setIsEditingProfile(false);
  };

  // Avatar upload handlers
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (5MB limit for Cloudinary)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    // Convert to base64 for upload
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadAvatar = async () => {
    if (!avatarPreview) return;

    try {
      setUploadingAvatar(true);
      const response = await userService.uploadAvatar(avatarPreview);
      await loadProfileData();
      setAvatarPreview(null);
      alert((response as any).message || 'Avatar uploaded successfully to cloud storage!');
    } catch (err: any) {
      alert(err.message || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!confirm('Are you sure you want to delete your avatar?')) return;

    try {
      await userService.deleteAvatar();
      await loadProfileData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete avatar');
    }
  };

  // Address handlers
  const handleAddAddress = () => {
    setAddressForm({
      recipientName: profile?.fullName || '',
      phone: profile?.phone || '',
      addressLine: '',
      city: '',
      district: '',
      isDefault: addresses.length === 0,
    });
    setEditingAddressId(null);
    setShowAddressForm(true);
  };

  const handleEditAddress = (address: Address) => {
    setAddressForm({
      recipientName: address.recipientName,
      phone: address.phone,
      addressLine: address.addressLine,
      city: address.city,
      district: address.district || '',
      isDefault: address.isDefault,
    });
    setEditingAddressId(address.addressId);
    setShowAddressForm(true);
  };

  const handleSaveAddress = async () => {
    try {
      if (editingAddressId) {
        await userService.updateAddress(editingAddressId, addressForm);
      } else {
        await userService.createAddress(addressForm);
      }
      await loadProfileData();
      setShowAddressForm(false);
    } catch (err: any) {
      alert(err.message || 'Failed to save address');
    }
  };

  const handleDeleteAddress = async (addressId: number) => {
    if (!confirm('Are you sure you want to delete this address?')) return;

    try {
      await userService.deleteAddress(addressId);
      await loadProfileData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete address');
    }
  };

  const handleSetDefaultAddress = async (addressId: number) => {
    try {
      await userService.setDefaultAddress(addressId);
      await loadProfileData();
    } catch (err: any) {
      alert(err.message || 'Failed to set default address');
    }
  };

  if (loading) {
    return (
      <div className="bg-bg-dark min-h-screen text-white font-sans">
        <StoreHeader setView={setView} setCategory={setCategory} />
        <div className="pt-32 px-6 md:px-12 max-w-5xl mx-auto flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-primary animate-spin mb-4">progress_activity</span>
            <p className="text-gray-400">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="bg-bg-dark min-h-screen text-white font-sans">
        <StoreHeader setView={setView} setCategory={setCategory} />
        <div className="pt-32 px-6 md:px-12 max-w-5xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/20 p-6 rounded text-center">
            <p className="text-red-400">{error || 'Failed to load profile'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-dark min-h-screen text-white font-sans">
      <StoreHeader setView={setView} setCategory={setCategory} />

      <div className="pt-32 px-6 md:px-12 max-w-5xl mx-auto pb-20">
        {/* Page Header */}
        <div className="mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-2">My Profile</h1>
          <div className="h-1 w-16 bg-primary"></div>
        </div>

        {/* Hero Section - Avatar & Profile Completeness */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 md:p-12 rounded mb-6 animate-fade-in">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="relative group">
                {profile.avatarUrl || avatarPreview ? (
                  <img
                    src={avatarPreview || getImageUrl(profile.avatarUrl)}
                    alt="Avatar"
                    className="w-32 h-32 rounded-full object-cover border-4 border-white/10"
                  />
                ) : (
                  <div className="w-32 h-32 bg-primary/20 rounded-full flex items-center justify-center text-primary text-5xl font-bold border-4 border-primary/20">
                    {profile.fullName.charAt(0)}
                  </div>
                )}

                {/* Avatar Actions */}
                <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarSelect}
                      className="hidden"
                    />
                    <span className="material-symbols-outlined text-white text-2xl hover:text-primary transition-colors">
                      photo_camera
                    </span>
                  </label>
                  {profile.avatarUrl && (
                    <button onClick={handleDeleteAvatar}>
                      <span className="material-symbols-outlined text-white text-2xl hover:text-red-500 transition-colors">
                        delete
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Avatar Upload Controls */}
              {avatarPreview && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleUploadAvatar}
                    disabled={uploadingAvatar}
                    className="px-4 py-2 bg-primary hover:bg-red-700 text-white text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
                  >
                    {uploadingAvatar ? 'Uploading...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setAvatarPreview(null)}
                    className="px-4 py-2 border border-white/20 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-widest transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl font-bold mb-2">{profile.fullName}</h2>
              <p className="text-gray-400 mb-4">{profile.email}</p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-6">
                <span className="inline-block px-3 py-1 bg-white/10 rounded text-xs font-bold uppercase tracking-widest text-primary">
                  {profile.status}
                </span>
                {profile.googleId && (
                  <span className="inline-block px-3 py-1 bg-white/10 rounded text-xs font-bold uppercase tracking-widest text-blue-400">
                    Google Account
                  </span>
                )}
              </div>

              {/* Profile Completeness */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-widest font-bold text-gray-400">Profile Completeness</span>
                  <span className="text-xs font-bold text-primary">{profile.completeness}%</span>
                </div>
                <div className="w-full bg-black/40 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-red-700 transition-all duration-500"
                    style={{ width: `${profile.completeness}%` }}
                  ></div>
                </div>
                {profile.completeness < 100 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Complete your profile to unlock all features
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Personal Information Section */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded mb-4 overflow-hidden animate-fade-in">
          <button
            onClick={() => toggleSection('personal')}
            className="w-full px-8 py-6 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-primary">person</span>
              <h3 className="text-lg font-bold uppercase tracking-wide">Personal Information</h3>
            </div>
            <span className={`material-symbols-outlined transition-transform ${expandedSection === 'personal' ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </button>

          {expandedSection === 'personal' && (
            <div className="px-8 py-6 border-t border-white/10 animate-fade-in">
              {!isEditingProfile ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs uppercase tracking-widest font-bold text-gray-400">Full Name</label>
                    <p className="text-lg">{profile.fullName}</p>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-widest font-bold text-gray-400">Email</label>
                    <p className="text-lg">{profile.email}</p>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-widest font-bold text-gray-400">Phone</label>
                    <p className="text-lg">{profile.phone || 'Not provided'}</p>
                  </div>
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="mt-4 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold uppercase tracking-widest transition-colors"
                  >
                    Edit Information
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest font-bold text-gray-400 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={profileForm.fullName}
                      onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                      className="w-full bg-black/40 border border-white/20 px-4 py-3 text-white rounded focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest font-bold text-gray-400 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full bg-black/40 border border-white/20 px-4 py-3 text-white rounded focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveProfile}
                      className="px-6 py-3 bg-primary hover:bg-red-700 text-white text-xs font-bold uppercase tracking-widest transition-colors"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={handleCancelEditProfile}
                      className="px-6 py-3 border border-white/20 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-widest transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Addresses Section */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded mb-4 overflow-hidden animate-fade-in">
          <button
            onClick={() => toggleSection('addresses')}
            className="w-full px-8 py-6 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-primary">location_on</span>
              <h3 className="text-lg font-bold uppercase tracking-wide">Addresses ({addresses.length})</h3>
            </div>
            <span className={`material-symbols-outlined transition-transform ${expandedSection === 'addresses' ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </button>

          {expandedSection === 'addresses' && (
            <div className="px-8 py-6 border-t border-white/10 animate-fade-in">
              {showAddressForm ? (
                <div className="bg-black/20 p-6 rounded mb-6 border border-white/5">
                  <h4 className="text-sm font-bold uppercase tracking-widest mb-4">{editingAddressId ? 'Edit Address' : 'Add New Address'}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-widest font-bold text-gray-400 mb-2">Recipient Name</label>
                      <input type="text" value={addressForm.recipientName} onChange={(e) => setAddressForm({ ...addressForm, recipientName: e.target.value })} className="w-full bg-black/40 border border-white/20 px-4 py-3 text-white rounded focus:outline-none focus:border-primary transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-widest font-bold text-gray-400 mb-2">Phone</label>
                      <input type="tel" value={addressForm.phone} onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })} className="w-full bg-black/40 border border-white/20 px-4 py-3 text-white rounded focus:outline-none focus:border-primary transition-colors" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs uppercase tracking-widest font-bold text-gray-400 mb-2">Address Line</label>
                      <input type="text" value={addressForm.addressLine} onChange={(e) => setAddressForm({ ...addressForm, addressLine: e.target.value })} className="w-full bg-black/40 border border-white/20 px-4 py-3 text-white rounded focus:outline-none focus:border-primary transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-widest font-bold text-gray-400 mb-2">City</label>
                      <input type="text" value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} className="w-full bg-black/40 border border-white/20 px-4 py-3 text-white rounded focus:outline-none focus:border-primary transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-widest font-bold text-gray-400 mb-2">District</label>
                      <input type="text" value={addressForm.district} onChange={(e) => setAddressForm({ ...addressForm, district: e.target.value })} className="w-full bg-black/40 border border-white/20 px-4 py-3 text-white rounded focus:outline-none focus:border-primary transition-colors" />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={handleSaveAddress} className="px-6 py-3 bg-primary hover:bg-red-700 text-white text-xs font-bold uppercase tracking-widest transition-colors">Save Address</button>
                    <button onClick={() => setShowAddressForm(false)} className="px-6 py-3 border border-white/20 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-widest transition-colors">Cancel</button>
                  </div>
                </div>
              ) : null}
              {addresses.length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-6xl text-white/20 mb-4">location_off</span>
                  <p className="text-gray-500 mb-6">No addresses saved yet</p>
                  <button onClick={handleAddAddress} className="px-6py-3 bg-primary hover:bg-red-700 text-white text-xs font-bold uppercase tracking-widest transition-colors">Add Address</button>
                </div>
              ) : (
                <div className="space-y-4">
                  {!showAddressForm && (
                    <button onClick={handleAddAddress} className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold uppercase tracking-widest transition-colors mb-4">+ Add New</button>
                  )}
                  {addresses.map((address) => (
                    <div key={address.addressId} className="bg-black/20 p-6 rounded border border-white/5">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h5 className="font-bold text-lg mb-1">{address.recipientName}</h5>
                          <p className="text-sm text-gray-400">{address.phone}</p>
                        </div>
                        {address.isDefault && <span className="px-3 py-1 bg-primary/20 text-primary border border-primary/30 rounded text-xs font-bold uppercase tracking-widest">Default</span>}
                      </div>
                      <p className="text-sm text-gray-300 mb-1">{address.addressLine}</p>
                      <p className="text-sm text-gray-400">{address.district && `${address.district}, `}{address.city}</p>
                      <div className="flex gap-3 mt-4">
                        <button onClick={() => handleEditAddress(address)} className="text-xs font-bold uppercase tracking-widest text-primary hover:text-white transition-colors">Edit</button>
                        {!address.isDefault && <button onClick={() => handleSetDefaultAddress(address.addressId)} className="text-xs font-bold uppercase tracking-widest text-blue-400 hover:text-white transition-colors">Set Default</button>}
                        <button onClick={() => handleDeleteAddress(address.addressId)} className="text-xs font-bold uppercase tracking-widest text-red-400 hover:text-white transition-colors">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent Orders Section */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded mb-4 overflow-hidden animate-fade-in">
          <button onClick={() => toggleSection('orders')} className="w-full px-8 py-6 flex items-center justify-between hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-primary">shopping_bag</span>
              <h3 className="text-lg font-bold uppercase tracking-wide">Recent Orders</h3>
            </div>
            <span className={`material-symbols-outlined transition-transform ${expandedSection === 'orders' ? 'rotate-180' : ''}`}>expand_more</span>
          </button>
          {expandedSection === 'orders' && (
            <div className="px-8 py-6 border-t border-white/10 animate-fade-in">
              {recentOrders.length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-6xl text-white/20 mb-4">shopping_bag</span>
                  <p className="text-gray-500 mb-6">No orders yet</p>
                  <button onClick={() => setView('STORE_COLLECTION')} className="px-6 py-3 bg-primary hover:bg-red-700 text-white text-xs font-bold uppercase tracking-widest transition-colors">Start Shopping</button>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div key={order.orderId} className="bg-black/20 p-6 rounded border border-white/5">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-bold text-sm uppercase tracking-wide mb-1">Order #{order.orderNumber}</h5>
                          <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">
                            ${Number(order.totalAmount ?? 0).toFixed(2)}
                          </p>
                          <span className={`inline-block px-3 py-1 rounded text-xs font-bold uppercase ${order.status === 'Delivered' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{order.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setView('STORE_MY_ORDERS')} className="w-full px-6 py-3 border border-white/20 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-widest transition-colors">View All Orders</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Account Section */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded overflow-hidden animate-fade-in">
          <div className="px-8 py-6">
            <div className="flex items-center gap-4 mb-6">
              <span className="material-symbols-outlined text-primary">security</span>
              <h3 className="text-lg font-bold uppercase tracking-wide">Account</h3>
            </div>
            <button onClick={handleLogout} className="px-8 py-3 border border-white/20 hover:bg-white hover:text-black transition-all text-xs font-bold uppercase tracking-widest">Sign Out</button>
          </div>
        </div>

      </div>
    </div>
  );
};