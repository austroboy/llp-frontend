import { Skeleton } from "@/components/ui/skeleton";

export default function MandatesLoading() {
  return (
    <div className="space-y-4">
      <div className="dash-header">
        <div>
          <Skeleton className="h-3 w-40 mb-2" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="dash-header-right">
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="lf-card" style={{ padding: 20 }}>
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2 mb-3" />
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
