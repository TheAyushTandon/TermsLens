import * as React from "react";
import { Suspense } from "react";
import ReportDetailClient from "./report-detail-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return [
    { id: "doc_demo_spotify_01" },
    { id: "doc_demo_instagram_02" },
    { id: "doc_demo_discord_03" },
    { id: "doc_demo_netflix_04" },
    { id: "doc_demo_duolingo_05" },
    { id: "doc_demo_github_06" },
  ];
}

async function ReportContent({ params }: PageProps) {
  const { id } = await params;
  return <ReportDetailClient reportId={id} />;
}

export default function ReportPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f7f8f5]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#119da4] border-t-transparent" />
            <p className="text-xs font-medium text-[#13505b]">
              Loading TermsLens Report...
            </p>
          </div>
        </div>
      }
    >
      <ReportContent {...props} />
    </Suspense>
  );
}
