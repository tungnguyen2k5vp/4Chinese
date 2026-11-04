import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, Switch, Text, View } from 'react-native';

import { ChineseScreen as Screen } from '@/components/ChineseScreen';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Disclosure } from '@/components/chinese/Disclosure';
import { themedCard } from '@/constants/design';
import { AI_MODELS, AI_PROVIDER_NOTICES, checkChineseAIBackend, ChineseAIError, type AIBackendStatus, type AIMode, type AIProvider } from '@/services/ai/gateway';
import { DEFAULT_AI_PREFERENCES, useAISettings, type AIPreferences } from '@/services/ai/preferences';
import { useTheme } from '@/theme/ThemeProvider';

const modes: [AIMode, string][] = [['AUTO_FREE', 'Auto · chỉ nhà cung cấp miễn phí'], ['GEMINI_FREE', 'Gemini Free'], ['GROQ_FREE', 'Groq Free'], ['OPENROUTER_FREE', 'OpenRouter Free · đang khóa'], ['LOCAL_ONLY', 'Chỉ trên thiết bị'], ['DISABLED', 'Tắt AI']];
export default function ChineseAISettings() {
  return <Settings />;
}
function Settings() {
  const theme = useTheme(), { preferences: prefs, ready, saving, error, load, change } = useAISettings();
  const [status, setStatus] = useState<AIBackendStatus | null>(null), [checking, setChecking] = useState(false), [checkError, setCheckError] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => { if (!ready) void load(); return () => request.current?.abort(); }, [load, ready]);
  const update = (patch: Partial<AIPreferences>) => { setStatus(null); void change({ ...prefs, ...patch }); };
  const body = { color: theme.textSecondary, fontSize: 15, lineHeight: 23 };
  const heading = { color: theme.textPrimary, fontSize: 18, fontWeight: '700' as const };
  return <Screen title="Cài đặt 4Chinese AI" hideHeader>
    <Text accessibilityRole="header" style={{ ...heading, fontSize: 24 }}>Bạn chọn nội dung gửi đi</Text>
    <Text style={body}>AI dùng dịch vụ bên ngoài. Câu hỏi và phần ngữ cảnh bạn chọn sẽ được gửi tới nhà cung cấp đã đồng ý. Chỉ bật các model được máy chủ xác minh miễn phí; hết lượt sẽ dừng.</Text>
    <View style={[themedCard(theme), { gap: 12 }]}>
      <Text style={heading}>Chế độ</Text>
      {modes.map(([mode, label]) => <Pressable key={mode} accessibilityRole="radio" accessibilityState={{ checked: prefs.mode === mode, disabled: !ready || saving || mode === 'OPENROUTER_FREE' }}
        disabled={!ready || saving || mode === 'OPENROUTER_FREE'} onPress={() => update({ mode })} style={{ minHeight: 48, justifyContent: 'center', borderWidth: 1, borderColor: prefs.mode === mode ? theme.primary : theme.border, borderRadius: 12, padding: 12 }}>
        <Text style={{ color: theme.textPrimary }}>{prefs.mode === mode ? '●' : '○'} {label}</Text>
      </Pressable>)}
      <Text style={body}>Chế độ trên thiết bị mở nội dung học có sẵn; chưa có AI chạy trực tiếp trên thiết bị. OpenAI chưa được bật vì chưa xác minh được quyền sử dụng miễn phí.</Text>
    </View>
    <View style={[themedCard(theme), { gap: 12 }]}>
      <Text style={heading}>Đồng ý riêng theo nhà cung cấp</Text>
      {(['gemini', 'groq', 'openrouter'] as AIProvider[]).map(provider => <View key={provider} style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Text style={{ ...heading, flex: 1 }}>{provider === 'gemini' ? 'Google Gemini' : provider === 'groq' ? 'Groq' : 'OpenRouter · đang khóa'}</Text>
          <Switch accessibilityLabel={`Cho phép gửi dữ liệu tới ${provider}`} disabled={!ready || saving || provider === 'openrouter'} value={prefs.consent.providers.includes(provider)}
            onValueChange={enabled => update({ consent: { ...prefs.consent, providers: enabled ? [...prefs.consent.providers.filter(p => p !== provider), provider] : prefs.consent.providers.filter(p => p !== provider) } })} />
        </View>
        <Text style={body}>{AI_PROVIDER_NOTICES[provider]}</Text>
        <Disclosure title={`Chi tiết ${provider}`}>
          {AI_MODELS.filter(m => m.provider === provider).map(model => <View key={model.id} style={{ gap: 8 }}>
            <Text selectable style={body}>{model.name}{'\n'}Model: {model.id}{'\n'}Tài liệu kiểm tra: {model.verifiedAt}{'\n'}{model.pricing === 'free-tier' ? 'Có free tier, còn cần xác minh account và billing.' : 'Model công bố miễn phí; endpoint/điều khoản chưa đủ để bật.'}{'\n'}Hạn mức thực tế phụ thuộc tài khoản; app không biết số lượt còn lại.{status ? `\nTrạng thái cấu hình: ${status.models.find(m => m.provider === provider)?.reason === null ? 'Đủ điều kiện cấu hình thử nghiệm; chưa kiểm live.' : 'Chưa đủ điều kiện gọi.'}` : '\nMáy chủ: chưa kiểm tra.'}</Text>
            <PrimaryButton label={`Đọc chính sách ${provider}`} variant="ghost" onPress={() => void Linking.openURL(model.privacy).catch(() => setCheckError('Chưa mở được trang chính sách.'))} />
          </View>)}
        </Disclosure>
      </View>)}
      <SettingSwitch label="Tôi từ 18 tuổi trở lên" value={prefs.consent.adult} disabled={!ready || saving} onChange={adult => update({ consent: { ...prefs.consent, adult } })} />
      <Text style={body}>Dịch vụ Gemini có yêu cầu độ tuổi và vùng sử dụng. Máy chủ cũng phải xác minh điều kiện của tài khoản trước khi cho thử.</Text>
    </View>
    <View style={[themedCard(theme), { gap: 12 }]}>
      <Text style={heading}>Phạm vi dữ liệu</Text>
      <SettingSwitch label="Cho phép chọn thêm ngữ cảnh học" value={prefs.consent.scope === 'selected'} disabled={!ready || saving} onChange={selected => update({ consent: { ...prefs.consent, scope: selected ? 'selected' : 'question' } })} />
      <Text style={body}>{prefs.consent.scope === 'selected' ? 'Ở màn hỏi AI, bạn vẫn phải chọn rõ có gửi nghĩa từ, cấu tạo chữ, ngữ pháp, đoạn đọc hoặc số liệu gộp. Ngữ cảnh và lịch sử mặc định không được gửi.' : 'Chỉ gửi câu hỏi bạn đang soạn. Không kèm ngữ cảnh hoặc lịch sử.'} Không tự gửi thông tin tài khoản, ghi chú, bộ từ, hồ sơ, lịch sử ôn, tài liệu khác hoặc ghi âm.</Text>
      <Text style={body}>AI tự tạo phiên khách riêng khi bạn kiểm tra máy chủ hoặc gửi câu hỏi. Không cần email/mật khẩu; phiên này không đăng nhập vào sao lưu hay đồng bộ. Nếu bạn đã đăng nhập Cloud, AI dùng phiên đó.</Text>
      <SettingSwitch label="Cho phép Auto thử một nhà cung cấp dự phòng đã đồng ý" value={prefs.consent.allowFailover} disabled={!ready || saving} onChange={allowFailover => update({ consent: { ...prefs.consent, allowFailover } })} />
      <Text style={body}>Tối đa một lần chuyển tuần tự khi lỗi tạm thời. Câu hỏi có thể được gửi tới cả hai nhà cung cấp bạn đã đồng ý. Không có fallback trả phí.</Text>
      <Text style={heading}>Giới hạn nội bộ mỗi ngày</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{[5, 10, 20, 40].map(n => <PrimaryButton key={n} label={`${n} lượt${prefs.dailyLimit === n ? ' ✓' : ''}`} variant="ghost" disabled={!ready || saving} onPress={() => update({ dailyLimit: n })} />)}</View>
      <Text style={body}>Đây là trần yêu cầu nội bộ, không phải quota miễn phí được nhà cung cấp bảo đảm. Máy chủ có thể áp dụng mức thấp hơn. Phiên mới không hoàn lại các lượt đã gửi.</Text>
    </View>
    {error ? <Text accessibilityRole="alert" style={{ ...body, color: theme.error }}>{error}</Text> : null}
    <PrimaryButton label="Kiểm tra cấu hình máy chủ (không gọi model)" variant="secondary" loading={checking} disabled={prefs.mode === 'DISABLED' || prefs.mode === 'LOCAL_ONLY'} onPress={async () => {
      if (request.current) return;
      const controller = new AbortController(); request.current = controller; setChecking(true); setCheckError('');
      try { const next = await checkChineseAIBackend(prefs.mode, controller.signal); if (!controller.signal.aborted) setStatus(next); }
      catch (e) { if (!controller.signal.aborted) setCheckError(e instanceof ChineseAIError ? e.message : 'Chưa kiểm tra được máy chủ.'); }
      finally { if (request.current === controller) { request.current = null; setChecking(false); } }
    }} />
    {status ? <Text accessibilityLiveRegion="polite" style={body}>Chỉ đọc cấu hình: {status.runtime === 'DEVELOPMENT' ? 'chế độ thử nghiệm giới hạn tài khoản' : 'AI máy chủ đang tắt'}. Chưa gọi thử model hoặc đọc được hạn mức còn lại.</Text> : null}
    {status?.accessId && status.models.every(model => model.reason === 'AI_UNAUTHORIZED') ? <View style={[themedCard(theme), { gap: 8 }]}>
      <Text style={heading}>Mở quyền dùng thử AI</Text>
      <Text style={body}>Gửi mã phiên bên dưới cho người quản trị để mở AI trên thiết bị này. Mã không chứa tiến độ học và không phải mật khẩu.</Text>
      <Text selectable accessibilityLabel={`Mã phiên AI ${status.accessId}`} style={{ ...body, color: theme.textPrimary }}>{status.accessId}</Text>
    </View> : null}
    {checkError ? <Text accessibilityRole="alert" style={{ ...body, color: theme.error }}>{checkError}</Text> : null}
    <PrimaryButton label="Tắt AI và thu hồi toàn bộ đồng ý" variant="danger" disabled={!ready || saving} onPress={() => update({ ...DEFAULT_AI_PREFERENCES, consent: { ...DEFAULT_AI_PREFERENCES.consent, providers: [] } })} />
    <Text style={body}>Lựa chọn được lưu riêng trên thiết bị, không vào database học và không sao lưu hội thoại. Thu hồi sẽ ngừng yêu cầu tiếp theo; dữ liệu đã gửi trước đó không thể thu hồi từ đây.</Text>
  </Screen>;
}
function SettingSwitch({ label, value, disabled, onChange }: { label: string; value: boolean; disabled: boolean; onChange: (value: boolean) => void }) {
  const theme = useTheme();
  return <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: 12 }}><Text style={{ flex: 1, color: theme.textPrimary, fontSize: 15, lineHeight: 22 }}>{label}</Text><Switch accessibilityLabel={label} disabled={disabled} value={value} onValueChange={onChange} /></View>;
}
