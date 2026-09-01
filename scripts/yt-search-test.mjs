const q = encodeURIComponent('Pulp Fiction 1994 official trailer')
const res = await fetch(`https://www.youtube.com/results?search_query=${q}`, {
  headers: {
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    'accept-language': 'en-US,en;q=0.9',
  },
})
const html = await res.text()
console.log('status', res.status, 'len', html.length)

const ids = [...html.matchAll(/"videoId":"([\w-]{11})"/g)].map((m) => m[1])
console.log('first ids:', [...new Set(ids)].slice(0, 8))

const titles = [...html.matchAll(/"title":\{"runs":\[\{"text":"(.*?)"\}\]/g)].map((m) => m[1])
console.log('first titles:', titles.slice(0, 8))
