# AI V1 — source audit

Ngày 03/11/2026. Đã đọc AGENTS.md và tài liệu Expo SDK57 chính xác; dùng skill Expo React Native Engineer và AI Engineer đã cài. Không thêm thư viện.

## Những nguồn thực sự có và đã đối chiếu

`docs/v8-3/{FEATURE_AUDIT,DATA_SAFETY,TEST_REPORT,THIRD_PARTY}.md`, `AI_ROLEPLAY_V5_COMPLETION.md`, `GEMINI_E2E_V5.md`, `GEMINI_SPEAKING_SETUP.md`, `PERSONAL_CONTEXT_MEMORY_V5_1.md`, `MOTION_UX_V2_{ACCESSIBILITY,DATABASE_SAFETY}.md`, `HANZII_GRAMMAR_COMPONENTS_2026-10-30.md`. Các báo cáo cũ là bằng chứng của lần kiểm trước, không phải xác minh runtime hôm nay.

| Khu vực | Bằng chứng source / quyết định |
|---|---|
| App | `package.json`, `src/app/_layout.tsx`, ChineseScreen/Screen, ThemeProvider, MotionPressable. Dùng router và semantic theme hiện có, target tối thiểu48dp; không thêm tab. |
| Chinese/English | `LanguageProvider`, Home nhánh ChineseHome và profile `isEnglish`. Route AI guard trước mount nội dung. Không thay file English/language/shared motion. |
| Từ điển | `types/models.ts`, `db/repository.ts`, `db/lexical-knowledge.ts`, Word Detail/LexicalKnowledgeCard. Chỉ đọc mục đang mở; published sense có review metadata. Nếu chưa có sense đã xuất bản, cho chọn từng nghĩa local, không gộp definitions. Không gửi vocabulary/sense ID. |
| Cấu tạo | `services/memory/character-content.ts`, Memory Structure, `db/hanzi-memory.ts`. Lấy cấu tạo hữu hạn đã biên soạn từ local; thiếu thì ghi thiếu, không đoán. Mẹo AI không phải từ nguyên. Lưu chỉ qua saveMemoryMnemonic sau preview/xác nhận, không sửa repo này. |
| Progress | `db/schema.ts`, migrations/database, models, báo cáo DATA_SAFETY. Schema thực tế47; không thêm migration/table hay gọi scheduler/award XP/record answer từ AI. |
| Ngữ pháp | `db/grammar.ts`, `services/learning/grammar-{guides,syllabus}.ts`, route grammar. Dùng cấu trúc/giải thích/ví dụ đang hiển thị, không cập nhật mastery. |
| Lỗi / confusables | `db/mistakes.ts`, error-intelligence-v2, data/confusable-words, routes. Chỉ summary số liệu không ID khi người dùng chọn; không resolve lỗi hay ghi practice. |
| Reader/context | Reader, db/vocabulary-context, PERSONAL_CONTEXT_MEMORY_V5_1. Chọn câu/đoạn hữu hạn và xem trước; không gửi toàn tài liệu, tên tài liệu hay notes. Nội dung là dữ liệu không tin cậy. |
| Backend/auth | `services/cloud/client.ts`, `supabase/config.toml`, gemini-conversation. Dùng Cloud session hiện có, JWT chỉ gửi Supabase để xác thực. Không gửi JWT/email/ID tới provider. `.env` hiện chỉ có tên biến public Supabase; không hiển thị giá trị. Không kiểm tra secret hoặc backend đã deploy. |
| AI cũ | speaking/gemini-conversation + contract, speaking/roleplay-v5, docs AI_ROLEPLAY_V5_COMPLETION: quota local có sẵn, backend limiter Map theo isolate. Chưa có distributed/durable limiter; AI mới chỉ cho allowlisted developer khi được cấu hình, production bị chặn. |
| Phát âm cũ | pronunciation/ai-pronunciation và function pronunciation-score dùng transcription OpenAI có thể tính phí; function cũ hướng dẫn no-verify-jwt và có log response lỗi. Không tái dùng endpoint này cho text tutor, không gọi live, không thay chức năng cũ trong task này. Free-only mới không được trình bày như áp dụng lên hệ phát âm cũ. |

## Repo tham khảo

Đã khảo sát tĩnh [free-claude-code](https://github.com/Alishahryar1/free-claude-code), commit `1c72f5fef14249936902aa7927348caec29939d6`: học ý tưởng registry, adapters, phân loại lỗi, giới hạn/retry. Không clone/chạy/cài proxy, không alias model khác thành Claude. [License AGPL-3.0-only](https://github.com/Alishahryar1/free-claude-code/blob/1c72f5fef14249936902aa7927348caec29939d6/LICENSE); không sao chép mã. Proxy mặc định bind0.0.0.0/auth off và in-process limiter không phù hợp đưa nguyên vào mobile backend.

## Kiểm tra provider từ tài liệu chính thức

Đọc ngày03/11/2026; public docs không chứng minh tài khoản cụ thể đang ở free plan. Mặc định không provider nào có quyền inference. Operator phải xác minh exact model, account không billing, điều khoản/vùng, audience và thời hạn; config thiếu/hết hạn => block. Không có live health hay quota chính xác giả lập.

- [Gemini pricing](https://aistudio.google.com/docs/pricing), [Gemini 3.8 Flash](https://aistudio.google.com/docs/models/gemini-3.8-flash), [terms](https://aistudio.google.com/docs/terms), [regions](https://aistudio.google.com/docs/available-regions): model có free tier; unpaid content có thể dùng cải thiện sản phẩm, có giới hạn tuổi/vùng. Không bật chỉ vì có key. Không dùng search/tools/grounding có thể phát sinh phí.
- [Groq models](https://console.groq.com/docs/models), [GPT-OSS120B](https://console.groq.com/docs/model/openai/gpt-oss-120b), [billing](https://console.groq.com/docs/billing-faqs), [rate limits](https://console.groq.com/docs/rate-limits), [data](https://console.groq.com/docs/your-data): có free account tier; model ở developer tier có giá. Không suy free từ model ID. Data có ngoại lệ retention xử lý lỗi/lạm dụng; không hứa bảo mật tuyệt đối.
- [OpenRouter exact free model](https://openrouter.ai/openai/gpt-oss-120b:free), [free routing](https://openrouter.ai/docs/guides/routing/model-variants/free), [privacy](https://openrouter.ai/docs/guides/privacy/data-collection): chưa xác minh underlying endpoint/retention/location cho account, nên disabled. Không route cá nhân tới nhà cung cấp ngầm.
- OpenAI direct: chưa xác minh zero-cost entitlement, disabled; model openai/gpt-oss trên **Groq** không phải dịch vụ OpenAI direct.

Không gọi inference hoặc API billing để kiểm tra. Chất lượng Trung–Việt của model mới còn cần đánh giá có người duyệt; unit/mock không chứng minh chất lượng ngôn ngữ hay uptime.

Đối chiếu thêm [Gemini generateContent REST](https://aistudio.google.com/api-reference/generate-content): adapter dùng `generationConfig.responseFormat.text` với enum `APPLICATION_JSON`, schema JSON và thinking level `LOW`; không nhầm với trường của Interactions API. [Groq Structured Outputs](https://console.groq.com/docs/structured-outputs) chưa hỗ trợ streaming khi dùng JSON schema. Registry phân biệt text streaming với structured streaming; gateway V1 trả kết quả sau khi validate toàn bộ JSON.
