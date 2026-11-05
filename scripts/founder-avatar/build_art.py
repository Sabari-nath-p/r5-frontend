#!/usr/bin/env python3
"""
Turns the founder's portrait into the cartoon layers the 3D hero renders.

    python build_art.py portrait.png face.png <models-dir> ../../public/images/founder

<models-dir> holds MediaPipe's face_landmarker.task and selfie_multiclass.tflite.
Needs: mediapipe, opencv, numpy, scipy, pillow, pymatting.

portrait.png gives the hair and body, simplified into flat cartoon tones, with the
top recut as a pink V-neck. face.png gives the face, used as drawn: it is aligned
to the portrait by its landmarks (position, size and tilt only, so the face keeps
its own shape), and its landmarks also give the head's depth and the eye curves.
Output is in portrait pixels: head, hair, body and back layers, plus depth grids.
"""
import json
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

BG, HAIR, BODY_SKIN, FACE_SKIN, CLOTHES, ACCESSORY = range(6)
SKIN_TONE_STEP = 30.0
EYE_SCALE = 1.0
# The new neckline, in portrait pixels; hair covers its right shoulder at rest.
V_LEFT, V_RIGHT, V_APEX = (392, 845), (898, 845), (645, 1060)
PINK_HUE = 333.0

EYES = [
    dict(upper=[33, 246, 161, 160, 159, 158, 157, 173, 133], lower=[33, 7, 163, 144, 145, 153, 154, 155, 133],
         outer=33, inner=133, iris=468, rim=[469, 470, 471, 472]),
    dict(upper=[263, 466, 388, 387, 386, 385, 384, 398, 362], lower=[263, 249, 390, 373, 374, 380, 381, 382, 362],
         outer=263, inner=362, iris=473, rim=[474, 475, 476, 477]),
]
FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378,
             400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21,
             54, 103, 67, 109]
# Features the cartoon keeps sharp: brows, lips, eyes.
KEEP_SHARP = [
    [70, 63, 105, 66, 107, 55, 65, 52, 53, 46],
    [300, 293, 334, 296, 336, 285, 295, 282, 283, 276],
    [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146],
    [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7],
    [263, 466, 388, 387, 386, 385, 384, 398, 362, 382, 381, 380, 374, 373, 390, 249],
]


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def disc(radius):
    size = int(radius) * 2 + 1
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (size, size))


def analyse(rgb, models):
    image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    h, w = rgb.shape[:2]
    landmarker = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=str(models / "face_landmarker.task")), num_faces=1))
    points = np.array([[p.x * w, p.y * h, -p.z * w] for p in landmarker.detect(image).face_landmarks[0]])
    segmenter = vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(
        base_options=mp_python.BaseOptions(model_asset_path=str(models / "selfie_multiclass.tflite")),
        output_category_mask=True))
    classes = segmenter.segment(image).category_mask.numpy_view().squeeze().copy()
    return points, classes


