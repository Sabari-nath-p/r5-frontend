#!/usr/bin/env python3
"""
Turns one front-facing portrait into the layered 3D avatar the hero renders.

Nothing about the face is modelled by hand: the texture is the photo's own
pixels and the shape comes from MediaPipe's landmarks measured on that photo.
A sharper source photo gives a sharper avatar; just re-run this.

    python build_avatar.py source.png <models-dir> <out-dir>

<models-dir> holds MediaPipe's face_landmarker.task and selfie_multiclass.tflite.
Needs: mediapipe, opencv, numpy, scipy, pillow, pymatting.

Coordinates are source-photo pixels on a canvas padded left and right, because
the photo crops the shoulders and the extra room lets them finish naturally.
"""
import json
import struct
import sys
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision
from PIL import Image
from pymatting import estimate_alpha_cf, estimate_foreground_ml
from scipy import ndimage as ndi
from scipy.interpolate import griddata

SCALE = 3  # texture pixels per source pixel
PAD_X = 100  # source pixels added each side for the finished shoulders
SHOULDER_REACH = 78

BG, HAIR, BODY_SKIN, FACE_SKIN, CLOTHES, ACCESSORY = range(6)

EYES = [
    dict(upper=[33, 246, 161, 160, 159, 158, 157, 173, 133],
         lower=[33, 7, 163, 144, 145, 153, 154, 155, 133],
         iris=468, rim=[469, 470, 471, 472]),
    dict(upper=[362, 398, 384, 385, 386, 387, 388, 466, 263],
         lower=[362, 382, 381, 380, 374, 373, 390, 249, 263],
         iris=473, rim=[474, 475, 476, 477]),
]
FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378,
             400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21,
             54, 103, 67, 109]


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def disc(radius):
    size = int(radius) * 2 + 1
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (size, size))


def analyse(rgb8, models):
    image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb8)
    landmarker = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=str(models / "face_landmarker.task")),
        num_faces=1))
    faces = landmarker.detect(image).face_landmarks
    if not faces:
        sys.exit("No face found in the photo.")
    h, w = rgb8.shape[:2]
    # z flips so positive means toward the camera.
    points = np.array([[p.x * w, p.y * h, -p.z * w] for p in faces[0]])
    # The landmark model plunges steeply at the cheeks, which smears the texture
    # as she turns. Easing the far side keeps the nose, brow and lips as measured.
    deep = points[:, 2] < -30
    points[deep, 2] = -30 + (points[deep, 2] + 30) * 0.6
    segmenter = vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(
        base_options=mp_python.BaseOptions(model_asset_path=str(models / "selfie_multiclass.tflite")),
        output_category_mask=True))
    classes = segmenter.segment(image).category_mask.numpy_view().squeeze().copy()
    return points, classes


def pull_matte(hi, classes_hi):
    """Separates her from the white backdrop, loose hair wisps included."""
    person = (classes_hi != BG).astype(np.uint8)
    sure_fg = cv2.erode(person, disc(2 * SCALE)).astype(bool)
    near = cv2.dilate(person, disc(16 * SCALE)).astype(bool)
    near_white = hi.min(axis=2) > 0.97
    trimap = np.full(person.shape, 0.5)
    trimap[~near | (near_white & ~cv2.dilate(person, disc(2 * SCALE)).astype(bool))] = 0
    trimap[sure_fg] = 1
    alpha = estimate_alpha_cf(hi.astype(np.float64), trimap)
    foreground = estimate_foreground_ml(hi.astype(np.float64), alpha)
    return np.clip(alpha, 0, 1).astype(np.float32), np.clip(foreground, 0, 1).astype(np.float32)


def fabric_grain(fg, alpha, classes_hi):
    """High-frequency weave from a plain patch of the top, to tile over new cloth."""
    h, w = fg.shape[:2]
    patch = fg[int(h * 0.88):h - 2, 4 * SCALE:40 * SCALE]
    grain = patch - cv2.GaussianBlur(patch, (0, 0), 6)
    return grain


