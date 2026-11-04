import type {
  DocumentAnalysis,
  ConsumerStats,
  UserProfile,
  DemonstrationFixture,
} from "../types/index.ts";

export const currentUserMock: UserProfile = {
  id: "usr_consumer_01",
  name: "Alex Vance",
  email: "alex.vance@gmail.com",
};

export const consumerStatsMock: ConsumerStats = {
  documentsAnalyzed: 6,
  clausesRequiringAttention: 13,
  privacyRelatedFindings: 17,
  readingTimeSavedMinutes: 140,
  isDemoData: true,
  deltas: {
    documentsAnalyzed: "6 sample records loaded",
    clausesRequiringAttention: "Calculated from demonstration data",
    privacyRelatedFindings: "Tracking & data sharing flags",
    readingTimeSaved: "~2.3 hours estimated",
  },
};

export const emptyStatsMock: ConsumerStats = {
  documentsAnalyzed: 0,
  clausesRequiringAttention: 0,
  privacyRelatedFindings: 0,
  readingTimeSavedMinutes: 0,
  isDemoData: false,
  deltas: {
    documentsAnalyzed: "No documents uploaded yet",
    clausesRequiringAttention: "0 issues flagged",
    privacyRelatedFindings: "No data practices recorded",
    readingTimeSaved: "0 mins",
  },
};

