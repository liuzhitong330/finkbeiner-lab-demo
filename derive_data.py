#!/usr/bin/env python3
"""Derive the small public QC grid from the Finkbeiner Lab MIQ repository."""
import argparse
import csv
import importlib.util
import json
from pathlib import Path
import sys
import types

import numpy as np
from PIL import Image
from scipy import ndimage


def load_degrade_module(repo):
    package = types.ModuleType("microscopeimagequality")
    package.__path__ = []
    dataset_creation = types.ModuleType("microscopeimagequality.dataset_creation")
    package.dataset_creation = dataset_creation
    sys.modules["microscopeimagequality"] = package
    sys.modules["microscopeimagequality.dataset_creation"] = dataset_creation
    skimage = types.ModuleType("skimage")
    skimage_io = types.ModuleType("skimage.io")
    skimage.io = skimage_io
    sys.modules["skimage"] = skimage
    sys.modules["skimage.io"] = skimage_io
    path = repo / "microscopeimagequality" / "degrade.py"
    spec = importlib.util.spec_from_file_location("finkbeiner_miq_degrade", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def display_image(raw):
    low, high = np.percentile(raw, [1, 99.7])
    scaled = np.clip((raw - low) / max(high - low, 1e-12), 0, 1)
    return Image.fromarray(np.round(scaled * 255).astype(np.uint8))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--miq-repo", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parent)
    args = parser.parse_args()
    output = args.output
    assets = output / "assets"
    derived = output / "derived"
    assets.mkdir(exist_ok=True)
    derived.mkdir(exist_ok=True)

    degrade = load_degrade_module(args.miq_repo)
    source = args.miq_repo / "tests" / "data" / "cell_image.tiff"
    image = np.array(Image.open(source), dtype=np.float64) / 65535.0
    degrader = degrade.ImageDegrader(random_seed=0, photoelectron_factor=65535.0,
                                     sensor_offset_in_photoelectrons=100.0)
    z_offsets = [0, 1, 2, 3, 4, 6, 8]
    exposures = [25, 50, 100]
    blurred = {}
    for z in z_offsets:
        psf = degrade.get_airy_psf(21, 5e-6, z * 1e-6, 500e-9, 0.5, 1.0)
        blurred[z] = degrader.apply_blur_kernel(image, psf)

    rows = []
    conditions = {}
    for exposure in exposures:
        transformed = {z: degrader.set_exposure(blurred[z], exposure) for z in z_offsets}
        base = transformed[0]
        base_edge = np.mean(ndimage.sobel(base, 0) ** 2 + ndimage.sobel(base, 1) ** 2) / base.mean() ** 2
        for z in z_offsets:
            raw = transformed[z]
            edge = np.mean(ndimage.sobel(raw, 0) ** 2 + ndimage.sobel(raw, 1) ** 2) / raw.mean() ** 2
            focus = 100 * edge / base_edge
            saturation = 100 * np.mean(raw >= 0.98)
            p99 = 100 * np.percentile(raw, 99)
            name = f"z{z}_e{exposure}"
            display_image(raw).save(assets / f"{name}.png")
            record = {
                "z": z,
                "exposure": exposure,
                "focusRetention": round(float(focus), 2),
                "saturation": round(float(saturation), 3),
                "p99Intensity": round(float(p99), 2),
                "image": f"assets/{name}.png",
            }
            rows.append(record)
            conditions[name] = record

    with (derived / "conditions.csv").open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    payload = {
        "source": "finkbeiner-lab/microscopeimagequality",
        "commit": "4190ba36d7e672e7b430516b7c3a59c8294efe0b",
        "defaultZ": 4,
        "defaultExposure": 50,
        "zOffsets": z_offsets,
        "exposures": exposures,
        "conditions": conditions,
    }
    (output / "data.js").write_text("window.FINKBEINER_DEMO_DATA = " + json.dumps(payload, indent=2) + ";\n")


if __name__ == "__main__":
    main()
