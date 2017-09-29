/*
A UI to interactively filter a collection, select an individual image
from the results, estimate the water based on a defined geometry.

TODO: Move creation of waterVect to a function
TODO: Remove open polygons in water;
TODO: Move update vector layer in app.vis;
TODO: Loop over images and export them;
TODO: Add logo to information panel;
TODO: Export raster or vector
TODO: Naming of "selct an image"
*/


// The namespace for our application.  All the state is kept in here.
var app = {};

/** Creates the UI panels. */
app.createPanels = function() {
  /* The introduction section. */
  app.intro = {
    panel: ui.Panel([
      ui.Label({
        value: 'SAR water detection',
        style: {fontWeight: 'bold', fontSize: '24px', margin: '10px 5px'}
      }),
      ui.Label('This app allows you to identify water based on the '+
       'VH and VV values in the already defined polygon (i.e. geometry).' +
       'The area to be evaluated is the bounds of your map.')
    ])
  };

  /* The collection filter controls. */
  app.filters = {
    startDate: ui.Textbox('YYYY-MM-DD', '2017-07-01'),
    endDate: ui.Textbox('YYYY-MM-DD', '2017-12-01'),
    applyButton: ui.Button('Apply filters', app.applyFilters),
    loadingLabel: ui.Label({
      value: 'Loading...',
      style: {stretch: 'vertical', color: 'gray', shown: false}
    })
  };

  /* The panel for the filter control widgets. */
  app.filters.panel = ui.Panel({
    widgets: [
      ui.Label('1) Select filters', {fontWeight: 'bold'}),
      ui.Label('Start date', app.HELPER_TEXT_STYLE), app.filters.startDate,
      ui.Label('End date', app.HELPER_TEXT_STYLE), app.filters.endDate,
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
    }),
    label: ui.Label(),
  };

  /* The panel for the picker section with corresponding widgets. */
  app.picker.panel = ui.Panel({
    widgets: [
      ui.Label('2) Select an image', {fontWeight: 'bold'}),
      ui.Panel([
        app.picker.select,
        app.picker.centerButton
      ], ui.Panel.Layout.flow('horizontal')),
      app.picker.label
    ],
    style: app.SECTION_STYLE
  });

  /* The visualization section. */
  app.vis = {
    sliderRes:ui.Slider({min:10, max:100, value:10, step: 10}),
    sliderThreshold: ui.Slider({min:0, max:1000, value:100, step: 50}),
    sliderSigma: ui.Slider({min:1, max:3, value:3, step: 0.5}),
    label: ui.Label(),
  };

  /* The panel for the visualization section with corresponding widgets. */
  app.vis.panel = ui.Panel({
    widgets: [
      ui.Label('3) Select detection variables', {fontWeight: 'bold'}),
      ui.Label('Select spatial resolution', app.HELPER_TEXT_STYLE), app.vis.sliderRes,
      ui.Label('Select minimal body size', app.HELPER_TEXT_STYLE), app.vis.sliderThreshold,
      ui.Label('Select σ*mean value in geometry', app.HELPER_TEXT_STYLE), app.vis.sliderSigma,
      app.vis.label
    ],
    style: app.SECTION_STYLE
  });

  /* The export section. */
  app.export = {
    button: ui.Button({
      label: 'Export the current image to Drive',
      // React to the button's click event.
      onClick: function() {
        // Select the full image id.
        var imageIdTrailer = app.picker.select.getValue();
        var imageId = app.COLLECTION_ID + '/' + imageIdTrailer;

        // Get initialization variables
        var res = Number(app.vis.sliderRes.getValue())
        var thresholdSize = Number(app.vis.sliderThreshold.getValue());
        var sigma = Number(app.vis.sliderSigma.getValue());

        // Get the visualization options.
        var layer = ee.Image(imageId);
        var stats = layer.reduceRegion({
          reducer: ee.Reducer.mean().combine({
            reducer2: ee.Reducer.stdDev(),
            sharedInputs: true
          }),
          geometry: geometry,
          scale: res,
          bestEffort: true
        });
         if (stats.get("VH_stdDev").getInfo() < stats.get("VV_stdDev").getInfo()) {
          var threshold = stats.get("VH_mean").getInfo() + sigma*stats.get("VH_stdDev").getInfo();
          var threshold_str = "VH";
          print("Use " + threshold_str + " as threshold = ", threshold);

        } else {
          var threshold = stats.get("VV_mean").getInfo() + sigma*stats.get("VV_stdDev").getInfo();
          var threshold_str = "VV";
          print("Use " + threshold_str + " as threshold = ", threshold);
        }

        // Water filter to get more pleasing result
        var water = (layer.select(threshold_str).lt(threshold)).updateMask(layer.select(threshold_str).lt(threshold));
        var waterMask = water.connectedPixelCount(1024, true).gt(thresholdSize).mask(water);
        var waterMasked = (waterMask.select(threshold_str).gt(0)).updateMask(waterMask.select(threshold_str).gt(0));

        // Convert the defined water raster to features
        var geometryIm = Map.getBounds(true);
        var waterVect = waterMasked.reduceToVectors({
          scale: res,
          geometry: geometryIm,
          geometryType: 'polygon',
          eightConnected: false,
          labelProperty: 'water',
          maxPixels: 1e9
        });
        Map.addLayer(waterMasked,{min:0,max:1,palette:"0000CC"},'Water')
        //Map.addLayer(waterVect,{min:0,max:1,palette:"0000CC"},'Water')
        var str = app.OUTPUT.concat(imageId.substring(35, 43));

        // Export the FeatureCollection to a KML file.
        Export.table.toDrive({
          collection: waterVect,
          description: str,
          fileFormat: 'KML'
        });
      }
    })
  };

  /* The panel for the export section with corresponding widgets. */
  app.export.panel = ui.Panel({
    widgets: [
      ui.Label('4) Draw an polygon', {fontWeight: 'bold'}),
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
      app.filters.startDate,
      app.filters.endDate,
      app.filters.applyButton,
      app.picker.select,
      app.picker.centerButton,
      app.vis.sliderRes,
      app.vis.sliderThreshold,
      app.vis.sliderSigma,
      app.export.button
    ];
    loadDependentWidgets.forEach(function(widget) {
      widget.setDisabled(enabled);
    });
  };

  /** Applies the selection filters currently selected in the UI. */
  app.applyFilters = function() {
    app.setLoadingMode(true);
    var filtered = ee.ImageCollection(app.COLLECTION_ID);

    // Filter bounds to the centre of the geometry.
    filtered = filtered.filterBounds(geometry.centroid());

    // Set filter variables.
    var start = app.filters.startDate.getValue();
    if (start) start = ee.Date(start);
    var end = app.filters.endDate.getValue();
    if (end) end = ee.Date(end);
    if (start) filtered = filtered.filterDate(start, end).filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
.select('VV');

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
      var image = ee.Image(app.COLLECTION_ID + '/' + imageId);
      // Add the image to the map with the corresponding visualization options.
      var visOption = app.VIS_OPTIONS['True'];
      Map.addLayer(image, visOption.visParams, 'Sentinel-1 on 20' + imageId.substring(35, 41));
    }
  };
};

/** Creates the app constants. */
app.createConstants = function() {
  app.COLLECTION_ID = 'COPERNICUS/S1_GRD';
  app.OUTPUT = 'water';
  app.SECTION_STYLE = {margin: '20px 0 0 0'};
  app.HELPER_TEXT_STYLE = {
      margin: '8px 0 -3px 8px',
      fontSize: '12px',
      color: 'gray'
  };
  app.IMAGE_COUNT_LIMIT = 10;
  app.VIS_OPTIONS = {
    'True': {
      description: ' ' +
                   '',
      visParams: {gamma: 1.3, min: -30, max: 0, bands: ['VV']}
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
      app.intro.panel,
      app.filters.panel,
      app.picker.panel,
      app.vis.panel,
      app.export.panel
    ],
    style: {width: '320px', padding: '8px'}
  });
  Map.setCenter(geometry.centroid().getInfo().coordinates[0], geometry.centroid().getInfo().coordinates[1], 9);
  ui.root.insert(0, main);
  app.applyFilters();
};

app.boot();