def extend_shoulders(body_rgb, body_a, grain):
    """Grows the cropped shoulders out to rounded sleeves on the padded canvas."""
    h, w = body_a.shape
    pad = PAD_X * SCALE
    reach = SHOULDER_REACH * SCALE
    for side in (-1, 1):
        edge = pad + 1 if side < 0 else w - pad - 2
        inner = edge - side * 40 * SCALE
        y_edge = int(np.argmax(body_a[:, edge] > 0.5))
        y_inner = int(np.argmax(body_a[:, inner] > 0.5))
        slope = max((y_edge - y_inner) / (40 * SCALE), 0.05)

        # Sampled a little inside the frame: the very edge rings from the upscale.
        near, far = sorted((edge - side * 3 * SCALE, edge - side * 12 * SCALE))
        colour = np.median(body_rgb[:, near:far + 1], axis=1)
        colour[:y_edge + 3 * SCALE] = colour[y_edge + 3 * SCALE]
        colour = ndi.gaussian_filter1d(colour, 8 * SCALE, axis=0, mode="nearest")

        # The new cloth fades in over the photo's last few pixels: no visible join.
        blend = 14 * SCALE
        for i in range(-blend, pad + 1):
            x = edge + side * i
            if x < 0 or x >= w:
                continue
            tile = 0.6 * grain[np.arange(h) % grain.shape[0], abs(i) % grain.shape[1]]
            if i <= 0:
                mix = (i + blend) / blend
                solid = body_a[:, x] > 0.98
                body_rgb[solid, x] = body_rgb[solid, x] * (1 - mix) + np.clip(colour + tile, 0, 1)[solid] * mix
                continue
            t = min(i / reach, 1.0)
            if t >= 1.0:
                body_a[:, x] = 0
                continue
            drop = 150 * SCALE * (1 - np.sqrt(max(1 - t ** 2.4, 0)))
            top = y_edge + slope * i + drop
            shade = 1 - 0.2 * t ** 2
            body_rgb[:, x] = np.clip(colour * shade + tile, 0, 1)
            body_a[:, x] = np.clip(np.arange(h) - top + 0.5, 0, 1)
    return body_rgb, body_a


def head_depth(points, classes, head_mask):
    """Measured landmark depth on the face, rounded off out to the head's silhouette."""
    h, w = classes.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    keep = np.arange(468)  # the iris points sit off the surface
    face_z = griddata(points[keep, :2], points[keep, 2], (xx, yy), method="linear")
    hull = np.zeros((h, w), np.uint8)
    cv2.fillPoly(hull, [points[FACE_OVAL, :2].round().astype(np.int32)], 1)
    hull = hull.astype(bool) & ~np.isnan(face_z)

    # Fill holes so smoothing doesn't pull NaNs in.
    nearest = ndi.distance_transform_edt(~hull, return_distances=False, return_indices=True)
    boundary_z = face_z[nearest[0], nearest[1]]
    smooth_face = ndi.gaussian_filter(boundary_z, 1.0)

    rim_z = points[FACE_OVAL, 2].min() - 8
    d_hull = ndi.distance_transform_edt(~hull)
    d_rim = ndi.distance_transform_edt(head_mask)
    r = d_hull / np.maximum(d_hull + d_rim, 1e-3)
    outer = rim_z + (ndi.gaussian_filter(boundary_z, 6.0) - rim_z) * np.clip(1 - r ** 2, 0, 1) ** 0.8
    outer = ndi.gaussian_filter(outer, 4.0)

    inside = ndi.distance_transform_edt(hull)
    w_face = smoothstep(0, 10, inside)
    z = w_face * smooth_face + (1 - w_face) * outer

    # A slight roll-off so the jaw doesn't end like the edge of a sheet of paper.
    z -= 12 * np.clip(1 - d_rim / 10, 0, 1) ** 2
    return z.astype(np.float32), float(rim_z)


