export function StorageUsage() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Storage Used</p>
          <p className="text-sm text-muted-foreground">4.2 GB / 10 GB</p>
        </div>
        <div className="h-2 w-full rounded-full bg-muted">
          <div className="h-full w-[42%] rounded-full bg-primary" />
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Storage Breakdown</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-primary" />
              <p className="text-sm">Reaction Videos</p>
            </div>
            <p className="text-xs text-muted-foreground">3.1 GB (74%)</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              <p className="text-sm">Source Videos</p>
            </div>
            <p className="text-xs text-muted-foreground">0.8 GB (19%)</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <p className="text-sm">Audio Files</p>
            </div>
            <p className="text-xs text-muted-foreground">0.2 GB (5%)</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-yellow-500" />
              <p className="text-sm">Other</p>
            </div>
            <p className="text-xs text-muted-foreground">0.1 GB (2%)</p>
          </div>
        </div>
      </div>
    </div>
  )
}
