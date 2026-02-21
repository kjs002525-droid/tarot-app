export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { question, cards } = req.body;

    if (!question || !cards || cards.length !== 3) {
      return res.status(400).json({ error: '질문과 카드 3장이 필요합니다.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API 키가 설정되지 않았습니다.' });
    }

    // 카드 정보 정리
    const cardInfo = cards.map((c, i) => {
      const positions = ['원인', '현재', '결과'];
      return `${positions[i]}: ${c.name}${c.reversed ? ' (역방향)' : ' (정방향)'}`;
    }).join('\n');

    // Gemini에게 보낼 프롬프트
    const prompt = `당신은 신비롭고 따뜻한 타로 상담사입니다. 한국어로 답변해주세요.

사용자의 질문: ${question}

뽑힌 타로 카드:
${cardInfo}

위 세 장의 카드를 바탕으로 사용자의 질문에 대한 타로 리딩을 해주세요.
각 카드의 의미를 설명하고, 전체적인 메시지를 전달해주세요.
신비롭고 감성적인 문체로, 따뜻하고 희망적인 방향으로 답변해주세요.
답변은 500자 내외로 작성해주세요. 문장이 끊기지 않게 완전한 문장으로 마무리해주세요.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 1500,
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API error:', data);
      return res.status(500).json({ error: 'AI 응답 오류가 발생했습니다.' });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return res.status(500).json({ error: 'AI 응답을 받지 못했습니다.' });
    }

    return res.status(200).json({ result: text });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
}
