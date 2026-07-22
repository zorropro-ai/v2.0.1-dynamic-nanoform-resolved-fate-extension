# K-NanoMFA v1.2.1 Manual Addendum

The v1.2 Word manual remains applicable to the interface and scientific modules. Version 1.2.1 is a maintenance release. The corrected behaviors are listed in `CHANGELOG.md`.

Two accounting clarifications apply:

- Negative annual growth values are supported from −100% upward.
- When an initial landfill stock is entered, dynamic closure uses cumulative primary input plus that opening stock as the accounted input.

The dynamic CSV and audit JSON include `opening_technosphere_stock_kg` and `cumulative_accounted_input_kg`.
