import { useState, useEffect } from 'react'
import { useParams } from 'react-router'
import { Clock, Pencil, Save, X } from 'lucide-react'
import { useNodeTime, useUpdateNodeTime } from '@/lib/queries/nodes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonCard } from '@/components/ui/Skeleton'

// Comprehensive IANA timezone list grouped by region
const TIMEZONES = [
  'Africa/Abidjan','Africa/Accra','Africa/Addis_Ababa','Africa/Algiers','Africa/Asmara',
  'Africa/Bamako','Africa/Bangui','Africa/Banjul','Africa/Bissau','Africa/Blantyre',
  'Africa/Brazzaville','Africa/Bujumbura','Africa/Cairo','Africa/Casablanca','Africa/Ceuta',
  'Africa/Conakry','Africa/Dakar','Africa/Dar_es_Salaam','Africa/Djibouti','Africa/Douala',
  'Africa/El_Aaiun','Africa/Freetown','Africa/Gaborone','Africa/Harare','Africa/Johannesburg',
  'Africa/Juba','Africa/Kampala','Africa/Khartoum','Africa/Kigali','Africa/Kinshasa',
  'Africa/Lagos','Africa/Libreville','Africa/Lome','Africa/Luanda','Africa/Lubumbashi',
  'Africa/Lusaka','Africa/Malabo','Africa/Maputo','Africa/Maseru','Africa/Mbabane',
  'Africa/Mogadishu','Africa/Monrovia','Africa/Nairobi','Africa/Ndjamena','Africa/Niamey',
  'Africa/Nouakchott','Africa/Ouagadougou','Africa/Porto-Novo','Africa/Sao_Tome','Africa/Tripoli',
  'Africa/Tunis','Africa/Windhoek',
  'America/Adak','America/Anchorage','America/Anguilla','America/Antigua','America/Araguaina',
  'America/Argentina/Buenos_Aires','America/Argentina/Catamarca','America/Argentina/Cordoba',
  'America/Argentina/Jujuy','America/Argentina/La_Rioja','America/Argentina/Mendoza',
  'America/Argentina/Rio_Gallegos','America/Argentina/Salta','America/Argentina/San_Juan',
  'America/Argentina/San_Luis','America/Argentina/Tucuman','America/Argentina/Ushuaia',
  'America/Aruba','America/Asuncion','America/Atikokan','America/Bahia','America/Bahia_Banderas',
  'America/Barbados','America/Belem','America/Belize','America/Blanc-Sablon','America/Boa_Vista',
  'America/Bogota','America/Boise','America/Cambridge_Bay','America/Campo_Grande','America/Cancun',
  'America/Caracas','America/Cayenne','America/Cayman','America/Chicago','America/Chihuahua',
  'America/Costa_Rica','America/Creston','America/Cuiaba','America/Curacao','America/Danmarkshavn',
  'America/Dawson','America/Dawson_Creek','America/Denver','America/Detroit','America/Dominica',
  'America/Edmonton','America/Eirunepe','America/El_Salvador','America/Fort_Nelson','America/Fortaleza',
  'America/Glace_Bay','America/Godthab','America/Goose_Bay','America/Grand_Turk','America/Grenada',
  'America/Guadeloupe','America/Guatemala','America/Guayaquil','America/Guyana','America/Halifax',
  'America/Havana','America/Hermosillo','America/Indiana/Indianapolis','America/Indiana/Knox',
  'America/Indiana/Marengo','America/Indiana/Petersburg','America/Indiana/Tell_City',
  'America/Indiana/Vevay','America/Indiana/Vincennes','America/Indiana/Winamac','America/Inuvik',
  'America/Iqaluit','America/Jamaica','America/Juneau','America/Kentucky/Louisville',
  'America/Kentucky/Monticello','America/Kralendijk','America/La_Paz','America/Lima',
  'America/Los_Angeles','America/Lower_Princes','America/Maceio','America/Managua','America/Manaus',
  'America/Marigot','America/Martinique','America/Matamoros','America/Mazatlan','America/Menominee',
  'America/Merida','America/Metlakatla','America/Mexico_City','America/Miquelon','America/Moncton',
  'America/Monterrey','America/Montevideo','America/Montserrat','America/Nassau','America/New_York',
  'America/Nipigon','America/Nome','America/Noronha','America/North_Dakota/Beulah',
  'America/North_Dakota/Center','America/North_Dakota/New_Salem','America/Nuuk','America/Ojinaga',
  'America/Panama','America/Pangnirtung','America/Paramaribo','America/Phoenix','America/Port-au-Prince',
  'America/Port_of_Spain','America/Porto_Velho','America/Puerto_Rico','America/Punta_Arenas',
  'America/Rainy_River','America/Rankin_Inlet','America/Recife','America/Regina','America/Resolute',
  'America/Rio_Branco','America/Santarem','America/Santiago','America/Santo_Domingo','America/Sao_Paulo',
  'America/Scoresbysund','America/Sitka','America/St_Barthelemy','America/St_Johns','America/St_Kitts',
  'America/St_Lucia','America/St_Thomas','America/St_Vincent','America/Swift_Current','America/Tegucigalpa',
  'America/Thule','America/Thunder_Bay','America/Tijuana','America/Toronto','America/Tortola',
  'America/Vancouver','America/Whitehorse','America/Winnipeg','America/Yakutat','America/Yellowknife',
  'Antarctica/Casey','Antarctica/Davis','Antarctica/DumontDUrville','Antarctica/Macquarie',
  'Antarctica/Mawson','Antarctica/McMurdo','Antarctica/Palmer','Antarctica/Rothera',
  'Antarctica/Syowa','Antarctica/Troll','Antarctica/Vostok',
  'Asia/Aden','Asia/Almaty','Asia/Amman','Asia/Anadyr','Asia/Aqtau','Asia/Aqtobe','Asia/Ashgabat',
  'Asia/Atyrau','Asia/Baghdad','Asia/Bahrain','Asia/Baku','Asia/Bangkok','Asia/Barnaul',
  'Asia/Beirut','Asia/Bishkek','Asia/Brunei','Asia/Chita','Asia/Choibalsan','Asia/Colombo',
  'Asia/Damascus','Asia/Dhaka','Asia/Dili','Asia/Dubai','Asia/Dushanbe','Asia/Famagusta',
  'Asia/Gaza','Asia/Hebron','Asia/Ho_Chi_Minh','Asia/Hong_Kong','Asia/Hovd','Asia/Irkutsk',
  'Asia/Jakarta','Asia/Jayapura','Asia/Jerusalem','Asia/Kabul','Asia/Kamchatka','Asia/Karachi',
  'Asia/Kathmandu','Asia/Khandyga','Asia/Kolkata','Asia/Krasnoyarsk','Asia/Kuala_Lumpur',
  'Asia/Kuching','Asia/Kuwait','Asia/Macau','Asia/Magadan','Asia/Makassar','Asia/Manila',
  'Asia/Muscat','Asia/Nicosia','Asia/Novokuznetsk','Asia/Novosibirsk','Asia/Omsk','Asia/Oral',
  'Asia/Phnom_Penh','Asia/Pontianak','Asia/Pyongyang','Asia/Qatar','Asia/Qostanay','Asia/Qyzylorda',
  'Asia/Riyadh','Asia/Sakhalin','Asia/Samarkand','Asia/Seoul','Asia/Shanghai','Asia/Singapore',
  'Asia/Srednekolymsk','Asia/Taipei','Asia/Tashkent','Asia/Tbilisi','Asia/Tehran','Asia/Thimphu',
  'Asia/Tokyo','Asia/Tomsk','Asia/Ulaanbaatar','Asia/Urumqi','Asia/Ust-Nera','Asia/Vientiane',
  'Asia/Vladivostok','Asia/Yakutsk','Asia/Yangon','Asia/Yekaterinburg','Asia/Yerevan',
  'Atlantic/Azores','Atlantic/Bermuda','Atlantic/Canary','Atlantic/Cape_Verde','Atlantic/Faroe',
  'Atlantic/Madeira','Atlantic/Reykjavik','Atlantic/South_Georgia','Atlantic/St_Helena','Atlantic/Stanley',
  'Australia/Adelaide','Australia/Brisbane','Australia/Broken_Hill','Australia/Darwin',
  'Australia/Eucla','Australia/Hobart','Australia/Lindeman','Australia/Lord_Howe','Australia/Melbourne',
  'Australia/Perth','Australia/Sydney',
  'Europe/Amsterdam','Europe/Andorra','Europe/Astrakhan','Europe/Athens','Europe/Belgrade',
  'Europe/Berlin','Europe/Bratislava','Europe/Brussels','Europe/Bucharest','Europe/Budapest',
  'Europe/Busingen','Europe/Chisinau','Europe/Copenhagen','Europe/Dublin','Europe/Gibraltar',
  'Europe/Guernsey','Europe/Helsinki','Europe/Isle_of_Man','Europe/Istanbul','Europe/Jersey',
  'Europe/Kaliningrad','Europe/Kiev','Europe/Kirov','Europe/Lisbon','Europe/Ljubljana',
  'Europe/London','Europe/Luxembourg','Europe/Madrid','Europe/Malta','Europe/Mariehamn',
  'Europe/Minsk','Europe/Monaco','Europe/Moscow','Europe/Nicosia','Europe/Oslo','Europe/Paris',
  'Europe/Podgorica','Europe/Prague','Europe/Riga','Europe/Rome','Europe/Samara','Europe/San_Marino',
  'Europe/Sarajevo','Europe/Saratov','Europe/Simferopol','Europe/Skopje','Europe/Sofia',
  'Europe/Stockholm','Europe/Tallinn','Europe/Tirane','Europe/Ulyanovsk','Europe/Uzhgorod',
  'Europe/Vaduz','Europe/Vatican','Europe/Vienna','Europe/Vilnius','Europe/Volgograd',
  'Europe/Warsaw','Europe/Zagreb','Europe/Zaporozhye','Europe/Zurich',
  'Indian/Antananarivo','Indian/Chagos','Indian/Christmas','Indian/Cocos','Indian/Comoro',
  'Indian/Kerguelen','Indian/Mahe','Indian/Maldives','Indian/Mauritius','Indian/Mayotte','Indian/Reunion',
  'Pacific/Apia','Pacific/Auckland','Pacific/Bougainville','Pacific/Chatham','Pacific/Chuuk',
  'Pacific/Easter','Pacific/Efate','Pacific/Enderbury','Pacific/Fakaofo','Pacific/Fiji',
  'Pacific/Funafuti','Pacific/Galapagos','Pacific/Gambier','Pacific/Guadalcanal','Pacific/Guam',
  'Pacific/Honolulu','Pacific/Kiritimati','Pacific/Kosrae','Pacific/Kwajalein','Pacific/Majuro',
  'Pacific/Marquesas','Pacific/Midway','Pacific/Nauru','Pacific/Niue','Pacific/Norfolk',
  'Pacific/Noumea','Pacific/Pago_Pago','Pacific/Palau','Pacific/Pitcairn','Pacific/Pohnpei',
  'Pacific/Port_Moresby','Pacific/Rarotonga','Pacific/Saipan','Pacific/Tahiti','Pacific/Tarawa',
  'Pacific/Tongatapu','Pacific/Wake','Pacific/Wallis',
  'UTC',
]

