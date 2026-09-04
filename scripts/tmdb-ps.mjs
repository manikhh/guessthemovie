/**
 * HTTP via PowerShell — Node DNS is poisoned for TMDB/YouTube on some networks.
 */
import { spawnSync } from 'node:child_process'
import { writeFileSync, unlinkSync, mkdtempSync, readFileSync, rmdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const TMDB_TOKEN = process.env.TMDB_ACCESS_TOKEN
const TMDB_API_KEY = process.env.TMDB_API_KEY

function psWebRequest(url, { headers = {}, outBody = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'pshttp-'))
  const outFile = join(dir, 'out.txt')
  const metaFile = join(dir, 'meta.json')
  const errFile = join(dir, 'err.txt')
  const ps1 = join(dir, 'fetch.ps1')

  const headerAssigns = Object.entries(headers)
    .map(([k, v]) => `$headers['${k.replace(/'/g, "''")}'] = '${String(v).replace(/'/g, "''")}'`)
    .join('\n')

  const uri = url.replace(/'/g, "''")
  const outEsc = outFile.replace(/'/g, "''")
  const metaEsc = metaFile.replace(/'/g, "''")
  const errEsc = errFile.replace(/'/g, "''")

  writeFileSync(
    ps1,
    `
$ErrorActionPreference = 'Stop'
$headers = @{}
${headerAssigns}
try {
  $res = Invoke-WebRequest -Uri '${uri}' -Headers $headers -UseBasicParsing
  $meta = @{ status = [int]$res.StatusCode } | ConvertTo-Json -Compress
  [System.IO.File]::WriteAllText('${metaEsc}', $meta)
  ${outBody ? `[System.IO.File]::WriteAllText('${outEsc}', $res.Content)` : ''}
} catch {
  $code = 0
  if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
  $meta = @{ status = $code; error = $_.Exception.Message } | ConvertTo-Json -Compress
  [System.IO.File]::WriteAllText('${metaEsc}', $meta)
  [System.IO.File]::WriteAllText('${errEsc}', $_.Exception.Message)
  if ($code -eq 0) { exit 1 }
}
`,
    'utf8',
  )

  const result = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1],
    { encoding: 'utf8', windowsHide: true },
  )

  try {
    let meta = { status: 0 }
    try {
      meta = JSON.parse(readFileSync(metaFile, 'utf8'))
    } catch {
      /* ignore */
    }
    if (result.status !== 0 && !meta.status) {
      let err = result.stderr || result.stdout || `exit ${result.status}`
      try {
        err = readFileSync(errFile, 'utf8').trim() || err
      } catch {
        /* ignore */
      }
      throw new Error(`HTTP failed: ${err}`)
    }
    const body = outBody && meta.status ? readFileSync(outFile, 'utf8') : ''
    return { status: meta.status ?? 0, body, error: meta.error }
  } finally {
    for (const f of [outFile, metaFile, errFile, ps1]) {
      try {
        unlinkSync(f)
      } catch {
        /* ignore */
      }
    }
    try {
      rmdirSync(dir)
    } catch {
      /* ignore */
    }
  }
}

export function tmdbFetchSync(path, params = {}) {
  if (!TMDB_TOKEN && !TMDB_API_KEY) {
    throw new Error('Set TMDB_ACCESS_TOKEN or TMDB_API_KEY in .env')
  }

  const url = new URL(`https://api.themoviedb.org/3${path}`)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value))
  }
  if (!TMDB_TOKEN && TMDB_API_KEY) url.searchParams.set('api_key', TMDB_API_KEY)

  const headers = { Accept: 'application/json' }
  if (TMDB_TOKEN) headers.Authorization = `Bearer ${TMDB_TOKEN}`

  const { status, body, error } = psWebRequest(url.toString(), { headers })
  if (status < 200 || status >= 300) {
    throw new Error(`TMDB ${path} ${status}: ${(error || body || '').slice(0, 120)}`)
  }
  return JSON.parse(body)
}

export function youtubeEmbedSync(videoId) {
  return psWebRequest(`https://www.youtube.com/embed/${videoId}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })
}
