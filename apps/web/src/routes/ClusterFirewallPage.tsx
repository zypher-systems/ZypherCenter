export function ClusterFirewallPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Cluster Firewall</h1>
        <p className="text-sm text-text-muted mt-0.5">
          Datacenter-wide firewall rules, security groups, and IP sets
        </p>
      </div>
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border">
        <div className="text-center space-y-2">
          <p className="text-text-muted text-sm">Firewall management coming soon</p>
          <p className="text-text-disabled text-xs">
            Manage cluster-level rules, IP sets, and aliases here
          </p>
        </div>
      </div>
    </div>
  )
}
