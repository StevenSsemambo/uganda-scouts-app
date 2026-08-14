import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import CompleteRegistration from './CompleteRegistration'
import { useMember } from '../../lib/useMember'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import { Card, MemberBadge, Button } from '../../components/ui'
import { formatUGX } from '../../lib/format'
import SetPasswordCard from '../../components/SetPasswordCard'
import BankDetailsCard from '../../components/BankDetailsCard'

export default function MemberDashboard() {
  const { member, loading, error: memberError, reload } = useMember()
  const { hasPassword } = useAuth()
  const [hasVerifiedPayment, setHasVerifiedPayment] = useState(true) // default true so the banner doesn't flash before we know

  useEffect(() => {
    async function checkVerified() {
      if (!member) return
      try {
        const { count, error } = await supabase
          .from('payments')
          .select('id', { count: 'exact', head: true })
          .eq('member_id', member.id)
          .eq('status', 'verified')
        if (error) throw error
        setHasVerifiedPayment((count || 0) > 0)
      } catch (err) {
        console.error('Failed to check verified payments:', err)
        // Fail safe: keep showing the bank details reminder rather than
        // silently hiding it based on an unknown state.
        setHasVerifiedPayment(false)
      }
    }
    checkVerified()
  }, [member])

  if (loading) {
    return <Layout area="member"><p className="text-ink/50">Loading…</p></Layout>
  }

  // Only show the registration form when we've confirmed there's genuinely
  // no member record — not when the fetch itself failed, which would
  // otherwise wrongly tell an already-registered member to register again.
  if (memberError) {
    return (
      <Layout area="member">
        <Card className="max-w-lg border-clay/50">
          <p className="text-sm text-clay mb-3">{memberError}</p>
          <Button variant="ghost" onClick={reload}>Try Again</Button>
        </Card>
      </Layout>
    )
  }

  if (!member) {
    return <CompleteRegistration />
  }

  return (
    <Layout area="member">
      <h1 className="font-display font-bold text-2xl mb-1">
        Welcome{member.full_name ? `, ${member.full_name.split(' ')[0]}` : ''}
      </h1>
      <p className="text-ink/60 mb-6">Your membership overview for {member.year}.</p>

      {!hasPassword && <SetPasswordCard />}

      {!hasVerifiedPayment && (
        <div className="mb-8">
          <BankDetailsCard memberCode={member.member_code} />
        </div>
      )}

      <div className="grid md:grid-cols-[auto_1fr] gap-6 mb-8">
        <MemberBadge code={member.member_code} name={member.district} size={140} />
        <Card>
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-ink/50">Member ID</dt><dd className="font-medium">{member.member_code}</dd>
            <dt className="text-ink/50">Category</dt><dd className="font-medium">{member.category}</dd>
            <dt className="text-ink/50">District</dt><dd className="font-medium">{member.district}</dd>
            <dt className="text-ink/50">Membership Type</dt><dd className="font-medium">{member.membership_type}</dd>
            <dt className="text-ink/50">Amount on Record</dt><dd className="font-medium">{formatUGX(member.amount)}</dd>
            <dt className="text-ink/50">Year</dt><dd className="font-medium">{member.year}</dd>
          </dl>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to="/member/profile"><Button variant="ghost">Edit My Information</Button></Link>
        <Link to="/member/payments"><Button variant="primary">Report / View Payments</Button></Link>
        <Link to="/member/submit"><Button variant="secondary">Submit District Info</Button></Link>
      </div>
    </Layout>
  )
}