export const mockAnalyses: DocumentAnalysis[] = [
  {
    id: "doc_demo_spotify_01",
    title: "Terms of Service (Illustrative Sample)",
    appName: "Spotify",
    domain: "spotify.com",
    documentType: "terms_of_service",
    status: "completed",
    riskScore: 68,
    riskLevel: "medium",
    clausesCount: 34,
    flaggedClausesCount: 3,
    privacyFindingsCount: 6,
    isDemonstrationFixture: true,
    illustrativeNotice:
      "This is illustrative demonstration content, not the actual official policy of Spotify.",
    summary:
      "Demonstration review: Identifies mandatory individual arbitration for US subscribers, automatic recurring subscription billing, and third-party commercial partner disclosures.",
    createdAt: "2026-11-02T14:30:00Z",
    estimatedReadingTimeMinutes: 26,
    timeSavedMinutes: 23,
    findings: [
      {
        id: "cl_sp_1",
        category: "arbitration",
        title: "Mandatory Individual Arbitration",
        riskLevel: "medium",
        excerpt:
          "You and Spotify agree that any dispute, claim, or controversy between you and Spotify... will be determined by mandatory binding individual (not class) arbitration. THERE IS NO JUDGE OR JURY IN ARBITRATION, AND COURT REVIEW OF AN ARBITRATION AWARD IS LIMITED.",
        explanation:
          "Disputes must be arbitrated privately and individually rather than in open court. The provided excerpt contains no jury trial rights and does not state an opt-out procedure.",
        recommendation:
          "The supplied clause does not state an opt-out right or deadline. Verify in the complete policy whether opt-out terms exist before agreeing.",
      },
      {
        id: "cl_sp_2",
        category: "auto_renewal",
        title: "Continuous Subscription Billing",
        riskLevel: "medium",
        excerpt:
          "Your paid subscription automatically renews each month unless cancelled before your monthly billing renewal date.",
        explanation:
          "Subscription charges continue automatically without prior notification before each recurring transaction.",
        recommendation: "Review your account billing settings to check your upcoming payment date.",
      },
    ],
  },
  {
    id: "doc_demo_instagram_02",
    title: "Privacy Policy (Illustrative Sample)",
    appName: "Instagram",
    domain: "instagram.com",
    documentType: "privacy_policy",
    status: "completed",
    riskScore: 84,
    riskLevel: "high",
    clausesCount: 52,
    flaggedClausesCount: 5,
    privacyFindingsCount: 4,
    isDemonstrationFixture: true,
    illustrativeNotice:
      "This is illustrative demonstration content, not the actual official policy of Instagram.",
    summary:
      "Demonstration review: Highlights cross-platform behavioral advertising tracking, device telemetry ingestion, and broad sublicensing permissions for user media uploads.",
    createdAt: "2026-10-30T11:15:00Z",
    estimatedReadingTimeMinutes: 35,
    timeSavedMinutes: 31,
    findings: [
      {
        id: "cl_ig_1",
        category: "content_rights",
        title: "Sub-licensable Royalty-Free Media License",
        riskLevel: "high",
        excerpt:
          "You grant us a non-exclusive, royalty-free, transferable, sub-licensable, worldwide license to host, use, distribute, modify, run, copy, publicly perform or display your content.",
        explanation:
          "While you retain ownership, the service can sublicense your uploaded photos and videos to affiliated networks without payment.",
        recommendation: "Avoid uploading proprietary or confidential creative work without watermarks.",
      },
      {
        id: "cl_ig_2",
        category: "third_party_sharing",
        title: "Cross-App Activity Tracking",
        riskLevel: "high",
        excerpt:
          "We receive and log information from third-party partners and advertisers about your activities outside of Instagram.",
        explanation:
          "Your browsing history on partner apps is linked to your Instagram profile to personalize advertisements.",
        recommendation: "Toggle off off-platform ad tracking in your account privacy settings.",
      },
    ],
  },
  {
    id: "doc_demo_discord_03",
    title: "Community Terms of Service (Illustrative Sample)",
    appName: "Discord",
    domain: "discord.com",
    documentType: "other",
    status: "completed",
    riskScore: 58,
    riskLevel: "medium",
    clausesCount: 38,
    flaggedClausesCount: 2,
    privacyFindingsCount: 1,
    isDemonstrationFixture: true,
    illustrativeNotice:
      "This is illustrative demonstration content, not the actual official policy of Discord.",
    summary:
      "Demonstration review: Confirms chat message ownership remains with users. Automated moderation tools scan content across public servers, and arbitration applies to US accounts.",
    createdAt: "2026-10-27T09:45:00Z",
    estimatedReadingTimeMinutes: 24,
    timeSavedMinutes: 21,
    findings: [
      {
        id: "cl_dc_1",
        category: "arbitration",
        title: "Individual Binding Arbitration Waiver",
        riskLevel: "medium",
        excerpt:
          "Any dispute between you and Discord will be resolved by binding individual arbitration, and you waive rights to a court trial.",
        explanation:
          "Claims must be heard by private arbitrators instead of conventional civil courts.",
        recommendation: "Opt-out is available by sending an email notice within 30 days of registration.",
      },
      {
        id: "cl_dc_2",
        category: "data_collection",
        title: "Automated Safety Content Scanning",
        riskLevel: "low",
        excerpt:
          "Automated systems scan message text and attachments to detect spam, malicious files, and community violations.",
        explanation:
          "Server uploads are checked automatically to keep public communities secure from abuse.",
        recommendation: "Standard across chat platforms; use encrypted channels for sensitive credentials.",
      },
    ],
  },
  {
    id: "doc_demo_netflix_04",
    title: "Subscription Agreement (Illustrative Sample)",
    appName: "Netflix",
    domain: "netflix.com",
    documentType: "subscription_agreement",
    status: "completed",
    riskScore: 48,
    riskLevel: "low",
    clausesCount: 29,
    flaggedClausesCount: 2,
    privacyFindingsCount: 1,
    isDemonstrationFixture: true,
    illustrativeNotice:
      "This is illustrative demonstration content, not the actual official policy of Netflix.",
    summary:
      "Demonstration review: Details monthly automatic renewal procedures, single-household device viewing rules, and straightforward online membership cancellation.",
    createdAt: "2026-10-22T16:20:00Z",
    estimatedReadingTimeMinutes: 20,
    timeSavedMinutes: 18,
    findings: [
      {
        id: "cl_nf_1",
        category: "auto_renewal",
        title: "Automatic Monthly Billing Cycle",
        riskLevel: "medium",
        excerpt:
          "Your membership will automatically renew monthly until cancelled. You must cancel before renewal to avoid the next billing period.",
        explanation:
          "Fees renew automatically each month; cancel at least 24 hours prior to the cycle date to avoid renewals.",
        recommendation: "Set a calendar reminder if testing a trial or short-term subscription.",
      },
      {
        id: "cl_nf_2",
        category: "liability",
        title: "Household Device Restrictions",
        riskLevel: "low",
        excerpt:
          "The service and content are for your personal use only and may not be shared with individuals outside your primary household.",
        explanation:
          "Network telemetry and device identifiers are used to restrict password sharing beyond your residence.",
        recommendation: "Add an extra member profile if sharing access with family living elsewhere.",
      },
    ],
  },
  {
    id: "doc_demo_duolingo_05",
    title: "End User Licence Agreement (Illustrative Sample)",
    appName: "Duolingo",
    domain: "duolingo.com",
    documentType: "eula",
    status: "completed",
    riskScore: 32,
    riskLevel: "safe",
    clausesCount: 25,
    flaggedClausesCount: 0,
    privacyFindingsCount: 0,
    isDemonstrationFixture: true,
    illustrativeNotice:
      "This is illustrative demonstration content, not the actual official policy of Duolingo.",
    summary:
      "Demonstration review: Clear, consumer-friendly mobile application license. Speech practice audio recordings are used solely for pronunciation scoring and are not sold to third parties.",
    createdAt: "2026-10-18T13:10:00Z",
    estimatedReadingTimeMinutes: 15,
    timeSavedMinutes: 13,
    findings: [
      {
        id: "cl_duo_1",
        category: "data_collection",
        title: "Pronunciation Audio Processing",
        riskLevel: "safe",
        excerpt:
          "Microphone audio is processed strictly to grade spoken language exercises and improve pronunciation scoring accuracy.",
        explanation:
          "Voice clips are not monetized or sold to data brokers.",
        recommendation: "You can turn off microphone permissions in app settings at any time.",
      },
    ],
  },
  {
    id: "doc_demo_github_06",
    title: "Developer Terms of Service (Illustrative Sample)",
    appName: "GitHub",
    domain: "github.com",
    documentType: "terms_of_service",
    status: "completed",
    riskScore: 38,
    riskLevel: "low",
    clausesCount: 32,
    flaggedClausesCount: 1,
    privacyFindingsCount: 1,
    isDemonstrationFixture: true,
    illustrativeNotice:
      "This is illustrative demonstration content, not the actual official policy of GitHub.",
    summary:
      "Demonstration review: Strong intellectual property protections for developers. GitHub claims no ownership over user code repositories. Transparent data portability and export policies.",
    createdAt: "2026-10-14T10:05:00Z",
    estimatedReadingTimeMinutes: 22,
    timeSavedMinutes: 19,
    findings: [
      {
        id: "cl_gh_1",
        category: "content_rights",
        title: "Developer Code Ownership Retained",
        riskLevel: "safe",
        excerpt:
          "We claim no intellectual property rights over the material you provide to the Service. Your profile and materials uploaded remain yours.",
        explanation:
          "You retain 100% copyright ownership of code repositories uploaded to GitHub.",
        recommendation: "Ensure appropriate open-source licenses (MIT, Apache) are attached to public repos.",
      },
      {
        id: "cl_gh_2",
        category: "liability",
        title: "Anonymous Telemetry & Feature Aggregation",
        riskLevel: "low",
        excerpt:
          "We may collect anonymized telemetry and feature usage statistics to optimize service performance.",
        explanation:
          "General aggregated usage patterns are gathered to improve application reliability.",
        recommendation: "Standard developer telemetry; no private code contents are shared.",
      },
    ],
  },
];

