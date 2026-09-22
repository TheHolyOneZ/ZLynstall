#!/usr/bin/env python3
"""Print 'x y w h' of an X11 window id (absolute screen coordinates) via libX11/ctypes."""
import ctypes, sys
X = ctypes.CDLL("libX11.so.6")
X.XOpenDisplay.restype = ctypes.c_void_p
X.XDefaultRootWindow.restype = ctypes.c_ulong
X.XDefaultRootWindow.argtypes = [ctypes.c_void_p]
X.XTranslateCoordinates.argtypes = [ctypes.c_void_p, ctypes.c_ulong, ctypes.c_ulong, ctypes.c_int, ctypes.c_int,
                                    ctypes.POINTER(ctypes.c_int), ctypes.POINTER(ctypes.c_int), ctypes.POINTER(ctypes.c_ulong)]
X.XGetGeometry.argtypes = [ctypes.c_void_p, ctypes.c_ulong, ctypes.POINTER(ctypes.c_ulong), ctypes.POINTER(ctypes.c_int), ctypes.POINTER(ctypes.c_int),
                           ctypes.POINTER(ctypes.c_uint), ctypes.POINTER(ctypes.c_uint), ctypes.POINTER(ctypes.c_uint), ctypes.POINTER(ctypes.c_uint)]
d = X.XOpenDisplay(None)
win = int(sys.argv[1], 16)
root = X.XDefaultRootWindow(d)
x, y = ctypes.c_int(), ctypes.c_int()
child = ctypes.c_ulong()
X.XTranslateCoordinates(d, win, root, 0, 0, ctypes.byref(x), ctypes.byref(y), ctypes.byref(child))
r = ctypes.c_ulong(); rx, ry = ctypes.c_int(), ctypes.c_int()
w, h, bw, depth = ctypes.c_uint(), ctypes.c_uint(), ctypes.c_uint(), ctypes.c_uint()
X.XGetGeometry(d, win, ctypes.byref(r), ctypes.byref(rx), ctypes.byref(ry), ctypes.byref(w), ctypes.byref(h), ctypes.byref(bw), ctypes.byref(depth))
print(x.value, y.value, w.value, h.value)
