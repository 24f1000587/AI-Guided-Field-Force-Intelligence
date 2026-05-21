import React, { useState } from 'react'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import VisitPlanner from './pages/VisitPlanner'
import NextBestAction from './pages/NextBestAction'
import Anomalies from './pages/Anomalies'
import GrowerIntel from './pages/GrowerIntel'
import Campaigns from './pages/Campaigns'

export default function App() {
  const [page, setPage] = useState('dashboard')

  const pages = {
    dashboard: <Dashboard setPage={setPage} />,
    'visit-plan': <VisitPlanner />,
    nba: <NextBestAction />,
    anomalies: <Anomalies />,
    growers: <GrowerIntel />,
    campaigns: <Campaigns />,
  }

  return (
    <Layout page={page} setPage={setPage}>
      {pages[page] || <Dashboard setPage={setPage} />}
    </Layout>
  )
}
