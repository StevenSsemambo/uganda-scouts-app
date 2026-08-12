import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { MEMBERSHIP_CATEGORIES } from '../../data/membershipCategories'
import { Button, Card, Field, Input, Select } from '../../components/ui'

// Shared by full Admin (any category, or any individual) and Category
// Admin (their own category only, or an individual within it — row-
// level security already prevents them from reaching outside their
// category regardless of what this form lets them pick).
export default function SendMessage() {
  const { isAdmin, isCategoryAdmin, managedCategory } = useAuth()

  const [targetType, setTargetType] = useState('category') // 'category' | 'individual'
  const [category, setCategory] = useState(isCategoryAdmin ? managedCategory : MEMBERSHIP_CATEGORIES[0].category)
  const [memberQuery, setMemberQuery] = useState('')
  const [memberResults, setMemberResults] = useState([])
  const [selectedMember, setSelectedMember] = useState(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (targetType !== 'individual' || memberQuery.trim().length < 2) {
      setMemberResults([])
      return
    }
    const t = setTimeout(async () => {
      // RLS already scopes this: a Category Admin's query only ever
      // returns members within their own category.
      const { data } = await supabase
        .from('members')
        .select('id, user_id, full_name, member_code, category')
        .ilike('full_name', `%${memberQuery}%`)
        .limit(8)
      setMemberResults(data || [])
    }, 300)
    return () => clearTimeout(t)
  }, [memberQuery, targetType])

  async function handleSend(e) {
    e.preventDefault()
    setError('')
    setStatus('')

    if (targetType === 'individual' && !selectedMember) {
      setError('Pick a member from the search results first.')
      return
    }

    setBusy(true)
    try {
      if (targetType === 'individual') {
        const { error: insertError } = await supabase.from('notifications').insert({
          user_id: selectedMember.user_id,
          title,
          body,
          type: 'announcement',
        })
        if (insertError) throw insertError
        setStatus(`Message sent to ${selectedMember.full_name}.`)
      } else {
        const { data: recipients, error: fetchError } = await supabase
          .from('members')
          .select('user_id')
          .eq('category', category)
        if (fetchError) throw fetchError

        const userIds = [...new Set((recipients || []).map(m => m.user_id).filter(Boolean))]
        if (userIds.length === 0) {
          setError(`No members found in "${category}" yet.`)
          setBusy(false)
          return
        }
        const rows = userIds.map(user_id => ({ user_id, title, body, type: 'announcement' }))
        const { error: insertError } = await supabase.from('notifications').insert(rows)
        if (insertError) throw insertError
        setStatus(`Message sent to ${userIds.length} member${userIds.length === 1 ? '' : 's'} in "${category}".`)
      }
      setTitle('')
      setBody('')
      setSelectedMember(null)
      setMemberQuery('')
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  return (
    <Layout area="admin">
      <h1 className="font-display font-bold text-2xl mb-1">Send Message</h1>
      <p className="text-ink/60 mb-6">
        {isAdmin
          ? 'Message an entire category, or a specific member. They\'ll see it as an in-app notification.'
          : `Message members in your category — "${managedCategory}" — or a specific one of them.`}
      </p>

      <Card className="max-w-lg">
        <form onSubmit={handleSend}>
          <Field label="Send To">
            <Select value={targetType} onChange={e => { setTargetType(e.target.value); setError(''); setStatus('') }}>
              <option value="category">{isAdmin ? 'An Entire Category' : 'All My Category Members'}</option>
              <option value="individual">A Specific Member</option>
            </Select>
          </Field>

          {targetType === 'category' && isAdmin && (
            <Field label="Category">
              <Select value={category} onChange={e => setCategory(e.target.value)}>
                {MEMBERSHIP_CATEGORIES.map(c => <option key={c.category} value={c.category}>{c.category}</option>)}
              </Select>
            </Field>
          )}

          {targetType === 'category' && isCategoryAdmin && (
            <div className="bg-canvas-2 rounded-lg px-3.5 py-2.5 mb-4 text-sm">
              {managedCategory}
            </div>
          )}

          {targetType === 'individual' && (
            <Field label="Search Member by Name">
              <Input
                value={memberQuery}
                onChange={e => { setMemberQuery(e.target.value); setSelectedMember(null) }}
                placeholder="Start typing a name…"
              />
              {memberResults.length > 0 && !selectedMember && (
                <div className="mt-2 border border-khaki/50 rounded-lg overflow-hidden">
                  {memberResults.map(m => (
                    <button
                      type="button"
                      key={m.id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-canvas-2 border-b border-khaki/30 last:border-0"
                      onClick={() => { setSelectedMember(m); setMemberQuery(m.full_name) }}
                    >
                      {m.full_name} <span className="text-ink/40">· {m.member_code} · {m.category}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedMember && (
                <p className="text-xs text-moss mt-1.5">Selected: {selectedMember.full_name}</p>
              )}
            </Field>
          )}

          <Field label="Title">
            <Input value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. Camp Registration Reminder" />
          </Field>
          <Field label="Message">
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              required
              rows={4}
              className="w-full rounded-lg border border-khaki-dark/60 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-forest/40 focus:border-forest"
              placeholder="Write your message…"
            />
          </Field>

          {error && <p className="text-clay text-sm mb-3">{error}</p>}
          {status && <p className="text-moss text-sm mb-3">{status}</p>}
          <Button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send Message'}</Button>
        </form>
      </Card>
    </Layout>
  )
}
