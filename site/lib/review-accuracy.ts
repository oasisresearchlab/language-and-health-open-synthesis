import { promises as fs } from "node:fs";
import path from "node:path";

import { loadGeneratedGraph } from "./graph";
import type { GraphNode } from "./types";

// The accuracy pass reviews *existing* EVD extractions against the PDF, one EVD at a
// time, across a checklist (verbatim / grounding / polarity / substantive / methods).
// Data is reused from the exported graph (graph/) — no separate precompute.

// Review batch: the length-of-stay + readmission clusters, plus the
// bilingual-provider / language-concordance modality cluster. Upload these papers'
// PDFs (scripts/upload-review-pdfs.mjs) and rebuild review-data for them.
export const ACCURACY_BATCH = [
  // length-of-stay + readmission
  "@Allan_2022_impact_English",
  "@Karliner_2017_Convenient_Access",
  "@Lindholm_2012_Professional_language",
  "@Wallbrecht_2014_difference_emergency",
  "@Greenky_2019_Reversed_Trend",
  // bilingual-provider / concordance modality (direct-language care vs interpreter)
  "@Seible_2021_Influence_Patient-Provider",
  "@Stoneking_2016_Does_Spanish",
  "@L_2023_Dual-role_nurse",
  // --- surgery cluster expansion (29 papers, 2026-07) ---
  "@Angeles_2026_Elective_Total",
  "@Burkle_2017_Assessment_efficiency",
  "@Claire_2022_Increasing_Frequency",
  "@Hangge_2022_Lost_translation",
  "@Hyundeok_2023_Association_Language",
  "@Jaramillo_2016_Hispanic_Clinic",
  "@Jenny_2024_Use_Professional",
  "@Joshua_2023_Multilingual_Chatbot",
  "@Kapoor_2023_Impact_Need",
  "@Karen_2024_Impact_Using",
  "@Kevin_2023_Limited_English",
  "@Kevin_2023_Patients_Who",
  "@Kiblinger_2022_Facilitating_Communication",
  "@Lee_2017_Increased_Access",
  "@Linda_2023_Improving_Communication",
  "@Manuel_2022_Association_English",
  "@Maurer_2021_Non-English_Primary",
  "@Nguyen_2023_Language_Barriers",
  "@Plancarte_2021_Association_Between",
  "@Sabra_2025_Association_Limited",
  "@Wang_2024_Limited_English",
  "@Xue_2019_Interpreter_proxy",
  "@Zafar_2023_Comparison_cataract",
  "@Hibbs_2026_Translation_Approaches",
  "@Maria_2023_Consent_document",
  "@Krankl_2011_Patient_predictors",
  "@Idossa_2019_Access_Linguistically",
  "@Maul_2012_Using_risk",
  "@Allar_2022_Lost_translation",
  // AI-assisted translation cluster (2026-07-30)
  "@Chen_2017_Machine_Human",
  "@Das_2019_Dangers_Machine",
  "@Kapoor_2022_Use_Neural",
  "@Khanna_2011_Performance_online",
  "@Turner_2014_comparison_human",
  "@Turner_2015_Machine_Translation",
  "@Turner_2015_Modeling_workflow",
  "@Hwang_2022_Testing_use",
  "@Panayiotou_2020_perceptions_translation",
  "@Narang_2019_Use_Mobile",
  "@Soller_2012_Performance_new",
  "@Colina_2022_Research_Documents",
  "@Rishivardhan_2024_Voice-Enabled_Response",
];

