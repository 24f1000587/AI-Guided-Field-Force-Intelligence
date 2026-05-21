import React, { useState } from 'react'
import { Card, Button, Input, Loading, ErrorBox, SectionHeader, Badge, Stat } from '../components/UI'
import { api } from '../utils/api'

function PriorityBar({ score }) {
  const color = score >= 70 ? 'var(--red-600)' : score >= 40 ? 'var(--amber-600)' : 'var(--green-600)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ flex: 1, height: '6px', background: 'var(--slate-100)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: '13px', fontWeight: '800', color, fontFamily: 'var(--font-display)', minWidth: '34px', textAlign: 'right' }}>{score}</span>
    </div>
  )
}

function VisitCard({ item, rank }) {
  const [open, setOpen] = useState(false)
  const priority = item.priority_score >= 70 ? 'high' : item.priority_score >= 40 ? 'medium' : 'low'
  const priorityLabel = priority === 'high' ? 'HIGH' : priority === 'medium' ? 'MEDIUM' : 'LOW'

  return (
    <div style={{
      border: '1px solid var(--slate-200)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      background: 'var(--white)',
      transition: 'box-shadow 0.2s',
    }}
    onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div
        onClick={() => setOpen(!open)}
        style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px' }}
      >
        {/* Rank */}
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: rank <= 3 ? 'var(--green-800)' : 'var(--slate-100)',
          color: rank <= 3 ? 'var(--white)' : 'var(--slate-500)',
          fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '13px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>{rank}</div>

        {/* Location */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '14px', color: 'var(--slate-900)' }}>
            {item.retailer_id}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--slate-500)', marginTop: '2px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span>📍 {item.tehsil}</span>
            <span>·</span>
            <span>{item.district}, {item.state}</span>
          </div>
        </div>

        {/* Priority badge */}
        <Badge type={priority} label={priorityLabel} />

        {/* Score bar */}
        <div style={{ width: '140px' }}>
          <PriorityBar score={item.priority_score} />
        </div>

        {/* Chevron */}
        <span style={{ fontSize: '12px', color: 'var(--slate-400)', transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>▾</span>
      </div>

      {open && (
        <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--slate-100)', background: 'var(--slate-50)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '16px', marginBottom: '14px' }}>
            <Stat label="Days Since Visit" value={item.days_since_last_visit === 180 ? '180+' : item.days_since_last_visit} />
            <Stat label="Weeks of Cover" value={item.weeks_of_cover ?? 'N/A'} />
            <Stat label="Weekly Sales" value={`${item.weekly_sales_units} u`} />
          </div>
          {item.critical_sku && (
            <div style={{ background: 'var(--red-100)', border: '1px solid var(--red-400)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', color: 'var(--red-600)', fontWeight: '600' }}>⚠️ Critical SKU: {item.critical_sku}</span>
            </div>
          )}
          <div style={{ fontSize: '13px', color: 'var(--slate-600)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--slate-900)' }}>Why visit: </strong>{item.reason}
          </div>
          {item.inventory_decline_pct > 0 && (
            <div style={{ fontSize: '12px', color: 'var(--amber-600)', marginTop: '6px' }}>
              📉 Inventory declining {item.inventory_decline_pct}% week-over-week
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function VisitPlanner() {
  const [repId, setRepId] = useState('REP_0001')
  const [date, setDate] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchPlan = async () => {
    if (!repId.trim()) return
    setLoading(true); setError(null)
    try {
      const res = await api.visitPlan(repId.trim(), date || null)
      setData(res)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const highCount = data?.visit_plan?.filter(r => r.priority_score >= 70).length || 0
  const medCount = data?.visit_plan?.filter(r => r.priority_score >= 40 && r.priority_score < 70).length || 0

  return (
    <div className="fade-in">
      {/* Controls */}
      <Card style={{ marginBottom: '24px' }}>
        <SectionHeader
          title="Smart Visit Planner"
          icon="🗺️"
          subtitle="AI-ranked outlets based on stockout risk, sales velocity & coverage gaps"
        />
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: '2', minWidth: '180px' }}>
            <Input
              label="Representative ID"
              value={repId}
              onChange={e => setRepId(e.target.value)}
              placeholder="e.g. REP_0001"
            />
          </div>
          <div style={{ flex: '1', minWidth: '140px' }}>
            <Input
              label="Plan Date (optional)"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>
          <Button onClick={fetchPlan} loading={loading} style={{ flexShrink: 0 }}>
            Generate Plan
          </Button>
        </div>
        <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--slate-400)' }}>
          Try: REP_0001 through REP_0500 · Leave date blank to use latest data (Mar 29, 2026)
        </div>
      </Card>

      {error && <ErrorBox message={error} />}

      {loading && <Loading text="Calculating optimal visit route..." />}

      {data && !loading && (
        <div className="fade-in">
          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <Stat label="Rep ID" value={data.rep_id} accent />
            <Stat label="Total Recommendations" value={data.total_recommendations} />
            <Stat label="High Priority" value={highCount} sub="Score ≥ 70" />
            <Stat label="Medium Priority" value={medCount} sub="Score 40–69" />
          </div>

          {/* Scoring legend */}
          <Card style={{ marginBottom: '20px', padding: '16px 20px' }}>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--slate-400)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Scoring weights:</span>
              {[
                { label: 'Stockout Risk', pct: '35%', color: 'var(--red-600)' },
                { label: 'Visit Recency', pct: '25%', color: 'var(--amber-600)' },
                { label: 'Sales Velocity', pct: '25%', color: 'var(--green-600)' },
                { label: 'Inventory Trend', pct: '15%', color: 'var(--slate-600)' },
              ].map(w => (
                <div key={w.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: w.color, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: 'var(--slate-600)' }}>{w.label} <strong style={{ color: w.color }}>{w.pct}</strong></span>
                </div>
              ))}
            </div>
          </Card>

          {/* Visit list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data.visit_plan.map((item, i) => (
              <VisitCard key={item.retailer_id} item={item} rank={i + 1} />
            ))}
          </div>
        </div>
      )}

      {!data && !loading && !error && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🗺️</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '18px', color: 'var(--slate-600)', marginBottom: '8px' }}>Enter a Rep ID to generate today's visit plan</div>
          <div style={{ fontSize: '14px', color: 'var(--slate-400)' }}>The AI will rank retailers based on stockout risk, coverage gaps, and sales velocity</div>
        </div>
      )}
    </div>
  )
}
