import pandas as pd
from sqlalchemy import create_engine
from dotenv import load_dotenv
import os

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))

# Map: CSV filename → DB table name
files = {
    "reps_territory.csv":            "reps_territory",
    "retailers.csv":                 "retailers",
    "retailer_visit_log.csv":        "retailer_visit_log",
    "retailer_inventory_weekly.csv": "retailer_inventory_weekly",
    "retailer_pos.csv":              "retailer_pos",
    "growers.csv":                   "growers",
    "digital_funnel_weekly.csv":     "digital_funnel_weekly",
    "whatsapp_campaign.csv":         "whatsapp_campaign",
}

DATA_DIR = os.path.join(os.path.dirname(__file__), "../data")

for filename, table in files.items():
    filepath = os.path.join(DATA_DIR, filename)
    print(f"Loading {filename} → {table}...")
    df = pd.read_csv(filepath)
    df.to_sql(table, engine, if_exists="replace", index=False, chunksize=1000)
    print(f"  ✓ {len(df)} rows loaded")

print("\nAll done!")