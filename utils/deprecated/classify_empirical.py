#!/usr/bin/env python3
"""
Classify papers based on their abstracts to determine if they contain
original empirical findings. Systematic reviews count as empirical,
but narrative reviews and perspectives do not.
"""

import os
import re
import yaml
from pathlib import Path
from typing import Dict, Optional, Tuple
import anthropic


def extract_frontmatter_and_content(file_path: Path) -> Tuple[Optional[Dict], Optional[str], Optional[str]]:
    """
    Extract YAML frontmatter and remaining content from a markdown file.
    Returns (frontmatter_dict, frontmatter_text, remaining_content).
    """
    content = file_path.read_text(encoding='utf-8')
    match = re.match(r'^---\s*\n(.*?)\n---\s*\n(.*)', content, re.DOTALL)
    if match:
        try:
            frontmatter_text = match.group(1)
            remaining_content = match.group(2)
            frontmatter_dict = yaml.safe_load(frontmatter_text)
            return frontmatter_dict, frontmatter_text, remaining_content
        except yaml.YAMLError as e:
            print(f"  Error parsing YAML: {e}")
            return None, None, None
    return None, None, None


def classify_abstract(abstract: str, title: str = "") -> Tuple[bool, str]:
    """
    Classify whether a paper has original empirical findings based on its abstract.

    Returns:
        (has_empirical_findings, reasoning)
    """
    # Use Claude API to classify
    client = anthropic.Anthropic()

    prompt = f"""Based on the following paper title and abstract, determine if this paper contains ORIGINAL EMPIRICAL FINDINGS.

Papers WITH original empirical findings include:
- Original research studies with data collection and analysis
- Systematic reviews and meta-analyses (these synthesize empirical findings)
- Clinical trials, cohort studies, case-control studies
- Survey research with original data
- Qualitative research with original data collection

Papers WITHOUT original empirical findings include:
- Narrative reviews and literature reviews (non-systematic)
- Opinion pieces, commentaries, perspectives
- Editorials
- Case reports or case series (single/few cases without systematic analysis)
- Theoretical papers
- Method papers without empirical application

Title: {title}

Abstract: {abstract}

Respond with ONLY "YES" or "NO" followed by a brief reason (one sentence).
Format: YES/NO: [reason]"""

    try:
        message = client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=100,
            messages=[{"role": "user", "content": prompt}]
        )

        response = message.content[0].text.strip()

        # Parse response
        if response.upper().startswith("YES"):
            return True, response
        elif response.upper().startswith("NO"):
            return False, response
        else:
            # Fallback: try to determine from response
            return "yes" in response.lower()[:10], response

    except Exception as e:
        print(f"  Error calling API: {e}")
        # Fallback to heuristic classification
        return classify_heuristic(abstract, title)


def classify_heuristic(abstract: str, title: str = "") -> Tuple[bool, str]:
    """
    Fallback heuristic-based classification.
    """
    abstract_lower = abstract.lower()
    title_lower = title.lower()

    # Strong indicators of NON-empirical work (check first, these override)
    non_empirical_indicators = [
        r'\bcase report\b',
        r'\bperspective\s*(on|piece)?\b',
        r'\bcommentary\b',
        r'\beditorial\b',
        r'\bnarrative review\b',
        r'\bliterature review\b(?!.*systematic)',
        r'\bopinion\b',
    ]

    # Check for non-empirical indicators
    for pattern in non_empirical_indicators:
        if re.search(pattern, abstract_lower) or re.search(pattern, title_lower):
            return False, "Heuristic: Contains non-empirical indicators"

    # Strong indicators of empirical research
    empirical_indicators = [
        # Sample size mentions
        (r'\b\d+\s+(participants|subjects|patients|respondents|individuals|facilities|sites|hospitals|clinics)\b', 2),
        (r'\bn\s*=\s*\d+', 2),
        (r'\bsample\s+size\b.*\d+', 2),
        (r'\b\d+\s+of\s+\d+.*responded', 2),
        (r'\bresponse rate\b', 1),

        # Study types
        (r'\bsystematic review\b', 3),
        (r'\bmeta-analysis\b', 3),
        (r'\bcohort study\b', 2),
        (r'\brandomized\b.*\btrial\b', 3),
        (r'\bcross-sectional\b.*\b(study|analysis)\b', 2),
        (r'\bcase-control\b', 2),
        (r'\bretrospective\b.*\b(study|analysis)\b', 2),
        (r'\bprospective\b.*\b(study|analysis)\b', 2),
        (r'\blongitudinal\b.*\b(study|analysis)\b', 2),
        (r'\bethnograph(y|ic)\b', 2),
        (r'\bfieldwork\b', 2),
        (r'\b(following|observing)\b.*\bpatients\b', 1),

        # Methods sections
        (r'\bmethods:\s*\w+', 1),
        (r'\bdesign:\s*\w+', 1),
        (r'\bdata\s+were\s+(collected|analyzed|obtained)\b', 1),
        (r'\bwe\s+(conducted|performed|analyzed|examined)\b', 1),

        # Analysis mentions
        (r'\bmultivariate\b.*\b(analysis|regression)\b', 2),
        (r'\bstatistical\b.*\banalysis\b', 1),
        (r'\b(interviews?|surveys?|questionnaires?)\s+(were|was)\s+(conducted|delivered|administered)\b', 2),
        (r'\bonline\s+(survey|questionnaire)\b', 2),
        (r'\bqualitative\b.*\b(study|analysis|research)\b', 2),
        (r'\bthematic\b.*\b(analysis|coding)\b', 2),

        # Results section
        (r'\bresults:\s*\w+', 1),
        (r'\b(odds ratio|relative risk|hazard ratio|confidence interval)\b', 1),
    ]

    # Calculate empirical score
    empirical_score = 0
    for pattern, weight in empirical_indicators:
        if re.search(pattern, abstract_lower):
            empirical_score += weight

    # Classification logic
    if empirical_score >= 3:
        return True, f"Heuristic: Strong empirical indicators (score={empirical_score})"
    elif empirical_score >= 1:
        return True, f"Heuristic: Moderate empirical indicators (score={empirical_score})"
    else:
        return False, "Heuristic: Insufficient empirical indicators"


