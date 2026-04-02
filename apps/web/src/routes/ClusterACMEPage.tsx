import { useState } from 'react'
import { KeyRound, Plus, Pencil, Trash2, Globe, Shield } from 'lucide-react'
import {
  useACMEPlugins,
  useCreateACMEPlugin,
  useUpdateACMEPlugin,
  useDeleteACMEPlugin,
  type ACMEPlugin,
} from '@/lib/queries/cluster'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonCard } from '@/components/ui/Skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'

const inp = 'w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent [color-scheme:dark]'

// Common DNS providers used with Proxmox ACME
const DNS_PROVIDERS = [
  { value: 'acmedns', label: 'ACME DNS' },
  { value: 'acmeproxy', label: 'ACME Proxy' },
  { value: 'active24', label: 'Active24' },
  { value: 'ad', label: 'AD (Autodns)' },
  { value: 'ali', label: 'Alibaba Cloud DNS' },
  { value: 'anx', label: 'Anexia' },
  { value: 'arvan', label: 'ArvanCloud' },
  { value: 'autodns', label: 'AutoDNS' },
  { value: 'aws', label: 'AWS Route53' },
  { value: 'azion', label: 'Azion' },
  { value: 'azure', label: 'Azure DNS' },
  { value: 'cf', label: 'Cloudflare' },
  { value: 'clouddns', label: 'CloudDNS' },
  { value: 'cloudns', label: 'ClouDNS' },
  { value: 'cn', label: 'ClouDNS.net' },
  { value: 'conoha', label: 'ConoHa' },
  { value: 'constellix', label: 'Constellix' },
  { value: 'cx', label: 'CX' },
  { value: 'cyon', label: 'cyon' },
  { value: 'da', label: 'DirectAdmin' },
  { value: 'ddnss', label: 'DDNSS' },
  { value: 'desec', label: 'deSEC' },
  { value: 'df', label: 'df' },
  { value: 'dgon', label: 'DigitalOcean' },
  { value: 'dnshome', label: 'DNSHome' },
  { value: 'dnsimple', label: 'DNSimple' },
  { value: 'dnsservices', label: 'DNS Services' },
  { value: 'dode', label: 'Domain-Offensive' },
  { value: 'doapi', label: 'DigitalOcean API' },
  { value: 'domeneshop', label: 'Domeneshop' },
  { value: 'dp', label: 'Domain Parking' },
  { value: 'dpi', label: 'DPI' },
  { value: 'duckdns', label: 'Duck DNS' },
  { value: 'durabledns', label: 'DurableDNS' },
  { value: 'dynu', label: 'Dynu' },
  { value: 'dyn', label: 'Dyn' },
  { value: 'dynv6', label: 'dynv6' },
  { value: 'easydns', label: 'EasyDNS' },
  { value: 'edgedns', label: 'Akamai Edge DNS' },
  { value: 'euserv', label: 'EUserv' },
  { value: 'exoscale', label: 'Exoscale' },
  { value: 'fornex', label: 'Fornex' },
  { value: 'freedns', label: 'FreeDNS' },
  { value: 'gandi_livedns', label: 'Gandi LiveDNS' },
  { value: 'gcloud', label: 'Google Cloud DNS' },
  { value: 'gcore', label: 'G-Core' },
  { value: 'gdnsdk', label: 'GoDaddy' },
  { value: 'he', label: 'Hurricane Electric' },
  { value: 'hetzner', label: 'Hetzner DNS' },
  { value: 'hexonet', label: 'HEXONET' },
  { value: 'hostingde', label: 'hosting.de' },
  { value: 'huaweicloud', label: 'Huawei Cloud DNS' },
  { value: 'infoblox', label: 'Infoblox' },
  { value: 'infomaniak', label: 'Infomaniak' },
  { value: 'internetbs', label: 'Internet.bs' },
  { value: 'inwx', label: 'INWX' },
  { value: 'ionos', label: 'IONOS' },
  { value: 'ispconfig', label: 'ISPConfig' },
  { value: 'jd', label: 'JD Cloud' },
  { value: 'joker', label: 'Joker.com' },
  { value: 'kappernet', label: 'Kapper.net' },
  { value: 'kas', label: 'KAS' },
  { value: 'kinghost', label: 'KingHost' },
  { value: 'knot', label: 'Knot DNS' },
  { value: 'leaseweb', label: 'Leaseweb' },
  { value: 'lexicon', label: 'Lexicon (generic)' },
  { value: 'linode', label: 'Linode' },
  { value: 'linode_v4', label: 'Linode v4' },
  { value: 'loopia', label: 'Loopia' },
  { value: 'lua', label: 'Lua DNS' },
  { value: 'maradns', label: 'MaraDNS' },
  { value: 'me', label: 'me' },
  { value: 'miab', label: 'Mail-in-a-Box' },
  { value: 'misaka', label: 'Misaka' },
  { value: 'myapi', label: 'myapi' },
  { value: 'mydevil', label: 'MyDevil' },
  { value: 'mijnhost', label: 'mijn.host' },
  { value: 'mydnsjp', label: 'MyDNS.JP' },
  { value: 'namecheap', label: 'Namecheap' },
  { value: 'namecom', label: 'Name.com' },
  { value: 'namesilo', label: 'Namesilo' },
  { value: 'nanelo', label: 'Nanelo' },
  { value: 'nederhost', label: 'NederHost' },
  { value: 'neodigit', label: 'Neodigit' },
  { value: 'netcup', label: 'Netcup' },
  { value: 'netlify', label: 'Netlify' },
  { value: 'nic', label: 'NIC (Russia)' },
  { value: 'njalla', label: 'Njalla' },
  { value: 'nl', label: '.nl DNS' },
  { value: 'nsd', label: 'NSD' },
  { value: 'nsone', label: 'NS1' },
  { value: 'nsupdate', label: 'nsupdate' },
  { value: 'nw', label: 'nw' },
  { value: 'oci', label: 'Oracle Cloud Infrastructure' },
  { value: 'one', label: 'one.com' },
  { value: 'online', label: 'Online.net' },
  { value: 'openprovider', label: 'OpenProvider' },
  { value: 'openstack', label: 'OpenStack Designate' },
  { value: 'opnsense', label: 'OPNsense' },
  { value: 'ovh', label: 'OVH' },
  { value: 'pdns', label: 'PowerDNS' },
  { value: 'pleskxml', label: 'Plesk XML' },
  { value: 'pointhq', label: 'PointHQ' },
  { value: 'porkbun', label: 'Porkbun' },
  { value: 'rackcorp', label: 'RackCorp' },
  { value: 'rackspace', label: 'Rackspace' },
  { value: 'rage4', label: 'Rage4' },
  { value: 'rcode0', label: 'RcodeZero' },
  { value: 'regru', label: 'reg.ru' },
  { value: 'scaleway', label: 'Scaleway' },
  { value: 'schlundtech', label: 'Schlund Tech' },
  { value: 'selectel', label: 'Selectel' },
  { value: 'selfhost', label: 'Self-hosted DNS' },
  { value: 'servercow', label: 'Servercow' },
  { value: 'simply', label: 'Simply.com' },
  { value: 'tele3', label: 'Tele3' },
  { value: 'transip', label: 'TransIP' },
  { value: 'twd', label: 'TWD DNS' },
  { value: 'udr', label: 'UDR (Ukraine)' },
  { value: 'ultra', label: 'UltraDNS' },
  { value: 'unoeuro', label: 'Unoeuro' },
  { value: 'variomedia', label: 'Variomedia' },
  { value: 'veesp', label: 'Veesp' },
  { value: 'vercel', label: 'Vercel' },
  { value: 'vultr', label: 'Vultr' },
  { value: 'websupport', label: 'WebSupport' },
  { value: 'west_cn', label: 'West.cn' },
  { value: 'world4you', label: 'World4You' },
  { value: 'yandex', label: 'Yandex' },
  { value: 'zilore', label: 'Zilore' },
  { value: 'zone', label: 'Zone.eu' },
  { value: 'zonomi', label: 'Zonomi' },
]

