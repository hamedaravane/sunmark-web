"""Failure-path checks for the asset quality gates (standard-library unittest)."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from PIL import Image

SPEC = importlib.util.spec_from_file_location('image_exports', Path(__file__).with_name('optimize-images.py'))
EXPORTS = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(EXPORTS)


class QualityGates(unittest.TestCase):
    def test_lossless_transcoding_preserves_transparent_pixel_colors(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'test.png'
            image = Image.new('RGBA', (8, 8), (75, 125, 200, 0))
            image.putpixel((3, 3), (200, 30, 10, 128))
            image.save(path)
            data = EXPORTS.AUDIT.lossless_candidate(path)
            path.write_bytes(data)
            with Image.open(path) as result:
                self.assertEqual(result.convert('RGBA').tobytes(), image.tobytes())

    def test_wrong_dimensions_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'bad.webp'
            Image.new('RGBA', (4, 4), 'red').save(path, lossless=True)
            with self.assertRaisesRegex(ValueError, 'dimensions'):
                EXPORTS.verify(Image.new('RGBA', (8, 8), 'red'), path, {'file': 'bad', 'frames': {}}, 38)

    def test_color_corruption_is_rejected_for_lossless_exports(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'bad.webp'
            Image.new('RGBA', (8, 8), 'blue').save(path, lossless=True)
            with self.assertRaisesRegex(EXPORTS.QualityError, 'Lossless pixels'):
                EXPORTS.verify(Image.new('RGBA', (8, 8), 'red'), path, {'file': 'bad', 'frames': {}, 'lossless': True}, 38)

    def test_bad_display_derivative_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'bad.webp'
            Image.new('RGBA', (8, 8), 'blue').save(path, lossless=True)
            with self.assertRaisesRegex(EXPORTS.QualityError, 'Display-size'):
                EXPORTS.verify_display(Image.new('RGBA', (16, 16), 'red'), path, {'file': 'bad', 'display_size': [8, 8], 'minimum_display_psnr': 45})


if __name__ == '__main__':
    unittest.main()
