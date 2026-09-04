/** Match room health — sync uses authoritative match engine + shared storage. */
export default function handler(
  _req: { method?: string },
  res: { status: (n: number) => { json: (body: unknown) => void } },
) {
  res.status(200).json({
    ok: true,
    service: 'movie-match',
    moviesPerMatch: 10,
    phases: [
      'waiting',
      'countdown',
      'playing',
      'waiting_answers',
      'round_result',
      'next_movie',
      'final_result',
    ],
  })
}
