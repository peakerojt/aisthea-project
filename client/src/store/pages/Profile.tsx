import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  LockKeyhole,
  Mail,
  Phone,
  LogOut,
  Link2,
  MapPinned,
  Package,
  Plus,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { Header } from '@/store/components/Header';
import { useAuth } from '@/common/contexts/AuthContext';
import { useToast } from '@/common/contexts/ToastContext';
import { userService, UserProfile, Address, RecentOrder } from '@/store/services/user.service';
import { getImageUrl } from '@/common/utils/cloudinary';
import { formatCurrencyVND } from '@/common/utils/currency';
import { ORDER_STATUS } from '@/config/orderStatus.config';
import { useTranslation } from 'react-i18next';
import { type FieldErrorMap, firstFieldError, mapZodFieldErrors } from '@/common/validation/errors';
import { profileAddressClientSchema, profileUpdateClientSchema } from '@/common/validation/schemas';
import { fetchVNDistricts, fetchVNProvinces, fetchVNWards, resolveVNLocationSelection, type VNLocationOption } from '@/common/utils/vnLocation';
import { ZodError } from 'zod';
import { getCustomerOrderStatusMeta, normalizeCustomerOrderStatus } from '@/store/utils/orderStatusDisplay';

const surfaceClassName = 'rounded-sm border border-white/5 bg-surface-dark';
const mutedSurfaceClassName = 'rounded-sm border border-white/10 bg-black/20';
const elevatedCardClassName = 'rounded-sm border border-white/10 bg-black/20 shadow-[0_12px_28px_rgba(0,0,0,0.14)] transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-black/25 hover:shadow-[0_20px_40px_rgba(0,0,0,0.2)]';
const luxeCardClassName = 'relative overflow-hidden rounded-sm border border-white/5 bg-surface-dark shadow-[0_20px_50px_rgba(0,0,0,0.16)] transition-all duration-200 hover:border-white/10 hover:shadow-[0_26px_60px_rgba(0,0,0,0.22)]';
const luxeMetricCardClassName = 'relative overflow-hidden rounded-sm border border-white/5 bg-black/20 p-5 shadow-[0_14px_34px_rgba(0,0,0,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:border-white/10 hover:bg-white/[0.03] hover:shadow-[0_20px_40px_rgba(0,0,0,0.22)]';
const profileDetailCardClassName = `${luxeMetricCardClassName} flex min-h-[164px] flex-col justify-between text-left md:p-6`;
const profileDetailLabelClassName = 'text-[10px] font-bold uppercase tracking-[0.2em] text-white/40';
const profileDetailValueClassName = 'mt-5 text-[1.35rem] font-bold leading-tight tracking-[-0.03em] text-white md:text-[1.55rem]';
const inputClassName = 'w-full rounded border bg-black/25 px-4 py-3 text-sm text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20';
const selectClassName = 'w-full appearance-none rounded-sm border border-border-dark bg-surface-dark px-4 py-3 pr-9 text-sm text-white transition-colors focus:border-white focus:outline-none';
const formFieldLabelClassName = 'mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-gray-300';
const defaultInputBorderClassName = 'border-white/10 focus:border-primary/50';
const errorInputBorderClassName = 'border-red-500/70 focus:border-red-400';
const fieldErrorClassName = 'mt-2 text-xs text-red-300';
const formErrorClassName = 'rounded border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200';
const subtleButtonClassName = 'border border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all text-xs font-bold uppercase tracking-widest';
const solidPrimaryButtonClassName = 'bg-primary/15 text-primary hover:bg-primary hover:text-white transition-all text-xs font-bold uppercase tracking-widest border border-primary/30 shadow-[0_0_18px_rgba(239,68,68,0.12)]';

const formatShortDate = (value: string) =>
  new Date(value).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

const formatMemberSince = (value: string) =>
  new Date(value).toLocaleDateString('vi-VN', {
    month: 'long',
    year: 'numeric',
  });

const formatAddressLine = (address: Address) =>
  [address.addressLine, address.ward, address.district, address.city].filter(Boolean).join(', ');

const getInitial = (name: string) => name.trim().charAt(0).toUpperCase() || 'A';
type ProfileSection = 'personal' | 'addresses' | 'orders' | 'security';
type OrderFilter = 'all' | 'shipping' | 'delivered' | 'pending';

