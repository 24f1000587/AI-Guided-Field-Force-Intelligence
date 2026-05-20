"""
load_data.py
Run once: python scripts/load_data.py
Loads all CSVs into PostgreSQL. Safe to re-run (truncates before insert).
"""

import csv
import json
import sys
from datetime import datetime, date
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from database import engine, init_db
from models import (
    Base, Rep, Territory, Retailer, RetailerVisitLog,
    RetailerInventory, RetailerPOS, Grower, WhatsappCampaign, DigitalFunnel
)
from sqlalchemy.orm import Session
from sqlalchemy import text

DATA_DIR = Path(__file__).parent.parent / "data"

# utf-8-sig strips the BOM character Windows/Excel adds to CSVs.
# Without this, the first column becomes '\ufeffrep_id' instead of 'rep_id'
# and every row silently fails — this is why reps table was empty.
ENCODING = "utf-8-sig"


def parse_date(s: str) -> date | None:
    if not s or s.strip() == "":
        return None
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%m/%d/%Y"):
        try:
            return datetime.strptime(s.strip(), fmt).date()
        except ValueError:
            continue
    return None


def parse_bool(s: str) -> bool:
    return str(s).strip().lower() in ("true", "1", "yes")


def parse_float(s: str) -> float | None:
    try:
        return float(s)
    except (ValueError, TypeError):
        return None


def parse_int(s: str) -> int | None:
    try:
        return int(s)
    except (ValueError, TypeError):
        return None


def check_columns(filename: str, required: list):
    """Warn if any expected column is missing — catches BOM and casing issues."""
    with open(DATA_DIR / filename, encoding=ENCODING) as f:
        actual = csv.DictReader(f).fieldnames or []
    missing = [c for c in required if c not in actual]
    if missing:
        print(f"  ⚠  {filename} missing columns: {missing}")
        print(f"     Actual columns: {actual}")
        return False
    return True


def truncate_all(session: Session):
    print("Truncating existing data...")
    for model in [
        DigitalFunnel, WhatsappCampaign, RetailerPOS, RetailerInventory,
        RetailerVisitLog, Grower, Retailer, Rep, Territory
    ]:
        session.query(model).delete()
    session.commit()
    print("Done.\n")


def load_territories(session: Session):
    print("Loading territories...")
    check_columns("reps_territory.csv",
                  ["territory_id", "territory_name", "state", "district", "tehsil_list"])
    seen = {}
    with open(DATA_DIR / "reps_territory.csv", encoding=ENCODING) as f:
        for row in csv.DictReader(f):
            tid = row["territory_id"]
            if tid not in seen:
                try:
                    tehsils = json.loads(row["tehsil_list"])
                except (json.JSONDecodeError, KeyError):
                    tehsils = [t.strip() for t in row["tehsil_list"].split(",") if t.strip()]
                seen[tid] = Territory(
                    territory_id=tid,
                    territory_name=row["territory_name"],
                    state=row["state"],
                    district=row["district"],
                    tehsil_list=tehsils,
                )
    session.bulk_save_objects(list(seen.values()))
    session.commit()
    print(f"  ✅ {len(seen)} territories loaded.")


def load_reps(session: Session):
    print("Loading reps...")
    check_columns("reps_territory.csv",
                  ["rep_id", "territory_id", "territory_name", "state", "district", "tehsil_list"])
    reps = []
    with open(DATA_DIR / "reps_territory.csv", encoding=ENCODING) as f:
        for row in csv.DictReader(f):
            try:
                tehsils = json.loads(row["tehsil_list"])
            except (json.JSONDecodeError, KeyError):
                tehsils = [t.strip() for t in row["tehsil_list"].split(",") if t.strip()]
            reps.append(Rep(
                rep_id=row["rep_id"],
                territory_id=row["territory_id"],
                territory_name=row["territory_name"],
                state=row["state"],
                district=row["district"],
                tehsil_list=tehsils,
            ))
    try:
        session.bulk_save_objects(reps)
        session.commit()
        print(f"  ✅ {len(reps)} reps loaded.")
    except Exception as e:
        session.rollback()
        print(f"  ❌ bulk_save failed: {e}")
        print("     Retrying one-by-one...")
        ok = 0
        for rep in reps:
            try:
                session.add(rep)
                session.commit()
                ok += 1
            except Exception as err:
                session.rollback()
                print(f"     Skipped {rep.rep_id}: {err}")
        print(f"  ✅ {ok} reps loaded.")


