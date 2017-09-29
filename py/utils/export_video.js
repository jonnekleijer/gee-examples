// Load a Landsat 5 image collection.
var collection = ee.ImageCollection('LANDSAT/LT5_L1T_TOA')
  // San Francisco Bay.
  .filter(ee.Filter.eq('WRS_PATH', 44))
  .filter(ee.Filter.eq('WRS_ROW', 34))
  // Filter cloudy scenes.
  .filter(ee.Filter.lt('CLOUD_COVER', 30))
  // Get 20 years of imagery.
  .filterDate('1991-01-01','2011-12-30')
  // Need to have 3-band imagery for the video.
  .select(['B4', 'B3', 'B2'])
  // Need to make the data 8-bit.
  .map(function(image) {
    return image.multiply(512).uint8();
  });

// Define an area to export.
var polygon = ee.Geometry.Rectangle([-122.7286, 37.6325, -122.0241, 37.9592]);
Map.setCenter(polygon.centroid().getInfo().coordinates[0], polygon.centroid().getInfo().coordinates[1], 9);

// Export (change dimensions or scale for higher quality).
Export.video.toDrive({
  collection: collection,
  description: 'sfVideoExample',
  dimensions: 720,
  framesPerSecond: 12,
  region: polygon
});
