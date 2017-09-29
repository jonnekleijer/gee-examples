import ee
import numpy as np
import pandas as pd

# Initialize the GEE
ee.Initialize()

# import the RS products
chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/PENTAD')

# Define time range
startyear = 2000
endyear = 2001

# create list for years
years = range(startyear, endyear)

# make a list with months
months = range(1, 2)

# Set date in ee date format
startdate = ee.Date.fromYMD(startyear, 1, 1)
enddate = ee.Date.fromYMD(endyear + 1, 12, 31)

# Filter chirps
Pchirps = chirps.filterDate(startdate, enddate).sort('system:time_start', False).select("precipitation")

# Define geograpic domain
area = ee.Geometry.Rectangle(-20.0, 20.0, 20, 20.0)

# calculate the monthly mean


def calcMonthlyMean(imageCollection):
    mylist = ee.List([])
    for y in years:
        for m in months:
            w = imageCollection.filter(ee.Filter.calendarRange(y, y, 'year')).filter(ee.Filter.calendarRange(m, m, 'month')).sum()
            mylist = mylist.add(w.set('year', y).set('month', m).set('date', ee.Date.fromYMD(y, m, 1)).set('system:time_start', ee.Date.fromYMD(y, m, 1)))
    return ee.ImageCollection.fromImages(mylist)


# run the calcMonthlyMean function
monthlyChirps = ee.ImageCollection(calcMonthlyMean(Pchirps))

# select the region of interest, 25000 is the cellsize in meters
monthlyChirps = monthlyChirps.getRegion(area, 25000, "epsg:4326").getInfo()

# get january (index = 0)
January = pd.DataFrame(monthlyChirps, columns=monthlyChirps[0])
# remove the first line
January = January[1:]

# print the result for january
print(January)

# get the longitudes
lons = np.array(January.longitude)

# get the latitudes
lats = np.array(January.latitude)

# get the precipitation values
data = np.array(January.precipitation)
