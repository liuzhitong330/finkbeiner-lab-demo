# Provenance and value brief

## Recipient-value brief

- **Lab decision:** Which acquired images should proceed to longitudinal tracking, which need manual review, and which should be reacquired?
- **Useful output:** A threshold-sensitive 21-condition QC matrix with a reason for each flag.
- **Added contribution:** Re-runs the lab's own optical degradation code across a joint defocus/exposure grid and derives auditable focus-retention and saturation measurements.
- **Capability shown:** A working, auditable imaging-QC analysis that connects acquisition parameters to downstream review decisions.
- **Next action:** Replace the public test image and descriptive metrics with plate images, MIQ class probabilities, patch certainty, and acquisition metadata.

## Data and code provenance

- Repository: <https://github.com/finkbeiner-lab/microscopeimagequality>
- Pinned commit: `4190ba36d7e672e7b430516b7c3a59c8294efe0b`
- License: Apache License 2.0.
- Source image: `tests/data/cell_image.tiff`; repository notes say test images are modified from BBBC006v1 and used with permission.
- Executed code: `get_airy_psf`, `ImageDegrader.apply_blur_kernel`, and `ImageDegrader.set_exposure` from `microscopeimagequality/degrade.py`.
- Parameters: z = 0, 1, 2, 3, 4, 6, 8 µm; exposure factor = 25, 50, 100; 21-pixel PSF over 5 µm; wavelength 500 nm; NA 0.5; refractive index 1.0; 16-bit photoelectron factor 65,535; sensor offset 100.
- Derived fields: normalized Sobel edge energy relative to z=0 at the same exposure; raw saturated-pixel fraction at ≥0.98; raw 99th-percentile intensity.
- Reproduction: `python3 derive_data.py --miq-repo /path/to/microscopeimagequality`.

## Checked outputs

- At 50× exposure, 4 µm defocus retains 50.52% of the z=0 normalized edge energy.
- At 50× exposure, 8 µm defocus retains 35.92%.
- At 100× exposure, the z=0 condition has 1.65% saturated pixels.
- Default gate (focus ≥60%; saturation ≤1%) keeps 6 of 21 conditions.

## Limits

- This is a deterministic optical/exposure stress test of one public test image, not patient-derived neural-cell data.
- Display PNGs are contrast-stretched separately; all metrics use the un-stretched transformed arrays.
- The archived TensorFlow MIQ classifier was not executed. The normalized edge metric is descriptive and not a replacement for the published 11-class model or lab validation.
- The gate thresholds are examples for sensitivity analysis, not recommended operating specifications.
