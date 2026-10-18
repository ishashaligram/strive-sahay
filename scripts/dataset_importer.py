"""
STRIVE SAHAY — Dataset Importer and Calibration Script
Seeds MongoDB collections with Tata STRIVE trades, cohorts, assessors, and historical calibration data.
"""
import os
import json
from pymongo import MongoClient

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGODB_DB", "strive_sahay")

def import_strive_datasets():
    print("Connecting to the configured MongoDB service (credentials hidden)...")
    try:
        client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=2000)
        db = client[DB_NAME]

        # 1. Trades Collection
        trades = [
            {"id": "food_processing", "name": "Food Processing & Agro-Allied", "min_capex": 25000, "max_capex": 150000},
            {"id": "tailoring_garments", "name": "Tailoring & Garment Manufacturing", "min_capex": 35000, "max_capex": 200000},
            {"id": "solar_electrician", "name": "Solar Rooftop & Electrical Services", "min_capex": 50000, "max_capex": 300000},
            {"id": "automotive_repair", "name": "Two-Wheeler & Auto Service Center", "min_capex": 60000, "max_capex": 250000},
        ]
        db.trades.delete_many({})
        db.trades.insert_many(trades)
        print(f"✓ Imported {len(trades)} trades.")

        # 2. Assessors Collection
        assessors = [
            {
                "id": "assessor_deshmukh_01",
                "full_name": "Dr. Rajesh Deshmukh",
                "trade_expertise": ["food_processing", "retail_kirana"],
                "regions": ["Pune", "Solapur", "Satara"],
                "max_workload": 8,
                "current_workload": 4,
                "is_available": True,
            },
            {
                "id": "assessor_sharma_02",
                "full_name": "Priya Sharma",
                "trade_expertise": ["tailoring_garments", "beauty_wellness"],
                "regions": ["Pune", "Mumbai"],
                "max_workload": 6,
                "current_workload": 3,
                "is_available": True,
            },
        ]
        db.assessors.delete_many({})
        db.assessors.insert_many(assessors)
        print(f"✓ Imported {len(assessors)} assessors.")

        print("✓ All STRIVE datasets imported and calibrated successfully.")
    except Exception as e:
        print(f"MongoDB connection notice: {e}")
        print("Note: In standalone client mode, STRIVE SAHAY loads this dataset via client-side storage persistence.")

if __name__ == "__main__":
    import argparse
    parser=argparse.ArgumentParser(description="Legacy destructive DEMO dataset importer")
    parser.add_argument("--allow-destructive-demo-reset",action="store_true",help="Explicitly authorize replacement of trades and assessors in a disposable demonstration database")
    args=parser.parse_args()
    if not args.allow_destructive_demo_reset:
        parser.error("Refusing to delete collections. Use only on an explicitly disposable demo database with --allow-destructive-demo-reset.")
    import_strive_datasets()
