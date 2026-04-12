import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth'
import {
  User,
  Pencil,
  Info,
  ChevronDown,
  X,
  Globe,
  Linkedin,
  Calendar,
  Phone,
  Mail,
} from 'lucide-react'

function EditableField({
  label,
  value,
  icon,
  onEdit,
}: {
  label: string
  value: string
  icon?: React.ReactNode
  onEdit?: () => void
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[#374151]">{label}</label>
      <div className="flex h-11 items-center justify-between rounded-lg border border-gray-200 bg-[#F9FAFB] px-3">
        <div className="flex items-center gap-2 text-sm text-[#111827] min-w-0">
          {icon}
          <span className="truncate">{value}</span>
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-[#6C5CE7] transition-colors"
            aria-label={`Edit ${label}`}
          >
            <Pencil size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  infoTooltip,
  prefix,
  disabled,
}: {
  label: string
  value: string
  onChange: (val: string) => void
  placeholder?: string
  type?: string
  infoTooltip?: string
  prefix?: React.ReactNode
  disabled?: boolean
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-[#374151]">
        {label}
        {infoTooltip && (
          <span title={infoTooltip} className="cursor-help">
            <Info size={14} className="text-gray-400" />
          </span>
        )}
      </label>
      <div className="flex h-11 items-center rounded-lg border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-[#6C5CE7] focus-within:border-transparent transition-shadow">
        {prefix && (
          <div className="flex items-center gap-1 border-r border-gray-200 px-3 text-sm text-[#6B7280]">
            {prefix}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="h-full flex-1 rounded-lg bg-transparent px-3 text-sm text-[#111827] placeholder:text-gray-400 outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
    </div>
  )
}

const TIMEZONES = [
  { label: 'India Standard Time - (UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi', value: 'Asia/Kolkata' },
  { label: 'Eastern Time - (UTC-05:00) New York, Washington DC', value: 'America/New_York' },
  { label: 'Central Time - (UTC-06:00) Chicago, Houston', value: 'America/Chicago' },
  { label: 'Mountain Time - (UTC-07:00) Denver, Phoenix', value: 'America/Denver' },
  { label: 'Pacific Time - (UTC-08:00) Los Angeles, San Francisco', value: 'America/Los_Angeles' },
  { label: 'UTC - (UTC+00:00) Coordinated Universal Time', value: 'UTC' },
  { label: 'British Time - (UTC+00:00) London, Edinburgh', value: 'Europe/London' },
  { label: 'Central European Time - (UTC+01:00) Berlin, Paris', value: 'Europe/Berlin' },
  { label: 'Singapore Time - (UTC+08:00) Singapore, Kuala Lumpur', value: 'Asia/Singapore' },
  { label: 'Japan Standard Time - (UTC+09:00) Tokyo, Osaka', value: 'Asia/Tokyo' },
  { label: 'Australian Eastern Time - (UTC+10:00) Sydney, Melbourne', value: 'Australia/Sydney' },
]

export function ProfilePage() {
  const { profile, profileLoading, fetchProfile, user } = useAuthStore()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [secondaryPhone, setSecondaryPhone] = useState('')
  const [calendarLink, setCalendarLink] = useState('')
  const [linkedIn, setLinkedIn] = useState('')
  const [timezone, setTimezone] = useState('Asia/Kolkata')
  const [showTimezoneDropdown, setShowTimezoneDropdown] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!profile && !profileLoading) fetchProfile()
  }, [])

  useEffect(() => {
    if (profile?.name) {
      const parts = profile.name.split(' ')
      setFirstName(parts[0] || '')
      setLastName(parts.slice(1).join(' ') || '')
    }
  }, [profile?.name])

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (profileLoading) {
    return <div className="p-6 text-sm text-[#6B7280]">Loading profile...</div>
  }

  if (!profile) {
    return <div className="p-6 text-sm text-[#6B7280]">Profile not available.</div>
  }

  const initials = profile.name
    ? profile.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  const selectedTz = TIMEZONES.find((tz) => tz.value === timezone)

  return (
    <div className="mx-auto max-w-[900px] px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-[#111827]">Profile Settings</h1>

      {/* Profile header */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EDE9FD] text-lg font-semibold text-[#6C5CE7]">
          {initials}
        </div>
        <div>
          <p className="text-lg font-medium text-[#111827]">{profile.name}</p>
          <p className="text-sm text-[#6B7280]">{profile.email}</p>
        </div>
      </div>

      {/* Form card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* First name */}
          <FormInput
            label="First name"
            value={firstName}
            onChange={setFirstName}
            placeholder="First name"
          />

          {/* Last name */}
          <FormInput
            label="Last name"
            value={lastName}
            onChange={setLastName}
            placeholder="Last name"
          />

          {/* Email — read-only with edit icon */}
          <EditableField
            label="Email"
            value={profile.email}
            icon={<Mail size={14} className="text-gray-400" />}
          />

          {/* Primary mobile — read-only with edit icon */}
          <EditableField
            label="Primary mobile number"
            value="+1 (555) 000-0000"
            icon={<Phone size={14} className="text-gray-400" />}
          />

          {/* Secondary phone with country code */}
          <FormInput
            label="Secondary mobile number"
            value={secondaryPhone}
            onChange={setSecondaryPhone}
            placeholder="Enter phone number"
            prefix={
              <span className="flex items-center gap-1 text-xs">
                <span>🇺🇸</span>
                <span>+1</span>
                <ChevronDown size={12} />
              </span>
            }
          />

          {/* Calendar booking link */}
          <FormInput
            label="Calendar booking link"
            value={calendarLink}
            onChange={setCalendarLink}
            placeholder="Your Calendar URL"
            infoTooltip="Add your Calendly or Cal.com link so team members can book time with you."
          />

          {/* LinkedIn */}
          <FormInput
            label="LinkedIn"
            value={linkedIn}
            onChange={setLinkedIn}
            placeholder="Your LinkedIn URL"
          />

          {/* Time zone */}
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-[#374151]">Time zone</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTimezoneDropdown(!showTimezoneDropdown)}
                className="flex h-11 w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#111827] hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Globe size={14} className="flex-shrink-0 text-gray-400" />
                  <span className="truncate">{selectedTz?.label || 'Select timezone'}</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {timezone && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setTimezone('')
                        setShowTimezoneDropdown(false)
                      }}
                      className="p-0.5 text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                  <ChevronDown size={14} className="text-gray-400" />
                </div>
              </button>

              {showTimezoneDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowTimezoneDropdown(false)} />
                  <div className="absolute left-0 top-full z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                    {TIMEZONES.map((tz) => (
                      <button
                        key={tz.value}
                        type="button"
                        onClick={() => {
                          setTimezone(tz.value)
                          setShowTimezoneDropdown(false)
                        }}
                        className={`w-full px-4 py-2.5 text-left text-sm hover:bg-[#F3F0FF] transition-colors ${
                          timezone === tz.value ? 'bg-[#EDE9FD] text-[#6C5CE7] font-medium' : 'text-[#111827]'
                        }`}
                      >
                        {tz.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Role & Organization info */}
        <div className="mt-6 border-t border-gray-100 pt-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Role</p>
              <p className="mt-1 text-sm capitalize text-[#111827]">{profile.role?.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Organization</p>
              <p className="mt-1 text-sm text-[#111827]">{profile.organization?.name || 'Not assigned'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">Status</p>
              <p className="mt-1 text-sm capitalize text-[#111827]">{profile.status?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="mt-6 flex items-center justify-end gap-3">
          {saved && (
            <span className="text-sm text-green-600">Changes saved</span>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="h-10 rounded-lg bg-[#6C5CE7] px-6 text-sm font-medium text-white hover:bg-[#5B4BD5] transition-colors"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  )
}