// Curated review set — ~4 LOS + ~4 readmission EVDs (spanning surgical/inpatient/
// ED/peds and effect/null). Only these are shown in the accuracy pane; leave empty
// to show every EVD of the batch papers. Keyed by EVD title (stable across re-export).
export const CURATED_EVD_TITLES = new Set<string>([
  // length of stay
  "LEP inpatients without a professional interpreter on both admission and discharge had a 0.75-1.47 day longer length of stay",
  "Bedside interpreter telephone access had no significant effect on length of stay",
  "No significant difference in length of stay after bariatric surgery between LEP and EP patients (adjusted IRR 0.94)",
  "Among LEP ED patients interpreter use was associated with significantly longer length of stay",
  // readmission
  "Bedside interpreter telephone access lowered LEP 30-day readmission during intervention (OR 0.64)",
  "LEP inpatients with no interpreter on admission or discharge had a higher 30-day readmission rate (24.3% vs 14.9%)",
  "No significant difference in one-year readmission after bariatric surgery between LEP and EP patients (adjusted OR 0.94)",
  "Adjusted odds of 7-day ED readmission were only 3% higher and non-significant for interpreter-requested pediatric patients",
  // bilingual-provider / concordance modality — @Seible_2021 (RCT, direct-Spanish vs interpreter)
  "Direct-Spanish care raised primary-endpoint general satisfaction over interpreter services (4.45 vs 4.09) in an RCT",
  "Direct-Spanish care raised satisfaction with overall-care domains (technical quality, interpersonal manner, communication, time spent)",
  "Direct-Spanish care raised satisfaction with physician communication (disclosure, empathy, confidence, general)",
  "Direct-Spanish consultations had more physician history-verification and partnering utterances",
  "Patients in direct-Spanish consultations asked more questions and gave more unprompted speech",
  "Satisfaction benefit of direct-Spanish care attenuated to nonsignificance at later treatment timepoints",
  "Initial consultation length did not differ between direct-Spanish and interpreter-services arms (37 vs 33 min)",
  // @Stoneking_2016 (medical-Spanish curriculum for residents)
  "Residents trained in a medical Spanish curriculum spoke Spanish with more LEP patients and used translator phones less",
  "Patients rated visit satisfaction and resident Spanish ability higher for curriculum-trained residents",
  "Among LEP patients who followed medical recommendations after a Spanish-spoken encounter, most were seen by curriculum-trained residents",
  // @L_2023 (dual-role nurse interpreting — qualitative)
  "Dual-role nurses observed Spanish-speaking patients show visible relief and ease once an interpreter brokered communication",
  "Without qualified interpretation Spanish-speaking patients experienced miscommunication confusion and anger during hospital stays",
  "Concentrating Spanish-speaking patient assignments on dual-role nurses added time-consuming interpreting burden and frustration",
  // --- surgery cluster expansion: all 195 EVDs (2026-07) ---
  "88% of LEP surgical inpatients had a professional interpreter documented at least once during admission",
  "96% of eConsents documented the presence of a certified medical interpreter",
  "97 percent of LEP surgical patients used hospital interpreter services rather than family or acquaintances",
  "About 94% of supported-language LEP patients received a written consent in their preferred language via eConsent",
  "About half of LEP surgical patients received fewer than one interpreting event per day",
  "Adequately informed consent was higher post- vs pre-bedside interpreter phone implementation (54% vs 29%) among LEP patients",
  "After Spanish, Chinese (29 percent) and Arabic (23 percent) were the most requested non-English languages with significant regional variation at BMT centers",
  "Among 18 patients consenting to both sponsor types in discordant languages 16 signed non-primary for the non-industry study (McNemar P=0.002)",
  "An amplifier and earpiece restored auditory communication for a hearing-impaired presurgical patient",
  "Anxiety or depression was more frequent among patients needing translation services (p=0.011)",
  "Asian and Hispanic-Latino patients needed translation services in higher proportion (22% vs 2%, p under 0.0001)",
  "Audio interpreter call volume rose from 2 calls (20 min) at baseline to 20 calls (257 min) in the final project month",
  "Availability of valid translated PROMs in the patients preferred language was the most consistent facilitator and barrier",
  "Bilingual consent form increased self-rated confidence during interpreted SACT consent among LEP adults",
  "Bilingual consent form raised Total Comprehension Score (median 4 vs 3) significantly in univariate but not multivariate models",
  "Bilingual consent form raised understanding of non-curative treatment intent vs English-only (60.0% vs 34.8%, multivariate OR 3.73)",
  "Both concordant groups asked more questions than the discordant-interpreter group on pairwise comparison (3.21 and 2.56 more, p=0.002 and p=0.001)",
  "Both language concordance and speaking Spanish predicted greater stated preference for language-concordant care (p=0.03 and p less than 0.001)",
  "Chatbot-enrolled LEP patients had a non-significant reduction in 90-day ED visits vs controls (0.9% vs 8.0%, P=.085)",
  "Chinese, Arabic, Vietnamese, and Creole were most often ranked among the top-3 hardest language needs to meet at BMT centers",
  "Chinese-speaking LEP patients were ~3x more likely than other-language patients to have an interpreter in the first 24 hours",
  "Chronic opioid use was more frequent among patients needing translation services (p=0.001)",
  "Clinical risk-complexity and interpreter access ranked next-highest priority (RPN 2244, 2047)",
  "Clinical visit length did not differ across language-concordance groups (8.65 vs 10.06 vs 9.29 min, p=0.351)",
  "Collecting PROMs from LEP patients imposed additional time and resource burden and PROMs were often skipped",
  "Colposcopy patients answered only 72% of consent-comprehension questions correctly on average",
  "Communication board decreased nurses' perceived time to interpret nursing tasks (2.13 to 3.29, p=0.002)",
  "Communication board increased nurse satisfaction with the interpretation process (2.27 to 3.57, p=0.0007) in a pediatric surgery center",
  "Communication board increased nurses' self-perceived ability to communicate with LEP patients (2.07 to 3.50, p=0.0001)",
  "Communication board produced no significant change in telephone-interpretation costs (balancing measure)",
  "Communication board was used for only 36.4% of eligible LEP patients over 3 months",
  "Complication responses showed lower proxy-interpreter agreement (kappa 0.69) attributed to an ambiguous complication definition",
  "Concordant and Spanish-speaking families more strongly agreed that discordance worsens quality of care (beta=-0.46, p=0.01)",
  "Cost of interpreter services ranked lowest priority (RPN 1296) despite high importance",
  "Documented consent concordance varied across surgical services (Ophthalmology 94.5% vs Cardiothoracic 77.6%)",
  "Documented consent concordance was lower for less commonly spoken languages (Spanish 89.2% vs Tagalog 47.6%)",
  "Documented language-concordant interpreter-mediated consent rose from 56.9% to 83.9% after paper-to-eConsent transition",
  "EQ-5D-5L domain agreement varied from 0.57 (anxiety-depression) to 0.81 (mobility) between proxy and interpreter",
  "EQ-VAS overall-health score showed substantial proxy-interpreter agreement (ICC-CCC 0.78) after arthroplasty",
  "Each individual informed consent element improved post-implementation among LEP patients (adjusted ORs 2.39-14.1)",
  "Education was the strongest predictor of colposcopy consent comprehension (b=0.61, p<.001)",
  "English speakers scored higher than Spanish speakers on colposcopy consent comprehension in unadjusted analysis (8.50 vs 6.21)",
  "English-concordant and Spanish-concordant families asked a similar number of questions (0.65 difference, p=0.9)",
  "English-only EMR and lack of multilingual EMR integration was a barrier to PROM completion for LEP patients",
  "English-speaking family members were used as ad hoc interpreters as a double-edged facilitator and barrier",
  "Even with an interpreter present providers felt information was lost in translation undermining mutual understanding",
  "Financial burden of translating and validating PROMs into many languages was a barrier for low-capital health systems",
  "HFMEA expert panel identified nine failure modes driving reliance on own language skills over an interpreter",
  "Higher complex-surgery and CDE rates in LEP persisted after adjustment for mature cataract",
  "Highest interpreting-frequency quartile had 4.6-day shorter adjusted peri-operative LOS vs lowest",
  "Hip arthroplasty patients showed higher proxy-interpreter agreement than knee patients across outcomes",
  "Hospital-wide professional telephone interpreter utilization increased 14% post-implementation",
  "In-person interpreting was the predominant modality (79 percent) over telephone (18 percent) and VRI (3 percent)",
  "Inability to locate education resources for a specific language (43 percent) was the most common provider-level barrier at BMT centers",
  "Industry-sponsored studies had higher translated-consent availability (51.4% vs 23.9% of events; OR 3.4) than non-industry studies",
  "Institutional and departmental leadership advocacy was a key facilitator to implementing multilingual PROMs",
  "Institutional interpreter services cost 5.85 million dollars in 2016 requiring 43 FTE in-person interpreters",
  "Interpreter modality (in-person, phone, video) was not associated with regional anesthesia utilization for total joint arthroplasty",
  "Interpreter proxies and healthcare interpreters showed substantial-to-almost-perfect agreement across most arthroplasty PROMs",
  "Interpreter use was not associated with incidence of any complication (OR 1.105, P=0.60) after breast reduction",
  "Interpreter use was not associated with number of postoperative clinic visits (beta 0.029, P=0.37) after breast reduction",
  "Interpreter use was not associated with regional anesthesia utilization for total joint arthroplasty",
  "Interpretive service type did not affect comprehension among Spanish-speaking colposcopy patients",
  "LEP and EP patients had similar arthroplasty-specific complication rates after knee arthroplasty",
  "LEP and EP patients had similar rates of surgical site infection, sepsis, and encephalopathy after knee arthroplasty",
  "LEP and English-primary patients engaged equally with the multilingual chatbot (12.3 vs 12.2 responses, P=.959)",
  "LEP cataract patients had higher type 2 diabetes prevalence than EP patients (44.9% vs 21.5%)",
  "LEP cataract surgeries used higher cumulative dissipated energy (mean 9.5 vs 7.2)",
  "LEP children were less likely to receive any analgesia within 12h after surgery (86% vs 97%)",
  "LEP independently predicted lower odds of a 30-day opioid refill request (aOR 0.61) after knee arthroplasty",
  "LEP patients enrolled in the chatbot had fewer 90-day readmissions than non-enrolled LEP controls (0% vs 8.3%)",
  "LEP patients had greater visual acuity improvement after cataract surgery (change 0.366 vs 0.254)",
  "LEP patients had higher unadjusted 30-day DVT rates than EP (2.5% vs 0.8%) after knee arthroplasty",
  "LEP patients had higher unadjusted 30-day VTE rates than EP (3.8% vs 1.9%) after knee arthroplasty",
  "LEP patients had higher unadjusted 7-day pneumonia rates than EP (1.3% vs 0.3%) after knee arthroplasty",
  "LEP patients had longer hospital length of stay than EP (3.4 vs 2.6 days) after arthroplasty",
  "LEP patients had longer length of hospital stay than EP (2.8 vs 2.3 days) after knee arthroplasty",
  "LEP patients had longer length of hospitalization than EP (2.79 vs 2.29 days) after knee arthroplasty",
  "LEP patients had worse preoperative visual acuity (logMAR 0.566 vs 0.366) before cataract surgery",
  "LEP patients requested fewer opioid refills than EP within 30 days (35.3% vs 52.4%) after knee arthroplasty",
  "LEP patients requested fewer opioid refills than EP within 60 days (48.7% vs 61.0%) after knee arthroplasty",
  "LEP patients requested fewer opioid refills than EP within 90 days (54.0% vs 62.9%) after knee arthroplasty",
  "LEP patients signed consent in a non-primary language in 65.9% of non-industry vs 31.9% of industry events",
  "LEP patients were 5.5% of consent events in industry vs 2.8% in non-industry cancer trials",
  "LEP patients were less likely than EP to be discharged home (72.0% vs 82.4%) after knee arthroplasty",
  "LEP patients were less likely than EP to undergo revision surgery within 1 year (1.4% vs 3.2%) after arthroplasty",
  "LEP patients were less likely than EP to undergo revision surgery within 2 years (1.7% vs 3.9%) after arthroplasty",
  "LEP patients were less likely to undergo Nd-YAG capsulotomy after cataract surgery (7.3% vs 12.8%)",
  "LEP patients were more likely to have mature cataracts (5.1% vs 2.3%) at cataract surgery",
  "LEP patients were more likely to have residents perform their cataract surgery (9.4% vs 5.8%)",
  "LEP patients' cataract surgeries were more likely to be complex (27.8% vs 15.3%)",
  "LEP status did not differ between low and high postoperative follow-up groups (20.0% vs 22.4%, P=0.35) after breast reduction",
  "LEP status independently predicted decreased 1-year revision surgery (aOR 0.45) after arthroplasty",
  "LEP status independently predicted decreased 2-year revision surgery (aOR 0.44) after arthroplasty",
  "LEP status independently predicted increased 30-day DVT (aOR 2.84) after knee arthroplasty",
  "LEP status independently predicted increased 30-day VTE (aOR 2.10) after knee arthroplasty",
  "LEP status was not associated with postoperative complication rates (21.93% vs 23.36%, P>0.05) after breast reduction",
  "LEP surgical inpatients had a median of 1 documented interpreter use during their stay",
  "LEP surgical patients spanned 18 primary languages led by Arabic Spanish and Somali",
  "LEP was associated with higher hospitalization cost (adjusted IRR 1.08) after total joint arthroplasty",
  "LEP was associated with increased discharge to a skilled care facility (adjusted OR 1.41) after total joint arthroplasty",
  "LEP was associated with longer length of stay (adjusted IRR 1.15) after total joint arthroplasty",
  "LEP was associated with longer time to first analgesia after surgery (adjusted HR 0.68)",
  "LEP was not an independent predictor of 7-day pneumonia (aOR 2.77, CI 0.57-13.51) after knee arthroplasty",
  "LEP was not associated with 30-day readmission (adjusted OR 0.80, 95% CI 0.49-1.28) after total joint arthroplasty",
  "LEP was not associated with cumulative 24h opioid dose after surgery (0.05 vs 0.06 mEq per kg)",
  "LEP was not associated with number of nonopioid analgesic doses within 24h after surgery (4.8 vs 4.7)",
  "LEP was not associated with number of postoperative pain assessments (6 vs 5)",
  "LEP was not associated with proportion given opioids at 24h after surgery (31% vs 32%)",
  "LEP was not associated with proportion receiving opioids within 12h after surgery (17% vs 23%)",
  "LEP was not independently associated with 60- or 90-day opioid refill requests after knee arthroplasty",
  "LEP was not significantly associated with time to first opioid after surgery (adjusted HR 0.76)",
  "Lack of a formal centralized language tracking system (20 percent) was the most common system-level barrier at BMT centers",
  "Language concordance predicted higher patient-rated communication scores (beta=-0.182, p=0.03)",
  "Language discordance independently predicted fewer patient-initiated questions after adjustment (beta=-2.48, p=0.02)",
  "Language was not associated with colposcopy consent comprehension after adjustment (b=-0.44, p=.46)",
  "Language was not associated with regional anesthesia use in a propensity-score-matched sensitivity analysis (OR 1.23) for total joint arthroplasty",
  "Language-discordant families more often reported their question-asking was limited by a language barrier (beta=0.892, p=0.001)",
  "Limited English proficiency independently predicted lower odds of signing consent (OR 0.74) for non-industry studies",
  "Limited English proficiency independently predicted lower odds of signing consent in primary language (OR 0.35) for non-industry studies",
  "Machine and professional booklet translation did not differ in understanding of treatment intent (multivariate OR 0.99) among LEP adults",
  "Machine translation of a SACT booklet introduced 11 critical errors vs 1 and failed CIoL assessment (51 vs 73 of 100)",
  "Mean differences between proxy and interpreter scores were small with negligible group-level bias and no significant Wilcoxon differences",
  "Mean in-person interpreter arrival time was 19 min but highly variable (range 0-100) in a surgical and procedural practice",
  "Median initial English consent document was 7,491.5 words at an estimated US$1,498 per translation",
  "More LEP patients remained on steroid drops 4 weeks after cataract surgery (14.6% vs 10.1%)",
  "More years living in the US predicted greater colposcopy consent comprehension (b=0.05, p=.006)",
  "NEPL independently predicted increased odds of emergency surgery (OR 1.35) on multivariable analysis for diverticulitis",
  "NEPL patients had a higher unadjusted rate of emergency surgery than EPL (60.3% vs 48.6%) for diverticulitis",
  "NEPL retained increased odds of emergency surgery (OR 1.59) among commercially insured diverticulitis patients",
  "Nearly 43 percent of BMT centers did not develop their own educational resources in a non-English language",
  "Nearly one third of BMT centers relied on family and friends to interpret for LEP patients",
  "Need for in-person interpreters and caregiver-translated materials was significantly associated with pediatric BMT centers",
  "Need for language assistance was not an independent predictor of PACU pain 3 or higher (OR 1.40, p=0.06)",
  "Need for language assistance was not associated with regional anesthesia use after matching (47.4% vs 52.6%, p=0.16)",
  "Need for language assistance was not associated with total perioperative opioid use (33 vs 30 MEDD, p=0.099) after matching",
  "No significant difference in intraoperative complications between LEP and EP cataract surgery (2.0% vs 1.6%)",
  "No significant difference in operative time between LEP and EP cataract surgery (21.7 vs 20.5 min)",
  "No significant difference in postoperative complications between LEP and EP cataract surgery",
  "No surgical cases were cancelled and no LEP patient underwent a procedure without interpretive assistance",
  "Non-Spanish NEPL had increased odds of emergency surgery (OR 2.29) for diverticulitis",
  "Nurses reported difficulty using the board when the English word was absent under the translation",
  "Only 12% of LEP surgical patients received language-concordant discharge forms",
  "Only 15.7% of LEP adults understood treatment intent after reading a translated SACT booklet regardless of translation method",
  "Only 3.4% of LEP surgical inpatients had an interpreter documented at discharge",
  "Only 5.1% of LEP patients signed their eConsent via the patient portal (73.2% signed on in-unit iPads)",
  "Only 53% of LEP surgical inpatients had an interpreter documented within the first 24 hours",
  "Oxford hip-knee score showed almost perfect proxy-interpreter agreement (kappa-ICC 0.87, CCC 0.86) after arthroplasty",
  "Patient-initiated questions differed across the three language-concordance groups and were lowest for discordant-interpreter visits (7.63 vs 6.98 vs 4.43, p=0.002)",
  "Patients needing language assistance had lower PACU opioid consumption (median 5 vs 10 MEDD, p=0.021) after matching",
  "Patients needing language assistance reported lower average PACU pain (2.3 vs 2.6, p=0.046) after matching",
  "Patients needing language assistance reported lower average POD 1 pain (2.4 vs 2.8, p=0.004) after matching",
  "Patients with a primary language other than English or Spanish did not have higher odds (OR 0.9) of signing consent for studies with Spanish consent at opening",
  "Physician lack of knowledge about interpreter value and use ranked highest priority (RPN 2418)",
  "Post-implementation LEP patients had higher propensity-adjusted odds of adequately informed consent (AOR 2.56)",
  "Post-implementation LEP patients still had lower adequately informed consent than English speakers (AOR 0.38)",
  "Post-implementation nurses rated the communication board highly usable and effective (86-93% agreement)",
  "Preferred language was not associated with regional anesthesia use after multilevel multivariable adjustment (OR 0.93) for total joint arthroplasty",
  "Preferred language was not associated with regional anesthesia utilization on univariate analysis for total joint arthroplasty",
  "Preferred language was self-reported by the patient at 68 percent of BMT centers",
  "Preoperative and postoperative pain levels did not differ between LEP and EP knee arthroplasty patients",
  "Primary language other than English independently predicted lower odds of signing consent (OR 0.74) for non-industry studies",
  "Primary language other than English independently predicted lower odds of signing consent in primary language (OR 0.38) for non-industry studies",
  "Primary-language-other-than-English patients signed consent in a non-primary language in 72.6% of non-industry vs 43.8% of industry events",
  "Primary-language-other-than-English patients were 8.1% of consent events in industry vs 4.4% in non-industry cancer trials",
  "Prior opioid use did not differ between LEP and EP knee arthroplasty patients",
  "Private insurance predicted greater colposcopy consent comprehension (b=-1.05 for non-private, p=.005)",
  "Professional interpreter use at consent signing rose non-significantly post-implementation (29.8% to 39.7%)",
  "Professional interpreter use surfaced a Creole-speaking blind patient's suicidal ideation that family and aides had missed",
  "Providers preferred in-person interpreters over phone-video for reading emotion forms and PROMs with LEP patients",
  "Providers reported either systematic exclusion of LEP patients from PROMs or significant barriers to collection",
  "Providers viewed simple word-for-word translation without cultural validation as not a valid PROM",
  "Race-ethnicity, gender, age, and insurance status were not associated with interpreter use among LEP surgical patients",
  "Readmission and reoperation responses showed perfect proxy-interpreter agreement (kappa 1.00) after arthroplasty",
  "Regional anesthesia was near-universal (98.8%) for total joint arthroplasty at a specialized orthopedic hospital",
  "Reoperation rates did not differ between chatbot-enrolled and non-enrolled LEP patients (0% vs 1.5%, P=1.000)",
  "Satisfaction and success PROMs showed substantial proxy-interpreter agreement (kappa 0.75 and 0.70) after arthroplasty",
  "Second interpreting-frequency quartile showed no significant adjusted LOS difference vs lowest (P=0.37)",
  "Shorter LOS in top two interpreting-frequency quartiles was robust across five operative-complexity adjustment models",
  "Spanish NEPL was not associated with increased odds of emergency surgery (OR 0.80, P=0.077) for diverticulitis",
  "Spanish was the most frequently requested non-English language across all US regions (over 90 percent) at BMT centers",
  "Spanish-speaking LEP patients were ~3x more likely than other-language patients to have an interpreter in the first 24 hours",
  "Spanish-speaking families reported higher trust than English-speaking families independent of concordance (beta=0.453, p less than 0.001)",
  "Spanish-speaking families reported less comfort using an interpreter (beta=-0.659, p=0.005)",
  "Spanish-speaking families reported lower perceived discrimination than English-speaking families independent of concordance (beta=0.255, p=0.002)",
  "Spanish-speaking patients had higher odds (OR 5.7) of signing consent for studies with Spanish consent available at study opening",
  "Stratified by interview order only EQ-VAS with healthcare-interpreter-first differed significantly between methods (p 0.04)",
  "Telephone and VRI were chosen over in-person interpreters mainly for unstaffed languages long waits or known unavailability",
  "Third interpreting-frequency quartile had 4.2-day shorter adjusted peri-operative LOS vs lowest",
  "Translated transplant-process information and telephone interpreting were the most often-needed language resources at BMT centers",
  "Unadjusted median peri-operative LOS fell monotonically from 11 to 1 day across ascending interpreting-frequency quartiles",
  "Very urgent (under 6h) cases had lower documented consent concordance (57.1%) than elective (84.2%)",
  "Video interpreter sessions rose to 29-33 per month after the wheeled-tablet introduction, where none existed before",
  "When translated PROMs were unavailable, PROMs completion rates among LEP patients were lower than English-speaking counterparts",
  "Younger age predicted greater colposcopy consent comprehension (b=-0.06, p=.003)",
  // AI-assisted translation cluster
  "iTranslate matched human Spanish translators on the two simpler sentences but scored lower on the most difficult sentence",
  "iTranslate and human Chinese translations differed only slightly with all sentences reaching excellent-to-perfect fluency",
  "Nearly half of non-Spanish machine-translated safety statements were deficient or minimally useful",
  "Google Translate met the professional translation standard for only Spanish among 20 non-English languages",
  "Machine translation was least accurate for South and Southeast Asian languages (Bengali Hindi Punjabi Vietnamese)",
  "Machine translation assessed both pain and nausea every time in 76.7% of LEP PACU patients",
  "83.3% to 86.7% of nurses were satisfied with the speed and ability of machine translation for patient assessment",
  "96.6% of LEP patients were satisfied with machine translations ability to assess their symptoms",
  "83.3% of LEP PACU patients were assessed successfully on the first machine-translation attempt",
  "96.7% of LEP PACU patients used machine translation successfully at least once with no need for human interpreters",
  "Google Translate sentences contained more errors of any severity than professional translation (39% vs 22%)",
  "Google Translate and professional translation did not differ in frequency of serious clinically impactful errors (4% vs 2%)",
  "Google Translate and professional translation did not differ in meaning (connotation) preservation of a Spanish warfarin brochure",
  "Google Translate and professional translation did not differ in adequacy (information preservation) of a Spanish warfarin brochure",
  "Google Translate scored lower on fluency than professional translation of a Spanish warfarin brochure (3.4 vs 4.7)",
  "Evaluators had no overall preference between Google Translate and professional Spanish translation",
  "Sentence complexity predicted preference for professional over Google Translate translation (3.6 vs 2.6 for complex vs simple)",
  "Machine-translation postediting was 2 to 10 times faster than human-translation postediting (11.76 vs 3.30 WPM)",
  "Human translation of public health documents took 17 hours to 6 days and up to 35 days end-to-end",
  "Bilingual raters preferred postedited MT and HT equivalently (37 vs 36 votes)",
  "Human translation of public health documents cost $130 to $1220 per document while MT added no cost",
  "Blinded quality raters preferred human translation over MT-plus-postediting for all 20 Chinese public-health documents",
  "Word sense (40%) and word order (22%) were the most common English-to-Chinese machine translation errors",
  "An expert public-health translator did not close the MT-plus-postediting quality gap with human translation",
  "Posteditors corrected English-to-Chinese machine translations at about 37.8 characters per minute",
  "Instructions to make all necessary corrections moved MT-plus-postediting toward quality equivalence with human translation",
  "Posteditors rated raw English-to-Chinese machine translation adequacy 3.32 and fluency 3.0 out of 5",
  "Staff feared inaccurate machine translation of health messages could harm health and community credibility",
  "Cost was the most frequently reported barrier to translating public-health materials",
  "Public-health translation work divided into four workflow phases",
  "Most interviewees rated machine translation quality as relatively poor and used it only for gist",
  "About half of interviewees saw machine translation as viable only if post-edited by a native speaker",
  "Translation was an intermittent ad hoc side job with no established time",
  "Lack of clear guidelines on when and what to translate prevented translation",
  "Nearly two-thirds of aged-care staff would use translation apps again (15 of 24, 65.2%)",
  "Phrasebook apps' single translation direction prevented staff from understanding patient responses",
  "Translation apps were most commonly used for identifying pain and allied-health phrases in aged-care wards",
  "Translation apps improved staff-patient rapport and engagement in aged-care wards",
  "A majority of aged-care staff rated translation apps useful (18 of 24, 75%)",
  "Google Translate was slow and difficult to use requiring repeated attempts to convey a message",
  "The leading reason staff did not use a translation app was that a family member was available (16 of 24, 66.6%)",
  "Patient dialects and accents degraded translation-app accuracy in aged-care wards",
  "Staff felt patients appreciated the effort and it helped build rapport even when the app failed",
  "Unfamiliarity with technology was the major barrier to app use for older CALD participants",
  "Healthcare staff reported already using translation apps on personal devices to overcome language barriers",
  "Both groups rated the three demonstrated apps as moderately to highly easy to use and satisfactory",
  "Fixed-phrase translation apps were preferred over real-time voice-to-voice apps by both older people and staff",
  "Participants were cautious about translation accuracy and viewed apps as unsuitable for complex or important communication",
  "Nurses reported being generally discouraged from booking interpreters due to time and cost",
  "Older CALD participants and healthcare staff perceived translation technology as having a role in facilitating communication",
  "Real-time voice-to-voice translation sometimes failed to recognise words due to background noise or dialects",
  "Most clinicians rated the mobile app easy to use and that it made calling interpreters easier",
  "Mobile app increased mean weekly OPI interpreter calls from 4.3 to 12.8 during intervention",
  "Mobile app became the predominant OPI-call modality during intervention (65% of calls)",
  "Elevated OPI interpreter-call frequency was not sustained after the intervention period",
  "S-MINDS had lower speech-recognition word error rates than three commercial systems across quiet noisy and disfluent conditions",
  "LEP diabetes patients rated S-MINDS highly across satisfaction domains (means 4.7-4.9 on 5-point Likert)",
  "S-MINDS scored higher translation accuracy than commercial speech translation systems across sound environments",
  "S-MINDS translated the full English-Spanish-English medication-counseling string with ~98% adjusted accuracy",
  "Greater English language dominance predicted a higher likelihood of preferring the word-for-word translation",
  "Readers described the functionalist translation as natural and native-authored and the literal one as awkward and foreign",
  "75% of bilingual readers preferred the functionalist over the word-for-word survey translation",
  "Readers raised significantly more comprehension issues about the literal than the functionalist survey translation",
  "Readers associated the functionalist translation with professionalism and trust in a healthcare setting",
  "On-device VERAA mapped English voice responses at 85% median accuracy, below the cloud pipeline",
  "Cloud-based VERAA mapped Spanish voice survey responses at 90% median accuracy, below English",
  "Cloud-based VERAA mapped English voice survey responses to structured SDoH answers at 100% median accuracy",
  "VERAA's LLM mapped numerical income-range responses least accurately (B1 income 70-75%)",
]);

