export const meta = {
  name: 'ai-translation-cluster-extract',
  description: 'Extract the 14-paper AI-assisted-translation cluster into draft discourse nodes (one agent per paper), to the review rubric',
  phases: [
    { title: 'Extract', detail: 'one extraction agent per paper -> draft EVD/CLM/CVT/ART nodes' },
  ],
}

const PAPERS = [
  { ck: 'Chen_2017_Machine_Human', note: 'Quality of a translation MOBILE APP for diabetes education (machine vs human). Baseline (non-surgical).', isReview: false },
  { ck: 'Das_2019_Dangers_Machine', note: '"Dangers of machine translation" — need for professionally translated anticipatory guidance. Baseline (pediatrics).', isReview: false },
  { ck: 'Kapoor_2022_Use_Neural', note: 'Neural machine translation software for LEP patients (assessment/discharge). Verify surgical relevance.', isReview: false },
  { ck: 'Khanna_2011_Performance_online', note: 'Performance of an online translation tool applied to patient-education material. Baseline.', isReview: false },
  { ck: 'Turner_2014_comparison_human', note: 'Comparison of human vs machine translation of health-promotion materials. Baseline (public health).', isReview: false },
  { ck: 'Turner_2015_Machine_Translation', note: 'Machine translation of public-health materials English->Chinese (feasibility study). Baseline.', isReview: false },
  { ck: 'Turner_2015_Modeling_workflow', note: 'Modeling workflow to design MT applications for public-health practice. Baseline; best-practices relevant.', isReview: false },
  { ck: 'Hwang_2022_Testing_use', note: 'Testing translation apps to overcome everyday healthcare communication (Australia). Baseline.', isReview: false },
  { ck: 'Panayiotou_2020_perceptions_translation', note: 'Perceptions of translation apps among healthcare workers and older patients. Baseline.', isReview: false },
  { ck: 'Narang_2019_Use_Mobile', note: 'Use of a mobile application to increase access to interpreters for cancer patients. Near-surgical (oncology).', isReview: false },
  { ck: 'Soller_2012_Performance_new', note: 'Performance of a new speech-translation device for verbal medication recommendations. Baseline.', isReview: false },
  { ck: 'Colina_2022_Research_Documents', note: 'Translation approaches for LEP research documents. Methods; best-practices relevant.', isReview: false },
  { ck: 'Rishivardhan_2024_Voice-Enabled_Response', note: 'VERAA — leveraging LLMs to map voice responses. Verify relevance; may be a methods/tool paper.', isReview: false },
  { ck: 'Theresa_2024_Point-of-care_communication', note: 'Scoping review of point-of-care communication TECHNOLOGY for limited-language-proficiency patients. THIS IS A REVIEW -> author CLMs only, NO EVDs.', isReview: true },
]

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    citekey: { type: 'string' },
    isReview: { type: 'boolean' },
    machineTranslationRelevant: { type: 'boolean', description: 'true if the paper genuinely concerns AI/machine/app/device translation for patients' },
    evd: { type: 'integer' }, clm: { type: 'integer' }, cvt: { type: 'integer' }, art: { type: 'integer' },
    newClmTitles: { type: 'array', items: { type: 'string' }, description: 'exact titles of CLM nodes newly created OR existing CLMs this paper added evidence to' },
    role: { type: 'string', description: 'one of: benefit | risk | limitation | best-practice | mixed | not-relevant' },
    flags: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
  required: ['citekey', 'isReview', 'machineTranslationRelevant', 'evd', 'clm', 'newClmTitles', 'role', 'summary'],
}

const ROOT = '/Users/joelchan/Projects/language-and-health-open-synthesis'

