#! /usr/bin/env python
# -*- coding: utf-8 -*-
# Jonne Kleijer, Royal HaskoningDHV
# Import the Earth Engine Python Package

import ee
import ee.mapclient
import math


# Initialize the Earth Engine object, using the authentication credentials.
ee.Initialize()

geometry = ee.Geometry.Polygon(
        [[[-80.71929931640625, 27.049341619870376],
          [-80.91705322265625, 27.0273241305333],
          [-80.92529296875, 26.9196209739275],
          [-80.86761474609375, 26.80446076654616]]]);

# loop over time
start = ee.Date.fromYMD(2016, 1, 1)
end = ee.Date.fromYMD(2017, 1, 1)
diff = start.difference(end, "month")
start.advance(1,"month").getInfo()
end_i = end_i.advance(1,"month")
# Print the information for an image asset.
image = ee.Image('srtm90_v4')
print(image.getInfo())

# Get a download URL for an image.
image = ee.Image('srtm90_v4')
path = image.getDownloadUrl({
    'scale': 30,
    'crs': 'EPSG:4326',
    'region': '[[-120, 35], [-119, 35], [-119, 34], [-120, 34]]'
})
print(path)
ee.mapclient.centerMap(-119.5, 34.5, 11)
ee.mapclient.addToMap(image)

# Hillshade
ee.mapclient.centerMap(-121.767, 46.852, 11)
def Radians(img):
  return img.toFloat().multiply(math.pi).divide(180)

def Hillshade(az, ze, slope, aspect):
  """Compute hillshade for the given illumination az, el."""
  azimuth = Radians(ee.Image(az))
  zenith = Radians(ee.Image(ze))
  # Hillshade = cos(Azimuth - Aspect) * sin(Slope) * sin(Zenith) +
  #     cos(Zenith) * cos(Slope)
  return (azimuth.subtract(aspect).cos()
          .multiply(slope.sin())
          .multiply(zenith.sin())
          .add(
              zenith.cos().multiply(slope.cos())))

terrain = ee.Algorithms.Terrain(ee.Image('srtm90_v4'))
slope_img = Radians(terrain.select('slope'))
aspect_img = Radians(terrain.select('aspect'))

# Add 1 hillshade at az=0, el=60.
ee.mapclient.addToMap(Hillshade(0, 60, slope_img, aspect_img))