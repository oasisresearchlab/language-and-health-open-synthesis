#!/usr/bin/env python3
"""
Match papers to claims using semantic similarity.
Adds wikilinks to claim files for the most relevant papers.
"""

import os
import re
from pathlib import Path
from typing import List, Tuple, Dict
import yaml
import numpy as np


def extract_frontmatter_and_content(file_path: Path) -> Tuple[Dict, str]:
    """Extract YAML frontmatter and content from a markdown file."""
    content = file_path.read_text(encoding='utf-8')

    # Match YAML frontmatter
    frontmatter_pattern = r'^---\s*\n(.*?)\n---\s*\n(.*)$'
    match = re.match(frontmatter_pattern, content, re.DOTALL)

    if match:
        frontmatter_text = match.group(1)
        body = match.group(2)
        try:
            frontmatter = yaml.safe_load(frontmatter_text) or {}
        except yaml.YAMLError:
            frontmatter = {}
    else:
        frontmatter = {}
        body = content

    return frontmatter, body


def get_claim_text(file_path: Path) -> str:
    """Extract claim text from filename and file content."""
    # Claim text is usually in the filename after the prefix
    filename = file_path.stem
    if filename.startswith('CLM - '):
        claim_text = filename[6:]  # Remove "CLM - " prefix
    elif filename.startswith('QUE - '):
        claim_text = filename[6:]  # Remove "QUE - " prefix
    else:
        claim_text = filename

    return claim_text


def extract_abstract_sections(abstract: str) -> Dict[str, str]:
    """Extract structured sections from abstract (Results, Discussion, etc.)."""
    sections = {}

    # Common section headers in structured abstracts
    section_patterns = [
        (r'\b(Results?|Findings?)\s*:\s*(.+?)(?=\b(?:Conclusion|Discussion|Implications|Methods?|Background|Objective|$))', 'results'),
        (r'\b(Discussion|Implications?|Conclusions?)\s*:\s*(.+?)(?=\b(?:Results?|Methods?|Background|Objective|$))', 'discussion'),
        (r'\b(Conclusions?)\s*:\s*(.+?)$', 'conclusion'),
    ]

    abstract_text = abstract if isinstance(abstract, str) else str(abstract)

    for pattern, section_name in section_patterns:
        matches = re.finditer(pattern, abstract_text, re.IGNORECASE | re.DOTALL)
        for match in matches:
            # Get the content (second capture group)
            content = match.group(2).strip()
            if content and section_name not in sections:
                sections[section_name] = content

    # If no structured sections found, use full abstract
    if not sections:
        sections['full'] = abstract_text

    return sections


def get_paper_text(frontmatter: Dict) -> str:
    """Extract searchable text from paper metadata."""
    # Combine title, abstract, keywords for matching
    parts = []

    if 'title' in frontmatter:
        parts.append(frontmatter['title'])

    if 'abstract' in frontmatter:
        parts.append(frontmatter['abstract'])

    if 'keywords' in frontmatter:
        parts.append(frontmatter['keywords'])

    if 'outcomes' in frontmatter:
        parts.append(frontmatter['outcomes'])

    return ' '.join(parts)


