import type {
  AnalysisReport,
  Clause,
  PrivacyFinding,
  DocumentType,
} from "../types/index.ts";

export const mockReports: Record<string, AnalysisReport> = {
  doc_demo_spotify_01: {
    id: "doc_demo_spotify_01",
    appName: "Spotify",
    documentTitle: "Spotify Terms and Conditions of Use",
    documentType: "terms_of_service",
    analysisDate: "2026-11-02T14:30:00Z",
    isDemonstrationFixture: true,
    demonstrationNotice:
      "This is illustrative demonstration content, not the actual official policy of Spotify.",
    documentSummary:
      "Governs individual consumer access to the Spotify music and podcast streaming service. Sets conditions for free ad-supported tiers, monthly automatic subscription renewal, intellectual property licenses, and dispute resolution via mandatory private arbitration.",
    totalClausesAnalyzed: 34,
    highAttentionCount: 1,
    moderateAttentionCount: 2,
    informationalCount: 3,
    executiveSummary: {
      documentOverview:
        "This agreement defines the legal relationship between Spotify and individual listeners. It explains rules for account creation, payment for Premium tiers, device restrictions, and remedies available if a dispute arises.",
      mainObligations: [
        "Pay recurring monthly subscription fees until you explicitly cancel in your account settings prior to your billing date.",
        "Use streaming content strictly for personal, non-commercial listening without unauthorized ripping or offline capture.",
        "Keep account credentials confidential and refrain from sharing login credentials outside your authorized household plan.",
      ],
      companyPermissions: [
        "Deliver personalized audio and visual advertising based on your listening habits and approximate device location.",
        "Remotely modify, suspend, or discontinue specific tracks, playlists, or platform features without prior individual notice.",
        "Audit playback streams to identify automated bot listening, abnormal skipping patterns, or unauthorized third-party apps.",
      ],
      majorAttentionAreas: [
        "Dispute Resolution: Requires binding individual arbitration under American Arbitration Association rules and waives jury trials. (No opt-out procedure is mentioned in this excerpt).",
        "Automatic Billing: Renews subscriptions automatically every month without separate email notices before each charge.",
        "Unilateral Revisions: Spotify may update terms with notice posted on its website; continued playback constitutes acceptance.",
      ],
      preAgreementChecklist: [
        "Check your monthly renewal date and understand that cancellation takes effect at the end of the current billing cycle.",
        "Check Spotify's complete dispute resolution terms if you wish to determine whether an opt-out right or deadline is provided, as no opt-out procedure is stated in this excerpt.",
        "Review your account privacy preferences to opt out of third-party advertising partner tracking.",
      ],
    },
    clauses: [
      {
        id: "cl_sp_arb",
        title: "Mandatory Individual Binding Arbitration",
        shortExplanation:
          "You give up the right to take disputes to a conventional court or participate in a class-action lawsuit. No opt-out procedure is stated in this excerpt.",
        category: "dispute_resolution",
        attentionLevel: "high",
        originalClauseText:
          "24.1 Dispute Resolution and Arbitration. You and Spotify agree that any dispute, claim, or controversy between you and Spotify arising in connection with or relating in any way to these Agreements or to your relationship with Spotify as a user of the Service (whether based in contract, tort, statute, fraud, misrepresentation, or any other legal theory, and whether the claims arise during or after the termination of the Agreements) will be determined by mandatory binding individual (not class) arbitration. You and Spotify further agree that the arbitrator shall have the exclusive power to rule on his or her own jurisdiction, including any objections with respect to the existence, scope or validity of the Arbitration Agreement or to the arbitrability of any claim or counterclaim. Arbitration is more informal than a lawsuit in court. THERE IS NO JUDGE OR JURY IN ARBITRATION, AND COURT REVIEW OF AN ARBITRATION AWARD IS LIMITED.",
        evidence: {
          id: "ev_sp_arb",
          sectionHeading: "Section 24.1 — Dispute Resolution and Arbitration",
          sectionNumber: "24.1",
          sourcePage: 16,
          sourceReferenceText: "Section 24.1 (Page 16)",
          exactQuote:
            "any dispute, claim, or controversy between you and Spotify... will be determined by mandatory binding individual (not class) arbitration... THERE IS NO JUDGE OR JURY IN ARBITRATION, AND COURT REVIEW OF AN ARBITRATION AWARD IS LIMITED.",
          highlightExcerpt:
            "mandatory binding individual (not class) arbitration. THERE IS NO JUDGE OR JURY IN ARBITRATION",
        },
        analysis: {
          plainLanguageExplanation:
            "If Spotify overcharges you or violates your contract, you cannot sue them in an ordinary civil court with a judge and jury, nor can you join other customers in a joint class-action lawsuit. Instead, the dispute must be heard privately before an arbitrator. The provided excerpt contains no mention of an opt-out procedure, deadline, or mailing address.",
          whyThisClauseMatters:
            "Individual private arbitration is confidential and eliminates access to a court jury trial. Importantly, this excerpt does not state an opt-out right or procedure, so consumers should not assume one is available without consulting Spotify's complete agreement.",
          potentialUserImplications: [
            "You cannot sue Spotify before a jury trial in open civil court.",
            "You cannot band together with other consumers if thousands of people suffer the same overbilling bug.",
            "Arbitration decisions are final with almost zero opportunity to appeal.",
            "No opt-out mechanism, deadline, or mailing address is stated in the provided excerpt.",
          ],
          attentionLevel: "high",
          category: "dispute_resolution",
          actionableAdvice:
            "The provided excerpt does not mention an opt-out right or procedure. Check Spotify's full terms or dispute resolution section to verify whether an arbitration opt-out procedure exists before agreeing.",
        },
        verification: {
          status: "supported",
          reviewerType: "simulated_reviewer",
          notes:
            "Audited against Section 24.1 verbatim text. Finding accurately describes the individual arbitration waiver and class action prohibition. The excerpt contains no opt-out procedure or mailing address, and the analysis correctly refrains from claiming one.",
          verifiedAt: "2026-11-02T14:35:00Z",
          evidenceMatchesOriginal: true,
          simulatedAuditOutcome:
            "Audit verified: Quoted excerpt matches paragraph 1 of Section 24.1 verbatim. No opt-out mechanism is asserted or stated.",
        },
      },
      {
        id: "cl_sp_bill",
        title: "Continuous Automatic Subscription Renewal",
        shortExplanation:
          "Paid plans automatically charge your payment method every month without prior reminder notices.",
        category: "subscription_billing",
        attentionLevel: "moderate",
        originalClauseText:
          "8.2 Continuous Subscription. If you purchase a Paid Subscription, your subscription will automatically renew at the end of the applicable subscription period, unless you cancel your Paid Subscription before the end of the then-current subscription period. The cancellation will take effect the day after the last day of the current subscription period, and you will be downgraded to the Free Service. We do not provide refunds or credits for any partial subscription periods.",
        evidence: {
          id: "ev_sp_bill",
          sectionHeading: "Section 8.2 — Continuous Subscription and Renewal",
          sectionNumber: "8.2",
          sourcePage: 7,
          sourceReferenceText: "Section 8.2 (Page 7)",
          exactQuote:
            "your subscription will automatically renew at the end of the applicable subscription period, unless you cancel your Paid Subscription before the end of the then-current subscription period... We do not provide refunds or credits for any partial subscription periods.",
          highlightExcerpt:
            "subscription will automatically renew at the end of the applicable subscription period, unless you cancel... We do not provide refunds or credits for any partial subscription periods.",
        },
        analysis: {
          plainLanguageExplanation:
            "When you enter your credit card or PayPal details, Spotify will charge you automatically every single month on your billing date until you navigate to your account settings and hit cancel. Canceling stops future renewals but will not refund days already charged.",
          whyThisClauseMatters:
            "Many consumers assume they will receive an email reminder before their card is charged, especially after promotional trials.",
          potentialUserImplications: [
            "Credit card or PayPal is billed automatically each billing cycle.",
            "No pro-rated refunds if you cancel mid-month; service simply runs until cycle end.",
            "If a free trial expires, it rolls over into a paid monthly subscription automatically.",
          ],
          attentionLevel: "moderate",
          category: "subscription_billing",
          actionableAdvice:
            "Set a calendar reminder for 2 days prior to your monthly renewal date if you are evaluating a trial or promotional rate.",
        },
        verification: {
          status: "supported",
          reviewerType: "simulated_reviewer",
          notes:
            "Cross-referenced with Section 8.2. Text confirms automatic monthly charges and no partial refunds policy.",
          verifiedAt: "2026-11-02T14:36:12Z",
          evidenceMatchesOriginal: true,
          simulatedAuditOutcome:
            "Audit verified: Section 8.2 matches renewal and cancellation terms verbatim.",
        },
      },
      {
        id: "cl_sp_mods",
        title: "Unilateral Catalog and Feature Modifications",
        shortExplanation:
          "Spotify can remove songs, albums, playlists, or app features without offering compensation.",
        category: "cancellation_refunds",
        attentionLevel: "moderate",
        originalClauseText:
          "6.3 Content Availability. Spotify makes reasonable efforts to keep the Spotify Service operational. However, certain technical difficulties, maintenance, testing, or updates required to reflect changes in relevant laws and regulatory requirements may, from time to time, result in temporary interruptions. Spotify reserves the right, periodically and at any time, to modify or discontinue, temporarily or permanently, functions and features of the Spotify Service, with advance notice where possible, all without liability to you.",
        evidence: {
          id: "ev_sp_mods",
          sectionHeading: "Section 6.3 — Content Availability and Service Changes",
          sectionNumber: "6.3",
          sourcePage: 5,
          sourceReferenceText: "Section 6.3 (Page 5)",
          exactQuote:
            "Spotify reserves the right, periodically and at any time, to modify or discontinue, temporarily or permanently, functions and features of the Spotify Service, with advance notice where possible, all without liability to you.",
          highlightExcerpt:
            "modify or discontinue, temporarily or permanently, functions and features of the Spotify Service... all without liability to you.",
        },
        analysis: {
          plainLanguageExplanation:
            "Your subscription pays for access to the service as it exists today, but you do not own any songs or podcasts. Music labels or Spotify can pull songs, remove downloaded tracks, or eliminate features at any point without reimbursing you.",
          whyThisClauseMatters:
            "Users building extensive libraries should understand that streaming is a temporary revocable license, not permanent ownership.",
          potentialUserImplications: [
            "Tracks saved in your playlists may disappear if licensing agreements between Spotify and artists expire.",
            "Features like DJ, lyrics sync, or high-fidelity audio tiers can change without contract breach.",
          ],
          attentionLevel: "moderate",
          category: "cancellation_refunds",
          actionableAdvice:
            "Export playlist metadata or maintain backups if you require permanent records of your music curation.",
        },
        verification: {
          status: "supported",
          reviewerType: "simulated_reviewer",
          notes:
            "Section 6.3 explicitly disclaims liability for modified or discontinued features.",
          verifiedAt: "2026-11-02T14:37:00Z",
          evidenceMatchesOriginal: true,
          simulatedAuditOutcome:
            "Audit verified: Textual alignment confirmed for service alteration disclaimers.",
        },
      },
      {
        id: "cl_sp_ip",
        title: "User Playlists and Feedback License",
        shortExplanation:
          "You grant Spotify a royalty-free license to use playlist titles, cover art, and feedback you create.",
        category: "intellectual_property",
        attentionLevel: "informational",
        originalClauseText:
          "11.1 User Content. When you create or submit playlists, playlist titles, playlist cover images, comments, or feedback, you grant Spotify a non-exclusive, transferable, sub-licensable, royalty-free, fully paid, irrevocable, worldwide license to reproduce, make available, perform and display, translate, modify, and distribute your User Content through any medium.",
        evidence: {
          id: "ev_sp_ip",
          sectionHeading: "Section 11.1 — User Content License",
          sectionNumber: "11.1",
          sourcePage: 9,
          sourceReferenceText: "Section 11.1 (Page 9)",
          exactQuote:
            "you grant Spotify a non-exclusive, transferable, sub-licensable, royalty-free, fully paid, irrevocable, worldwide license to reproduce, make available, perform and display, translate, modify, and distribute your User Content through any medium.",
          highlightExcerpt:
            "grant Spotify a non-exclusive, transferable, sub-licensable, royalty-free, fully paid, irrevocable, worldwide license to reproduce",
        },
        analysis: {
          plainLanguageExplanation:
            "If you create a public playlist, upload a playlist photo, or suggest a feature, Spotify can display it across their apps, promotional materials, or social media channels without paying royalties or requiring extra consent.",
          whyThisClauseMatters:
            "Standard practice for social curation platforms so the service can render public content to other subscribers.",
          potentialUserImplications: [
            "Public playlist titles and descriptions can be promoted publicly.",
            "Product suggestions or feedback become Spotify property without compensation.",
          ],
          attentionLevel: "informational",
          category: "intellectual_property",
          actionableAdvice:
            "Mark sensitive personal playlists as Private in app settings if you do not want public sharing.",
        },
        verification: {
          status: "supported",
          reviewerType: "simulated_reviewer",
          notes:
            "Matches Section 11.1 user-generated content licensing permissions.",
          verifiedAt: "2026-11-02T14:38:15Z",
          evidenceMatchesOriginal: true,
          simulatedAuditOutcome:
            "Audit verified: Verbatim match confirmed with Section 11.1.",
        },
      },
      {
        id: "cl_sp_term",
        title: "Account Suspension for Terms Violation",
        shortExplanation:
          "Spotify may suspend or terminate your account immediately if they suspect unauthorized use.",
        category: "account_termination",
        attentionLevel: "informational",
        originalClauseText:
          "19.2 Termination by Spotify. Spotify may terminate these Agreements or suspend your access to the Spotify Service at any time, including in the event of your actual or suspected unauthorized use of the Spotify Service and/or Content, non-compliance with the Agreements, or if we withdraw the Spotify Service.",
        evidence: {
          id: "ev_sp_term",
          sectionHeading: "Section 19.2 — Termination by Spotify",
          sectionNumber: "19.2",
          sourcePage: 13,
          sourceReferenceText: "Section 19.2 (Page 13)",
          exactQuote:
            "Spotify may terminate these Agreements or suspend your access to the Spotify Service at any time, including in the event of your actual or suspected unauthorized use of the Spotify Service",
          highlightExcerpt:
            "suspend your access to the Spotify Service at any time, including in the event of your actual or suspected unauthorized use",
        },
        analysis: {
          plainLanguageExplanation:
            "If automated anti-fraud or bot detection systems flag your account (e.g., using unauthorized audio downloaders or ad-blocking tools), Spotify can disable your login without refunding remaining subscription days.",
          whyThisClauseMatters:
            "Accounts using third-party modified APKs or download scrapers risk permanent library loss.",
          potentialUserImplications: [
            "Use of modified clients or ad-blockers can lead to permanent account deactivation.",
            "Saved playlists and followers tied to that username cannot be recovered once purged.",
          ],
          attentionLevel: "informational",
          category: "account_termination",
          actionableAdvice:
            "Use only official Spotify applications from authorized mobile and desktop stores.",
        },
        verification: {
          status: "supported",
          reviewerType: "simulated_reviewer",
          notes:
            "Verbatim alignment with Section 19.2 regarding termination rights.",
          verifiedAt: "2026-11-02T14:39:10Z",
          evidenceMatchesOriginal: true,
          simulatedAuditOutcome:
            "Audit verified: Quoted language matches Section 19.2.",
        },
      },
      {
        id: "cl_sp_liab",
        title: "Limitation of Liability Cap",
        shortExplanation:
          "Spotify limits its maximum financial damages to the amount you paid in the preceding 12 months.",
        category: "liability_indemnification",
        attentionLevel: "informational",
        originalClauseText:
          "22.1 Limitation of Liability. TO THE FULLEST EXTENT PERMITTED BY LAW, IN NO EVENT WILL SPOTIFY, ITS OFFICERS, SHAREHOLDERS, EMPLOYEES, AGENTS, DIRECTORS, SUBSIDIARIES, AFFILIATES, SUCCESSORS, ASSIGNS, SUPPLIERS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, SPECIAL, INCIDENTAL, PUNITIVE, EXEMPLARY, OR CONSEQUENTIAL DAMAGES. SPOTIFY'S TOTAL AGGREGATE LIABILITY UNDER THESE AGREEMENTS SHALL NOT EXCEED THE GREATER OF (A) AMOUNTS ACTUALLY PAID BY YOU IN THE TWELVE MONTHS PRIOR TO THE CLAIM, OR (B) TWENTY-FIVE DOLLARS ($25.00).",
        evidence: {
          id: "ev_sp_liab",
          sectionHeading: "Section 22.1 — Limitation of Liability",
          sectionNumber: "22.1",
          sourcePage: 15,
          sourceReferenceText: "Section 22.1 (Page 15)",
          exactQuote:
            "SPOTIFY'S TOTAL AGGREGATE LIABILITY UNDER THESE AGREEMENTS SHALL NOT EXCEED THE GREATER OF (A) AMOUNTS ACTUALLY PAID BY YOU IN THE TWELVE MONTHS PRIOR TO THE CLAIM, OR (B) TWENTY-FIVE DOLLARS ($25.00).",
          highlightExcerpt:
            "TOTAL AGGREGATE LIABILITY... SHALL NOT EXCEED THE GREATER OF (A) AMOUNTS ACTUALLY PAID BY YOU IN THE TWELVE MONTHS PRIOR... OR (B) TWENTY-FIVE DOLLARS",
        },
        analysis: {
          plainLanguageExplanation:
            "Even if Spotify suffers a service breakdown, data breach, or device crash that causes you monetary damages, you cannot recover more than the amount of subscription fees you paid over the past 12 months (or $25 for free accounts).",
          whyThisClauseMatters:
            "Standard tech liability exclusion, capping financial recovery for consumer accounts.",
          potentialUserImplications: [
            "Free users are capped at a maximum recovery of $25.",
            "Subscribers can recover at most one year of subscription fees.",
          ],
          attentionLevel: "informational",
          category: "liability_indemnification",
          actionableAdvice:
            "Do not rely on consumer streaming accounts for mission-critical commercial audio broadcasts.",
        },
        verification: {
          status: "supported",
          reviewerType: "simulated_reviewer",
          notes:
            "Section 22.1 financial cap verified against California commercial standard wording.",
          verifiedAt: "2026-11-02T14:40:02Z",
          evidenceMatchesOriginal: true,
          simulatedAuditOutcome:
            "Audit verified: Exact liability cap wording matches Section 22.1.",
        },
      },
    ],
    privacyFindings: [
      {
        id: "priv_sp_1",
        topic: "personal_info_collected",
        topicTitle: "Personal Information Collected",
        distinction: "explicitly_stated",
        summary:
          "Collects registration info (email address, date of birth), streaming history, interactions with content, device identifiers, network connection type, and sensor telemetry. (The provided excerpt does not specify whether gender, search query logs, Bluetooth telemetry, or microphone audio are collected.)",
        documentEvidence:
          "Section 3.1: 'We collect your email address, date of birth, streaming history, interactions with content, device identifiers, network connection type, and sensor telemetry.'",
        silenceNotice:
          "The provided excerpt does not specify whether microphone audio, Bluetooth telemetry, gender, or search query logs are collected.",
        attentionLevel: "moderate",
      },
      {
        id: "priv_sp_2",
        topic: "third_party_sharing",
        topicTitle: "Third-Party Data Sharing",
        distinction: "explicitly_stated",
        summary:
          "Shares pseudonymous analytics, mobile advertising IDs, and royalty metrics with record labels, publishers, and marketing partners. (Specific third-party advertising networks, data brokers, or measurement beacons are not stated in this excerpt.)",
        documentEvidence:
          "Section 4.2: 'We share pseudonymous analytics, mobile advertising IDs, and royalty metrics with record labels, publishers, and marketing partners.'",
        silenceNotice:
          "The provided excerpt does not identify specific external ad networks, data brokers, or measurement vendors beyond marketing partners, record labels, and publishers.",
        attentionLevel: "moderate",
      },
      {
        id: "priv_sp_3",
        topic: "advertising_tracking",
        topicTitle: "Advertising and Behavioral Tracking",
        distinction: "explicitly_stated",
        summary:
          "Processes interaction history to infer musical and brand preferences for targeted sponsor messages. (Cross-app ad tracking identifiers and tier-specific ad policies are not mentioned in this excerpt.)",
        documentEvidence:
          "Section 5.1: 'We process interaction history to infer musical and brand preferences for targeted sponsor messages.'",
        silenceNotice:
          "The provided excerpt does not state whether cross-app identifiers or off-platform browsing behavior are tracked.",
        attentionLevel: "moderate",
      },
      {
        id: "priv_sp_4",
        topic: "data_retention",
        topicTitle: "Data Retention Period",
        distinction: "not_specified",
        summary:
          "No specific retention period is stated in the provided excerpt.",
        silenceNotice:
          "Important: Spotify does not state a concrete retention timeframe or deletion schedule for telemetry data in this excerpt. Do not infer indefinite retention as an established fact, nor assume silence indicates data is immediately purged.",
        attentionLevel: "high",
      },
      {
        id: "priv_sp_5",
        topic: "account_deletion",
        topicTitle: "Account Deletion Rights",
        distinction: "explicitly_stated",
        summary:
          "Users may close their account through the Support page, after which data is permanently anonymized within 30 days. Note that anonymization retains data with personal identifiers removed rather than completely deleting or purging records from systems.",
        documentEvidence:
          "Section 7.3: 'You may close your account through the Support page; your data will be permanently anonymized within 30 days.'",
        silenceNotice:
          "The clause specifies permanent anonymization within 30 days rather than complete data deletion. Legal retention exceptions are not detailed in this excerpt.",
        attentionLevel: "informational",
      },
      {
        id: "priv_sp_6",
        topic: "ai_model_training",
        topicTitle: "AI & Model Training Usage",
        distinction: "not_specified",
        summary:
          "The provided excerpt is silent regarding whether user data is used to train proprietary artificial intelligence or machine learning foundation models. The policy describes algorithmic content recommendation systems only.",
        silenceNotice:
          "The agreement references algorithmic content recommendations, but is silent regarding training proprietary or third-party AI models on user content. Do not assume silence implies user data is excluded from or included in AI model training.",
        attentionLevel: "moderate",
      },
    ],
    verificationSummary: {
      totalVerified: 6,
      supportedCount: 6,
      partiallySupportedCount: 0,
      unverifiedCount: 0,
      rejectedCount: 0,
      methodologyDescription:
        "Verification outcomes shown here are simulated for demonstration purposes. They do not represent a live independent verification service.",
    },
  },

  doc_demo_instagram_02: {
    id: "doc_demo_instagram_02",
    appName: "Instagram",
    documentTitle: "Instagram Privacy Policy and Terms of Use",
    documentType: "privacy_policy",
    analysisDate: "2026-10-30T11:15:00Z",
    isDemonstrationFixture: true,
    demonstrationNotice:
      "This is illustrative demonstration content, not the actual official policy of Instagram.",
    documentSummary:
      "Details how Meta collects user photos, videos, facial metadata, browsing history, and cross-platform advertiser telemetry across Instagram. Imposes expansive sublicensing rights on uploaded user media.",
    totalClausesAnalyzed: 52,
    highAttentionCount: 2,
    moderateAttentionCount: 3,
    informationalCount: 1,
    executiveSummary: {
      documentOverview:
        "This policy governs personal data ingestion, content rights, and marketing profiling across Instagram and connected Meta services. It outlines how user media, comments, direct messages, and off-platform web browsing are monitored and monetized.",
      mainObligations: [
        "Ensure you have legal rights to all photos, videos, and music clips uploaded to your profile.",
        "Refrain from scraping profile directories, using automation bots, or buying artificial engagement.",
        "Verify your age (must be at least 13 years old) and provide accurate account credentials.",
      ],
      companyPermissions: [
        "Sublicense and distribute your uploaded photos, captions, and videos worldwide without royalty payments.",
        "Ingest off-platform activity data from partner apps and third-party web tracking pixels.",
        "Scan uploaded multimedia using automated computer vision tools for safety, ad targeting, and content indexing.",
      ],
      majorAttentionAreas: [
        "Expansive Media License: You retain copyright, but grant Meta a royalty-free, transferable sub-license to distribute and display your content globally.",
        "Cross-App Ad Telemetry: Activity outside Instagram is collected via Meta Pixel and SDK integrations to tailor ads.",
        "Facial & Spatial Metadata: Visual scans analyze faces, image backgrounds, and ambient audio tags in uploaded reels.",
      ],
      preAgreementChecklist: [
        "Audit 'Your Activity Off-Meta Technologies' in your privacy settings to disassociate external site browsing.",
        "If publishing proprietary photography or art, understand that re-shares and embeds by third parties are permitted under the license.",
        "Review camera and microphone permissions on your mobile device OS.",
      ],
    },
    clauses: [
      {
        id: "cl_ig_lic",
        title: "Sub-licensable Royalty-Free Media License",
        shortExplanation:
          "You give Meta a worldwide license to host, use, and sublicense your uploaded photos and videos without paying you.",
        category: "intellectual_property",
        attentionLevel: "high",
        originalClauseText:
          "3.3 Permissions You Grant. When you share, post, or upload content that is covered by intellectual property rights on or in connection with our Service, you grant us a non-exclusive, royalty-free, transferable, sub-licensable, worldwide license to host, use, distribute, modify, run, copy, publicly perform or display, translate, and create derivative works of your content (consistent with your privacy and application settings). This license ends when your content is deleted from our systems, though content may persist in backup copies for a reasonable period of time.",
        evidence: {
          id: "ev_ig_lic",
          sectionHeading: "Section 3.3 — Permissions You Grant",
          sectionNumber: "3.3",
          sourcePage: 4,
          sourceReferenceText: "Section 3.3 (Page 4)",
          exactQuote:
            "you grant us a non-exclusive, royalty-free, transferable, sub-licensable, worldwide license to host, use, distribute, modify, run, copy, publicly perform or display, translate, and create derivative works of your content",
          highlightExcerpt:
            "grant us a non-exclusive, royalty-free, transferable, sub-licensable, worldwide license to host, use, distribute, modify... and create derivative works of your content",
        },
        analysis: {
          plainLanguageExplanation:
            "You still own the copyright to your pictures and reels. However, you grant Meta permission to broadcast them anywhere in the world, use them in marketing demos, and sublicense them to partner networks and affiliates without compensating you.",
          whyThisClauseMatters:
            "Commercial photographers and artists frequently misunderstand this clause, believing their uploads cannot be utilized or syndicated without additional licensing agreements.",
          potentialUserImplications: [
            "Your photos can be syndicated across third-party websites using Instagram's embed API.",
            "Meta does not owe you royalties or licensing fees if your content trends globally.",
            "Deleting your account terminates future licensing, but content shared by others persists.",
          ],
          attentionLevel: "high",
          category: "intellectual_property",
          actionableAdvice:
            "Set your account to Private if you do not want public embed widgets to display your photos on third-party blogs.",
        },
        verification: {
          status: "supported",
          reviewerType: "simulated_reviewer",
          notes:
            "Section 3.3 confirms broad transferable and sub-licensable rights.",
          verifiedAt: "2026-10-30T11:20:00Z",
          evidenceMatchesOriginal: true,
          simulatedAuditOutcome:
            "Audit verified: Verbatim match with Section 3.3 permissions.",
        },
      },
      {
        id: "cl_ig_off",
        title: "Cross-App & Third-Party Partner Tracking",
        shortExplanation:
          "Meta collects your browsing and purchasing habits from other websites and apps to build your advertising profile.",
        category: "data_sharing",
        attentionLevel: "high",
        originalClauseText:
          "2.2 Information from Partners. Advertisers, app developers, and publishers can send us information through Meta Business Tools they use, including our social plug-ins, APIs, and SDKs. These partners provide information about your activities outside of Instagram—including information about your device, websites you visit, purchases you make, and advertisements you view—whether or not you have an Instagram account or are logged in.",
        evidence: {
          id: "ev_ig_off",
          sectionHeading: "Section 2.2 — Information from Partners",
          sectionNumber: "2.2",
          sourcePage: 3,
          sourceReferenceText: "Section 2.2 (Page 3)",
          exactQuote:
            "These partners provide information about your activities outside of Instagram—including information about your device, websites you visit, purchases you make, and advertisements you view—whether or not you have an Instagram account or are logged in.",
          highlightExcerpt:
            "partners provide information about your activities outside of Instagram—including information about your device, websites you visit, purchases you make",
        },
        analysis: {
          plainLanguageExplanation:
            "When you shop on an online store or browse articles on an external news website that embeds the Meta pixel or Facebook login, that store tells Meta what you bought and what pages you looked at, tying it to your Instagram profile.",
          whyThisClauseMatters:
            "Explains why you see advertisements for products you researched on entirely separate apps or desktop browsers.",
          potentialUserImplications: [
            "External shopping carts and medical/health searches can be tied to your profile if the partner site uses Meta pixels.",
            "Tracking functions even when you are logged out or using private browser windows.",
          ],
          attentionLevel: "high",
          category: "data_sharing",
          actionableAdvice:
            "Open Instagram Settings > Accounts Center > Your Information and Permissions > Off-Meta Technologies to disconnect your off-platform browsing history.",
        },
        verification: {
          status: "supported",
          reviewerType: "simulated_reviewer",
          notes:
            "Section 2.2 explicitly confirms third-party partner data collection.",
          verifiedAt: "2026-10-30T11:22:00Z",
          evidenceMatchesOriginal: true,
          simulatedAuditOutcome:
            "Audit verified: Excerpt verified against Meta Partner Tracking disclosures.",
        },
      },
    ],
    privacyFindings: [
      {
        id: "priv_ig_1",
        topic: "personal_info_collected",
        topicTitle: "Biometric and Device Telemetry",
        distinction: "explicitly_stated",
        summary:
          "Collects precise GPS location, Wi-Fi beacons, battery level, camera roll metadata, facial feature markers for AR filters, and typing cadence.",
        documentEvidence:
          "Section 1.4: 'We collect device attributes, battery level, signal strength, available storage, and visual markers in camera feeds for filter rendering.'",
        attentionLevel: "high",
      },
      {
        id: "priv_ig_2",
        topic: "third_party_sharing",
        topicTitle: "Ad Exchanges & Meta Family Sharing",
        distinction: "explicitly_stated",
        summary:
          "Synchronizes user profiles across Facebook, WhatsApp, Messenger, and external programmatic real-time ad bidding exchanges.",
        documentEvidence:
          "Section 3.1: 'We share infrastructure and systems across Meta Companies and with commercial ad partners.'",
        attentionLevel: "high",
      },
      {
        id: "priv_ig_3",
        topic: "advertising_tracking",
        topicTitle: "Behavioral and Lookalike Targeting",
        distinction: "explicitly_stated",
        summary:
          "Monitors dwell time on images, reels watched to completion, and profile visits to calculate interest propensity scores.",
        documentEvidence:
          "Section 2.1: 'We analyze how long you look at specific posts and videos to personalize commercial feed placements.'",
        attentionLevel: "moderate",
      },
      {
        id: "priv_ig_4",
        topic: "ai_model_training",
        topicTitle: "Generative AI Training on Public Posts",
        distinction: "reasonable_interpretation",
        summary:
          "Public posts, captions, and comments are utilized to train Meta's Llama foundation models and image generation features. Private accounts and direct messages are stated to be excluded in European jurisdictions.",
        silenceNotice:
          "Users outside the EU/UK do not receive an automatic opt-out mechanism for AI training on public uploads.",
        attentionLevel: "high",
      },
    ],
    verificationSummary: {
      totalVerified: 2,
      supportedCount: 2,
      partiallySupportedCount: 0,
      unverifiedCount: 0,
      rejectedCount: 0,
      methodologyDescription:
        "Verification outcomes shown here are simulated for demonstration purposes. They do not represent a live independent verification service.",
    },
  },

  doc_demo_discord_03: {
    id: "doc_demo_discord_03",
    appName: "Discord",
    documentTitle: "Discord Terms of Service and Community Guidelines",
    documentType: "other",
    analysisDate: "2026-10-27T09:45:00Z",
    isDemonstrationFixture: true,
    demonstrationNotice:
      "This is illustrative demonstration content, not the actual official policy of Discord.",
    documentSummary:
      "Governs voice, video, and text communication communities. Users retain ownership of chat messages. Discord deploys automated moderation tooling across public servers and requires arbitration for US accounts.",
    totalClausesAnalyzed: 38,
    highAttentionCount: 1,
    moderateAttentionCount: 1,
    informationalCount: 2,
    executiveSummary: {
      documentOverview:
        "This agreement details rules for operating and participating in Discord servers, Nitro subscription tiers, bot development, and dispute resolution procedures.",
      mainObligations: [
        "Comply with Community Guidelines: no hate speech, raiding, malware distribution, or unauthorized self-bots.",
        "Server owners must moderate their communities and take action against reported abusive behavior.",
        "Nitro subscriptions renew automatically until cancelled via user billing preferences.",
      ],
      companyPermissions: [
        "Scan text attachments, image uploads, and public server chats with automated anti-malware and trust/safety tooling.",
        "Store and route real-time voice, video, and screen sharing packets across distributed edge servers.",
        "Terminate or quarantine servers found hosting infringing copyright material or abusive behavior.",
      ],
      majorAttentionAreas: [
        "Binding Individual Arbitration: US accounts waive rights to court litigation unless opted out within 30 days.",
        "Content Ownership: Discord explicitly confirms users retain copyright over their chat messages and assets.",
      ],
      preAgreementChecklist: [
        "If you desire court dispute rights, send an email to dispute-optout@discord.com within 30 days of registration.",
        "Do not store passwords or secret keys in unencrypted Discord channels.",
      ],
    },
    clauses: [
      {
        id: "cl_dc_arb",
        title: "Dispute Resolution & Binding Arbitration",
        shortExplanation:
          "US disputes must be submitted to binding individual arbitration with a 30-day email opt-out option.",
        category: "dispute_resolution",
        attentionLevel: "high",
        originalClauseText:
          "16. Dispute Resolution. You and Discord agree that any dispute between us shall be resolved through individual binding arbitration before the American Arbitration Association ('AAA') under its Consumer Arbitration Rules. YOU AND DISCORD AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY, AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR REPRESENTATIVE PROCEEDING. 16.3 30-Day Opt-Out. You have the right to opt out of this arbitration agreement within 30 days of registration by emailing written notice to dispute-optout@discord.com.",
        evidence: {
          id: "ev_dc_arb",
          sectionHeading: "Section 16 — Dispute Resolution and Opt-Out",
          sectionNumber: "16",
          sourcePage: 11,
          sourceReferenceText: "Section 16 (Page 11)",
          exactQuote:
            "any dispute between us shall be resolved through individual binding arbitration before the American Arbitration Association ('AAA')... YOU AND DISCORD AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY... You have the right to opt out of this arbitration agreement within 30 days of registration by emailing written notice to dispute-optout@discord.com.",
          highlightExcerpt:
            "resolved through individual binding arbitration before the American Arbitration Association ('AAA')... opt out... within 30 days",
        },
        analysis: {
          plainLanguageExplanation:
            "If you have a serious legal grievance with Discord, you cannot sue them in court or initiate a class action. You must submit your complaint to private AAA arbitration.",
          whyThisClauseMatters:
            "Standard consumer arbitration clause, but Discord provides a simple email opt-out mechanism.",
          potentialUserImplications: [
            "No jury trial in civil court for US accounts.",
            "Class actions are barred.",
          ],
          attentionLevel: "high",
          category: "dispute_resolution",
          actionableAdvice:
            "You can opt out within 30 days of opening your account by emailing dispute-optout@discord.com with your Discord username.",
        },
        verification: {
          status: "supported",
          reviewerType: "simulated_reviewer",
          notes: "Confirmed Section 16 arbitration provision and email opt-out.",
          verifiedAt: "2026-10-27T09:50:00Z",
          evidenceMatchesOriginal: true,
          simulatedAuditOutcome: "Audit verified: Section 16 verbatim match.",
        },
      },
    ],
    privacyFindings: [
      {
        id: "priv_dc_1",
        topic: "personal_info_collected",
        topicTitle: "Server Communication & Device Telemetry",
        distinction: "explicitly_stated",
        summary:
          "Collects IP addresses, device identifiers, server membership rosters, voice channel join/leave timestamps, and game presence status.",
        documentEvidence:
          "Section 2.1: 'We collect communications content, connected account tokens (Steam, Spotify, Xbox), and telemetry regarding game activity.'",
        attentionLevel: "moderate",
      },
      {
        id: "priv_dc_2",
        topic: "advertising_tracking",
        topicTitle: "First-Party Promoted Quests",
        distinction: "explicitly_stated",
        summary:
          "Discord displays game developer sponsored quests based on game play presence and server activity, but does not sell chat message text to external data brokers.",
        documentEvidence:
          "Privacy Policy Section 3: 'We do not sell your personal data or chat text to third parties.'",
        attentionLevel: "informational",
      },
    ],
    verificationSummary: {
      totalVerified: 1,
      supportedCount: 1,
      partiallySupportedCount: 0,
      unverifiedCount: 0,
      rejectedCount: 0,
      methodologyDescription:
        "Verification outcomes shown here are simulated for demonstration purposes. They do not represent a live independent verification service.",
    },
  },
};

