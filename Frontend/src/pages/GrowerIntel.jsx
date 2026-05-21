import React, { useState, useEffect } from 'react'
import { Card, Button, Loading, ErrorBox, SectionHeader, Stat, Badge } from '../components/UI'
import { api } from '../utils/api'

const CROP_ICONS = { wheat: '🌾', mustard: '🌻', chickpea: '🫘', potato: '🥔', lentil: '🌿', rice: '🍚', safflower: '🌼' }
const LANG_FLAGS = { Hindi: '🇮🇳', Punjabi: '🟡', Marathi: '🟠', Gujarati: '🔵', Kannada: '🟢', Telugu: '🔴', Tamil: '🟣', Bengali: '🔴' }

function CropBar({ crop, count, total, acres }) {
  const pct = total ? (count / total * 100).toFixed(0) : 0
  const icon = CROP_ICONS[crop?.toLowerCase()] || '🌱'
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>{icon}</span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: '600', fontSize: '14px', color: 'var(--slate-900)', textTransform: 'capitalize' }}>{crop || 'Unknown'}</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--slate-500)' }}>avg {acres} ac</span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '13px', color: 'var(--green-700)' }}>{count} farmers</span>
        </div>
      </div>
      <div style={{ height: '6px', background: 'var(--slate-100)', borderRadius: '3px' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--green-500)', borderRadius: '3px', transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

function StageChip({ crop, info }) {
  const isActive = info.days_away <= 0
  const icon = CROP_ICONS[crop?.toLowerCase()] || '🌱'
  return (
    <div style={{
      border: `1.5px solid ${isActive ? 'var(--green-400)' : 'var(--slate-200)'}`,
      borderRadius: 'var(--radius-md)',
      padding: '12px 16px',
      background: isActive ? 'var(--green-50)' : 'var(--white)',
    }}>
      <div style={{ display: 'flex', items: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '16px' }}>{icon}</span>
        <Badge type={isActive ? 'active' : 'default'} label={isActive ? 'ACTIVE' : info.status} />
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '13px', color: 'var(--slate-900)', textTransform: 'capitalize', marginBottom: '2px' }}>{crop}</div>
      <div style={{ fontSize: '12px', color: isActive ? 'var(--green-700)' : 'var(--slate-500)', fontWeight: '600', textTransform: 'capitalize' }}>{info.stage?.replace('_', ' ')}</div>
      <div style={{ fontSize: '11px', color: 'var(--slate-400)', marginTop: '4px' }}>{info.date}</div>
    </div>
  )
}

