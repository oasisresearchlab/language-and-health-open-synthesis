#!/usr/bin/env python3
"""
Extract empirical results from paper abstracts and tag with relevant variables.
"""

import os
import re
import yaml
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import anthropic


# Variables from Variables.md
FACTORS = [
    "limited english proficiency",
    "lep",
    "interpretation services",
    "interpreter",
    "bilingual provider",
    "language concordance",
    "language discordance",
]

OUTCOMES = [
    "diagnosis accuracy",
    "diagnostic accuracy",
    "accurate diagnosis",
    "malpractice",
    "recurrence",
    "hospital stay",
    "length of stay",
    "los",
    "treatment adherence",
    "medication adherence",
    "adherence",
    "trust",
    "physician trust",
    "empowerment",
    "time",
    "effort",
    "physician time",
]


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


def extract_results_with_llm(abstract: str, client: anthropic.Anthropic) -> List[str]:
    """Use LLM to extract empirical results from abstract."""

    prompt = f"""Extract ONLY the empirical results/findings from the following research abstract.

DO NOT include:
- Background/objectives
- Methods/design
- Conclusions/implications
- Interpretations or discussion

DO include:
- Specific quantitative results (e.g., percentages, counts, statistical measures)
- Specific qualitative findings
- Comparisons between groups
- Observed patterns or relationships

Format your response as a numbered list, with each result on its own line. Each result should be a complete, standalone sentence.

Abstract:
{abstract}

Empirical results:"""

    try:
        message = client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )

        response = message.content[0].text.strip()

        # Parse the numbered list
        findings = []
        for line in response.split('\n'):
            line = line.strip()
            # Remove numbering (e.g., "1. ", "1) ", etc.)
            line = re.sub(r'^\d+[\.\)]\s*', '', line)
            # Remove bullet points
            line = re.sub(r'^[-\*]\s*', '', line)

            if line and len(line) > 30:
                findings.append(line)

        return findings

    except Exception as e:
        print(f"    Error calling LLM: {e}")
        return []


def extract_results_fallback(abstract: str) -> List[str]:
    """Fallback: Try to extract results section with regex."""
    if not abstract:
        return []

    abstract_text = abstract if isinstance(abstract, str) else str(abstract)

    # Look for Results section
    patterns = [
        r'\b(Results?|Findings?)\s*:\s*(.+?)(?=\b(?:Conclusion|Discussion|Implications|Methods?|Background|Objective|$))',
    ]

    for pattern in patterns:
        match = re.search(pattern, abstract_text, re.IGNORECASE | re.DOTALL)
        if match:
            results_text = match.group(2).strip()
            # Split by sentence boundaries
            sentences = re.split(r'(?<=[.!?])\s+', results_text)
            # Filter out very short sentences
            findings = [s.strip() for s in sentences if len(s.strip()) > 30]
            return findings

    return []


def detect_variables(text: str) -> Tuple[List[str], List[str]]:
    """Detect which factors and outcomes are mentioned in the text."""
    text_lower = text.lower()

    detected_factors = []
    detected_outcomes = []

    # Check for factors
    for factor in FACTORS:
        if factor.lower() in text_lower:
            # Normalize factor names
            if factor.lower() in ['lep', 'limited english proficiency']:
                normalized = "Limited English Proficiency (LEP)"
            elif factor.lower() in ['interpretation services', 'interpreter']:
                normalized = "Interpretation services"
            elif factor.lower() == 'bilingual provider':
                normalized = "Bilingual provider"
            elif factor.lower() == 'language concordance':
                normalized = "Language concordance"
            elif factor.lower() == 'language discordance':
                normalized = "Language discordance"
            else:
                normalized = factor.title()

            if normalized not in detected_factors:
                detected_factors.append(normalized)

    # Check for outcomes
    for outcome in OUTCOMES:
        if outcome.lower() in text_lower:
            # Normalize outcome names
            if outcome.lower() in ['diagnosis accuracy', 'diagnostic accuracy', 'accurate diagnosis']:
                normalized = "Diagnosis accuracy"
            elif outcome.lower() == 'malpractice':
                normalized = "Malpractice case"
            elif outcome.lower() == 'recurrence':
                normalized = "Likelihood of recurrence"
            elif outcome.lower() in ['hospital stay', 'length of stay', 'los']:
                normalized = "Hospital stay length"
            elif outcome.lower() in ['treatment adherence', 'medication adherence', 'adherence']:
                normalized = "Treatment adherence"
            elif outcome.lower() in ['trust', 'physician trust']:
                normalized = "Physician trust"
            elif outcome.lower() == 'empowerment':
                normalized = "Sense of empowerment"
            elif outcome.lower() in ['time', 'effort', 'physician time']:
                normalized = "Physician time/effort"
            else:
                normalized = outcome.title()

            if normalized not in detected_outcomes:
                detected_outcomes.append(normalized)

    return detected_factors, detected_outcomes


