from __future__ import annotations

import json
from pathlib import Path
from PIL import Image, ImageOps, ImageFilter


def basic_stats(path: Path) -> dict:
    img = Image.open(path).convert('L')
    hist = img.histogram()
    total = sum(hist)
    mean = sum(i * c for i, c in enumerate(hist)) / total
    return {
        'path': str(path),
        'size': list(img.size),
        'mean_gray': mean,
        'min_gray': next(i for i, c in enumerate(hist) if c),
        'max_gray': max(i for i, c in enumerate(hist) if c),
    }


def save_thresholds(path: Path, out_dir: Path) -> list[str]:
    img = Image.open(path).convert('L')
    img = ImageOps.autocontrast(img)
    img = img.filter(ImageFilter.SHARPEN)
    written = []
    for t in (80, 96, 112, 128, 144, 160, 176):
        bw = img.point(lambda p: 255 if p > t else 0)
        out = out_dir / f'{path.stem}.th{t}.png'
        bw.save(out)
        written.append(str(out))
    return written


def main() -> None:
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('image')
    ap.add_argument('--out', default='out')
    args = ap.parse_args()

    path = Path(args.image)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    result = basic_stats(path)
    result['threshold_outputs'] = save_thresholds(path, out_dir)
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
