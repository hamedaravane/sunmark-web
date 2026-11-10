"""Inventory repository media; optionally recompress shipped/documentation images losslessly.

Source masters, generated build/dependency output and browser captures are excluded
from mutation. PNG/WebP candidates must preserve every decoded RGBA pixel and ICC
profile, and replace an existing file only if smaller. No resampling or lossy pass.
"""
import argparse
import io
import json
from pathlib import Path
import struct
import xml.etree.ElementTree as ET
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
EXTENSIONS = {'.png', '.webp', '.jpg', '.jpeg', '.avif', '.gif', '.svg', '.woff', '.woff2', '.ttf', '.otf', '.mp3', '.wav', '.ogg', '.mp4', '.webm'}
EXCLUDED = {'.git', '.agents', 'node_modules', 'dist', 'output', '.playwright-cli', 'coverage', '__pycache__'}


def lossless_candidate(path):
    with Image.open(path) as source:
        if getattr(source, 'n_frames', 1) != 1:
            return path.read_bytes()  # Never flatten animation.
        before = source.convert('RGBA').tobytes()
        profile = source.info.get('icc_profile', b'')
        candidate = io.BytesIO()
        if source.format == 'PNG':
            source.save(candidate, format='PNG', optimize=True, compress_level=9, icc_profile=profile)
        else:
            source.save(candidate, format='WEBP', lossless=True, exact=True, quality=100, method=6, icc_profile=profile)
        data = candidate.getvalue()
        with Image.open(io.BytesIO(data)) as decoded:
            if decoded.size != source.size or decoded.convert('RGBA').tobytes() != before:
                raise ValueError(f'Lossless pixels changed: {path}')
            if decoded.info.get('icc_profile', b'') != profile:
                raise ValueError(f'Color profile changed: {path}')
        return data


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--optimize-lossless', action='store_true')
    parser.add_argument('--json', type=Path)
    args = parser.parse_args()
    rows = []
    for path in sorted(ROOT.rglob('*')):
        relative = path.relative_to(ROOT)
        if not path.is_file() or EXCLUDED.intersection(relative.parts) or path.suffix.lower() not in EXTENSIONS:
            continue
        group = 'source' if relative.parts[:2] == ('art', 'reference') else relative.parts[0]
        row = {'file': relative.as_posix(), 'group': group, 'bytes_before': path.stat().st_size}
        suffix = path.suffix.lower()
        if suffix == '.svg':
            ET.parse(path)
        elif suffix == '.woff2':
            data = path.read_bytes()
            if data[:4] != b'wOF2' or struct.unpack('>I', data[8:12])[0] != len(data):
                raise ValueError(f'Invalid WOFF2 header/length: {path}')
        elif suffix in {'.png', '.webp', '.jpg', '.jpeg', '.gif', '.avif'}:
            with Image.open(path) as image:
                image.load()
                row.update(width=image.width, height=image.height, rgba_bytes=image.width * image.height * 4)
            if args.optimize_lossless and group in {'public', 'docs'} and suffix in {'.png', '.webp'}:
                candidate = lossless_candidate(path)
                if len(candidate) < path.stat().st_size:
                    temporary = path.with_suffix(path.suffix + '.tmp')
                    temporary.write_bytes(candidate)
                    temporary.replace(path)
        row['bytes_after'] = path.stat().st_size
        rows.append(row)
        print(f"{row['file']}: {row['bytes_before']:,} -> {row['bytes_after']:,} bytes", flush=True)
    if args.json:
        args.json.write_text(json.dumps(rows, indent=2) + '\n')
    print(f"{len(rows)} assets validated; {sum(r['bytes_before'] - r['bytes_after'] for r in rows):,} bytes saved")


if __name__ == '__main__':
    main()
