#!/usr/bin/env python3
"""Swayt 로고(C안, 기울어진 세트 줄)에서 앱 아이콘과 스플래시 이미지를 만든다.

로고는 단순한 도형 7개(둥근 막대)라서 디자인 도구의 파일 없이도 같은 모양을 그대로 그릴 수 있다.
도형 좌표는 assets/images/logo/swayt-mark.svg와 같다(단위 기준 폭 68, 높이 24, -18도 기울임).

사용: python3 scripts/make-logo-assets.py
만드는 것:
  assets/icon.png               1024x1024 불투명 앱 아이콘
  assets/splash-background.png  2160x4680 전체 화면 스플래시(네이티브·JS 스플래시가 같은 이미지를 쓴다)
"""
import math
import os

from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BG = (11, 11, 15)
WHITE = (255, 255, 255, 255)
MINT = (45, 212, 191, 255)
REMAINING = (255, 255, 255, 89)  # 흰색 35%

# (x, y, 폭, 높이, 색) — 단위 좌표
SHAPES = [
    (0, 0, 6, 24, WHITE),
    (9, 0, 6, 24, WHITE),
    (18, 0, 6, 24, WHITE),
    (27, 10, 14, 4, WHITE),
    (44, 0, 6, 24, MINT),
    (53, 0, 6, 24, REMAINING),
    (62, 0, 6, 24, REMAINING),
]
UNIT_W, UNIT_H, TILT = 68, 24, -18


def draw_mark(target_width: int, supersample: int = 4) -> Image.Image:
    """기울어진 로고를 투명 배경으로 그린다. 반환 이미지는 로고의 실제 범위에 딱 맞게 잘려 있다."""
    # 회전 후 범위(단위)의 가로세로 비율로 크기를 정한다.
    rad = math.radians(abs(TILT))
    bbox_w = UNIT_W * math.cos(rad) + UNIT_H * math.sin(rad)
    u = target_width * supersample / bbox_w  # 단위당 픽셀
    pad = int(8 * u)
    canvas_w = int(UNIT_W * u) + pad * 2
    canvas_h = int(UNIT_H * u) + pad * 2
    flat = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    d = ImageDraw.Draw(flat)
    for x, y, w, h, color in SHAPES:
        x0, y0 = pad + x * u, pad + y * u
        d.rounded_rectangle([x0, y0, x0 + w * u, y0 + h * u], radius=min(w, h) * u / 2, fill=color)
    rotated = flat.rotate(-TILT, resample=Image.BICUBIC, expand=True)  # PIL은 반시계 방향이 양수
    # 알파가 있는 부분으로 정확히 자른다(반투명 판도 포함).
    box = rotated.getchannel("A").point(lambda a: 255 if a > 0 else 0).getbbox()
    rotated = rotated.crop(box)
    return rotated.resize((target_width, max(1, round(rotated.height * target_width / rotated.width))), Image.LANCZOS)


def make_icon(path: str, mark_ratio: float = 0.70) -> None:
    size = 1024
    img = Image.new("RGB", (size, size), BG)
    mark = draw_mark(int(size * mark_ratio))
    # 로고 범위의 중심을 캔버스 중심에 맞춘다(대각선 모양이라 정렬 기준이 범위 중심이다).
    x = (size - mark.width) // 2
    y = (size - mark.height) // 2
    layer = img.convert("RGBA")
    layer.alpha_composite(mark, (x, y))
    layer.convert("RGB").save(path, optimize=True)


def make_splash(path: str, lockup_path: str) -> None:
    w, h = 2160, 4680
    # 중앙이 살짝 밝은 어두운 초록빛 방사형 배경(기존 스플래시와 같은 분위기).
    img = Image.new("RGB", (w, h), BG)
    px = img.load()
    cx, cy = w / 2, h * 0.47
    max_r = math.hypot(w / 2, h / 2)
    glow = (22, 48, 42)
    for yy in range(0, h, 1):
        dy = yy - cy
        for xx in range(0, w, 1):
            r = math.hypot(xx - cx, dy) / max_r
            t = max(0.0, 1.0 - r * 1.35)
            t = t * t
            px[xx, yy] = (
                int(BG[0] + (glow[0] - BG[0]) * t),
                int(BG[1] + (glow[1] - BG[1]) * t),
                int(BG[2] + (glow[2] - BG[2]) * t),
            )
    lockup = Image.open(lockup_path).convert("RGBA")
    target_w = int(w * 0.62)
    lockup = lockup.resize((target_w, round(lockup.height * target_w / lockup.width)), Image.LANCZOS)
    layer = img.convert("RGBA")
    layer.alpha_composite(lockup, ((w - lockup.width) // 2, int(cy - lockup.height / 2)))
    layer.convert("RGB").save(path, optimize=True)


if __name__ == "__main__":
    make_icon(os.path.join(ROOT, "assets", "icon.png"))
    make_splash(
        os.path.join(ROOT, "assets", "splash-background.png"),
        os.path.join(ROOT, "assets", "images", "logo", "swayt-lockup.png"),
    )
    print("완료: assets/icon.png, assets/splash-background.png")
