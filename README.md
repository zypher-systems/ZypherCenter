# ZypherCenter — Project Build State

> Last updated: April 2, 2026 — commit `6233cec`

---

## Overview

ZypherCenter is a modern, self-hosted web UI for Proxmox VE — built as a replacement for the stock Proxmox web interface. It connects to Proxmox clusters via a Fastify proxy backend (which handles auth, never exposing credentials to the browser) and presents a clean, fast React + TypeScript frontend styled with Tailwind CSS.

**Tech stack:**
- **Frontend:** React, TypeScript, Vite, TanStack Query (data fetching/caching), Tailwind CSS, Recharts (performance charts), sonner (toast notifications), lucide-react (icons)
- **Backend proxy:** Fastify (Node.js) — auth injection, session management, proxying to Proxmox API
- **Monorepo:** pnpm workspaces — `apps/web` (frontend), `apps/api` (Fastify proxy), `packages/proxmox-types` (shared Zod-validated type schemas)
- **Deployment:** Docker / docker-compose

---

## Working Plan

The build plan is to cover all major Proxmox functionality surface areas in order of user-facing priority:

1. ✅ **Auth & Session** — Login, session management, auth proxy
2. ✅ **Dashboard** — Cluster overview, node health, resource consumers, recent tasks
3. ✅ **VM Management** — Full VM lifecycle (CRUD, power, hardware config, snapshots, firewall, cloud-init, console, backups, per-VM tasks)
4. ✅ **LXC Management** — Full container lifecycle (CRUD, power, config, snapshots, firewall, console, backups, per-CT tasks)
5. ✅ **Node Management** — Node summary, network, disks (ZFS/LVM), updates, services, firewall, syslog, shell, certificates, DNS, time
6. ✅ **Storage** — Storage list, storage detail (ISO/template browse, upload, download, restore backups, CT template catalog)
7. ✅ **Cluster-wide views** — All VMs (cross-node), All LXC (cross-node), Global Tasks, Resource Pools, Cluster Options
8. ✅ **Access Management** — Users, Groups, Roles, ACL, Tokens, Realms
9. ✅ **SDN** — VNets, Zones, Subnets with apply workflow
10. ✅ **High Availability** — HA resources, HA groups, HA manager status panel
11. ✅ **Ceph** — Status, OSDs (create/destroy/in-out), Pools (create/edit/delete), Monitors, MDS
12. ✅ **Cluster Backup** — Scheduled backup jobs (create/edit/delete/toggle)
13. ✅ **Cluster Replication** — Replication jobs (create/edit/delete/toggle)
14. ✅ **Cluster Firewall** — Rules, Security Groups, IP Sets, Aliases, Options
15. ✅ **Metrics / Influx integration** — InfluxDB and Graphite metrics server management (`/cluster/metrics`)
16. ✅ **ACME / Certificate UI polish** — Full ACME plugin management page (`/cluster/acme`) with 120+ DNS providers
17. ✅ **Notification targets** — PVE 8 notification system: SMTP/Gotify endpoints and matchers (`/cluster/notifications`)
18. 🔲 **Custom columns / preferences** — User-side column visibility and density settings

---

## Implemented Features

### Authentication
- Login page with username / password / realm (PVE, PBS, PAM)
- Server-side session management via Fastify proxy (cookie-based)
- Browser never sees raw Proxmox credentials or auth tokens
- Automatic redirect to `/login` on 401 (session expiry)

---

### Dashboard (`/`)
- Cluster name + quorum status badge (quorate / no-quorum)
- Summary stat cards: total nodes / online, VMs (running/stopped), LXC (running/stopped), Storage pools
- Cluster aggregate resource gauges: CPU (vCPUs used/total), Memory (used/total), Storage (used/total)
- Node grid — one card per node: online/offline, CPU gauge, Memory gauge, Root FS gauge, CPU sparkline (1h RRD area chart)
- Top 5 CPU & Top 5 Memory consumers across all running guests (with links to detail pages)
- Recent tasks strip (last 8) with type, VMID, node, time, status badge
- Skeleton loading states throughout
- Global command palette (`Ctrl+K` / `⌘K`): search all cluster resources (VMs, CTs, nodes, storage), keyboard navigation, navigate on select

