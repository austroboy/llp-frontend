import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="dash-header">
        <div>
          <Skeleton className="h-3 w-48 mb-2" />
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-4 w-96 mt-2" />
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
      <div className="dash-section">
        <div className="dash-section-header">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="dash-next-grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="dash-next-card">
              <Skeleton className="h-2 w-20 mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
