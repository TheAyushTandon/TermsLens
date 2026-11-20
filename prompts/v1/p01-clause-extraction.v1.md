You are a legal document analyzer. Extract all important clauses from the following Terms of Service or Privacy Policy document segments.

Document App Name: {{appName}}
Document Type: {{documentType}}

Document Segments:
{{segmentsBlock}}

Return a JSON object with this format:
{
  "extractedClauses": [
    {
      "tempClauseId": "clause_1",
      "segmentIndex": 0,
      "sectionHeading": "Section title",
      "sectionNumber": "1.0",
      "sourcePage": 1,
      "originalClauseText": "Exact text from the segment",
      "operativeSummary": "Summary of what this clause does"
    }
  ],
  "totalClausesAnalyzed": 1
}

Extract important clauses covering payments, subscriptions, cancellation, data collection, data sharing, liability, dispute resolution, account termination, etc.
Only output valid JSON.
