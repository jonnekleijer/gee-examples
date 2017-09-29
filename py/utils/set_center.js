// Set center to center of geometry point dynamically after defining geometry (works for points, lines, polygons)
var geometry = ee.Geometry.Point(85.682373046875,26.608174374033112)
Map.setCenter(geometry.centroid().getInfo().coordinates[0], geometry.centroid().getInfo().coordinates[1], 9);