def body_depth(canvas_h, canvas_w, cx, neck_half, body_mask):
    yy, xx = np.mgrid[0:canvas_h, 0:canvas_w].astype(np.float32)
    dx = xx - cx
    neck = -125 + 70 * np.sqrt(np.clip(1 - (dx / (neck_half + 6)) ** 2, 0, 1))
    half = cx - (PAD_X - SHOULDER_REACH)
    chest = -170 + 120 * np.sqrt(np.clip(1 - (dx / half) ** 2, 0, 1)) * smoothstep(300, 420, yy)
    k = 18.0
    z = k * np.logaddexp(neck / k, chest / k)  # smooth union, so the neck flows into the chest
    d_rim = ndi.distance_transform_edt(body_mask)
    z -= 30 * np.clip(1 - d_rim / 25, 0, 1) ** 2
    return ndi.gaussian_filter(z, 2.0).astype(np.float32)


def lid_curve(points_hi, indices):
    xy = sorted(map(tuple, points_hi[indices, :2]))
    return np.array([p[0] for p in xy]), np.array([p[1] for p in xy])


def closed_eyes(rgb, points_hi, rect):
    """Blink plate: each eye opening covered with her own lid tone, one lash line on top."""
    x0, y0, x1, y1 = rect
    plate = np.clip(rgb[y0:y1, x0:x1], 0, 1).copy()
    lash = np.zeros(plate.shape[:2], np.float32)
    for eye in EYES:
        ux, uy = lid_curve(points_hi, eye["upper"])
        lx, ly = lid_curve(points_hi, eye["lower"])
        xs = np.arange(ux.min(), ux.max(), 2.0)
        up = np.interp(xs, ux, uy)
        lo = np.interp(xs, lx, ly)
        # Tone comes from the skin between lid and brow, a little deepened.
        middle = (xs > np.percentile(xs, 20)) & (xs < np.percentile(xs, 80))
        band = np.vstack([plate[int(u - 8 * SCALE - y0):int(u - 5 * SCALE - y0), int(x - x0)]
                          for x, u in zip(xs[middle], up[middle])])
        tone = np.median(band, axis=0) * 0.93
        hole = np.zeros(plate.shape[:2], np.uint8)
        poly = np.vstack([np.c_[xs, up - 4.5 * SCALE], np.c_[xs, lo + 1.6 * SCALE][::-1]]) - [x0, y0]
        cv2.fillPoly(hole, [poly.round().astype(np.int32)], 255)
        weight = cv2.GaussianBlur(hole.astype(np.float32) / 255, (0, 0), 1.2 * SCALE)[..., None]
        plate = plate * (1 - weight) + tone * weight
        path = np.c_[xs, lo + 0.9 * SCALE] - [x0, y0]
        cv2.polylines(lash, [(path * 8).round().astype(np.int32)], False, 1.0, int(1.2 * SCALE), cv2.LINE_AA, shift=3)
    lash = cv2.GaussianBlur(lash, (0, 0), 0.5 * SCALE)[..., None]
    liner = np.array([0.07, 0.06, 0.06], np.float32)
    return np.clip(plate * (1 - lash) + liner * lash, 0, 1)


def eye_plates(head_rgb, points_hi, rect):
    """Iris-free eyes plus the opening mask, so the iris can move inside the lids."""
    x0, y0, x1, y1 = rect
    h, w = head_rgb.shape[:2]
    opening = np.zeros((h, w), np.uint8)
    hole = np.zeros((h, w), np.uint8)
    irises = []
    for eye in EYES:
        contour = np.vstack([points_hi[eye["upper"], :2], points_hi[eye["lower"], :2][::-1]])
        one = np.zeros((h, w), np.uint8)
        cv2.fillPoly(one, [contour.round().astype(np.int32)], 255)
        centre = points_hi[eye["iris"], :2]
        radius = float(np.linalg.norm(points_hi[eye["rim"], :2] - centre, axis=1).mean())
        irises.append((centre, radius))
        circle = np.zeros((h, w), np.uint8)
        cv2.circle(circle, tuple(np.round(centre).astype(int)), int(radius * 1.08), 255, -1)
        hole |= circle & cv2.dilate(one, disc(SCALE))
        opening |= one
    plate8 = (np.clip(head_rgb, 0, 1) * 255).astype(np.uint8)
    plate = cv2.inpaint(plate8, hole, 4 * SCALE, cv2.INPAINT_TELEA).astype(np.float32) / 255
    mask = cv2.GaussianBlur(opening.astype(np.float32) / 255, (0, 0), 0.6 * SCALE)
    return plate[y0:y1, x0:x1], mask[y0:y1, x0:x1], irises


