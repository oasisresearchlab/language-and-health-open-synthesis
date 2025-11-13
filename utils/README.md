# Paper-Claim Linking System

This directory contains utilities for converting papers from CSV to markdown files and linking them to claims using semantic similarity.

## Scripts

### 1. `convert_papers_to_md.py`

Converts papers from the CSV database into individual markdown files with YAML frontmatter.

**Features:**
- Creates citekey-based filenames: `@LastName_Year_TitleWord1_TitleWord2.md`
- Extracts 2-3 significant words from the title
- Includes all metadata from CSV as YAML fields
- Handles duplicate citekeys automatically
- Outputs to `Discourse Graph/` directory

**Usage:**
```bash
python3 utils/convert_papers_to_md.py
```

**Example output:**
- Input: Karliner, 2008, "Identification of limited English proficient patients in clinical care"
- Output: `@Karliner_2008_Identification_limited.md`

### 2. `match_papers_to_claims.py`

Matches papers to claims using semantic similarity and adds wikilinks to claim files.

**Features:**
- Uses sentence-transformers for semantic embeddings (all-MiniLM-L6-v2 model)
- Processes papers in batches to manage memory efficiently
- Finds top 10 most relevant papers for each claim
- Adds wikilinks with relevance scores to claim files
- Falls back to keyword matching if embeddings unavailable

**Usage:**
```bash
python3 utils/match_papers_to_claims.py
```

**Configuration:**
- `top_k`: Number of papers to link per claim (default: 10)
- `threshold`: Minimum similarity score (default: 0.01)
- `batch_size`: Batch size for embedding computation (default: 100)

## Requirements

```bash
pip install sentence-transformers PyYAML numpy scikit-learn
```

## File Structure

```
Discourse Graph/
├── CLM - [claim text].md          # Claim files
├── QUE - [question text].md       # Question files
└── @Author_Year_Title.md          # Paper files

data/
└── LEP-papers-2025-06.csv         # Source paper database
```

## Workflow

1. **Convert papers to markdown:**
   ```bash
   python3 utils/convert_papers_to_md.py
   ```
   This creates ~785 paper markdown files in `Discourse Graph/`

2. **Match papers to claims:**
   ```bash
   python3 utils/match_papers_to_claims.py
   ```
   This adds a "Potentially Relevant Papers" section to each claim file with wikilinks

3. **Review and refine:**
   - Check the suggested papers for each claim
   - Adjust relevance threshold if needed
   - Manually add or remove wikilinks as needed

## Paper Metadata Schema

Each paper file includes YAML frontmatter with:
- `author`: First author last name
- `year`: Publication year
- `title`: Full paper title
- `journal`: Journal name
- `pubmed_id`: PubMed ID
- `abstract`: Paper abstract
- `keywords`: Keywords
- `specialty`: Medical specialty
- `language`: Non-English languages involved
- `number_of_lep`: Number of LEP patients
- `study_years`: Years of study
- `region`: Study population region
- `outcomes`: Study outcomes
- `intervention`: Whether intervention was used
- `pdf_url`: Link to PDF
- `citekey`: Generated citekey

## Improving Matching Quality

To improve paper-claim matching:

1. **Adjust the threshold:** Lower values include more papers but may reduce precision
   ```python
   add_wikilinks_to_claim(claim_file, relevant_papers, threshold=0.05)
   ```

2. **Use different embedding models:** Try other sentence-transformers models:
   ```python
   model = SentenceTransformer('all-mpnet-base-v2')  # More accurate but slower
   ```

3. **Increase top_k:** Include more paper suggestions per claim:
   ```python
   relevant_papers = find_relevant_papers(claim_text, papers, top_k=20)
   ```

4. **Add claim descriptions:** Expand claim files with more detailed descriptions to improve semantic matching

## Notes

- The matching script processes claims in batches to manage memory usage
- Similarity scores range from -1 to 1, with higher values indicating greater relevance
- The script will overwrite existing "Potentially Relevant Papers" sections in claim files
- Papers without abstracts or key metadata may not match well