export default function GrowerIntel() {
  const [tehsil, setTehsil] = useState('')
  const [tehsilInput, setTehsilInput] = useState('')
  const [data, setData] = useState(null)
  const [briefing, setBriefing] = useState(null)
  const [waMsg, setWaMsg] = useState(null)
  const [loading, setLoading] = useState(false)
  const [briefingLoading, setBriefingLoading] = useState(false)
  const [msgLoading, setMsgLoading] = useState(false)
  const [error, setError] = useState(null)
  const [tehsilList, setTehsilList] = useState([])
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    api.listTehsils().then(res => setTehsilList(res.tehsils || [])).catch(() => {})
  }, [])

  const fetchIntel = async () => {
    const t = tehsilInput.trim()
    if (!t) return
    setLoading(true); setError(null); setData(null); setBriefing(null); setWaMsg(null)
    try {
      const res = await api.growerIntelligence(t)
      setData(res); setTehsil(t)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchBriefing = async () => {
    setBriefingLoading(true)
    try {
      const res = await api.tehsilBriefing(tehsil)
      setBriefing(res)
    } catch (e) {
      setError(e.message)
    } finally {
      setBriefingLoading(false)
    }
  }

  const fetchWaMsg = async () => {
    setMsgLoading(true)
    try {
      const res = await api.whatsappPreview(tehsil)
      setWaMsg(res)
    } catch (e) {
      setError(e.message)
    } finally {
      setMsgLoading(false)
    }
  }

  const summary = data?.summary || {}
  const totalGrowers = summary.total_growers || 0

  // Suggestions based on input
  const suggestions = tehsilInput.length >= 3
    ? tehsilList.filter(t => t.tehsil.toLowerCase().includes(tehsilInput.toLowerCase())).slice(0, 6)
    : []

  return (
    <div className="fade-in">
      {/* Search */}
      <Card style={{ marginBottom: '24px' }}>
        <SectionHeader title="Grower Profile Intelligence" icon="👨‍🌾" subtitle="Farmer demographics, crop stages, warm leads & WhatsApp engagement by tehsil" />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--slate-600)', fontFamily: 'var(--font-display)', display: 'block', marginBottom: '6px' }}>Tehsil Name</label>
              <input
                value={tehsilInput}
                onChange={e => setTehsilInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchIntel()}
                placeholder="e.g. Patna_T001, Jaipur_T007, Bharatpur_T023"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--slate-200)', fontSize: '14px', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = 'var(--green-500)'}
                onBlur={e => e.target.style.borderColor = 'var(--slate-200)'}
              />
            </div>
            <Button onClick={fetchIntel} loading={loading}>Load Tehsil</Button>
          </div>
          {suggestions.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: '130px', background: 'var(--white)', border: '1.5px solid var(--green-300)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', zIndex: 50, marginTop: '4px', overflow: 'hidden' }}>
              {suggestions.map(s => (
                <div key={s.tehsil} onClick={() => { setTehsilInput(s.tehsil); }} style={{ padding: '10px 16px', cursor: 'pointer', fontSize: '13px', color: 'var(--slate-700)', borderBottom: '1px solid var(--slate-100)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--green-50)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <strong>{s.tehsil}</strong> <span style={{ color: 'var(--slate-400)' }}>· {s.district}, {s.state}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {error && <ErrorBox message={error} />}
      {loading && <Loading text="Analyzing grower profiles..." />}

      {data && !loading && (
        <div className="fade-in">
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '22px', color: 'var(--slate-900)' }}>{data.tehsil}</h3>
              <div style={{ fontSize: '13px', color: 'var(--slate-500)', marginTop: '4px' }}>Data as of {data.as_of} · {totalGrowers} growers profiled</div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button onClick={fetchBriefing} loading={briefingLoading} variant="secondary">
                📋 Field Briefing
              </Button>
              <Button onClick={fetchWaMsg} loading={msgLoading} variant="ghost">
                💬 WhatsApp Preview
              </Button>
            </div>
          </div>

          {/* AI Briefing */}
          {briefingLoading && <div style={{ marginBottom: '16px' }}><Loading text="Generating field briefing..." /></div>}
          {briefing && (
            <Card style={{ marginBottom: '20px', borderLeft: '4px solid var(--green-500)', background: 'var(--green-50)' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--green-700)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px', fontFamily: 'var(--font-display)' }}>📋 AI Field Briefing</div>
              <div style={{ fontSize: '14px', color: 'var(--slate-700)', lineHeight: 1.8 }}>{briefing.briefing}</div>
              {briefing.warm_lead_count > 0 && (
                <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--green-700)', fontWeight: '600' }}>
                  🔥 {briefing.warm_lead_count} warm leads ready for follow-up
                </div>
              )}
            </Card>
          )}

          {/* WhatsApp message preview */}
          {msgLoading && <div style={{ marginBottom: '16px' }}><Loading text="Crafting WhatsApp message..." /></div>}
          {waMsg && (
            <Card style={{ marginBottom: '20px', background: '#075E54', border: 'none' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px', fontFamily: 'var(--font-display)' }}>
                💬 WhatsApp Campaign Preview · {waMsg.dominant_crop} · {waMsg.stage} stage · {waMsg.language}
              </div>
              <div style={{
                background: '#DCF8C6',
                borderRadius: '12px 12px 0 12px',
                padding: '14px 18px',
                fontSize: '14px',
                color: '#111',
                lineHeight: 1.7,
                maxWidth: '420px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              }}>
                {waMsg.whatsapp_message}
              </div>
              <div style={{ marginTop: '10px', fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                Product: {waMsg.product}
              </div>
            </Card>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0', marginBottom: '20px', background: 'var(--slate-100)', borderRadius: 'var(--radius-md)', padding: '4px' }}>
            {[
              { id: 'overview', label: '📊 Overview' },
              { id: 'crops', label: '🌾 Crops & Stages' },
              { id: 'leads', label: '🔥 Warm Leads' },
              { id: 'whatsapp', label: '📱 WhatsApp Stats' },
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

          {tab === 'overview' && (
            <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <Card>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--slate-400)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px', fontFamily: 'var(--font-display)' }}>Demographics</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <Stat label="Total Growers" value={totalGrowers} accent />
                  <Stat label="Avg Farm Size" value={`${summary.avg_farm_size} ac`} />
                  <Stat label="Avg Age" value={`${summary.avg_age} yrs`} />
                  <Stat label="Female Farmers" value={summary.female_count} />
                  <Stat label="Smartphone Users" value={summary.smartphone_users} />
                  <Stat label="Product Scanners" value={summary.product_scanners} />
                </div>
              </Card>
              <Card>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--slate-400)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px', fontFamily: 'var(--font-display)' }}>Languages</div>
                {data.language_breakdown?.slice(0, 5).map(l => (
                  <div key={l.language} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--slate-100)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>{LANG_FLAGS[l.language] || '🌐'}</span>
                      <span style={{ fontSize: '13px', color: 'var(--slate-700)' }}>{l.language}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '80px', height: '4px', background: 'var(--slate-100)', borderRadius: '2px' }}>
                        <div style={{ width: `${(l.count / totalGrowers) * 100}%`, height: '100%', background: 'var(--green-500)', borderRadius: '2px' }} />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--slate-700)', minWidth: '30px', textAlign: 'right' }}>{l.count}</span>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {tab === 'crops' && (
            <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <Card>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--slate-400)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px', fontFamily: 'var(--font-display)' }}>Crop Breakdown</div>
                {data.crop_breakdown?.map(c => (
                  <CropBar key={c.crop} crop={c.crop} count={c.count} total={totalGrowers} acres={c.avg_acres} />
                ))}
              </Card>
              <Card>
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--slate-400)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px', fontFamily: 'var(--font-display)' }}>Active / Upcoming Crop Stages</div>
                {Object.keys(data.upcoming_crop_stages || {}).length > 0 ? (
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {Object.entries(data.upcoming_crop_stages).map(([crop, info]) => (
                      <StageChip key={crop} crop={crop} info={info} />
                    ))}
                  </div>
                ) : (
                  <div style={{ color: 'var(--slate-400)', fontSize: '14px' }}>No active stages within ±45 days</div>
                )}
              </Card>
            </div>
          )}

          {tab === 'leads' && (
            <Card className="fade-in">
              <SectionHeader title="Warm Leads" icon="🔥" subtitle="Farmers who scanned a product or attended an event — highest engagement potential" />
              {data.warm_leads?.length > 0 ? (
                <div>
                  {data.warm_leads.map((lead, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 0', borderBottom: '1px solid var(--slate-100)' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--green-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                        {CROP_ICONS[lead.crop?.toLowerCase()] || '🌱'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: '600', fontSize: '13px', color: 'var(--slate-900)' }}>{lead.grower_id}</div>
                        <div style={{ fontSize: '11px', color: 'var(--slate-500)', marginTop: '2px' }}>
                          {lead.crop} · {lead.language} · {lead.device_type} · {lead.grower_farm_size} acres
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {lead.product_scan && <span style={{ fontSize: '11px', background: 'var(--amber-200)', color: 'var(--amber-600)', padding: '2px 8px', borderRadius: '10px', fontWeight: '600' }}>Scanned: {lead.product_name}</span>}
                        {lead.offline_campaign_attended && <span style={{ fontSize: '11px', background: 'var(--green-100)', color: 'var(--green-700)', padding: '2px 8px', borderRadius: '10px', fontWeight: '600' }}>Event attended</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--slate-400)', fontSize: '14px', padding: '20px 0', textAlign: 'center' }}>No warm leads in this tehsil</div>
              )}
            </Card>
          )}

          {tab === 'whatsapp' && (
            <Card className="fade-in">
              <SectionHeader title="WhatsApp Engagement" icon="📱" subtitle="Campaign performance for this tehsil" />
              {data.whatsapp_engagement ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                  <Stat label="Messages Sent" value={data.whatsapp_engagement.total_sent || 0} accent />
                  <Stat label="Delivered" value={data.whatsapp_engagement.delivered || 0} />
                  <Stat label="Opened" value={data.whatsapp_engagement.opened || 0} />
                  <Stat label="Clicked" value={data.whatsapp_engagement.clicked || 0} />
                </div>
              ) : (
                <div style={{ color: 'var(--slate-400)', fontSize: '14px' }}>No WhatsApp data for this tehsil</div>
              )}
            </Card>
          )}
        </div>
      )}

      {!data && !loading && !error && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>👨‍🌾</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '18px', color: 'var(--slate-600)', marginBottom: '8px' }}>Enter a tehsil name to explore grower intelligence</div>
          <div style={{ fontSize: '14px', color: 'var(--slate-400)', marginBottom: '20px' }}>Start typing to see suggestions from all {tehsilList.length} tehsils in the database</div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {['Patna_T001', 'Jaipur_T007', 'Bharatpur_T023', 'Hisar_T002'].map(ex => (
              <button key={ex} onClick={() => { setTehsilInput(ex); }} style={{ padding: '6px 16px', background: 'var(--green-50)', border: '1px solid var(--green-300)', borderRadius: 'var(--radius-sm)', fontSize: '13px', color: 'var(--green-700)', fontWeight: '600', cursor: 'pointer' }}>
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