function formatLocalTime(epochSeconds?: number) {
  if (!epochSeconds) return '—'
  return new Date(epochSeconds * 1000).toLocaleString([], {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export function NodeTimePage() {
  const { node } = useParams<{ node: string }>()
  const { data: timeData, isLoading } = useNodeTime(node!)
  const update = useUpdateNodeTime(node!)

  const [editing, setEditing] = useState(false)
  const [timezone, setTimezone] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (timeData?.timezone) setTimezone(timeData.timezone)
  }, [timeData])

  function handleSave() {
    if (!timezone) return
    update.mutate(timezone, { onSuccess: () => setEditing(false) })
  }

  function handleCancel() {
    if (timeData?.timezone) setTimezone(timeData.timezone)
    setSearch('')
    setEditing(false)
  }

  const filtered = search.trim()
    ? TIMEZONES.filter((tz) => tz.toLowerCase().includes(search.toLowerCase()))
    : TIMEZONES

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Time</h1>
          <p className="text-sm text-text-muted mt-0.5">Timezone and NTP settings for {node}</p>
        </div>
        {!editing ? (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5 mr-1.5" />Edit
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={handleCancel} disabled={update.isPending}>
              <X className="size-3.5 mr-1" />Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={update.isPending || !timezone}>
              <Save className="size-3.5 mr-1" />
              {update.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <SkeletonCard />
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-text-muted" />
              <CardTitle className="text-sm font-medium">Time Configuration</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Current time info */}
            <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-bg-muted">
              <div>
                <p className="text-xs text-text-muted mb-1">Local Time</p>
                <p className="text-sm font-mono tabular-nums text-text-primary">
                  {formatLocalTime(timeData?.localtime)}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-1">UTC Time</p>
                <p className="text-sm font-mono tabular-nums text-text-primary">
                  {formatLocalTime(timeData?.time)}
                </p>
              </div>
            </div>

            {/* Timezone */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Timezone
              </label>
              {editing ? (
                <div className="space-y-2">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filter timezones…"
                    className="w-full rounded border border-border-subtle bg-bg-input px-3 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
                  />
                  <select
                    size={8}
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full rounded border border-border-subtle bg-bg-input px-2 py-1 text-sm text-text-primary outline-none focus:border-accent font-mono [color-scheme:dark]"
                  >
                    {filtered.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                  <p className="text-xs text-text-disabled">
                    {filtered.length} {filtered.length === 1 ? 'timezone' : 'timezones'} shown
                  </p>
                </div>
              ) : (
                <p className="text-sm font-mono text-text-primary">
                  {timeData?.timezone ?? <span className="text-text-disabled italic">not set</span>}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