def process_paper(paper_file: Path, client: Optional[anthropic.Anthropic] = None,
                  dry_run: bool = False) -> Tuple[bool, str]:
    """
    Process a single paper: extract results and update with evidence section.
    Returns (success, message).
    """
    frontmatter, _, body = extract_frontmatter_and_content(paper_file)

    if not frontmatter:
        return False, "No frontmatter found"

    # Only process empirical papers
    if not frontmatter.get('has_empirical_findings', False):
        return False, "Not empirical"

    # Check if already processed
    if '## Possible evidence' in body:
        return False, "Already processed"

    # Extract abstract
    abstract = frontmatter.get('abstract', '')
    if not abstract or not abstract.strip():
        return False, "No abstract"

    # Extract results using LLM or fallback
    if client:
        findings = extract_results_with_llm(abstract, client)
    else:
        findings = extract_results_fallback(abstract)

    if not findings:
        return False, "No findings extracted"

    # Detect variables across all findings and full abstract
    all_factors = set()
    all_outcomes = set()

    # Check abstract and all findings for variables
    full_text = abstract + " " + " ".join(findings)
    detected_factors, detected_outcomes = detect_variables(full_text)
    all_factors.update(detected_factors)
    all_outcomes.update(detected_outcomes)

    # Update frontmatter with variables
    if all_factors:
        frontmatter['factors'] = sorted(list(all_factors))
    if all_outcomes:
        frontmatter['outcomes_extracted'] = sorted(list(all_outcomes))

    # Create evidence section
    evidence_section = "\n## Possible evidence\n\n"
    for finding in findings:
        evidence_section += f"- {finding} #evd-candidate\n"

    # Add evidence section to body
    new_body = body.strip()
    if new_body:
        new_body += '\n\n'
    new_body += evidence_section

    if dry_run:
        print(f"  Would add {len(findings)} evidence items")
        if all_factors:
            print(f"  Factors: {', '.join(all_factors)}")
        if all_outcomes:
            print(f"  Outcomes: {', '.join(all_outcomes)}")
        return True, f"Dry run: {len(findings)} findings"

    # Reconstruct file
    new_content = "---\n"
    new_content += yaml.dump(frontmatter, default_flow_style=False, allow_unicode=True, sort_keys=False)
    new_content += "---\n\n"
    new_content += new_body

    # Write back
    paper_file.write_text(new_content, encoding='utf-8')

    return True, f"Added {len(findings)} evidence items"


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Extract evidence from empirical papers')
    parser.add_argument('--dry-run', action='store_true', help='Preview without updating files')
    parser.add_argument('--limit', type=int, default=None, help='Limit number of papers to process')
    parser.add_argument('--no-llm', action='store_true', help='Use regex fallback instead of LLM')
    args = parser.parse_args()

    # Setup paths
    project_root = Path(__file__).parent.parent
    discourse_dir = project_root / 'Discourse Graph'

    # Initialize LLM client if not using fallback
    client = None
    if not args.no_llm:
        try:
            client = anthropic.Anthropic()
            print("Using Claude API for result extraction")
        except Exception as e:
            print(f"Warning: Could not initialize Claude API: {e}")
            print("Falling back to regex-based extraction")

    # Get all paper files
    paper_files = sorted(discourse_dir.glob('@*.md'))

    if args.limit:
        paper_files = paper_files[:args.limit]

    print(f"Processing {len(paper_files)} paper files")
    if args.dry_run:
        print("DRY RUN - No files will be modified")
    print()

    # Process papers
    stats = {
        'total': 0,
        'empirical': 0,
        'processed': 0,
        'already_done': 0,
        'no_results': 0,
        'no_abstract': 0,
        'failed': 0
    }

    for i, paper_file in enumerate(paper_files, 1):
        print(f"[{i}/{len(paper_files)}] {paper_file.name}")

        stats['total'] += 1

        # Check if empirical
        frontmatter, _, body = extract_frontmatter_and_content(paper_file)
        if not frontmatter or not frontmatter.get('has_empirical_findings', False):
            continue

        stats['empirical'] += 1

        try:
            success, message = process_paper(paper_file, client=client, dry_run=args.dry_run)

            if "Already processed" in message:
                stats['already_done'] += 1
                print(f"  ✓ {message}")
            elif "No results section" in message:
                stats['no_results'] += 1
                print(f"  ⊘ {message}")
            elif "No abstract" in message:
                stats['no_abstract'] += 1
                print(f"  ⊘ {message}")
            elif success:
                stats['processed'] += 1
                print(f"  ✓ {message}")
            else:
                stats['failed'] += 1
                print(f"  ✗ {message}")

        except Exception as e:
            stats['failed'] += 1
            print(f"  ✗ Error: {e}")

    # Print summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    print(f"Total papers: {stats['total']}")
    print(f"Empirical papers: {stats['empirical']}")
    print(f"Papers processed: {stats['processed']}")
    print(f"Already processed: {stats['already_done']}")
    print(f"No results section: {stats['no_results']}")
    print(f"No abstract: {stats['no_abstract']}")
    print(f"Failed: {stats['failed']}")


if __name__ == '__main__':
    main()
