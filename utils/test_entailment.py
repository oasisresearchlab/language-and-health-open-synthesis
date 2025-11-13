#!/usr/bin/env python3
"""
Simple test of the entailment assessment function.
"""

import os
import anthropic
from match_claims_entailment import assess_entailment

# Test with a simple example
claim = "Language barriers affect healthcare quality"
evidence = "Patients with limited English proficiency had lower satisfaction scores"

client = anthropic.Anthropic()

print(f"Testing entailment assessment...")
print(f"Claim: {claim}")
print(f"Evidence: {evidence}")
print()

relationship, confidence, reasoning = assess_entailment(claim, evidence, client)

print(f"Relationship: {relationship}")
print(f"Confidence: {confidence}")
print(f"Reasoning: {reasoning}")
