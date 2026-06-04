#!/usr/bin/env python3
"""
Match claims to evidence using LLM-based entailment assessment.
Uses Claude to determine if evidence SUPPORTS, CONTRADICTS, or is NEUTRAL to claims.
"""

import os
import re
import yaml
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import anthropic
import json


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


def assess_entailment(claim: str, evidence: str, client: anthropic.Anthropic) -> Tuple[str, float, str]:
    """
    Use LLM to assess whether evidence supports, contradicts, or is neutral to the claim.
    Returns (relationship, confidence, reasoning).

    Relationship: SUPPORTS, CONTRADICTS, NEUTRAL
    Confidence: 0.0-1.0
    """
    prompt = f"""You are classifying research evidence for an academic literature review.

CLAIM: {claim}

EVIDENCE: {evidence}

Task: Determine the relationship. Output ONLY valid JSON in this exact format:
{{
  "relationship": "SUPPORTS",
  "confidence": 0.8,
  "reasoning": "Brief explanation"
}}

Relationship types:
- SUPPORTS: Evidence supports or is consistent with the claim
- CONTRADICTS: Evidence contradicts the claim
- NEUTRAL: Evidence is not clearly related

Use NEUTRAL when uncertain."""

    try:
        # Add small delay to avoid rate limiting
        import time
        time.sleep(0.1)

        message = client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}]
        )

        response_text = message.content[0].text.strip()

        # Debug: print first few chars of response if it's problematic
        if not response_text:
            print(f"    Warning: Empty response from API")
            return 'NEUTRAL', 0.0, "Empty API response"

        # Try to parse JSON
        # Remove markdown code blocks if present
        response_text = re.sub(r'```json\s*', '', response_text)
        response_text = re.sub(r'```\s*$', '', response_text)
        response_text = response_text.strip()

        # If doesn't look like JSON, return neutral
        if not response_text.startswith('{'):
            print(f"    Warning: Response doesn't start with '{{': {response_text[:50]}...")
            return 'NEUTRAL', 0.0, "Invalid JSON response"

        # Try to extract just the JSON object (handle nested braces)
        json_match = re.search(r'\{.*?"relationship".*?\}', response_text, re.DOTALL)
        if json_match:
            response_text = json_match.group(0)
            # Remove any trailing text after the closing brace
            response_text = re.sub(r'\}.*$', '}', response_text, flags=re.DOTALL)

        result = json.loads(response_text)

        relationship = result.get('relationship', 'NEUTRAL').upper()
        confidence = float(result.get('confidence', 0.5))
        reasoning = result.get('reasoning', '')

        # Validate relationship
        if relationship not in ['SUPPORTS', 'CONTRADICTS', 'NEUTRAL']:
            relationship = 'NEUTRAL'

        return relationship, confidence, reasoning

    except anthropic.RateLimitError as e:
        print(f"    Rate limit hit, waiting 10 seconds...")
        import time
        time.sleep(10)
        return 'NEUTRAL', 0.0, "Rate limit"
    except json.JSONDecodeError as e:
        print(f"    JSON decode error: {e}")
        print(f"    Response text: {response_text[:100]}...")
        return 'NEUTRAL', 0.0, f"JSON error: {e}"
    except Exception as e:
        print(f"    Error assessing entailment: {e}")
        return 'NEUTRAL', 0.0, f"Error: {e}"


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