// ── Plugin Dialog ────────────────────────────────────────────────────────────

function ACMEPluginDialog({
  existing,
  onClose,
}: {
  existing?: ACMEPlugin
  onClose: () => void
}) {
  const createPlugin = useCreateACMEPlugin()
  const updatePlugin = useUpdateACMEPlugin()
  const isEdit = !!existing

  const [pluginId, setPluginId] = useState(existing?.plugin ?? '')
  const [type, setType] = useState<'standalone' | 'dns'>(existing?.type ?? 'standalone')
  const [api, setApi] = useState(existing?.api ?? 'cf')
  const [data, setData] = useState(existing?.data ?? '')
  const [nodes, setNodes] = useState(existing?.nodes ?? '')
  const [disable, setDisable] = useState(existing?.disable === 1)

  const isPending = createPlugin.isPending || updatePlugin.isPending

  function submit() {
    if (!pluginId.trim()) return
    const payload: ACMEPlugin = {
      plugin: pluginId.trim(),
      type,
      disable: disable ? 1 : undefined,
    }
    if (type === 'dns') {
      if (api) payload.api = api
      if (data.trim()) payload.data = data.trim()
    }
    if (nodes.trim()) payload.nodes = nodes.trim()

    if (isEdit) {
      updatePlugin.mutate(payload, { onSuccess: () => onClose() })
    } else {
      createPlugin.mutate(payload, { onSuccess: () => onClose() })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-lg rounded-xl border border-border-subtle bg-bg-card shadow-2xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">
          {isEdit ? `Edit Plugin — ${existing!.plugin}` : 'Add ACME Plugin'}
        </h2>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-text-muted mb-1">Plugin ID</label>
            <input
              className={inp}
              value={pluginId}
              onChange={(e) => setPluginId(e.target.value)}
              placeholder="my-dns-plugin"
              disabled={isEdit}
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Type</label>
            <select
              className={inp}
              value={type}
              onChange={(e) => setType(e.target.value as 'standalone' | 'dns')}
              disabled={isEdit}
            >
              <option value="standalone">Standalone (HTTP)</option>
              <option value="dns">DNS Challenge</option>
            </select>
          </div>

          {type === 'dns' && (
            <>
              <div>
                <label className="block text-xs text-text-muted mb-1">DNS Provider</label>
                <select
                  className={inp}
                  value={api}
                  onChange={(e) => setApi(e.target.value)}
                >
                  {DNS_PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">
                  API Credentials
                  <span className="text-text-muted opacity-70 ml-1">(KEY=value, one per line)</span>
                </label>
                <textarea
                  className={`${inp} min-h-[80px] font-mono text-xs`}
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  placeholder={'CF_Token=your-token\nCF_Account_ID=your-account-id'}
                  spellCheck={false}
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs text-text-muted mb-1">
              Nodes
              <span className="text-text-muted opacity-70 ml-1">(comma-separated, blank = all)</span>
            </label>
            <input
              className={inp}
              value={nodes}
              onChange={(e) => setNodes(e.target.value)}
              placeholder="pve1,pve2"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={disable}
              onChange={(e) => setDisable(e.target.checked)}
              className="accent-accent"
            />
            <span className="text-sm text-text-muted">Disable this plugin</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button onClick={submit} disabled={isPending || !pluginId.trim()}>
            {isPending ? 'Saving…' : isEdit ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function ClusterACMEPage() {
  const { data: plugins, isLoading, error } = useACMEPlugins()
  const deletePlugin = useDeleteACMEPlugin()
  const [dialogPlugin, setDialogPlugin] = useState<ACMEPlugin | 'new' | null>(null)

  if (isLoading) return <SkeletonCard />

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound className="size-5 text-accent" />
          <h1 className="text-xl font-semibold text-text-primary">ACME Plugins</h1>
        </div>
        <Button size="sm" onClick={() => setDialogPlugin('new')}>
          <Plus className="size-4 mr-1" /> Add Plugin
        </Button>
      </div>

      {error ? (
        <Card>
          <CardContent className="py-8 text-center space-y-1">
            <p className="text-status-error font-medium">Failed to load ACME plugins</p>
            <p className="text-text-muted text-sm font-mono">{error.message}</p>
          </CardContent>
        </Card>
      ) : !plugins?.length ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <KeyRound className="size-10 text-text-muted mx-auto" />
            <p className="text-text-muted">No ACME plugins configured</p>
            <p className="text-text-muted text-sm">
              ACME plugins are used to validate domain control for Let&rsquo;s Encrypt TLS certificates.
            </p>
            <Button size="sm" className="mt-2" onClick={() => setDialogPlugin('new')}>
              <Plus className="size-4 mr-1" /> Add First Plugin
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle>Configured Plugins</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Nodes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plugins.map((plugin) => (
                  <TableRow key={plugin.plugin}>
                    <TableCell className="font-mono text-sm font-medium">{plugin.plugin}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                        plugin.type === 'dns'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {plugin.type === 'dns' ? <Globe className="size-3" /> : <Shield className="size-3" />}
                        {plugin.type === 'dns' ? 'DNS' : 'Standalone'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-text-muted">
                      {plugin.type === 'dns'
                        ? (DNS_PROVIDERS.find((p) => p.value === plugin.api)?.label ?? plugin.api ?? '—')
                        : 'HTTP validation'
                      }
                    </TableCell>
                    <TableCell className="font-mono text-xs text-text-muted">
                      {plugin.nodes ?? <span className="italic opacity-60">all</span>}
                    </TableCell>
                    <TableCell>
                      {plugin.disable === 1 ? (
                        <span className="text-xs text-status-error">Disabled</span>
                      ) : (
                        <span className="text-xs text-status-running">Active</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setDialogPlugin(plugin)}
                          className="p-1 text-text-muted hover:text-text-primary rounded"
                          title="Edit plugin"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete ACME plugin "${plugin.plugin}"?`)) {
                              deletePlugin.mutate(plugin.plugin)
                            }
                          }}
                          className="p-1 text-text-muted hover:text-status-error rounded"
                          title="Delete plugin"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Info card */}
      <Card>
        <CardContent className="py-4 px-4">
          <p className="text-xs text-text-muted leading-relaxed">
            <span className="text-text-primary font-medium">ACME plugins</span> automate TLS certificate issuance via Let&rsquo;s Encrypt.
            The <span className="text-text-primary">Standalone</span> plugin uses the built-in HTTP server on port 80 for domain validation.
            The <span className="text-text-primary">DNS</span> plugin creates DNS TXT records automatically using your DNS provider&rsquo;s API —
            enabling wildcard certificates and validation without requiring port 80 to be open.
            Configure the plugin here, then assign it to a node&rsquo;s ACME settings under the node&rsquo;s Certificate management.
          </p>
        </CardContent>
      </Card>

      {dialogPlugin && (
        <ACMEPluginDialog
          existing={dialogPlugin !== 'new' ? dialogPlugin : undefined}
          onClose={() => setDialogPlugin(null)}
        />
      )}
    </div>
  )
}
