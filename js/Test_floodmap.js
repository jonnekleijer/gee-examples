// Load Sentinel-1 images to map Seine-et-Marne flooding, France, May-June 2016.
// This script was originally written by Simon Ilyushchenko (GEE team)
// Default location
var pt = ee.Geometry.Point(81.5776, 7.7637); // Grand Morin near Coulommiers
// Load Sentinel-1 C-band SAR Ground Range collection (log scaling, VV co-polar)
var collection = ee.ImageCollection('COPERNICUS/S1_GRD').filterBounds(pt)
.filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
.select('VV');
// Filter by date
var before = collection.filterDate('2016-04-01', '2016-04-15').mosaic();
print('before: ', before);
var after = collection.filterDate('2016-05-14', '2016-05-19').mosaic();
print('after: ', after);
// Threshold smoothed radar intensities to identify "flooded" areas.
var SMOOTHING_RADIUS = 100;
var DIFF_UPPER_THRESHOLD = -3;
var diff_smoothed = after.focal_median(SMOOTHING_RADIUS, 'circle', 'meters')
.subtract(before.focal_median(SMOOTHING_RADIUS, 'circle', 'meters'));
//var diff_thresholded = diff_smoothed.lt(DIFF_UPPER_THRESHOLD);
var diff_thresholded = diff_smoothed.lt(DIFF_UPPER_THRESHOLD).and(before.gt(-15));
// Display map
Map.centerObject(pt, 13);
Map.addLayer(before, {min:-30,max:0}, 'Before flood');
Map.addLayer(after, {min:-30,max:0}, 'After flood');
Map.addLayer(after.subtract(before), {min:-10,max:10}, 'After - before', 0);
Map.addLayer(diff_smoothed, {min:-10,max:10}, 'diff smoothed', 0);
Map.addLayer(diff_thresholded.updateMask(diff_thresholded),
{palette:"0000FF"},'flooded areas - blue',1);