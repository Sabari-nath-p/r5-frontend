#!/usr/bin/env python3
"""
Measures the founder's portrait so the cartoon in the hero is drawn from her
rather than from a generic face: brows, lips, jaw shape and colours all
come from here. Re-run it to redraw the character from another photo.

    python trace_face.py source.png <models-dir> ../../src/components/landing/hero3d/faceTrace.json

<models-dir> holds MediaPipe's face_landmarker.task and selfie_multiclass.tflite.
Needs: mediapipe, opencv, numpy.

Output is in cartoon face units: eyes on y=0, half the face width = 1, and the
vertical squashed by SQUASH to give the rounder proportions of the art style.
"""
import json
import sys

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

SQUASH = 0.72

BROW_LEFT = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46]
BROW_RIGHT = [300, 293, 334, 296, 336, 285, 295, 282, 283, 276]
LIPS_UPPER = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191, 78]
LIPS_LOWER = [61, 78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146]
MOUTH_LINE = [61, 78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 291]
FACE_OVAL = [234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 454]


def main():
    source, models, out = sys.argv[1:4]
    bgr = cv2.imread(source)
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    h, w = rgb.shape[:2]
    image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    landmarker = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=f"{models}/face_landmarker.task"), num_faces=1))
    points = np.array([[p.x * w, p.y * h] for p in landmarker.detect(image).face_landmarks[0]])
    segmenter = vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(
        base_options=mp_python.BaseOptions(model_asset_path=f"{models}/selfie_multiclass.tflite"),
        output_category_mask=True))
    classes = segmenter.segment(image).category_mask.numpy_view().squeeze()

    half_width = (points[454, 0] - points[234, 0]) / 2
    centre_x = (points[454, 0] + points[234, 0]) / 2
    eye_y = (points[468, 1] + points[473, 1]) / 2

    def face_units(indices):
        selected = points[indices]
        return [[round(float((x - centre_x) / half_width), 4),
                 round(float((eye_y - y) / half_width * SQUASH), 4)] for x, y in selected]

    def tone(mask):
        return "#%02x%02x%02x" % tuple(int(v) for v in np.median(rgb[mask], axis=0))

    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    face_gray = gray[classes == 3]
    cheeks = (classes == 3) & (gray > np.percentile(face_gray, 35)) & (gray < np.percentile(face_gray, 85))
    lip_mask = np.zeros((h, w), np.uint8)
    cv2.fillPoly(lip_mask, [points[LIPS_LOWER].round().astype(np.int32)], 1)

    bindi = gray[int(eye_y) - 30:int(eye_y) - 2, int(centre_x) - 8:int(centre_x) + 8]
    by, bx = np.unravel_index(np.argmin(bindi), bindi.shape)
    bindi_at = [round(float((bx + int(centre_x) - 8 - centre_x) / half_width), 4),
                round(float((30 - by - 2) / half_width * SQUASH), 4)]

    trace = dict(
        browLeft=face_units(BROW_LEFT),
        browRight=face_units(BROW_RIGHT),
        lipsUpper=face_units(LIPS_UPPER),
        lipsLower=face_units(LIPS_LOWER),
        mouthLine=face_units(MOUTH_LINE),
        oval=face_units(FACE_OVAL),
        eyeSpacing=round(float((points[473, 0] - points[468, 0]) / 2 / half_width), 4),
        noseTipY=round(float((eye_y - points[1, 1]) / half_width * SQUASH), 4),
        bindi=bindi_at,
        colors=dict(skin=tone(cheeks), lips=tone(lip_mask > 0), hair=tone(classes == 1), cloth=tone(classes == 4)),
    )
    with open(out, "w") as f:
        json.dump(trace, f, indent=1)
    print({k: trace[k] for k in ("eyeSpacing", "noseTipY", "bindi", "colors")})


if __name__ == "__main__":
    main()
