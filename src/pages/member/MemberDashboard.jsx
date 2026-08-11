import { Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import CompleteRegistration from './CompleteRegistration'
import { useMember } from '../../lib/useMember'
import { useAuth } from '../../context/AuthContext'
import { Card, MemberBadge, Button } from '../../components/ui'
import { formatUGX } from '../../lib/format'
import SetPasswordCard from '../../components/SetPasswordCard'

export default function MemberDashboard() {
  const { member, loading } = useMember()
  const { hasPassword } = useAuth()

  if (loading) {
    return <Layout area="member"><p className="text-ink/50">Loading…</p></Layout>
  }

  if (!member) {
    return <CompleteRegistration />
  }

  return (
    <Layout area="member">
      <h1 className="font-display font-bold text-2xl mb-1">Welcome, {member.full_name.split(' ')[0]}</h1>
      <p className="text-ink/60 mb-6">Your membership overview for {member.year}.</p>

      {!hasPassword && <SetPasswordCard />}

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
