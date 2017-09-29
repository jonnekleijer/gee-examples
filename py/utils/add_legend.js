// User input
var palette = ['FFFFFF','F3F9CF','DDFCD8','B6EFC2','79C5B0','5CB2A7','56A6C0','2D85BC','1F669C','013AA4','351457','77426C'];
var min = 0;
var max = 275;

// Add legend
var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px'
  }
});
var legendTitle = ui.Label({
  value: 'Precipitation (in mm)',
  style: {
    fontWeight: 'bold',
    fontSize: '18px',
    margin: '0 0 4px 0',
    padding: '0'
    }
});
legend.add(legendTitle);
var makeRow = function(color, name) {
      var colorBox = ui.Label({
        style: {
          backgroundColor: '#' + color,
          padding: '8px',
          margin: '0 0 4px 0'
        }
      });
      var description = ui.Label({
        value: name,
        style: {margin: '0 0 4px 6px'}
      });
      return ui.Panel({
        widgets: [colorBox, description],
        layout: ui.Panel.Layout.Flow('horizontal')
      });
};
function range(start, stop, step){
  var a=[start], b=start;
  while(b<stop){b+=step;a.push(b)}
  return a;
}
var names = range(min, max, (max-min)/11);
for (var i = 0; i < 12; i++) {
  legend.add(makeRow(palette[i], names[i]));
  }

// Add legend to map
Map.add(legend);
