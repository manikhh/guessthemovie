/** Tiny seadfrvdfdaserless endpoint — visit /api/health to see Vercel Runtime Logs. */
export default function handler(
  _req: { method?: string },
  res: { status: (n: number) => { json: (body: unknown) => void } },
) {
  console.log('[health]', new Date().toISOString())
  res.status(200).json({
    ok: true,
    service: 'guessthemovie',
    note: 'Static SPA — game runs in the browser, not on the server.',
  })
}
