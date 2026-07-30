#!/usr/bin/env python3
"""
Download world coastline GeoJSON for the Carthage antique map.
Run: python3 data/download_geojson.py
"""
import urllib.request, json, os, sys

# Natural Earth 1:110m land polygons (ideal for antique map - just coastlines, no country borders)
urls = [
    ("ne_110m_land", "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson"),
    ("ne_50m_land", "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_land.geojson"),
    ("admin_0_countries", "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"),
]

out_dir = os.path.dirname(os.path.abspath(__file__))
out_file = os.path.join(out_dir, "world.geojson")

# Use 50m land for good detail
url = urls[1][1]
print("Downloading " + urls[1][0] + " from Natural Earth...")
try:
    urllib.request.urlretrieve(url, out_file)
    size_kb = os.path.getsize(out_file) / 1024
    print(f"Saved to {out_file} ({size_kb:.0f} KB)")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
