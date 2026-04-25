export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { photos, lang } = req.body

  const systemPrompt = lang === 'ko'
    ? `당신은 따뜻하고 감성적인 감사일기 작가입니다. 사진 속에서 아름답고 감사한 순간들을 발견하여 진심 어린 감사일기를 한국어로 써주세요. 따뜻하고 감성적이면서도 밝고 긍정적인 문체로, 마치 소중한 일기장에 쓰는 것처럼 자연스럽게 작성해주세요. 250자 내외로, 날짜나 제목 없이 일기 본문만 적어주세요.`
    : `You are a warm, heartfelt gratitude journal writer. Find the beautiful, grateful moments in the photos and write a sincere gratitude journal entry in English. Use a warm, emotional yet bright and positive tone — as if writing in a treasured diary. Write about 150 words, body only (no date or title).`

  const imageContent = photos.map(p => ({
    type: 'image',
    source: { type: 'base64', media_type: p.mediaType, data: p.data }
  }))

  const userText = lang === 'ko'
    ? '이 사진들을 보고 감사일기를 써주세요.'
    : 'Please write a gratitude journal entry from these photos.'

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: [...imageContent, { type: 'text', text: userText }] }]
    })
  })

  const data = await response.json()
  res.json({ diary: data.content?.[0]?.text || '' })
}