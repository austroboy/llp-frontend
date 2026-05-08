import { Skeleton } from "@/components/ui/skeleton";

export default function BriefsLoading() {
  return (
    <div className="space-y-4">
      <div className="dash-header">
        <div>
          <Skeleton className="h-3 w-40 mb-2" />
          <Skeleton className="h-8 w-64" />
        </div>
      </div>
      <div className="dash-table-wrap">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            style={{
              padding: 16,
              borderBottom: "0.5px solid var(--line-1)",
            }}
          >
            <Skeleton className="h-5 w-2/3 mb-2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