def load_retailers(session: Session):
    print("Loading retailers...")
    check_columns("retailers.csv",
                  ["retailer_id", "territory_id", "state", "district", "tehsil"])
    retailers = []
    with open(DATA_DIR / "retailers.csv", encoding=ENCODING) as f:
        for row in csv.DictReader(f):
            retailers.append(Retailer(
                retailer_id=row["retailer_id"],
                territory_id=row["territory_id"],
                state=row["state"],
                district=row["district"],
                tehsil=row["tehsil"],
            ))
    session.bulk_save_objects(retailers)
    session.commit()
    print(f"  ✅ {len(retailers)} retailers loaded.")


def load_visit_log(session: Session):
    print("Loading retailer visit log (30k rows)...")
    check_columns("retailer_visit_log.csv",
                  ["rep_id", "visit_date", "territory_id", "visit_tehsil",
                   "visit_type", "product_recommended"])
    batch, batch_size = [], 500
    with open(DATA_DIR / "retailer_visit_log.csv", encoding=ENCODING) as f:
        for row in csv.DictReader(f):
            batch.append(RetailerVisitLog(
                rep_id=row["rep_id"],
                visit_date=parse_date(row["visit_date"]),
                territory_id=row["territory_id"],
                visit_tehsil=row["visit_tehsil"],
                visit_type=row["visit_type"],
                product_recommended=row["product_recommended"],
            ))
            if len(batch) >= batch_size:
                session.bulk_save_objects(batch)
                session.commit()
                batch = []
    if batch:
        session.bulk_save_objects(batch)
        session.commit()
    print("  ✅ visit log loaded.")


def load_inventory(session: Session):
    print("Loading retailer inventory (310k rows)...")
    check_columns("retailer_inventory_weekly.csv",
                  ["retailer_id", "sku_id", "sku_name", "sku_qty", "week_end_date"])
    batch, batch_size, total = [], 2000, 0
    with open(DATA_DIR / "retailer_inventory_weekly.csv", encoding=ENCODING) as f:
        for row in csv.DictReader(f):
            batch.append(RetailerInventory(
                retailer_id=row["retailer_id"],
                sku_id=row["sku_id"],
                sku_name=row["sku_name"],
                sku_qty=parse_int(row["sku_qty"]) or 0,
                week_end_date=parse_date(row["week_end_date"]),
            ))
            total += 1
            if len(batch) >= batch_size:
                session.bulk_save_objects(batch)
                session.commit()
                batch = []
                print(f"    {total:,} rows...", end="\r")
    if batch:
        session.bulk_save_objects(batch)
        session.commit()
    print(f"  ✅ {total:,} inventory rows loaded.")


def load_pos(session: Session):
    print("Loading retailer POS (235k rows)...")
    check_columns("retailer_pos.csv",
                  ["retailer_id", "transaction_id", "sku_id", "sku_name",
                   "sku_qty", "sku_price", "transaction_date"])
    batch, batch_size, total = [], 2000, 0
    with open(DATA_DIR / "retailer_pos.csv", encoding=ENCODING) as f:
        for row in csv.DictReader(f):
            batch.append(RetailerPOS(
                retailer_id=row["retailer_id"],
                transaction_id=row["transaction_id"],
                sku_id=row["sku_id"],
                sku_name=row["sku_name"],
                sku_qty=parse_int(row["sku_qty"]) or 0,
                sku_price=parse_float(row["sku_price"]),
                transaction_date=parse_date(row["transaction_date"]),
            ))
            total += 1
            if len(batch) >= batch_size:
                session.bulk_save_objects(batch)
                session.commit()
                batch = []
                print(f"    {total:,} rows...", end="\r")
    if batch:
        session.bulk_save_objects(batch)
        session.commit()
    print(f"  ✅ {total:,} POS rows loaded.")


