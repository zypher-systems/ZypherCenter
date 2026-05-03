# ZypherCenter

![ZypherCenter Logo](https://raw.githubusercontent.com/zypher-systems/ZypherCenter/main/.github/assets/logo.png)

> **ZypherCenter** – A modern, self‑hosted web UI for **Proxmox VE** and related services. It provides a fast, beautiful, and secure replacement for the stock Proxmox interface.

---

## Table of Contents

- [Overview](#overview)
- [Core Features](#core-features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Quick Deploy (Docker)](#quick-deploy-docker)
  - [Docker‑Compose Deploy](#docker-compose-deploy)
  - [Running from Source (Development)](#running-from-source-development)
- [Configuration Reference](#configuration-reference)
- [Building & Publishing Your Own Image](#building--publishing-your-own-image)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

ZypherCenter connects to Proxmox clusters via a **Fastify proxy backend** that performs authentication, session handling, and API proxying – the browser never sees raw credentials. The frontend is a **React + TypeScript** SPA powered by **Vite**, using **TanStack Query** for data fetching, **Tailwind CSS** for styling, **Recharts** for performance charts, **Sonner** for toast notifications, and **Lucide‑React** for icons.

It is delivered as a **single Docker image** (or Docker‑Compose stack), making deployment trivial – no separate services, no build tools required on the host.

---

## Core Features

ZypherCenter aims to expose *all* Proxmox functionality through a clean UI. Below is a concise, yet exhaustive list of the implemented features.

### Authentication & Session Management
- Login page supporting **PVE**, **PBS**, and **PAM** realms.
- Cookie‑based session handling in the Fastify proxy – credentials never reach the browser.
- Automatic redirect to `/login` on 401 (session expiry).

### Dashboard (`/`)
- Cluster quorum status badge.
- Summary stat cards: total nodes, online nodes, running VMs, running LXCs, storage pools.
- Aggregate resource gauges: CPU, memory, storage.
- Node grid with per‑node health, CPU/memory/root‑FS gauges, and 1‑hour RRD sparkline.
- Top‑5 CPU & Memory consumers across the cluster.
- Recent tasks strip (last 8 tasks) with type, VMID, node, time, status badge.
- Global command palette (`Ctrl+K`/`⌘K`).

### Virtual Machines (`/vms`)
- Cross‑node VM list with sortable columns, filters, and bulk actions.
- Full **Create VM** dialog (node, VMID, name, OS type, resources, storage, network).
- Per‑VM detail page with ten tabs:
  - **Summary** – live status, gauges, RRD charts, power actions, migrate, clone.
  - **Hardware** – CPU, memory, disks, NICs, PCI/USB passthrough, display, BIOS.
  - **Agent** – guest‑agent OS info, network interfaces, filesystem usage.
  - **Snapshots** – create, delete, rollback, inline description edit.
  - **Options**, **Cloud‑Init**, **Tasks**, **Firewall**, **Backups**, **Console**.
- Bulk operations (start, stop, reboot, delete, etc.).

### Containers – LXC (`/lxc`)
- Mirrors the VM experience with a full list, create dialog, and detail page (7 tabs).
- Supports hardware configuration, snapshots, firewall, backups, and console.

### Node Management (`/nodes/:node`)
- Node summary with CPU, memory, root‑FS gauges, uptime, subscription info.
- **Network** – interface table, create/edit/delete bridges, bonds, VLANs, OVS.
- **Disks** – physical disks, SMART viewer, GPT init, wipe.
- **ZFS** – pool overview, create, scrub, destroy.
- **LVM** – VG & thin‑pool management.
- **Firewall**, **Updates**, **Services**, **Syslog**, **Shell**, **DNS**, **Time**, **Certificates**.

### Storage (`/storage`)
- List of all storage pools with type, content, status, and capacity gauge.
- Create/Edit/Delete storage supporting every Proxmox storage type.
- Storage detail view with content tabs (ISO, templates, backups, etc.), upload/download, restore, and prune.

### Cluster‑wide Features
- **Global Tasks** – unified task view with expandable logs.
- **Resource Pools** – create, edit, delete, add/remove members.
- **Cluster Options** – edit global Proxmox options.
- **Backup Jobs** – schedule, enable/disable, create, edit, delete.
- **Replication Jobs** – create, edit, toggle.
- **Metrics** – manage InfluxDB v1/v2 and Graphite metric servers.
- **Notifications** – SMTP & Gotify endpoints, matchers, severity filtering.
- **ACME Plugins** – HTTP & DNS challenge plugins (120+ DNS providers).
- **Cluster Firewall** – rules, security groups, IP sets, aliases, options.
- **SDN** – VNets, Zones, Subnets with apply workflow.
- **High Availability** – HA resources & groups with UI for add/edit/delete.
- **Ceph** – cluster health, OSD tree, pools, monitors, MDS, with full CRUD.
- **Access Management** – Users, Groups, Roles, ACL, API Tokens, Realms.

### Planned / Not Yet Implemented
- Dark/Light theme toggle, user preferences, custom columns.
- Keyboard shortcut help modal, real‑time SSE event stream.
- Mobile‑responsive layout, breadcrumb navigation, polished confirmation dialogs.
- Bulk edit of tags, HA fencing, audit logs, help tooltips, etc.

---

## Getting Started

### Prerequisites
- **Docker Engine** ≥ 24 (or Docker‑Compose ≥ 2.20). 
- Optional for development: **Node.js** ≥ 22, **pnpm** ≥ 9.
- Access to a running **Proxmox VE** (or PBS) cluster.

### Quick Deploy – Docker (Single Container)

```bash
# Run ZypherCenter in a single container
docker run -d \
  -p 80:80 \
  -e PROXMOX_HOST=https://YOUR_PROXMOX_IP:8006 \
  -e PROXMOX_TLS_VERIFY=false \
  -e SESSION_SECRET=$(openssl rand -hex 32) \
  --name zyphercenter \
  --restart unless-stopped \
  ghcr.io/zypher-systems/zyphercenter:latest
```

- Open `http://YOUR_SERVER_IP` and log in with your Proxmox credentials.

### Docker‑Compose Deploy (Recommended for Production)

1. **Download the compose file and env template**
   ```bash
   curl -O https://raw.githubusercontent.com/zypher-systems/ZypherCenter/main/docker-compose.yml
   curl -O https://raw.githubusercontent.com/zypher-systems/ZypherCenter/main/.env.example
   cp .env.example .env
   ```
2. **Edit `.env`** – at minimum provide the following:
   ```bash
   PROXMOX_HOST=https://YOUR_PROXMOX_IP:8006   # required
   PROXMOX_TLS_VERIFY=false                  # set true for valid certs
   SESSION_SECRET=$(openssl rand -hex 32)    # 32‑byte cookie secret
   ```
3. **Start the stack**
   ```bash
   docker compose pull
   docker compose up -d
   ```

### Updating ZypherCenter

```bash
# Docker run users
docker pull ghcr.io/zypher-systems/zyphercenter:latest
docker rm -f zyphercenter && docker run …   # same command as before

# Docker‑compose users
docker compose pull && docker compose up -d
```

---

## Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `PROXMOX_HOST` | _(empty)_ | URL of the Proxmox API, e.g. `https://192.168.1.100:8006`. |
| `PROXMOX_TLS_VERIFY` | `false` | Set `true` to enforce TLS verification. |
| `SESSION_SECRET` | _(random)_ | Secret for signing cookies – at least 32 characters. |
| `COOKIE_SECURE` | `false` | Set `true` when serving over HTTPS. |
| `HTTP_PORT` | `80` | Host port for the container (compose only). |
| `LOG_LEVEL` | `info` | API log verbosity (`error`, `warn`, `info`, `debug`). |
| `IMAGE_TAG` | `latest` | Pin a specific image tag when using compose. |

---

## Building & Publishing Your Own Image

### Prerequisites
- Docker Engine ≥ 24
- pnpm ≥ 9
- Node.js ≥ 22
- Access to a GitHub token with `write:packages` permission.

### Build & Push
```bash
git clone https://github.com/zypher-systems/ZypherCenter.git
cd ZypherCenter
chmod +x scripts/release.sh
# Build and push the `latest` tag
./scripts/release.sh
# Build and push a versioned tag (also updates `latest`)
VERSION=0.1.0 ./scripts/release.sh
# Build locally without pushing (for testing)
PUSH=false ./scripts/release.sh
```

---

## Development (Run From Source)

```bash
pnpm install            # install workspace dependencies
cp .env.example .env    # edit PROXMOX_HOST, CORS_ORIGIN, etc.
pnpm dev                # API on :3001, Vite dev server on :5173
```

The backend proxy runs at `http://localhost:3001` and the UI at `http://localhost:5173`. CORS is pre‑configured for local development.

---

## Contributing

We welcome contributions! Please follow these steps:
1. **Fork the repository** and clone your fork.
2. Create a **feature branch** (`git checkout -b feat/awesome-feature`).
3. Run the development environment (see above) and ensure the UI builds.
4. Add tests or UI snapshots where applicable.
5. Submit a **Pull Request** with a clear description of your changes.
6. All PRs must pass CI (lint, TypeScript checks, Jest unit tests).

Read our full `CONTRIBUTING.md` for coding standards, commit message conventions, and release workflow.

---

## License

ZypherCenter is licensed under the **MIT License**. See the `LICENSE` file for details.

---

*Crafted with ❤️ by the Zypher Systems team.*
