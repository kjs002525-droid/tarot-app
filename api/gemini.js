export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { question, cards } = await req.json();

    // index.html에서 보내는 형식:
    // cards = [ { name: "The Fool", reversed: false }, ... ]
    // 이를 프롬프트용 문자열로 변환
    const cardInfo = cards.map((c, i) => {
      const pos = ['원인', '현재', '결과'][i] || i + 1;
      return `${pos} 카드: ${c.name}${c.reversed ? ' (역방향)' : ''}`;
    }).join('\n');

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const prompt = `너는 단순한 타로 해석가가 아니라, 인간의 행동 패턴을 분석하여 미래를 시뮬레이션하는 '인과율 분석가'다. 반드시 한국어로만 답변하라.

[사용자 질문]: ${question}
[사용자 성향 컨텍스트]: 이성적이고 의심이 많음. 위로보다는 날카로운 분석과 현실적인 징조 예고를 원함.

[뽑힌 카드]:
${cardInfo}

사용자가 뽑은 3장의 카드를 다음 기준에 맞춰 해석하라.

---

🔮 당신이 반복해온 운명의 패턴
[원인 카드: ${cards[0]?.name}${cards[0]?.reversed ? ' (역방향)' : ''}]
이 카드가 나타내는 과거의 사건이 아니라, 그 사건을 만든 사용자의 '반복적인 행동 습관'이나 '기질'을 2~3문장으로 날카롭게 분석하라.

---

🌑 지금 당신의 눈을 가리고 있는 것
[현재 카드: ${cards[1]?.name}${cards[1]?.reversed ? ' (역방향)' : ''}]
이 카드가 보여주는 현재 상황에서 사용자가 범하고 있는 '인지적 오류'나 '심리적 맹점'을 2~3문장으로 구체적으로 지적하라.

---

⚡ 이대로 가면 마주할 장면
[미래 카드: ${cards[2]?.name}${cards[2]?.reversed ? ' (역방향)' : ''}]
단정적 예언이 아닌 확률적 시나리오로 제시하라.
• 관성 시나리오: 현재 태도를 바꾸지 않았을 때 닥칠 결과를 2문장으로.

---

⚠️ [주의] 곧 당신에게 나타날 운명의 신호
이 미래가 다가오고 있음을 알리는 사소하지만 현실적인 전조 현상 1가지를 구체적으로 예고하라. (예: 특정 물건의 분실, 특정 단어를 듣게 됨, 오랜 지인의 갑작스러운 연락 등)

---

💡 미래를 바꾸는 인과율 수정 행동
미래를 유리하게 바꾸기 위해 오늘 즉시 실행해야 할 구체적인 행동 지침 1가지를 제시하라. 추상적이지 않고 오늘 당장 할 수 있는 행동이어야 한다.

---

모든 문장은 반드시 완전하게 끝내라. 절대 중간에 끊지 마라. 각 섹션은 위의 형식을 그대로 따르라.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 1500,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || 'Gemini API error' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return new Response(JSON.stringify({ result: text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