const isCurated = (title: string) =>
  CURATED_EVD_TITLES.size === 0 || CURATED_EVD_TITLES.has(title);

const PDFS = path.resolve(process.cwd(), "..", "data", "pdfs"); // local dev only
// Committed review data (works at build + runtime on Vercel — no fs outside site/).
const REVIEW_DATA = path.resolve(process.cwd(), "review-data");
// EVD id → physical PDF page, precomputed by utils/build_accuracy_pages.py.
const PAGES_FILE = path.join(REVIEW_DATA, "accuracy_pages.json");

async function physicalPages(): Promise<Record<string, number>> {
  try {
    return JSON.parse(await fs.readFile(PAGES_FILE, "utf-8"));
  } catch {
    return {};
  }
}

// EVD id → { finding|what|how|who → (QuoteRegion|null)[] }, from build_quote_regions.py
type RegionMap = Record<
  string,
  Record<string, (QuoteRegion | null)[]>
>;
const REGIONS_FILE = path.join(REVIEW_DATA, "quote_regions.json");

async function quoteRegions(): Promise<RegionMap> {
  try {
    return JSON.parse(await fs.readFile(REGIONS_FILE, "utf-8"));
  } catch {
    return {};
  }
}

// attach precomputed regions to an EVD's quotes (by role + index)
function withRegions(evd: AccuracyEvd, roles?: Record<string, (QuoteRegion | null)[]>): AccuracyEvd {
  if (!roles) return evd;
  const zip = (qs: Quote[], role: string): Quote[] =>
    qs.map((q, i) => ({ ...q, region: roles[role]?.[i] ?? null }));
  return {
    ...evd,
    imageRegion: roles["figure"]?.[0] ?? evd.imageRegion,
    quotes: zip(evd.quotes, "finding"),
    methods: evd.methods.map((p) => ({ ...p, quotes: zip(p.quotes, p.key) })),
  };
}

