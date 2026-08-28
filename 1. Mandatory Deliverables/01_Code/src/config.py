"""Shared constants for the real Air Purification analysis pipeline
(src/real/) - the category label, business unit, random seed, and retrieval
timestamp that multiple real/ modules stamp onto their real, computed output.
Every other value in the real pipeline is derived from real evidence, not
configured here.

The synthetic fixture demo preserved under tests/synthetic_fixtures/ (see its
README.md) has its own, separate config module
(tests/synthetic_fixtures/src/config_SYNTHETIC_TEST_FIXTURE.py) - it is never
imported here and never contributes to this module.
"""

RANDOM_STATE = 42    # every analysis-stage sample / shuffle
CATEGORY = "Air Purification"
BUSINESS_UNIT = "Versuni - Home Air"
RETRIEVAL_TS = "2026-08-26T09:00:00+02:00"
