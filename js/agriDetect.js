/***
 * User variables
 */
var start = '2016-01-01'
var end = '2018-01-01'
var satellite = 'Sentinel 2' // Landsat 7, Landsat8, Sentinel 2,
var scale = 10
var th = 0.45
var maxCloud = 15
var zoomLevel = 12

/***
 * Config
 */
if (satellite == 'Landsat 8'){
  var imageCollection = ee.ImageCollection("LANDSAT/LC8_L1T_TOA")
  var bands = ['B5', 'B4']
  var cloudName = 'CLOUD_COVER_LAND'
  var viz = {bands: ['B4', 'B3', 'B2'], min:[0.05, 0.10, 0.10], max:[0.2, 0.2, 0.2],gamma: [0.95, 1.1, 1]}
} else if (satellite == 'Landsat 7') {
  var imageCollection = ee.ImageCollection("LANDSAT/LE7_L1T_TOA")
  var bands = ['B4', 'B3']
  var cloudName = 'CLOUD_COVER'
  var viz = {bands: ['B3', 'B2', 'B1'], min:[0.05, 0.10, 0.10], max:[0.2, 0.2, 0.2],gamma: [0.95, 1.1, 1]}
} else if (satellite == 'Sentinel 2'){
  var imageCollection = ee.ImageCollection("COPERNICUS/S2")
  var bands = ['B8', 'B4']
  var cloudName = 'CLOUDY_PIXEL_PERCENTAGE'
  var viz = {bands: ['B4', 'B3', 'B2'],min:[700, 1020, 1200], max:[1350, 1500, 1700],gamma: [0.95, 1.1, 1]}
}

/***
 * Calc
 */
imageCollection = imageCollection.filterDate(start, end).filter(ee.Filter.lt(cloudName, maxCloud))
var imageCollection_NDVI = imageCollection.map(function(image) {
  var ndvi = image.normalizedDifference(bands).rename('NDVI')
  return image.addBands(ndvi)
})
var chart = ui.Chart.image.seriesByRegion({
  imageCollection: imageCollection_NDVI.select('NDVI'),
  regions: [beel, agri],
  reducer: ee.Reducer.mean(),
  scale: scale
  })
  .setChartType('LineChart')
  .setOptions({
    title: 'NDVI over time',
    vAxis: {title: 'NDVI (NIR-RED/(NIR+RED)'},
    lineWidth: 1,
    pointSize: 4,
    series: {
      0: {color: '0000FF'}, // beel
      1: {color: '00FF00'}, // agri
      //2: {color: '009000'}  // forest
    }
  })

Map.centerObject(ee.FeatureCollection([agri,beel,forest]))
Map.setZoom(zoomLevel)
var bounds = ee.Geometry(Map.getBounds(true))
var image = ee.Image(imageCollection.filterBounds(bounds.centroid(10)).filter(ee.Filter.lt(cloudName, maxCloud)).first())
var vizNDVI = {bands: ['NDVI'], min:[0], max:[0.5], palette: ['#d7191c','#fdae61','#ffffbf','#a6d96a','#1a9641']}
var ndvi = image.normalizedDifference(bands).rename('NDVI')

/***
 * Map settings
 */
print(image)
Map.addLayer(image, viz, 'image_rgb')
Map.addLayer(ndvi, vizNDVI, 'NDVI')
Map.addLayer(ndvi.mask(ndvi.gt(th)), vizNDVI, 'NDVI')
print(chart)