export interface LinkedClaim {
  id: string;
  title: string;
  polarity: "supports" | "opposes";
}

// Exact PDF location of a quote, precomputed by utils/build_quote_regions.py.
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
} // normalized 0..1
export interface QuoteRegion {
  page: number; // physical 1-based
  rects: Rect[];
}
export interface Quote {
  text: string;
  region: QuoteRegion | null; // null if PyMuPDF couldn't locate it
}

export interface MethodsPart {
  key: "what" | "how" | "who";
  label: string;
  summary: string;
  quotes: Quote[]; // the verbatim quote(s) grounding this assertion
}

export interface AccuracyEvd {
  id: string; // E-0061
  title: string;
  shortLabel?: string;
  description: string; // prose (image + quotes stripped out)
  image: string | null; // grounding figure/table crop, /attachments/...
  imageRegion: QuoteRegion | null; // exact PDF location of the figure/table caption
  quotes: Quote[]; // verbatim blockquotes from the Description
  methods: MethodsPart[]; // What / How / Who, each with its grounding quote(s)
  claims: LinkedClaim[]; // the CLM(s) this EVD supports/opposes
  otherNotes: string; // ## Other Notes (synthesis prose)
  caveats: string[];
  tags: string[];
  page: number | null; // PHYSICAL pdf page for the jump (mapped from the journal page)
}

