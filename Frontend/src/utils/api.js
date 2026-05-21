const BASE = '/api'

async function request(path, opts = {}) {
  const res = await fetch(BASE + path, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

export const api = {
  // Health
  health: () => request('/health'),

  // Field Force
  visitPlan: (repId, today) =>
    request(`/field-force/visit-plan/${encodeURIComponent(repId)}${today ? `?today=${today}` : ''}`),
  anomalies: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([,v]) => v))
    return request(`/field-force/anomalies${q.toString() ? '?' + q : ''}`)
  },
  anomalySummary: () => request('/field-force/anomalies/summary'),

  // Retailers
  retailerContext: (id) => request(`/retailers/${id}/context`),
  nextBestAction: (id) => request(`/retailers/${id}/next-best-action`),
  retailersInTerritory: (tid) => request(`/retailers/territory/${tid}`),

  // Growers
  growerIntelligence: (tehsil) => request(`/growers/tehsil/${encodeURIComponent(tehsil)}`),
  tehsilBriefing: (tehsil) => request(`/growers/tehsil/${encodeURIComponent(tehsil)}/briefing`),
  whatsappPreview: (tehsil) => request(`/growers/tehsil/${encodeURIComponent(tehsil)}/whatsapp-message`),
  listTehsils: (state) => request(`/growers/list-tehsils${state ? `?state=${state}` : ''}`),

  // Campaigns
  campaignEffectiveness: () => request('/campaigns/effectiveness'),
  funnelWeekly: (campaignId) =>
    request(`/campaigns/funnel/weekly${campaignId ? `?campaign_id=${campaignId}` : ''}`),
  whatsappEngagement: (product) =>
    request(`/campaigns/whatsapp/engagement${product ? `?product=${encodeURIComponent(product)}` : ''}`),
  salesByProduct: (product) =>
    request(`/campaigns/sales/by-product${product ? `?product=${encodeURIComponent(product)}` : ''}`),
  listProducts: () => request('/campaigns/list-products'),
}
