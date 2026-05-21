import React, { useState } from 'react'
import { Card, Button, Input, Loading, ErrorBox, SectionHeader, Badge, Stat } from '../components/UI'
import { api } from '../utils/api'

function UrgencyPill({ urgency }) {
  const styles = {
    HIGH: { bg: 'var(--red-600)', color: '#fff', icon: '🔴' },
    MEDIUM: { bg: 'var(--amber-400)', color: '#000', icon: '🟡' },
    LOW: { bg: 'var(--green-500)', color: '#fff', icon: '🟢' },
  }
  const s = styles[urgency] || styles.LOW
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '4px 14px', borderRadius: '20px',
      background: s.bg, color: s.color,
      fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '13px',
    }}>
      {s.icon} {urgency} URGENCY
    </span>
  )
}

function InventoryRow({ item }) {
  const statusColor = {
    'OUT OF STOCK': 'var(--red-600)', CRITICAL: 'var(--red-600)',
    LOW: 'var(--amber-600)', OK: 'var(--green-700)',
  }[item.status] || 'var(--slate-600)'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '10px 0',
      borderBottom: '1px solid var(--slate-100)', gap: '12px',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--slate-900)' }}>{item.sku_name}</div>
        <div style={{ fontSize: '11px', color: 'var(--slate-400)', marginTop: '2px' }}>
          {item.avg_weekly_sales} units/week avg
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--slate-900)' }}>{item.sku_qty} units</div>
        {item.weeks_of_cover != null && (
          <div style={{ fontSize: '11px', color: 'var(--slate-400)' }}>{item.weeks_of_cover}w cover</div>
        )}
      </div>
      <span style={{
        fontSize: '11px', fontWeight: '700', padding: '2px 8px',
        borderRadius: '10px', background: statusColor + '20', color: statusColor,
        minWidth: '80px', textAlign: 'center',
      }}>{item.status}</span>
    </div>
  )
}

