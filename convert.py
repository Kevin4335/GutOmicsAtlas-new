import myHttp
import json
from mySecrets import toHex
import fitz
import os



def pdf_to_png_bytes(pdf_path, dpi=300):
    document = fitz.open(pdf_path)
    if document.page_count > 0:
        page = document.load_page(0)
        zoom = dpi / 72
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat)
        result = pix.tobytes("png")
        # os.remove(pdf_path)
        return result


png = pdf_to_png_bytes('Xeniumepithelialdotplot (2).pdf')
open('./imgs/spatial_trans_right_no_embed.png', 'wb').write(png)
