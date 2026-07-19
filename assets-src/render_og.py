#!/usr/bin/env python3
# 보이스 컬러 — OG 이미지 + 파비콘 렌더
#
# 배경: gpt-image-2 생성(og-bg-raw.png), 한글 텍스트는 여기서 PIL로 얹는다.
#   (gpt-image-2는 한글 자모를 깨뜨리므로 텍스트를 맡기지 않는다 — insta-asset-production 규칙)
#
# 규격 근거 (2026-07-19 조사):
#   - OG 권장 1200×630 (1.91:1)
#   - 카카오는 800×400(2:1)로 변환 + 스마트 크롭(위치 제어 불가)
#     → 1200×630에서 상하 각 15px가 잘릴 수 있으므로 핵심 요소는 y 80..550 안에 둔다
#   - 한글 헤드라인 72px 이상 Bold (썸네일에서 300×157까지 축소됨)
#   - PNG/JPG만, 용량 300KB 이하 목표
#   - apple-touch-icon 180×180, 투명 금지, 패딩 ~20px

from PIL import Image, ImageDraw, ImageFont
import os

SRC = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(SRC)
BRAND = "/Users/coo/Soma/brand"

W, H = 1200, 630
SAFE_TOP, SAFE_BOTTOM = 80, 550          # 카카오 2:1 크롭 + 여백 감안한 안전 영역

INK      = (25, 31, 40)                   # --ink    #191f28
INK_2    = (78, 89, 104)                  # --ink-2  #4e5968
ACCENT   = (49, 130, 246)                 # --accent #3182f6

F = lambda name, size: ImageFont.truetype(f"{BRAND}/fonts/Pretendard-{name}.otf", size)


def cover_crop(im, tw, th, y_bias=0.30):
    """가로 기준으로 맞춘 뒤 세로를 y_bias 위치에서 잘라낸다(0=위, 1=아래)."""
    scale = max(tw / im.width, th / im.height)
    nw, nh = round(im.width * scale), round(im.height * scale)
    im = im.resize((nw, nh), Image.LANCZOS)
    left = (nw - tw) // 2
    top = round((nh - th) * y_bias)
    return im.crop((left, top, left + tw, top + th))


def right_scrim(size, x_start=520, feather=170, alpha=214):
    """오른쪽 텍스트 영역에만 흰 스크림을 깔고 왼쪽 경계를 부드럽게 넘긴다.
    사진을 통판으로 덮지 않으면서 글자 대비를 확보한다."""
    w, h = size
    mask = Image.new("L", (w, 1), 0)
    px = mask.load()
    for x in range(w):
        if x < x_start:
            v = 0
        elif x < x_start + feather:
            t = (x - x_start) / feather
            v = int(alpha * (t * t * (3 - 2 * t)))     # smoothstep
        else:
            v = alpha
        px[x, 0] = v
    mask = mask.resize((w, h))
    layer = Image.new("RGBA", (w, h), (255, 255, 255, 255))
    layer.putalpha(mask)
    return layer


def build_og():
    bg = Image.open(f"{SRC}/og-bg-raw.png").convert("RGB")
    im = cover_crop(bg, W, H, y_bias=0.10).convert("RGBA")
    im.alpha_composite(right_scrim((W, H)))

    d = ImageDraw.Draw(im)
    x = 620

    # eyebrow — 제품 이름
    d.text((x, 108), "보이스 컬러", font=F("SemiBold", 32), fill=ACCENT)

    # headline — 썸네일에서도 읽혀야 하므로 88px ExtraBold
    d.text((x, 162), "내 목소리는",  font=F("ExtraBold", 88), fill=INK)
    d.text((x, 262), "무슨 색일까",  font=F("ExtraBold", 88), fill=INK)

    # sub — 진입 비용 + 판정 없음 (insta-asset-production 확정 규칙)
    d.text((x, 392), "30초 녹음 · 점수도 판정도 없이",
           font=F("Medium", 34), fill=INK_2)

    # 워드마크 — brand/에서만 가져온다
    wm = Image.open(f"{BRAND}/acttub-wordmark.png").convert("RGBA")
    wm = wm.resize((round(wm.width * 34 / wm.height), 34), Image.LANCZOS)
    im.alpha_composite(wm, (x, 470))

    # 사진 배경이라 PNG는 680KB까지 커진다. 카카오가 JPG를 지원하고
    # 용량 목표(300KB 이하)를 지켜야 하므로 JPEG로 내보낸다.
    out = f"{APP}/og-2026-07-19.jpg"
    im.convert("RGB").save(out, "JPEG", quality=88, optimize=True, progressive=True)
    return out


def build_icons():
    """brand/acttub-logo.png에서 파비콘 세트를 만든다. 로고는 새로 그리지 않는다."""
    logo = Image.open(f"{BRAND}/acttub-logo.png").convert("RGBA")
    made = []

    # apple-touch-icon: 투명 금지 + 사방 패딩
    side, pad = 180, 22
    canvas = Image.new("RGB", (side, side), (255, 255, 255))
    inner = side - pad * 2
    lg = logo.copy()
    lg.thumbnail((inner, inner), Image.LANCZOS)
    canvas.paste(lg, ((side - lg.width) // 2, (side - lg.height) // 2), lg)
    p = f"{APP}/apple-touch-icon.png"
    canvas.save(p, "PNG", optimize=True)
    made.append(p)

    # PWA 아이콘 (투명 배경 유지)
    for s in (192, 512):
        c = Image.new("RGBA", (s, s), (255, 255, 255, 255))
        l2 = logo.copy()
        l2.thumbnail((round(s * 0.76), round(s * 0.76)), Image.LANCZOS)
        c.paste(l2, ((s - l2.width) // 2, (s - l2.height) // 2), l2)
        p = f"{APP}/icon-{s}.png"
        c.convert("RGB").save(p, "PNG", optimize=True)
        made.append(p)

    # favicon.ico — 16/32/48 멀티사이즈
    ico = Image.new("RGBA", (256, 256), (255, 255, 255, 0))
    l3 = logo.copy()
    l3.thumbnail((256, 256), Image.LANCZOS)
    ico.paste(l3, ((256 - l3.width) // 2, (256 - l3.height) // 2), l3)
    p = f"{APP}/favicon.ico"
    ico.save(p, "ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    made.append(p)
    return made


if __name__ == "__main__":
    og = build_og()
    print(f"OG  {og}  {os.path.getsize(og)/1024:.0f}KB  {Image.open(og).size}")
    for p in build_icons():
        print(f"ICO {p}  {os.path.getsize(p)/1024:.0f}KB  {Image.open(p).size}")
