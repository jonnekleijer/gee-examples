// A UI to interactively filter a collection, select an individual image
// from the results, display it with a variety of visualizations, and export it.

// The namespace for our application.  All the state is kept in here.
var app = {};

/* The sattelite picker section. */
var coll = {
  'Landsat 5': ['LEDAPS/LT5_L1T_SR','CLOUD_COVER',{gamma: 1.3, min: 0, max: 6000, bands: ['B3', 'B2', 'B1']},{gamma: 1.3, min: 0, max: 6000, bands: ['B4', 'B3', 'B2']}],
  'Landsat 7': ['LEDAPS/LE7_L1T_SR','catalog_cloud_cover',{gamma: 1.3, min: 0, max: 6000, bands: ['B3', 'B2', 'B1']},{gamma: 1.3, min: 0, max: 6000, bands: ['B4', 'B3', 'B2']}],
  'Landsat 8': ['LANDSAT/LC8_L1T_TOA','CLOUD_COVER',{gamma: 1.3, min: 0, max: 0.3, bands: ['B4', 'B3', 'B2']},{gamma: 1.3, min: 0, max: 0.3, bands: ['B5', 'B4', 'B3']}],
  'Sentinel 2': ['COPERNICUS/S2','CLOUDY_PIXEL_PERCENTAGE',{gamma: 1.3, min: 0, max: 6000, bands: ['B4', 'B3', 'B2']},{gamma: 1.3, min: 0, max: 6000, bands: ['B8', 'B4', 'B3']}]
};
var collections = ui.Select({items: Object.keys(coll),onChange: function(key) {}});

/** Creates the UI panels. */
app.createPanels = function() {
  /* The introduction section. */


  /* The collection filter controls. */
  app.filters = {
    mapCenter: ui.Checkbox({label: 'Filter to map center', value: true}),
    startDate: ui.Textbox('YYYY-MM-DD', '2000-02-01'),
    endDate: ui.Textbox('YYYY-MM-DD', '2002-03-01'),
    maxCloud: ui.Textbox('Cloud Percentage', 50),
    applyButton: ui.Button('Apply filters', app.applyFilters),
    loadingLabel: ui.Label({
      value: 'Loading...',
      style: {stretch: 'vertical', color: 'gray', shown: false}
    })
  };

  /* The panel for the filter control widgets. */
  app.filters.panel = ui.Panel({
    widgets: [
      ui.Label('1)Select a Sattelite', {fontWeight: 'bold'}),
      collections,
      ui.Label('2) Select filters', {fontWeight: 'bold'}),
      ui.Label('Start date', app.HELPER_TEXT_STYLE), app.filters.startDate,
      ui.Label('End date', app.HELPER_TEXT_STYLE), app.filters.endDate,
      ui.Label('Max Cloudcover', app.HELPER_TEXT_STYLE), app.filters.maxCloud,
      app.filters.mapCenter,
      ui.Panel([
        app.filters.applyButton,
        app.filters.loadingLabel
      ], ui.Panel.Layout.flow('horizontal'))
    ],
    style: app.SECTION_STYLE
  });

  /* The image picker section. */
  app.picker = {
    // Create a select with a function that reacts to the "change" event.
    select: ui.Select({
      placeholder: 'Select an image ID',
      onChange: app.refreshMapLayer
    }),
    // Create a button that centers the map on a given object.
    centerButton: ui.Button('Center on map', function() {
      Map.centerObject(Map.layers().get(0).get('eeObject'));
    })
  };


  /* The panel for the picker section with corresponding widgets. */
  app.picker.panel = ui.Panel({
    widgets: [
      ui.Label('3) Select an image', {fontWeight: 'bold'}),
      ui.Panel([
        app.picker.select,
        app.picker.centerButton
      ], ui.Panel.Layout.flow('horizontal'))
    ],
    style: app.SECTION_STYLE
  });

  /* The visualization section. */
  app.vis = {
    label: ui.Label(),
    // Create a select with a function that reacts to the "change" event.
    select: ui.Select({
      items: Object.keys(app.VIS_OPTIONS),
      onChange: function() {
        // Update the label's value with the select's description.
        var option = app.VIS_OPTIONS[app.vis.select.getValue()];
        app.vis.label.setValue(option.description);
        // Refresh the map layer.
        app.refreshMapLayer();
      }
    })
  };

  /* The panel for the visualization section with corresponding widgets. */
  app.vis.panel = ui.Panel({
    widgets: [
      ui.Label('4) Select a visualization', {fontWeight: 'bold'}),
      app.vis.select,
      app.vis.label
    ],
    style: app.SECTION_STYLE
  });

  // Default the select to the first value.
  app.vis.select.setValue(app.vis.select.items().get(0));

  /* The export section. */
  app.export = {
    button: ui.Button({
      label: 'Export the current image to Drive',
      // React to the button's click event.
      onClick: function() {
        // Select the full image id.
        var imageIdTrailer = app.picker.select.getValue();
        var imageId = (String(coll[collections.getValue()][0])) + '/' + imageIdTrailer;
        // Get the visualization options.
              if (app.vis.select.getValue()=='Natural color') {
        var visOption = coll[collections.getValue()][2]
        } 
      else {
        var visOption = coll[collections.getValue()][3]
        }
        // Export the image to Drive.
        Export.image.toDrive({
          image: ee.Image(imageId).select(visOption.bands),
          description: 'Export-' + imageIdTrailer,
        });
      }
    })
  };

  /* The panel for the export section with corresponding widgets. */
  app.export.panel = ui.Panel({
    widgets: [
      ui.Label('5) Start an export', {fontWeight: 'bold'}),
      app.export.button
    ],
    style: app.SECTION_STYLE
  });
};

