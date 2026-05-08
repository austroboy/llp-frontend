import { Skeleton } from "@/components/ui/skeleton";

export default function EarningsLoading() {
  return (
    <div className="space-y-6">
      <div className="dash-header">
        <div>
          <Skeleton className="h-3 w-40 mb-2" />
          <Skeleton className="h-8 w-64" />
        </div>
      </div>
      <div className="dash-summary">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="dash-sum-card">
            <Skeleton className="h-2 w-16 mb-2" />
            <Skeleton className="h-7 w-20 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="dash-table-wrap">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            style={{
              padding: 16,
              borderBottom: "0.5px solid var(--line-1)",
            }}
          >
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
