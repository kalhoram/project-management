"""Persian text normalization for search and comparison."""

from __future__ import annotations

import re
import unicodedata

_ARABIC_YEH = "\u064a"
_PERSIAN_YEH = "\u06cc"
_ARABIC_KAF = "\u0643"
_PERSIAN_KAF = "\u06a9"
_ZWNJ = "\u200c"
_ZWSP = "\u200b"


def normalize_persian(text: str | None) -> str:
    if not text:
        return ""
    s = unicodedata.normalize("NFKC", text)
    s = s.replace(_ARABIC_YEH, _PERSIAN_YEH).replace(_ARABIC_KAF, _PERSIAN_KAF)
    s = s.replace(_ZWSP, "").replace("\u00a0", " ")
    s = s.replace(_ZWNJ, " ")
    s = re.sub(r"\s+", " ", s).strip()
    return s.casefold()


def contains_normalized(haystack: str | None, needle: str | None) -> bool:
    if not needle:
        return True
    return normalize_persian(needle) in normalize_persian(haystack)
