#! /usr/bin/env python
# -*- coding: utf-8 -*-
# Jonne Kleijer, Royal HaskoningDHV

import os
import glob
import rasterio
import fiona
import numpy as np
import matplotlib as mpl
import matplotlib.pyplot as plt

from descartes import PolygonPatch
from affine import Affine

# User input
fi = r'C:\Users\907454\Google Drive\ge'
fo = r'...\output\movie.gif'
fo2 = r'...\output\test'
palette = ['FFFFFF', 'F3F9CF', 'DDFCD8', 'B6EFC2', '79C5B0', '5CB2A7', '56A6C0', '2D85BC', '1F669C', '013AA4', '351457', '77426C']
alpha = 0.7


def hex_to_rgb(value, mode=1):
    '''
    RGB value in a tuple between 0 and 1 or between 0 and 255
    '''
    value = value.lstrip('#')
    lv = len(value)
    if mode == 1:
        return tuple(int(value[i:i + lv // 3], 16) / 255 for i in range(0, lv, lv // 3))
    elif mode == 255:
        return tuple(int(value[i:i + lv // 3], 16) for i in range(0, lv, lv // 3))


# Create colormap
colors = [hex_to_rgb(palette[i]) for i in range(0, len(palette))]
cmap = mpl.colors.LinearSegmentedColormap.from_list('mycmap', colors)
my_cmap = cmap(np.arange(cmap.N))
my_cmap[:, -1] = np.linspace(0.4, alpha, cmap.N)
my_cmap = mpl.colors.ListedColormap(my_cmap)

# Read shapefile
with fiona.open(r"...\input\ne_10m_admin_0_countries.shp", "r") as shp:
    features = [feature["geometry"] for feature in shp]
patches = [PolygonPatch(feature, edgecolor="grey", facecolor="grey") for feature in features]

# Read raster
fns = glob.glob(fi + '\*.tif')
for fn in fns:
    with rasterio.open(fn) as ds:
        if fn == fns[0]:
            T0 = ds.transform
            bounds = ds.bounds
            ras = ds.read(1)
            cols, rows = np.meshgrid(np.arange(ras.shape[1]), np.arange(ras.shape[0]))
            T1 = T0 * Affine.translation(0.5, 0.5)
            T1 * (669, 335)

            def prj(r, c): return (c, r) * T1
            x, y = np.vectorize(prj, otypes=[np.float, np.float])(rows, cols)
        else:
            ras = ds.read(1)

    # Plot
    fig, ax = plt.subplots(figsize=(16, 8))
    ax.add_collection(mpl.collections.PatchCollection(patches, match_original=True,))
    cax = ax.pcolormesh(x, y, ras, cmap=my_cmap, vmin=0, vmax=500,)
    ax.set_xlim(bounds.left, bounds.right)
    ax.set_ylim(bounds.bottom, bounds.top)
    ax.axes.tick_params(axis='both', direction='in')
    ax.axes.ticklabel_format(axis='both', direction='in')
    ax.text(.5, .05, 'Cumlative precipitation (mm) for {}'.format(os.path.basename(fn)[2:-4]),
            horizontalalignment='center',
            transform=ax.transAxes,
            size=16, color='0.1')
    cbar = fig.colorbar(cax)
    fig.savefig(os.path.join(fo2, os.path.basename(fn)),
                bbox_inches='tight',
                pad_inches=0)
