from __future__ import annotations

import json
import math
import shutil
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
import re

from PIL import Image

ROOT = Path.cwd()
ASSET_DIR = ROOT / "assets" / "gallery"
PHOTO_DIR = ASSET_DIR / "photos"
REPORT_PATH = ASSET_DIR / "dedupe_report.json"
MANIFEST_PATH = ASSET_DIR / "gallery_manifest.json"

IMAGE_EXTS = {".jpeg", ".jpg", ".png"}
DATE_RE = re.compile(r"(\d{4})-(\d{2})-(\d{2})")


@dataclass
class ImageMeta:
    index: int
    path: Path
    width: int
    height: int
    area: int
    size_bytes: int
    ahash: int
    dhash: int
    aspect: float
    rgb_mean: tuple[float, float, float]
    date_str: str | None


def average_hash(image: Image.Image, hash_size: int = 16) -> int:
    thumb = image.convert("L").resize((hash_size, hash_size), Image.Resampling.LANCZOS)
    pixels = list(thumb.getdata())
    avg = sum(pixels) / len(pixels)
    bits = 0
    for value in pixels:
        bits = (bits << 1) | (1 if value >= avg else 0)
    return bits


def difference_hash(image: Image.Image, hash_size: int = 16) -> int:
    thumb = image.convert("L").resize((hash_size + 1, hash_size), Image.Resampling.LANCZOS)
    pixels = list(thumb.getdata())
    bits = 0
    stride = hash_size + 1
    for y in range(hash_size):
        row = y * stride
        for x in range(hash_size):
            left = pixels[row + x]
            right = pixels[row + x + 1]
            bits = (bits << 1) | (1 if left >= right else 0)
    return bits


def mean_rgb(image: Image.Image) -> tuple[float, float, float]:
    thumb = image.convert("RGB").resize((8, 8), Image.Resampling.LANCZOS)
    data = list(thumb.getdata())
    total = len(data)
    rs = sum(px[0] for px in data)
    gs = sum(px[1] for px in data)
    bs = sum(px[2] for px in data)
    return (rs / total, gs / total, bs / total)


def hamming(a: int, b: int) -> int:
    return (a ^ b).bit_count()


def color_distance(a: tuple[float, float, float], b: tuple[float, float, float]) -> float:
    return math.dist(a, b) / 441.67295593


def parse_date(name: str) -> str | None:
    match = DATE_RE.search(name)
    if not match:
        return None
    try:
        dt = datetime(int(match.group(1)), int(match.group(2)), int(match.group(3)))
        return dt.strftime("%Y-%m-%d")
    except ValueError:
        return None


def orientation(width: int, height: int) -> str:
    if width == height:
        return "square"
    return "landscape" if width > height else "portrait"


def quality_label(width: int, height: int) -> str:
    longest = max(width, height)
    if longest >= 1900:
        return "ultra"
    if longest >= 1400:
        return "high"
    if longest >= 1000:
        return "medium"
    return "standard"


class DSU:
    def __init__(self, n: int) -> None:
        self.parent = list(range(n))
        self.rank = [0] * n

    def find(self, x: int) -> int:
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, a: int, b: int) -> None:
        ra = self.find(a)
        rb = self.find(b)
        if ra == rb:
            return
        if self.rank[ra] < self.rank[rb]:
            self.parent[ra] = rb
        elif self.rank[ra] > self.rank[rb]:
            self.parent[rb] = ra
        else:
            self.parent[rb] = ra
            self.rank[ra] += 1


def load_images() -> list[ImageMeta]:
    files = sorted(
        [p for p in ROOT.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTS],
        key=lambda p: p.name.lower(),
    )

    result: list[ImageMeta] = []
    for idx, path in enumerate(files):
        try:
            with Image.open(path) as img:
                img.load()
                w, h = img.size
                ah = average_hash(img)
                dh = difference_hash(img)
                rgb = mean_rgb(img)
        except Exception:
            continue

        result.append(
            ImageMeta(
                index=idx,
                path=path,
                width=w,
                height=h,
                area=w * h,
                size_bytes=path.stat().st_size,
                ahash=ah,
                dhash=dh,
                aspect=(w / h) if h else 1.0,
                rgb_mean=rgb,
                date_str=parse_date(path.name),
            )
        )
    return result