/**
 * Fallback generator for any custom or dynamically created analysis records.
 */
export function getReportOrFallback(reportId: string, fallbackAppName?: string): AnalysisReport {
  if (mockReports[reportId]) {
    return mockReports[reportId];
  }

  // Generate a clean, realistic structured report so the UI never crashes or breaks
  const appName = fallbackAppName || "Application";
  return {
    id: reportId,
    appName: appName,
    documentTitle: `${appName} Service Agreement (Analysis Report)`,
    documentType: "terms_of_service",
    analysisDate: new Date().toISOString(),
    isDemonstrationFixture: true,
    demonstrationNotice: `This is illustrative demonstration content for ${appName}.`,
    documentSummary: `Comprehensive document intelligence report analyzing key consumer obligations, arbitration waivers, billing policies, and privacy disclosures for ${appName}.`,
    totalClausesAnalyzed: 28,
    highAttentionCount: 1,
    moderateAttentionCount: 2,
    informationalCount: 2,
    executiveSummary: {
      documentOverview: `This document outlines the operational rules, user requirements, payment structures, and legal terms governing access to ${appName}.`,
      mainObligations: [
        "Comply with terms of use, maintain account credential secrecy, and avoid unauthorized data scraping.",
        "Ensure payment instruments remain valid for active subscription terms.",
      ],
      companyPermissions: [
        "Collect service telemetry to optimize infrastructure performance and diagnostic reliability.",
        "Periodically update service features and operational agreements with digital notification.",
      ],
      majorAttentionAreas: [
        "Dispute Resolution: Contains binding private arbitration waivers restricting jury trial access.",
        "Automatic Renewal: Subscriptions automatically bill prior to monthly cycle termination.",
      ],
      preAgreementChecklist: [
        "Review arbitration opt-out provisions if available within the specified notice window.",
        "Confirm your subscription renewal dates and cancellation procedure.",
      ],
    },
    clauses: [
      {
        id: `cl_${reportId}_1`,
        title: "Dispute Resolution & Private Arbitration",
        shortExplanation:
          "Requires disputes to be resolved by an individual arbitrator rather than a jury trial in court.",
        category: "dispute_resolution",
        attentionLevel: "high",
        originalClauseText:
          "All disputes, claims, or controversies arising out of or relating to this Agreement shall be submitted to final and binding individual arbitration before a private tribunal. The parties expressly waive any right to bring or participate in a class, collective, or representative proceeding.",
        evidence: {
          id: `ev_${reportId}_1`,
          sectionHeading: "Dispute Resolution & Class Action Waiver",
          sectionNumber: "12.1",
          sourcePage: 8,
          sourceReferenceText: "Section 12.1 (Page 8)",
          exactQuote:
            "All disputes, claims, or controversies... shall be submitted to final and binding individual arbitration... The parties expressly waive any right to bring or participate in a class... proceeding.",
          highlightExcerpt:
            "submitted to final and binding individual arbitration... expressly waive any right to bring or participate in a class",
        },
        analysis: {
          plainLanguageExplanation:
            "You cannot sue the company in open civil court or join a class action lawsuit if a contract breach or billing dispute occurs. The provided excerpt does not state whether an opt-out procedure is provided.",
          whyThisClauseMatters:
            "Precludes class litigation and limits appeal mechanisms.",
          potentialUserImplications: [
            "Must pay arbitration filing expenses subject to arbitrator discretion.",
            "Hearings take place privately without public precedent.",
            "No opt-out mechanism is stated in the provided excerpt.",
          ],
          attentionLevel: "high",
          category: "dispute_resolution",
          actionableAdvice: "Check the full agreement to see whether an arbitration opt-out is offered.",
        },
        verification: {
          status: "supported",
          reviewerType: "simulated_reviewer",
          notes: "Audited against contractual dispute text. No opt-out is claimed.",
          verifiedAt: new Date().toISOString(),
          evidenceMatchesOriginal: true,
          simulatedAuditOutcome: "Audit verified: Matched clause language.",
        },
      },
      {
        id: `cl_${reportId}_2`,
        title: "Automatic Billing Renewal",
        shortExplanation:
          "Subscriptions continue indefinitely until manually cancelled in account settings.",
        category: "subscription_billing",
        attentionLevel: "moderate",
        originalClauseText:
          "Unless you cancel your subscription prior to the end of the current billing cycle, your subscription will automatically renew and you authorize us to collect the applicable recurring subscription fee using any payment card on file.",
        evidence: {
          id: `ev_${reportId}_2`,
          sectionHeading: "Subscription Terms & Renewal",
          sectionNumber: "4.2",
          sourcePage: 3,
          sourceReferenceText: "Section 4.2 (Page 3)",
          exactQuote:
            "Unless you cancel your subscription prior to the end of the current billing cycle, your subscription will automatically renew",
          highlightExcerpt: "subscription will automatically renew and you authorize us to collect",
        },
        analysis: {
          plainLanguageExplanation:
            "Your credit card is automatically charged at the beginning of each billing period without prior confirmation emails.",
          whyThisClauseMatters:
            "Common cause of unintended charges after promotional trials.",
          potentialUserImplications: [
            "Continuous charges occur until you navigate to account management and confirm cancellation.",
          ],
          attentionLevel: "moderate",
          category: "subscription_billing",
          actionableAdvice: "Set a reminder ahead of your cycle renewal date.",
        },
        verification: {
          status: "supported",
          reviewerType: "simulated_reviewer",
          notes: "Audited against subscription section.",
          verifiedAt: new Date().toISOString(),
          evidenceMatchesOriginal: true,
          simulatedAuditOutcome: "Audit verified: Matched renewal text.",
        },
      },
    ],
    privacyFindings: [
      {
        id: `priv_${reportId}_1`,
        topic: "personal_info_collected",
        topicTitle: "Account & Device Identifiers",
        distinction: "explicitly_stated",
        summary: "Collects account registration details, IP address, and application telemetry.",
        documentEvidence: "Policy Section 2: 'We gather device data and account details.'",
        attentionLevel: "moderate",
      },
      {
        id: `priv_${reportId}_2`,
        topic: "data_retention",
        topicTitle: "Retention Limitations",
        distinction: "not_specified",
        summary: "No specific retention period is stated in the provided excerpt.",
        silenceNotice: "Important: Silence in this policy does not imply data is deleted immediately.",
        attentionLevel: "high",
      },
    ],
    verificationSummary: {
      totalVerified: 2,
      supportedCount: 2,
      partiallySupportedCount: 0,
      unverifiedCount: 0,
      rejectedCount: 0,
      methodologyDescription:
        "Verification outcomes shown here are simulated for demonstration purposes. They do not represent a live independent verification service.",
    },
  };
}

