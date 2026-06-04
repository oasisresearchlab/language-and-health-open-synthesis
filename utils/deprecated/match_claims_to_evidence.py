#!/usr/bin/env python3
"""
Match claims to specific evidence extractions from papers using semantic similarity.
Uses Obsidian block references to link to specific evidence bullets.
"""

import os
import re
import yaml
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from sentence_transformers import SentenceTransformer
import numpy as np


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


def extract_evidence_bullets(content: str) -> List[Tuple[str, int]]:
    """
    Extract evidence bullets from the Possible evidence section.
    Returns list of (evidence_text, line_number) tuples.
    """
    evidence_bullets = []

    # Find the "## Possible evidence" section
    lines = content.split('\n')
    in_evidence_section = False

    for i, line in enumerate(lines, 1):
        if re.match(r'^##\s+Possible evidence', line, re.IGNORECASE):
            in_evidence_section = True
            continue

        # Stop at next heading
        if in_evidence_section and re.match(r'^##\s+', line):
            break

        # Extract evidence bullets
        if in_evidence_section and line.strip().startswith('-') and '#evd-candidate' in line:
            # Remove the bullet point, #evd-candidate tag, and any block references
            evidence_text = re.sub(r'^\s*-\s*', '', line)
            evidence_text = re.sub(r'\s*#evd-candidate\s*', '', evidence_text)
            evidence_text = re.sub(r'\s*\^[\w-]+\s*$', '', evidence_text)
            evidence_text = evidence_text.strip()

            if evidence_text:
                evidence_bullets.append((evidence_text, i))

    return evidence_bullets


def add_block_reference_to_evidence(file_path: Path, line_number: int, block_id: str) -> bool:
    """
    Add a block reference to a specific evidence bullet.
    """
    content = file_path.read_text(encoding='utf-8')
    lines = content.split('\n')

    # Check if line already has a block reference
    if line_number <= len(lines):
        line = lines[line_number - 1]
        if re.search(r'\^[\w-]+\s*$', line):
            return True  # Already has block reference

        # Add block reference
        lines[line_number - 1] = line.rstrip() + f' ^{block_id}'

        # Write back
        file_path.write_text('\n'.join(lines), encoding='utf-8')
        return True

    return False


def match_claim_to_evidence(claim_text: str,
                            papers_evidence: Dict[str, List[Tuple[str, int]]],
                            model: SentenceTransformer,
                            top_k: int = 15) -> List[Tuple[str, str, int, float]]:
    """
    Match a claim to the most relevant evidence bullets across all papers.
    Returns list of (paper_citekey, evidence_text, line_number, similarity_score).
    """
    # Encode claim
    claim_embedding = model.encode([claim_text])[0]

    # Collect all evidence with paper info
    all_evidence = []
    for citekey, evidence_list in papers_evidence.items():
        for evidence_text, line_num in evidence_list:
            all_evidence.append((citekey, evidence_text, line_num))

    if not all_evidence:
        return []

    # Encode all evidence
    evidence_texts = [ev[1] for ev in all_evidence]
    evidence_embeddings = model.encode(evidence_texts)

    # Calculate similarities
    similarities = np.dot(evidence_embeddings, claim_embedding)

    # Get top k matches
    top_indices = np.argsort(similarities)[-top_k:][::-1]

    results = []
    for idx in top_indices:
        citekey, evidence_text, line_num = all_evidence[idx]
        similarity = float(similarities[idx])
        results.append((citekey, evidence_text, line_num, similarity))

    return results


