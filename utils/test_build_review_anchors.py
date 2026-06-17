"""Tests for the completeness-anchor builder (segmentation + object enumeration).

Run: python3 -m pytest utils/test_build_review_anchors.py -q
These guard the two bugs we hit: structured abstracts collapsing to one sentence,
and text-rendered tables being invisible to the object enumerator.
"""

import importlib.util
from pathlib import Path

_spec = importlib.util.spec_from_file_location(
    "bra", Path(__file__).parent / "build_review_anchors.py"
)
bra = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(bra)


STRUCTURED = (
    "Background: Language discordance may worsen outcomes. "
    "Methods: We reviewed 1662 patients undergoing bariatric surgery. "
    "Results: EP patients visited the ED more than LEP patients (23% vs. 14%, p < 0.001). "
    "There was no difference in length of stay (IRR 0.94). "
    "Conclusions: Bariatric care can be delivered safely regardless of language proficiency."
)


def test_segment_structured_abstract_finds_sections():
    segs = bra.segment_abstract(STRUCTURED)
    assert segs is not None
    labels = [s[0] for s in segs]
    assert labels == ["Background", "Methods", "Results", "Conclusions"]


def test_result_sentences_keeps_only_results_and_conclusions():
    sents = bra.result_sentences(STRUCTURED)
    joined = " ".join(sents)
    # results + conclusions kept...
    assert any("ED more than LEP" in s for s in sents)
    assert any("length of stay" in s for s in sents)
    assert any("delivered safely" in s for s in sents)
    # ...background/methods dropped
    assert "may worsen outcomes" not in joined
    assert "We reviewed 1662" not in joined


def test_structured_abstract_splits_into_multiple_sentences():
    # regression: the splitter once collapsed the whole abstract to one sentence
    sents = bra.result_sentences(STRUCTURED)
    assert len(sents) >= 3


def test_unstructured_abstract_falls_back_to_result_cue():
    plain = (
        "We studied interpreter use in the emergency department. "
        "Professional interpreters were used in fewer than 4% of encounters. "
        "This is a methodological note with no numbers."
    )
    assert bra.segment_abstract(plain) is None
    sents = bra.result_sentences(plain)
    assert any("fewer than 4%" in s for s in sents)
    assert all("methodological note" not in s for s in sents)


def test_html_entities_decoded():
    sents = bra.result_sentences(STRUCTURED.replace("p < 0.001", "p &lt; 0.001"))
    assert any("p < 0.001" in s for s in sents)
    assert all("&lt;" not in s for s in sents)


def test_caption_regex_matches_tables_and_figures():
    cases = {
        "Table 1. Demographics and baseline characteristics": ("table", "1"),
        "Figure 2 Change in BMI at one year": ("figure", "2"),
        "Fig. 3: Study flow diagram": ("figure", "3"),
    }
    for line, (kind, num) in cases.items():
        m = bra.CAPTION.match(line)
        assert m, f"should match: {line}"
        got_kind = "figure" if m.group(1).lower().startswith("fig") else "table"
        assert (got_kind, m.group(2)) == (kind, num)


def test_caption_regex_ignores_inline_references():
    # an in-text reference is not a caption (doesn't start the line)
    assert bra.CAPTION.match("as shown in Table 1, the groups differed") is None
