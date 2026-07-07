import { ButtonLink } from "@/components/ui/button-link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f8f1e4] px-8 py-10">
      <section className="mx-auto max-w-6xl rounded-3xl border border-[#e8dcc6] bg-[#fffaf0] p-10 shadow-sm">
        <div className="flex items-start justify-between gap-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d89b2b]">McLeod ROI Builder</p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#0b1d33]">Business Impact Analyses</h1>
            <p className="mt-3 max-w-2xl text-lg text-[#627085]">Build and present a customer-specific financial value story.</p>
          </div>
          <ButtonLink href="/analyses/new">+ New Analysis</ButtonLink>
        </div>

        <div className="mt-12 rounded-2xl border border-dashed border-[#d7c9ae] bg-white/55 p-12 text-center">
          <h2 className="text-xl font-semibold text-[#16385f]">No analyses yet.</h2>
          <p className="mx-auto mt-3 max-w-xl text-[#627085]">
            Create your first business impact analysis to begin identifying customer value opportunities.
          </p>
        </div>
      </section>
    </main>
  );
}
