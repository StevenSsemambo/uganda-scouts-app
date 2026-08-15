import { useEffect, useMemo, useState } from 'react'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { MEMBERSHIP_CATEGORIES, categoryFee } from '../../data/membershipCategories'
import { Button, Card, Field, Input, Select, EmptyState, DistrictInput } from '../../components/ui'
import { formatUGX } from '../../lib/format'
import { downloadCSV } from '../../lib/csv'
import { friendlyError } from '../../lib/friendlyError'

const PAYMENT_PURPOSES = ['Registration Fee', 'Annual Subscription', 'Camp Fee', 'Life Membership Fee', 'Donation']
const PAYMENT_METHODS = ['Bank Deposit (Stanbic)', 'MTN Mobile Money', 'Airtel Money', 'Cash to District Office', 'Other']
// See the matching constant/comment in MemberPayments.jsx -- these three
// always cost exactly the member's locked category fee, so the district
// admin reporting it on their behalf shouldn't be able to type a
// different (i.e. partial) amount either.
const FIXED_FEE_PURPOSES = ['Registration Fee', 'Annual Subscription', 'Life Membership Fee']

export default function AdminMembers() {
  const { isAdmin, isDistrictAdmin, managedDistrict, isStaff, user: currentUser } = useAuth()
  const [members, setMembers] = useState([])
  const [profilesByUserId, setProfilesByUserId] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [districtFilter, setDistrictFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [toast, setToast] = useState('')

  // Inline "set new password" form state
  const [passwordTarget, setPasswordTarget] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // Inline "register a member on their behalf" form state — for a district
  // admin collecting info/money from someone who reports it to them rather
  // than registering themselves.
  const [showRegisterForm, setShowRegisterForm] = useState(false)
  const [registerForm, setRegisterForm] = useState({
    full_name: '',
    category: MEMBERSHIP_CATEGORIES[0].category,
    district: '',
  })
  const [registerError, setRegisterError] = useState('')
  const [registerBusy, setRegisterBusy] = useState(false)

  // Inline "report a payment on their behalf" form state
  const [paymentTarget, setPaymentTarget] = useState(null)
  const [paymentForm, setPaymentForm] = useState(null)
  const [paymentError, setPaymentError] = useState('')

  async function load() {
    setLoading(true)
    setLoadError('')
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      const rows = data || []
      setMembers(rows)

      // Full admins can see everyone's profile — used to show whether a
      // member is already a District Admin, get their username for
      // reports, and to toggle roles inline.
      if (isAdmin) {
        const userIds = rows.map(m => m.user_id).filter(Boolean)
        if (userIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, role, managed_district')
            .in('id', userIds)
          if (profilesError) throw profilesError
          const map = {}
          for (const p of profiles || []) map[p.id] = p
          setProfilesByUserId(map)
        }
      }
    } catch (err) {
      console.error('Failed to load members:', err)
      setLoadError(friendlyError(err, 'Could not load members.'))
      setMembers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [isAdmin])

  useEffect(() => {
    if (isDistrictAdmin && managedDistrict) {
      setRegisterForm(f => ({ ...f, district: f.district || managedDistrict }))
    }
  }, [isDistrictAdmin, managedDistrict])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 4000)
    return () => clearTimeout(t)
  }, [toast])

  // District is now free text, not a fixed dropdown list — so the filter
  // options come from whatever districts actually appear in the data,
  // sorted alphabetically, rather than a static ~130-item list.
  const districtOptions = useMemo(() => {
    const set = new Set(members.map(m => m.district).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [members])

  const filtered = useMemo(() => {
    return members.filter(m => {
      const matchesSearch = !search || m.full_name.toLowerCase().includes(search.toLowerCase()) || (m.member_code || '').toLowerCase().includes(search.toLowerCase())
      const matchesDistrict = !districtFilter || m.district === districtFilter
      const matchesCategory = !categoryFilter || m.category === categoryFilter
      return matchesSearch && matchesDistrict && matchesCategory
    })
  }, [members, search, districtFilter, categoryFilter])

  function exportCSV() {
    downloadCSV('members-report.csv', filtered.map(m => {
      const p = profilesByUserId[m.user_id]
      return {
        member_id: m.member_code,
        name: m.full_name,
        username: p?.username || '',
        category: m.category,
        district: m.district,
        membership_type: m.membership_type,
        amount: m.amount,
        year: m.year,
        account_role: p?.role || '',
        registered_on: m.created_at,
      }
    }))
  }

  async function promote(member) {
    if (!member.user_id) return
    setBusyId(member.id)
    try {
      // One District Admin per district — check before promoting so we
      // don't silently create a second admin scoped to the same district.
      const { data: existing, error: existingError } = await supabase
        .from('profiles')
        .select('id, name, username')
        .eq('role', 'district_admin')
        .eq('managed_district', member.district)
        .maybeSingle()
      if (existingError) throw existingError
      if (existing) {
        setToast(`${existing.name} (@${existing.username}) is already the District Admin for "${member.district}". Remove their access first.`)
        return
      }

      const { error } = await supabase
        .from('profiles')
        .update({ role: 'district_admin', managed_district: member.district })
        .eq('id', member.user_id)
      if (error) throw error
      await supabase.from('notifications').insert({
        user_id: member.user_id,
        title: "You've been promoted!",
        body: `You are now District Admin for "${member.district}". You can view and manage members and payments in this district from your dashboard.`,
        type: 'promotion',
      })
      await load()
    } catch (err) {
      console.error('Failed to promote member:', err)
      setToast(friendlyError(err, "Couldn't promote this member."))
    } finally {
      setBusyId(null)
    }
  }

  async function demote(member) {
    if (!member.user_id) return
    if (!confirm(`Remove District Admin access from ${member.full_name}?`)) return
    setBusyId(member.id)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'member', managed_district: null })
        .eq('id', member.user_id)
      if (error) throw error
      await supabase.from('notifications').insert({
        user_id: member.user_id,
        title: 'District Admin access removed',
        body: `Your District Admin access for "${member.district}" has been removed.`,
        type: 'general',
      })
      await load()
    } catch (err) {
      console.error('Failed to demote member:', err)
      setToast(friendlyError(err, "Couldn't remove access."))
    } finally {
      setBusyId(null)
    }
  }

  function updateRegisterForm(key, value) {
    setRegisterForm(f => ({ ...f, [key]: value }))
  }

  async function submitRegister(e) {
    e.preventDefault()
    setRegisterError('')
    if (!registerForm.full_name.trim()) { setRegisterError('Enter their full name.'); return }
    if (!registerForm.district.trim()) { setRegisterError('Enter the district.'); return }
    setRegisterBusy(true)
    try {
      const fee = categoryFee(registerForm.category)
      const year = new Date().getFullYear()
      // No user_id — this member is registered by their district admin on
      // their behalf, not through their own self-service signup. They can
      // still be given a login later (Set New Password requires user_id,
      // so an account would need to be created separately if they want one).
      // Return the inserted row so we can immediately open the payment
      // form for this exact person — this is the real walk-in scenario:
      // someone comes to the district admin, gives their details AND
      // their money in the same visit, so the admin shouldn't have to
      // find them again in the list to record the payment.
      const { data: inserted, error } = await supabase.from('members').insert({
        user_id: null,
        full_name: registerForm.full_name.trim(),
        category: registerForm.category,
        membership_type: fee.membership_type,
        district: registerForm.district.trim(),
        amount: fee.amount,
        year,
      }).select().single()
      if (error) throw error
      setToast(`${registerForm.full_name.trim()} has been registered. Now record their payment below.`)
      setRegisterForm({ full_name: '', category: MEMBERSHIP_CATEGORIES[0].category, district: isDistrictAdmin ? managedDistrict : '' })
      setShowRegisterForm(false)
      await load()
      openPaymentForm(inserted)
    } catch (err) {
      console.error('Failed to register member:', err)
      setRegisterError(friendlyError(err, "Couldn't register this member."))
    } finally {
      setRegisterBusy(false)
    }
  }

  function openPaymentForm(member) {
    setPaymentTarget(member)
    setPaymentForm({
      amount: member.amount ?? '',
      purpose: member.category ? 'Registration Fee' : PAYMENT_PURPOSES[0],
      payment_method: PAYMENT_METHODS[0],
      reference_number: '',
      payment_date: '',
    })
    setPaymentError('')
  }

  async function submitPayment(e) {
    e.preventDefault()
    if (!paymentTarget) return
    setPaymentError('')
    setBusyId(paymentTarget.id)
    try {
      const { error } = await supabase.from('payments').insert({
        member_id: paymentTarget.id,
        amount: Number(paymentForm.amount),
        purpose: paymentForm.purpose,
        payment_method: paymentForm.payment_method,
        reference_number: paymentForm.reference_number,
        payment_date: paymentForm.payment_date,
        year: new Date(paymentForm.payment_date).getFullYear() || new Date().getFullYear(),
      })
      if (error) throw error
      setToast(`Payment reported for ${paymentTarget.full_name}. It's pending verification.`)
      setPaymentTarget(null)
      setPaymentForm(null)
    } catch (err) {
      console.error('Failed to report payment:', err)
      setPaymentError(friendlyError(err, "Couldn't report this payment."))
    } finally {
      setBusyId(null)
    }
  }

  function openPasswordForm(member) {
    setPasswordTarget(member)
    setNewPassword('')
    setPasswordError('')
  }

  async function submitNewPassword(e) {
    e.preventDefault()
    if (!passwordTarget?.user_id) return
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.')
      return
    }
    setPasswordError('')
    setBusyId(passwordTarget.id)
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !sessionData?.session) throw sessionError || new Error('No active session')

      const { data, error } = await supabase.functions.invoke('admin-set-password', {
        body: { userId: passwordTarget.user_id, newPassword },
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
      })
      if (error || data?.error) throw new Error(data?.error || error.message)

      setToast(`New password set for ${passwordTarget.full_name}. Share it with them directly.`)
      setPasswordTarget(null)
      setNewPassword('')
    } catch (err) {
      console.error('Failed to set password:', err)
      setPasswordError(friendlyError(err, "Couldn't set the password."))
    } finally {
      setBusyId(null)
    }
  }

  async function deleteAccount(member) {
    if (!member.user_id) return
    const confirmed = confirm(
      `Permanently delete ${member.full_name}'s account?\n\n` +
      `This removes their membership record, payment history, and login access. This cannot be undone.`
    )
    if (!confirmed) return

    setBusyId(member.id)
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !sessionData?.session) throw sessionError || new Error('No active session')

      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: member.user_id },
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
      })
      if (error || data?.error) throw new Error(data?.error || error.message)

      setToast(`${member.full_name}'s account has been deleted.`)
      await load()
    } catch (err) {
      console.error('Failed to delete account:', err)
      setToast(friendlyError(err, "Couldn't delete this account."))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Layout area="admin">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl mb-1">Members</h1>
          <p className="text-ink/60">{filtered.length} of {members.length} members shown.</p>
        </div>
        <div className="flex gap-3">
          {isDistrictAdmin && (
            <Button variant={showRegisterForm ? 'ghost' : 'secondary'} onClick={() => setShowRegisterForm(s => !s)}>
              {showRegisterForm ? 'Cancel' : '+ Register Member'}
            </Button>
          )}
          {isStaff && (
            <Button onClick={exportCSV}>
              {isDistrictAdmin ? 'Download My District Report' : (districtFilter || categoryFilter ? 'Download Filtered Report' : 'Download Full Report')}
            </Button>
          )}
        </div>
      </div>

      {toast && (
        <Card className="max-w-lg mb-4 bg-canvas-2">
          <p className="text-sm">{toast}</p>
        </Card>
      )}

      {showRegisterForm && (
        <Card className="max-w-lg mb-4 border-forest/30">
          <h3 className="font-display font-semibold mb-1">Register a Member</h3>
          <p className="text-sm text-ink/60 mb-4">
            For someone who reported their details and payment to you directly, rather than
            signing up themselves. They won't have a login unless you set one up separately.
          </p>
          <form onSubmit={submitRegister}>
            <Field label="Full Name">
              <Input value={registerForm.full_name} onChange={e => updateRegisterForm('full_name', e.target.value)} required />
            </Field>
            <Field label="Category" hint="Sets the membership type and fee automatically.">
              <Select value={registerForm.category} onChange={e => updateRegisterForm('category', e.target.value)}>
                {MEMBERSHIP_CATEGORIES.map(c => <option key={c.category} value={c.category}>{c.category}</option>)}
              </Select>
            </Field>
            <Field label="District">
              {isDistrictAdmin ? (
                <div className="bg-canvas-2 rounded-lg px-3.5 py-2.5 text-sm">{managedDistrict}</div>
              ) : (
                <DistrictInput value={registerForm.district} onChange={e => updateRegisterForm('district', e.target.value)} required />
              )}
            </Field>
            {registerError && <p className="text-clay text-sm mb-3">{registerError}</p>}
            <Button type="submit" disabled={registerBusy}>{registerBusy ? 'Registering…' : 'Register Member'}</Button>
          </form>
        </Card>
      )}

      {passwordTarget && (
        <Card className="max-w-lg mb-4 border-ember/50">
          <h3 className="font-display font-semibold mb-1">Set New Password</h3>
          <p className="text-sm text-ink/60 mb-4">
            For {passwordTarget.full_name}. Share this password with them directly (WhatsApp, phone, in person) —
            there's no email involved.
          </p>
          <form onSubmit={submitNewPassword}>
            <Field label="New Password">
              <Input
                type="text"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={6}
                placeholder="At least 6 characters"
              />
            </Field>
            {passwordError && <p className="text-clay text-sm mb-3">{passwordError}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={busyId === passwordTarget.id}>
                {busyId === passwordTarget.id ? 'Saving…' : 'Set Password'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setPasswordTarget(null)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {paymentTarget && (
        <Card className="max-w-lg mb-4 border-forest/30">
          <h3 className="font-display font-semibold mb-1">Report a Payment</h3>
          <p className="text-sm text-ink/60 mb-4">
            For {paymentTarget.full_name}, based on what they reported to you. It goes in as
            pending, same as a self-reported payment, until an admin verifies it.
          </p>
          <form onSubmit={submitPayment}>
            <Field label="Purpose">
              <Select
                value={paymentForm.purpose}
                onChange={e => {
                  const purpose = e.target.value
                  setPaymentForm(f => ({
                    ...f,
                    purpose,
                    amount: FIXED_FEE_PURPOSES.includes(purpose) ? (paymentTarget.amount ?? '') : '',
                  }))
                }}
              >
                {PAYMENT_PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
              </Select>
            </Field>
            <Field
              label="Amount Paid (UGX)"
              hint={FIXED_FEE_PURPOSES.includes(paymentForm.purpose)
                ? 'Locked to their registered category fee — must match exactly, no partial payments.'
                : 'Enter the exact amount they paid.'}
            >
              <Input
                type="number"
                min="0"
                value={paymentForm.amount}
                onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                required
                readOnly={FIXED_FEE_PURPOSES.includes(paymentForm.purpose)}
                className={FIXED_FEE_PURPOSES.includes(paymentForm.purpose) ? 'bg-canvas-2 cursor-not-allowed' : ''}
              />
            </Field>
            <Field label="Payment Method">
              <Select value={paymentForm.payment_method} onChange={e => setPaymentForm(f => ({ ...f, payment_method: e.target.value }))}>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </Select>
            </Field>
            <Field label="Transaction Reference Number" hint="From the bank slip or Mobile Money confirmation SMS they showed you.">
              <Input value={paymentForm.reference_number} onChange={e => setPaymentForm(f => ({ ...f, reference_number: e.target.value }))} required />
            </Field>
            <Field label="Payment Date">
              <Input type="date" value={paymentForm.payment_date} onChange={e => setPaymentForm(f => ({ ...f, payment_date: e.target.value }))} required />
            </Field>
            {paymentError && <p className="text-clay text-sm mb-3">{paymentError}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={busyId === paymentTarget.id}>
                {busyId === paymentTarget.id ? 'Submitting…' : 'Submit for Verification'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setPaymentTarget(null)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="flex flex-wrap gap-3 mb-6">
        <Input
          placeholder="Search by name or member ID…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={districtFilter} onChange={e => setDistrictFilter(e.target.value)} className="max-w-xs">
          <option value="">All Districts</option>
          {districtOptions.map(d => <option key={d} value={d}>{d}</option>)}
        </Select>
        <Select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="max-w-xs">
          <option value="">All Categories</option>
          {MEMBERSHIP_CATEGORIES.map(c => <option key={c.category} value={c.category}>{c.category}</option>)}
        </Select>
      </div>

      {loading ? (
        <p className="text-ink/50">Loading…</p>
      ) : loadError ? (
        <Card className="max-w-lg border-clay/50">
          <p className="text-sm text-clay mb-3">{loadError}</p>
          <Button variant="ghost" onClick={load}>Try Again</Button>
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState title="No members found" hint="Try a different search or filter." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-khaki/60 bg-canvas-2">
                <Th>Member ID</Th><Th>Name</Th><Th>Category</Th><Th>District</Th>
                <Th>Type</Th><Th>Amount</Th><Th>Year</Th>
                {isStaff && <Th>Actions</Th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => {
                const p = profilesByUserId[m.user_id]
                const isDistrictAdminForThis = p?.role === 'district_admin' && p?.managed_district === m.district
                const isSelf = m.user_id === currentUser?.id
                return (
                  <tr key={m.id} className="border-b border-khaki/30 last:border-0">
                    <Td className="font-mono text-xs">{m.member_code}</Td>
                    <Td>{m.full_name}</Td>
                    <Td>{m.category}</Td>
                    <Td>{m.district}</Td>
                    <Td>{m.membership_type}</Td>
                    <Td>{formatUGX(m.amount)}</Td>
                    <Td>{m.year}</Td>
                    {isStaff && (
                      <Td>
                        <div className="flex flex-wrap gap-3">
                          {isAdmin && (
                            isDistrictAdminForThis ? (
                              <button
                                className="text-xs text-ember font-medium hover:underline disabled:opacity-50"
                                disabled={busyId === m.id}
                                onClick={() => demote(m)}
                              >
                                Remove Access
                              </button>
                            ) : (
                              <button
                                className="text-xs text-forest font-medium hover:underline disabled:opacity-50"
                                disabled={busyId === m.id || !m.user_id || isSelf}
                                onClick={() => promote(m)}
                              >
                                Make District Admin
                              </button>
                            )
                          )}
                          {isDistrictAdmin && (
                            <button
                              className="text-xs text-forest font-medium hover:underline disabled:opacity-50"
                              disabled={busyId === m.id}
                              onClick={() => openPaymentForm(m)}
                            >
                              Report Payment
                            </button>
                          )}
                          <button
                            className="text-xs text-forest font-medium hover:underline disabled:opacity-50"
                            disabled={busyId === m.id || !m.user_id}
                            onClick={() => openPasswordForm(m)}
                          >
                            Set New Password
                          </button>
                          {isAdmin && (
                            <button
                              className="text-xs text-ember font-medium hover:underline disabled:opacity-50"
                              disabled={busyId === m.id || !m.user_id || isSelf}
                              onClick={() => deleteAccount(m)}
                            >
                              Delete Account
                            </button>
                          )}
                        </div>
                      </Td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}
    </Layout>
  )
}

function Th({ children }) { return <th className="px-4 py-3 font-semibold text-ink/70">{children}</th> }
function Td({ children, className = '' }) { return <td className={`px-4 py-3 ${className}`}>{children}</td> }
