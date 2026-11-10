"""Export verified WebP assets, with explicit lossless size variants for small avatars.

Requires Python 3 and Pillow >= 10.2 with WebP support. No network/API is used.
"""

import argparse
import hashlib
import json
import math
import shutil
from pathlib import Path

from PIL import Image, ImageChops, ImageStat, features
from importlib.util import spec_from_file_location, module_from_spec


ROOT = Path(__file__).resolve().parents[1]
MASTERS = ROOT / "art/reference"
RUNTIME = ROOT / "public/assets"
MANIFEST = Path(__file__).with_name("image-exports.json")
AUDIT_SPEC = spec_from_file_location("audit_assets", Path(__file__).with_name("audit-assets.py"))
AUDIT = module_from_spec(AUDIT_SPEC)
AUDIT_SPEC.loader.exec_module(AUDIT)


class QualityError(ValueError):
    """The export needs a higher quality profile."""


def verify(source, output, asset, minimum_psnr):
    with Image.open(output) as image:
        if image.format != "WEBP" or image.size != source.size:
            raise ValueError(f"Wrong format/dimensions: {output}")
        if image.info.get("icc_profile", b"") != source.info.get("icc_profile", b""):
            raise ValueError(f"Color profile changed: {output}")
        decoded = image.convert("RGBA")
    original = source.convert("RGBA")
    if original.getchannel("A").tobytes() != decoded.getchannel("A").tobytes():
        raise ValueError(f"Transparency changed: {output}")

    if asset.get("lossless") and decoded.tobytes() != original.tobytes():
        raise QualityError(f"Lossless pixels changed: {output}")
    frames = {"full": (0, 0, *source.size), **asset["frames"]}
    worst = math.inf
    for name, (x, y, width, height) in frames.items():
        if min(x, y) < 0 or min(width, height) <= 0 or x + width > source.width or y + height > source.height:
            raise ValueError(f"Invalid frame {name}: {asset['file']}")
        rect = (x, y, x + width, y + height)
        before, after = original.crop(rect), decoded.crop(rect)
        # A regression floor per used frame; human image review remains necessary.
        for color in ("#252b2d", "#eadfc6"):
            base = Image.new("RGBA", before.size, color)
            a = Image.alpha_composite(base, before).convert("RGB")
            b = Image.alpha_composite(base, after).convert("RGB")
            rms = ImageStat.Stat(ImageChops.difference(a, b)).rms
            mse = sum(channel * channel for channel in rms) / 3
            score = 10 * math.log10(255 * 255 / mse) if mse else math.inf
            worst = min(worst, score)
            if score < minimum_psnr:
                raise QualityError(f"{asset['file']} / {name}: {score:.2f} dB < {minimum_psnr} dB")
    return worst


def verify_display(master, output, asset):
    if not asset.get("display_size"):
        return
    size = tuple(asset["display_size"])
    before = master.convert("RGBA").resize(size, Image.Resampling.LANCZOS)
    with Image.open(output) as image:
        after = image.convert("RGBA").resize(size, Image.Resampling.LANCZOS)
    for color in ("#252b2d", "#eadfc6"):
        base = Image.new("RGBA", size, color)
        a = Image.alpha_composite(base, before).convert("RGB")
        b = Image.alpha_composite(base, after).convert("RGB")
        rms = ImageStat.Stat(ImageChops.difference(a, b)).rms
        mse = sum(channel * channel for channel in rms) / 3
        score = 10 * math.log10(255 * 255 / mse) if mse else math.inf
        if score < asset["minimum_display_psnr"]:
            raise QualityError(f"Display-size quality regression: {asset['file']}: {score:.2f} dB")


def export(source, output, asset, minimum_psnr):
    temporary = output.with_suffix(".webp.tmp")
    output.parent.mkdir(parents=True, exist_ok=True)
    try:
        profiles = ((100, True),) if asset.get("lossless") else ((95, False), (98, False), (100, False), (100, True))
        for quality, lossless in profiles:
            source.save(
                temporary, format="WEBP", quality=quality, method=6,
                lossless=lossless, exact=True,
                icc_profile=source.info.get("icc_profile", b""),
            )
            try:
                verify(source, temporary, asset, minimum_psnr)
            except QualityError:
                continue
            if temporary.stat().st_size >= (MASTERS / asset.get("source_file", str(Path(asset["file"]).with_suffix(".png")))).stat().st_size:
                raise ValueError(f"Export is not smaller than its master: {output}")
            packed = AUDIT.lossless_candidate(temporary)
            if len(packed) < temporary.stat().st_size:
                temporary.write_bytes(packed)
            verify(source, temporary, asset, minimum_psnr)
            temporary.replace(output)
            return "lossless" if lossless else f"q{quality}"
        raise QualityError(f"Could not meet quality floor: {output}")
    finally:
        temporary.unlink(missing_ok=True)


