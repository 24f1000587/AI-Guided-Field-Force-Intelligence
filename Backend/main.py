"""
main.py — FastAPI application entry point

Run with:
    uvicorn main:app --reload --port 8000

Swagger UI: http://localhost:8000/docs
ReDoc:       http://localhost:8000/redoc
"""
from sqlalchemy.orm import Session
from fastapi import FastAPI,Depends
from fastapi.middleware.cors import CORSMiddleware
from database import get_db
from database import init_db
from routers import field_force, retailers, growers, campaigns

app = FastAPI(
    title="Syngenta AI Field Force Intelligence",
    description="""
## AI-Guided Field Force Intelligence System

Built for the Syngenta × IITM BS Hackathon 2026.

### Features
| # | Feature | Endpoint Prefix |
|---|---------|----------------|
| 1 | Smart Visit Planner | `/field-force/visit-plan/{rep_id}` |
| 2 | Next Best Action Advisor | `/retailers/{retailer_id}/next-best-action` |
| 3 | Anomaly & Opportunity Alerts | `/field-force/anomalies` |
| 4 | Campaign Effectiveness Analyzer | `/campaigns/effectiveness` |
| 5 | Grower Profile Intelligence | `/growers/tehsil/{tehsil}` |
    """,
    version="1.0.0",
)

# ── CORS — allow React dev server ─────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "https://ai-guided-field-force-intelligence.vercel.app",  # ← your vercel URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Startup ───────────────────────────────────────────────────────────────────
@app.on_event("startup")
def on_startup():
    """Create tables on first run if they don't exist."""
    init_db()


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(field_force.router)
app.include_router(retailers.router)
app.include_router(growers.router)
app.include_router(campaigns.router)


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    return {
        "status": "ok",
        "project": "Syngenta AI Field Force Intelligence",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health(db: Session = Depends(get_db)):
    checks = {}

    # 1. DB connection + row counts
    try:
        from sqlalchemy import text
        counts = {}
        for table in ["reps", "retailers", "retailer_pos", "growers"]:
            n = db.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
            counts[table] = n
        checks["database"] = "ok"
        checks["row_counts"] = counts
        checks["data_loaded"] = all(v > 0 for v in counts.values())
    except Exception as e:
        checks["database"] = f"ERROR: {str(e)}"
        checks["data_loaded"] = False

    # 2. API key present
    import os
    key = os.getenv("ANTHROPIC_API_KEY", "")
    checks["anthropic_api_key"] = "present" if key.startswith("sk-ant") else "MISSING or INVALID"

    # 3. Overall status
    all_ok = (
        checks["database"] == "ok"
        and checks["data_loaded"]
        and checks["anthropic_api_key"] == "present"
    )

    return {
        "status": "healthy" if all_ok else "DEGRADED",
        "checks": checks
    }
