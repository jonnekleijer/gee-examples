#! /usr/bin/env python
# -*- coding: utf-8 -*-
# Jonne Kleijer, Royal HaskoningDHV

import glob
import imageio
import cv2

fo = r'E:\Backup\dev\ge\output\movie.gif'
fo2 = r'E:\Backup\dev\ge\output\movie.mp4'
fi = r'E:\Backup\dev\ge\output\test' 


fps = 12
fns = glob.glob(fi + '\*.tif')
is_color=True
is_color=True
size = None

with imageio.get_writer(fo, mode='I') as writer:
    for fn in fns:
        image = imageio.imread(fn)
        writer.append_data(image)

#fourcc = VideoWriter_fourcc(*'MP4V')
#vid = None
#for fn in fns:
#    img = imread(fn)
#    if vid is None:
#        if size is None:
#            size = img.shape[1], img.shape[0]
#        vid = VideoWriter(fo2, fourcc, float(fps), size, is_color)
#    if size[0] != img.shape[1] and size[1] != img.shape[0]:
#        img = resize(img, size)
#    vid.write(img)
#vid.release()