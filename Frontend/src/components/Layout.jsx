import React from 'react'

const NAV = [
  { id: 'dashboard',   icon: '⚡', label: 'Dashboard',         sub: 'Overview' },
  { id: 'visit-plan',  icon: '🗺️', label: 'Visit Planner',     sub: 'Smart routing' },
  { id: 'nba',         icon: '🤖', label: 'Next Best Action',  sub: 'AI advisor' },
  { id: 'anomalies',   icon: '🚨', label: 'Alerts',            sub: 'Anomaly detection' },
  { id: 'growers',     icon: '👨‍🌾', label: 'Grower Intel',      sub: 'Farmer insights' },
  { id: 'campaigns',   icon: '📣', label: 'Campaigns',         sub: 'Marketing analytics' },
]

export default function Layout({ page, setPage, children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--slate-50)' }}>
      {/* Sidebar */}
      <aside style={{
        width: '240px',
        flexShrink: 0,
        background: 'var(--green-900)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        zIndex: 100,
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Logo */}
        <div style={{ padding: '28px 24px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{
              width: '36px', height: '36px',
              background: 'var(--green-500)',
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px',
            }}>🌾</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '15px', color: 'var(--white)', lineHeight: 1.1 }}>Syngenta</div>
              <div style={{ fontSize: '10px', color: 'var(--green-400)', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Field Intelligence</div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '0 16px 12px' }} />

        {/* Nav */}
        <nav style={{ flex: 1, padding: '4px 12px', overflowY: 'auto' }}>
          {NAV.map(item => {
            const active = page === item.id
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 12px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '2px',
                  background: active ? 'rgba(90,200,128,0.18)' : 'transparent',
                  border: active ? '1px solid rgba(90,200,128,0.25)' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  textAlign: 'left',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ fontSize: '18px', lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '13px', color: active ? 'var(--green-300)' : 'var(--slate-300)', lineHeight: 1.1 }}>{item.label}</div>
                  <div style={{ fontSize: '11px', color: active ? 'var(--green-400)' : 'var(--slate-400)', marginTop: '2px' }}>{item.sub}</div>
                </div>
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '11px', color: 'var(--green-400)', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '4px' }}>Season</div>
          <div style={{ fontSize: '13px', color: 'var(--slate-300)' }}>Rabi 2025–26</div>
          <div style={{ fontSize: '11px', color: 'var(--slate-500)', marginTop: '4px' }}>Oct 2025 – Apr 2026</div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ marginLeft: '240px', flex: 1, minWidth: 0, padding: '0' }}>
        {/* Top bar */}
        <div style={{
          position: 'sticky',
          top: 0,
          background: 'rgba(245, 248, 252, 0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--slate-200)',
          padding: '16px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
        }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '18px', color: 'var(--slate-900)' }}>
              {NAV.find(n => n.id === page)?.label || 'Dashboard'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--slate-400)', marginTop: '1px' }}>
              {NAV.find(n => n.id === page)?.sub}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'var(--green-50)', border: '1px solid var(--green-300)',
              borderRadius: 'var(--radius-sm)', padding: '5px 12px',
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green-500)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              {/* <span style={{ fontSize: '12px', color: 'var(--green-700)', fontWeight: '600' }}>Live</span> */}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--slate-400)' }}>Data: Mar 29, 2026</div>
          </div>
        </div>

        {/* Page content */}
        <div style={{ padding: '32px' }} className="fade-in">
          {children}
        </div>
      </main>
    </div>
  )
}
