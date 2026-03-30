export function SDNPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">SDN</h1>
        <p className="text-sm text-text-muted mt-0.5">Software-Defined Networking configuration</p>
      </div>
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border">
        <div className="text-center space-y-2">
          <p className="text-text-muted text-sm">SDN management coming soon</p>
          <p className="text-text-disabled text-xs">
            Configure VNets, Zones, and Controllers here
          </p>
        </div>
      </div>
    </div>
  )
}
