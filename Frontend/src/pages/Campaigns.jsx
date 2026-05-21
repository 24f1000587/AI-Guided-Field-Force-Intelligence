import React, { useState, useEffect } from 'react'
import { Card, Loading, ErrorBox, SectionHeader, Stat, Button } from '../components/UI'
import { api } from '../utils/api'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts'

const CAMPAIGN_COLORS = {
  'CMP_RABI25_001': '#f0a830',
  'CMP_RABI25_002': '#5dc880',
  'CMP_RABI25_003': '#7a8fa8',
  'CMP_RABI25_004': '#c47a0a',
}
const CROP_ICONS = { wheat: '🌾', mustard: '🌻', chickpea: '🫘', potato: '🥔' }
const PIE_COLORS = ['#3aaa66', '#f0a830', '#7a8fa8', '#c47a0a', '#b91c1c']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--slate-200)', borderRadius: '8px', padding: '10px 14px', boxShadow: 'var(--shadow-md)', fontSize: '13px' }}>
      <div style={{ fontWeight: '700', marginBottom: '6px', color: 'var(--slate-700)' }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
          <span>{p.name}</span>
          <span style={{ fontWeight: '700' }}>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function Campaigns() {
  const [data, setData] = useState(null)
  const [funnelData, setFunnelData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [tab, setTab] = useState('funnel')

  useEffect(() => {
    Promise.all([api.campaignEffectiveness(), api.funnelWeekly()])
      .then(([eff, funnel]) => { setData(eff); setFunnelData(funnel) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading text="Loading campaign analytics..." />
  if (error) return <ErrorBox message={error} />
  if (!data) return null

  // Prepare funnel weekly chart data
  const campaigns = [...new Set((funnelData?.data || []).map(r => r.campaign_id))]
  const weeks = [...new Set((funnelData?.data || []).map(r => r.week_start_date))].sort()

  // For each week, create a data point with all campaigns
  const weeklyChartData = weeks.map(w => {
    const point = { week: w.slice(5) } // "MM-DD"
    const filtered = (funnelData?.data || []).filter(r => r.week_start_date === w)
    filtered.forEach(r => {
      point[`${r.campaign_crop}_imp`] = r.social_post_impression
      point[`${r.campaign_crop}_visits`] = r.landing_page_visits
      point[`${r.campaign_crop}_leads`] = r.lead_form_submission
    })
    return point
  })

  // WhatsApp data
  const waData = data.whatsapp_engagement || []
  const deviceData = data.device_type_split || []

  // Sales trend — aggregate by month across all SKUs
  const salesByMonth = {}
  ;(data.sales_trend || []).forEach(row => {
    if (!salesByMonth[row.month]) salesByMonth[row.month] = { month: row.month, total_qty: 0, total_revenue: 0 }
    salesByMonth[row.month].total_qty += Number(row.total_qty) || 0
    salesByMonth[row.month].total_revenue += Number(row.total_revenue) || 0
  })
  const salesChartData = Object.values(salesByMonth).sort((a, b) => a.month.localeCompare(b.month))

  // Top products by revenue
  const productRevenue = {}
  ;(data.sales_trend || []).forEach(row => {
    if (!productRevenue[row.sku_name]) productRevenue[row.sku_name] = 0
    productRevenue[row.sku_name] += Number(row.total_revenue) || 0
  })
  const topProducts = Object.entries(productRevenue)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, rev]) => ({ name, revenue: Math.round(rev) }))

  return (
    <div className="fade-in">
      {/* Campaign cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '28px' }}>
        {(data.digital_funnel || []).map(c => (
          <button key={c.campaign_id} onClick={() => setSelectedCampaign(selectedCampaign === c.campaign_id ? null : c.campaign_id)} style={{
            border: `2px solid ${selectedCampaign === c.campaign_id ? CAMPAIGN_COLORS[c.campaign_id] || 'var(--green-500)' : 'var(--slate-200)'}`,
            borderRadius: 'var(--radius-md)', padding: '18px', background: 'var(--white)',
            cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{CROP_ICONS[c.campaign_crop] || '🌱'}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '14px', color: 'var(--slate-900)', textTransform: 'capitalize', marginBottom: '4px' }}>{c.campaign_crop}</div>
            <div style={{ fontSize: '11px', color: 'var(--slate-500)', marginBottom: '12px' }}>{c.campaign_product}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--slate-900)' }}>{(c.total_impressions / 1000).toFixed(0)}K</div>
                <div style={{ fontSize: '10px', color: 'var(--slate-400)', textTransform: 'uppercase', fontWeight: '600' }}>Impressions</div>
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '800', fontFamily: 'var(--font-display)', color: CAMPAIGN_COLORS[c.campaign_id] || 'var(--green-600)' }}>{c.ctr_pct}%</div>
                <div style={{ fontSize: '10px', color: 'var(--slate-400)', textTransform: 'uppercase', fontWeight: '600' }}>CTR</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '24px', background: 'var(--slate-100)', borderRadius: 'var(--radius-md)', padding: '4px' }}>
        {[
          { id: 'funnel', label: '📊 Digital Funnel' },
          { id: 'whatsapp', label: '💬 WhatsApp' },
          { id: 'sales', label: '💰 POS Sales' },
          { id: 'devices', label: '📱 Device Split' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '9px 12px', borderRadius: 'var(--radius-sm)',
            background: tab === t.id ? 'var(--white)' : 'transparent',
            boxShadow: tab === t.id ? 'var(--shadow-sm)' : 'none',
            fontFamily: 'var(--font-display)', fontWeight: '600', fontSize: '13px',
            color: tab === t.id ? 'var(--slate-900)' : 'var(--slate-500)',
            border: 'none', cursor: 'pointer', transition: 'all 0.15s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Funnel tab */}
      {tab === 'funnel' && (
        <div className="fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <Card>
              <SectionHeader title="Weekly Impressions" subtitle="Social post reach by crop campaign" />
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={weeklyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--slate-100)" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  {['wheat', 'mustard', 'chickpea', 'potato'].map((crop, i) => (
                    <Line key={crop} type="monotone" dataKey={`${crop}_imp`} name={crop} stroke={PIE_COLORS[i]} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <SectionHeader title="Funnel Conversion" subtitle="Per campaign totals" />
              {(data.digital_funnel || []).map(c => (
                <div key={c.campaign_id} style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--slate-700)', textTransform: 'capitalize', fontFamily: 'var(--font-display)' }}>{c.campaign_crop}</span>
                    <span style={{ fontSize: '11px', color: 'var(--slate-500)' }}>Lead rate: {c.lead_rate_pct}%</span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {[
                      { v: c.total_impressions, label: 'Imp', color: 'var(--slate-300)' },
                      { v: c.total_visits, label: 'Visit', color: 'var(--amber-400)' },
                      { v: c.total_leads, label: 'Lead', color: 'var(--green-500)' },
                    ].map(step => (
                      <div key={step.label} style={{ flex: 1 }}>
                        <div style={{ height: '6px', background: step.color, borderRadius: '3px', opacity: 0.8 }} />
                        <div style={{ fontSize: '10px', color: 'var(--slate-400)', marginTop: '2px' }}>{(step.v/1000).toFixed(0)}K</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </Card>
          </div>

          <Card>
            <SectionHeader title="Weekly Lead Form Submissions" subtitle="Bottom-of-funnel conversions" />
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--slate-100)" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {['wheat', 'mustard', 'chickpea', 'potato'].map((crop, i) => (
                  <Bar key={crop} dataKey={`${crop}_leads`} name={crop} fill={PIE_COLORS[i]} stackId="a" radius={i === 3 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* WhatsApp tab */}
      {tab === 'whatsapp' && (
        <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <Card>
            <SectionHeader title="WhatsApp Engagement" icon="💬" subtitle="Per product" />
            {waData.map(w => (
              <div key={w.campaign_product} style={{ padding: '12px 0', borderBottom: '1px solid var(--slate-100)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '13px', color: 'var(--slate-900)' }}>{w.campaign_product}</div>
                    <div style={{ fontSize: '11px', color: 'var(--slate-500)' }}>{w.total_sent} sent</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: '800', fontFamily: 'var(--font-display)', color: 'var(--green-600)' }}>{w.open_rate}%</div>
                    <div style={{ fontSize: '10px', color: 'var(--slate-400)' }}>Open rate</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '3px' }}>
                  {[
                    { label: 'Delivered', pct: w.delivery_rate, color: 'var(--slate-400)' },
                    { label: 'Opened', pct: w.open_rate, color: 'var(--amber-400)' },
                    { label: 'Clicked', pct: w.click_rate, color: 'var(--green-500)' },
                  ].map(s => (
                    <div key={s.label} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ height: '4px', background: s.color, borderRadius: '2px', opacity: 0.8 }} />
                      <div style={{ fontSize: '9px', color: 'var(--slate-400)', marginTop: '2px' }}>{s.pct}%</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Card>

          <Card>
            <SectionHeader title="Engagement Rates" icon="📊" subtitle="Delivery → Open → Click" />
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={waData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--slate-100)" />
                <XAxis type="number" tick={{ fontSize: 11 }} unit="%" />
                <YAxis type="category" dataKey="campaign_product" tick={{ fontSize: 10 }} width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="delivery_rate" name="Delivery %" fill="#a8bacf" radius={[0, 4, 4, 0]} />
                <Bar dataKey="open_rate" name="Open %" fill="#f0a830" radius={[0, 4, 4, 0]} />
                <Bar dataKey="click_rate" name="Click %" fill="#3aaa66" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* Sales tab */}
      {tab === 'sales' && (
        <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          <Card>
            <SectionHeader title="Monthly Sales Volume" subtitle="All SKUs combined" />
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={salesChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--slate-100)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} yAxisId="left" />
                <YAxis tick={{ fontSize: 11 }} yAxisId="right" orientation="right" tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar yAxisId="left" dataKey="total_qty" name="Units Sold" fill="var(--green-400)" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="total_revenue" name="Revenue ₹" stroke="var(--amber-400)" strokeWidth={2} dot={false} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <SectionHeader title="Top Products by Revenue" subtitle="Cumulative season" />
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={topProducts} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={80} paddingAngle={3}>
                  {topProducts.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => `₹${v.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ marginTop: '8px' }}>
              {topProducts.map((p, i) => (
                <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '12px', borderBottom: '1px solid var(--slate-100)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i], display: 'inline-block' }} />
                    <span style={{ color: 'var(--slate-700)' }}>{p.name}</span>
                  </div>
                  <span style={{ fontWeight: '700', color: 'var(--slate-900)' }}>₹{(p.revenue / 1000).toFixed(0)}K</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Device split tab */}
      {tab === 'devices' && (
        <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <Card>
            <SectionHeader title="Device Type Split" subtitle="WhatsApp reach by device" />
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={deviceData} dataKey="sent" nameKey="device_type" cx="50%" cy="50%" outerRadius={100} paddingAngle={4} label={({ device_type, sent }) => `${device_type}: ${sent}`}>
                  {deviceData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <SectionHeader title="Open Rates by Device" subtitle="Engagement quality" />
            {deviceData.map((d, i) => (
              <div key={d.device_type} style={{ padding: '14px 0', borderBottom: '1px solid var(--slate-100)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>
                      {d.device_type === 'smartphone' ? '📱' : d.device_type === 'keypad' ? '📞' : '❓'}
                    </span>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '13px', color: 'var(--slate-900)', textTransform: 'capitalize' }}>{d.device_type}</div>
                      <div style={{ fontSize: '11px', color: 'var(--slate-400)' }}>{d.sent} messages sent</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '22px', fontWeight: '800', fontFamily: 'var(--font-display)', color: PIE_COLORS[i] }}>{d.open_rate}%</div>
                    <div style={{ fontSize: '10px', color: 'var(--slate-400)' }}>Open rate</div>
                  </div>
                </div>
                <div style={{ height: '6px', background: 'var(--slate-100)', borderRadius: '3px' }}>
                  <div style={{ width: `${d.open_rate}%`, height: '100%', background: PIE_COLORS[i], borderRadius: '3px' }} />
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  )
}