def compute_embeddings(texts: List[str], method: str = 'sentence-transformers'):
    """Compute embeddings for a list of texts."""
    if method == 'sentence-transformers':
        try:
            from sentence_transformers import SentenceTransformer
            model = SentenceTransformer('all-MiniLM-L6-v2')
            embeddings = model.encode(texts, show_progress_bar=True)
            return embeddings
        except ImportError:
            print("sentence-transformers not installed. Falling back to simple keyword matching.")
            return None
    elif method == 'tfidf':
        from sklearn.feature_extraction.text import TfidfVectorizer
        vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
        embeddings = vectorizer.fit_transform(texts).toarray()
        return embeddings
    else:
        raise ValueError(f"Unknown embedding method: {method}")


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Compute cosine similarity between two vectors."""
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))


def simple_keyword_match(claim_text: str, paper_text: str) -> float:
    """Simple keyword-based matching as fallback."""
    # Normalize text
    claim_words = set(re.findall(r'\w+', claim_text.lower()))
    paper_words = set(re.findall(r'\w+', paper_text.lower()))

    # Remove common stop words
    stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
                  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
                  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
                  'should', 'could', 'may', 'might', 'must', 'can'}
    claim_words -= stop_words
    paper_words -= stop_words

    # Calculate Jaccard similarity
    if not claim_words or not paper_words:
        return 0.0

    intersection = claim_words & paper_words
    union = claim_words | paper_words

    return len(intersection) / len(union)


def extract_relevant_quote(claim_text: str, abstract_sections: Dict[str, str],
                          model=None, use_embeddings: bool = True) -> str:
    """Extract the most relevant quote from abstract sections for a claim."""
    # Prioritize results and discussion sections
    priority_sections = ['results', 'discussion', 'conclusion', 'full']

    best_quote = ""
    best_score = 0.0

    for section_name in priority_sections:
        if section_name not in abstract_sections:
            continue

        section_text = abstract_sections[section_name]

        # Split into sentences
        sentences = re.split(r'(?<=[.!?])\s+', section_text)

        if use_embeddings and model is not None:
            try:
                # Find most relevant sentence using embeddings
                claim_embedding = model.encode([claim_text])[0]
                sentence_embeddings = model.encode(sentences, show_progress_bar=False)

                for i, sent_embedding in enumerate(sentence_embeddings):
                    score = cosine_similarity(claim_embedding, sent_embedding)
                    if score > best_score and len(sentences[i]) > 20:  # Avoid very short sentences
                        best_score = score
                        best_quote = sentences[i].strip()
            except:
                pass

        # Fallback to keyword matching
        if not best_quote:
            for sentence in sentences:
                score = simple_keyword_match(claim_text, sentence)
                if score > best_score and len(sentence) > 20:
                    best_score = score
                    best_quote = sentence.strip()

    return best_quote


def find_relevant_papers(claim_text: str, papers: List[Tuple[str, str, Dict]],
                         top_k: int = 10, use_embeddings: bool = True,
                         model=None) -> List[Tuple[str, float, str]]:
    """Find the most relevant papers for a claim with quotes."""
    if use_embeddings and model is not None:
        # Try to use semantic embeddings with pre-loaded model
        try:
            # Compute claim embedding
            claim_embedding = model.encode([claim_text])[0]

            # Compute paper embeddings in batches to save memory
            batch_size = 100
            similarities = []

            for i in range(0, len(papers), batch_size):
                batch = papers[i:i+batch_size]
                paper_texts = [paper[1] for paper in batch]
                paper_embeddings = model.encode(paper_texts, show_progress_bar=False)

                # Compute similarities for this batch
                for j, (citekey, paper_text, frontmatter) in enumerate(batch):
                    similarity = cosine_similarity(claim_embedding, paper_embeddings[j])

                    # Extract relevant quote from abstract sections
                    abstract = frontmatter.get('abstract', '')
                    abstract_sections = extract_abstract_sections(abstract)
                    quote = extract_relevant_quote(claim_text, abstract_sections, model, use_embeddings=True)

                    similarities.append((citekey, similarity, quote))

            # Sort by similarity and return top k
            similarities.sort(key=lambda x: x[1], reverse=True)
            return similarities[:top_k]
        except Exception as e:
            print(f"Error using embeddings: {e}")
            print("Falling back to keyword matching...")

    # Fallback to keyword matching
    similarities = []
    for citekey, paper_text, frontmatter in papers:
        similarity = simple_keyword_match(claim_text, paper_text)

        # Extract relevant quote
        abstract = frontmatter.get('abstract', '')
        abstract_sections = extract_abstract_sections(abstract)
        quote = extract_relevant_quote(claim_text, abstract_sections, model, use_embeddings=False)

        similarities.append((citekey, similarity, quote))

    similarities.sort(key=lambda x: x[1], reverse=True)
    return similarities[:top_k]


def add_wikilinks_to_claim(claim_file: Path, relevant_papers: List[Tuple[str, float, str]],
                           threshold: float = 0.1):
    """Add wikilinks to a claim file for relevant papers with quotes."""
    frontmatter, body = extract_frontmatter_and_content(claim_file)

    # Filter papers above threshold
    filtered_papers = [(citekey, score, quote) for citekey, score, quote in relevant_papers if score >= threshold]

    if not filtered_papers:
        print(f"  No papers above threshold for {claim_file.name}")
        return

    # Create wikilinks with quotes
    wikilinks = []
    for citekey, score, quote in filtered_papers:
        link = f"- [[{citekey}]] (relevance: {score:.3f})"
        if quote:
            # Format quote as indented text
            link += f"\n  > {quote}"
        wikilinks.append(link)

    # Add section for relevant papers
    new_body = body.strip()
    if new_body:
        new_body += '\n\n'

    new_body += "## Potentially Relevant Papers\n\n"
    new_body += '\n'.join(wikilinks)
    new_body += '\n'

    # Reconstruct file
    new_content = "---\n"
    new_content += yaml.dump(frontmatter, default_flow_style=False, allow_unicode=True)
    new_content += "---\n\n"
    new_content += new_body

    # Write back
    claim_file.write_text(new_content, encoding='utf-8')
    print(f"  Added {len(filtered_papers)} paper links to {claim_file.name}")


def main():
    # Setup paths
    project_root = Path(__file__).parent.parent
    discourse_graph_dir = project_root / 'Discourse Graph'

    # Load all papers (only empirical ones)
    print("Loading papers...")
    papers = []
    skipped = 0
    for paper_file in discourse_graph_dir.glob('@*.md'):
        frontmatter, _ = extract_frontmatter_and_content(paper_file)

        # Filter to only empirical papers
        if not frontmatter.get('has_empirical_findings', False):
            skipped += 1
            continue

        citekey = frontmatter.get('citekey', paper_file.stem)
        paper_text = get_paper_text(frontmatter)
        papers.append((citekey, paper_text, frontmatter))

    print(f"Loaded {len(papers)} empirical papers (skipped {skipped} non-empirical)")

    # Check if sentence-transformers is available and load model once
    model = None
    use_embeddings = False
    try:
        from sentence_transformers import SentenceTransformer
        print("Loading sentence-transformers model...")
        model = SentenceTransformer('all-MiniLM-L6-v2')
        use_embeddings = True
        print("Using semantic embeddings (sentence-transformers)")
    except ImportError:
        print("sentence-transformers not found. Using keyword matching.")
        print("To use semantic matching, install: pip install sentence-transformers")

    # Process each claim file
    print("\nMatching papers to claims...")
    claim_files = list(discourse_graph_dir.glob('CLM - *.md')) + \
                  list(discourse_graph_dir.glob('QUE - *.md'))

    for i, claim_file in enumerate(claim_files, 1):
        print(f"\n[{i}/{len(claim_files)}] Processing: {claim_file.name}")
        claim_text = get_claim_text(claim_file)

        # Find relevant papers
        relevant_papers = find_relevant_papers(claim_text, papers, top_k=10,
                                               use_embeddings=use_embeddings,
                                               model=model)

        # Add wikilinks (lower threshold to 0.01 for initial matching)
        add_wikilinks_to_claim(claim_file, relevant_papers, threshold=0.01)

        # Print top 3 scores for debugging
        if relevant_papers:
            print(f"  Top 3 similarity scores: {[f'{score:.4f}' for _, score, _ in relevant_papers[:3]]}")

    print("\n✓ Completed matching papers to claims")


if __name__ == '__main__':
    main()
