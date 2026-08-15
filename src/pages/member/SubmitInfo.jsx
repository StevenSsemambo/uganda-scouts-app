import { useState } from 'react'
import Layout from '../../components/Layout'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { MODULES, MODULE_KEYS } from '../../data/modules'
import { Button, Card, Field, Input, Select, DistrictInput } from '../../components/ui'
import { friendlyError } from '../../lib/friendlyError'

export default function SubmitInfo() {
  const { user } = useAuth()
  const [moduleKey, setModuleKey] = useState(MODULE_KEYS[0])
  const [form, setForm] = useState({})
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)
  const [busy, setBusy] = useState(false)

  const mod = MODULES[moduleKey]

  function changeModule(key) {
    setModuleKey(key)
    setForm({})
    setOk(false)
    setError('')
  }

  function update(key, value) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { error } = await supabase.from(mod.table).insert({
        ...form,
        submitted_by: user.id,
      })
      if (error) throw error
      setForm({})
      setOk(true)
    } catch (err) {
      console.error('Failed to submit record:', err)
      setError(friendlyError(err, "Couldn't submit this — please try again."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Layout area="member">
      <h1 className="font-display font-bold text-2xl mb-1">Submit District Information</h1>
      <p className="text-ink/60 mb-6">
        Add records for your district — Schools, Commissioners, Woodbadge, Scout Leaders, Rover Scouts,
        Donors, District Leadership, or District Subscriptions. The admin can see and download everything submitted here.
      </p>

      <Card className="max-w-lg">
        <Field label="What are you submitting?">
          <Select value={moduleKey} onChange={e => changeModule(e.target.value)}>
            {MODULE_KEYS.map(k => <option key={k} value={k}>{MODULES[k].label}</option>)}
          </Select>
        </Field>

        <form onSubmit={handleSubmit}>
          {mod.fields.map(f => (
            <Field key={f.key} label={f.label}>
              {f.type === 'select' ? (
                <Select value={form[f.key] || ''} onChange={e => update(f.key, e.target.value)} required={f.required}>
                  <option value="" disabled>Choose…</option>
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </Select>
              ) : f.type === 'district' ? (
                <DistrictInput value={form[f.key] || ''} onChange={e => update(f.key, e.target.value)} required={f.required} />
              ) : (
                <Input
                  type={f.type === 'number' ? 'number' : f.type === 'email' ? 'email' : 'text'}
                  value={form[f.key] || ''}
                  onChange={e => update(f.key, e.target.value)}
                  required={f.required}
                />
              )}
            </Field>
          ))}
          {error && <p className="text-clay text-sm mb-3">{error}</p>}
          {ok && <p className="text-moss text-sm mb-3">{mod.singular} submitted successfully.</p>}
          <Button type="submit" disabled={busy}>{busy ? 'Submitting…' : `Submit ${mod.singular}`}</Button>
        </form>
      </Card>
    </Layout>
  )
}
