// Convert RHDHV logo to .tif file
// Georeference RHDHV.tif
// Import image https://developers.google.com/earth-engine/image_upload

var img = ee.Image('users/jonnekleijer/RHDHV').visualize({
  bands: ['b1', 'b2', 'b3'],
  min: 0,
  max: 255,
  gamma: [1, 1, 1]
});
var tumb = ui.Thumbnail({
  image: img,
  style: {height: '101px', width: '228px'}
});

tumb.style().set('position', 'bottom-right')
Map.add(tumb)