---

### Virtual Machines

#### All VMs (`/vms`)
- Cross-node list of all QEMU VMs (templates excluded)
- Columns: VMID, Name (with tag chips), Node, Status, CPU %, Memory, Uptime
- Filters: node, status (All/Running/Stopped/Paused), tag, text search
- Sortable columns (click header, toggle asc/desc)
- Create VM button → full `CreateVMDialog` (node, VMID, name, OS type, cores, memory, disk size, storage, bridge)
- Per-row actions: Start, Shutdown, Reboot, Force Stop, Console link, Delete (purge + confirm)
- Multi-select + bulk operations: Start, Reboot, Shutdown, Force Stop, Delete (with confirm)

#### VM Detail (`/nodes/:node/vms/:vmid`) — 10 tabs
| Tab | Key Features |
|-----|-------------|
| **Summary** | Live status, CPU/mem/net/disk gauges, RRD performance charts (1h/24h), QEMU Guest Agent OS info, power actions (start/stop/shutdown/reboot/reset/suspend/resume), migrate, clone, convert to template |
| **Hardware** | Full hardware config: CPU cores/sockets/type, memory, disk devices (add/resize/move/detach/delete), NICs (add/edit/delete with bridge/VLAN/rate/link_down disconnect toggle), CD-ROM, display, machine/BIOS type, PCI passthrough, USB passthrough |
| **Agent** | Guest Agent data when running: OS info, network interfaces with IPs, filesystem mount points and usage |
| **Snapshots** | Snapshot list, create (name, description, include RAM), delete with confirm, rollback with confirm, inline description editing (pencil icon) |
| **Options** | Boot options, USB tablet, QEMU agent toggle, protection, on poweroff/reboot/shutdown behavior |
| **Cloud-Init** | Cloud-Init: user, password, SSH keys, DNS domain, DNS servers, IP config per interface, regenerate drive button |
| **Tasks** | Per-VM task history (last 100), expandable inline log viewer, running tasks with animated dot |
| **Firewall** | Per-VM rules (IN/OUT, ACCEPT/DROP/REJECT, macro, protocol, src/dst IP, port, comment, enable toggle), firewall enable/disable, options edit |
| **Backups** | List backups for this VM from storage, trigger manual backup (vzdump), restore from selected backup |
| **Console** | noVNC console at `/nodes/:node/vms/:vmid/console` |

---

### Containers (LXC)

#### All LXC (`/lxc`)
- Cross-node list of all LXC containers (templates excluded)
- Same filters, sort, and bulk operations as All VMs
- Create LXC button → full `CreateLXCDialog` (node, VMID, hostname, password, memory, swap, cores, disk, storage, template, bridge, unprivileged, start-on-boot)

#### LXC Detail (`/nodes/:node/lxc/:vmid`) — 7 tabs
| Tab | Key Features |
|-----|-------------|
| **Summary** | Live status, resource gauges, RRD charts, power actions (start/stop/shutdown/reboot/suspend/resume), migrate, clone, convert to template |
| **Config** | CPU cores, memory, swap, rootfs + mount points (add/resize/move/delete), NICs (add/edit/delete with bridge/VLAN/rate/link_down disconnect toggle), DNS, hostname, unprivileged toggle |
| **Options** | Start on boot, protection, nesting, keyctl, fuse, mknod, console type, TTY count |
| **Snapshots** | Create, delete, rollback, inline description editing (same UX as VM) |
| **Firewall** | Per-CT rules (same structure as VM firewall), firewall enable/disable, options |
| **Tasks** | Per-CT task history (last 100), expandable inline log viewer |
| **Backups** | List backups, trigger manual backup (vzdump), restore from selected backup |
| **Console** | noVNC console at `/nodes/:node/lxc/:vmid/console` |

---

### Node Management