function buildPrompt(p) {
  return [
    'You are extracting ONE paper into an Obsidian-based discourse-graph vault as DRAFT nodes, following the project methodology EXACTLY. Work in ' + ROOT + '.',
    '',
    'PAPER: @' + p.ck,
    'Topic hint: ' + p.note,
    'isReview: ' + p.isReview,
    '',
    'STEP 1 — Load the method (read these FULLY before authoring, in this order):',
    '- CLAUDE.md (node ids, edge schema, tags, governance)',
    '- Skill.md, Skill-references.md, Skill-templates.md',
    '- discourse-extraction/node-spec.md (the quality rubric — author so every node would PASS it)',
    '- utils/templates/ (open "T - Evidence.md", "T - Claim.md", "T - Caveat.md", "T - Artifact.md" — the canonical frontmatter+section templates)',
    '- CONCRETE EXAMPLES: open 2 existing EVD files and 1 existing CLM under "Discourse Graph/Evidence/" and "Discourse Graph/Claims/" from a recent AI-translation paper (grep filenames for @Hibbs_2026 or @Joshua_2023). MATCH their frontmatter fields and section structure exactly.',
    '',
    'STEP 2 — Read the paper: data/pdfs/@' + p.ck + '.pdf (use the Read tool with a pages range; read enough to extract faithfully). Also read "Discourse Graph/Sources/@' + p.ck + '.md" for bibliographic metadata. If the PDF is clearly the WRONG paper or has no language-access/translation angle, author nothing and report that in flags.',
    '',
    'STEP 3 — Inventory, then author DRAFT node files:',
    '- EVD (one atomic empirical finding each, PAST tense): verbatim quote + page locator; ## Methods Context with inverted What/How/Who, each grounded in its own verbatim quote; reference the figure/table (Fig N / Table N) where the finding lives, else text-only. Filename: "EVD - <short finding> - @' + p.ck + '.md" in "Discourse Graph/Evidence/".',
    '- CLM (PRESENT tense generalization): list its Supporting / Contradicting Evidence as [[EVD - ...]] wikilinks. Filename "CLM - <text>.md" in "Discourse Graph/Claims/". IMPORTANT: before creating a CLM, grep "Discourse Graph/Claims/" — if an existing CLM already states this generalization, ADD your [[EVD]] wikilink to that existing CLM instead of duplicating it (and include that existing title in newClmTitles).',
    '- CVT (limitation qualifying a specific EVD; mark author-stated vs inferred; ## Qualifies lists [[EVD]]). "Discourse Graph/Caveats/".',
    '- ART only if the paper evaluates a concrete NAMED system/tool (a specific app, device, chatbot, or MT engine). "Discourse Graph/Artifacts/".',
    '- IF isReview = true: author CLMs ONLY (the review\'s synthesized theses, present tense) — NO EVDs (per methodology, reviews contribute claims; the evidence lives in the primaries they cite).',
    '',
    'FRONTMATTER — match the templates exactly: nodeTypeId (from the CLAUDE.md table for each type), a UNIQUE nodeInstanceId per node (generate a UUIDv7 by running: python3 -c "import time,os,uuid;b=bytearray(int(time.time()*1000).to_bytes(6,\'big\')+os.urandom(10));b[6]=(b[6]&0x0F)|0x70;b[8]=(b[8]&0x3F)|0x80;print(uuid.UUID(bytes=bytes(b)))"), NodeFormality: draft, curationStatus: Initial AI draft, extraction_model: claude-opus-4-8, tags = domain facets + EXACTLY ONE epistemic/* tag. Where the finding concerns AI/machine/app/device translation, tag the factor languageConcordanceFactor/concordanceIntervention/machineTranslation. Add the mirrored YAML list fields (languageConcordanceFactor / healthOutcome / deliveryContext) on EVD and CLM per Skill-references.',
    '',
    'VERBATIM DISCIPLINE (critical — a mechanical verbatim_audit.py will compare each quote to the PDF text): every quote MUST be copied EXACTLY from the paper, including punctuation; add the page number. Never paraphrase inside quotation marks. Atomicity: one finding per EVD (a table of 5 results -> 5 EVDs).',
    '',
    'GOVERNANCE (propose, don\'t commit): leave every CLM certainty BLANK and do NOT write a ## Evidence appraisal (that is an expert task). Do NOT advance curationStatus beyond "Initial AI draft".',
    '',
    'DO NOT run any pipeline scripts (sync_relations / ground_figures / quote_pipeline / audits) — the controller runs those ONCE after all papers are done. Only author the .md files.',
    '',
    'Then return the structured summary: counts (evd/clm/cvt/art), the exact newClmTitles (created or added-to), machineTranslationRelevant, role (benefit|risk|limitation|best-practice|mixed|not-relevant), and any flags (wrong-PDF, no-LEP-angle, direction-ambiguity, source-inconsistency, etc.).',
  ].join('\n')
}

phase('Extract')
const results = await parallel(
  PAPERS.map((p) => () =>
    agent(buildPrompt(p), { label: 'extract:' + p.ck, phase: 'Extract', schema: SCHEMA })
  )
)

const ok = results.filter(Boolean)
return {
  papers: PAPERS.length,
  completed: ok.length,
  totals: {
    evd: ok.reduce((s, r) => s + (r.evd || 0), 0),
    clm: ok.reduce((s, r) => s + (r.clm || 0), 0),
    cvt: ok.reduce((s, r) => s + (r.cvt || 0), 0),
    art: ok.reduce((s, r) => s + (r.art || 0), 0),
  },
  perPaper: ok.map((r) => ({ ck: r.citekey, mt: r.machineTranslationRelevant, role: r.role, evd: r.evd, clm: r.clm, cvt: r.cvt, art: r.art, clms: r.newClmTitles, flags: r.flags || [] })),
}