def update_claim_file(claim_file: Path,
                      claim_text: str,
                      matched_evidence: List[Tuple[str, str, int, float]],
                      discourse_dir: Path) -> bool:
    """
    Update claim file with matched evidence using block references.
    """
    frontmatter, frontmatter_text, body = extract_frontmatter_and_content(claim_file)

    if not frontmatter:
        return False

    # Build new potentially relevant papers section
    new_section = "\n## Potentially Relevant Papers\n\n"

    for citekey, evidence_text, line_num, similarity in matched_evidence:
        # Generate block ID from line number
        block_id = f"evd-{line_num}"

        # Add block reference to paper file
        paper_file = discourse_dir / f"{citekey}.md"
        if paper_file.exists():
            add_block_reference_to_evidence(paper_file, line_num, block_id)

        # Add to claim file with block reference
        new_section += f"- [[{citekey}#^{block_id}]] (relevance: {similarity:.3f})\n"
        new_section += f"  > {evidence_text}\n"

    # Remove old "Potentially Relevant Papers" sections
    body_lines = body.split('\n')
    new_body_lines = []
    skip_section = False

    for line in body_lines:
        if re.match(r'^##\s+Potentially Relevant Papers', line, re.IGNORECASE):
            skip_section = True
            continue
        elif skip_section and re.match(r'^##\s+', line):
            skip_section = False

        if not skip_section:
            new_body_lines.append(line)

    # Reconstruct file
    new_content = "---\n"
    new_content += frontmatter_text
    new_content += "\n---\n"
    new_content += '\n'.join(new_body_lines).strip()
    new_content += '\n' + new_section

    # Write back
    claim_file.write_text(new_content, encoding='utf-8')
    return True


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Match claims to evidence from papers')
    parser.add_argument('--top-k', type=int, default=15, help='Number of top evidence matches per claim')
    parser.add_argument('--min-similarity', type=float, default=0.0, help='Minimum similarity threshold')
    args = parser.parse_args()

    # Setup paths
    project_root = Path(__file__).parent.parent
    discourse_dir = project_root / 'Discourse Graph'

    # Load model
    print("Loading sentence transformer model...")
    model = SentenceTransformer('all-MiniLM-L6-v2')

    # Get all claim files
    claim_files = sorted(discourse_dir.glob('CLM - *.md'))
    print(f"Found {len(claim_files)} claim files")

    # Get all paper files with evidence
    paper_files = sorted(discourse_dir.glob('@*.md'))
    print(f"Found {len(paper_files)} paper files")

    # Extract evidence from all papers
    print("\nExtracting evidence from papers...")
    papers_evidence = {}
    papers_with_evidence = 0

    for paper_file in paper_files:
        frontmatter, _, content = extract_frontmatter_and_content(paper_file)

        # Only process empirical papers
        if not frontmatter or not frontmatter.get('has_empirical_findings', False):
            continue

        # Extract evidence bullets
        evidence_bullets = extract_evidence_bullets(content)

        if evidence_bullets:
            citekey = frontmatter.get('citekey', paper_file.stem)
            papers_evidence[citekey] = evidence_bullets
            papers_with_evidence += 1

    print(f"Found {papers_with_evidence} papers with evidence extractions")

    # Process each claim
    print("\nMatching claims to evidence...")
    for i, claim_file in enumerate(claim_files, 1):
        print(f"\n[{i}/{len(claim_files)}] {claim_file.name}")

        # Extract claim text
        frontmatter, _, content = extract_frontmatter_and_content(claim_file)

        if not frontmatter:
            print("  ✗ No frontmatter")
            continue

        claim_text = claim_file.stem.replace('CLM - ', '')
        print(f"  Claim: {claim_text[:80]}...")

        # Match to evidence
        matched_evidence = match_claim_to_evidence(
            claim_text,
            papers_evidence,
            model,
            top_k=args.top_k
        )

        # Filter by minimum similarity
        matched_evidence = [
            match for match in matched_evidence
            if match[3] >= args.min_similarity
        ]

        if not matched_evidence:
            print("  ⊘ No relevant evidence found")
            continue

        print(f"  ✓ Found {len(matched_evidence)} relevant evidence items")

        # Update claim file
        success = update_claim_file(claim_file, claim_text, matched_evidence, discourse_dir)

        if success:
            print(f"  ✓ Updated claim file")
        else:
            print(f"  ✗ Failed to update claim file")

    print("\n" + "="*60)
    print("COMPLETE")
    print("="*60)


if __name__ == '__main__':
    main()
