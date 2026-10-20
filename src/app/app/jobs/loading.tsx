export default function JobsLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="h-8 w-40 animate-pulse rounded-lg bg-line" />
      <div className="mt-6 h-24 animate-pulse rounded-2xl bg-line/60" />
      <div className="mt-4 h-64 animate-pulse rounded-2xl bg-line/40" />
    </div>
  );
}
