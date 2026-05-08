import { Skeleton } from "@/components/ui/skeleton";

export default function SubmissionsLoading() {
  return (
    <div className="space-y-4">
      <div className="dash-header">
        <div>
          <Skeleton className="h-3 w-40 mb-2" />
          <Skeleton className="h-8 w-64" />
        </div>
      </div>
      <div className="dash-table-wrap">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            style={{
              padding: 14,
              borderBottom: "0.5px solid var(--line-1)",
            }}
          >
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}
