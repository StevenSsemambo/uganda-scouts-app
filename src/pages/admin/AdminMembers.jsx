import { useEffect, useMemo, useState } from 'react'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { DISTRICTS } from '../../data/districts'
import { MEMBERSHIP_CATEGORIES } from '../../data/membershipCategories'
import { Button, Card, Field, Input, Select, EmptyState } from '../../components/ui'
import { formatUGX } from '../../lib/format'
import { downloadCSV } from '../../lib/csv'
import { friendlyError } from '../../lib/friendlyError'

export default function AdminMembers() {
  const { isAdmin, isCategoryAdmin, isStaff, user: currentUser } = useAuth()
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
      // member is already a Category Admin, get their username for
      // reports, and to toggle roles inline.
      if (isAdmin) {
        const userIds = rows.map(m => m.user_id).filter(Boolean)
        if (userIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, role, managed_category')
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
    if (!toast) return
    const t = setTimeout(() => setToast(''), 4000)
    return () => clearTimeout(t)
  }, [toast])

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
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'category_admin', managed_category: member.category })
        .eq('id', member.user_id)
      if (error) throw error
      await supabase.from('notifications').insert({
        user_id: member.user_id,
        title: "You've been promoted!",
        body: `You are now Category Admin for "${member.category}". You can view and manage members and payments in this category from your dashboard.`,
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
    if (!confirm(`Remove Category Admin access from ${member.full_name}?`)) return
    setBusyId(member.id)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'member', managed_category: null })
        .eq('id', member.user_id)
      if (error) throw error
      await supabase.from('notifications').insert({
        user_id: member.user_id,
        title: 'Category Admin access removed',
        body: `Your Category Admin access for "${member.category}" has been removed.`,
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
        {isAdmin && <Button onClick={exportCSV}>Download Full Report</Button>}
      </div>

      {toast && (
        <Card className="max-w-lg mb-4 bg-canvas-2">
          <p className="text-sm">{toast}</p>
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

      <div className="flex flex-wrap gap-3 mb-6">
        <Input
          placeholder="Search by name or member ID…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={districtFilter} onChange={e => setDistrictFilter(e.target.value)} className="max-w-xs">
          <option value="">All Districts</option>
          {DISTRICTS.map(d => <option key={d.code} value={d.name}>{d.name}</option>)}
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
                const isCategoryAdminForThis = p?.role === 'category_admin' && p?.managed_category === m.category
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
                            isCategoryAdminForThis ? (
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
                                Make Category Admin
                              </button>
                            )
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
