# Q3 human-label instructions

`data/hand_label_sample_BLANK.csv` holds 50 real reviews (stratified by star
rating: 14×1★, 12×2★, 8×3★, 8×4★, 8×5★), sampled deterministically from
`data/processed/reviews_clean_real.csv`. It carries no automated theme
assignment — the labeller never sees what `src/real/taxonomy_real.py` would
have picked, so this is a genuinely blind validation, not a check for
agreement with a visible answer.

## What to do

1. Copy the file, keeping the blank one as the untouched original:
   ```
   cp data/hand_label_sample_BLANK.csv data/hand_label_sample.csv
   ```
2. For each of the 50 rows, read `review_title` + `review_text` and decide
   which single friction theme it primarily expresses, using the codebook
   below. Write that theme's exact id into the `hand_label` column.
3. If a row expresses no theme below, or only mentions a topic positively
   (e.g. "no odor at all" is not an odor complaint), label it `none`.
4. Use `labeller_note` for anything ambiguous - a row that could plausibly
   take two labels, sarcasm, mixed sentiment, etc. This is read by anyone
   auditing the validation later; it is not scored.
5. Do not consult `src/real/taxonomy_real.py`'s output, `taxonomy_themes_real.json`,
   or `review_themes_real.csv` while labeling. Looking at the automated
   assignment before judging a row defeats the purpose of the validation.
6. Save the file. Re-run the pipeline (`python3 src/real/taxonomy_real.py`,
   or the full `bash run_pipeline.sh --analysis-only`) - it detects the
   completed file automatically and computes agreement metrics. Nothing
   else needs to change.

## Codebook (the same six theme definitions the automated classifier uses -
`THEMES` in `src/real/taxonomy_real.py`)

| id | name | typical language |
|---|---|---|
| `reliability` | Reliability / stopped working | "stopped working", "died", "broke", "malfunction", "quit working" |
| `value_effectiveness` | Perceived value / does it actually clean the air | "waste of money", "ineffective", "no difference", "still dusty", "worthless" |
| `customer_service` | Customer service / returns / warranty | "refund", "return window", "sent it back", "warranty", "replacement unit" |
| `filter_cost` | Filter cost / replacement | "replacement filter", "expensive filter", "filter cost" |
| `noise` | Noise / motor sound | "loud", "noisy", "whine", "buzzing", "rattling" |
| `ozone_odor_safety` | Ozone / smell / irritation | "ozone", "smell", "odor", "burning smell", "irritation" |
| `none` | No friction theme present | topic mentioned neutrally/positively, or no relevant complaint |

The automated classifier only counts a keyword when it appears in a
**negative-polarity sentence** - a review that says "great at eliminating
odors" is not an odor complaint. Apply the same judgment: label by the
complaint actually being made, not by topic keywords alone.

## What happens with your labels

`src/real/taxonomy_real.py` compares your `hand_label` against the
classifier's own assignment for the same 50 `review_id`s and reports, in
`data/processed/taxonomy_themes_real.json`'s `validation` block:

- overall raw agreement
- per-theme precision and recall (your label as ground truth)
- a full confusion matrix
- the share of rows you labeled `none` that the classifier didn't, and
  vice versa (its own "unclassifiable" disagreement)

Until `data/hand_label_sample.csv` exists with at least one non-blank
`hand_label`, Q3 validation stays `HUMAN_ACTION_REQUIRED` - reported
honestly as blocked, never silently skipped or substituted.