export const Profile: React.FC = () => {
  const { t } = useTranslation('pages', { keyPrefix: 'profile' });
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<ProfileSection>('personal');
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('all');

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ fullName: '', phone: '' });
  const [profileErrors, setProfileErrors] = useState<FieldErrorMap>({});
  const [profileErrorMessage, setProfileErrorMessage] = useState('');
  const [profileFeedback, setProfileFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

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
  const [addressProvinces, setAddressProvinces] = useState<VNLocationOption[]>([]);
  const [addressDistricts, setAddressDistricts] = useState<VNLocationOption[]>([]);
  const [addressWards, setAddressWards] = useState<VNLocationOption[]>([]);
  const [selectedAddressCityCode, setSelectedAddressCityCode] = useState('');
  const [selectedAddressDistrictCode, setSelectedAddressDistrictCode] = useState('');
  const [selectedAddressWardCode, setSelectedAddressWardCode] = useState('');

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [avatarFeedback, setAvatarFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [addressActionFeedback, setAddressActionFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const loadProfileData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

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
    } catch (err) {
      const typedError = err as Error | { message?: string };
      setError(typedError.message || t('errors.loadProfile'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  useEffect(() => {
    fetchVNProvinces()
      .then((data) => setAddressProvinces(data))
      .catch((err) => console.error('Failed to fetch provinces for profile address form:', err));
  }, []);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatarPreview, profile?.avatarUrl]);

  useEffect(() => {
    if (!avatarFeedback) return;

    showToast({
      type: avatarFeedback.type,
      title: avatarFeedback.message,
    });
  }, [avatarFeedback, showToast]);

  useEffect(() => {
    if (!profileFeedback) return;

    showToast({
      type: profileFeedback.type,
      title: profileFeedback.message,
    });
  }, [profileFeedback, showToast]);

  useEffect(() => {
    if (!addressActionFeedback) return;

    showToast({
      type: addressActionFeedback.type,
      title: addressActionFeedback.message,
    });
  }, [addressActionFeedback, showToast]);

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

  const localizeAddressErrors = (errors: FieldErrorMap): FieldErrorMap => {
    const localized: FieldErrorMap = { ...errors };

    if (localized.recipientName) localized.recipientName = t('addresses.validation.recipientName');
    if (localized.phone) localized.phone = t('addresses.validation.phone');
    if (localized.addressLine) localized.addressLine = t('addresses.validation.addressLine');
    if (localized.city) localized.city = t('addresses.validation.city');
    if (localized.district) localized.district = t('addresses.validation.district');
    if (localized.ward) localized.ward = t('addresses.validation.ward');

    return localized;
  };

  const openOverview = () => {
    setActiveSection('personal');
  };

  const openTab = (section: Exclude<ProfileSection, 'personal'>) => {
    setActiveSection(section);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(profile?.email || '');
      showToast({ type: 'success', title: t('messages.emailCopied') });
    } catch {
      showToast({ type: 'error', title: t('errors.updateProfile') });
    }
  };

  const handleSaveProfile = async () => {
    const parsed = profileUpdateClientSchema.safeParse(profileForm);

    if (!parsed.success) {
      const mappedErrors = mapZodFieldErrors(parsed.error);
      setProfileErrors(mappedErrors);
      setProfileErrorMessage(firstFieldError(mappedErrors) || t('errors.updateProfile'));
      setProfileFeedback(null);
      return;
    }

    try {
      setProfileErrors({});
      setProfileErrorMessage('');
      const updatedProfile = await userService.updateProfile(parsed.data);
      setProfile(updatedProfile);
      setProfileForm({
        fullName: updatedProfile.fullName,
        phone: updatedProfile.phone || '',
      });
      setIsEditingProfile(false);
      setProfileFeedback({ type: 'success', message: t('messages.profileSaved') });
    } catch (err) {
      if (err instanceof ZodError) {
        const mappedErrors = mapZodFieldErrors(err);
        setProfileErrors(mappedErrors);
        setProfileErrorMessage(firstFieldError(mappedErrors) || t('errors.updateProfile'));
        setProfileFeedback(null);
        return;
      }

      const apiError = err as Error & { details?: Array<{ field?: string; message?: string }> };
      const mappedErrors = mapApiFieldErrors(apiError.details);
      if (Object.keys(mappedErrors).length > 0) setProfileErrors(mappedErrors);
      setProfileErrorMessage(apiError.message || firstFieldError(mappedErrors) || t('errors.updateProfile'));
      setProfileFeedback(null);
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

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarFeedback({ type: 'error', message: t('avatar.errors.invalidType') });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarFeedback({ type: 'error', message: t('avatar.errors.maxSize') });
      return;
    }

    setAvatarFeedback(null);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
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
      setAvatarFeedback({ type: 'success', message: (response as { message?: string }).message || t('avatar.messages.uploadSuccess') });
    } catch (err) {
      const typedError = err as Error | { message?: string };
      setAvatarFeedback({ type: 'error', message: typedError.message || t('avatar.errors.uploadFailed') });
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
      setAvatarFeedback({ type: 'success', message: t('avatar.messages.deleteSuccess') });
    } catch (err: unknown) {
      setAvatarFeedback({ type: 'error', message: err instanceof Error ? err.message : t('avatar.errors.deleteFailed') });
    }
  };

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
    setSelectedAddressCityCode('');
    setSelectedAddressDistrictCode('');
    setSelectedAddressWardCode('');
    setAddressDistricts([]);
    setAddressWards([]);
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
    setSelectedAddressCityCode('');
    setSelectedAddressDistrictCode('');
    setSelectedAddressWardCode('');
    setAddressDistricts([]);
    setAddressWards([]);
    setAddressErrors({});
    setAddressErrorMessage('');
    setEditingAddressId(address.addressId);
    setShowAddressForm(true);
  };

  const handleCancelAddressForm = () => {
    setAddressErrors({});
    setAddressErrorMessage('');
    setSelectedAddressCityCode('');
    setSelectedAddressDistrictCode('');
    setSelectedAddressWardCode('');
    setAddressDistricts([]);
    setAddressWards([]);
    setShowAddressForm(false);
    setEditingAddressId(null);
  };

  const syncAddressFormLocation = useCallback(async (address: Pick<Address, 'city' | 'district' | 'ward'>) => {
    try {
      const resolved = await resolveVNLocationSelection(address, addressProvinces);
      setSelectedAddressCityCode(resolved.provinceCode);
      setAddressDistricts(resolved.districts);
      setSelectedAddressDistrictCode(resolved.districtCode);
      setAddressWards(resolved.wards);
      setSelectedAddressWardCode(resolved.wardCode);
    } catch (locationError) {
      console.error('[Profile] Failed to sync address form locations:', locationError);
    }
  }, [addressProvinces]);

  useEffect(() => {
    if (!showAddressForm || !addressForm.city || addressProvinces.length === 0) {
      return;
    }

    void syncAddressFormLocation(addressForm);
  }, [addressForm, addressProvinces, showAddressForm, syncAddressFormLocation]);

  const handleAddressProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setSelectedAddressCityCode(code);
    setSelectedAddressDistrictCode('');
    setSelectedAddressWardCode('');
    setAddressDistricts([]);
    setAddressWards([]);
    clearFieldError(setAddressErrors, 'city');
    clearFieldError(setAddressErrors, 'district');
    clearFieldError(setAddressErrors, 'ward');
    setAddressErrorMessage('');

    const province = addressProvinces.find((item) => item.code === code);
    setAddressForm((prev) => ({
      ...prev,
      city: province?.name || '',
      district: '',
      ward: '',
    }));

    if (code) {
      fetchVNDistricts(code)
        .then((data) => setAddressDistricts(data))
        .catch((err) => console.error('Failed to fetch profile districts:', err));
    }
  };

  const handleAddressDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setSelectedAddressDistrictCode(code);
    setSelectedAddressWardCode('');
    setAddressWards([]);
    clearFieldError(setAddressErrors, 'district');
    clearFieldError(setAddressErrors, 'ward');
    setAddressErrorMessage('');

    const district = addressDistricts.find((item) => item.code === code);
    setAddressForm((prev) => ({
      ...prev,
      district: district?.name || '',
      ward: '',
    }));

    if (code) {
      fetchVNWards(code)
        .then((data) => setAddressWards(data))
        .catch((err) => console.error('Failed to fetch profile wards:', err));
    }
  };

  const handleAddressWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setSelectedAddressWardCode(code);
    clearFieldError(setAddressErrors, 'ward');
    setAddressErrorMessage('');

    const ward = addressWards.find((item) => item.code === code);
    setAddressForm((prev) => ({
      ...prev,
      ward: ward?.name || '',
    }));
  };

  const handleSaveAddress = async () => {
    const province = addressProvinces.find((item) => item.code === selectedAddressCityCode);
    const district = addressDistricts.find((item) => item.code === selectedAddressDistrictCode);
    const ward = addressWards.find((item) => item.code === selectedAddressWardCode);
    const normalizedAddressForm = {
      ...addressForm,
      city: addressForm.city || province?.name || '',
      district: addressForm.district || district?.name || '',
      ward: addressForm.ward || ward?.name || '',
    };
    const parsed = profileAddressClientSchema.safeParse(normalizedAddressForm);

    if (!parsed.success) {
      const mappedErrors = localizeAddressErrors(mapZodFieldErrors(parsed.error));
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
      setAddressActionFeedback({
        type: 'success',
        message: editingAddressId ? t('addresses.messages.updated') : t('addresses.messages.created'),
      });
      handleCancelAddressForm();
    } catch (err: unknown) {
      if (err instanceof ZodError) {
        const mappedErrors = localizeAddressErrors(mapZodFieldErrors(err));
        setAddressErrors(mappedErrors);
        setAddressErrorMessage(firstFieldError(mappedErrors) || t('addresses.errors.saveFailed'));
        return;
      }

      const apiError = err as Error & { details?: Array<{ field?: string; message?: string }> };
      const mappedErrors = localizeAddressErrors(mapApiFieldErrors(apiError.details));
      if (Object.keys(mappedErrors).length > 0) setAddressErrors(mappedErrors);
      setAddressErrorMessage(apiError.message || firstFieldError(mappedErrors) || t('addresses.errors.saveFailed'));
    }
  };

  const handleDeleteAddress = async (addressId: number) => {
    if (!confirm(t('addresses.confirmDelete'))) return;

    try {
      await userService.deleteAddress(addressId);
      await loadProfileData();
      setAddressActionFeedback({ type: 'success', message: t('addresses.messages.deleted') });
    } catch (err: unknown) {
      setAddressActionFeedback({ type: 'error', message: err instanceof Error ? err.message : t('addresses.errors.deleteFailed') });
    }
  };

  const handleSetDefaultAddress = async (addressId: number) => {
    try {
      await userService.setDefaultAddress(addressId);
      await loadProfileData();
      setAddressActionFeedback({ type: 'success', message: t('addresses.messages.defaultSet') });
    } catch (err: unknown) {
      setAddressActionFeedback({ type: 'error', message: err instanceof Error ? err.message : t('addresses.errors.defaultFailed') });
    }
  };

  const handleSectionChange = useCallback((section: ProfileSection) => {
    if (section === 'personal') {
      openOverview();
      return;
    }

    openTab(section as Exclude<ProfileSection, 'personal'>);
  }, [openOverview, openTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-dark font-sans text-white">
        <Header />
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
            <div className={`${surfaceClassName} hidden animate-pulse p-6 lg:block`}>
              <div className="h-10 w-36 rounded-full bg-white/10" />
              <div className="mt-4 h-4 w-full rounded-full bg-white/5" />
              <div className="mt-2 h-4 w-4/5 rounded-full bg-white/5" />
              <div className="mt-8 space-y-3">
                <div className="h-12 rounded-2xl bg-white/5" />
                <div className="h-12 rounded-2xl bg-white/5" />
                <div className="h-12 rounded-2xl bg-white/5" />
              </div>
            </div>

            <div className="space-y-6">
              <div className={`${surfaceClassName} animate-pulse p-6 md:p-8`}>
                <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
                  <div className="flex flex-col items-center rounded-[24px] border border-white/10 bg-black/20 px-5 py-6">
                    <div className="h-32 w-32 rounded-full bg-white/10" />
                    <div className="mt-4 h-6 w-40 rounded-full bg-white/10" />
                    <div className="mt-3 h-4 w-28 rounded-full bg-white/5" />
                    <div className="mt-4 h-10 w-36 rounded-full bg-white/10" />
                  </div>
                  <div className="space-y-5">
                    <div className="h-8 w-52 rounded-full bg-white/10" />
                    <div className="h-4 w-full rounded-full bg-white/5" />
                    <div className="h-4 w-3/4 rounded-full bg-white/5" />
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="h-24 rounded-[24px] bg-white/5" />
                      <div className="h-24 rounded-[24px] bg-white/5" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className={`${mutedSurfaceClassName} h-28 animate-pulse bg-white/5`} />
                <div className={`${mutedSurfaceClassName} h-28 animate-pulse bg-white/5`} />
                <div className={`${mutedSurfaceClassName} h-28 animate-pulse bg-white/5`} />
              </div>

              <div className={`${surfaceClassName} animate-pulse p-6`}>
                <div className="h-12 w-full rounded-2xl bg-white/5" />
                <div className="mt-6 space-y-4">
                  <div className="h-28 rounded-[24px] bg-white/5" />
                  <div className="h-28 rounded-[24px] bg-white/5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-bg-dark font-sans text-white">
        <Header />
        <div className="mx-auto max-w-5xl px-6 pb-16 pt-28">
          <div className={`${surfaceClassName} overflow-hidden`}>
            <div className="border-b border-red-500/20 bg-red-500/10 px-6 py-4 text-red-200">
              <div className="flex items-center gap-3">
                <CircleAlert size={18} />
                <p className="text-sm font-semibold">{error || t('errors.loadProfile')}</p>
              </div>
            </div>
            <div className="px-6 py-8">
              <h1 className="text-3xl font-black">{t('hero.errorTitle')}</h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-white/65">{t('hero.errorHint')}</p>
              <button
                onClick={() => loadProfileData()}
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] transition-colors hover:border-primary/40 hover:text-primary"
              >
                <ChevronRight size={14} />
                {t('actions.retry')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0] ?? null;
  const showOverviewSection = activeSection === 'personal';
  const sidebarItems: Array<{ id: ProfileSection; icon: React.ComponentType<{ size?: number; className?: string }>; label: string }> = [
    { id: 'personal', icon: UserRound, label: t('sidebar.overview') },
    { id: 'orders', icon: Package, label: t('sidebar.orders') },
    { id: 'addresses', icon: MapPinned, label: t('sidebar.addresses') },
    { id: 'security', icon: LockKeyhole, label: t('sidebar.security') },
  ];
  const mobileItems: Array<{ id: ProfileSection; icon: React.ComponentType<{ size?: number; className?: string }>; label: string }> = [
    { id: 'personal', icon: UserRound, label: t('sidebar.overview') },
    { id: 'orders', icon: Package, label: t('sidebar.orders') },
    { id: 'addresses', icon: MapPinned, label: t('sidebar.addresses') },
    { id: 'security', icon: LockKeyhole, label: t('sidebar.security') },
  ];
  const orderFilters: Array<{ id: OrderFilter; label: string }> = [
    { id: 'all', label: t('filters.all') },
    { id: 'shipping', label: t('filters.shipping') },
    { id: 'delivered', label: t('filters.delivered') },
    { id: 'pending', label: t('filters.pending') },
  ];
  const filteredOrders = recentOrders.filter((order) => {
    const normalizedStatus = normalizeCustomerOrderStatus(order.status);
    if (orderFilter === 'all') return true;
    if (orderFilter === 'shipping') return normalizedStatus === ORDER_STATUS.SHIPPING;
    if (orderFilter === 'delivered') return normalizedStatus === ORDER_STATUS.DELIVERED;
    return normalizedStatus === ORDER_STATUS.PENDING;
  });
  const linkedProviderLabel = profile.googleId ? t('summary.googleLinked') : t('summary.googleUnlinked');
  const showAvatarImage = Boolean(profile.avatarUrl || avatarPreview) && !avatarLoadFailed;
  const showSavedAvatarAction = Boolean(profile.avatarUrl);
  const showFilteredOrdersEmpty = recentOrders.length > 0 && filteredOrders.length === 0;
  let avatarActionContent: React.ReactNode = null;
  if (avatarPreview) {
    avatarActionContent = (
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleUploadAvatar}
          disabled={uploadingAvatar}
          className={`${solidPrimaryButtonClassName} flex-1 rounded px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {uploadingAvatar ? t('avatar.actions.uploading') : t('avatar.actions.save')}
        </button>
        <button
          onClick={() => {
            setAvatarPreview(null);
            setAvatarFeedback(null);
          }}
          className={`${subtleButtonClassName} rounded px-5 py-3`}
        >
          {t('common.cancel')}
        </button>
      </div>
    );
  } else if (showSavedAvatarAction) {
    avatarActionContent = (
      <button
        onClick={handleDeleteAvatar}
        className="w-fit text-xs font-bold uppercase tracking-widest text-red-300 transition-colors hover:text-red-200"
      >
        {t('avatar.actions.remove')}
      </button>
    );
  }

  let recentOrdersContent: React.ReactNode;
  if (recentOrders.length === 0) {
    recentOrdersContent = (
      <div className="rounded-sm border border-white/5 bg-black/20 p-10 text-center">
        <Package size={26} className="mx-auto text-white/45" />
        <h3 className="mt-4 text-xl font-bold">{t('recentOrders.empty')}</h3>
        <p className="mt-2 text-sm leading-7 text-white/58">{t('recentOrders.emptyHint')}</p>
        <button onClick={() => navigate('/collection')} className={`mt-5 ${solidPrimaryButtonClassName} rounded px-5 py-3`}>
          {t('recentOrders.actions.startShopping')}
        </button>
      </div>
    );
  } else if (showFilteredOrdersEmpty) {
    recentOrdersContent = (
      <div className="rounded-sm border border-white/5 bg-black/20 p-10 text-center">
        <Package size={26} className="mx-auto text-white/45" />
        <h3 className="mt-4 text-xl font-bold">{t('recentOrders.filteredEmpty')}</h3>
        <p className="mt-2 text-sm leading-7 text-white/58">{t('recentOrders.filteredEmptyHint')}</p>
      </div>
    );
  } else {
    recentOrdersContent = (
      <div className="space-y-3">
        {filteredOrders.map((order) => {
          const statusMeta = getCustomerOrderStatusMeta(order.status);

          return (
            <div
              key={order.orderId}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/orders/${order.orderId}`)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  navigate(`/orders/${order.orderId}`);
                }
              }}
              className="flex cursor-pointer flex-col gap-4 rounded-sm border border-white/10 bg-black/20 p-5 transition-colors hover:border-white/20 hover:bg-black/25 md:flex-row md:items-center"
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-sm text-white">#{order.orderNumber}</span>
                  <span className="text-[10px] uppercase tracking-widest text-white/40">{formatShortDate(order.createdAt)}</span>
                  <span
                    className={`inline-flex rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${
                      statusMeta ? `${statusMeta.badgeClass} ${statusMeta.textClass}` : 'border-white/10 text-white/70'
                    }`}
                  >
                    {statusMeta?.label || order.status || t('states.unknown')}
                  </span>
                </div>
                <div className="mt-3 text-sm text-white/70">
                  <span className="text-white/50">{t('recentOrders.totalLabel')}:</span>{' '}
                  <span className="font-semibold text-white">{formatCurrencyVND(Number(order.totalAmount ?? 0))}</span>
                </div>
                <div className="mt-2 text-xs text-white/40">
                  {t('recentOrders.orderNumber', { orderNumber: order.orderNumber })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(`/orders/${order.orderId}`);
                  }}
                  className="border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/10"
                >
                  {t('recentOrders.actions.viewDetail')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-dark font-sans text-white">
      <Header />
      <div className="w-full px-6 pb-12 pt-32 xl:px-12 2xl:px-20">
        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="hidden lg:block lg:sticky lg:top-28 lg:self-start">
            <div className={`${surfaceClassName} p-6`}>
              <h1 className="whitespace-nowrap text-[2.35rem] font-black leading-none tracking-tight xl:text-[2.05rem]">{t('sidebar.title')}</h1>
              <div className="mt-6 border-t border-white/10 pt-3">
                {sidebarItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSectionChange(item.id)}
                      className={`flex w-full items-center gap-3 border-l-4 px-3 py-4 text-left text-base transition-colors ${
                        isActive
                          ? 'border-primary bg-primary/10 font-bold text-primary'
                          : 'border-transparent text-white/72 hover:border-white/10 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon size={18} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 border-t border-white/10 pt-6">
                <button onClick={handleLogout} className="flex items-center gap-3 text-base font-semibold text-red-400 transition-colors hover:text-red-300">
                  <LogOut size={18} />
                  {t('actions.signOut')}
                </button>
              </div>
            </div>
          </aside>

          <main className="space-y-6">
            <nav className={`${surfaceClassName} overflow-x-auto border border-white/5 p-3 md:hidden`}>
              <div className="flex min-w-max gap-3">
                {mobileItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;

                  return (
                    <button
                      key={`${item.id}-mobile`}
                      onClick={() => handleSectionChange(item.id)}
                      className={`inline-flex items-center gap-2 rounded px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                        isActive
                          ? 'bg-primary/15 text-primary border border-primary/30'
                          : 'border border-white/10 bg-transparent text-white/60 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon size={14} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </nav>

            {showOverviewSection && (
            <section id="profile-overview" className={`${surfaceClassName} overflow-hidden`}>
              <div className="grid gap-0 xl:grid-cols-[280px_minmax(0,1fr)]">
                <div className="border-b border-white/10 bg-surface-dark px-6 py-8 xl:border-b-0 xl:border-r xl:px-8">
                  <div className="flex h-full flex-col gap-6">
                    <div className="flex items-center justify-between gap-3">
                      <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                        <BadgeCheck size={12} />
                        {t('summary.accountTitle')}
                      </div>
                    </div>

                    <div className={`${luxeCardClassName} px-6 py-8 text-center before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.14),transparent)] before:content-['']`}>
                      <div className="relative z-[1] mx-auto w-fit">
                        {showAvatarImage ? (
                          <img
                            src={avatarPreview || getImageUrl(profile.avatarUrl)}
                            alt={t('avatar.alt')}
                            referrerPolicy="no-referrer"
                            onError={() => setAvatarLoadFailed(true)}
                            className="h-32 w-32 rounded-full border border-white/10 object-cover shadow-[0_18px_36px_rgba(0,0,0,0.32)]"
                          />
                        ) : (
                          <div className="flex h-32 w-32 items-center justify-center rounded-full border border-primary/15 bg-[radial-gradient(circle_at_top,rgba(255,59,48,0.35),rgba(255,59,48,0.12))] text-[2.6rem] font-black text-primary shadow-[0_18px_36px_rgba(0,0,0,0.32)]">
                            {getInitial(profile.fullName)}
                          </div>
                        )}
                        <label className="absolute bottom-2 right-1 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-bg-dark text-white transition-colors hover:border-primary/40 hover:text-primary">
                          <input type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
                          <Camera size={16} />
                        </label>
                      </div>

                      <div className="relative z-[1] mt-6">
                        <p className="text-xl font-black tracking-[-0.04em] xl:text-[1.85rem]">{profile.fullName}</p>
                        <p className="mt-3 text-sm leading-7 text-white/55">{t('labels.memberSince', { date: formatMemberSince(profile.createdAt) })}</p>
                      </div>
                    </div>

                    {avatarActionContent}

                    <button
                      type="button"
                      onClick={() => navigate('/my-orders')}
                      className={`${profileDetailCardClassName} group w-full items-center justify-center text-center`}
                    >
                      <div className="flex items-center justify-center">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-primary/20 bg-primary/10 text-primary">
                          <Package size={17} />
                        </div>
                      </div>
                      <div>
                        <p className={`mt-6 ${profileDetailLabelClassName}`}>{t('stats.orders')}</p>
                        <p className="mt-3 text-[2.25rem] font-black leading-none tracking-[-0.05em] text-primary">{recentOrders.length}</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="space-y-6 px-6 py-8 xl:px-8">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="max-w-4xl">
                      <h2 className="text-[2.4rem] font-black leading-none tracking-[-0.05em] md:text-[3.2rem]">{profile.fullName}</h2>
                    </div>
                    <button
                      onClick={() => {
                        setIsEditingProfile((prev) => !prev);
                        setProfileFeedback(null);
                      }}
                      className="rounded-sm border border-white/10 bg-white/5 px-6 py-3 text-xs font-bold uppercase tracking-widest text-white/75 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white xl:min-w-[220px]"
                    >
                      {isEditingProfile ? t('common.cancel') : t('actions.editInfo')}
                    </button>
                  </div>

                  <div className={`${luxeCardClassName} p-5 md:p-6`}>
                    <div className="space-y-4 rounded-sm border border-white/10 bg-black/20 p-5 md:p-6">
                      <div className="flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                        <span>{t('labels.profileCompleteness')}</span>
                        <span className="text-white/70">{profile.completeness}%</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${profile.completeness}%` }} />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                          <CheckCircle2 size={12} />
                          {t('summary.completeness', { value: profile.completeness })}
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
                          <Link2 size={12} />
                          {linkedProviderLabel}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-12">
                    <button type="button" onClick={handleCopyEmail} className={`${profileDetailCardClassName} xl:col-span-8`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className={profileDetailLabelClassName}>{t('details.email')}</p>
                        <Mail size={17} className="text-white/30" />
                      </div>
                      <div>
                        <p className="mt-5 overflow-hidden text-ellipsis whitespace-nowrap text-[1.15rem] font-bold leading-tight tracking-[-0.03em] text-white md:text-[1.45rem]">{profile.email}</p>
                        <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/35">{t('actions.copyEmail')}</p>
                      </div>
                    </button>
                    <div className={`${profileDetailCardClassName} xl:col-span-4`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className={profileDetailLabelClassName}>{t('details.status')}</p>
                        <ShieldCheck size={17} className="text-white/30" />
                      </div>
                      <p className={profileDetailValueClassName}>{profile.status}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!profile.phone) setIsEditingProfile(true);
                      }}
                      className={`${profileDetailCardClassName} xl:col-span-6`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className={profileDetailLabelClassName}>{t('details.phone')}</p>
                        <Phone size={17} className="text-white/30" />
                      </div>
                      <div>
                        <p className={`${profileDetailValueClassName} whitespace-nowrap text-[1.2rem] md:text-[1.35rem]`}>{profile.phone || t('states.notProvided')}</p>
                        {!profile.phone && <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-primary">{t('actions.addPhone')}</p>}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => openTab('security')}
                      className={`${profileDetailCardClassName} xl:col-span-6`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className={profileDetailLabelClassName}>{t('details.provider')}</p>
                        <Link2 size={17} className="text-white/30" />
                      </div>
                      <p className={profileDetailValueClassName}>{linkedProviderLabel}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => openTab('addresses')}
                      className={`${profileDetailCardClassName} xl:col-span-12`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className={profileDetailLabelClassName}>{t('sidebar.addresses')}</p>
                        <MapPinned size={17} className="text-white/30" />
                      </div>
                      <div>
                        {defaultAddress ? (
                          <>
                            <p className="mt-5 text-lg font-bold leading-tight tracking-[-0.03em] text-white">{defaultAddress.recipientName}</p>
                            <p className="mt-2 text-sm leading-7 text-white/60">{formatAddressLine(defaultAddress)}</p>
                          </>
                        ) : (
                          <>
                            <p className="mt-5 text-[1.2rem] font-bold leading-tight tracking-[-0.03em] text-white">{t('addresses.empty')}</p>
                            <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-primary">{t('addresses.actions.addNew')}</p>
                          </>
                        )}
                      </div>
                    </button>
                  </div>

                  {isEditingProfile && (
                    <div className="rounded-sm border border-white/10 bg-black/20 p-5">
                      <div className="mb-5">
                        <h4 className="text-lg font-bold">{t('forms.personalTitle')}</h4>
                        <p className="mt-2 text-sm leading-6 text-white/58">{t('forms.personalHint')}</p>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-white/45">{t('fields.fullName')}</label>
                          <input
                            type="text"
                            value={profileForm.fullName}
                            onChange={(e) => {
                              setProfileForm({ ...profileForm, fullName: e.target.value });
                              clearFieldError(setProfileErrors, 'fullName');
                              setProfileErrorMessage('');
                              setProfileFeedback(null);
                            }}
                            className={`${inputClassName} ${profileErrors.fullName ? errorInputBorderClassName : defaultInputBorderClassName}`}
                          />
                          {profileErrors.fullName && <p className={fieldErrorClassName}>{profileErrors.fullName}</p>}
                        </div>
                        <div>
                          <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-white/45">{t('fields.phone')}</label>
                          <input
                            type="tel"
                            value={profileForm.phone}
                            onChange={(e) => {
                              setProfileForm({ ...profileForm, phone: e.target.value });
                              clearFieldError(setProfileErrors, 'phone');
                              setProfileErrorMessage('');
                              setProfileFeedback(null);
                            }}
                            className={`${inputClassName} ${profileErrors.phone ? errorInputBorderClassName : defaultInputBorderClassName}`}
                          />
                          {profileErrors.phone && <p className={fieldErrorClassName}>{profileErrors.phone}</p>}
                        </div>
                      </div>
                      {profileErrorMessage && <div className={`mt-4 ${formErrorClassName}`}>{profileErrorMessage}</div>}
                      <div className="mt-6 flex flex-wrap gap-3">
                        <button onClick={handleSaveProfile} className={`${solidPrimaryButtonClassName} rounded px-5 py-3`}>{t('actions.saveChanges')}</button>
                        <button onClick={handleCancelEditProfile} className={`${subtleButtonClassName} rounded px-5 py-3`}>{t('common.cancel')}</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
            )}

            {activeSection === 'addresses' && (
            <section id="profile-content" className={`${surfaceClassName} overflow-hidden p-6`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black">{t('sections.addresses', { count: addresses.length })}</h2>
                </div>
                {!showAddressForm && (
                  <button
                    onClick={() => {
                      handleAddAddress();
                      setAddressActionFeedback(null);
                      openTab('addresses');
                    }}
                    className={`${subtleButtonClassName} inline-flex items-center gap-2 rounded px-4 py-3`}
                  >
                    <Plus size={14} />
                    {t('addresses.actions.addNew')}
                  </button>
                )}
              </div>

              {showAddressForm && (
                <div className="mt-6 rounded-sm border border-white/10 bg-black/20 p-5">
                  <h3 className="text-lg font-bold">{editingAddressId ? t('addresses.actions.edit') : t('addresses.actions.addNew')}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/58">{t('addresses.formHint')}</p>
                  {addressErrorMessage && <div className={`mt-4 ${formErrorClassName}`}>{addressErrorMessage}</div>}
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className={formFieldLabelClassName}>{t('addresses.fields.recipientName')}</label>
                      <input type="text" value={addressForm.recipientName} onChange={(e) => {
                        setAddressForm({ ...addressForm, recipientName: e.target.value });
                        clearFieldError(setAddressErrors, 'recipientName');
                        setAddressErrorMessage('');
                      }} className={`${inputClassName} ${addressErrors.recipientName ? errorInputBorderClassName : defaultInputBorderClassName}`} />
                      {addressErrors.recipientName && <p className={fieldErrorClassName}>{addressErrors.recipientName}</p>}
                    </div>
                    <div>
                      <label className={formFieldLabelClassName}>{t('addresses.fields.phone')}</label>
                      <input type="tel" value={addressForm.phone} onChange={(e) => {
                        setAddressForm({ ...addressForm, phone: e.target.value });
                        clearFieldError(setAddressErrors, 'phone');
                        setAddressErrorMessage('');
                      }} className={`${inputClassName} ${addressErrors.phone ? errorInputBorderClassName : defaultInputBorderClassName}`} />
                      {addressErrors.phone && <p className={fieldErrorClassName}>{addressErrors.phone}</p>}
                    </div>
                    <div className="md:col-span-2">
                      <label className={formFieldLabelClassName}>{t('addresses.fields.addressLine')}</label>
                      <input type="text" value={addressForm.addressLine} onChange={(e) => {
                        setAddressForm({ ...addressForm, addressLine: e.target.value });
                        clearFieldError(setAddressErrors, 'addressLine');
                        setAddressErrorMessage('');
                      }} className={`${inputClassName} ${addressErrors.addressLine ? errorInputBorderClassName : defaultInputBorderClassName}`} />
                      {addressErrors.addressLine && <p className={fieldErrorClassName}>{addressErrors.addressLine}</p>}
                    </div>
                    <div>
                      <label className={formFieldLabelClassName}>{t('addresses.fields.city')}</label>
                      <select
                        value={selectedAddressCityCode}
                        onChange={handleAddressProvinceChange}
                        className={`${selectClassName} cursor-pointer ${addressErrors.city ? 'border-red-500 focus:border-red-400' : ''}`}
                        style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .9rem top 50%', backgroundSize: '.65rem auto' }}
                      >
                        <option value="">{t('addresses.placeholders.selectCity')}</option>
                        {addressProvinces.map((province) => (
                          <option key={province.code} value={province.code}>{province.name}</option>
                        ))}
                      </select>
                      {addressErrors.city && <p className={fieldErrorClassName}>{addressErrors.city}</p>}
                    </div>
                    <div>
                      <label className={formFieldLabelClassName}>{t('addresses.fields.district')}</label>
                      <select
                        value={selectedAddressDistrictCode}
                        onChange={handleAddressDistrictChange}
                        disabled={!selectedAddressCityCode}
                        className={`${selectClassName} ${!selectedAddressCityCode ? 'cursor-not-allowed text-gray-500 opacity-50' : 'cursor-pointer'} ${addressErrors.district ? 'border-red-500 focus:border-red-400' : ''}`}
                        style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .9rem top 50%', backgroundSize: '.65rem auto' }}
                      >
                        <option value="">{t('addresses.placeholders.selectDistrict')}</option>
                        {addressDistricts.map((district) => (
                          <option key={district.code} value={district.code}>{district.name}</option>
                        ))}
                      </select>
                      {addressErrors.district && <p className={fieldErrorClassName}>{addressErrors.district}</p>}
                    </div>
                    <div className="md:col-span-2">
                      <label className={formFieldLabelClassName}>{t('addresses.fields.ward')}</label>
                      <select
                        value={selectedAddressWardCode}
                        onChange={handleAddressWardChange}
                        disabled={!selectedAddressDistrictCode}
                        className={`${selectClassName} ${!selectedAddressDistrictCode ? 'cursor-not-allowed text-gray-500 opacity-50' : 'cursor-pointer'} ${addressErrors.ward ? 'border-red-500 focus:border-red-400' : ''}`}
                        style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .9rem top 50%', backgroundSize: '.65rem auto' }}
                      >
                        <option value="">{t('addresses.placeholders.selectWard')}</option>
                        {addressWards.map((ward) => (
                          <option key={ward.code} value={ward.code}>{ward.name}</option>
                        ))}
                      </select>
                      {addressErrors.ward && <p className={fieldErrorClassName}>{addressErrors.ward}</p>}
                    </div>
                  </div>
                  <label className="mt-5 flex items-start gap-3 rounded border border-white/10 bg-bg-dark px-4 py-4 text-sm text-white/75">
                    <input type="checkbox" checked={addressForm.isDefault} onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })} className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-primary focus:ring-primary" />
                    <span>
                      <span className="block font-semibold text-white">{t('addresses.actions.setDefault')}</span>
                      <span className="mt-1 block text-xs leading-6 text-white/55">{t('addresses.defaultHint')}</span>
                    </span>
                  </label>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button onClick={handleSaveAddress} className={`${solidPrimaryButtonClassName} rounded px-5 py-3`}>{t('addresses.actions.save')}</button>
                    <button onClick={handleCancelAddressForm} className={`${subtleButtonClassName} rounded px-5 py-3`}>{t('common.cancel')}</button>
                  </div>
                </div>
              )}

              <div className="mt-6 space-y-4">
                {addresses.length === 0 ? (
                  <div className={`${mutedSurfaceClassName} p-6 text-center`}>
                    <MapPinned size={26} className="mx-auto text-white/45" />
                    <h3 className="text-xl font-bold">{t('addresses.empty')}</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-white/58">{t('addresses.emptyHint')}</p>
                    {!showAddressForm && (
                      <button
                        onClick={() => {
                          handleAddAddress();
                          openTab('addresses');
                        }}
                        className={`mt-5 ${solidPrimaryButtonClassName} rounded px-5 py-3`}
                      >
                        {t('addresses.actions.add')}
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {defaultAddress && (
                      <div className="rounded-sm border border-primary/20 bg-primary/10 p-6">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div>
                            <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary">{t('addresses.labels.default')}</span>
                            <h3 className="mt-4 text-2xl font-black">{defaultAddress.recipientName}</h3>
                            <p className="mt-2 text-sm text-white/60">{defaultAddress.phone}</p>
                            <p className="mt-3 text-sm leading-7 text-white/70">{formatAddressLine(defaultAddress)}</p>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <button onClick={() => handleEditAddress(defaultAddress)} className={`${subtleButtonClassName} rounded px-4 py-2 text-[11px]`}>{t('actions.edit')}</button>
                            <button onClick={() => handleDeleteAddress(defaultAddress.addressId)} className="rounded border border-red-500/20 bg-red-500/10 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-red-300 transition-colors hover:border-red-500/40 hover:text-red-200">{t('actions.delete')}</button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                      {addresses.filter((address) => !defaultAddress || address.addressId !== defaultAddress.addressId).map((address) => (
                        <div key={address.addressId} className={`${elevatedCardClassName} p-5`}>
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-lg font-bold">{address.recipientName}</h3>
                              <p className="mt-1 text-sm text-white/58">{address.phone}</p>
                            </div>
                            {!address.isDefault && (
                              <button onClick={() => handleSetDefaultAddress(address.addressId)} className={`${subtleButtonClassName} rounded px-3 py-1 text-[10px]`}>{t('addresses.actions.setDefault')}</button>
                            )}
                          </div>
                          <p className="mt-4 text-sm leading-7 text-white/65">{formatAddressLine(address)}</p>
                          <div className="mt-5 flex flex-wrap gap-3">
                            <button onClick={() => handleEditAddress(address)} className={`${subtleButtonClassName} rounded px-4 py-2 text-[11px]`}>{t('actions.edit')}</button>
                            <button onClick={() => handleDeleteAddress(address.addressId)} className="rounded border border-red-500/20 bg-red-500/10 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-red-300 transition-colors hover:border-red-500/40 hover:text-red-200">{t('actions.delete')}</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </section>
            )}

            {activeSection === 'orders' && (
            <section id="profile-content" className={`${surfaceClassName} overflow-hidden p-6`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black">{t('sections.recentOrders')}</h2>
                </div>
                <button onClick={() => navigate('/my-orders')} className="inline-flex items-center gap-2 rounded-sm border border-white/10 bg-white/5 px-5 py-3 text-xs font-bold uppercase tracking-widest text-white/75 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white">
                  {t('recentOrders.actions.viewAll')}
                  <ChevronRight size={14} />
                </button>
              </div>
              <div className="mt-6 overflow-hidden rounded-sm border border-white/5 bg-surface-dark">
                <div className="flex gap-2 overflow-x-auto border-b border-white/10 px-6 py-4">
                  {orderFilters.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setOrderFilter(filter.id)}
                      className={`whitespace-nowrap rounded border px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
                        orderFilter === filter.id
                          ? 'border-primary/30 bg-primary/15 text-primary'
                          : 'border-white/10 bg-transparent text-white/50 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                  <div className="flex-1" />
                  <button
                    onClick={() => setOrderFilter('all')}
                    className="rounded border border-white/10 px-3 py-2 text-xs font-bold uppercase tracking-widest text-white/60 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    {t('common.refresh')}
                  </button>
                </div>

                <div className="p-6">
                  {recentOrdersContent}
                </div>
              </div>
            </section>
            )}

            {activeSection === 'security' && (
            <section id="profile-content" className={`${surfaceClassName} overflow-hidden p-6`}>
              <h2 className="text-2xl font-black">{t('sidebar.security')}</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className={`${elevatedCardClassName} p-5`}>
                  <p className="text-lg font-bold">{t('security.passwordTitle')}</p>
                  <button
                    onClick={() => navigate('/forgot-password')}
                    className={`mt-5 ${subtleButtonClassName} rounded px-4 py-2 text-[11px]`}
                  >
                    {t('security.passwordAction')}
                  </button>
                </div>
                <div className={`${elevatedCardClassName} p-5`}>
                  <p className="text-lg font-bold">{t('security.loginMethodsTitle')}</p>
                  <div className="mt-5 inline-flex rounded border border-primary/30 bg-primary/15 px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary">
                    {linkedProviderLabel}
                  </div>
                </div>
                <div className={`${elevatedCardClassName} p-5`}>
                  <p className="text-lg font-bold">{t('security.twoFactorTitle')}</p>
                  <div className="mt-5 inline-flex rounded border border-white/10 bg-bg-dark px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/70">
                    {t('security.optional')}
                  </div>
                </div>
                <div className={`${mutedSurfaceClassName} p-5 transition-colors hover:border-red-400/30`}>
                  <p className="text-lg font-bold">{t('security.signOutTitle')}</p>
                  <button
                    onClick={handleLogout}
                    className="mt-5 rounded border border-red-500/20 bg-red-500/10 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-red-300 transition-colors hover:border-red-500/40 hover:text-red-200"
                  >
                    {t('actions.signOut')}
                  </button>
                </div>
              </div>
            </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