export const demonstrationFixtures: Record<string, DemonstrationFixture> = {
  spotify: {
    id: "fixture_spotify",
    appName: "Spotify",
    documentType: "terms_of_service",
    title: "Spotify Terms of Service (Sample Demonstration Fixture)",
    text: `SPOTIFY TERMS OF SERVICE (ILLUSTRATIVE DEMONSTRATION FIXTURE)
1. Introduction. By using the Spotify service, you accept these terms.
2. Mandatory Individual Arbitration. You agree that any dispute between you and Spotify shall be resolved by mandatory binding individual arbitration rather than court litigation. There is no judge or jury in arbitration, and court review of an arbitration award is limited.
3. Subscription Renewal. Paid subscriptions automatically renew monthly unless cancelled before your billing renewal date.
4. Third-Party Partners. We coordinate with commercial partners to provide streaming content and features.`,
    preanalyzedReport: mockAnalyses[0],
  },
  instagram: {
    id: "fixture_instagram",
    appName: "Instagram",
    documentType: "privacy_policy",
    title: "Instagram Privacy Policy (Sample Demonstration Fixture)",
    text: `INSTAGRAM PRIVACY POLICY (ILLUSTRATIVE DEMONSTRATION FIXTURE)
1. Information We Collect. We gather information about how you use our services and content you view.
2. Royalty-Free Media License. You grant Meta a non-exclusive, royalty-free, transferable, sub-licensable, worldwide license to host, use, distribute, modify, and display your media uploads.
3. Advertising Network Sharing. We share identifiers and usage patterns with third-party advertising exchanges to deliver tailored sponsored content.
4. Cross-App Telemetry. We receive information from advertisers and partners about your activity on other apps and websites.`,
    preanalyzedReport: mockAnalyses[1],
  },
  discord: {
    id: "fixture_discord",
    appName: "Discord",
    documentType: "other",
    title: "Discord Community Terms of Service (Sample Demonstration Fixture)",
    text: `DISCORD COMMUNITY TERMS OF SERVICE (ILLUSTRATIVE DEMONSTRATION FIXTURE)
1. User Content. You retain ownership of chat messages and multimedia you post to the Discord service.
2. Automated Safety Scanning. We deploy automated safety tooling to monitor and evaluate content across public servers to prevent spam and harassment.
3. Binding Arbitration. Any dispute between you and Discord will be resolved through individual binding arbitration before the AAA, and you waive class action rights.
4. 30-Day Opt-Out. You may opt out of the arbitration provision within 30 days of registration by emailing dispute-optout@discord.com.`,
    preanalyzedReport: mockAnalyses[2],
  },
};
