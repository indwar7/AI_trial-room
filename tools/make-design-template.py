"""Turns a photo of a plain grey garment on white into a design template.

The template is a picture whose transparency is the garment's outline and whose
grey levels are its folds, seams and buttons. Laid over any fabric (multiply),
it turns the fabric into that garment.

python3 tools/make-design-template.py <photo> <id>      e.g. photo.jpg men-shirt-6

The photo must show one plain, medium-grey garment laid flat on a white
background. Needs Pillow, NumPy and SciPy.
"""
import sys, os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

def template(src):
    im = Image.open(src).convert("RGB").resize((768, 1024), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32)
    lum = a @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    b = 12
    border = np.concatenate([lum[:b].ravel(), lum[-b:].ravel(), lum[:, :b].ravel(), lum[:, -b:].ravel()])
    backdrop = np.percentile(border, 60)
    mx, mn = a.max(axis=2), a.min(axis=2)
    sat = (mx - mn) / np.maximum(mx, 1)
    # Garment: grey (a wooden hanger or a skin-tone form is not), and nearer its own
    # darkness than the backdrop's, which leaves out the soft shadow it casts.
    core = ((backdrop - lum) > 70) & (sat < 0.2)
    darkness = np.median(lum[core]) if core.sum() > 5000 else backdrop - 110
    mask = (lum < darkness + 0.55 * (backdrop - darkness)) & (sat < 0.2)
    mask = ndi.binary_opening(mask, iterations=3)          # drops hooks, threads, shadow fringes
    mask = ndi.binary_closing(mask, iterations=4)
    labels, n = ndi.label(mask)
    if n == 0:
        raise SystemExit("no garment found")
    sizes = ndi.sum(mask, labels, range(1, n + 1))
    mask = labels == (1 + int(np.argmax(sizes)))
    mask = ndi.binary_fill_holes(mask)                     # buttons, labels and bright creases inside
    mask = ndi.binary_erosion(mask, iterations=1)
    inside = lum[mask]
    mid = np.median(inside)
    shade = np.clip(lum / mid, 0.28, 1.16)
    # The template's own weave would print over the new fabric, so it is smoothed away; folds stay.
    shade = ndi.gaussian_filter(shade, 1.6)
    grey = np.clip(shade * 220, 0, 255).astype(np.uint8)
    alpha = (ndi.gaussian_filter(mask.astype(np.float32), 1.1) * 255).astype(np.uint8)
    out = Image.merge("RGBA", [Image.fromarray(grey)] * 3 + [Image.fromarray(alpha)])
    ys, xs = np.nonzero(mask)
    info = dict(cover=float(mask.mean()), box=(int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())), mid=float(mid), backdrop=float(backdrop), spread=float(np.percentile(inside, 95) - np.percentile(inside, 5)))
    return out, info

if __name__ == "__main__":
    src, ident = sys.argv[1], sys.argv[2]
    out_dir = sys.argv[3] if len(sys.argv) > 3 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "designs")
    os.makedirs(out_dir + "/thumb", exist_ok=True)
    img, info = template(src)
    img.save(f"{out_dir}/{ident}.webp", "WEBP", quality=88, method=6)
    img.resize((384, 512), Image.LANCZOS).save(f"{out_dir}/thumb/{ident}.webp", "WEBP", quality=86, method=6)
    print(ident, {k: (round(v, 3) if isinstance(v, float) else v) for k, v in info.items()}, os.path.getsize(f"{out_dir}/{ident}.webp") // 1024, "KB")