def main():
    manifest = json.loads(MANIFEST.read_text())
    if manifest["version"] != 1:
        raise SystemExit("Unsupported image export manifest version.")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="verify exports without writing")
    parser.add_argument("--group", choices=sorted({a["group"] for a in manifest["assets"]}))
    args = parser.parse_args()
    if not features.check("webp"):
        raise SystemExit("Pillow requires WebP support for these exports.")

    before_total = after_total = 0
    for asset in manifest["assets"]:
        if args.group and asset["group"] != args.group:
            continue
        master = MASTERS / asset.get("source_file", str(Path(asset["file"]).with_suffix(".png")))
        output = RUNTIME / asset["file"]
        if hashlib.sha256(master.read_bytes()).hexdigest() != asset["source_sha256"]:
            raise ValueError(f"Master hash changed; review and update the manifest: {master}")
        with Image.open(master) as source:
            if source.mode not in ("RGB", "RGBA") or list(source.size) != asset["size"]:
                raise ValueError(f"Unexpected master format/dimensions: {master}")
            display_master = source.copy() if asset.get("display_size") else None
            if asset.get("output_size"):
                if asset.get("preserve_encoded") or not asset.get("lossless"):
                    raise ValueError(f"Size variants must be explicit lossless exports: {master}")
                target = tuple(asset["output_size"])
                if len(target) != 2 or min(target) <= 0 or target[0] > source.width or target[1] > source.height:
                    raise ValueError(f"Invalid output dimensions: {master}")
                source = source.resize(target, Image.Resampling.LANCZOS)
            if asset.get("preserve_encoded"):
                if source.format != "WEBP":
                    raise ValueError(f"Expected a supplied WebP master: {master}")
                if not args.check:
                    output.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copyfile(master, output)
                if output.read_bytes() != master.read_bytes():
                    raise ValueError(f"Supplied encoding changed: {output}")
                profile = "supplied WebP; byte-identical"
            else:
                profile = "checked" if args.check else export(source, output, asset, manifest["minimum_psnr"])
            score = verify(source, output, asset, manifest["minimum_psnr"])
            if display_master is not None:
                verify_display(display_master, output, asset)
        before, after = master.stat().st_size, output.stat().st_size
        if not asset.get("preserve_encoded") and after >= before:
            raise ValueError(f"Export is not smaller than its master: {output}")
        before_total += before
        after_total += after
        print(f"{asset['file']}: {before:,} -> {after:,} bytes; {profile}; alpha exact; PSNR >= {score:.2f} dB", flush=True)

    if not args.group:
        # Retired paintings remain checked masters, never regenerated into public/.
        for asset in manifest.get("references", []):
            master = MASTERS / asset.get("source_file", str(Path(asset["file"]).with_suffix(".png")))
            if hashlib.sha256(master.read_bytes()).hexdigest() != asset["source_sha256"]:
                raise ValueError(f"Preserved master hash changed: {master}")
            with Image.open(master) as source:
                if list(source.size) != asset["size"]:
                    raise ValueError(f"Preserved master dimensions changed: {master}")
        actual = {p.relative_to(RUNTIME).as_posix() for p in RUNTIME.rglob("*") if p.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp", ".avif")}
        menu = json.loads((ROOT / "scripts/menu-exports.json").read_text())
        expected = {a["file"] for a in manifest["assets"] + menu["assets"]}
        if actual != expected:
            raise ValueError(f"Runtime image inventory differs from manifest: {actual ^ expected}")
    print(f"Total: {before_total:,} -> {after_total:,} bytes ({100 * (1 - after_total / before_total):.1f}% smaller)")


if __name__ == "__main__":
    main()
