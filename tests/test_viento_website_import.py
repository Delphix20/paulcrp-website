import importlib.util
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from PIL import Image


script = Path(__file__).resolve().parents[1] / "scripts" / "import-viento-website-screenshots.py"
spec = importlib.util.spec_from_file_location("viento_importer", script)
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


class WebsiteImportTests(unittest.TestCase):
    def setUp(self):
        self.temporary = TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.source = Path(self.temporary.name) / "source"
        self.root = Path(self.temporary.name) / "site"
        self.assets = self.root / "images" / "viento"
        self.source.mkdir()
        self.assets.mkdir(parents=True)
        (self.assets / "conditions-800.webp").write_bytes(b"unchanged conditions")
        (self.assets / "daily-800.webp").write_bytes(b"original daily")

    def create_batch(self, size=(1206, 2622)):
        for name in importer.PAGES.values():
            for appearance, value in (("Dark", 18), ("Light", 231)):
                Image.new("RGB", size, (value, value, value)).save(
                    self.source / f"EN_US_Web_{name}_{appearance}.png"
                )

    def test_missing_files_leave_existing_assets_intact(self):
        with self.assertRaisesRegex(ValueError, "Missing screenshots"):
            importer.import_screenshots(self.source, self.root)
        self.assertEqual((self.assets / "daily-800.webp").read_bytes(), b"original daily")
        self.assertEqual(len(list(self.assets.iterdir())), 2)

    def test_wrong_resolution_leaves_existing_assets_intact(self):
        self.create_batch((40, 80))
        with self.assertRaisesRegex(ValueError, "expected 1206 x 2622"):
            importer.import_screenshots(self.source, self.root)
        self.assertEqual((self.assets / "daily-800.webp").read_bytes(), b"original daily")
        self.assertEqual(len(list(self.assets.iterdir())), 2)

    def test_complete_batch_enables_all_modes_without_modifying_sources(self):
        self.create_batch()
        before = {p.name: p.read_bytes() for p in self.source.iterdir()}
        self.assertEqual(importer.import_screenshots(self.source, self.root), 14)
        manifest = (self.root / "assets" / "js" / "viento-previews.js").read_text()
        catalog = json.loads(manifest.split("window.VientoPreviewAssets = ", 1)[1].rstrip(";\n"))
        self.assertEqual(set(catalog), set(importer.PAGES))
        for modes in catalog.values():
            self.assertEqual(set(modes), {"dark", "light"})
            for mode, stem in modes.items():
                for width in (480, 800):
                    with Image.open(self.assets / f"{stem}-{width}.webp") as image:
                        self.assertEqual(image.size, (width, round(2622 * width / 1206)))
                        self.assertEqual(image.mode, "RGB")
                        expected = 18 if mode == "dark" else 231
                        self.assertAlmostEqual(image.getpixel((0, 0))[0], expected, delta=2)
        for page in ("daily", "places"):
            for width in (480, 800):
                self.assertEqual(
                    (self.assets / f"{page}-{width}.webp").read_bytes(),
                    (self.assets / f"{page}-dark-{width}.webp").read_bytes(),
                )
        self.assertEqual((self.assets / "conditions-800.webp").read_bytes(), b"unchanged conditions")
        self.assertEqual(before, {p.name: p.read_bytes() for p in self.source.iterdir()})


if __name__ == "__main__":
    unittest.main()
