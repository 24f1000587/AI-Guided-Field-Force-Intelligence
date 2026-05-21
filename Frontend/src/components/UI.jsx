import React from 'react'

// ── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, style, className = '' }) {
  return (
    <div className={`card ${className}`} style={{
      background: 'var(--white)',
      border: '1px solid var(--slate-200)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
      boxShadow: 'var(--shadow-sm)',
      ...style,
    }}>
      {children}
    </div>
  )
}

// ── Badge ────────────────────────────────────────────────────────────────────
const BADGE_STYLES = {
  high:    { bg: 'var(--red-100)',   color: 'var(--red-600)',   label: 'HIGH' },
  medium:  { bg: 'var(--amber-200)', color: 'var(--amber-600)', label: 'MEDIUM' },
  low:     { bg: 'var(--green-100)', color: 'var(--green-700)', label: 'LOW' },
  ok:      { bg: 'var(--green-100)', color: 'var(--green-700)', label: 'OK' },
  critical: { bg: 'var(--red-100)',  color: 'var(--red-600)',   label: 'CRITICAL' },
  active:  { bg: 'var(--green-100)', color: 'var(--green-700)', label: 'ACTIVE' },
  default: { bg: 'var(--slate-100)', color: 'var(--slate-600)', label: '' },
}

export function Badge({ type = 'default', label }) {
  const s = BADGE_STYLES[type?.toLowerCase()] || BADGE_STYLES.default
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: '700',
      fontFamily: 'var(--font-display)',
      letterSpacing: '0.05em',
      background: s.bg,
      color: s.color,
    }}>
      {label || s.label || type?.toUpperCase()}
    </span>
  )
}

// ── Button ───────────────────────────────────────────────────────────────────
export function Button({ children, onClick, variant = 'primary', disabled, loading, style }) {
  const variants = {
    primary: {
      background: 'var(--green-600)',
      color: 'var(--white)',
      border: 'none',
    },
    secondary: {
      background: 'transparent',
      color: 'var(--green-700)',
      border: '1.5px solid var(--green-400)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--slate-600)',
      border: '1.5px solid var(--slate-200)',
    },
    danger: {
      background: 'var(--red-100)',
      color: 'var(--red-600)',
      border: 'none',
    },
  }
  const v = variants[variant] || variants.primary
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 20px',
        borderRadius: 'var(--radius-md)',
        fontFamily: 'var(--font-display)',
        fontWeight: '600',
        fontSize: '14px',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.2s',
        ...v,
        ...style,
      }}
    >
      {loading && <span className="loader" style={{ width: 14, height: 14 }} />}
      {children}
    </button>
  )
}

// ── Input ────────────────────────────────────────────────────────────────────
export function Input({ label, value, onChange, placeholder, type = 'text', style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--slate-600)', fontFamily: 'var(--font-display)' }}>{label}</label>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          border: '1.5px solid var(--slate-200)',
          background: 'var(--white)',
          fontSize: '14px',
          color: 'var(--slate-900)',
          outline: 'none',
          transition: 'border-color 0.2s',
          ...style,
        }}
        onFocus={e => e.target.style.borderColor = 'var(--green-500)'}
        onBlur={e => e.target.style.borderColor = 'var(--slate-200)'}
      />
    </div>
  )
}

// ── Select ───────────────────────────────────────────────────────────────────
export function Select({ label, value, onChange, options, placeholder, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--slate-600)', fontFamily: 'var(--font-display)' }}>{label}</label>}
      <select
        value={value}
        onChange={onChange}
        style={{
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          border: '1.5px solid var(--slate-200)',
          background: 'var(--white)',
          fontSize: '14px',
          color: 'var(--slate-900)',
          outline: 'none',
          cursor: 'pointer',
          ...style,
        }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
      </select>
    </div>
  )
}

// ── Stat ─────────────────────────────────────────────────────────────────────
export function Stat({ label, value, sub, accent }) {
  return (
    <div style={{
      background: accent ? 'var(--green-800)' : 'var(--slate-50)',
      borderRadius: 'var(--radius-md)',
      padding: '16px 20px',
      border: accent ? 'none' : '1px solid var(--slate-200)',
    }}>
      <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em', color: accent ? 'var(--green-300)' : 'var(--slate-400)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '26px', fontWeight: '800', fontFamily: 'var(--font-display)', color: accent ? 'var(--white)' : 'var(--slate-900)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: accent ? 'var(--green-300)' : 'var(--slate-400)', marginTop: '4px' }}>{sub}</div>}
    </div>
  )
}

// ── Loading ──────────────────────────────────────────────────────────────────
export function Loading({ text = 'Loading data...' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '60px 20px', color: 'var(--slate-400)' }}>
      <span className="loader" style={{ width: 32, height: 32, borderWidth: 3 }} />
      <span style={{ fontSize: '14px', fontFamily: 'var(--font-display)' }}>{text}</span>
    </div>
  )
}

// ── Error ────────────────────────────────────────────────────────────────────
export function ErrorBox({ message, onRetry }) {
  return (
    <div style={{
      background: 'var(--red-100)',
      border: '1px solid var(--red-400)',
      borderRadius: 'var(--radius-md)',
      padding: '20px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
    }}>
      <span style={{ fontSize: '20px' }}>⚠️</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '600', color: 'var(--red-600)', fontFamily: 'var(--font-display)' }}>Error</div>
        <div style={{ fontSize: '14px', color: 'var(--red-600)', marginTop: '2px' }}>{message}</div>
      </div>
      {onRetry && <Button onClick={onRetry} variant="ghost" style={{ fontSize: '13px', padding: '6px 14px' }}>Retry</Button>}
    </div>
  )
}

// ── Section Header ───────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, icon, actions }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
        {icon && <span style={{ fontSize: '28px', lineHeight: 1 }}>{icon}</span>}
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--slate-900)' }}>{title}</h2>
          {subtitle && <p style={{ fontSize: '14px', color: 'var(--slate-400)', marginTop: '2px' }}>{subtitle}</p>}
        </div>
      </div>
      {actions && <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>{actions}</div>}
    </div>
  )
}

// ── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--slate-400)' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>{icon || '📭'}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '16px', color: 'var(--slate-600)', marginBottom: '6px' }}>{title}</div>
      {subtitle && <div style={{ fontSize: '14px' }}>{subtitle}</div>}
    </div>
  )
}