#### Node Summary (`/nodes/:node`)
- Node header: CPU model, PVE version, online status badge
- Reboot / Shutdown buttons (with confirmation dialogs)
- Stat cards: CPU usage, Memory used/total, Root FS used/total, Uptime, VM count, LXC count
- Subscription info card (plan, status, expiry)
- PCI device list
- ZFS pool summary
- Disk list summary
- Recent node tasks
- Performance history charts (CPU, Memory, Network) — 1h / 24h switchable

#### Node Network (`/nodes/:node/network`)
- Interface table: name, type, active, autostart, IPv4/IPv6, bridge ports / bond slaves, comment
- Create Interface dialog: bridge, bond (slaves + 10 bond modes), VLAN, OVS variants; IPv4/IPv6 fields, MTU, autostart
- Edit Interface: all fields including IPv6 address/prefix/gateway and bond slaves/mode
- Delete Interface
- Apply Configuration button
- Revert pending changes button
- Pending-changes indicator

#### Node Disks (`/nodes/:node/disks`) — 3 tabs
| Tab | Features |
|-----|---------|
| **Disks** | Physical disk table (device, model, serial, size, type, health); S.M.A.R.T. viewer modal (full attribute table); Init GPT; Wipe disk |
| **ZFS** | ZFS pool table (name, state, size, alloc, free, scan status); Create pool (RAID level, disk selection); Scrub; Destroy pool |
| **LVM** | LVM VG table (name, size, free); Create VG (device, name); Destroy VG. LVM-Thin pool table (LV name, VG, size, used); Create Thin pool (device, VG name, pool name); Destroy Thin pool |

#### Node Firewall (`/nodes/:node/firewall`)
- Firewall rules table: position, enabled, direction, action, macro/protocol, source/dest IPs & ports, comment
- Add / Edit / Delete rules
- Enable/disable individual rules (inline toggle)
- Firewall options section: node-level enable/disable, default in/out policy, log settings

#### Node Updates (`/nodes/:node/updates`)
- Available APT package table (package, current version, new version, priority)
- Check for updates button
- Upgrade all packages button (only shown when updates available)

#### Node Services (`/nodes/:node/services`)
- System service table: name, description, state badge (running/dead/other)
- Per-service actions (context-aware): Start, Stop (confirm), Restart, Reload
- Per-row pending spinner during action

#### Node Syslog (`/nodes/:node/syslog`)
- Monospace syslog viewer with pagination (500 lines/page)
- Client-side text filter
- Auto-refresh toggle (5s / 10s / 30s / 60s) with pulsing indicator
- Color-coded lines (red = error, amber = warning)

#### Node Shell (`/nodes/:node/shell`)
- Terminal/shell access via xterm.js (noVNC-style websocket connection)

#### Node DNS (`/nodes/:node/dns`)
- Current DNS search domain and nameservers
- Edit DNS configuration

#### Node Time (`/nodes/:node/time`)
- Current timezone and system time
- Update timezone and NTP config

#### Node Certificates (`/nodes/:node/certificates`)
- TLS certificate list (subject, type, expiry, SAN)
- ACME account management
- Order / renew ACME certificate
- Revoke certificate

---

### Storage

#### Storage List (`/storage`)
- Table of all cluster storage pools: ID, type, content types, status, used/total capacity bar
- Create Storage dialog supporting all Proxmox storage types: `dir`, `nfs`, `cifs`, `btrfs`, `lvm`, `lvmthin`, `zfspool`, `rbd`, `cephfs`, `iscsi`, `iscsidirect`, `glusterfs`, `pbs` — with type-specific fields
- Edit Storage (content types, nodes restriction, comment, disable)
- Delete Storage

#### Storage Detail (`/storage/:storageid`)
- Capacity gauge (used/total)
- Multi-node selector for shared storage
- Content filter tabs: All / Templates / ISOs / Disk Images / Backups / Snippets
- Sortable content table: volume ID, type icon, VMID, date, size
- Multi-select + bulk delete
- Upload ISO or CT template (file picker)
- Download from URL (ISO / vztmpl, with filename override)
- CT Template Catalog: browse official template list (`useNodeAplinfo`), filter by OS/arch/search, one-click download to storage
- Restore VM or LXC from backup (detect type from filename, set target VMID/storage, unique IDs option, start-on-restore)
- Prune backups

---

### Cluster Features

