/*
A UI to interactively export waterbodies over a period of time
based on Sentinel-1 SAR images

TODO: Check filters, currently not filtering small areas
TODO: Select first timestep as start loop --> otherwise no data
TODO: Make UI with time slider and geometry selection tools
TODO: String to readible datetime insteadof timestamp

? maybe variance instead of stdDev?
? each image in stead of collection?

*/

/* -------------- USER INPUT -------------------- */
// Define water training set
var geometry = ee.Geometry.Polygon(
        [[[80.54,8.02],
          [80.54,8.01],
          [80.56,8.01],
          [80.56,8.02],
          [80.54,8.02]]]);
// Define AOI
var geometry2 = ee.Geometry.Polygon(
        [[[79.70,7.50],
          [80.51,7.50],
          [80.51,8.00],
          [79.70,8.00]]]);
// Define timesteps
var timestep = 2; // Defines timestep in months
var start = ee.Date.fromYMD(2016, 9, 1); // Defines start of timeseries
var end = ee.Date.fromYMD(2017, 8, 1); // Defines end of timeseries
var output = "water_" // Defines leading string when exporting to Drive

/* -------------- SCRIPT -------------------- */
// Initialize iterator
var start_i = start;
var end_i = start.advance(timestep,"month");

// Loop over each timestep
while (end.difference(end_i,"month").getInfo()>=0) {
  // Create layers
  var layer = ee.ImageCollection('COPERNICUS/S1_GRD')
    .filterBounds(geometry)
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
    .filterDate(start_i, end_i)
  //  .filter(ee.Filter.eq('instrumentMode', 'IW'))
    .median();
  var training = layer.clip(geometry);
  //var histogram = ui.Chart.image.histogram(training, geometry, 30)
  //print(histogram)

  // Get mean and SD in every band by combining reducers.
  var stats = layer.reduceRegion({
    reducer: ee.Reducer.mean().combine({
      reducer2: ee.Reducer.stdDev(),
      sharedInputs: true
    }),
    geometry: geometry,
    scale: 30,
    bestEffort: true
  });
  // Clip area below threshold
  if (stats.get("VH_stdDev").getInfo() < stats.get("VV_stdDev").getInfo()) {
    var threshold = stats.get("VH_mean").getInfo() + 3*stats.get("VV_stdDev").getInfo();
    var threshold_str = "VH";
    print("Use " + threshold_str + " as threshold = ", threshold);
  } else {
    var threshold = stats.get("VV_mean").getInfo() + 3*stats.get("VV_stdDev").getInfo();
    var threshold_str = "VV";
    print("Use " + threshold_str + " as threshold = ", threshold);
  }
  // Water filter to get more pleasing result
  var water = (layer.select(threshold_str).lt(threshold)).updateMask(layer.select(threshold_str).lt(threshold));
  var water = water.connectedPixelCount(1024 /* maxSize */, true /* eightConnected */);
  var water = water.gt(threshold);
  var water = water.mask(water);
  // Convert the defined water raster to features
  var water = water.reduceToVectors({
    scale: 30,
    geometry: geometry2,
    geometryType: 'polygon',
    eightConnected: false,
    labelProperty: 'water',
    maxPixels: 1e9
  });
  var str = output.concat((end_i.getInfo().value/1000).toString());
  print(str);

  // Export the FeatureCollection to a KML file.
  Export.table.toDrive({
    collection: water,
    description: str,
    fileFormat: 'KML'
  });

  // Update iterator
  start_i = end_i
  end_i = end_i.advance(timestep,"month");

}

// Style map
Map.centerObject(geometry,10);
Map.addLayer(layer,{min:-30,max:0},'S-1');
Map.addLayer(training,{min:-30,max:0},'S-1 trainingset');
Map.addLayer(water,{min:0,max:1,palette:"0000CC"},'Water');
