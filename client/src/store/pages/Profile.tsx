import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/store/components/Header';
import { useAuth } from '@/common/contexts/AuthContext';
import { userService, UserProfile, Address, RecentOrder } from '@/store/services/user.service';
import { getImageUrl } from '@/common/utils/cloudinary';
import { formatCurrencyVND } from '@/common/utils/currency';
import { getStatusMeta, normalizeStatus } from '@/config/orderStatus.config';
import { useTranslation } from 'react-i18next';
import { type FieldErrorMap, firstFieldError, mapZodFieldErrors } from '@/common/validation/errors';
import { profileAddressClientSchema, profileUpdateClientSchema } from '@/common/validation/schemas';
import { ZodError } from 'zod';

export const Profile: React.FC = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'profile' });
  const navigate = useNavigate();
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
  const [profileErrors, setProfileErrors] = useState<FieldErrorMap>({});
  const [profileErrorMessage, setProfileErrorMessage] = useState('');

  // Address form state
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [addressForm, setAddressForm] = useState({
    recipientName: '',
    phone: '',
    addressLine: '',
    city: '',
    district: '',
    ward: '',
    isDefault: false,
  });
  const [addressErrors, setAddressErrors] = useState<FieldErrorMap>({});
  const [addressErrorMessage, setAddressErrorMessage] = useState('');

  // Avatar upload state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [avatarFeedback, setAvatarFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [addressActionFeedback, setAddressActionFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // Load profile data
  const loadProfileData = useCallback(async () => {
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
    } catch (error) {
      const err = error as Error | { message?: string; error?: string; data?: unknown };
      setError(err.message || t('errors.loadProfile'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatarPreview, profile?.avatarUrl]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const inputClassName = 'w-full bg-black/40 border px-4 py-3 text-white rounded focus:outline-none transition-colors';
  const defaultInputBorderClassName = 'border-white/20 focus:border-primary';
  const errorInputBorderClassName = 'border-red-500 focus:border-red-400';
  const fieldErrorClassName = 'mt-2 text-xs text-red-400';
  const formErrorClassName = 'mb-4 rounded border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300';

  const clearFieldError = (setErrors: React.Dispatch<React.SetStateAction<FieldErrorMap>>, field: string) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const mapApiFieldErrors = (details?: Array<{ field?: string; message?: string }>): FieldErrorMap => {
    if (!Array.isArray(details)) return {};

    return details.reduce<FieldErrorMap>((acc, issue) => {
      if (!issue.field || !issue.message || acc[issue.field]) return acc;
      acc[issue.field] = issue.message;
      return acc;
    }, {});
  };

  // Profile edit handlers
  const handleSaveProfile = async () => {
    const parsed = profileUpdateClientSchema.safeParse(profileForm);

    if (!parsed.success) {
      const mappedErrors = mapZodFieldErrors(parsed.error);
      setProfileErrors(mappedErrors);
      setProfileErrorMessage(firstFieldError(mappedErrors) || t('errors.updateProfile'));
      return;
    }

    try {
      setProfileErrors({});
      setProfileErrorMessage('');
      const updatedProfile = await userService.updateProfile(parsed.data);
      setProfile(updatedProfile);
      setIsEditingProfile(false);
    } catch (error) {
      if (error instanceof ZodError) {
        const mappedErrors = mapZodFieldErrors(error);
        setProfileErrors(mappedErrors);
        setProfileErrorMessage(firstFieldError(mappedErrors) || t('errors.updateProfile'));
        return;
      }

      const err = error as Error & {
        details?: Array<{ field?: string; message?: string }>;
      };
      const mappedErrors = mapApiFieldErrors(err.details);

      if (Object.keys(mappedErrors).length > 0) {
        setProfileErrors(mappedErrors);
      }

      setProfileErrorMessage(err.message || firstFieldError(mappedErrors) || t('errors.updateProfile'));
    }
  };

  const handleCancelEditProfile = () => {
    if (profile) {
      setProfileForm({
        fullName: profile.fullName,
        phone: profile.phone || '',
      });
    }
    setProfileErrors({});
    setProfileErrorMessage('');
    setIsEditingProfile(false);
  };

  // Avatar upload handlers
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setAvatarFeedback({ type: 'error', message: t('avatar.errors.invalidType') });
      return;
    }

    // Validate file size (5MB limit for Cloudinary)
    if (file.size > 5 * 1024 * 1024) {
      setAvatarFeedback({ type: 'error', message: t('avatar.errors.maxSize') });
      return;
    }

    setAvatarFeedback(null);

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
      setAvatarFeedback(null);
      const response = await userService.uploadAvatar(avatarPreview);
      await loadProfileData();
      setAvatarPreview(null);
      setAvatarFeedback({ type: 'success', message: (response as any).message || t('avatar.messages.uploadSuccess') });
    } catch (error) {
      const err = error as Error | { message?: string; error?: string; data?: unknown };
      setAvatarFeedback({ type: 'error', message: err.message || t('avatar.errors.uploadFailed') });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!confirm(t('avatar.confirmDelete'))) return;

    try {
      await userService.deleteAvatar();
      await loadProfileData();
      setAvatarPreview(null);
      setAvatarFeedback(null);
    } catch (err: unknown) {
      setAvatarFeedback({ type: 'error', message: err instanceof Error ? err.message : t('avatar.errors.deleteFailed') });
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
      ward: '',
      isDefault: addresses.length === 0,
    });
    setAddressErrors({});
    setAddressErrorMessage('');
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
      ward: address.ward || '',
      isDefault: address.isDefault,
    });
    setAddressErrors({});
    setAddressErrorMessage('');
    setEditingAddressId(address.addressId);
    setShowAddressForm(true);
  };

  const handleCancelAddressForm = () => {
    setAddressErrors({});
    setAddressErrorMessage('');
    setShowAddressForm(false);
    setEditingAddressId(null);
  };

  const handleSaveAddress = async () => {
    const parsed = profileAddressClientSchema.safeParse(addressForm);

    if (!parsed.success) {
      const mappedErrors = mapZodFieldErrors(parsed.error);
      setAddressErrors(mappedErrors);
      setAddressErrorMessage(firstFieldError(mappedErrors) || t('addresses.errors.saveFailed'));
      return;
    }

    try {
      setAddressErrors({});
      setAddressErrorMessage('');
      if (editingAddressId) {
        await userService.updateAddress(editingAddressId, parsed.data);
      } else {
        await userService.createAddress(parsed.data);
      }
      await loadProfileData();
      handleCancelAddressForm();
    } catch (err: unknown) {
      if (err instanceof ZodError) {
        const mappedErrors = mapZodFieldErrors(err);
        setAddressErrors(mappedErrors);
        setAddressErrorMessage(firstFieldError(mappedErrors) || t('addresses.errors.saveFailed'));
        return;
      }

      const apiError = err as Error & {
        details?: Array<{ field?: string; message?: string }>;
      };
      const mappedErrors = mapApiFieldErrors(apiError.details);

      if (Object.keys(mappedErrors).length > 0) {
        setAddressErrors(mappedErrors);
      }

      setAddressErrorMessage(apiError.message || firstFieldError(mappedErrors) || t('addresses.errors.saveFailed'));
    }
  };

  const handleDeleteAddress = async (addressId: number) => {
    if (!confirm(t('addresses.confirmDelete'))) return;

    try {
      await userService.deleteAddress(addressId);
      await loadProfileData();
      setAddressActionFeedback(null);
    } catch (err: unknown) {
      setAddressActionFeedback({ type: 'error', message: err instanceof Error ? err.message : t('addresses.errors.deleteFailed') });
    }
  };

  const handleSetDefaultAddress = async (addressId: number) => {
    try {
      await userService.setDefaultAddress(addressId);
      await loadProfileData();
      setAddressActionFeedback(null);
    } catch (err: unknown) {
      setAddressActionFeedback({ type: 'error', message: err instanceof Error ? err.message : t('addresses.errors.defaultFailed') });
    }
  };

  if (loading) {
    return (
      <div className="bg-bg-dark min-h-screen text-white font-sans">
        <Header />
        <div className="pt-32 px-6 md:px-12 max-w-5xl mx-auto flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-primary animate-spin mb-4">progress_activity</span>
            <p className="text-gray-400">{t('states.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="bg-bg-dark min-h-screen text-white font-sans">
        <Header />
        <div className="pt-32 px-6 md:px-12 max-w-5xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/20 p-6 rounded text-center">
            <p className="text-red-400">{error || t('errors.loadProfile')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-dark min-h-screen text-white font-sans">
      <Header />

      <div className="pt-32 px-6 md:px-12 max-w-5xl mx-auto pb-20">
        {/* Page Header */}
        <div className="mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-2">{t('title')}</h1>
          <div className="h-1 w-16 bg-primary"></div>
        </div>

        {/* Hero Section - Avatar & Profile Completeness */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-8 md:p-12 rounded mb-6 animate-fade-in">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="relative group">
                {(profile.avatarUrl || avatarPreview) && !avatarLoadFailed ? (
                  <img
                    src={avatarPreview || getImageUrl(profile.avatarUrl)}
                    alt={t('avatar.alt')}
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarLoadFailed(true)}
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
                    {uploadingAvatar ? t('avatar.actions.uploading') : t('common.save')}
                  </button>
                  <button
                    onClick={() => {
                      setAvatarPreview(null);
                      setAvatarFeedback(null);
                    }}
                    className="px-4 py-2 border border-white/20 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-widest transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              )}
              {avatarFeedback && (
                <div className={`mt-4 rounded border px-4 py-3 text-sm ${avatarFeedback.type === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-green-500/30 bg-green-500/10 text-green-300'}`}>
                  {avatarFeedback.message}
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
                    {t('labels.googleAccount')}
                  </span>
                )}
              </div>

              {/* Profile Completeness */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-widest font-bold text-gray-400">{t('labels.profileCompleteness')}</span>
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
                    {t('labels.completenessHint')}
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
              <h3 className="text-lg font-bold uppercase tracking-wide">{t('sections.personal')}</h3>
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
                    <label className="text-xs uppercase tracking-widest font-bold text-gray-400">{t('fields.fullName')}</label>
                    <p className="text-lg">{profile.fullName}</p>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-widest font-bold text-gray-400">{t('fields.email')}</label>
                    <p className="text-lg">{profile.email}</p>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-widest font-bold text-gray-400">{t('fields.phone')}</label>
                    <p className="text-lg">{profile.phone || t('states.notProvided')}</p>
                  </div>
                  <button
                    onClick={() => setIsEditingProfile(true)}
                    className="mt-4 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold uppercase tracking-widest transition-colors"
                  >
                    {t('actions.editInfo')}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest font-bold text-gray-400 mb-2">{t('fields.fullName')}</label>
                    <input
                      type="text"
                      value={profileForm.fullName}
                      onChange={(e) => {
                        setProfileForm({ ...profileForm, fullName: e.target.value });
                        clearFieldError(setProfileErrors, 'fullName');
                        setProfileErrorMessage('');
                      }}
                      className={`${inputClassName} ${profileErrors.fullName ? errorInputBorderClassName : defaultInputBorderClassName}`}
                    />
                    {profileErrors.fullName && <p className={fieldErrorClassName}>{profileErrors.fullName}</p>}
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest font-bold text-gray-400 mb-2">{t('fields.phone')}</label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => {
                        setProfileForm({ ...profileForm, phone: e.target.value });
                        clearFieldError(setProfileErrors, 'phone');
                        setProfileErrorMessage('');
                      }}
                      className={`${inputClassName} ${profileErrors.phone ? errorInputBorderClassName : defaultInputBorderClassName}`}
                    />
                    {profileErrors.phone && <p className={fieldErrorClassName}>{profileErrors.phone}</p>}
                  </div>
                  {profileErrorMessage && <div className={formErrorClassName}>{profileErrorMessage}</div>}
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveProfile}
                      className="px-6 py-3 bg-primary hover:bg-red-700 text-white text-xs font-bold uppercase tracking-widest transition-colors"
                    >
                      {t('actions.saveChanges')}
                    </button>
                    <button
                      onClick={handleCancelEditProfile}
                      className="px-6 py-3 border border-white/20 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-widest transition-colors"
                    >
                      {t('common.cancel')}
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
              <h3 className="text-lg font-bold uppercase tracking-wide">{t('sections.addresses', { count: addresses.length })}</h3>
            </div>
            <span className={`material-symbols-outlined transition-transform ${expandedSection === 'addresses' ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </button>

          {expandedSection === 'addresses' && (
            <div className="px-8 py-6 border-t border-white/10 animate-fade-in">
              {addressActionFeedback && (
                <div className={`mb-4 rounded border px-4 py-3 text-sm ${addressActionFeedback.type === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-green-500/30 bg-green-500/10 text-green-300'}`}>
                  {addressActionFeedback.message}
                </div>
              )}
              {showAddressForm ? (
                <div className="bg-black/20 p-6 rounded mb-6 border border-white/5">
                  <h4 className="text-sm font-bold uppercase tracking-widest mb-4">{editingAddressId ? t('addresses.actions.edit') : t('addresses.actions.addNew')}</h4>
                  {addressErrorMessage && <div className={formErrorClassName}>{addressErrorMessage}</div>}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-6">
                      <label className="block text-xs uppercase tracking-widest font-bold text-gray-400 mb-2">{t('addresses.fields.recipientName')}</label>
                      <input type="text" value={addressForm.recipientName} onChange={(e) => {
                        setAddressForm({ ...addressForm, recipientName: e.target.value });
                        clearFieldError(setAddressErrors, 'recipientName');
                        setAddressErrorMessage('');
                      }} className={`${inputClassName} ${addressErrors.recipientName ? errorInputBorderClassName : defaultInputBorderClassName}`} />
                      {addressErrors.recipientName && <p className={fieldErrorClassName}>{addressErrors.recipientName}</p>}
                    </div>
                    <div className="md:col-span-6">
                      <label className="block text-xs uppercase tracking-widest font-bold text-gray-400 mb-2">{t('addresses.fields.phone')}</label>
                      <input type="tel" value={addressForm.phone} onChange={(e) => {
                        setAddressForm({ ...addressForm, phone: e.target.value });
                        clearFieldError(setAddressErrors, 'phone');
                        setAddressErrorMessage('');
                      }} className={`${inputClassName} ${addressErrors.phone ? errorInputBorderClassName : defaultInputBorderClassName}`} />
                      {addressErrors.phone && <p className={fieldErrorClassName}>{addressErrors.phone}</p>}
                    </div>
                    <div className="md:col-span-8">
                      <label className="block text-xs uppercase tracking-widest font-bold text-gray-400 mb-2">{t('addresses.fields.addressLine')}</label>
                      <input type="text" value={addressForm.addressLine} onChange={(e) => {
                        setAddressForm({ ...addressForm, addressLine: e.target.value });
                        clearFieldError(setAddressErrors, 'addressLine');
                        setAddressErrorMessage('');
                      }} className={`${inputClassName} ${addressErrors.addressLine ? errorInputBorderClassName : defaultInputBorderClassName}`} />
                      {addressErrors.addressLine && <p className={fieldErrorClassName}>{addressErrors.addressLine}</p>}
                    </div>
                    <div className="md:col-span-4">
                      <label className="block text-xs uppercase tracking-widest font-bold text-gray-400 mb-2">{t('addresses.fields.city')}</label>
                      <input type="text" value={addressForm.city} onChange={(e) => {
                        setAddressForm({ ...addressForm, city: e.target.value });
                        clearFieldError(setAddressErrors, 'city');
                        setAddressErrorMessage('');
                      }} className={`${inputClassName} ${addressErrors.city ? errorInputBorderClassName : defaultInputBorderClassName}`} />
                      {addressErrors.city && <p className={fieldErrorClassName}>{addressErrors.city}</p>}
                    </div>
                    <div className="md:col-span-6">
                      <label className="block text-xs uppercase tracking-widest font-bold text-gray-400 mb-2">{t('addresses.fields.district')}</label>
                      <input type="text" value={addressForm.district} onChange={(e) => {
                        setAddressForm({ ...addressForm, district: e.target.value });
                        clearFieldError(setAddressErrors, 'district');
                        setAddressErrorMessage('');
                      }} className={`${inputClassName} ${addressErrors.district ? errorInputBorderClassName : defaultInputBorderClassName}`} />
                      {addressErrors.district && <p className={fieldErrorClassName}>{addressErrors.district}</p>}
                    </div>
                    <div className="md:col-span-6">
                      <label className="block text-xs uppercase tracking-widest font-bold text-gray-400 mb-2">{t('addresses.fields.ward')}</label>
                      <input type="text" value={addressForm.ward} onChange={(e) => {
                        setAddressForm({ ...addressForm, ward: e.target.value });
                        clearFieldError(setAddressErrors, 'ward');
                        setAddressErrorMessage('');
                      }} className={`${inputClassName} ${addressErrors.ward ? errorInputBorderClassName : defaultInputBorderClassName}`} />
                      {addressErrors.ward && <p className={fieldErrorClassName}>{addressErrors.ward}</p>}
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={handleSaveAddress} className="px-6 py-3 bg-primary hover:bg-red-700 text-white text-xs font-bold uppercase tracking-widest transition-colors">{t('addresses.actions.save')}</button>
                    <button onClick={handleCancelAddressForm} className="px-6 py-3 border border-white/20 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-widest transition-colors">{t('common.cancel')}</button>
                  </div>
                </div>
              ) : null}
              {addresses.length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-6xl text-white/20 mb-4">location_off</span>
                  <p className="text-gray-500 mb-6">{t('addresses.empty')}</p>
                  <button onClick={handleAddAddress} className="px-6 py-3 bg-primary hover:bg-red-700 text-white text-xs font-bold uppercase tracking-widest transition-colors">{t('addresses.actions.add')}</button>
                </div>
              ) : (
                <div className="space-y-4">
                  {!showAddressForm && (
                    <button onClick={handleAddAddress} className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold uppercase tracking-widest transition-colors mb-4">+ {t('addresses.actions.addNew')}</button>
                  )}
                  {addresses.map((address) => (
                    <div key={address.addressId} className="bg-black/20 p-6 rounded border border-white/5">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h5 className="font-bold text-lg mb-1">{address.recipientName}</h5>
                          <p className="text-sm text-gray-400">{address.phone}</p>
                        </div>
                        {address.isDefault && <span className="px-3 py-1 bg-primary/20 text-primary border border-primary/30 rounded text-xs font-bold uppercase tracking-widest">{t('addresses.labels.default')}</span>}
                      </div>
                      <p className="text-sm text-gray-300 mb-1">{address.addressLine}</p>
                      <p className="text-sm text-gray-400">
                        {address.ward ? `${address.ward}, ` : ''}
                        {address.district ? `${address.district}, ` : ''}
                        {address.city}
                      </p>
                      <div className="flex gap-3 mt-4">
                        <button onClick={() => handleEditAddress(address)} className="text-xs font-bold uppercase tracking-widest text-primary hover:text-white transition-colors">{t('actions.edit')}</button>
                        {!address.isDefault && <button onClick={() => handleSetDefaultAddress(address.addressId)} className="text-xs font-bold uppercase tracking-widest text-blue-400 hover:text-white transition-colors">{t('addresses.actions.setDefault')}</button>}
                        <button onClick={() => handleDeleteAddress(address.addressId)} className="text-xs font-bold uppercase tracking-widest text-red-400 hover:text-white transition-colors">{t('actions.delete')}</button>
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
              <h3 className="text-lg font-bold uppercase tracking-wide">{t('sections.recentOrders')}</h3>
            </div>
            <span className={`material-symbols-outlined transition-transform ${expandedSection === 'orders' ? 'rotate-180' : ''}`}>expand_more</span>
          </button>
          {expandedSection === 'orders' && (
            <div className="px-8 py-6 border-t border-white/10 animate-fade-in">
              {recentOrders.length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-6xl text-white/20 mb-4">shopping_bag</span>
                  <p className="text-gray-500 mb-6">{t('recentOrders.empty')}</p>
                  <button onClick={() => navigate('/collection')} className="px-6 py-3 bg-primary hover:bg-red-700 text-white text-xs font-bold uppercase tracking-widest transition-colors">{t('recentOrders.actions.startShopping')}</button>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentOrders.map((order) => {
                    const normalizedStatus = normalizeStatus(order.status);
                    const statusMeta = normalizedStatus ? getStatusMeta(normalizedStatus) : null;

                    return (
                      <div key={order.orderId} className="bg-black/20 p-6 rounded border border-white/5">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-bold text-sm uppercase tracking-wide mb-1">{t('recentOrders.orderNumber', { orderNumber: order.orderNumber })}</h5>
                            <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">
                              {formatCurrencyVND(Number(order.totalAmount ?? 0))}
                            </p>
                            <span
                              className={`inline-block px-3 py-1 rounded text-xs font-bold uppercase ${
                                statusMeta
                                  ? `${statusMeta.badgeClass} ${statusMeta.textClass}`
                                  : 'bg-white/10 text-white/70'
                              }`}
                            >
                              {statusMeta?.label || order.status || t('states.unknown')}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <button onClick={() => navigate('/my-orders')} className="w-full px-6 py-3 border border-white/20 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-widest transition-colors">{t('recentOrders.actions.viewAll')}</button>
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
              <h3 className="text-lg font-bold uppercase tracking-wide">{t('sections.account')}</h3>
            </div>
            <button onClick={handleLogout} className="px-8 py-3 border border-white/20 hover:bg-white hover:text-black transition-all text-xs font-bold uppercase tracking-widest">{t('actions.signOut')}</button>
          </div>
        </div>

      </div>
    </div>
  );
};