#### Global Tasks (`/tasks`)
- All cluster tasks across all nodes
- Filter by node and task type (dropdowns)
- Expandable log viewer for each task (inline `<pre>` block)
- Running tasks show animated pulsing dot

#### Resource Pools (`/pools`)
- Expandable pool table (ID, comment, member count)
- Create pool, edit comment, delete pool
- Expanded row shows members (VMs/CTs/storage) with type icon, name/link, node, status
- Add member by VMID, remove member (per-type)

#### Cluster Options (`/options`)
- View and edit cluster-wide options (console type, keyboard layout, migration settings, etc.)

#### Cluster Backup (`/backup`)
- Scheduled backup jobs table (storage, schedule, mode, VM IDs, compression, enabled)
- Inline enabled toggle
- Create / Edit / Delete backup job

#### Cluster Replication (`/replication`)
- Replication job table (source VM, target node, schedule, last sync, enabled, status/error)
- Inline enabled toggle
- Create / Edit / Delete replication job

#### Cluster Metrics (`/cluster/metrics`)
- InfluxDB v1/v2 and Graphite metric server management
- Create / Edit / Delete metric servers
- Type-aware form: InfluxDB (server, port, protocol https/http/udp, organization, bucket, token, API path prefix); Graphite (server, port, protocol tcp/udp, path)
- Disable toggle per server; status badge in table

#### Cluster Notifications (`/cluster/notifications`) — 2 tabs
| Tab | Features |
|-----|----------|
| **Endpoints** | SMTP (server, port, STARTTLS/TLS/insecure, credentials, from/to address); Gotify (URL, token); Create/Edit/Delete; type icon badge |
| **Matchers** | Matchers with mode any/all, severity filter, target endpoint routing, comment, disable; Create/Edit/Delete; graceful fallback for PVE < 8.0 |

#### Cluster ACME Plugins (`/cluster/acme`)
- Standalone (HTTP) and DNS challenge plugin management
- 120+ DNS provider dropdown (Cloudflare, AWS Route53, DigitalOcean, Hetzner, OVH, Porkbun, Namecheap, Vercel, etc.)
- Credentials textarea (KEY=value per line) per DNS provider
- Nodes restriction field (blank = all nodes)
- Disable toggle per plugin; active/disabled status badge
- Info card explaining usage and how to link to node certificate management

#### Cluster Firewall (`/cluster/firewall`) — 5 tabs
| Tab | Features |
|-----|---------|
| **Rules** | Cluster-level firewall rules; Create/Edit/Delete; enable toggle |
| **Security Groups** | Named rule groups; Create/Delete group; Add/Edit/Delete rules within group |
| **IP Sets** | Named IP/CIDR sets; Create/Delete set; Add/Edit/Delete IP entries |
| **Aliases** | Named IP aliases; Create/Edit/Delete |
| **Options** | Global enable/disable, default in/out policy, ebtables |

---

### Software Defined Networking (`/sdn`) — 3 tabs
| Tab | Features |
|-----|---------|
| **VNets** | VNet table (name, zone, VLAN tag, alias, VLAN-aware); Create/Edit/Delete VNet |
| **Zones** | Zone table (ID, type, bridge, nodes, DNS); Create/Edit/Delete Zone |
| **Subnets** | Subnet list per VNet; Create/Delete Subnet |
- Apply SDN config button (activates pending changes cluster-wide)

---

### High Availability (`/ha`) — 2 tabs
| Tab | Features |
|-----|---------|
| **Resources** | HA-managed VMs/CTs (SID, group, state, max-restart, max-relocate); status panel per manager/LRM service; Add/Edit/Delete resource |
| **Groups** | HA groups (ID, nodes, nofailback, restricted, comment); Create/Edit/Delete group |

---

