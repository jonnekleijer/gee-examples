/***
 * The script computes surface water mask using Canny Edge detector and Otsu thresholding
 * See the following paper for details: http://www.mdpi.com/2072-4292/8/5/386
 *
 * Author: Gennadii Donchyts (gennadiy.donchyts@gmail.com)
 * Contributors: Nicholas Clinton (nclinton@google.com) - re-implemented otsu() using ee.Array
 *               Jonne Kleijer (jonne.kleijer@rhdhv.com) - specific application to Bangladesh ponds
 */

/***
 * User variables
 * Northern Bangladesh
var start = '2016-02-01'; var end = '2017-11-06'
var geom = ee.Geometry.Point(89.35, 24.45)
 */
var start = '2017-03-01'; var end = '2017-05-01'
var geom = ee.Geometry.Point(89.5, 23.25)
var s2 = ee.ImageCollection("COPERNICUS/S2");

/***
 * Map settings
 */
Map.setCenter(geom.getInfo().coordinates[0], geom.getInfo().coordinates[1])
Map.setZoom(14)
s2 = s2.filterDate(start, end)

/***
 * Return the DN that maximizes interclass variance in B5 (in the region).
 */
var otsu = function(histogram) {
    histogram = ee.Dictionary(histogram);

    var counts = ee.Array(histogram.get('histogram'));
    var means = ee.Array(histogram.get('bucketMeans'));
    var size = means.length().get([0]);
    var total = counts.reduce(ee.Reducer.sum(), [0]).get([0]);
    var sum = means.multiply(counts).reduce(ee.Reducer.sum(), [0]).get([0]);
    var mean = sum.divide(total);

    var indices = ee.List.sequence(1, size);

    // Compute between sum of squares, where each mean partitions the data.
    var bss = indices.map(function(i) {
        var aCounts = counts.slice(0, 0, i);
        var aCount = aCounts.reduce(ee.Reducer.sum(), [0]).get([0]);
        var aMeans = means.slice(0, 0, i);
        var aMean = aMeans.multiply(aCounts)
            .reduce(ee.Reducer.sum(), [0]).get([0])
            .divide(aCount);
        var bCount = total.subtract(aCount);
        var bMean = sum.subtract(aCount.multiply(aMean)).divide(bCount);
        return aCount.multiply(aMean.subtract(mean).pow(2)).add(
            bCount.multiply(bMean.subtract(mean).pow(2)));
    });

    // Return the mean value corresponding to the maximum BSS.
    return means.sort(bss).get([-1]);
};


/***
 * Compute a threshold using Otsu method (bimodal)
 */
function computeThresholdUsingOtsu(image, scale, bounds, cannyThreshold, cannySigma, minValue, debug) {
    // clip image edges
    var mask = image.mask().gt(0).focal_min(ee.Number(scale).multiply(3), 'circle', 'meters');

    // detect sharp changes
    var edge = ee.Algorithms.CannyEdgeDetector(image, cannyThreshold, cannySigma);
    edge = edge.multiply(mask);

    // buffer around NDWI edges
    var edgeBuffer = edge.focal_max(ee.Number(scale).multiply(1), 'square', 'meters');
    var imageEdge = image.mask(edgeBuffer);

    // compute threshold using Otsu thresholding
    var buckets = 100;
    var hist = ee.Dictionary(ee.Dictionary(imageEdge.reduceRegion(ee.Reducer.histogram(buckets), bounds, scale)).values().get(0));

    var threshold = ee.Algorithms.If(hist.contains('bucketMeans'), otsu(hist), 0.3);
    threshold = ee.Number(threshold)//.add(0.05)

    if(debug) {
        Map.addLayer(edge.mask(edge), {palette:['ff0000']}, 'edges', false);

        print('Threshold: ', threshold);

        print(ui.Chart.image.histogram(image, bounds, scale, buckets));
        print(ui.Chart.image.histogram(imageEdge, bounds, scale, buckets));
        Map.addLayer(mask.mask(mask), {palette:['000000']}, 'image mask', false);
    }

    return minValue !== 'undefined' ? threshold.max(minValue) : threshold;
}

var bounds = ee.Geometry(Map.getBounds(true))
var image = ee.Image(s2.filterBounds(bounds.centroid(10)).filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 5)).first())
print(image)

var vizParams = {bands: ['B4', 'B3', 'B2'],min:[900, 1220, 1500], max:[1350, 1500, 1700],gamma: [0.95, 1.1, 1]};
var vizParams = {bands: ['B4', 'B3', 'B2'],min:[700, 1020, 1300], max:[1350, 1500, 1700],gamma: [0.95, 1.1, 1]};

Map.addLayer(image, vizParams, 'image_rgb')
Map.addLayer(image, {bands: ['B3', 'B8', 'B3'], min:500, max:3000}, 'image_ndwi')
var ndwi = image.normalizedDifference(['B3', 'B8'])

var debug = true
var scale = 10
var cannyThreshold = 0.9
var cannySigma = 1
var minValue = -0.1
var th = computeThresholdUsingOtsu(ndwi, scale, bounds, cannyThreshold, cannySigma, minValue, debug)

print(th)

function getEdge(mask) {
  return mask.subtract(mask.focal_min(1))
}

Map.addLayer(ndwi.mask(ndwi.gt(th)), {palette:'0000ff'}, 'water (th=' + th.getInfo() + ')')
Map.addLayer(ndwi.mask(getEdge(ndwi.gt(th))), {palette:'ffffff'}, 'water edge (th=' + th.getInfo() + ')')