export interface AccuracyPaper {
  citekey: string;
  title: string;
  author: string;
  year: string;
  doi: string;
  pubmedId: string;
  hasPdf: boolean;
  evds: AccuracyEvd[];
}

export interface AccuracyIndexEntry {
  citekey: string;
  title: string;
  evds: number;
  hasPdf: boolean;
}

// ── Markdown body parsing ────────────────────────────────────────────────────

function sections(body: string): Record<string, string> {
  // split on "## Header"
  const out: Record<string, string> = {};
  const parts = body.split(/^##\s+/m);
  for (const part of parts) {
    const nl = part.indexOf("\n");
    if (nl === -1) continue;
    const head = part.slice(0, nl).trim();
    out[head.toLowerCase()] = part.slice(nl + 1).trim();
  }
  return out;
}

const METHODS_HEADS: { key: MethodsPart["key"]; label: string }[] = [
  { key: "what", label: "What" },
  { key: "how", label: "How" },
  { key: "who", label: "Who" },
];

function methodsParts(methods: string): MethodsPart[] {
  const parts: MethodsPart[] = [];
  for (const { key, label } of METHODS_HEADS) {
    const re = new RegExp(
      `###\\s+${label}\\??\\s*\\n([\\s\\S]*?)(?=\\n###\\s+|$)`,
      "i",
    );
    const m = methods.match(re);
    if (!m) continue;
    const block = m[1];
    const summary = firstProse(block);
    const qs = quotes(block).map((t) => ({ text: t, region: null }));
    if (summary || qs.length) parts.push({ key, label, summary, quotes: qs });
  }
  return parts;
}

function firstProse(text: string): string {
  // first non-quote, non-image paragraph
  for (const block of text.split(/\n\s*\n/)) {
    const t = block.trim();
    if (t && !t.startsWith(">") && !t.startsWith("![")) {
      return t.replace(/\s+/g, " ");
    }
  }
  return "";
}

function quotes(text: string): string[] {
  // contiguous "> …" blocks → one quote each (keep the page citation)
  const out: string[] = [];
  let cur: string[] = [];
  for (const line of text.split("\n")) {
    if (line.trim().startsWith(">")) {
      cur.push(line.replace(/^\s*>\s?/, ""));
    } else if (cur.length) {
      out.push(cur.join(" ").replace(/\s+/g, " ").trim());
      cur = [];
    }
  }
  if (cur.length) out.push(cur.join(" ").replace(/\s+/g, " ").trim());
  return out.filter(Boolean);
}

function firstImage(text: string): string | null {
  const m = text.match(/!\[\]?\(([^)]+)\)/);
  return m ? m[1] : null;
}

