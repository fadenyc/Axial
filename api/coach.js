export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).end();

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'API key not configured' });
  }

  const { mode, stats } = req.body || {};
  if (!mode || !stats) return res.status(400).json({ error: 'Missing mode or stats' });

  const statsLine = Object.entries(stats)
    .filter(([, v]) => v !== null && v !== '--' && v !== '--:--')
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 40,
        system: `You are LiveCoach, a real-time athletic AI coach embedded in smart glasses HUD.
Reply with ONE short coaching message — 5 to 8 words max. No punctuation. No quotes.
Be specific, encouraging, and actionable based on the stats.
Examples: "Great pace keep it up", "Quicken your steps cadence is low", "Halfway push through", "Ease off your pace is too fast"`,
        messages: [{
          role: 'user',
          content: `Mode: ${mode} — ${statsLine}`,
        }],
      }),
    });

    const data = await response.json();
    const message = data.content?.[0]?.text?.trim().replace(/[".]/g, '') || 'Keep going';
    res.json({ message });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