/** Creates the app helper functions. */
app.createHelpers = function() {
  /**
   * Enables or disables loading mode.
   * @param {boolean} enabled Whether loading mode is enabled.
   */
  app.setLoadingMode = function(enabled) {
    // Set the loading label visibility to the enabled mode.
    app.filters.loadingLabel.style().set('shown', enabled);
    // Set each of the widgets to the given enabled mode.
    var loadDependentWidgets = [
      app.vis.select,
      app.filters.startDate,
      app.filters.endDate,
      app.filters.maxCloud,
      app.filters.applyButton,
      app.filters.mapCenter,
      app.picker.select,
      app.picker.centerButton,
      app.export.button
    ];
    loadDependentWidgets.forEach(function(widget) {
      widget.setDisabled(enabled);
    });
  };

  /** Applies the selection filters currently selected in the UI. */
  app.applyFilters = function() {
    app.setLoadingMode(true);
    var filtered = ee.ImageCollection((String(coll[collections.getValue()][0])));

    // Filter bounds to the map if the checkbox is marked.
    if (app.filters.mapCenter.getValue()) {
      filtered = filtered.filterBounds(Map.getCenter());
    }

    // Set filter variables.
    var start = app.filters.startDate.getValue();
    if (start) start = ee.Date(start);
    var end = app.filters.endDate.getValue();
    if (end) end = ee.Date(end);
    if (start) filtered = filtered.filterDate(start, end);
    var cloud = app.filters.maxCloud.getValue();
    if (cloud) cloud = Number(cloud);
    if (cloud) filtered = filtered.filterMetadata(String(coll[collections.getValue()][1]), 'less_than', cloud);

    // Get the list of computed ids.
    var computedIds = filtered
        .limit(app.IMAGE_COUNT_LIMIT)
        .reduceColumns(ee.Reducer.toList(), ['system:index'])
        .get('list');

    computedIds.evaluate(function(ids) {
      // Update the image picker with the given list of ids.
      app.setLoadingMode(false);
      app.picker.select.items().reset(ids);
      // Default the image picker to the first id.
      app.picker.select.setValue(app.picker.select.items().get(0));
    });
  };

  /** Refreshes the current map layer based on the UI widget states. */
  app.refreshMapLayer = function() {
    Map.clear();
    var imageId = app.picker.select.getValue();
    if (imageId) {
      // If an image id is found, create an image.
      var image = ee.Image((String(coll[collections.getValue()][0])) + '/' + imageId);
      // Add the image to the map with the corresponding visualization options.
      if (app.vis.select.getValue()=='Natural color') {
        var visOption = coll[collections.getValue()][2]
        } 
      else {
        var visOption = coll[collections.getValue()][3]
        }
      Map.addLayer(image, visOption, imageId);
    }
  };
};

/** Creates the app constants. */
app.createConstants = function() {
  app.SECTION_STYLE = {margin: '20px 0 0 0'};
  app.HELPER_TEXT_STYLE = {
      margin: '8px 0 -3px 8px',
      fontSize: '12px',
      color: 'gray'
  };
  app.IMAGE_COUNT_LIMIT = 10;
  app.VIS_OPTIONS = {
    'Natural color': {
      description: 'Ground features appear in colors similar to their ' +
                   'appearance to the human visual system.',
      
    },
    'False color': {
      description: 'Vegetation is shades of red, urban areas are ' +
                   'cyan blue, and soils are browns.',
      
    },
  };
};

/** Creates the application interface. */
app.boot = function() {
  app.createConstants();
  app.createHelpers();
  app.createPanels();
  var main = ui.Panel({
    widgets: [
      app.filters.panel,
      app.picker.panel,
      app.vis.panel,
      app.export.panel
    ],
    style: {width: '320px', padding: '8px'}
  });
  Map.setCenter(-97, 26, 9);
  ui.root.insert(0, main);
  
};

app.boot();