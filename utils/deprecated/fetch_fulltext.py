#!/usr/bin/env python3
"""
Fetch full-text articles from PubMed Central for papers with valid PubMed IDs.
Stores the full-text in the data/fulltext directory.
"""

import os
import re
import time
import yaml
import requests
from pathlib import Path
from typing import Dict, Optional, Tuple
import xml.etree.ElementTree as ET


# NCBI E-utilities base URLs
ELINK_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/elink.fcgi"
EFETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"

# Rate limiting: NCBI allows 3 requests per second without API key
RATE_LIMIT_DELAY = 0.34  # seconds between requests


def extract_frontmatter(file_path: Path) -> Optional[Dict]:
    """Extract YAML frontmatter from a markdown file."""
    content = file_path.read_text(encoding='utf-8')
    match = re.match(r'^---\s*\n(.*?)\n---', content, re.DOTALL)
    if match:
        try:
            return yaml.safe_load(match.group(1))
        except yaml.YAMLError:
            return None
    return None


def get_pmc_id(pubmed_id: str) -> Optional[str]:
    """
    Convert PubMed ID to PMC ID using NCBI ELink.
    Returns PMC ID if available, None otherwise.
    """
    params = {
        'dbfrom': 'pubmed',
        'db': 'pmc',
        'id': pubmed_id,
        'retmode': 'xml'
    }

    try:
        response = requests.get(ELINK_URL, params=params, timeout=10)
        response.raise_for_status()

        # Parse XML response
        root = ET.fromstring(response.content)

        # Look for PMC ID in LinkSetDb
        for linksetdb in root.findall('.//LinkSetDb'):
            dbto = linksetdb.find('DbTo')
            if dbto is not None and dbto.text == 'pmc':
                link = linksetdb.find('.//Link/Id')
                if link is not None:
                    return link.text

        return None
    except Exception as e:
        print(f"  Error getting PMC ID: {e}")
        return None


def fetch_fulltext_xml(pmc_id: str) -> Optional[str]:
    """
    Fetch full-text XML from PMC using PMC ID.
    Returns XML content as string if successful, None otherwise.
    """
    params = {
        'db': 'pmc',
        'id': pmc_id,
        'retmode': 'xml'
    }

    try:
        response = requests.get(EFETCH_URL, params=params, timeout=30)
        response.raise_for_status()
        return response.text
    except Exception as e:
        print(f"  Error fetching full-text: {e}")
        return None


def xml_to_text(xml_content: str) -> str:
    """
    Convert PMC XML to plain text.
    Extracts text from relevant sections while preserving structure.
    """
    try:
        root = ET.fromstring(xml_content)

        # Find article body
        body = root.find('.//body')
        if body is None:
            # Try alternative path
            body = root.find('.//article//body')

        if body is None:
            return "Full-text body not found in XML."

        # Extract text with basic formatting
        def extract_text(element, depth=0):
            text_parts = []

            # Handle section titles
            if element.tag == 'title':
                text_parts.append('\n' + '#' * (depth + 1) + ' ' + (element.text or ''))
            elif element.tag == 'p':
                text_parts.append('\n' + (element.text or ''))
            elif element.text:
                text_parts.append(element.text)

            # Recursively process children
            for child in element:
                text_parts.append(extract_text(child, depth + 1))
                if child.tail:
                    text_parts.append(child.tail)

            return ''.join(text_parts)

        return extract_text(body)

    except Exception as e:
        return f"Error parsing XML: {e}\n\nRaw XML:\n{xml_content[:1000]}..."


def save_fulltext(citekey: str, content: str, output_dir: Path, format: str = 'txt') -> Path:
    """Save full-text content to a file."""
    # Clean citekey for filename (remove @)
    clean_citekey = citekey.replace('@', '').replace('"', '')

    if format == 'txt':
        filename = f"{clean_citekey}.txt"
    elif format == 'xml':
        filename = f"{clean_citekey}.xml"
    else:
        filename = f"{clean_citekey}.{format}"

    filepath = output_dir / filename
    filepath.write_text(content, encoding='utf-8')
    return filepath


