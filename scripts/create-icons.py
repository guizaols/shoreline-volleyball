"""Draw the original app badge using only the Python standard library."""
import math, struct, zlib
from pathlib import Path
for size in (192,512):
    pixels=bytearray()
    for y in range(size):
        pixels.append(0)
        for x in range(size):
            px,py=x*512/size,y*512/size
            color=(8,47,66)
            if math.hypot(px-256,py-256)<156:
                color=(255,243,209)
                for cx,cy,rx,ry,start,end,width,ink in [
                    (251,290,141,170,185,335,.09,(234,182,63)),
                    (188,210,138,155,280,440,.09,(37,140,150)),
                    (322,215,128,135,70,245,.05,(8,47,66))]:
                    nx,ny=(px-cx)/rx,(py-cy)/ry
                    angle=math.degrees(math.atan2(ny,nx))%360
                    if start>angle: angle+=360
                    if start<=angle<=end and abs(math.hypot(nx,ny)-1)<width: color=ink
            pixels.extend(color)
    def chunk(kind,data):
        return struct.pack('!I',len(data))+kind+data+struct.pack('!I',zlib.crc32(kind+data)&0xffffffff)
    png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',size,size,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(pixels))+chunk(b'IEND',b'')
    Path(f'public/icons/icon-{size}.png').write_bytes(png)
