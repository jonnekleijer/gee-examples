#! /usr/bin/env python
# -*- coding: utf-8 -*-
# Jonne Kleijer, Royal HaskoningDHV

# TODO: make rectangle dynamic based on point

import ee

ee.Initialize()

geom = ee.Geometry.Point(-72.59765624999994, 22.816694126899844)  # Houston
geom = ee.Geometry.Point(-70.01483917236328, 12.502112893629409)  # Aruba
geom = ee.Geometry.Point(-98.98321151733398, 19.504217643044573)  # Mexico
geom = ee.Geometry.Point(-70.04949331283570, 12.597140387992132)  # Malmok
geom = ee.Geometry.Point(46.70039176940918, 24.955635301665680)  # Riyadh

zoom = 5
start = ee.Date.fromYMD(2017, 2, 10)
stop = ee.Date.fromYMD(2017, 2, 20)

palette = ['FFFFFF', 'F3F9CF', 'DDFCD8', 'B6EFC2', '79C5B0', '5CB2A7', '56A6C0', '2D85BC', '1F669C', '013AA4', '351457', '77426C']
mini = 0 # mm
maxi = 110 # mm
step = 30  # miutes

# Init
start_str = start.format('YMMddHHmm').getInfo()
stop_str = stop.format('YMMddHHmm').getInfo()
geom.getInfo()['coordinates'][0]
geometry = ee.Geometry.Rectangle([geom.getInfo()['coordinates'][0]-5, 
                                  geom.getInfo()['coordinates'][1]-2.5, 
                                  geom.getInfo()['coordinates'][0]+5, 
                                  geom.getInfo()['coordinates'][1]+2.5])
geometry = geometry['coordinates'][0]
task_config = {
    'description': 'Image',
    'scale': 5000,
    'region': geometry,
    'driveFolder': 'ge',
}

# Load images
imageCollection = ee.ImageCollection('NASA/GPM_L3/IMERG_V04').select('precipitationCal')
start_i = start
while stop.difference(start_i, "minute").getInfo() >= step:
    start_i = start_i.advance(step, "minute")
    start_i_str = start_i.format('YMMddHHmm').getInfo()
    task_config['description'] = 'Image_' + start_i_str
    print(start_i.format('YMMddHHmm').getInfo())
    image = imageCollection.filter(ee.Filter.date(start, start_i))
    image_sum = image.reduce(ee.Reducer.sum()).divide(2)
    image_sum_vis = image_sum.visualize('precipitationCal_sum', min=mini, max=maxi, opacity=0.6, palette=palette)
    task = ee.batch.Export.image(image_sum, 'P_{}'.format(start_i_str), task_config)
    task.start()