def cartoonify(rgb, classes, points):
    """Smooth skin in a few soft flat tones, simplified hair, clean sharp features."""
    clean = rgb.copy()
    for _ in range(5):
        clean = cv2.bilateralFilter(clean, 9, 30, 7)
    lab = cv2.cvtColor(clean, cv2.COLOR_RGB2LAB).astype(np.float32)

    # Skin: a heavily smoothed tone map cut into a few bands with gentle steps.
    light = lab[..., 0]
    skin_area = (classes == FACE_SKIN) | (classes == BODY_SKIN)
    broad = cv2.GaussianBlur(light, (0, 0), 22)
    ceiling = np.percentile(broad[skin_area], 80)
    shine = smoothstep(ceiling - 12, ceiling, broad)
    broad = np.minimum(broad, ceiling)  # no pale shiny patches
    q = broad / SKIN_TONE_STEP
    fraction = q - np.floor(q)
    bands = (np.floor(q) + smoothstep(0.32, 0.68, fraction)) * SKIN_TONE_STEP
    bands = cv2.GaussianBlur(bands, (0, 0), 3)
    # Only the deepest creases survive: nostrils, the smile line.
    fine = light - cv2.GaussianBlur(light, (0, 0), 7)
    creases = np.minimum(fine + 7, 0) * 0.9
    toon = lab.copy()
    toon[..., 0] = bands + creases + 9  # bands round down; this returns the lost brightness
    # Shine has little colour of its own; left alone it turns grey once darkened.
    warm = np.median(lab[skin_area & (shine < 0.2)][:, 1:], axis=0)
    toon[..., 1:] = cv2.GaussianBlur(lab[..., 1:] * (1 - shine[..., None]) + warm * shine[..., None], (0, 0), 9)
    toon[..., 1:] = warm + (toon[..., 1:] - warm) * 0.7

    skin = cv2.dilate(skin_area.astype(np.uint8), disc(1))
    sharp = np.zeros(skin.shape, np.uint8)
    for group in KEEP_SHARP:
        cv2.fillConvexPoly(sharp, cv2.convexHull(points[group, :2].round().astype(np.int32)), 1)
    sharp = cv2.dilate(sharp, disc(4))
    sharp_w = cv2.GaussianBlur(sharp.astype(np.float32), (0, 0), 2.5)[..., None]
    skin_w = cv2.GaussianBlur(skin.astype(np.float32), (0, 0), 1.0)[..., None]

    # Hair: fewer tones and cleaner strands.
    hair_w = cv2.GaussianBlur((classes == HAIR).astype(np.float32), (0, 0), 1.0)[..., None]
    hair = lab.copy()
    step = 13.0
    hq = hair[..., 0] / step
    hair[..., 0] = (np.floor(hq) + smoothstep(0.3, 0.7, hq - np.floor(hq))) * step

    result = lab * (1 - hair_w) + hair * hair_w
    result = result * (1 - skin_w) + (toon * (1 - sharp_w) + lab * sharp_w) * skin_w
    return cv2.cvtColor(np.clip(result, 0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB)


def to_pink(rgb, reds, accents):
    """Moves the cloth's reds to pink, and its orange motifs to a pale matching rose."""
    hsv = cv2.cvtColor(np.clip(rgb, 0, 1).astype(np.float32), cv2.COLOR_RGB2HSV)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    is_red = ((h >= 335) | (h <= 14)) & (s > 0.4)
    is_orange = (h > 14) & (h <= 52) & (s > 0.45)
    red = reds & is_red
    orange = accents & is_orange
    h[red] = PINK_HUE
    s[red] = np.minimum(s[red] * 1.02, 1)
    v[red] *= 0.76
    h[orange] = PINK_HUE
    s[orange] *= 0.42
    v[orange] *= 0.98
    return cv2.cvtColor(hsv, cv2.COLOR_HSV2RGB)


def reshape_neckline(body_rgb, label, under, W, H):
    """Recuts the square neckline as a V: skin down to the point, pattern either side."""
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    v = np.zeros((H, W), np.uint8)
    cv2.fillPoly(v, [np.array([V_LEFT, V_APEX, V_RIGHT, (V_RIGHT[0], 0), (V_LEFT[0], 0)], np.int32)], 1)
    inside = v.astype(bool)
    skin_patch = (label == BODY_SKIN) & (ys > 900) & (ys < 985) & (xs > 520) & (xs < 740)
    skin_tone = np.median(body_rgb[skin_patch], axis=0)

    # Cloth for the old neckline's corners comes from further down the same top.
    corners = ~inside & (ys >= V_LEFT[1] - 7) & (ys <= 1024) & (xs >= V_LEFT[0] - 9) & (xs <= V_RIGHT[0] + 7)
    centre = V_APEX[0]
    src_x = np.minimum(xs, 2 * centre - xs).astype(np.int32)
    src_y = np.minimum(ys + 215, H - 1).astype(np.int32)
    cloned = body_rgb[src_y, src_x]
    out = body_rgb.copy()
    weight = cv2.GaussianBlur(corners.astype(np.float32), (0, 0), 1.2)[..., None]
    out = out * (1 - weight) + cloned * weight

    # Lower chest goes to one clean tone (the drawing has hair shadows there), fading
    # in below the pendant; anything else inside the V that wasn't skin is skin now.
    keep_skin = (label == BODY_SKIN) | (label == ACCESSORY)
    stray = inside & (ys > V_LEFT[1] - 7) & (~keep_skin | under)
    fade = smoothstep(948.0, 985.0, ys) * inside
    paint_w = np.maximum(cv2.GaussianBlur(stray.astype(np.float32), (0, 0), 1.2), cv2.GaussianBlur(fade.astype(np.float32), (0, 0), 1.2))[..., None]
    out = out * (1 - paint_w) + skin_tone * paint_w
    cloth = ~inside & (ys > V_LEFT[1] - 7)
    return out, cloth, inside


def draw_neckline_trim(rgb):
    """A dark edge and a cream stitched line, so the V reads as a made neckline."""
    h, w = rgb.shape[:2]
    def stroke(offset, width, color, dotted=False):
        layer = np.zeros((h, w), np.float32)
        for start in (V_LEFT, V_RIGHT):
            a = np.array(start, np.float32)
            b = np.array(V_APEX, np.float32)
            direction = (b - a) / np.linalg.norm(b - a)
            outward = np.array([-direction[1], direction[0]])
            if outward @ (a - np.array([V_APEX[0], 0], np.float32)) < 0:
                outward = -outward
            p0, p1 = a + outward * offset, b + np.array([0, offset * 1.25], np.float32)
            if dotted:
                length = np.linalg.norm(p1 - p0)
                for t in np.arange(0, length, 15):
                    c = p0 + (p1 - p0) * t / length
                    cv2.circle(layer, (int(c[0] * 8), int(c[1] * 8)), int(width * 8), 1.0, -1, cv2.LINE_AA, 3)
            else:
                cv2.line(layer, (int(p0[0] * 8), int(p0[1] * 8)), (int(p1[0] * 8), int(p1[1] * 8)), 1.0, width, cv2.LINE_AA, 3)
        layer = layer[..., None]
        return rgb * (1 - layer) + np.array(color, np.float32) * layer
    rgb = stroke(0, 3, (0.45, 0.07, 0.27))
    rgb = stroke(19, 3, (1.0, 0.92, 0.9))
    rgb = stroke(10, 2.4, (1.0, 0.92, 0.9), dotted=True)
    return rgb


def head_depth(points, head_mask):
    h, w = head_mask.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    keep = np.arange(468)
    face_z = griddata(points[keep, :2], points[keep, 2], (xx, yy), method="linear")
    hull = np.zeros((h, w), np.uint8)
    cv2.fillPoly(hull, [points[FACE_OVAL, :2].round().astype(np.int32)], 1)
    hull = hull.astype(bool) & ~np.isnan(face_z)
    nearest = ndi.distance_transform_edt(~hull, return_distances=False, return_indices=True)
    boundary_z = face_z[nearest[0], nearest[1]]
    smooth_face = ndi.gaussian_filter(boundary_z, 2.0)
    rim_z = float(points[FACE_OVAL, 2].min() - 18)
    d_hull = ndi.distance_transform_edt(~hull)
    d_rim = ndi.distance_transform_edt(head_mask)
    r = d_hull / np.maximum(d_hull + d_rim, 1e-3)
    outer = rim_z + (ndi.gaussian_filter(boundary_z, 12.0) - rim_z) * np.clip(1 - r ** 2, 0, 1) ** 0.8
    outer = ndi.gaussian_filter(outer, 8.0)
    w_face = smoothstep(0, 20, ndi.distance_transform_edt(hull))
    z = w_face * smooth_face + (1 - w_face) * outer
    z -= 22 * np.clip(1 - d_rim / 20, 0, 1) ** 2
    return z.astype(np.float32), rim_z


def body_depth(h, w, cx, neck_half, unit, mask):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    dx = xx - cx
    neck = -2.0 * unit + 0.9 * unit * np.sqrt(np.clip(1 - (dx / (neck_half + 10)) ** 2, 0, 1))
    half = 650.0
    chest = -2.5 * unit + 1.75 * unit * np.sqrt(np.clip(1 - (dx / half) ** 2, 0, 1)) * smoothstep(700, 980, yy)
    k = 0.2 * unit
    z = k * np.logaddexp(neck / k, chest / k)
    z -= 0.25 * unit * np.clip(1 - ndi.distance_transform_edt(mask) / 40, 0, 1) ** 2
    return ndi.gaussian_filter(z, 4.0).astype(np.float32)


def fit_lid(points, indices, origin, axis, half):
    normal = np.array([-axis[1], axis[0]])
    relative = points[indices, :2] - origin
    u = relative @ axis / half
    v = relative @ normal
    return [float(c) for c in np.polyfit(u, v, 4)[::-1]]


def save_rgba(path, rgb, alpha, quality=90):
    data = (np.clip(rgb, 0, 1) * 255 + 0.5).astype(np.uint8)
    a = (np.clip(alpha, 0, 1) * 255 + 0.5).astype(np.uint8)
    Image.fromarray(np.dstack([data, a])).save(path, "WEBP", quality=quality, exact=True, method=6, alpha_quality=95)


def main():
    source, face_source, models, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]), Path(sys.argv[4])
    rgb8 = cv2.cvtColor(cv2.imread(str(source)), cv2.COLOR_BGR2RGB)
    H, W = rgb8.shape[:2]
    points, classes = analyse(rgb8, models)
    unit = float(np.linalg.norm(points[454, :2] - points[234, :2]) / 2)
    # Measured depth falls off too steeply at the cheeks; easing it stops smearing.
    far = points[:, 2] < -0.35 * unit
    points[far, 2] = -0.35 * unit + (points[far, 2] + 0.35 * unit) * 0.6

    # The face: same position, size and tilt as the portrait's, its own shape.
    face8 = cv2.cvtColor(cv2.imread(str(face_source)), cv2.COLOR_BGR2RGB)
    face_raw, face_classes_raw = analyse(face8, models)
    align, _ = cv2.estimateAffinePartial2D(
        face_raw[:468, :2].astype(np.float32), points[:468, :2].astype(np.float32), method=cv2.LMEDS)
    align_scale = float(np.hypot(align[0, 0], align[1, 0]))
    print("face aligned at scale", round(align_scale, 3), flush=True)
    face_rgb8 = cv2.warpAffine(face8, align, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    face_classes = cv2.warpAffine(face_classes_raw, align, (W, H), flags=cv2.INTER_NEAREST, borderMode=cv2.BORDER_CONSTANT, borderValue=BG)
    face_points = face_raw.copy()
    face_points[:, :2] = face_raw[:, :2] @ align[:, :2].T + align[:, 2]
    face_points[:, 2] = face_raw[:, 2] * align_scale
    far = face_points[:, 2] < -0.35 * unit
    face_points[far, 2] = -0.35 * unit + (face_points[far, 2] + 0.35 * unit) * 0.6

    toon8 = cartoonify(rgb8, classes, points)
    original = rgb8.astype(np.float64) / 255

    person = (classes != BG).astype(np.uint8)
    trimap = np.full(person.shape, 0.5)
    near_white = rgb8.min(axis=2) > 245
    trimap[(cv2.dilate(person, disc(30)) == 0) | (near_white & (cv2.dilate(person, disc(3)) == 0))] = 0
    trimap[cv2.erode(person, disc(4)) > 0] = 1
    print("matte…", flush=True)
    alpha = np.clip(estimate_alpha_cf(original, trimap), 0, 1).astype(np.float32)
    fg = np.clip(estimate_foreground_ml(toon8.astype(np.float64) / 255, alpha), 0, 1).astype(np.float32)

    ys = np.repeat(np.arange(H, dtype=np.float32)[:, None], W, axis=1)
    xs = np.repeat(np.arange(W, dtype=np.float32)[None, :], H, axis=0)
    jaw = float(points[152, 1])
    cx = float((points[454, 0] + points[234, 0]) / 2)
    gray = cv2.cvtColor(rgb8, cv2.COLOR_RGB2GRAY)

    # A dark blob the segmenter called jewellery, on a lock of hair, is hair.
    fixed = classes.copy()
    fixed[(classes == ACCESSORY) & (ys > jaw) & (gray < 90)] = HAIR
    idx = ndi.distance_transform_edt(fixed == BG, return_distances=False, return_indices=True)
    label = fixed[idx[0], idx[1]]
    soft = lambda m, s=1.2: cv2.GaussianBlur(m.astype(np.float32), (0, 0), s)

    head_a = alpha * soft((label == FACE_SKIN) | ((label == ACCESSORY) & (ys < jaw)))
    hair_a = alpha * soft(label == HAIR)
    body_a = alpha * soft((label == BODY_SKIN) | (label == CLOTHES) | ((label == ACCESSORY) & (ys >= jaw)))

    # Neck carries on under the jaw, in a dome: a turning head uncovers no corner.
    probe = np.where(label[int(jaw - 30)] == BODY_SKIN)[0]
    n_left, n_right = probe.min(), probe.max()
    neck_half = (n_right - n_left) / 2
    centre = (n_left + n_right) / 2
    body_rgb = fg.copy()
    neck_fill = np.zeros((H, W), np.float32)
    for x in range(n_left, n_right + 1):
        below = np.where((label[:, x] == BODY_SKIN) & (np.arange(H) > jaw - 120))[0]
        if len(below) == 0:
            continue
        y = below[0]
        across = (x - centre) / max(neck_half, 1)
        top = max(int(y - 105 * np.sqrt(max(1 - across ** 2, 0))), 0)
        body_rgb[top:y + 6, x] = fg[min(y + 16, H - 1), x] * (0.9 - 0.14 * across ** 2)
        neck_fill[top:y + 6, x] = 1
    neck_fill *= np.maximum(cv2.dilate(head_a, disc(3)) > 0.02, label == BODY_SKIN)
    body_rgb = fg * (1 - soft(neck_fill, 3)[..., None]) + cv2.GaussianBlur(body_rgb, (0, 0), 6) * soft(neck_fill, 3)[..., None]
    body_a = np.maximum(body_a, neck_fill)

    # Whatever the hair covers on her torso is filled in from nearby, for when it sways.
    solid_body = body_a > 0.9
    if solid_body.any():
        torso_points = np.argwhere(solid_body & (ys > jaw + 90))[:, ::-1].astype(np.int32)
        hull = np.zeros((H, W), np.uint8)
        cv2.fillConvexPoly(hull, cv2.convexHull(torso_points), 1)
        under = (hull > 0) & (hair_a > 0.02) & (ys > jaw + 90)
        nearest = ndi.distance_transform_edt(~solid_body, return_distances=False, return_indices=True)
        filled = cv2.GaussianBlur(fg[nearest[0], nearest[1]], (0, 0), 10)
        body_rgb[under] = filled[under]
        body_a = np.maximum(body_a, under.astype(np.float32))

    # The dress: a V neckline, in pink.
    body_rgb, cloth_area, inside_v = reshape_neckline(body_rgb, label, under, W, H)
    # Everything labelled cloth, shoulders included, except what the V now shows as skin.
    cloth_area = (cloth_area | (label == CLOTHES)) & ~(inside_v & (ys > V_LEFT[1] - 7))
    # Neck and chest move to the new face's skin tone.
    def lab_of(rgb):
        return cv2.cvtColor(np.clip(rgb, 0, 1).astype(np.float32), cv2.COLOR_RGB2LAB)
    face_float = face_rgb8.astype(np.float32) / 255
    face_jaw = float(face_points[152, 1])
    face_neck = (face_classes == BODY_SKIN) & (ys > face_jaw + 70) & (ys < face_jaw + 140)
    if face_neck.sum() < 500:
        face_neck = (face_classes == FACE_SKIN) & (ys > face_points[1, 1] - 30) & (ys < face_jaw - 40)
    own_neck = (label == BODY_SKIN) & (ys > jaw + 70) & (ys < jaw + 140)
    shift = np.median(lab_of(face_float)[face_neck], axis=0) - np.median(lab_of(body_rgb)[own_neck], axis=0)
    skin_part = ~cloth_area & (body_a > 0.02) & (label != ACCESSORY)
    moved = lab_of(body_rgb)
    moved[skin_part] += shift
    body_rgb = cv2.cvtColor(moved, cv2.COLOR_LAB2RGB)
    # Just under the chin, the face image's own neck, for its soft shadow. It fades
    # out above its necklace, where the portrait's takes over.
    # Pulled in from its edges, which pick up hair and backdrop tones.
    neck_core = cv2.erode(((face_classes == BODY_SKIN) & skin_part).astype(np.uint8), disc(16))
    own_neck_top = cv2.GaussianBlur(neck_core.astype(np.float32), (0, 0), 7)
    fade = own_neck_top * (1 - smoothstep(face_jaw + 45, face_jaw + 105, ys))
    body_rgb = body_rgb * (1 - fade[..., None]) + face_float * fade[..., None]
    body_rgb = to_pink(body_rgb, cloth_area, cloth_area)
    body_rgb = draw_neckline_trim(body_rgb)
    # Hair edges picked up a red fringe from the old colour.
    fg = to_pink(fg, (label == HAIR) & (ys > jaw), np.zeros((H, W), bool))

    # Back: solid hair colour behind the lower head and neck, never visible at rest.
    is_hair = (label == HAIR) & (alpha > 0.9)
    tone = np.median(fg[is_hair & (gray < 70)], axis=0)
    # Only needed around the neck: higher up, the hair turns with the face and uncovers nothing.
    hidden = (head_a > 0.5) | (hair_a > 0.5) | (body_a > 0.9)
    closed = cv2.morphologyEx(hidden.astype(np.uint8), cv2.MORPH_CLOSE, disc(12)).astype(bool)
    span = (ys > jaw - 140) & (ys < jaw + 280) & (xs > n_left - 70) & (xs < n_right + 70)
    # The opening in the hair was cut for the portrait's face. Anywhere the new face
    # doesn't quite fill it, hair colour shows rather than the page behind.
    opening = cv2.erode((head_a > 0.5).astype(np.uint8), disc(1)).astype(bool)
    back_a = ((closed & span) | opening).astype(np.float32)

    # The head layer: the new face and ears, plus its own hairline inside the opening.
    face_person = (face_classes == FACE_SKIN) | (face_classes == ACCESSORY)
    face_person = cv2.morphologyEx(face_person.astype(np.uint8), cv2.MORPH_OPEN, disc(2)) > 0
    # The drawing's white backdrop can't come along at the mask's edge.
    face_white = face_rgb8.min(axis=2).astype(np.float32)
    edge_band = ~cv2.erode(face_person.astype(np.uint8), disc(7)).astype(bool)
    backdrop = edge_band & (face_white > 205)
    face_person = face_person & ~cv2.dilate(backdrop.astype(np.uint8), disc(2)).astype(bool)
    # Earrings have white petals the segmenter misses: take each one's whole outline.
    count, labels, stats, _ = cv2.connectedComponentsWithStats((face_classes == ACCESSORY).astype(np.uint8))
    for i in range(1, count):
        if stats[i, cv2.CC_STAT_AREA] >= 40:
            found = np.argwhere(labels == i)[:, ::-1].astype(np.int32)
            hull = np.zeros((H, W), np.uint8)
            cv2.fillConvexPoly(hull, cv2.convexHull(found), 1)
            face_person |= cv2.dilate(hull, disc(5)) > 0
    # Only the dark of its hairline: the pale edge of the part stays out of the seam.
    fringe = (face_classes == HAIR) & opening & (face_rgb8.max(axis=2) < 150)
    head_a = soft(face_person | fringe, 1.0)
    face_fg = face_rgb8.astype(np.float32) / 255
    back_rgb = np.broadcast_to(tone, fg.shape).astype(np.float32)

    # --- Eyes: fitted lid curves for the shader; the art is healed underneath ----
    head_rgb8 = face_rgb8.copy()
    hole = np.zeros((H, W), np.uint8)
    eyes = []
    for eye in EYES:
        outer, inner = face_points[eye["outer"], :2], face_points[eye["inner"], :2]
        origin = (outer + inner) / 2
        axis = (outer - inner) / np.linalg.norm(outer - inner)
        half = float(np.linalg.norm(outer - inner) / 2)
        # Normal points up the image, whichever side the outer corner lies on.
        normal = np.array([-axis[1], axis[0]])
        sign = -1.0 if normal[1] > 0 else 1.0
        upper = [c * EYE_SCALE for c in fit_lid(face_points, eye["upper"], origin, axis, half)]
        lower = [c * EYE_SCALE for c in fit_lid(face_points, eye["lower"], origin, axis, half)]
        contour_up = face_points[eye["upper"], :2] + normal * sign * 6
        contour_lo = face_points[eye["lower"], :2] - normal * sign * 2.5
        cv2.fillPoly(hole, [np.vstack([contour_up, contour_lo[::-1]]).round().astype(np.int32)], 255)
        iris = face_points[eye["iris"], :2]
        radius = float(np.linalg.norm(face_points[eye["rim"], :2] - iris, axis=1).mean())
        eyes.append(dict(origin=origin.tolist(), axis=axis.tolist(), half=half * EYE_SCALE, upSign=sign,
                         upper=upper, lower=lower, iris=iris.tolist(), radius=radius * EYE_SCALE))
    head_healed = cv2.inpaint(head_rgb8, hole, 7, cv2.INPAINT_TELEA).astype(np.float32) / 255
    weight = soft(hole > 0, 1.6)[..., None]
    head_rgb = face_fg * (1 - weight) + cv2.GaussianBlur(head_healed, (0, 0), 3) * weight
    # --- Depth -------------------------------------------------------------------
    head_mask = ((head_a > 0.5) | ((hair_a > 0.5) & (ys < jaw + 40)))
    z_head, rim_z = head_depth(face_points, head_mask)
    z_body = body_depth(H, W, cx, neck_half, unit, (body_a > 0.5) | (hair_a > 0.5))
    lock = np.clip(ndi.distance_transform_edt(hair_a > 0.5) / 60, 0, 1) ** 0.5
    blend = smoothstep(jaw - 90, jaw + 130, ys)
    z_hair = ndi.gaussian_filter(z_head * (1 - blend) + (z_body + (0.12 + 0.3 * lock) * unit) * blend, 5.0).astype(np.float32)

    # --- Layers -------------------------------------------------------------------
    blob = bytearray()
    layers = {}

    def add(name, color, a, z, step):
        ys_, xs_ = np.where(a > 0.004)
        x0, y0 = max(int(xs_.min()) - 6, 0), max(int(ys_.min()) - 6, 0)
        x1, y1 = min(int(xs_.max()) + 7, W), min(int(ys_.max()) + 7, H)
        save_rgba(out / f"{name}.webp", color[y0:y1, x0:x1], a[y0:y1, x0:x1])
        cols, rows = (x1 - x0) // step + 2, (y1 - y0) // step + 2
        gx, gy = np.minimum(x0 + np.arange(cols) * step, W - 1), np.minimum(y0 + np.arange(rows) * step, H - 1)
        cover = cv2.dilate(a, disc(step + 1))[np.ix_(gy, gx)] > 0.004
        values = np.where(cover, np.clip(z[np.ix_(gy, gx)] * 4, -32000, 32000), -32768).astype(np.int16)
        layers[name] = dict(rect=[x0, y0, x1, y1], step=step, cols=int(cols), rows=int(rows), offset=len(blob))
        blob.extend(values.tobytes())

    add("back", back_rgb, back_a, np.full((H, W), rim_z - 0.1 * unit, np.float32), 12)
    add("body", body_rgb, body_a, z_body, 8)
    add("head", head_rgb, head_a, z_head, 4)
    add("hair", fg, hair_a, z_hair, 5)
    (out / "avatar.bin").write_bytes(bytes(blob))

    # Poster: the finished layers stacked up, the face with its eyes as drawn.
    poster_a = np.zeros((H, W), np.float32)
    poster_rgb = np.zeros((H, W, 3), np.float32)
    for color, a in ((back_rgb, back_a), (body_rgb, body_a), (face_fg, head_a), (fg, hair_a)):
        ax = a[..., None]
        total = ax + poster_a[..., None] * (1 - ax)
        poster_rgb = np.where(total > 0, (color * ax + poster_rgb * poster_a[..., None] * (1 - ax)) / np.maximum(total, 1e-4), 0)
        poster_a = total[..., 0]
    save_rgba(out / "poster.webp", poster_rgb, poster_a, quality=86)

    face_gray = cv2.cvtColor(face_rgb8, cv2.COLOR_RGB2GRAY)
    whites = (cv2.erode(hole, disc(5)) > 0) & (face_gray > 175)
    sclera = np.median(face_rgb8[whites], axis=0) / 255 if whites.any() else np.array([0.95, 0.92, 0.88])
    manifest = dict(
        size=[W, H], cx=cx, unit=unit, jaw=jaw, headTop=int(np.where((alpha > 0.5).any(axis=1))[0][0]),
        pivot=[cx, jaw - 70, float(rim_z)], rimZ=rim_z, layers=layers, eyes=eyes,
        colors=dict(hair=[float(v) for v in tone], sclera=[float(v) for v in sclera]),
    )
    (out / "avatar.json").write_text(json.dumps(manifest))
    print({k: manifest[k] for k in ("cx", "unit", "jaw", "headTop", "pivot", "colors")})
    for name in ("back", "body", "head", "hair", "poster", "avatar"):
        path = out / (f"{name}.webp" if name != "avatar" else "avatar.bin")
        print(path.name, path.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