function descriptionProse(text: string): string {
  // everything in Description that isn't the image or a blockquote
  return text
    .split("\n")
    .filter((l) => !l.trim().startsWith(">") && !l.trim().startsWith("!["))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function caveatList(text: string): string[] {
  return text
    .split(/\n(?=[-*]\s)/)
    .map((b) => b.replace(/^[-*]\s+/, "").replace(/\s+/g, " ").trim())
    .filter((b) => b.length > 0);
}

function pageFromQuote(q: string): number | null {
  const m = q.match(/p\.?\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}

// ── Assembly ─────────────────────────────────────────────────────────────────

export function buildEvd(
  node: GraphNode,
  nodes: Map<string, GraphNode>,
): AccuracyEvd {
  const secs = sections(node.body);
  const desc = secs["description"] ?? "";
  const methods = secs["methods context"] ?? "";
  const cav = secs["caveats"] ?? "";
  const other = secs["other notes"] ?? "";

  const claims: LinkedClaim[] = node.outgoing
    .filter((e) => e.edge === "supports" || e.edge === "opposes")
    .map((e) => {
      const target = nodes.get(e.to);
      return {
        id: e.to,
        title: target?.title ?? e.to,
        polarity: e.edge as "supports" | "opposes",
      };
    });

  const qs = quotes(desc).map((t) => ({ text: t, region: null }));

  return {
    id: node.id,
    title: node.title,
    shortLabel: node.shortLabel,
    description: descriptionProse(desc),
    image: firstImage(desc),
    imageRegion: null, // attached later, in accuracyPaper
    quotes: qs,
    methods: methodsParts(methods),
    claims,
    otherNotes: firstProse(other) ? other.replace(/\n{3,}/g, "\n\n").trim() : "",
    caveats: caveatList(cav),
    tags: [],
    page: qs.map((q) => pageFromQuote(q.text)).find((p) => p !== null) ?? null,
  };
}

// Some early EVD files are unfilled template stubs (e.g. E-0001..E-0007) — exclude
// them from review so reviewers never see placeholder boilerplate.
export function isTemplateStub(body: string): boolean {
  return (
    body.includes("Screenshots of key figure/table") ||
    body.includes("observable measures/data** were collected")
  );
}

function citekeyOf(node: GraphNode, nodes: Map<string, GraphNode>): string | null {
  const src = node.outgoing.find((e) => e.edge === "derivedFrom");
  if (!src) return null;
  return nodes.get(src.to)?.citekey ?? null;
}

async function evdsByCitekey(): Promise<Map<string, GraphNode[]>> {
  const g = loadGeneratedGraph();
  const map = new Map<string, GraphNode[]>();
  for (const node of g.byType.evidence) {
    if (isTemplateStub(node.body)) continue; // skip unfilled template stubs
    const ck = citekeyOf(node, g.nodes);
    if (!ck) continue;
    (map.get(ck) ?? map.set(ck, []).get(ck)!).push(node);
  }
  return map;
}

export async function accuracyIndex(): Promise<AccuracyIndexEntry[]> {
  const g = loadGeneratedGraph();
  const byCk = await evdsByCitekey();
  return Promise.all(
    ACCURACY_BATCH.map(async (ck) => {
      const src = g.byType.source.find((s) => s.citekey === ck);
      return {
        citekey: ck,
        title: src?.title ?? ck,
        evds: (byCk.get(ck) ?? []).filter((n) => isCurated(n.title)).length,
        hasPdf: await pdfExists(ck),
      };
    }),
  );
}

export async function accuracyPaper(
  citekey: string,
): Promise<AccuracyPaper | null> {
  if (!ACCURACY_BATCH.includes(citekey)) return null;
  const g = loadGeneratedGraph();
  const src = g.byType.source.find((s) => s.citekey === citekey);
  const byCk = await evdsByCitekey();
  const evdNodes = byCk.get(citekey) ?? [];
  if (!src && evdNodes.length === 0) return null;

  const [pages, regions] = await Promise.all([physicalPages(), quoteRegions()]);
  const evds = evdNodes
    .filter((n) => isCurated(n.title))
    .map((n) => buildEvd(n, g.nodes))
    .map((e) => ({ ...e, page: pages[e.id] ?? e.page }))
    .map((e) => withRegions(e, regions[e.id]))
    .sort((a, b) => a.id.localeCompare(b.id));

  return {
    citekey,
    title: src?.title ?? citekey,
    author: src?.author ?? "",
    year: src?.year ?? "",
    doi: src?.doi ?? "",
    pubmedId: src?.pubmedId ?? "",
    hasPdf: await pdfExists(citekey),
    evds,
  };
}

// "Available" = local file (dev) OR production (served from Supabase Storage; the
// PdfPane shows its own graceful error if the route can't find it).
export async function pdfExists(citekey: string): Promise<boolean> {
  if (process.env.NODE_ENV === "production") return true;
  try {
    await fs.access(path.join(PDFS, `${citekey}.pdf`));
    return true;
  } catch {
    return false;
  }
}
