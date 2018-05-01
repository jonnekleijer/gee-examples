#! /usr/bin/env python
# -*- coding: utf-8 -*-
# Jonne Kleijer, Royal HaskoningDHV

# TODO: timezone
# TODO fix GPM


import ee
import pandas as pd
import logging
from datetime import timedelta
import yaml

ee.Initialize()
logging.basicConfig(level=logging.INFO)
with open(r"..\..\input\precip_TS_aruba_GPM.yaml", 'r') as f:
    kwargs = yaml.load(f)

xs = kwargs['xs']
ys = kwargs['ys']
starts = kwargs['starts']
stops = kwargs['stops']
windows = kwargs['windows']
dt = kwargs['dt']
zoom = kwargs['zoom']
mini = kwargs['mini']
maxi = kwargs['maxi']
product = kwargs['product']
tasks = kwargs['tasks']

# run
for key in xs.keys():
    geom = ee.Geometry.Point(xs[key], ys[key])
    start = ee.Date.fromYMD(int(starts[key][6:]),
                            int(starts[key][3:5]),
                            int(starts[key][:2]),)
    stop = ee.Date.fromYMD(int(stops[key][6:]),
                           int(stops[key][3:5]),
                           int(stops[key][:2]),)

    # Init
    start_str = start.format('YMMddHHmm').getInfo()
    stop_str = stop.format('YMMddHHmm').getInfo()
    task_config = {'driveFolder': 'ge'}

    # Load images
    if product == 'GPM':
        imageCollection = ee.ImageCollection('NASA/GPM_L3/IMERG_V04')
        imageCollection_s = imageCollection.filter(ee.Filter.date(start, stop))
        P = imageCollection_s.select('precipitationCal')
    elif product == 'TRMM':
        imageCollection = ee.ImageCollection('TRMM/3B42')
        imageCollection_s = imageCollection.filter(ee.Filter.date(start, stop))
        P = imageCollection_s.select('precipitation')

    time_i = start
    df = pd.DataFrame()
    while time_i.difference(stop, dt).getInfo() < 0:
        logging.info('get timeseries for ' + str(pd.to_datetime(time_i.getInfo()['value'], unit='ms')) + ' in ' + key)

        # Get data for iterative period
        P_series = P.filter(ee.Filter.date(time_i, time_i.advance(1, dt))).getRegion(geom, 500, "epsg:4326")
        df_i = pd.DataFrame(P_series.getInfo())
        # Add headers
        df_i.columns = df_i.iloc[0]
        # Remove first row
        df_i = df_i[1:]
        # Set datetime UTC
        df_i['time'] = pd.to_datetime(df_i['time'], unit='ms')
        # Convert to intensity to mm/half hour
        if product == 'GPM':
            df_i['precipitationCal'] = df_i['precipitationCal'] / 2
        elif product == 'TRMM':
            df_i['precipitation'] = df_i['precipitation'] * 3
            df = pd.concat([df, df_i], axis=0)
        time_i = time_i.advance(1, dt)
    df = df.reset_index(drop=True)
    try:
        logging.info('Write csv to: output\Rainfall\TS\{key}_{start}_{product}.csv'.format(key=key, start=start_str, product=product))
        df.to_csv(r"..\..\output\Rainfall\TS\{key}_{start}_{product}.csv".format(key=key, start=start_str, product=product))
    except:
        logging.info('Warning: Write to csv failed')
    for window in windows:
        if product == 'GPM':
            win = df.precipitationCal.rolling(window=window * 2, center=False).sum()
        elif product == 'TRMM':
            win = df.precipitation.rolling(window=int(window / 3), center=False).sum()
        winMax = win.max()
        winStop = df[win == winMax].iloc[0]['time']
        winStart = winStop + timedelta(hours=-window)
        logging.info('maximum P for {window} hour is {winMax} mm between {start} and {stop}'.format(
            window=window, winMax='%03.1f' % winMax, start=winStart, stop=winStop))
        winStartGEE = ee.Date.fromYMD(winStart.year, winStart.month, winStart.day)
        winStopGEE = ee.Date.fromYMD(winStop.year, winStop.month, winStop.day)
        geometry = ee.Geometry.Rectangle([geom.getInfo()['coordinates'][0] - 5,
                                          geom.getInfo()['coordinates'][1] - 2.5,
                                          geom.getInfo()['coordinates'][0] + 5,
                                          geom.getInfo()['coordinates'][1] + 2.5])
        geometry = geometry['coordinates'][0]
        task_config = {
            'description': 'Image',
            'scale': 5000,
            'region': geometry,
            'driveFolder': 'ge',
        }

        # Load images
        if tasks == True:
            task_config['description'] = 'P_{key}_{t}'.format(key=key, t=window)
            image = imageCollection.filter(ee.Filter.date(winStartGEE, winStopGEE))
            if product == 'GPM':
                P = imageCollection_s.select('precipitationCal')
                image_sum = P.reduce(ee.Reducer.sum()).divide(2.)
            elif product == 'TRMM':
                P = imageCollection_s.select('precipitation')
                image_sum = P.reduce(ee.Reducer.sum()).divide(0.333)
            task = ee.batch.Export.image(image_sum, 'P_{key}_{t}'.format(key=key, t='{window}h'.format(window=window)), task_config)
            task.start()
