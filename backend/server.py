from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import os
import glob
import rasterio
import numpy as np
import atexit

app = FastAPI(title="VeloRoute Local Elevation Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATASET_DIR = "/datasets"
datasets = {}

def load_datasets():
    dirs_to_check = [
        os.environ.get("DATASET_DIR", DATASET_DIR),
        os.path.join(os.path.dirname(__file__), "data", "dem"),
        "./data/dem",
        "../backend/data/dem"
    ]
    
    for d in dirs_to_check:
        if d and os.path.exists(d):
            pattern_hgt = os.path.join(d, "**", "*.hgt")
            pattern_tif = os.path.join(d, "**", "*.tif")
            files = glob.glob(pattern_hgt, recursive=True) + glob.glob(pattern_tif, recursive=True)
            for fpath in files:
                if fpath not in datasets:
                    try:
                        ds = rasterio.open(fpath)
                        datasets[fpath] = ds
                        print(f"Loaded DEM dataset: {fpath}")
                    except Exception as e:
                        print(f"Failed to load DEM {fpath}: {e}")

load_datasets()

@atexit.register
def cleanup_datasets():
    for fpath, ds in list(datasets.items()):
        try:
            ds.close()
        except Exception:
            pass

@app.post("/api/v1/lookup")
async def lookup(request: Request):
    try:
        body = await request.json()
        locations = body.get("locations", [])
        results = []

        # Refresh datasets in case new .hgt/.tif files were added
        load_datasets()

        for loc in locations:
            lat = loc.get("latitude", 0)
            lng = loc.get("longitude", 0)
            elevation = None

            # Search loaded raster datasets for the point
            for fpath, ds in datasets.items():
                try:
                    if ds.bounds.left <= lng <= ds.bounds.right and ds.bounds.bottom <= lat <= ds.bounds.top:
                        row, col = ds.index(lng, lat)
                        val = ds.read(1, window=((row, row+1), (col, col+1)))
                        if val.size > 0 and not np.isnan(val[0, 0]) and val[0, 0] > -1000:
                            elevation = float(val[0, 0])
                            break
                except Exception:
                    continue

            # Fallback to 350m if no DEM tile covers this point
            if elevation is None:
                elevation = 350.0

            results.append({
                "latitude": lat,
                "longitude": lng,
                "elevation": round(elevation)
            })

        return {"results": results}
    except Exception as e:
        return {"error": str(e), "results": []}

@app.get("/health")
def health():
    load_datasets()
    return {"status": "ok", "datasets_loaded": list(datasets.keys())}
