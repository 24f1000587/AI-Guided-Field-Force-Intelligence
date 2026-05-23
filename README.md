# 🌾 Syngenta AI Field Force Intelligence

> **Syngenta × IITM BS Hackathon 2026** — Track: AI-Guided Field Force Intelligence

An AI-powered co-pilot for Syngenta field sales representatives — delivering dynamic visit prioritization, next-best-action recommendations, anomaly detection, campaign analytics, and grower intelligence, all grounded in real retail and agronomic data.

---

## 🔗 Deployed Link


"https://ai-guided-field-force-intelligence.vercel.app"

---

## 📐 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│              React + Vite  (deployed on Vercel)              │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS REST
┌────────────────────────▼────────────────────────────────────┐
│                      BACKEND LAYER                           │
│           FastAPI + SQLAlchemy  (deployed on Render)         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ /field-force │  │  /retailers  │  │    /campaigns    │  │
│  │  visit-plan  │  │  next-best-  │  │  effectiveness   │  │
│  │  anomalies   │  │    action    │  │  funnel/weekly   │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                   ┌──────────────┐                           │
│                   │   /growers   │                           │
│                   │tehsil intel  │                           │
│                   └──────────────┘                           │
│                                                              │
│              Groq API  (LLaMA 3.3 70B Versatile)            │
└────────────────────────┬────────────────────────────────────┘
                         │ SQLAlchemy / psycopg2
┌────────────────────────▼────────────────────────────────────┐
│                      DATA LAYER                              │
│             Neon PostgreSQL  (serverless, pooled)            │
│                                                              │
│  territories · reps · retailers · retailer_visit_log        │
│  retailer_inventory · retailer_pos · growers                 │
│  whatsapp_campaign · digital_funnel                          │
└─────────────────────────────────────────────────────────────┘
```

---

## ✨ Features

### Feature 1 — Smart Visit Planner
**`GET /field-force/visit-plan/{rep_id}`**

Ranks all retailers in a rep's territory by a composite priority score computed from four signals:

| Signal | Weight | Description |
|--------|--------|-------------|
| Visit Recency | 25% | Days since last field visit (anchored to data end) |
| Stockout Risk | 35% | Weeks of cover = current inventory ÷ avg weekly sales |
| Sales Velocity | 25% | Total units sold in the last 4 weeks of data |
| Inventory Trend | 15% | Week-over-week stock decline percentage |

Returns the top 20 prioritized retailers with human-readable reasoning for each recommendation.

---

### Feature 2 — Next Best Action Advisor
**`GET /retailers/{retailer_id}/next-best-action`**

At the point of a field visit, calls the **Groq API (LLaMA 3.3 70B)** with live retailer context — inventory status, sales velocity, nearby grower crop stages, and visit history — to generate a structured recommendation:

```json
{
  "primary_action": "...",
  "products_to_discuss": ["..."],
  "talking_point": "...",
  "agronomic_advice": "...",
  "reorder_suggestion": "...",
  "urgency": "HIGH | MEDIUM | LOW"
}
```

---

### Feature 3 — Anomaly & Opportunity Detection
**`GET /field-force/anomalies`**

Scans all retailer and inventory data to surface four classes of alerts:

| Alert Type | Trigger Condition | Default Severity |
|-----------|-------------------|-----------------|
| `STOCKOUT_RISK` | < 1.5 weeks of stock cover | HIGH / MEDIUM |
| `DEMAND_SPIKE` | This week's sales > 2× rolling average | HIGH / MEDIUM |
| `DEAD_STOCK` | > 20 units on hand, zero sales in 21 days | LOW |
| `COVERAGE_GAP` | Retailer not visited in 21+ days | MEDIUM / HIGH |

Filterable by `territory_id`, `severity`, and `alert_type`. A manager summary endpoint aggregates HIGH alerts by territory.

---

### Feature 4 — Campaign Effectiveness Analyzer
**`GET /campaigns/effectiveness`**

Connects three data streams into a unified campaign report:

- **Digital funnel**: Impressions → Landing page visits → Lead form submissions (CTR %, lead rate %)
- **WhatsApp engagement**: Delivery rate, open rate, click rate — segmented by product, state, language, and device type
- **POS sales trend**: Monthly revenue and unit volume per SKU

Covers all four Rabi 2025–26 campaigns: Wheat (Topik 15 WP), Mustard (Score 250 EC), Chickpea (Actara 25 WG), Potato (Kavach 75 WP).

---

### Feature 5 — Grower Profile Intelligence
**`GET /growers/tehsil/{tehsil}`**

Generates a rich intelligence card for every tehsil, including:

- Demographics (age, gender split, farm size distribution)
- Crop breakdown and active/upcoming biological stages (±45-day window)
- Warm leads: growers who scanned a product or attended an offline event
- WhatsApp engagement stats for the tehsil
- Language distribution (for campaign localisation)

A `/briefing` sub-endpoint passes all this data to the **Groq API** and returns a natural-language field rep briefing. A `/whatsapp-message` sub-endpoint generates a stage-specific, language-appropriate WhatsApp message for the dominant crop.

---

## 🗂️ Dataset Overview

| Table | Rows | Description |
|-------|------|-------------|
| `reps_territory` | 500 | Field reps and their territory assignments |
| `retailers` | 4,000 | Agricultural retail outlets with geo-location |
| `retailer_visit_log` | 30,000 | Historical rep visit records |
| `retailer_inventory_weekly` | 310,544 | Weekly SKU stock snapshots per retailer |
| `retailer_pos` | 235,042 | Point-of-sale transaction line items |
| `growers` | 6,000 | Grower profiles with crop calendars and engagement |
| `whatsapp_campaign` | 4,479 | WhatsApp message delivery and engagement log |
| `digital_funnel_weekly` | 104 | Weekly digital campaign funnel metrics |

**Season:** Rabi 2025–26 (October 2025 – April 2026)  
**Data anchor:** `2026-03-29` (all date arithmetic relative to this to ensure live scoring regardless of run date)

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React, Vite |
| **Backend** | Python 3.11+, FastAPI, Uvicorn |
| **ORM** | SQLAlchemy (NullPool for serverless compatibility) |
| **Database** | PostgreSQL via Neon (serverless, connection pooling) |
| **LLM** | Groq API — `llama-3.3-70b-versatile` |
| **Deployment** | Vercel (frontend), Render (backend), Neon (database) |

---

## 📡 API Reference

### Field Force

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/field-force/visit-plan/{rep_id}` | Prioritized visit list for a rep |
| GET | `/field-force/anomalies` | All anomaly alerts (filterable) |
| GET | `/field-force/anomalies/summary` | Manager-level anomaly summary |

