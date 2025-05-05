export function AnalyticsSummary() {
  return (
    <div className="space-y-4">
      <div className="h-[200px] w-full rounded-md bg-muted">
        {/* This would be a chart component in a real application */}
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-muted-foreground">Analytics Chart</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">Top Platform</p>
          <p className="text-lg font-bold">YouTube</p>
          <p className="text-xs text-muted-foreground">42% of total views</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">Best Performing</p>
          <p className="text-lg font-bold">Gaming Reactions</p>
          <p className="text-xs text-muted-foreground">3.2x higher engagement</p>
        </div>
      </div>
    </div>
  )
}
