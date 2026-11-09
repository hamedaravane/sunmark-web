"""Export responsive cinematic layers; preserve original PNG masters and exact alpha."""
from pathlib import Path
import json
import hashlib
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    'distant-world': 'Golden Dawn Over Misty Mountains (1).png',
    'royal-palace': 'Golden Persian Palace with Reflecting Pool.png',
    'garden-frame': 'Persian Garden Ornamental Frame.png',
    'character-ensemble': 'Sunmark Ensemble_ Golden Magic Unleashed.png',
}
manifest = ROOT / 'scripts/menu-exports.json'
if '--check' in sys.argv:
    data = json.loads(manifest.read_text())
    for asset in data['assets']:
        source = ROOT / asset['master']
        output_file = ROOT / 'public/assets' / asset['file']
        assert hashlib.sha256(source.read_bytes()).hexdigest() == asset['source_sha256']
        assert hashlib.sha256(output_file.read_bytes()).hexdigest() == asset['sha256']
        with Image.open(source) as original, Image.open(output_file) as decoded:
            assert list(decoded.size) == asset['size']
            if 'A' in original.getbands():
                expected = original.convert('RGBa').resize(decoded.size, Image.Resampling.LANCZOS).convert('RGBA')
                assert expected.getchannel('A').tobytes() == decoded.getchannel('A').tobytes()
    print('Cinematic exports verified: master hashes, delivery hashes, dimensions and alpha.')
    sys.exit(0)
masters = ROOT / 'art/reference/menu' 
output = ROOT / 'public/assets/menu'
masters.mkdir(parents=True, exist_ok=True)
output.mkdir(parents=True, exist_ok=True)
for name, original in SOURCES.items():
    source = masters / original
    uploaded = ROOT / 'public/assets' / original
    if not source.exists():
        uploaded.rename(source)
    with Image.open(source) as image:
        widths = [640, 1024, image.width]
        for width in widths:
            size = (width, round(width * image.height / image.width))
            # Premultiplied resampling prevents color fringes at translucent edges.
            variant = image.convert('RGBa').resize(size, Image.Resampling.LANCZOS).convert('RGBA') if image.mode == 'RGBA' else image.resize(size, Image.Resampling.LANCZOS)
            destination = output / f'{name}-{width}.webp'
            variant.save(destination, 'WEBP', quality=90, method=6, exact=True)
            with Image.open(destination) as decoded:
                assert decoded.size == variant.size
                if image.mode == 'RGBA':
                    assert decoded.getchannel('A').tobytes() == variant.getchannel('A').tobytes()
            print(f'{destination.name}: {destination.stat().st_size // 1024} KiB')

# The existing wordmark master stays in place; small screens avoid its 1.3 MiB export.
with Image.open(ROOT / 'public/assets/branding/sunmark-logo.webp') as image:
    for width in [640, 1024, 2172]:
        size = (width, round(width * image.height / image.width))
        variant = image.convert('RGBa').resize(size, Image.Resampling.LANCZOS).convert('RGBA')
        variant.save(output / f'wordmark-{width}.webp', 'WEBP', quality=90, method=6, exact=True)

entries = []
for stem, source in {**{k: masters / v for k, v in SOURCES.items()}, 'wordmark': ROOT / 'public/assets/branding/sunmark-logo.webp'}.items():
    for file in sorted(output.glob(stem + '-*.webp')):
        with Image.open(file) as image:
            size = list(image.size)
        entries.append({'file': str(file.relative_to(ROOT / 'public/assets')), 'size': size,
                        'master': str(source.relative_to(ROOT)),
                        'source_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                        'sha256': hashlib.sha256(file.read_bytes()).hexdigest()})
manifest.write_text(json.dumps({'version': 1, 'quality': 90, 'assets': entries}, indent=2) + '\n')