### Retailers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/retailers/{retailer_id}/context` | Raw retailer data context |
| GET | `/retailers/{retailer_id}/next-best-action` | AI-generated visit recommendation |
| GET | `/retailers/territory/{territory_id}` | All retailers in a territory |

### Growers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/growers/tehsil/{tehsil}` | Intelligence card for a tehsil |
| GET | `/growers/tehsil/{tehsil}/briefing` | AI-generated rep briefing |
| GET | `/growers/tehsil/{tehsil}/whatsapp-message` | Sample WhatsApp message |
| GET | `/growers/list-tehsils` | All tehsils with grower data |

### Campaigns

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/campaigns/effectiveness` | Full campaign effectiveness report |
| GET | `/campaigns/funnel/weekly` | Weekly digital funnel data |
| GET | `/campaigns/whatsapp/engagement` | WhatsApp engagement by segment |
| GET | `/campaigns/sales/by-product` | Monthly POS sales per SKU |
| GET | `/campaigns/list-products` | All product names (for dropdowns) |

---

## 📁 Project Structure

```
.
├── main.py                   # FastAPI app entry point, CORS, router registration
├── database.py               # SQLAlchemy engine, session factory, init_db()
├── models.py                 # ORM models (all FK constraints intentionally removed)
├── load_data.py              # One-time ETL: CSV → PostgreSQL
│
├── routers/
│   ├── field_force.py        # Feature 1 (visit planner) + Feature 3 (anomalies)
│   ├── retailers.py          # Feature 2 (next best action)
│   ├── growers.py            # Feature 5 (grower intelligence)
│   └── campaigns.py          # Feature 4 (campaign effectiveness)
│
├── services/
│   ├── scoring.py            # All scoring/analytics logic (pure SQL + Python)
│   └── campaign.py           # All Groq API calls (next best action, briefings, WhatsApp)
│
└── data/
    ├── reps_territory.csv
    ├── retailers.csv
    ├── retailer_visit_log.csv
    ├── retailer_inventory_weekly.csv
    ├── retailer_pos.csv
    ├── growers.csv
    ├── whatsapp_campaign.csv
    └── digital_funnel_weekly.csv
```

---

## 🎯 Scoring Model Details

All scoring is anchored to `DATA_END = 2026-03-29` to ensure meaningful signal regardless of when the application is run. The original date-relative approach was causing all recency scores to saturate at 100 and all velocity scores to return 0 (52-day gap between data end and run date).

**Composite Priority Score Formula:**

```
score = (0.25 × recency_score)
      + (0.35 × stockout_score)
      + (0.25 × velocity_score)
      + (0.15 × trend_score)
```

All component scores are normalised to [0, 100].

---

## ⚠️ Design Decisions & Assumptions

- **No FK constraints in the DB schema** — bulk-loading 500k+ rows with FK checks enabled causes significant slowdown and ordering sensitivity. Referential integrity is enforced in `load_data.py`.
- **Groq / LLaMA 3.3 70B** is used in place of Claude for LLM calls due to API key availability during the hackathon. The prompt structure is fully compatible with any OpenAI-compatible API.
- **NullPool** is used for the SQLAlchemy engine to prevent connection leaks in FastAPI's async request model on Render's serverless-adjacent infrastructure.
- **Tehsil-level granularity** is used for visit matching (not retailer-level) because visit logs record `visit_tehsil` rather than a specific `retailer_id`.
- The `crop_stages` JSON is parsed at load time and stored as a JSONB column for efficient querying without repeated JSON parsing.


## 📄 License

This project and the accompanying dataset are strictly for use within the Syngenta IITM Hackathon 2026. The dataset must not be shared, published, or used outside the scope of this competition.