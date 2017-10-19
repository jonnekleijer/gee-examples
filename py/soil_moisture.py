#! /usr/bin/env python
# -*- coding: utf-8 -*-
# Jonne Kleijer, Royal HaskoningDHV

import ee
import pandas as pd
import matplotlib.pyplot as plt
ee.Initialize()

"""
Every 3 hour
36 params (e.g. Evap, Soil moisture, Albede etc.)
4 params for SM (e.g. 10cm, 40cm, 100cm, 200cm)
"""

geom = ee.Geometry.Point(-68.02734375, -16.720385051693988)
start = ee.Date.fromYMD(2001, 1, 1)
stop = ee.Date.fromYMD(2017, 6, 1)
dt = 'month'  # year, month, week, day, hour, minute, second

# Init
start_str = start.format('YMMddHHmm').getInfo()
stop_str = stop.format('YMMddHHmm').getInfo()
task_config = {'driveFolder': 'ge'}

# Load images
imageCollection = ee.ImageCollection('NASA/GLDAS/V021/NOAH/G025/T3H')
imageCollection_s = imageCollection.filter(ee.Filter.date(start, stop))
SM000_010 = imageCollection_s.select('SoilMoi0_10cm_inst')
SM010_040 = imageCollection_s.select('SoilMoi10_40cm_inst')
SM040_100 = imageCollection_s.select('SoilMoi40_100cm_inst')
SM100_200 = imageCollection_s.select('SoilMoi100_200cm_inst')
SM = imageCollection_s.select(
    ['SoilMoi0_10cm_inst',
     'SoilMoi10_40cm_inst',
     'SoilMoi40_100cm_inst',
     'SoilMoi100_200cm_inst'],
    ['SM000_010', 'SM010_040', 'SM040_100', 'SM100_200']
)

time_i = start
df = pd.DataFrame()
while time_i.difference(stop, dt).getInfo() < 0:
    print(pd.to_datetime(time_i.getInfo()['value'], unit='ms'))

    # Get data for iterative period
    SM_series = SM.filter(ee.Filter.date(time_i, time_i.advance(1, dt))).getRegion(geom, 9000, "epsg:4326")
    df_i = pd.DataFrame(SM_series.getInfo())
    # Add headers
    df_i.columns = df_i.iloc[0]
    # Remove first row
    df_i = df_i[1:]
    # Set datetime
    df_i['time'] = pd.to_datetime(df_i['time'], unit='ms')
    df = pd.concat([df, df_i], axis=0)
    time_i = time_i.advance(1, dt)

df.to_csv(r"..\..\output\SM\SM.csv")
df = df.set_index('time', drop=True)
fig = plt.figure(figsize=(16,8))
ax = fig.add_subplot(111)
ax.plot(df['SM000_010'])
ax.set_xlabel('time')
ax.set_ylabel('SM top 10 cm [kg/m^2/s]')
fig.savefig(r'..\..\output\SM\SM010.png')
