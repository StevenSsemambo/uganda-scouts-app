import { useState } from 'react'
import { useBankDetails } from '../lib/useBankDetails'

// The one place bank deposit details are designed — large, high-contrast,
// copyable account number, and a clear reference instruction. Rendered
// wherever a member needs to know where to send money (registration,
// payments page, dashboard reminder). Details are loaded live from the
// database, so an admin updating them anywhere reflects here instantly.
export default function BankDetailsCard({ memberCode, compact = false }) {
  const { details, loading } = useBankDetails()
  const [copied, setCopied] = useState(false)

  async function copyAccountNumber() {
    if (!details?.account_number) return
    try {
      await navigator.clipboard.writeText(details.account_number)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API can fail on some older mobile browsers — the number
      // is still fully visible and selectable by hand as a fallback.
    }
  }

  if (loading || !details || !details.account_number) {
    return null
  }

  return (
    <div className="rounded-2xl border-2 border-ember bg-forest text-canvas p-5 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 21h18M4 21V9l8-6 8 6v12M9 21v-6h6v6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="font-display font-bold text-sm uppercase tracking-wide">
          Deposit Your Payment Here
        </span>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-xs text-canvas/60 mb-1">Bank</div>
          <div className="font-medium">{details.bank_name}</div>
        </div>
        {details.account_name && (
          <div>
            <div className="text-xs text-canvas/60 mb-1">Account Name</div>
            <div className="font-medium">{details.account_name}</div>
          </div>
        )}
        {details.branch && (
          <div>
            <div className="text-xs text-canvas/60 mb-1">Branch</div>
            <div className="font-medium">{details.branch}</div>
          </div>
        )}
        {details.swift_code && (
          <div>
            <div className="text-xs text-canvas/60 mb-1">SWIFT Code</div>
            <div className="font-medium">{details.swift_code}</div>
          </div>
        )}
      </div>

      <div className="mb-4">
        <div className="text-xs text-canvas/60 mb-1.5">Account Number</div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono font-bold text-2xl md:text-3xl tracking-wider bg-canvas/10 px-4 py-2 rounded-lg select-all">
            {details.account_number}
          </span>
          <button
            type="button"
            onClick={copyAccountNumber}
            className="bg-ember text-canvas text-sm font-semibold px-4 py-2.5 rounded-lg hover:opacity-90 shrink-0"
          >
            {copied ? '✓ Copied' : 'Copy Number'}
          </button>
        </div>
      </div>

      {!compact && (
        <div className="bg-canvas/10 rounded-lg px-4 py-3 text-sm">
          <span className="font-semibold">Important:</span> Use{' '}
          {memberCode ? (
            <span className="font-mono font-bold">{memberCode}</span>
          ) : (
            'your Member ID'
          )}{' '}
          as the deposit reference/narration, so the Association can match your payment to your account.
        </div>
      )}
    </div>
  )
}
