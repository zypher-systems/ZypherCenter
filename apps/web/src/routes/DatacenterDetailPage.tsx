import { useState } from 'react'
import {
  Layers,
  Monitor,
  Box,
  HardDrive,
  GitFork,
  ShieldCheck,
  Network,
  Shield,
  Settings,
  Columns3,
  BarChart3,
  BellRing,
  KeyRound,
  Users,
} from 'lucide-react'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'

// Datacenter Tabs
import { DatacenterSummaryTab } from './DatacenterSummaryTab'
import { AllVMsPage } from './AllVMsPage'
import { AllLXCPage } from './AllLXCPage'
import { ClusterOptionsPage } from './ClusterOptionsPage'
import { ClusterBackupPage } from './ClusterBackupPage'
import { ClusterReplicationPage } from './ClusterReplicationPage'
import { HAPage } from './HAPage'
import { SDNPage } from './SDNPage'
import { ClusterFirewallPage } from './ClusterFirewallPage'
import { ClusterMetricsPage } from './ClusterMetricsPage'
import { ClusterNotificationsPage } from './ClusterNotificationsPage'
import { ClusterACMEPage } from './ClusterACMEPage'
import { ClusterUpdatesPage } from './ClusterUpdatesPage'
import { PoolsPage } from './PoolsPage'
import { DatacenterAccessTab } from './DatacenterAccessTab'

export function DatacenterDetailPage() {
  const [tab, setTab] = useState('summary')

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border bg-bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <Layers className="size-6 text-accent" />
          <div>
            <h1 className="text-xl font-bold text-text-primary">Datacenter</h1>
            <p className="text-sm text-text-muted mt-0.5">Cluster-wide management and summary</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-6">
        <Tabs value={tab} onValueChange={setTab} orientation="vertical" className="h-full flex flex-row gap-6">
          <TabsList className="bg-transparent p-0 flex-shrink-0">
            <TabsTrigger value="summary">
              <Layers className="size-3.5 mr-1.5" />Summary
            </TabsTrigger>
            <TabsTrigger value="vms">
              <Monitor className="size-3.5 mr-1.5" />VMs
            </TabsTrigger>
            <TabsTrigger value="lxc">
              <Box className="size-3.5 mr-1.5" />LXC
            </TabsTrigger>
            <TabsTrigger value="options">
              <Settings className="size-3.5 mr-1.5" />Options
            </TabsTrigger>
            <TabsTrigger value="pools">
              <Columns3 className="size-3.5 mr-1.5" />Pools
            </TabsTrigger>
            <TabsTrigger value="backup">
              <HardDrive className="size-3.5 mr-1.5" />Backup
            </TabsTrigger>
            <TabsTrigger value="replication">
              <GitFork className="size-3.5 mr-1.5" />Replication
            </TabsTrigger>
            <TabsTrigger value="ha">
              <ShieldCheck className="size-3.5 mr-1.5" />HA
            </TabsTrigger>
            <TabsTrigger value="sdn">
              <Network className="size-3.5 mr-1.5" />SDN
            </TabsTrigger>
            <TabsTrigger value="firewall">
              <Shield className="size-3.5 mr-1.5" />Firewall
            </TabsTrigger>
            <TabsTrigger value="metrics">
              <BarChart3 className="size-3.5 mr-1.5" />Metrics
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <BellRing className="size-3.5 mr-1.5" />Notifications
            </TabsTrigger>
            <TabsTrigger value="acme">
              <KeyRound className="size-3.5 mr-1.5" />ACME
            </TabsTrigger>
            <TabsTrigger value="updates">
              <ShieldCheck className="size-3.5 mr-1.5" />Updates
            </TabsTrigger>
            <TabsTrigger value="access">
              <Users className="size-3.5 mr-1.5" />Permissions
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-w-0 overflow-y-auto">
            <TabsContent value="summary" className="h-full m-0 data-[state=active]:block data-[state=inactive]:hidden"><DatacenterSummaryTab onTabChange={setTab} /></TabsContent>
            <TabsContent value="vms" className="h-full m-0 data-[state=active]:block data-[state=inactive]:hidden"><AllVMsPage /></TabsContent>
            <TabsContent value="lxc" className="h-full m-0 data-[state=active]:block data-[state=inactive]:hidden"><AllLXCPage /></TabsContent>
            <TabsContent value="options" className="h-full m-0 data-[state=active]:block data-[state=inactive]:hidden"><ClusterOptionsPage /></TabsContent>
            <TabsContent value="pools" className="h-full m-0 data-[state=active]:block data-[state=inactive]:hidden"><PoolsPage /></TabsContent>
            <TabsContent value="backup" className="h-full m-0 data-[state=active]:block data-[state=inactive]:hidden"><ClusterBackupPage /></TabsContent>
            <TabsContent value="replication" className="h-full m-0 data-[state=active]:block data-[state=inactive]:hidden"><ClusterReplicationPage /></TabsContent>
            <TabsContent value="ha" className="h-full m-0 data-[state=active]:block data-[state=inactive]:hidden"><HAPage /></TabsContent>
            <TabsContent value="sdn" className="h-full m-0 data-[state=active]:block data-[state=inactive]:hidden"><SDNPage /></TabsContent>
            <TabsContent value="firewall" className="h-full m-0 data-[state=active]:block data-[state=inactive]:hidden"><ClusterFirewallPage /></TabsContent>
            <TabsContent value="metrics" className="h-full m-0 data-[state=active]:block data-[state=inactive]:hidden"><ClusterMetricsPage /></TabsContent>
            <TabsContent value="notifications" className="h-full m-0 data-[state=active]:block data-[state=inactive]:hidden"><ClusterNotificationsPage /></TabsContent>
            <TabsContent value="acme" className="h-full m-0 data-[state=active]:block data-[state=inactive]:hidden"><ClusterACMEPage /></TabsContent>
            <TabsContent value="updates" className="h-full m-0 data-[state=active]:block data-[state=inactive]:hidden"><ClusterUpdatesPage /></TabsContent>
            <TabsContent value="access" className="h-full m-0 data-[state=active]:block data-[state=inactive]:hidden"><DatacenterAccessTab /></TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}
