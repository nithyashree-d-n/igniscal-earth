"""CLI script to validate and inspect a FIRMS CSV dataset without starting the web server."""
import sys
import csv
from pathlib import Path

# Add backend to path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / "backend"))

from app.services.validation import DataValidator

def main():
    if len(sys.argv) < 2:
        csv_path = BASE_DIR / "data" / "sample" / "karnataka_fire_benchmark.csv"
        print(f"No file supplied. Inspecting default benchmark: {csv_path}")
    else:
        csv_path = Path(sys.argv[1])

    if not csv_path.exists():
        print(f"Error: File {csv_path} does not exist.")
        sys.exit(1)

    with open(csv_path, mode="r", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        records = list(reader)

    valid, summary = DataValidator.validate_records(
        raw_records=records,
        dataset_id="cli_audit",
        source_name=f"CLI File: {csv_path.name}",
        product_name="CSV_AUDIT"
    )

    print("=" * 60)
    print(f"DATASET QUALITY REPORT: {csv_path.name}")
    print("=" * 60)
    print(f"Total Raw Records:    {summary.total_raw_records}")
    print(f"Valid Records:        {summary.valid_records}")
    print(f"Invalid Records:      {summary.invalid_records}")
    print(f"Duplicate Records:    {summary.duplicate_records}")
    print(f"MODIS Observations:   {summary.modis_count}")
    print(f"VIIRS Observations:   {summary.viirs_count}")
    print(f"Date Range:           {summary.date_range_start} to {summary.date_range_end}")
    print(f"Spatial Extent:       {summary.spatial_extent}")
    print(f"Rejection Reasons:    {summary.rejection_reasons}")
    if summary.warning_messages:
        print("\nWarnings:")
        for w in summary.warning_messages:
            print(f"  • {w}")
    print("=" * 60)

if __name__ == "__main__":
    main()