def is_similar(a: ImageMeta, b: ImageMeta) -> bool:
    aspect_delta = abs(a.aspect - b.aspect) / max(a.aspect, b.aspect)
    if aspect_delta > 0.06:
        return False

    d_dist = hamming(a.dhash, b.dhash)
    a_dist = hamming(a.ahash, b.ahash)
    c_dist = color_distance(a.rgb_mean, b.rgb_mean)

    if d_dist <= 6 and c_dist <= 0.24:
        return True
    if d_dist <= 10 and a_dist <= 10 and c_dist <= 0.18:
        return True
    if d_dist <= 14 and a_dist <= 8 and c_dist <= 0.12:
        return True
    return False


def cluster_images(images: list[ImageMeta]) -> dict[int, list[ImageMeta]]:
    dsu = DSU(len(images))
    for i in range(len(images)):
        for j in range(i + 1, len(images)):
            if is_similar(images[i], images[j]):
                dsu.union(i, j)

    groups: dict[int, list[ImageMeta]] = defaultdict(list)
    for idx, image in enumerate(images):
        groups[dsu.find(idx)].append(image)

    return groups


def pick_representative(group: list[ImageMeta]) -> ImageMeta:
    return max(group, key=lambda im: (im.area, im.size_bytes, im.width, im.height))


def next_category(position: int) -> str:
    categories = ["academic", "cultural", "sports", "celebrations", "infrastructure"]
    return categories[position % len(categories)]


def run() -> None:
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    PHOTO_DIR.mkdir(parents=True, exist_ok=True)

    images = load_images()
    if not images:
        print("No root-level images found for processing.")
        return

    groups = cluster_images(images)
    sorted_groups = sorted(groups.values(), key=lambda g: (-len(g), g[0].path.name.lower()))

    mapping: dict[str, str] = {}
    manifest: list[dict] = []
    duplicate_groups: list[dict] = []

    kept_count = 0
    deleted_count = 0

    counter = 1
    for group in sorted_groups:
        representative = pick_representative(group)
        ext = representative.path.suffix.lower() if representative.path.suffix.lower() in IMAGE_EXTS else ".jpeg"
        new_name = f"photo_{counter:03d}{ext}"
        new_rel = f"assets/gallery/photos/{new_name}"
        new_abs = ROOT / new_rel

        while new_abs.exists():
            counter += 1
            new_name = f"photo_{counter:03d}{ext}"
            new_rel = f"assets/gallery/photos/{new_name}"
            new_abs = ROOT / new_rel

        shutil.move(str(representative.path), str(new_abs))
        kept_count += 1

        cluster_names = []
        for item in group:
            mapping[item.path.name] = new_rel
            cluster_names.append(item.path.name)
            if item.path != representative.path and item.path.exists():
                item.path.unlink()
                deleted_count += 1

        date_str = representative.date_str or "unknown"
        year = date_str.split("-")[0] if date_str != "unknown" else "unknown"
        month = date_str.split("-")[1] if date_str != "unknown" else "unknown"

        manifest.append(
            {
                "src": new_rel,
                "alt": f"Campus image {counter:03d}",
                "date": date_str,
                "year": year,
                "month": month,
                "orientation": orientation(representative.width, representative.height),
                "quality": quality_label(representative.width, representative.height),
                "width": representative.width,
                "height": representative.height,
                "category": next_category(counter - 1),
                "cluster_size": len(group),
                "source": representative.path.name,
            }
        )

        if len(group) > 1:
            duplicate_groups.append(
                {
                    "representative": representative.path.name,
                    "kept_as": new_rel,
                    "cluster_size": len(group),
                    "members": sorted(cluster_names),
                }
            )

        counter += 1

    # Rewrite old image references in HTML files.
    for html_path in ROOT.glob("*.html"):
        content = html_path.read_text(encoding="utf-8")
        updated = content
        for old_name, new_rel in mapping.items():
            updated = updated.replace(old_name, new_rel)
        if updated != content:
            html_path.write_text(updated, encoding="utf-8")

    report = {
        "processed_count": len(images),
        "kept_count": kept_count,
        "deleted_count": deleted_count,
        "duplicate_group_count": len(duplicate_groups),
        "duplicate_groups": duplicate_groups,
    }

    manifest.sort(key=lambda item: (item["date"], item["src"]))

    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    print(json.dumps({
        "processed": len(images),
        "kept": kept_count,
        "deleted": deleted_count,
        "duplicate_groups": len(duplicate_groups),
        "manifest": str(MANIFEST_PATH.relative_to(ROOT)).replace("\\", "/"),
    }, indent=2))


if __name__ == "__main__":
    run()