def process_paper(paper_file: Path, output_dir: Path, save_xml: bool = False) -> Tuple[bool, Optional[str]]:
    """
    Process a single paper: check for PMC ID and fetch full-text if available.
    Returns (success, pmc_id).
    """
    frontmatter = extract_frontmatter(paper_file)
    if not frontmatter:
        return False, None

    pubmed_id = frontmatter.get('pubmed_id', '')
    citekey = frontmatter.get('citekey', paper_file.stem)

    # Skip invalid PubMed IDs
    if not pubmed_id or str(pubmed_id).strip() in ['', '9999']:
        return False, None

    pubmed_id = str(pubmed_id).strip()

    # Check if already downloaded
    clean_citekey = citekey.replace('@', '').replace('"', '')
    txt_file = output_dir / f"{clean_citekey}.txt"
    xml_file = output_dir / f"{clean_citekey}.xml"

    if txt_file.exists() or xml_file.exists():
        return True, "cached"

    # Get PMC ID
    print(f"  Checking PMC availability for PMID: {pubmed_id}")
    pmc_id = get_pmc_id(pubmed_id)
    time.sleep(RATE_LIMIT_DELAY)

    if not pmc_id:
        return False, None

    print(f"  Found PMC ID: {pmc_id}")

    # Fetch full-text XML
    print(f"  Fetching full-text...")
    xml_content = fetch_fulltext_xml(pmc_id)
    time.sleep(RATE_LIMIT_DELAY)

    if not xml_content:
        return False, pmc_id

    # Save XML if requested
    if save_xml:
        save_fulltext(citekey, xml_content, output_dir, format='xml')
        print(f"  ✓ Saved XML")

    # Convert to text and save
    text_content = xml_to_text(xml_content)
    save_fulltext(citekey, text_content, output_dir, format='txt')
    print(f"  ✓ Saved full-text")

    return True, pmc_id


def main():
    # Setup paths
    project_root = Path(__file__).parent.parent
    discourse_dir = project_root / 'Discourse Graph'
    output_dir = project_root / 'data' / 'fulltext'

    # Create output directory
    output_dir.mkdir(exist_ok=True)

    # Get all paper files
    paper_files = sorted(discourse_dir.glob('@*.md'))
    print(f"Found {len(paper_files)} paper files")

    # Process papers
    stats = {
        'total': 0,
        'valid_pubmed': 0,
        'has_pmc': 0,
        'downloaded': 0,
        'cached': 0,
        'failed': 0
    }

    for i, paper_file in enumerate(paper_files, 1):
        print(f"\n[{i}/{len(paper_files)}] Processing: {paper_file.name}")

        frontmatter = extract_frontmatter(paper_file)
        if not frontmatter:
            continue

        stats['total'] += 1
        pubmed_id = frontmatter.get('pubmed_id', '')

        # Skip invalid PubMed IDs
        if not pubmed_id or str(pubmed_id).strip() in ['', '9999']:
            print(f"  ⊘ No valid PubMed ID")
            continue

        stats['valid_pubmed'] += 1

        try:
            success, pmc_id = process_paper(paper_file, output_dir, save_xml=False)

            if pmc_id == "cached":
                stats['cached'] += 1
                print(f"  ✓ Already cached")
            elif success:
                stats['has_pmc'] += 1
                stats['downloaded'] += 1
            elif pmc_id:
                stats['has_pmc'] += 1
                stats['failed'] += 1
                print(f"  ✗ Failed to download (PMC ID: {pmc_id})")
            else:
                print(f"  ⊘ No PMC full-text available")

        except Exception as e:
            stats['failed'] += 1
            print(f"  ✗ Error: {e}")

    # Print summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    print(f"Total papers processed: {stats['total']}")
    print(f"Papers with valid PubMed ID: {stats['valid_pubmed']}")
    print(f"Papers with PMC full-text: {stats['has_pmc']}")
    print(f"Full-texts downloaded: {stats['downloaded']}")
    print(f"Full-texts cached: {stats['cached']}")
    print(f"Failed downloads: {stats['failed']}")
    print(f"\n✓ Full-texts saved to: {output_dir}")


if __name__ == '__main__':
    main()
