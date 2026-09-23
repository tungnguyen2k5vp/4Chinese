// @ts-nocheck
// Deploy with: supabase functions deploy pronunciation-score --no-verify-jwt
// The OpenAI key stays in Supabase: supabase secrets set OPENAI_API_KEY=...

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const reply = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const compactHanzi = (value: string) => value.replace(/[^\u3400-\u9fff\uf900-\ufaff]/gu, "");
function scoreTranscript(transcript: string, expected: string) {
  const heard = compactHanzi(transcript); const target = compactHanzi(expected);
  if (!heard) return { score: 0, feedback: "AI chưa nghe rõ từ. Hãy ở gần micro và đọc chậm từng âm tiết." };
  if (heard === target) return { score: 100, feedback: "AI nghe đúng từ mục tiêu. Bạn có thể chuyển sang từ tiếp theo." };
  if (heard.includes(target) || target.includes(heard)) return { score: 88, feedback: "AI đã nghe gần đúng. Hãy nghe lại mẫu và chú ý thanh điệu để đạt điểm tối đa." };
  return { score: 35, feedback: `AI nghe thành “${transcript}”. Hãy nghe mẫu rồi đọc lại rõ hơn, đặc biệt là các thanh điệu.` };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return reply({ message: "Chỉ hỗ trợ POST." }, 405);
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return reply({ message: "Chưa cấu hình OPENAI_API_KEY trên Supabase để chấm phát âm AI." }, 503);
  try {
    const data = await request.formData();
    const audio = data.get("audio"); const simplified = String(data.get("simplified") ?? "").trim(); const traditional = String(data.get("traditional") ?? "").trim(); const pinyin = String(data.get("pinyin") ?? "").trim();
    if (!(audio instanceof File) || audio.size < 400 || audio.size > 2_500_000 || !simplified || !pinyin) return reply({ message: "Bản ghi âm hoặc từ cần chấm không hợp lệ." }, 400);
    const openAiForm = new FormData();
    openAiForm.append("file", audio, "pronunciation.m4a"); openAiForm.append("model", "gpt-4o-mini-transcribe"); openAiForm.append("language", "zh");
    openAiForm.append("prompt", `Người học đang đọc đúng một từ tiếng Trung. Từ mục tiêu là ${simplified} (${traditional}), pinyin ${pinyin}. Hãy chép chính xác những gì nghe được bằng Hán tự.`);
    const transcriptionResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: openAiForm });
    if (!transcriptionResponse.ok) { console.error("OpenAI transcription failed", transcriptionResponse.status, await transcriptionResponse.text()); return reply({ message: "AI chưa thể nghe bản ghi âm lúc này. Hãy thử lại sau." }, 502); }
    const transcription = await transcriptionResponse.json(); const transcript = typeof transcription.text === "string" ? transcription.text.trim() : "";
    return reply({ ...scoreTranscript(transcript, simplified), transcript });
  } catch (error) { console.error(error); return reply({ message: "Không thể xử lý bản ghi âm. Hãy thử nói lại." }, 500); }
});
