# Derived medicine-name index

This directory is generated from `DATA/indian_medicine_data.csv` in
<https://github.com/junioralive/Indian-Medicine-Dataset> at commit
`7c06a889dc949d3b6a9be28c448f4aa1e7a2848f`.

Run:

```sh
node scripts/build-medicine-index.mjs /path/to/indian_medicine_data.csv \
  supabase/functions/ocr-prescription/catalog
```

Only unique, non-discontinued product names are retained. Files are split by
their normalized two-character prefix and gzip-compressed so one OCR request
loads only a small candidate shard. This catalogue is a spelling aid, not a
source of prescribing, dosage, scheduling, or availability advice.

The upstream MIT license is reproduced in `LICENSE`.
