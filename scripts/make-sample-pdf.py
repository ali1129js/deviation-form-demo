"""Generates public/samples/beispiel-auftrag-scan.pdf: a FICTIONAL order sheet as a
scanned-style image (no text layer), so the OCR import demo has something to read."""
import random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

random.seed(42)
W, H = 1654, 2339  # A4 @ 200 dpi
img = Image.new("L", (W, H), 250)
d = ImageDraw.Draw(img)
def font(size, bold=False):
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    return ImageFont.truetype(f"/usr/share/fonts/truetype/dejavu/{name}", size)

d.text((120, 120), "MUSTERWERK GMBH (FIKTIV)", font=font(46, True), fill=20)
d.text((120, 190), "Produktionsauftrag – Beispieldokument für Demo-Zwecke", font=font(30), fill=40)
d.line((120, 250, W - 120, 250), fill=30, width=3)
rows = [("Auftrag:", "4711002"), ("Charge:", "DEMO-1234"), ("Material-Nr.:", "900-555-77"),
        ("Linie:", "3"), ("Schicht:", "Spät"), ("Datum:", "18.03.2026")]
y = 320
for k, v in rows:
    d.text((140, y), k, font=font(38), fill=30)
    d.text((620, y), v, font=font(40, True), fill=15)
    y += 90
d.text((140, y + 60), "Alle Angaben frei erfunden. Kein echtes Dokument.", font=font(28), fill=60)
for _ in range(3000):  # scanner speckles
    x, yy = random.randrange(W), random.randrange(H)
    d.point((x, yy), fill=random.randrange(120, 220))
img = img.rotate(0.6, fillcolor=250, resample=Image.BICUBIC).filter(ImageFilter.GaussianBlur(0.7))
img.convert("RGB").save("public/samples/beispiel-auftrag-scan.pdf", "PDF", resolution=200)
print("ok")