def save_webp(path, rgb, alpha=None, quality=92):
    data = (np.clip(rgb, 0, 1) * 255 + 0.5).astype(np.uint8)
    if alpha is not None:
        a = (np.clip(alpha, 0, 1) * 255 + 0.5).astype(np.uint8)
        Image.fromarray(np.dstack([data, a])).save(path, "WEBP", quality=quality, exact=True, method=6, alpha_quality=100)
    else:
        Image.fromarray(data).save(path, "WEBP", quality=quality, method=6)


def main():
    source, models, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
    out.mkdir(parents=True, exist_ok=True)
    bgr = cv2.imread(str(source))
    rgb8 = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    H, W = rgb8.shape[:2]
    points, classes = analyse(rgb8, models)

    hi = cv2.resize(rgb8, None, fx=SCALE, fy=SCALE, interpolation=cv2.INTER_LANCZOS4).astype(np.float32) / 255
    # Sharpen only: nothing here invents detail, so her features can't drift.
    hi = np.clip(hi + 0.35 * (hi - cv2.GaussianBlur(hi, (0, 0), 1.6)), 0, 1)
    hH, hW = hi.shape[:2]
    classes_hi = cv2.resize(classes, (hW, hH), interpolation=cv2.INTER_NEAREST)
    classes_hi = cv2.medianBlur(classes_hi, 2 * SCALE + 1)
    print("pulling matte…", flush=True)
    alpha, fg = pull_matte(hi, classes_hi)

    # Every pixel, wisps included, takes the class of the nearest person pixel.
    idx = ndi.distance_transform_edt(classes_hi == BG, return_distances=False, return_indices=True)
    label = classes_hi[idx[0], idx[1]]
    ys = np.arange(hH, dtype=np.float32)[:, None] / SCALE
    ys = np.repeat(ys, hW, axis=1)

    jaw_y = points[152, 1]
    lobes_y = max(points[234, 1], points[454, 1]) + 34
    cut = float(lobes_y)
    keep_on_head = 1 - smoothstep(cut - 8, cut + 8, ys)
    soft = lambda m, s=0.7: cv2.GaussianBlur(m.astype(np.float32), (0, 0), s * SCALE)

    face_m = soft((label == FACE_SKIN) | ((label == ACCESSORY) & (ys < jaw_y - 30)))
    hair_m = soft(label == HAIR)
    body_m = soft((label == BODY_SKIN) | (label == CLOTHES) | ((label == ACCESSORY) & (ys >= jaw_y - 30)))

    head_a = alpha * np.maximum(face_m, hair_m * keep_on_head)
    body_a = alpha * body_m
    hair_a = alpha * hair_m * (1 - keep_on_head)

    # --- Neck: continues up under the jaw so a turning head never shows a hole.
    neck_row = int((jaw_y - 12) * SCALE)
    neck_probe = np.where(label[neck_row] == BODY_SKIN)[0]
    n_left, n_right = neck_probe.min(), neck_probe.max()
    neck_half = (n_right - n_left) / 2 / SCALE
    neck_rgb = fg.copy()
    fill = np.zeros((hH, hW), np.float32)
    top = int((jaw_y - 48) * SCALE)
    neck_centre = (n_left + n_right) / 2
    neck_half_hi = max((n_right - n_left) / 2, 1)
    for x in range(n_left, n_right + 1):
        column = label[:, x]
        below = np.where((column == BODY_SKIN) & (np.arange(hH) > top))[0]
        if len(below) == 0:
            continue
        y = below[0]
        # A dome rather than a block: a turning head can't uncover a square corner.
        across = (x - neck_centre) / neck_half_hi
        y_top = max(int(y - 48 * SCALE * np.sqrt(max(1 - across ** 2, 0))), 0)
        shade = 0.9 - 0.14 * across ** 2  # falls into shadow under the jaw
        neck_rgb[y_top:y + 3 * SCALE, x] = fg[min(y + 7 * SCALE, hH - 1), x] * shade
        fill[y_top:y + 3 * SCALE, x] = 1
    # Only ever under the head: it must not change her silhouette at rest.
    fill *= np.maximum(cv2.dilate(head_a, disc(SCALE)) > 0.02, label == BODY_SKIN)
    blend = soft(fill, 1.2)[..., None]
    smooth_neck = cv2.GaussianBlur(neck_rgb, (0, 0), 3 * SCALE)
    body_rgb = fg * (1 - blend) + smooth_neck * blend
    body_a = np.maximum(body_a, fill)

    # --- Back hair: solid behind the head and neck, only ever seen as the head turns.
    solid = (label == HAIR) & (alpha > 0.9) & (cv2.cvtColor(fg, cv2.COLOR_RGB2GRAY) < 0.3)
    hair_tone = np.median(fg[solid], axis=0)
    real_hair = soft(label == HAIR, 0.5)[..., None] * (1 - keep_on_head[..., None])
    hair_rgb = fg * real_hair + hair_tone * (1 - real_hair)
    # Anything above this is covered by the shell that turns with her head.
    hidden = (head_a > 0.3) | (body_a > 0.98)
    span = (ys > cut - 2) & (ys < jaw_y + 34)
    hair_a = np.maximum(hair_a, (hidden & span).astype(np.float32))

    # --- Padded canvas ------------------------------------------------------
    P = PAD_X * SCALE
    def pad(a):
        widths = ((0, 0), (P, P)) + (((0, 0),) if a.ndim == 3 else ())
        return np.pad(a, widths, mode="edge" if a.ndim == 3 else "constant")
    grain = fabric_grain(fg, alpha, classes_hi)
    body_rgb_c, body_a_c = extend_shoulders(pad(body_rgb), pad(body_a), grain)
    head_rgb_c, head_a_c = pad(fg), pad(head_a)
    hair_rgb_c, hair_a_c = pad(hair_rgb), pad(hair_a)

    CW, CH = W + 2 * PAD_X, H
    points_c = points.copy()
    points_c[:, 0] += PAD_X
    cx = float((points_c[234, 0] + points_c[454, 0]) / 2)

    # --- Depth --------------------------------------------------------------
    small = lambda m: cv2.resize(m, (CW, CH), interpolation=cv2.INTER_AREA)
    head_small = small(head_a_c) > 0.5
    classes_c = np.pad(classes, ((0, 0), (PAD_X, PAD_X)))
    z_head, rim_z = head_depth(points_c, classes_c, head_small)
    z_body = body_depth(CH, CW, cx, neck_half, small(body_a_c) > 0.5)
    yy, xx = np.mgrid[0:CH, 0:CW].astype(np.float32)
    z_hair = (-160 + 14 * np.sqrt(np.clip(1 - ((xx - cx) / 130) ** 2, 0, 1))).astype(np.float32)

    # --- Textures & meshes --------------------------------------------------
    def bbox(a, margin=4):
        ys_, xs_ = np.where(a > 0.004)
        m = margin * SCALE
        x0 = max((xs_.min() - m) // SCALE, 0)
        y0 = max((ys_.min() - m) // SCALE, 0)
        x1 = min((xs_.max() + m) // SCALE + 1, CW)
        y1 = min((ys_.max() + m) // SCALE + 1, CH)
        return int(x0), int(y0), int(x1), int(y1)

    blob = bytearray()
    layers = {}
    def add_layer(name, rgb, a, z, step):
        x0, y0, x1, y1 = bbox(a)
        tex_rgb = rgb[y0 * SCALE:y1 * SCALE, x0 * SCALE:x1 * SCALE]
        tex_a = a[y0 * SCALE:y1 * SCALE, x0 * SCALE:x1 * SCALE]
        save_webp(out / f"{name}.webp", tex_rgb, tex_a)
        cols = (x1 - x0) // step + 2
        rows = (y1 - y0) // step + 2
        gx = np.minimum(x0 + np.arange(cols) * step, CW - 1)
        gy = np.minimum(y0 + np.arange(rows) * step, CH - 1)
        grid = z[np.ix_(gy, gx)]
        cover = cv2.dilate(small(a), disc(step + 1))[np.ix_(gy, gx)] > 0.004
        values = np.where(cover, np.clip(grid * 8, -32000, 32000), -32768).astype(np.int16)
        layers[name] = dict(rect=[x0, y0, x1, y1], step=step, cols=int(cols), rows=int(rows), offset=len(blob))
        blob.extend(values.tobytes())
        return x0, y0, x1, y1

    print("writing layers…", flush=True)
    hb = add_layer("head", head_rgb_c, head_a_c, z_head, 2)
    add_layer("body", body_rgb_c, body_a_c, z_body, 4)
    add_layer("hair", hair_rgb_c, hair_a_c, z_hair, 6)
    (out / "avatar.bin").write_bytes(bytes(blob))

    # --- Eyes ---------------------------------------------------------------
    eye_pts = points_c[[i for e in EYES for i in e["upper"] + e["lower"]], :2]
    rect_src = [int(eye_pts[:, 0].min() - 14), int(eye_pts[:, 1].min() - 18),
                int(eye_pts[:, 0].max() + 14), int(eye_pts[:, 1].max() + 10)]
    rect_hi = [v * SCALE for v in rect_src]
    points_hi = points_c * SCALE
    plate, mask, irises = eye_plates(head_rgb_c, points_hi, rect_hi)
    closed = closed_eyes(head_rgb_c, points_hi, rect_hi)
    save_webp(out / "eye-plate.webp", plate, quality=94)
    save_webp(out / "eye-closed.webp", closed, quality=94)
    Image.fromarray((mask * 255).astype(np.uint8)).save(out / "eye-mask.webp", "WEBP", lossless=True)

    # --- Poster: the same cut-out, for reduced motion and no-WebGL visitors ----
    canvas = np.zeros((CH * SCALE, CW * SCALE, 4), np.float32)
    def over(rgb, a):
        ax = a[..., None]
        base = canvas[..., 3:4]
        out_a = ax + base * (1 - ax)
        canvas[..., :3] = np.where(out_a > 0, (rgb * ax + canvas[..., :3] * base * (1 - ax)) / np.maximum(out_a, 1e-4), 0)
        canvas[..., 3:4] = out_a
    over(hair_rgb_c, hair_a_c)
    over(body_rgb_c, body_a_c)
    over(head_rgb_c, head_a_c)
    save_webp(out / "poster.webp", canvas[..., :3], canvas[..., 3], quality=88)

    manifest = dict(
        canvas=[CW, CH], scale=SCALE, cx=cx,
        headTop=int(np.where(head_small.any(axis=1))[0][0]),
        chinY=float(jaw_y),
        neckPivot=[cx, float(jaw_y - 34), -105.0],
        hairColor=[float(v) for v in hair_tone],
        rimZ=rim_z,
        headExtent=[float(np.where(head_small.any(axis=0))[0][0]), float(np.where(head_small.any(axis=0))[0][-1])],
        layers=layers,
        eyes=dict(rect=rect_src, irises=[dict(c=[float(c[0] / SCALE), float(c[1] / SCALE)], r=r / SCALE) for c, r in irises]),
    )
    (out / "avatar.json").write_text(json.dumps(manifest, indent=1))
    print(json.dumps({k: manifest[k] for k in ("canvas", "cx", "headTop", "chinY", "neckPivot", "hairColor", "rimZ", "headExtent", "eyes")}))
    for f in sorted(out.iterdir()):
        print(f.name, f.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