export default function NextBestAction() {
  const [retailerId, setRetailerId] = useState('RTL_00001')
  const [ctx, setCtx] = useState(null)
  const [rec, setRec] = useState(null)
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('recommendation')

  const fetchContext = async () => {
    if (!retailerId.trim()) return
    setLoading(true); setError(null); setCtx(null); setRec(null)
    try {
      const c = await api.retailerContext(retailerId.trim())
      setCtx(c)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchAI = async () => {
    setAiLoading(true); setError(null)
    try {
      const r = await api.nextBestAction(retailerId.trim())
      setRec(r.recommendation)
    } catch (e) {
      setError(e.message)
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="fade-in">
      <Card style={{ marginBottom: '24px' }}>
        <SectionHeader
          title="Next Best Action Advisor"
          icon="🤖"
          subtitle="AI-powered recommendations for what to do and say at each retailer visit"
        />
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Input
              label="Retailer ID"
              value={retailerId}
              onChange={e => setRetailerId(e.target.value)}
              placeholder="e.g. RTL_00001"
            />
          </div>
          <Button onClick={fetchContext} loading={loading}>Load Retailer</Button>
        </div>
        <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--slate-400)' }}>
          Try: RTL_00001 through RTL_04000
        </div>
      </Card>

      {error && <ErrorBox message={error} />}
      {loading && <Loading text="Loading retailer context..." />}

      {ctx && !loading && (
        <div className="fade-in">
          {/* Retailer header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '20px', color: 'var(--slate-900)' }}>{ctx.retailer_id}</h3>
              <div style={{ fontSize: '14px', color: 'var(--slate-500)', marginTop: '4px' }}>
                📍 {ctx.location?.tehsil}, {ctx.location?.district}, {ctx.location?.state}
              </div>
            </div>
            {!rec && (
              <Button onClick={fetchAI} loading={aiLoading} style={{ background: 'var(--green-800)' }}>
                🤖 Generate AI Recommendation
              </Button>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0', marginBottom: '20px', background: 'var(--slate-100)', borderRadius: 'var(--radius-md)', padding: '4px' }}>
            {[
              { id: 'recommendation', label: '🤖 AI Recommendation' },
              { id: 'inventory', label: '📦 Inventory' },
              { id: 'sales', label: '💰 Recent Sales' },
              { id: 'growers', label: '👨‍🌾 Nearby Growers' },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                background: tab === t.id ? 'var(--white)' : 'transparent',
                boxShadow: tab === t.id ? 'var(--shadow-sm)' : 'none',
                fontFamily: 'var(--font-display)', fontWeight: '600', fontSize: '13px',
                color: tab === t.id ? 'var(--slate-900)' : 'var(--slate-500)',
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              }}>{t.label}</button>
            ))}
          </div>

          {tab === 'recommendation' && (
            <div className="fade-in">
              {aiLoading && <Loading text="Claude is analyzing the retailer context..." />}
              {!rec && !aiLoading && (
                <Card style={{ textAlign: 'center', padding: '48px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '16px', color: 'var(--slate-700)', marginBottom: '8px' }}>Ready to generate AI recommendation</div>
                  <div style={{ fontSize: '14px', color: 'var(--slate-400)', marginBottom: '24px' }}>Click the button above to get a personalized action plan for this retailer</div>
                  <Button onClick={fetchAI} loading={aiLoading}>🤖 Generate Now</Button>
                </Card>
              )}
              {rec && !aiLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Primary action + Urgency */}
                  <Card style={{ background: 'var(--green-900)', border: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.1em', color: 'var(--green-300)', textTransform: 'uppercase', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>Primary Action</div>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--white)', fontFamily: 'var(--font-display)', lineHeight: 1.4 }}>{rec.primary_action}</div>
                      </div>
                      <UrgencyPill urgency={rec.urgency} />
                    </div>
                  </Card>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {/* Products to discuss */}
                    <Card>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--slate-400)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px', fontFamily: 'var(--font-display)' }}>Products to Discuss</div>
                      {rec.products_to_discuss?.map(p => (
                        <div key={p} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--slate-100)' }}>
                          <span style={{ fontSize: '16px' }}>💊</span>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--slate-800)' }}>{p}</span>
                        </div>
                      ))}
                    </Card>

                    {/* Reorder */}
                    <Card>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--slate-400)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px', fontFamily: 'var(--font-display)' }}>Reorder Suggestion</div>
                      {rec.reorder_suggestion ? (
                        <div style={{ background: 'var(--amber-50)', border: '1px solid var(--amber-200)', borderRadius: 'var(--radius-sm)', padding: '12px', fontSize: '13px', color: 'var(--amber-600)', lineHeight: 1.6 }}>
                          📦 {rec.reorder_suggestion}
                        </div>
                      ) : (
                        <div style={{ fontSize: '13px', color: 'var(--slate-400)' }}>No reorder needed at this time</div>
                      )}
                    </Card>
                  </div>

                  {/* Talking point */}
                  <Card style={{ borderLeft: '4px solid var(--green-500)' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--slate-400)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px', fontFamily: 'var(--font-display)' }}>💬 Talking Point (say this to the retailer)</div>
                    <div style={{ fontSize: '14px', color: 'var(--slate-700)', lineHeight: 1.7, fontStyle: 'italic' }}>"{rec.talking_point}"</div>
                  </Card>

                  {/* Agronomic advice */}
                  <Card style={{ borderLeft: '4px solid var(--amber-400)' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--slate-400)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px', fontFamily: 'var(--font-display)' }}>🌱 Agronomic Advice (pass to farmers)</div>
                    <div style={{ fontSize: '14px', color: 'var(--slate-700)', lineHeight: 1.7 }}>{rec.agronomic_advice}</div>
                  </Card>

                  <Button onClick={fetchAI} loading={aiLoading} variant="secondary" style={{ alignSelf: 'flex-start' }}>
                    🔄 Regenerate Recommendation
                  </Button>
                </div>
              )}
            </div>
          )}

          {tab === 'inventory' && (
            <Card className="fade-in">
              <SectionHeader title="Current Inventory" subtitle={`${ctx.data_snapshot?.inventory_items || 0} SKUs tracked`} icon="📦" />
              {ctx.inventory?.length ? ctx.inventory.map(item => <InventoryRow key={item.sku_name} item={item} />) : <div style={{ color: 'var(--slate-400)', fontSize: '14px' }}>No inventory data</div>}
            </Card>
          )}

          {tab === 'sales' && (
            <Card className="fade-in">
              <SectionHeader title="Recent Sales (Last 4 Weeks)" subtitle={`${ctx.data_snapshot?.recent_sales_skus || 0} SKUs sold`} icon="💰" />
              {ctx.recent_sales_last_4_weeks?.length ? (
                <div>
                  {ctx.recent_sales_last_4_weeks.map(s => (
                    <div key={s.sku_name} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--slate-100)', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--slate-900)' }}>{s.sku_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--slate-400)' }}>{s.transactions} transactions · avg ₹{s.avg_price}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--green-700)', fontFamily: 'var(--font-display)' }}>{s.total_qty} units</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div style={{ color: 'var(--slate-400)', fontSize: '14px' }}>No recent sales data</div>}
            </Card>
          )}

          {tab === 'growers' && (
            <Card className="fade-in">
              <SectionHeader title="Nearby Growers" subtitle="Farmers in this tehsil" icon="👨‍🌾" />
              {ctx.nearby_growers?.length ? (
                <div>
                  {ctx.nearby_growers.map((g, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--slate-100)', gap: '12px' }}>
                      <span style={{ fontSize: '20px' }}>🌾</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--slate-900)', textTransform: 'capitalize' }}>{g.crop}</div>
                        <div style={{ fontSize: '11px', color: 'var(--slate-400)' }}>{g.language} · {g.count} farmers · avg {g.avg_farm_size} acres</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div style={{ color: 'var(--slate-400)', fontSize: '14px' }}>No grower data for this tehsil</div>}
            </Card>
          )}
        </div>
      )}

      {!ctx && !loading && !error && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🤖</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '18px', color: 'var(--slate-600)', marginBottom: '8px' }}>Enter a Retailer ID to load context</div>
          <div style={{ fontSize: '14px', color: 'var(--slate-400)' }}>The AI will analyze inventory, sales data, and nearby farmer profiles to generate a recommendation</div>
        </div>
      )}
    </div>
  )
}
