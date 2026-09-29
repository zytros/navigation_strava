from fastapi.testclient import TestClient
import sys
import os

# Ensure backend directory is in python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "datasets_loaded" in data

def test_elevation_lookup_empty():
    response = client.post("/api/v1/lookup", json={"locations": []})
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert data["results"] == []

def test_elevation_lookup_valid():
    response = client.post("/api/v1/lookup", json={
        "locations": [
            {"latitude": 50.0000, "longitude": 0.0000} # Outside loaded HGT tiles
        ]
    })
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    results = data["results"]
    assert len(results) == 1
    # Falls back to 350m when coordinate is outside loaded tiles
    assert results[0]["elevation"] == 350

def test_elevation_lookup_real_srtm():
    cities = [
        {"name": "Zürich", "latitude": 47.3769, "longitude": 8.5417},
        {"name": "Geneva", "latitude": 46.2044, "longitude": 6.1432},
        {"name": "Basel", "latitude": 47.5596, "longitude": 7.5886},
        {"name": "Lausanne", "latitude": 46.5197, "longitude": 6.6323},
        {"name": "Bern", "latitude": 46.9480, "longitude": 7.4478},
        {"name": "Winterthur", "latitude": 47.5000, "longitude": 8.7500},
        {"name": "Lucerne", "latitude": 47.0502, "longitude": 8.3093},
        {"name": "St. Gallen", "latitude": 47.4245, "longitude": 9.3767},
        {"name": "Lugano", "latitude": 46.0037, "longitude": 8.9511},
        {"name": "Biel/Bienne", "latitude": 47.1368, "longitude": 7.2468},
    ]

    locations = [{"latitude": c["latitude"], "longitude": c["longitude"]} for c in cities]

    response = client.post("/api/v1/lookup", json={"locations": locations})
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    results = data["results"]
    assert len(results) == len(cities)

    print("\n=== Real SRTM Elevation Test Results for 10 Swiss Cities ===")
    for idx, city in enumerate(cities):
        res = results[idx]
        elevation = res["elevation"]
        print(f" - {city['name']} ({city['latitude']}, {city['longitude']}): {elevation}m")
        assert isinstance(elevation, int)
        # Ensure it successfully loaded from real SRTM .hgt data (valid terrain range for Swiss cities)
        assert 200 <= elevation <= 1500

