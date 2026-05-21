import React, { useEffect, useState } from 'react'
import { Card, Stat, Loading, ErrorBox, SectionHeader } from '../components/UI'
import { api } from '../utils/api'

const QUICK_STATS = [
  { label: 'Field Reps', value: '500', sub: 'Across India', icon: '👷' },
  { label: 'Retailers', value: '4,000', sub: 'Covered outlets', icon: '🏪' },
  { label: 'Growers', value: '6,000', sub: 'Active profiles', icon: '👨‍🌾' },
  { label: 'WhatsApp Msgs', value: '4,479', sub: 'Campaign reach', icon: '💬' },
]

const CROPS = [
  { crop: 'Wheat', product: 'Topik 15 WP', icon: '🌾', color: '#f0a830', id: 'CMP_RABI25_001' },
  { crop: 'Mustard', product: 'Score 250 EC', icon: '🌻', color: '#5dc880', id: 'CMP_RABI25_002' },
  { crop: 'Chickpea', product: 'Actara 25 WG', icon: '🫘', color: '#7a8fa8', id: 'CMP_RABI25_003' },
  { crop: 'Potato', product: 'Kavach 75 WP', icon: '🥔', color: '#c47a0a', id: 'CMP_RABI25_004' },
]

export default function Dashboard({ setPage }) {
  const [health, setHealth] = useState(null)
  const [anomalySummary, setAnomalySummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([api.health(), api.anomalySummary()])
      .then(([h, a]) => { setHealth(h); setAnomalySummary(a) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading text="Checking system status..." />
  if (error) return <ErrorBox message={error} />

  const dbOk = health?.checks?.database === 'ok'
  const dataLoaded = health?.checks?.data_loaded

  return (
    <div className="fade-in">
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, var(--green-900) 0%, var(--green-700) 60%, var(--green-500) 100%)',
        borderRadius: 'var(--radius-xl)',
        padding: '40px 48px',
        marginBottom: '32px',
        position: 'relative',
        overflow: 'hidden',
        color: 'var(--white)',
      }}>
        <div style={{ position: 'absolute', top: '-40px', right: '-20px', fontSize: '160px', opacity: 0.07, lineHeight: 1 }}>🌾</div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '0.12em', color: 'var(--green-300)', textTransform: 'uppercase', marginBottom: '8px' }}>Rabi Season 2025–26</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: '800', marginBottom: '12px', lineHeight: 1.15 }}>AI-Guided Field Force<br />Intelligence System</h1>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', maxWidth: '560px', lineHeight: 1.7, marginBottom: '24px' }}>
            Real-time visit planning, next-best-action recommendations, anomaly detection, and grower intelligence — all powered by AI.
          </p>
          {/* <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.12)', borderRadius: 'var(--radius-sm)', padding: '6px 14px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: dbOk ? 'var(--green-400)' : 'var(--red-400)', display: 'inline-block' }} />
              <span style={{ fontSize: '13px' }}>Database {dbOk ? 'Connected' : 'Disconnected'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.12)', borderRadius: 'var(--radius-sm)', padding: '6px 14px' }}>
              <span style={{ fontSize: '13px' }}>📊 {dataLoaded ? 'All data loaded' : 'Data loading...'}</span>
            </div>
          </div> */}
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {QUICK_STATS.map(s => (
          <Card key={s.label} style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>{s.icon}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: '800', color: 'var(--slate-900)' }}>{s.value}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: '700', color: 'var(--slate-700)', marginTop: '2px' }}>{s.label}</div>
            <div style={{ fontSize: '12px', color: 'var(--slate-400)', marginTop: '2px' }}>{s.sub}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Alert Summary */}
        {anomalySummary && (
          <Card>
            <SectionHeader title="Live Alerts" icon="🚨" subtitle="System-wide anomalies" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <Stat label="High Priority" value={anomalySummary.high_priority} accent />
              <Stat label="Medium" value={anomalySummary.medium_priority} />
              <Stat label="Low" value={anomalySummary.low_priority} />
              <Stat label="Total Alerts" value={anomalySummary.total_alerts} />
            </div>
            {anomalySummary.top_affected_territories?.length > 0 && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--slate-400)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px', fontFamily: 'var(--font-display)' }}>Top Affected Territories</div>
                {anomalySummary.top_affected_territories.slice(0, 4).map(t => (
                  <div key={t.territory_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--slate-100)' }}>
                    <span style={{ fontSize: '13px', color: 'var(--slate-700)' }}>{t.territory_id}</span>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--red-600)', background: 'var(--red-100)', padding: '2px 8px', borderRadius: '10px' }}>{t.high_alert_count} HIGH</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setPage('anomalies')} style={{ marginTop: '16px', width: '100%', padding: '10px', background: 'var(--red-100)', color: 'var(--red-600)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '13px', cursor: 'pointer', border: 'none' }}>
              View All Alerts →
            </button>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <SectionHeader title="Quick Access" icon="⚡" subtitle="Jump to key features" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { icon: '🗺️', label: 'Plan Today\'s Visits', sub: 'Smart route for your territory', page: 'visit-plan', color: 'var(--green-50)', border: 'var(--green-300)', accent: 'var(--green-700)' },
              { icon: '🤖', label: 'Get AI Recommendation', sub: 'Next best action at a retailer', page: 'nba', color: 'var(--amber-50)', border: 'var(--amber-200)', accent: 'var(--amber-600)' },
              { icon: '👨‍🌾', label: 'Grower Intel by Tehsil', sub: 'Farmer profiles & crop stages', page: 'growers', color: 'var(--slate-50)', border: 'var(--slate-200)', accent: 'var(--slate-700)' },
              { icon: '📣', label: 'Campaign Analytics', sub: 'Funnel, WhatsApp, POS data', page: 'campaigns', color: 'var(--slate-50)', border: 'var(--slate-200)', accent: 'var(--slate-700)' },
            ].map(item => (
              <button key={item.page} onClick={() => setPage(item.page)} style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 16px', borderRadius: 'var(--radius-md)',
                background: item.color, border: `1px solid ${item.border}`,
                cursor: 'pointer', textAlign: 'left', width: '100%',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
              >
                <span style={{ fontSize: '22px' }}>{item.icon}</span>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '14px', color: item.accent }}>{item.label}</div>
                  <div style={{ fontSize: '12px', color: 'var(--slate-400)', marginTop: '1px' }}>{item.sub}</div>
                </div>
                <span style={{ marginLeft: 'auto', color: 'var(--slate-300)', fontSize: '16px' }}>→</span>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Campaigns overview */}
      <Card>
        <SectionHeader title="Active Rabi Campaigns" icon="📣" subtitle="4 campaigns running this season" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
          {CROPS.map(c => (
            <div key={c.id} style={{
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              background: 'var(--slate-50)',
              border: '1px solid var(--slate-200)',
              borderTop: `3px solid ${c.color}`,
            }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>{c.icon}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '15px', color: 'var(--slate-900)', textTransform: 'capitalize' }}>{c.crop}</div>
              <div style={{ fontSize: '12px', color: 'var(--slate-500)', marginTop: '4px' }}>{c.product}</div>
              <div style={{ fontSize: '10px', color: 'var(--slate-400)', marginTop: '4px', fontFamily: 'var(--font-display)' }}>{c.id}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
