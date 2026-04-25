import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchDiscoveryQuestions } from "@/lib/notion";
import DiscoveryForm from "./_components/DiscoveryForm";

export default async function DiscoveryPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: client } = await admin
    .from("clients")
    .select("id, notion_discovery_page_id")
    .eq("supabase_user_id", user.id)
    .single();

  if (!client) {
    return (
      <div className="px-4 sm:px-8 py-10 max-w-4xl">
        <p className="text-sm text-muted">Your account is being set up. Check back shortly.</p>
      </div>
    );
  }

  const discoveryPageId = client.notion_discovery_page_id;

  if (!discoveryPageId) {
    return (
      <div className="px-4 sm:px-8 py-10 max-w-3xl">
        <div className="mb-10">
          <p className="label mb-2">Pre-Engagement</p>
          <h1 className="font-serif text-4xl font-semibold text-navy">Discovery</h1>
          <div className="mt-3 w-8 h-px bg-gold" />
        </div>
        <div className="card px-8 py-12 text-center">
          <p className="font-serif text-xl text-muted">Your discovery questions will appear here soon.</p>
          <p className="text-sm text-muted mt-2">Ryan is preparing your questionnaire.</p>
        </div>
      </div>
    );
  }

  let questions: { blockId: string; heading: string; questionText: string }[] = [];
  try {
    questions = await fetchDiscoveryQuestions(discoveryPageId);
  } catch {
    return (
      <div className="px-4 sm:px-8 py-10 max-w-3xl">
        <div className="mb-10">
          <p className="label mb-2">Pre-Engagement</p>
          <h1 className="font-serif text-4xl font-semibold text-navy">Discovery</h1>
          <div className="mt-3 w-8 h-px bg-gold" />
        </div>
        <div className="card px-8 py-12 text-center">
          <p className="text-sm text-red-700">Unable to load discovery questions. Please try again later.</p>
        </div>
      </div>
    );
  }

  const { data: existingSubmission } = await admin
    .from("discovery_submissions")
    .select("id, submitted_at, answers")
    .eq("client_id", client.id)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="px-4 sm:px-8 py-10 max-w-3xl">
      <div className="mb-10">
        <p className="label mb-2">Pre-Engagement</p>
        <h1 className="font-serif text-4xl font-semibold text-navy">Discovery</h1>
        <div className="mt-3 w-8 h-px bg-gold" />
        <p className="text-sm text-muted mt-4 max-w-lg leading-relaxed">
          These questions are meant to get you thinking before we talk, not to be answered
          perfectly. There are no wrong answers. The goal is to find the words that actually
          match what you do and why you do it.
        </p>
      </div>

      <DiscoveryForm
        questions={questions.map((q) => ({
          heading: q.heading,
          questionText: q.questionText,
        }))}
        alreadySubmitted={!!existingSubmission}
        submittedAt={existingSubmission?.submitted_at ?? null}
        previousAnswers={
          existingSubmission
            ? (existingSubmission.answers as Record<string, string>)
            : null
        }
      />
    </div>
  );
}
