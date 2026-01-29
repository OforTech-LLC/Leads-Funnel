'use client';

import { useEffect, useState } from 'react';
import {
  useProfile,
  useOrg,
  useUpdateSettings,
  useUpdateProfile,
  useUpdateOrg,
  useServicePreferences,
  useUpdateServicePreferences,
  useGranularNotifications,
  useUpdateGranularNotifications,
  useAvatarUpload,
} from '@/lib/queries/profile';
import { logout } from '@/lib/auth';
import { MetricCardSkeleton } from '@/components/LoadingSpinner';
import { toast } from '@/lib/toast';
import { VALIDATION, ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/lib/constants';
import type { BusinessHours, BusinessHoursDay, GranularNotificationPreferences } from '@/lib/types';

// ── Constants ────────────────────────────────

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
  { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
];

const SERVICE_CATEGORIES = [
  'Plumbing',
  'Electrical',
  'HVAC',
  'Roofing',
  'Landscaping',
  'Painting',
  'Cleaning',
  'Pest Control',
  'Home Security',
  'Windows & Doors',
  'Flooring',
  'General Contractor',
];

const DEFAULT_HOURS: BusinessHoursDay = { enabled: true, start: '09:00', end: '17:00' };

const NOTIFICATION_EVENTS = [
  { key: 'newLead', label: 'New lead received', channels: ['Email', 'Sms', 'Push'] as const },
  {
    key: 'statusChange',
    label: 'Lead status changed',
    channels: ['Email', 'Sms', 'Push'] as const,
  },
  { key: 'teamActivity', label: 'Team activity', channels: ['Email', 'Sms', 'Push'] as const },
  { key: 'weeklyDigest', label: 'Weekly digest', channels: ['Email'] as const },
];

const PROFILE_FIELD_LABELS: Record<string, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  phone: 'Phone number',
  avatarUrl: 'Profile photo',
};

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// ── Toggle component ─────────────────────────

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 min-w-[48px] ${
        checked ? 'bg-brand-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

// ── Main settings page ───────────────────────

export default function SettingsPage() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: org, isLoading: orgLoading } = useOrg(profile?.primaryOrgId || '');
  const updateSettings = useUpdateSettings();
  const updateProfile = useUpdateProfile();
  const updateOrg = useUpdateOrg();
  const { data: servicePrefs } = useServicePreferences();
  const updateServicePrefs = useUpdateServicePreferences();
  const { data: granularNotifs } = useGranularNotifications();
  const updateGranularNotifs = useUpdateGranularNotifications();
  const avatarUpload = useAvatarUpload();

  // Profile editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [nameErrors, setNameErrors] = useState<{ firstName?: string; lastName?: string }>({});
  const [editPhone, setEditPhone] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('');
  const [avatarUploadError, setAvatarUploadError] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [detailErrors, setDetailErrors] = useState<{ phone?: string; avatarUrl?: string }>({});

  // Org editing state
  const [isEditingOrg, setIsEditingOrg] = useState(false);
  const [editOrgName, setEditOrgName] = useState('');
  const [orgNameError, setOrgNameError] = useState('');

  // ZIP code input state
  const [zipInput, setZipInput] = useState('');
  const [zipError, setZipError] = useState('');

  // Business hours state
  const [localBusinessHours, setLocalBusinessHours] = useState<BusinessHours | null>(null);

  const businessHours = localBusinessHours ?? servicePrefs?.businessHours ?? {};
  const selectedCategories = servicePrefs?.categories ?? [];
  const zipCodes = servicePrefs?.zipCodes ?? [];
  const profileCompleteness = profile?.profileCompleteness;
  const missingProfileLabels = profileCompleteness?.missingFields
    ? profileCompleteness.missingFields.map((field) => PROFILE_FIELD_LABELS[field] || field)
    : [];

  useEffect(() => {
    if (!profile) return;
    setEditPhone(profile.phone || '');
    setAvatarFile(null);
    setAvatarPreviewUrl('');
    setAvatarUploadError('');
  }, [profile?.phone, profile?.avatarUrl]);

  useEffect(() => {
    if (!avatarPreviewUrl) return;
    return () => {
      URL.revokeObjectURL(avatarPreviewUrl);
    };
  }, [avatarPreviewUrl]);

  // ── Profile handlers ─────────────

  function startEditingName() {
    if (!profile) return;
    setEditFirstName(profile.firstName);
    setEditLastName(profile.lastName);
    setNameErrors({});
    setIsEditingName(true);
  }

  function cancelEditName() {
    setIsEditingName(false);
    setNameErrors({});
  }

  function validateProfileName(): boolean {
    const errors: { firstName?: string; lastName?: string } = {};
    const trimFirst = editFirstName.trim();
    const trimLast = editLastName.trim();

    if (!trimFirst) {
      errors.firstName = ERROR_MESSAGES.FIRST_NAME_REQUIRED;
    } else if (trimFirst.length < VALIDATION.MIN_NAME_LENGTH) {
      errors.firstName = ERROR_MESSAGES.NAME_TOO_SHORT;
    }

    if (!trimLast) {
      errors.lastName = ERROR_MESSAGES.LAST_NAME_REQUIRED;
    } else if (trimLast.length < VALIDATION.MIN_NAME_LENGTH) {
      errors.lastName = ERROR_MESSAGES.NAME_TOO_SHORT;
    }

    setNameErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function saveProfileName() {
    if (!validateProfileName()) return;

    const trimFirst = editFirstName.trim();
    const trimLast = editLastName.trim();

    updateProfile.mutate(
      { firstName: trimFirst, lastName: trimLast },
      {
        onSuccess: () => {
          toast.success(SUCCESS_MESSAGES.PROFILE_UPDATED);
          setIsEditingName(false);
          setNameErrors({});
        },
        onError: () => toast.error(ERROR_MESSAGES.PROFILE_UPDATE_FAILED),
      }
    );
  }

  function handleAvatarFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setAvatarUploadError('');

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setDetailErrors((prev) => ({
        ...prev,
        avatarUrl: 'Avatar must be a JPG, PNG, or WebP image',
      }));
      setAvatarFile(null);
      setAvatarPreviewUrl('');
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setDetailErrors((prev) => ({
        ...prev,
        avatarUrl: 'Avatar must be 2MB or smaller',
      }));
      setAvatarFile(null);
      setAvatarPreviewUrl('');
      return;
    }

    setDetailErrors((prev) => ({ ...prev, avatarUrl: undefined }));
    setAvatarFile(file);
    setAvatarPreviewUrl(URL.createObjectURL(file));
  }

  function validateProfileDetails(): boolean {
    const errors: { phone?: string; avatarUrl?: string } = {};
    const phone = editPhone.trim();

    if (phone.length > 40) {
      errors.phone = 'Phone number is too long';
    } else if (phone) {
      const digits = phone.replace(/\D/g, '');
      if (digits.length < 7) {
        errors.phone = 'Phone number looks too short';
      }
    }

    setDetailErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function saveProfileDetails() {
    if (!profile) return;
    if (!validateProfileDetails()) return;

    const phone = editPhone.trim();
    let avatarUrl: string | undefined;

    if (avatarFile) {
      setIsUploadingAvatar(true);
      setAvatarUploadError('');

      try {
        const upload = await avatarUpload.mutateAsync({
          contentType: avatarFile.type,
          contentLength: avatarFile.size,
        });

        const headers = {
          ...(upload.headers || {}),
          'Content-Type': avatarFile.type,
        };

        const response = await fetch(upload.uploadUrl, {
          method: 'PUT',
          headers,
          body: avatarFile,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        avatarUrl = upload.publicUrl;
        setAvatarFile(null);
        setAvatarPreviewUrl('');
      } catch {
        setAvatarUploadError('Failed to upload profile photo. Please try again.');
        setIsUploadingAvatar(false);
        return;
      } finally {
        setIsUploadingAvatar(false);
      }
    }

    updateProfile.mutate(
      { phone, ...(avatarUrl ? { avatarUrl } : {}) },
      {
        onSuccess: () => {
          toast.success(SUCCESS_MESSAGES.PROFILE_UPDATED);
          setDetailErrors({});
        },
        onError: () => toast.error(ERROR_MESSAGES.PROFILE_UPDATE_FAILED),
      }
    );
  }

  // ── Org handlers ─────────────────

  function startEditingOrg() {
    if (!org) return;
    setEditOrgName(org.name);
    setOrgNameError('');
    setIsEditingOrg(true);
  }

  function saveOrgName() {
    const trimmed = editOrgName.trim();
    if (!trimmed) {
      setOrgNameError('Organization name is required');
      return;
    }
    if (trimmed.length < VALIDATION.MIN_NAME_LENGTH) {
      setOrgNameError(ERROR_MESSAGES.NAME_TOO_SHORT);
      return;
    }
    if (!profile?.primaryOrgId) return;

    setOrgNameError('');
    updateOrg.mutate(
      { orgId: profile.primaryOrgId, name: trimmed },
      {
        onSuccess: () => {
          toast.success(SUCCESS_MESSAGES.ORG_NAME_UPDATED);
          setIsEditingOrg(false);
        },
        onError: () => toast.error(ERROR_MESSAGES.ORG_UPDATE_FAILED),
      }
    );
  }

  // ── Notification handlers ────────

  function handleToggleEmail() {
    if (!profile) return;
    updateSettings.mutate(
      {
        emailNotifications: !profile.notificationPreferences.emailNotifications,
        smsNotifications: profile.notificationPreferences.smsNotifications,
      },
      { onSuccess: () => toast.success(SUCCESS_MESSAGES.NOTIFICATION_PREFS_SAVED) }
    );
  }

  function handleToggleSms() {
    if (!profile) return;
    updateSettings.mutate(
      {
        emailNotifications: profile.notificationPreferences.emailNotifications,
        smsNotifications: !profile.notificationPreferences.smsNotifications,
      },
      { onSuccess: () => toast.success(SUCCESS_MESSAGES.NOTIFICATION_PREFS_SAVED) }
    );
  }

  function handleGranularToggle(key: keyof GranularNotificationPreferences) {
    if (!granularNotifs) return;
    updateGranularNotifs.mutate({ [key]: !granularNotifs[key] });
  }

  // ── Service category handlers ────

  function toggleCategory(category: string) {
    const next = selectedCategories.includes(category)
      ? selectedCategories.filter((c) => c !== category)
      : [...selectedCategories, category];
    updateServicePrefs.mutate(
      { categories: next },
      { onSuccess: () => toast.success(SUCCESS_MESSAGES.SERVICE_PREFS_SAVED) }
    );
  }

  // ── ZIP code handlers ────────────

  function addZipCode() {
    const trimmed = zipInput.trim();
    if (!trimmed || zipCodes.includes(trimmed)) {
      setZipInput('');
      setZipError('');
      return;
    }
    if (!VALIDATION.ZIP_REGEX.test(trimmed)) {
      setZipError(ERROR_MESSAGES.ZIP_INVALID);
      return;
    }
    setZipError('');
    const next = [...zipCodes, trimmed];
    updateServicePrefs.mutate(
      { zipCodes: next },
      { onSuccess: () => toast.success(SUCCESS_MESSAGES.COVERAGE_ADDED) }
    );
    setZipInput('');
  }

  function removeZipCode(zip: string) {
    const next = zipCodes.filter((z) => z !== zip);
    updateServicePrefs.mutate({ zipCodes: next });
  }

  function handleZipKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addZipCode();
    }
  }

  // ── Business hours handlers ──────

  function toggleDayEnabled(dayKey: string) {
    const current = businessHours[dayKey] ?? DEFAULT_HOURS;
    const next = { ...businessHours, [dayKey]: { ...current, enabled: !current.enabled } };
    setLocalBusinessHours(next);
  }

  function setDayTime(dayKey: string, field: 'start' | 'end', value: string) {
    const current = businessHours[dayKey] ?? DEFAULT_HOURS;
    const next = { ...businessHours, [dayKey]: { ...current, [field]: value } };
    setLocalBusinessHours(next);
  }

  function copyToAllDays() {
    const firstEnabled = DAYS_OF_WEEK.find((d) => businessHours[d.key]?.enabled);
    if (!firstEnabled) return;
    const source = businessHours[firstEnabled.key] ?? DEFAULT_HOURS;
    const next: BusinessHours = {};
    DAYS_OF_WEEK.forEach((d) => {
      next[d.key] = { ...source };
    });
    setLocalBusinessHours(next);
  }

  function saveBusinessHours() {
    updateServicePrefs.mutate(
      { businessHours: localBusinessHours ?? businessHours },
      {
        onSuccess: () => {
          toast.success(SUCCESS_MESSAGES.BUSINESS_HOURS_SAVED);
          setLocalBusinessHours(null);
        },
        onError: () => toast.error('Failed to save business hours'),
      }
    );
  }

  function copyOrgId() {
    if (org?.id) {
      navigator.clipboard.writeText(org.id).then(
        () => toast.success(SUCCESS_MESSAGES.ORG_ID_COPIED),
        () => toast.error('Failed to copy')
      );
    }
  }

  function handleLogout() {
    logout();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 text-xl font-bold text-gray-900">Settings</h1>

      {/* ── Profile Section ─────────────────── */}
      <section className="mb-6 rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Profile</h2>
          {!isEditingName && profile && (
            <button
              type="button"
              onClick={startEditingName}
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              Edit
            </button>
          )}
        </div>

        {profileLoading ? (
          <div className="p-4 space-y-3">
            <MetricCardSkeleton />
          </div>
        ) : profile ? (
          <div className="divide-y divide-gray-50">
            <div className="flex items-center gap-4 px-4 py-4">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={`${profile.firstName} ${profile.lastName}`}
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">
                  {profile.firstName.charAt(0)}
                  {profile.lastName.charAt(0)}
                </div>
              )}
              {isEditingName ? (
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={editFirstName}
                        onChange={(e) => {
                          setEditFirstName(e.target.value);
                          if (nameErrors.firstName) {
                            setNameErrors((prev) => ({ ...prev, firstName: undefined }));
                          }
                        }}
                        placeholder="First name"
                        className={`h-9 w-full rounded-lg border bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
                          nameErrors.firstName
                            ? 'border-red-300 focus:border-red-500'
                            : 'border-gray-200 focus:border-brand-500'
                        }`}
                        aria-label="First name"
                        aria-invalid={!!nameErrors.firstName}
                        aria-describedby={nameErrors.firstName ? 'first-name-error' : undefined}
                      />
                      {nameErrors.firstName && (
                        <p id="first-name-error" className="mt-1 text-xs text-red-500" role="alert">
                          {nameErrors.firstName}
                        </p>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={editLastName}
                        onChange={(e) => {
                          setEditLastName(e.target.value);
                          if (nameErrors.lastName) {
                            setNameErrors((prev) => ({ ...prev, lastName: undefined }));
                          }
                        }}
                        placeholder="Last name"
                        className={`h-9 w-full rounded-lg border bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
                          nameErrors.lastName
                            ? 'border-red-300 focus:border-red-500'
                            : 'border-gray-200 focus:border-brand-500'
                        }`}
                        aria-label="Last name"
                        aria-invalid={!!nameErrors.lastName}
                        aria-describedby={nameErrors.lastName ? 'last-name-error' : undefined}
                      />
                      {nameErrors.lastName && (
                        <p id="last-name-error" className="mt-1 text-xs text-red-500" role="alert">
                          {nameErrors.lastName}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={saveProfileName}
                      disabled={updateProfile.isPending}
                      className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                    >
                      {updateProfile.isPending ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditName}
                      className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {profile.firstName} {profile.lastName}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">{profile.email}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {profile.phone ? profile.phone : 'Add a phone number'}
                  </p>
                  <p className="mt-0.5 text-xs capitalize text-gray-400">{profile.role}</p>
                </div>
              )}
            </div>

            <div className="px-4 py-4">
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Profile completeness</span>
                  <span>{profileCompleteness?.score ?? 0}%</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-brand-600 transition-all"
                    style={{ width: `${profileCompleteness?.score ?? 0}%` }}
                  />
                </div>
                {missingProfileLabels.length > 0 && (
                  <p className="mt-2 text-xs text-gray-500">
                    Missing: {missingProfileLabels.join(', ')}
                  </p>
                )}
              </div>
            </div>

            <div className="px-4 py-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-gray-600">Phone</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => {
                      setEditPhone(e.target.value);
                      if (detailErrors.phone) {
                        setDetailErrors((prev) => ({ ...prev, phone: undefined }));
                      }
                    }}
                    placeholder="Add phone number"
                    className={`mt-1 h-9 w-full rounded-lg border bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
                      detailErrors.phone
                        ? 'border-red-300 focus:border-red-500'
                        : 'border-gray-200 focus:border-brand-500'
                    }`}
                    aria-label="Phone"
                  />
                  {detailErrors.phone && (
                    <p className="mt-1 text-xs text-red-500" role="alert">
                      {detailErrors.phone}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Profile photo</label>
                  <div className="mt-1 flex items-center gap-3">
                    <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-100">
                      {avatarPreviewUrl || profile.avatarUrl ? (
                        <img
                          src={avatarPreviewUrl || profile.avatarUrl || undefined}
                          alt="Profile preview"
                          className="h-10 w-10 object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center text-xs font-semibold text-gray-500">
                          {profile.firstName.charAt(0)}
                          {profile.lastName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept={ALLOWED_AVATAR_TYPES.join(',')}
                        onChange={handleAvatarFileChange}
                        className="block w-full text-xs text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-xs file:font-medium file:text-brand-700 hover:file:bg-brand-100"
                        aria-label="Upload profile photo"
                      />
                      <p className="mt-1 text-[11px] text-gray-400">JPG, PNG, or WebP up to 2MB.</p>
                      {avatarFile && (
                        <p className="mt-1 text-xs text-gray-500">Selected: {avatarFile.name}</p>
                      )}
                    </div>
                  </div>
                  {detailErrors.avatarUrl && (
                    <p className="mt-1 text-xs text-red-500" role="alert">
                      {detailErrors.avatarUrl}
                    </p>
                  )}
                  {avatarUploadError && (
                    <p className="mt-1 text-xs text-red-500" role="alert">
                      {avatarUploadError}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-gray-400">
                  Add a photo and phone number to boost trust with leads.
                </p>
                <button
                  type="button"
                  onClick={saveProfileDetails}
                  disabled={updateProfile.isPending || isUploadingAvatar || avatarUpload.isPending}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {isUploadingAvatar
                    ? 'Uploading...'
                    : updateProfile.isPending
                      ? 'Saving...'
                      : 'Save details'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {/* ── Notification Preferences ────────── */}
      <section className="mb-6 rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Notifications</h2>
        </div>

        {profileLoading ? (
          <div className="p-4 space-y-3">
            <MetricCardSkeleton />
          </div>
        ) : profile ? (
          <div className="divide-y divide-gray-50">
            {/* Email notifications */}
            <div className="flex items-center justify-between px-4 py-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Email notifications</p>
                <p className="mt-0.5 text-xs text-gray-500">Receive lead updates via email</p>
              </div>
              <Toggle
                checked={profile.notificationPreferences.emailNotifications}
                onChange={handleToggleEmail}
                disabled={updateSettings.isPending}
                label="Toggle email notifications"
              />
            </div>

            {/* SMS notifications */}
            <div className="flex items-center justify-between px-4 py-4">
              <div>
                <p className="text-sm font-medium text-gray-900">SMS notifications</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Receive lead updates via text message
                </p>
              </div>
              <Toggle
                checked={profile.notificationPreferences.smsNotifications}
                onChange={handleToggleSms}
                disabled={updateSettings.isPending}
                label="Toggle SMS notifications"
              />
            </div>
          </div>
        ) : null}
      </section>

      {/* ── Per-Event Notification Preferences ─ */}
      {granularNotifs && (
        <section className="mb-6 rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">Notification Events</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Choose which events trigger notifications
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {NOTIFICATION_EVENTS.map((event) => (
              <div key={event.key} className="px-4 py-4">
                <p className="text-sm font-medium text-gray-900 mb-3">{event.label}</p>
                <div className="flex flex-wrap gap-4">
                  {event.channels.map((channel) => {
                    const prefKey =
                      `${event.key}${channel}` as keyof GranularNotificationPreferences;
                    const isChecked = granularNotifs[prefKey] ?? false;
                    return (
                      <label key={channel} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleGranularToggle(prefKey)}
                          disabled={updateGranularNotifs.isPending}
                          className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                        />
                        <span className="text-xs text-gray-600">{channel}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Service Preferences ─────────────── */}
      <section className="mb-6 rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Service Preferences</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            {selectedCategories.length} of {SERVICE_CATEGORIES.length} categories selected
          </p>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-2">
            {SERVICE_CATEGORIES.map((cat) => {
              const isSelected = selectedCategories.includes(cat);
              return (
                <label
                  key={cat}
                  className={`flex min-h-[40px] items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-brand-200 bg-brand-50 text-brand-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleCategory(cat)}
                    disabled={updateServicePrefs.isPending}
                    className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-xs font-medium">{cat}</span>
                </label>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Geographic Coverage ──────────────── */}
      <section className="mb-6 rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Geographic Coverage</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Serving {zipCodes.length} area{zipCodes.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="p-4">
          {/* ZIP input */}
          <div className="mb-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  value={zipInput}
                  onChange={(e) => {
                    setZipInput(e.target.value.replace(/\D/g, '').slice(0, 5));
                    if (zipError) setZipError('');
                  }}
                  onKeyDown={handleZipKeyDown}
                  placeholder="Enter ZIP code"
                  maxLength={5}
                  className={`h-10 w-full rounded-lg border bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
                    zipError
                      ? 'border-red-300 focus:border-red-500'
                      : 'border-gray-200 focus:border-brand-500'
                  }`}
                  aria-label="Add ZIP code"
                  aria-invalid={!!zipError}
                  aria-describedby={zipError ? 'zip-error' : undefined}
                />
              </div>
              <button
                type="button"
                onClick={addZipCode}
                disabled={!zipInput.trim() || updateServicePrefs.isPending}
                className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                Add
              </button>
            </div>
            {zipError && (
              <p id="zip-error" className="mt-1 text-xs text-red-500" role="alert">
                {zipError}
              </p>
            )}
          </div>

          {/* ZIP chips */}
          {zipCodes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {zipCodes.map((zip) => (
                <span
                  key={zip}
                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                >
                  {zip}
                  <button
                    type="button"
                    onClick={() => removeZipCode(zip)}
                    className="ml-0.5 rounded-full p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                    aria-label={`Remove ZIP ${zip}`}
                  >
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Business Hours ──────────────────── */}
      <section className="mb-6 rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Business Hours</h2>
            <p className="mt-0.5 text-xs text-gray-500">Set your availability for each day</p>
          </div>
          <button
            type="button"
            onClick={copyToAllDays}
            className="text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            Copy to all days
          </button>
        </div>
        <div className="divide-y divide-gray-50">
          {DAYS_OF_WEEK.map((day) => {
            const hours = businessHours[day.key] ?? DEFAULT_HOURS;
            return (
              <div key={day.key} className="flex items-center gap-3 px-4 py-3">
                <div className="w-10">
                  <span className="text-xs font-medium text-gray-700">{day.label}</span>
                </div>
                <Toggle
                  checked={hours.enabled}
                  onChange={() => toggleDayEnabled(day.key)}
                  label={`Toggle ${day.label}`}
                />
                {hours.enabled ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="time"
                      value={hours.start}
                      onChange={(e) => setDayTime(day.key, 'start', e.target.value)}
                      className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      aria-label={`${day.label} start time`}
                    />
                    <span className="text-xs text-gray-400">to</span>
                    <input
                      type="time"
                      value={hours.end}
                      onChange={(e) => setDayTime(day.key, 'end', e.target.value)}
                      className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      aria-label={`${day.label} end time`}
                    />
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">Closed</span>
                )}
              </div>
            );
          })}
        </div>
        {localBusinessHours && (
          <div className="flex justify-end gap-2 border-t border-gray-100 px-4 py-3">
            <button
              type="button"
              onClick={() => setLocalBusinessHours(null)}
              className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveBusinessHours}
              disabled={updateServicePrefs.isPending}
              className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {updateServicePrefs.isPending ? 'Saving...' : 'Save Hours'}
            </button>
          </div>
        )}
      </section>

      {/* ── Organization Info ───────────────── */}
      <section className="mb-6 rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Organization</h2>
          {!isEditingOrg && org && (
            <button
              type="button"
              onClick={startEditingOrg}
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              Edit
            </button>
          )}
        </div>

        {orgLoading || profileLoading ? (
          <div className="p-4 space-y-3">
            <MetricCardSkeleton />
          </div>
        ) : org ? (
          <div className="divide-y divide-gray-50">
            {/* Org name */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-gray-500">Name</span>
              {isEditingOrg ? (
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <div>
                      <input
                        type="text"
                        value={editOrgName}
                        onChange={(e) => {
                          setEditOrgName(e.target.value);
                          if (orgNameError) setOrgNameError('');
                        }}
                        className={`h-8 w-40 rounded-lg border bg-white px-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
                          orgNameError
                            ? 'border-red-300 focus:border-red-500'
                            : 'border-gray-200 focus:border-brand-500'
                        }`}
                        aria-label="Organization name"
                        aria-invalid={!!orgNameError}
                        aria-describedby={orgNameError ? 'org-name-error' : undefined}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={saveOrgName}
                      disabled={updateOrg.isPending || !editOrgName.trim()}
                      className="rounded-lg bg-brand-600 px-2 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingOrg(false);
                        setOrgNameError('');
                      }}
                      className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                  {orgNameError && (
                    <p id="org-name-error" className="text-xs text-red-500" role="alert">
                      {orgNameError}
                    </p>
                  )}
                </div>
              ) : (
                <span className="text-sm font-medium text-gray-900">{org.name}</span>
              )}
            </div>

            {/* Plan with usage */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Plan</span>
                <span className="text-sm font-medium capitalize text-gray-900">{org.plan}</span>
              </div>
              {org.leadsUsed !== undefined &&
                org.leadsLimit !== undefined &&
                org.leadsLimit > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">
                        {org.leadsUsed} of {org.leadsLimit} leads used
                      </span>
                      <span className="text-xs font-medium text-gray-500">
                        {Math.round((org.leadsUsed / org.leadsLimit) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-brand-500 transition-all"
                        style={{
                          width: `${Math.min((org.leadsUsed / org.leadsLimit) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
            </div>

            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-gray-500">Members</span>
              <span className="text-sm font-medium text-gray-900">{org.memberCount}</span>
            </div>

            {org.createdAt && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-gray-500">Created</span>
                <span className="text-sm font-medium text-gray-900">
                  {new Date(org.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            )}

            {/* Organization ID (copyable) */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-gray-500">Organization ID</span>
              <button
                type="button"
                onClick={copyOrgId}
                className="flex items-center gap-1.5 text-xs font-mono text-gray-500 hover:text-brand-600 transition-colors"
                title="Click to copy"
              >
                <span className="truncate max-w-[120px]">{org.id}</span>
                <svg
                  className="h-3.5 w-3.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                  />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="px-4 py-6 text-center text-sm text-gray-500">
            Organization info unavailable
          </div>
        )}
      </section>

      {/* ── Logout ──────────────────────────── */}
      <section className="mb-12">
        <button
          onClick={handleLogout}
          className="flex w-full min-h-[48px] items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-600 shadow-sm transition-colors hover:bg-red-50 active:bg-red-100"
        >
          Sign Out
        </button>
      </section>

      {/* App version */}
      <p className="text-center text-xs text-gray-300">Portal v0.2.0</p>
    </div>
  );
}
