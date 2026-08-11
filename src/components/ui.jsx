// Small shared UI primitives, styled from the design tokens in index.css.
export function Button({ children, variant = 'primary', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-forest text-canvas hover:bg-forest-dark',
    secondary: 'bg-khaki text-ink hover:bg-khaki-dark',
    ghost: 'bg-transparent text-forest hover:bg-canvas-2 border border-forest/30',
    danger: 'bg-ember text-canvas hover:opacity-90',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white/70 border border-khaki/50 rounded-2xl p-5 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

export function Field({ label, children, hint }) {
  return (
    <label className="block mb-4">
      <span className="block text-sm font-medium text-ink/80 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-ink/50 mt-1">{hint}</span>}
    </label>
  )
}

export function Input(props) {
  return (
    <input
      className="w-full rounded-lg border border-khaki-dark/60 bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-forest/40 focus:border-forest"
      {...props}
    />
  )
}

export function Select({ children, ...props }) {
  return (
    <select
      className="w-full rounded-lg border border-khaki-dark/60 bg-white px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-forest/40 focus:border-forest"
      {...props}
    >
      {children}
    </select>
  )
}

export function StatusPill({ status }) {
  const map = {
    pending: 'bg-clay-light text-clay',
    verified: 'bg-moss-light text-moss',
    rejected: 'bg-ember-light text-ember',
  }
  const labels = { pending: 'Pending', verified: 'Verified', rejected: 'Rejected' }
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${map[status] || 'bg-khaki text-ink'}`}>
      {labels[status] || status}
    </span>
  )
}

// The signature element: a circular scout-badge rendering of a member's
// auto-generated ID. Used on the member dashboard and on printed receipts.
export function MemberBadge({ code, name, size = 128 }) {
  return (
    <div
      className="stitched flex flex-col items-center justify-center bg-forest text-canvas text-center shrink-0"
      style={{ width: size, height: size }}
    >
      <span className="font-display text-[0.65em] leading-none opacity-80 mb-1">UGANDA SCOUTS</span>
      <span className="font-display font-bold text-[1.1em] leading-tight px-2">{code || '—'}</span>
      {name && <span className="text-[0.55em] opacity-80 mt-1 px-2 truncate max-w-[90%]">{name}</span>}
    </div>
  )
}

export function EmptyState({ title, hint }) {
  return (
    <div className="text-center py-12 text-ink/50">
      <p className="font-medium text-ink/70">{title}</p>
      {hint && <p className="text-sm mt-1">{hint}</p>}
    </div>
  )
}
