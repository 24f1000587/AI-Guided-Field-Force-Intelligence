import React, { useState, useEffect } from 'react'
import { Card, Button, Loading, ErrorBox, SectionHeader, Badge, Stat } from '../components/UI'
import { api } from '../utils/api'

const TYPE_META = {
  STOCKOUT_RISK: { icon: '📦', label: 'Stockout Risk', color: 'var(--red-600)', bg: 'var(--red-100)' },
  DEMAND_SPIKE:  { icon: '📈', label: 'Demand Spike',  color: 'var(--amber-600)', bg: 'var(--amber-200)' },
  DEAD_STOCK:    { icon: '🪦', label: 'Dead Stock',    color: 'var(--slate-600)', bg: 'var(--slate-100)' },
  COVERAGE_GAP:  { icon: '🔍', label: 'Coverage Gap',  color: 'var(--green-700)', bg: 'var(--green-100)' },
}

function AlertCard({ alert }) {
  const meta = TYPE_META[alert.type] || { icon: '⚠️', label: alert.type, color: 'var(--slate-600)', bg: 'var(--slate-100)' }
  const sev = alert.severity?.toLowerCase()

  return (
    <div style={{
      border: '1px solid var(--slate-200)',
      borderLeft: `4px solid ${meta.color}`,
      borderRadius: 'var(--radius-md)',
      padding: '16px 20px',
      background: 'var(--white)',
      display: 'flex', gap: '14px', alignItems: 'flex-start',
    }}>
      <span style={{
        fontSize: '22px', width: '40px', height: '40px',
        background: meta.bg, borderRadius: 'var(--radius-sm)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>{meta.icon}</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '13px', color: meta.color }}>{meta.label}</span>
          <Badge type={sev} label={alert.severity} />
          {alert.sku && <span style={{ fontSize: '11px', background: 'var(--slate-100)', color: 'var(--slate-600)', padding: '2px 8px', borderRadius: '10px', fontWeight: '600' }}>{alert.sku}</span>}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--slate-700)', lineHeight: 1.5 }}>{alert.message}</div>
        <div style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: 'var(--slate-400)' }}>📍 {alert.location}</span>
          <span style={{ fontSize: '11px', color: 'var(--slate-400)' }}>Territory: {alert.territory_id}</span>
          {alert.weeks_of_cover != null && (
            <span style={{ fontSize: '11px', color: 'var(--red-600)', fontWeight: '600' }}>
              {alert.weeks_of_cover}w of stock remaining
            </span>
          )}
          {alert.spike_multiple && (
            <span style={{ fontSize: '11px', color: 'var(--amber-600)', fontWeight: '600' }}>
              {alert.spike_multiple}× normal demand
            </span>
          )}
          {alert.days_since_visit && (
            <span style={{ fontSize: '11px', color: 'var(--green-700)', fontWeight: '600' }}>
              {alert.days_since_visit} days since last visit
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Anomalies() {
  const [summary, setSummary] = useState(null)
  const [alerts, setAlerts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterSeverity, setFilterSeverity] = useState('ALL')
  const [filterType, setFilterType] = useState('ALL')
  const [territory, setTerritory] = useState('')

  useEffect(() => {
    api.anomalySummary()
      .then(setSummary)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const fetchAlerts = async () => {
    setLoading(true); setError(null)
    try {
      const params = {}
      if (territory) params.territory_id = territory
      if (filterSeverity !== 'ALL') params.severity = filterSeverity
      if (filterType !== 'ALL') params.alert_type = filterType
      const res = await api.anomalies(params)
      setAlerts(res)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const displayed = alerts?.alerts || []

  return (
    <div className="fade-in">
      {/* Summary banner */}
      {summary && (
        <div style={{
          background: 'linear-gradient(135deg, var(--slate-800), var(--slate-700))',
          borderRadius: 'var(--radius-xl)',
          padding: '28px 32px',
          marginBottom: '28px',
          color: 'var(--white)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <span style={{ fontSize: '28px' }}>🚨</span>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '20px' }}>System-wide Anomaly Summary</h2>
              <div style={{ fontSize: '13px', color: 'var(--slate-300)', marginTop: '2px' }}>Across all territories · Anchored to Mar 29, 2026</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div style={{ background: 'rgba(248,113,113,0.2)', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid rgba(248,113,113,0.3)' }}>
              <div style={{ fontSize: '32px', fontWeight: '800', fontFamily: 'var(--font-display)', color: '#f87171' }}>{summary.high_priority}</div>
              <div style={{ fontSize: '12px', color: 'var(--slate-300)', marginTop: '4px' }}>HIGH Priority</div>
            </div>
            <div style={{ background: 'rgba(240,168,48,0.2)', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid rgba(240,168,48,0.3)' }}>
              <div style={{ fontSize: '32px', fontWeight: '800', fontFamily: 'var(--font-display)', color: '#f0a830' }}>{summary.medium_priority}</div>
              <div style={{ fontSize: '12px', color: 'var(--slate-300)', marginTop: '4px' }}>MEDIUM Priority</div>
            </div>
            <div style={{ background: 'rgba(93,200,128,0.2)', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid rgba(93,200,128,0.3)' }}>
              <div style={{ fontSize: '32px', fontWeight: '800', fontFamily: 'var(--font-display)', color: '#5dc880' }}>{summary.low_priority}</div>
              <div style={{ fontSize: '12px', color: 'var(--slate-300)', marginTop: '4px' }}>LOW Priority</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div style={{ fontSize: '32px', fontWeight: '800', fontFamily: 'var(--font-display)' }}>{summary.total_alerts}</div>
              <div style={{ fontSize: '12px', color: 'var(--slate-300)', marginTop: '4px' }}>Total Alerts</div>
            </div>
          </div>
        </div>
      )}

      {/* Type breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {Object.entries(TYPE_META).map(([type, meta]) => (
          <button key={type} onClick={() => { setFilterType(filterType === type ? 'ALL' : type) }} style={{
            border: `2px solid ${filterType === type ? meta.color : 'var(--slate-200)'}`,
            borderRadius: 'var(--radius-md)', padding: '14px 16px',
            background: filterType === type ? meta.bg : 'var(--white)',
            cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
          }}>
            <div style={{ fontSize: '22px', marginBottom: '6px' }}>{meta.icon}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '12px', color: meta.color }}>{meta.label}</div>
            <div style={{ fontSize: '11px', color: 'var(--slate-400)', marginTop: '2px' }}>Click to filter</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '160px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--slate-600)', fontFamily: 'var(--font-display)', display: 'block', marginBottom: '6px' }}>Severity</label>
            <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--slate-200)', fontSize: '14px', cursor: 'pointer', outline: 'none' }}>
              <option value="ALL">All Severities</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>
          <div style={{ flex: '2', minWidth: '160px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--slate-600)', fontFamily: 'var(--font-display)', display: 'block', marginBottom: '6px' }}>Territory ID (optional)</label>
            <input value={territory} onChange={e => setTerritory(e.target.value)} placeholder="e.g. TER_0001" style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--slate-200)', fontSize: '14px', outline: 'none' }} />
          </div>
          <Button onClick={fetchAlerts} loading={loading && !!alerts}>Fetch Alerts</Button>
        </div>
      </Card>

      {error && <ErrorBox message={error} />}
      {loading && !alerts && <Loading text="Scanning for anomalies..." />}

      {/* Alert list */}
      {displayed.length > 0 && (
        <div className="fade-in">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '15px', color: 'var(--slate-700)' }}>
              {alerts.total_alerts} alerts found
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              {Object.entries(alerts.summary || {}).map(([type, count]) => (
                <span key={type} style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '10px', background: TYPE_META[type]?.bg || 'var(--slate-100)', color: TYPE_META[type]?.color || 'var(--slate-600)', fontWeight: '700' }}>
                  {count} {TYPE_META[type]?.label || type}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {displayed.map((a, i) => <AlertCard key={i} alert={a} />)}
          </div>
        </div>
      )}

      {alerts && displayed.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--slate-400)' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700' }}>No alerts match your filters</div>
        </div>
      )}

      {!alerts && !loading && !error && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--slate-400)' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '15px', color: 'var(--slate-600)', marginBottom: '6px' }}>Click "Fetch Alerts" to load anomaly data</div>
          <div style={{ fontSize: '13px' }}>Filter by severity, type, or territory</div>
        </div>
      )}
    </div>
  )
}
