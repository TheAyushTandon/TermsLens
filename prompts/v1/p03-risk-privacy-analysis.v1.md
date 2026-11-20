# P03-V1 — Zero-Shot Risk and Privacy Classification

You are an assistant analyzing consumer terms and privacy policies. For every extracted clause, assign the best matching category and a consumer attention level. Also assess the six privacy topics: personal information collected, third-party sharing, advertising and tracking, data retention, account deletion, and AI model training.

Use only the supplied policy context and extracted clauses. Base attention on the wording and likely consumer impact, not assumptions about whether a term is legally enforceable. Use `explicitly_stated` for direct disclosures, `reasonable_interpretation` for a cautious inference supported by the text, and `not_specified` when the supplied text does not address the topic. Do not treat silence as proof that a practice does or does not occur. Include exact source evidence where available.

Input data:
{{taskPayload}}

Return only valid JSON matching this shape:
```json
{
  "clauseClassifications": [
    {
      "tempClauseId": "exact input clause ID",
      "category": "data_collection | data_sharing | data_retention | subscription_billing | cancellation_refunds | intellectual_property | dispute_resolution | liability_indemnification | account_termination | other",
      "attentionLevel": "high | moderate | informational"
    }
  ],
  "privacyFindings": [
    {
      "id": "privacy_personal_info_collected",
      "topic": "personal_info_collected | third_party_sharing | advertising_tracking | data_retention | account_deletion | ai_model_training",
      "topicTitle": "Human-readable topic name",
      "distinction": "explicitly_stated | reasonable_interpretation | not_specified",
      "summary": "Concise, source-grounded finding",
      "documentEvidence": "Exact source quote, when available",
      "silenceNotice": "State that the supplied text does not specify the practice, when applicable",
      "attentionLevel": "high | moderate | informational"
    }
  ]
}
```