def update_claim_file(claim_file: Path,
                      claim_text: str,
                      relevant_evidence: List[Tuple[str, str, int, str, float, str]],
                      discourse_dir: Path) -> bool:
    """
    Update claim file with relevant evidence using block references.
    relevant_evidence: List of (citekey, evidence_text, line_num, relationship, confidence, reasoning)
    """
    frontmatter, frontmatter_text, body = extract_frontmatter_and_content(claim_file)

    if not frontmatter:
        return False

    # Build new potentially relevant papers section
    new_section = "\n## Potentially Relevant Papers\n\n"

    # Group by relationship
    supporting = [(c, e, l, conf, r) for c, e, l, rel, conf, r in relevant_evidence if rel == 'SUPPORTS']
    contradicting = [(c, e, l, conf, r) for c, e, l, rel, conf, r in relevant_evidence if rel == 'CONTRADICTS']

    if supporting:
        new_section += "### Supporting Evidence\n\n"
        for citekey, evidence_text, line_num, confidence, reasoning in supporting:
            # Generate unique block ID from citekey and line number
            # Remove @ prefix and clean up the citekey for block ID
            clean_citekey = citekey.replace('@', '').replace('_', '-')[:20]  # Limit length
            block_id = f"{clean_citekey}-L{line_num}"

            # Add block reference to paper file
            paper_file = discourse_dir / f"{citekey}.md"
            if paper_file.exists():
                success = add_block_reference_to_evidence(paper_file, line_num, block_id)
                if not success:
                    print(f"    Warning: Could not add block reference to {citekey} line {line_num}")

            # Add to claim file with block reference
            new_section += f"- [[{citekey}#^{block_id}]] (confidence: {confidence:.2f})\n"
            new_section += f"  > {evidence_text}\n"
            if reasoning:
                new_section += f"  > *{reasoning}*\n"

    if contradicting:
        new_section += "\n### Contradicting Evidence\n\n"
        for citekey, evidence_text, line_num, confidence, reasoning in contradicting:
            # Generate unique block ID from citekey and line number
            clean_citekey = citekey.replace('@', '').replace('_', '-')[:20]  # Limit length
            block_id = f"{clean_citekey}-L{line_num}"

            # Add block reference to paper file
            paper_file = discourse_dir / f"{citekey}.md"
            if paper_file.exists():
                success = add_block_reference_to_evidence(paper_file, line_num, block_id)
                if not success:
                    print(f"    Warning: Could not add block reference to {citekey} line {line_num}")

            # Add to claim file with block reference
            new_section += f"- [[{citekey}#^{block_id}]] (confidence: {confidence:.2f})\n"
            new_section += f"  > {evidence_text}\n"
            if reasoning:
                new_section += f"  > *{reasoning}*\n"

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

    parser = argparse.ArgumentParser(description='Match claims to evidence using LLM entailment')
    parser.add_argument('--min-confidence', type=float, default=0.6, help='Minimum confidence threshold')
    parser.add_argument('--max-per-claim', type=int, default=20, help='Maximum evidence items per claim')
    parser.add_argument('--sample-evidence', type=int, default=None, help='Sample N random evidence items to assess (for testing)')
    args = parser.parse_args()

    # Setup paths
    project_root = Path(__file__).parent.parent
    discourse_dir = project_root / 'Discourse Graph'

    # Initialize Claude client
    client = anthropic.Anthropic()

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
    total_evidence = 0

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
            total_evidence += len(evidence_bullets)

    print(f"Found {papers_with_evidence} papers with evidence ({total_evidence} total evidence items)")

    # Sample evidence if requested
    if args.sample_evidence:
        print(f"\nSampling {args.sample_evidence} random evidence items per paper for testing...")
        import random
        for citekey in papers_evidence:
            if len(papers_evidence[citekey]) > args.sample_evidence:
                papers_evidence[citekey] = random.sample(papers_evidence[citekey], args.sample_evidence)

        # Recalculate total evidence after sampling
        total_evidence = sum(len(evidence_list) for evidence_list in papers_evidence.values())
        print(f"After sampling: {total_evidence} total evidence items")

    # Process each claim
    print("\nMatching claims to evidence using LLM entailment...")
    import sys
    for i, claim_file in enumerate(claim_files, 1):
        print(f"\n[{i}/{len(claim_files)}] {claim_file.name}")
        sys.stdout.flush()

        # Extract claim text
        frontmatter, _, content = extract_frontmatter_and_content(claim_file)

        if not frontmatter:
            print("  ✗ No frontmatter")
            sys.stdout.flush()
            continue

        claim_text = claim_file.stem.replace('CLM - ', '')
        print(f"  Claim: {claim_text[:80]}...")
        sys.stdout.flush()

        # Collect all evidence and assess entailment
        relevant_evidence = []
        evidence_count = 0

        for citekey, evidence_list in papers_evidence.items():
            for evidence_text, line_num in evidence_list:
                evidence_count += 1

                # Assess entailment
                relationship, confidence, reasoning = assess_entailment(claim_text, evidence_text, client)

                # Only keep if supports or contradicts with sufficient confidence
                if relationship in ['SUPPORTS', 'CONTRADICTS'] and confidence >= args.min_confidence:
                    relevant_evidence.append((citekey, evidence_text, line_num, relationship, confidence, reasoning))

                # Progress indicator (show every 50 items)
                if evidence_count % 50 == 0:
                    print(f"    Assessed {evidence_count}/{total_evidence} evidence items, found {len(relevant_evidence)} relevant...")
                    sys.stdout.flush()

        # Sort by confidence (highest first)
        relevant_evidence.sort(key=lambda x: x[4], reverse=True)

        # Limit to max per claim
        relevant_evidence = relevant_evidence[:args.max_per_claim]

        print(f"  ✓ Found {len(relevant_evidence)} relevant evidence items")
        supporting_count = sum(1 for _, _, _, rel, _, _ in relevant_evidence if rel == 'SUPPORTS')
        contradicting_count = sum(1 for _, _, _, rel, _, _ in relevant_evidence if rel == 'CONTRADICTS')
        print(f"    Supporting: {supporting_count}, Contradicting: {contradicting_count}")

        # Update claim file
        if relevant_evidence:
            success = update_claim_file(claim_file, claim_text, relevant_evidence, discourse_dir)
            if success:
                print(f"  ✓ Updated claim file")
            else:
                print(f"  ✗ Failed to update claim file")
        else:
            print(f"  ⊘ No relevant evidence found")

    print("\n" + "="*60)
    print("COMPLETE")
    print("="*60)


if __name__ == '__main__':
    main()
