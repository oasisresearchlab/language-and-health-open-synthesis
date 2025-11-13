#!/usr/bin/env python3
"""
Convert papers from CSV to individual markdown files with YAML frontmatter.
Each paper gets a citekey-based filename: @LastName_Year_TitleWord1_TitleWord2.md
"""

import csv
import re
import os
from pathlib import Path
from typing import Dict, Any


def sanitize_for_filename(text: str) -> str:
    """Remove characters that aren't safe for filenames."""
    # Replace spaces and special chars with underscores or remove them
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s]+', '_', text)
    return text.strip('_')


def get_title_words(title: str, num_words: int = 2) -> str:
    """Extract first N significant words from title."""
    # Remove common articles and prepositions at the start
    stop_words = {'a', 'an', 'the', 'of', 'in', 'on', 'at', 'to', 'for', 'with'}
    words = title.split()

    # Filter out stop words and get significant words
    significant_words = []
    for word in words:
        if len(significant_words) >= num_words:
            break
        if word.lower() not in stop_words and len(word) > 2:
            significant_words.append(word)

    # If we don't have enough, just take first words
    if len(significant_words) < num_words:
        significant_words = words[:num_words]

    return '_'.join(significant_words[:num_words])


def create_citekey(author: str, year: str, title: str) -> str:
    """Create a citekey filename from paper metadata."""
    # Extract last name from author
    author_parts = author.strip().split()
    last_name = author_parts[0] if author_parts else 'Unknown'
    last_name = sanitize_for_filename(last_name)

    # Get year
    year = year.strip() if year else 'XXXX'

    # Get title words
    title_words = get_title_words(title, num_words=2)
    title_words = sanitize_for_filename(title_words)

    # Construct citekey
    citekey = f"@{last_name}_{year}_{title_words}"

    # Ensure it's unique by checking if file exists
    return citekey


def escape_yaml_string(text: str) -> str:
    """Escape special characters in YAML strings."""
    if not text:
        return '""'

    # If contains special chars or starts with special chars, quote it
    if any(char in text for char in [':', '#', '[', ']', '{', '}', '"', '\n', '\r']):
        # Escape quotes and wrap in quotes
        text = text.replace('"', '\\"')
        return f'"{text}"'

    return text


def create_paper_markdown(row: Dict[str, str], output_dir: Path) -> str:
    """Create a markdown file for a single paper."""
    # Extract metadata
    author = row.get('First Author', '')
    year = row.get('Year', '')
    title = row.get('Title', '')

    # Create citekey
    base_citekey = create_citekey(author, year, title)
    citekey = base_citekey

    # Handle duplicates
    counter = 1
    while (output_dir / f"{citekey}.md").exists():
        citekey = f"{base_citekey}_{counter}"
        counter += 1

    # Build YAML frontmatter
    yaml_lines = ["---"]

    # Add all CSV fields as YAML
    field_mapping = {
        'First Author': 'author',
        'Year': 'year',
        'Title': 'title',
        'Journal Name': 'journal',
        'Pubmed ID': 'pubmed_id',
        'Abstract': 'abstract',
        'Keywords': 'keywords',
        'Specialty': 'specialty',
        'Non-English Lang Involved': 'language',
        'Number of LEP': 'number_of_lep',
        'Study Years': 'study_years',
        'Region of Study Population': 'region',
        'Outcomes': 'outcomes',
        'Intervention?': 'intervention',
        'PDF downloaded (First_Year_Journal)': 'pdf_url'
    }

    for csv_field, yaml_field in field_mapping.items():
        value = row.get(csv_field, '').strip()
        if value and value != '9999':  # Skip placeholder values
            # For abstract and long text, use literal style
            if yaml_field in ['abstract', 'keywords', 'outcomes']:
                # Use literal block scalar for multi-line text
                value = value.replace('\n\n', '\n')  # Normalize newlines
                yaml_lines.append(f"{yaml_field}: |")
                for line in value.split('\n'):
                    yaml_lines.append(f"  {line}")
            else:
                yaml_lines.append(f"{yaml_field}: {escape_yaml_string(value)}")

    # Add citekey (quote it because @ is a YAML reserved character)
    yaml_lines.append(f"citekey: \"{citekey}\"")
    yaml_lines.append("---")

    # Create markdown content
    content = '\n'.join(yaml_lines) + '\n'

    # Write file
    filepath = output_dir / f"{citekey}.md"
    filepath.write_text(content, encoding='utf-8')

    return citekey


def main():
    # Setup paths
    project_root = Path(__file__).parent.parent
    csv_path = project_root / 'data' / 'LEP-papers-2025-06.csv'
    output_dir = project_root / 'Discourse Graph'

    # Ensure output directory exists
    output_dir.mkdir(exist_ok=True)

    # Read CSV and convert papers
    print(f"Reading papers from {csv_path}...")
    papers_converted = 0

    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                citekey = create_paper_markdown(row, output_dir)
                papers_converted += 1
                if papers_converted % 100 == 0:
                    print(f"Converted {papers_converted} papers...")
            except Exception as e:
                print(f"Error processing paper: {row.get('Title', 'Unknown')}")
                print(f"  Error: {e}")

    print(f"\n✓ Successfully converted {papers_converted} papers to {output_dir}")
    print(f"  Files are named with citekey format: @LastName_Year_TitleWords.md")


if __name__ == '__main__':
    main()
