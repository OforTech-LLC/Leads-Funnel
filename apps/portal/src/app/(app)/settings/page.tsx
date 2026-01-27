'use client';

import { useProfile, useOrg, useUpdateSettings } from '@/lib/queries/profile';
import { logout } from '@/lib/auth';
import { MetricCardSkeleton } from '@/components/LoadingSpinner';

export default function SettingsPage() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: org, isLoading: orgLoading } = useOrg(profile?.primaryOrgId || '');
  const updateSettings = useUpdateSettings();

  function handleToggleEmail() {
    if (!profile) return;
    updateSettings.mutate({
      emailNotifications: !profile.notificationPreferences.emailNotifications,
      smsNotifications: profile.notificationPreferences.smsNotifications,
    });
  }

  function handleToggleSms() {
    if (!profile) return;
    updateSettings.mutate({
      emailNotifications: profile.notificationPreferences.emailNotifications,
      smsNotifications: !profile.notificationPreferences.smsNotifications,
    });
  }

  function handleLogout() {
    logout();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 text-xl font-bold text-gray-900">Settings</h1>

      {/* Profile Section */}
      <section className="mb-6 rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Profile</h2>
        </div>

        {profileLoading ? (
          <div className="p-4 space-y-3">
            <MetricCardSkeleton />
          </div>
        ) : profile ? (
          <div className="divide-y divide-gray-50">
            <div className="flex items-center gap-4 px-4 py-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">
                {profile.firstName.charAt(0)}
                {profile.lastName.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {profile.firstName} {profile.lastName}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">{profile.email}</p>
                <p className="mt-0.5 text-xs capitalize text-gray-400">{profile.role}</p>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {/* Notification Preferences */}
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
              <button
                type="button"
                role="switch"
                aria-checked={profile.notificationPreferences.emailNotifications}
                onClick={handleToggleEmail}
                disabled={updateSettings.isPending}
                className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 min-w-[48px] ${
                  profile.notificationPreferences.emailNotifications
                    ? 'bg-brand-600'
                    : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
                    profile.notificationPreferences.emailNotifications
                      ? 'translate-x-5'
                      : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* SMS notifications */}
            <div className="flex items-center justify-between px-4 py-4">
              <div>
                <p className="text-sm font-medium text-gray-900">SMS notifications</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Receive lead updates via text message
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={profile.notificationPreferences.smsNotifications}
                onClick={handleToggleSms}
                disabled={updateSettings.isPending}
                className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 min-w-[48px] ${
                  profile.notificationPreferences.smsNotifications ? 'bg-brand-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
                    profile.notificationPreferences.smsNotifications
                      ? 'translate-x-5'
                      : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {/* Organization Info */}
      <section className="mb-6 rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Organization</h2>
        </div>

        {orgLoading || profileLoading ? (
          <div className="p-4 space-y-3">
            <MetricCardSkeleton />
          </div>
        ) : org ? (
          <div className="divide-y divide-gray-50">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-gray-500">Name</span>
              <span className="text-sm font-medium text-gray-900">{org.name}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-gray-500">Plan</span>
              <span className="text-sm font-medium capitalize text-gray-900">{org.plan}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-gray-500">Members</span>
              <span className="text-sm font-medium text-gray-900">{org.memberCount}</span>
            </div>
          </div>
        ) : (
          <div className="px-4 py-6 text-center text-sm text-gray-500">
            Organization info unavailable
          </div>
        )}
      </section>

      {/* Logout */}
      <section className="mb-12">
        <button
          onClick={handleLogout}
          className="flex w-full min-h-[48px] items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-600 shadow-sm transition-colors hover:bg-red-50 active:bg-red-100"
        >
          Sign Out
        </button>
      </section>

      {/* App version */}
      <p className="text-center text-xs text-gray-300">Portal v0.1.0</p>
    </div>
  );
}