### Ceph Storage (`/cluster/ceph`) — 5 tabs
| Tab | Features |
|-----|----------|
| **Status** | Cluster health (HEALTH_OK/WARN/ERR with checks), capacity gauge, IOPS and throughput sparkline charts, daemon counts (OSDs, Monitors, MDS, MGR) |
| **OSDs** | OSD tree: per-OSD row (ID, host, status up/down/in/out with badges, device class, weight, capacity usage bar); Create OSD (device, WAL/DB device, node, encryption); Destroy OSD; Mark in/out |
| **Pools** | Pool list (name, type, size, PGs, used%, available); Create pool (name, type, size, PGs, autoscale mode, application); Edit pool; Delete pool. **Fixed:** correct endpoint `/ceph/pool` (singular), pool `type` now string enum |
| **Monitors** | Monitor list (name, node, address, status, quorum rank); Create monitor (node selection); Destroy monitor |
| **MDS** | MDS daemon list (name, node, state, rank); Create MDS (node, name); Destroy MDS |

---

### Access Management
| Page | Features |
|------|---------|
| **Users** (`/access/users`) | User table; Create user (username, realm, password, email, comment); Edit user (groups, expiry, email, enabled); Change password; Delete user |
| **Groups** (`/access/groups`) | Group table (ID, comment, members); Create/Edit/Delete group |
| **Roles** (`/access/roles`) | Role table (ID, privileges); Create/Delete role |
| **ACL** (`/access/acl`) | ACL entry table (path, user/group, role, propagate); Add/Delete ACL entries |
| **API Tokens** (`/access/tokens`) | Token list per user; Create token (comment, expiry, privilege separation); Delete token |
| **Realms** (`/access/realms`) | Realm list (ID, type, comment); Create/Edit/Delete realm |

---

## Not Yet Implemented

### High Priority
- **VM/LXC tags — inline create/delete** — the tag chips display but editing tags inline (add new tag, remove tag) is not wired up in the detail pages
- **VM/LXC — PCI/USB device passthrough add/remove** — hardware tab shows existing devices but the add-new picker dialog is incomplete
- **Cluster-wide resource usage graphs** — time-series graphs for the full cluster (not just per node) for capacity planning
- **Ceph — Filesystem (CephFS) tab** — list, create, and manage CephFS filesystems and metadata server pools
- **Ceph — RBD image browser** — browse and manage raw RBD images within pools

### Medium Priority
- **Node Backup (local vzdump schedule editor)** — node-level schedule editor separate from cluster backup jobs
- **VM/LXC CPU/Disk I/O pinning** — NUMA config, CPU affinity, I/O thread count per disk controller in hardware tab
- **LXC — device mappings** — adding `dev` and device-specific mounts not yet surfaced in Config tab
- **CIFS/NFS storage mount options** — advanced storage creation options (version, cache mode, SMB min version) not fully exposed
- **Storage — PBS job summaries** — show PBS datastore backup job summary (last run, next run, duration) in storage detail
- **SDN — EVPN / BGP routing table** — view SDN routes and peer status for EVPN zone type
- **HA — node fencing / watchdog config** — configure hardware watchdog and fencing agent settings
- **Task log — download / export** — button to download a task's full log as a text file
- **ACME — account management** — create/delete ACME accounts from the ACME plugins page (currently only via node certificates page)
- **Notification endpoint — Sendmail** — Sendmail endpoint type is not yet exposed in the notifications UI (only SMTP and Gotify)

### Low Priority / Polish
- **Dark/light theme toggle** — currently dark-only; add a theme switcher persisted to localStorage
- **User preferences panel** — column visibility toggles, table density (compact/normal/comfortable), default page
- **Keyboard shortcuts help modal** — `?` key showing all global shortcuts beyond `Ctrl+K`
- **Real-time event subscription** — replace polling with PVE's SSE event stream to reduce latency
- **Mobile-responsive layout** — sidebar collapses but many tables need responsive treatment for small screens
- **Breadcrumb navigation** — no breadcrumb component on detail pages; sidebar shows active state only
- **Confirmation dialog component** — per-action confirmations use `window.confirm()`; replace with a proper modal
- **Bulk edit** — bulk-select VMs/CTs to update tags, move to a pool, or change options in one action
- **Audit log / access log** — dedicated page showing who logged in and what actions were performed
- **Help tooltips** — contextual `?` tooltips on form fields explaining Proxmox-specific options
- **Custom columns / preferences** — user-side column visibility and table density settings
