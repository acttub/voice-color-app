// 보이스 컬러 — Vercel 서버리스 함수 (/api/analyze)
// 브라우저가 보낸 base64 오디오를 Gemini로 분석하고 계열/지역/속도 key만 반환.
// 키 숨김 · 음원 미저장(메모리만) · 베스트에포트 레이트리밋.
// 검증 2026-07-16: 실제 키로 오디오 콜 성공. 모델은 시간 지나면 단종 — 404 나면 GET /v1beta/models 로 목록 확인 후 GEMINI_MODEL 교체.
// 검증된 모델: gemini-2.5-flash(기본), gemini-flash-lite-latest(더 쌈), gemini-3.5-flash.
"use strict";

// 16색 = 톤 4단계(저음/중저음/중고음/고음) × 질감 4단계(따뜻/부드러움/또렷/서늘)
const SERIES = [
  "velvet","oak","bronze","noir",           // 저음
  "caramel","latte","denim","steel",        // 중저음
  "honey","cotton","soda","mint",           // 중고음
  "sunshine","marshmallow","sparkle","crystal" // 고음
];
const REGION = ["seoul","gyeonggi","gyeongsang","jeolla","gangwon","chungcheong"];
const TEMPO = ["very_slow","slow","normal","fast","very_fast"];

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    series: { type: "STRING", enum: SERIES },
    region: { type: "STRING", enum: REGION },
    tempo: { type: "STRING", enum: TEMPO },
    confidence: { type: "STRING", enum: ["low", "medium", "high"] }
  },
  required: ["series", "region", "tempo"]
};

function buildPrompt(pitchHz) {
  return [
    "너는 배우의 목소리를 '퍼스널컬러'처럼 분류하는 도우미다. 첨부 오디오를 듣고 판단한다.",
    "",
    "1) series(16색) = 톤 4단계 × 질감 4단계. 아래에서 하나 고른다(성별 무관, 귀로 들리는 인상 기준):",
    "  톤 저음:   따뜻=velvet, 부드러움=oak, 또렷=bronze, 서늘=noir",
    "  톤 중저음: 따뜻=caramel, 부드러움=latte, 또렷=denim, 서늘=steel",
    "  톤 중고음: 따뜻=honey, 부드러움=cotton, 또렷=soda, 서늘=mint",
    "  톤 고음:   따뜻=sunshine, 부드러움=marshmallow, 또렷=sparkle, 서늘=crystal",
    "",
    "2) region(지역 억양) = 발음·억양으로 추정. 서울/표준에 가까우면 seoul.",
    "  seoul, gyeonggi, gyeongsang(경상), jeolla(전라), gangwon(강원), chungcheong(충청) 중 하나.",
    "",
    "3) tempo(말속도) = very_slow, slow, normal, fast, very_fast 중 하나.",
    "",
    (pitchHz ? "참고: 측정된 평균 피치 약 " + pitchHz + "Hz (낮을수록 저음). 톤 판정에 참고하되 최종은 전체 인상으로 정한다." : ""),
    "",
    "절대 규칙:",
    "- 잘함/못함, 좋다/나쁘다, 발성, 딕션, 매력, 점수, 부족, 개선 같은 '평가'를 하지 마라. 서술만 한다.",
    "- 반드시 각 항목을 하나로 확정한다. 애매하면 더 가까운 쪽. region이 불확실하면 seoul.",
    "- 무난하게 중간(중저음·normal·seoul)으로만 몰지 말고, 뚜렷한 특징을 잡아 16색을 고루 쓴다.",
    "- 같은 목소리는 항상 같은 색이 나오도록 일관되게 판단한다.",
    "- 오직 JSON만 출력한다."
  ].join("\n");
}

// 베스트에포트 레이트리밋 (warm 인스턴스 한정)
const hits = new Map();
function limited(ip) {
  const now = Date.now(), win = 60000, max = 20;
  const arr = (hits.get(ip) || []).filter((t) => now - t < win);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > max;
}

function sanitize(p) {
  return {
    series: SERIES.includes(p && p.series) ? p.series : "velvet",
    region: REGION.includes(p && p.region) ? p.region : "seoul",
    tempo: TEMPO.includes(p && p.tempo) ? p.tempo : "normal"
  };
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "x";
  if (limited(ip)) return res.status(429).json({ error: "rate" });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: "no_key" });

  try {
    const body = req.body || {};
    const audio = body.audio;
    const mime = body.mime || "audio/webm";
    const pitchHz = Number(body.pitchHz) > 0 ? Math.round(Number(body.pitchHz)) : null;
    if (!audio) return res.status(400).json({ error: "no_audio" });

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const payload = {
      contents: [{ parts: [
        { text: buildPrompt(pitchHz) },
        { inline_data: { mime_type: mime, data: audio } }
      ]}],
      generationConfig: { responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA, temperature: 0 }
    };

    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!r.ok) throw new Error("gemini_" + r.status);
    const data = await r.json();
    const text =
      data && data.candidates && data.candidates[0] &&
      data.candidates[0].content && data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
    return res.status(200).json(sanitize(JSON.parse(text || "{}")));
  } catch (e) {
    return res.status(502).json({ error: "analyze_failed" });
  }
};