def update_yaml_frontmatter(file_path: Path, new_key: str, new_value: any) -> bool:
    """
    Update a YAML frontmatter field in a markdown file.
    """
    frontmatter_dict, frontmatter_text, remaining_content = extract_frontmatter_and_content(file_path)

    if frontmatter_dict is None:
        return False

    # Add/update the new field
    frontmatter_dict[new_key] = new_value

    # Convert back to YAML
    new_frontmatter = yaml.dump(frontmatter_dict, default_flow_style=False, allow_unicode=True)

    # Reconstruct the file
    new_content = f"---\n{new_frontmatter}---\n{remaining_content}"

    # Write back to file
    file_path.write_text(new_content, encoding='utf-8')
    return True


def process_paper(paper_file: Path, dry_run: bool = False, reclassify_non_empirical: bool = False) -> Tuple[Optional[bool], Optional[str]]:
    """
    Process a single paper: classify it and optionally update the YAML.
    Returns (has_empirical_findings, reasoning).
    """
    frontmatter, _, _ = extract_frontmatter_and_content(paper_file)

    if not frontmatter:
        return None, "No frontmatter found"

    # Check if already classified
    if 'has_empirical_findings' in frontmatter:
        # If reclassify_non_empirical is True, only reclassify papers marked as non-empirical
        if reclassify_non_empirical:
            if frontmatter['has_empirical_findings']:
                return frontmatter['has_empirical_findings'], "Already empirical (skipped)"
            # Otherwise, continue to reclassify non-empirical papers
        elif not dry_run:
            return frontmatter['has_empirical_findings'], "Already classified"

    abstract = frontmatter.get('abstract', '')
    title = frontmatter.get('title', '')

    if not abstract or not abstract.strip():
        return None, "No abstract found"

    # Classify
    has_empirical, reasoning = classify_abstract(abstract, title)

    # Update YAML if not dry run
    if not dry_run:
        success = update_yaml_frontmatter(paper_file, 'has_empirical_findings', has_empirical)
        if not success:
            return None, "Failed to update YAML"

    return has_empirical, reasoning


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Classify papers by empirical content')
    parser.add_argument('--dry-run', action='store_true', help='Preview classifications without updating files')
    parser.add_argument('--limit', type=int, default=None, help='Limit number of papers to process')
    parser.add_argument('--sample', type=int, default=None, help='Process a random sample of N papers')
    parser.add_argument('--reclassify-non-empirical', action='store_true', help='Reclassify papers previously marked as non-empirical using LLM')
    args = parser.parse_args()

    # Setup paths
    project_root = Path(__file__).parent.parent
    discourse_dir = project_root / 'Discourse Graph'

    # Get all paper files
    paper_files = sorted(discourse_dir.glob('@*.md'))

    if args.sample:
        import random
        paper_files = random.sample(paper_files, min(args.sample, len(paper_files)))
    elif args.limit:
        paper_files = paper_files[:args.limit]

    print(f"Processing {len(paper_files)} paper files")
    if args.dry_run:
        print("DRY RUN - No files will be modified")
    print()

    # Process papers
    stats = {
        'total': 0,
        'empirical': 0,
        'non_empirical': 0,
        'already_classified': 0,
        'no_abstract': 0,
        'failed': 0
    }

    for i, paper_file in enumerate(paper_files, 1):
        print(f"[{i}/{len(paper_files)}] {paper_file.name}")

        stats['total'] += 1

        try:
            has_empirical, reasoning = process_paper(paper_file, dry_run=args.dry_run,
                                                     reclassify_non_empirical=args.reclassify_non_empirical)

            if reasoning == "Already classified" or reasoning == "Already empirical (skipped)":
                stats['already_classified'] += 1
                print(f"  ✓ {reasoning}: {has_empirical}")
            elif reasoning == "No abstract found":
                stats['no_abstract'] += 1
                print(f"  ⊘ No abstract")
            elif has_empirical is None:
                stats['failed'] += 1
                print(f"  ✗ Failed: {reasoning}")
            elif has_empirical:
                stats['empirical'] += 1
                print(f"  ✓ EMPIRICAL: {reasoning}")
            else:
                stats['non_empirical'] += 1
                print(f"  ⊘ NON-EMPIRICAL: {reasoning}")

        except Exception as e:
            stats['failed'] += 1
            print(f"  ✗ Error: {e}")

    # Print summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    print(f"Total papers processed: {stats['total']}")
    print(f"Papers with empirical findings: {stats['empirical']}")
    print(f"Papers without empirical findings: {stats['non_empirical']}")
    print(f"Already classified: {stats['already_classified']}")
    print(f"No abstract: {stats['no_abstract']}")
    print(f"Failed: {stats['failed']}")


if __name__ == '__main__':
    main()
