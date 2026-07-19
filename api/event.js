// 보이스 컬러 — 퍼널 이벤트 집계 (/api/event). Supabase 없으면 조용히 no-op.
"use strict";

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  const ev = req.body && String(req.body.event || "").slice(0, 40);
  const url = process.env.SUPABASE_URL;
  const skey = process.env.SUPABASE_SERVICE_KEY;
  if (ev && url && skey) {
    try {
      // REST 직접 호출 — 라이브러리 없이 (서버리스 콜드스타트 가볍게)
      await fetch(url + "/rest/v1/voice_events", {
        method: "POST",
        headers: { apikey: skey, Authorization: "Bearer " + skey, "Content-Type": "application/json" },
        body: JSON.stringify({ event: ev })
      });
    } catch (e) { /* 집계 실패는 무시 */ }
  }
  return res.status(200).json({ ok: true });
};