def load_growers(session: Session):
    print("Loading growers (6k rows)...")
    check_columns("growers.csv",
                  ["grower_id", "state", "district", "tehsil", "language",
                   "device_type", "grower_age", "gender", "grower_crop_calendar",
                   "product_scan", "product_name", "grower_farm_size"])
    growers = []
    with open(DATA_DIR / "growers.csv", encoding=ENCODING) as f:
        for row in csv.DictReader(f):
            cal = {}
            crop = sowing_start = sowing_end = harvest_start = harvest_end = None
            stages = []
            try:
                cal = json.loads(row["grower_crop_calendar"])
                crop          = cal.get("crop")
                sowing_start  = parse_date(cal.get("sowing",  {}).get("start"))
                sowing_end    = parse_date(cal.get("sowing",  {}).get("end"))
                harvest_start = parse_date(cal.get("harvest", {}).get("start"))
                harvest_end   = parse_date(cal.get("harvest", {}).get("end"))
                stages        = cal.get("stages", [])
            except (json.JSONDecodeError, AttributeError):
                pass

            growers.append(Grower(
                grower_id=row["grower_id"],
                state=row["state"],
                district=row["district"],
                tehsil=row["tehsil"],
                language=row["language"],
                device_type=row["device_type"],
                grower_age=parse_int(row["grower_age"]),
                gender=row["gender"],
                crop=crop,
                sowing_start=sowing_start,
                sowing_end=sowing_end,
                harvest_start=harvest_start,
                harvest_end=harvest_end,
                crop_stages=stages,
                grower_crop_calendar=cal,
                product_scan=parse_bool(row["product_scan"]),
                product_name=row["product_name"] if row["product_name"] else None,
                product_scan_datetime=datetime.fromisoformat(row["product_scan_datetime"])
                    if row.get("product_scan_datetime", "").strip() else None,
                grower_farm_size=parse_float(row["grower_farm_size"]),
                offline_campaign_attended=parse_bool(row["offline_campaign_attended"]),
                campaign_attendance_date=parse_date(row.get("campaign_attendance_date", "")),
            ))
    session.bulk_save_objects(growers)
    session.commit()
    print(f"  ✅ {len(growers)} growers loaded.")


def load_whatsapp(session: Session):
    print("Loading WhatsApp campaign log...")
    check_columns("whatsapp_campaign.csv",
                  ["id", "campaign_product", "campaign_crop", "grower_id",
                   "message_sent_date", "delivered_status", "opened_status", "clicked_status"])
    batch, batch_size = [], 500
    with open(DATA_DIR / "whatsapp_campaign.csv", encoding=ENCODING) as f:
        for row in csv.DictReader(f):
            batch.append(WhatsappCampaign(
                id=row["id"],
                campaign_product=row["campaign_product"],
                campaign_crop=row["campaign_crop"],
                grower_id=row["grower_id"],
                message_sent_date=parse_date(row["message_sent_date"]),
                delivered_status=parse_bool(row["delivered_status"]),
                opened_status=parse_bool(row["opened_status"]),
                clicked_status=parse_bool(row["clicked_status"]),
            ))
            if len(batch) >= batch_size:
                session.bulk_save_objects(batch)
                session.commit()
                batch = []
    if batch:
        session.bulk_save_objects(batch)
        session.commit()
    print("  ✅ WhatsApp log loaded.")


def load_digital_funnel(session: Session):
    print("Loading digital funnel weekly...")
    check_columns("digital_funnel_weekly.csv",
                  ["campaign_id", "week_start_date", "social_post_impression",
                   "landing_page_visits", "lead_form_submission",
                   "campaign_crop", "campaign_product"])
    rows = []
    with open(DATA_DIR / "digital_funnel_weekly.csv", encoding=ENCODING) as f:
        for row in csv.DictReader(f):
            rows.append(DigitalFunnel(
                campaign_id=row["campaign_id"],
                week_start_date=parse_date(row["week_start_date"]),
                social_post_impression=parse_int(row["social_post_impression"]) or 0,
                landing_page_visits=parse_int(row["landing_page_visits"]) or 0,
                lead_form_submission=parse_int(row["lead_form_submission"]) or 0,
                campaign_crop=row["campaign_crop"],
                campaign_product=row["campaign_product"],
            ))
    session.bulk_save_objects(rows)
    session.commit()
    print(f"  ✅ {len(rows)} digital funnel rows loaded.")


if __name__ == "__main__":
    print("Initialising database schema...")
    init_db()

    with Session(engine) as session:
        truncate_all(session)
        load_territories(session)
        load_reps(session)
        load_retailers(session)
        load_visit_log(session)
        load_inventory(session)
        load_pos(session)
        load_growers(session)
        load_whatsapp(session)
        load_digital_funnel(session)

    print("\n✅ All data loaded successfully.")
    print("\nFinal row counts:")
    with Session(engine) as session:
        expected = {
            "territories": 1, "reps": 500, "retailers": 4000,
            "retailer_visit_log": 30000, "retailer_inventory": 310544,
            "retailer_pos": 235042, "growers": 6000,
            "whatsapp_campaign": 4479, "digital_funnel": 104,
        }
        all_ok = True
        for t, exp in expected.items():
            n = session.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
            ok = n > 0
            icon = "✅" if ok else "❌ EMPTY"
            print(f"  {icon}  {t}: {n:,} (expected ~{exp:,})")
            if not ok:
                all_ok = False
        if not all_ok:
            print("\n⚠  Some tables are empty — check errors above.")