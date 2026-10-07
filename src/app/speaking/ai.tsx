import { Ionicons } from "@expo/vector-icons";
import { requireOptionalNativeModule } from "expo-modules-core";
import { router, useFocusEffect, type Href } from "expo-router";
import type { ExpoSpeechRecognitionErrorEvent, ExpoSpeechRecognitionOptions, ExpoSpeechRecognitionResultEvent } from "expo-speech-recognition";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { Screen } from "@/components/Screen";
import { SafeBottomAction } from '@/components/ui/SafeBottomAction';
import { LearningLandscape } from "@/components/visual/LearningLandscape";
import { radius, spacing, themedCard } from "@/constants/design";
import { budgetedRoleplayTransport, deleteRoleplayHistory, getRoleplayAiLimits, listRoleplayHistory, minimizeRoleplayHistory,
  roleplayHistoryLabel, saveRoleplayHistory, setRoleplayAiLimits, type RoleplayAiLimits, type RoleplayHistoryRecord } from '@/db/roleplay-history';
import { useConfirmation } from '@/hooks/use-confirmation';
import { useStudySession } from "@/hooks/use-study-session";
import { speakChinese, stopChineseSpeech } from "@/services/audio/chinese-speech";
import { sendGeminiConversationTurn } from "@/services/speaking/gemini-conversation";
import { beginRoleplayTurn, cancelRoleplayTurn, createRoleplaySession, currentRoleplayGoal, finishRoleplayTurn,
  requestRoleplayReply, resetRoleplaySession, ROLEPLAY_CONSENT_COPY, ROLEPLAY_MAX_INPUT, ROLEPLAY_SCENES,
  ROLEPLAY_TURN_LIMITS, ROLEPLAY_VOICE_LIMIT_MS, roleplayFailureHint, roleplayScene, roleplaySummary,
  setRoleplayConsent, setRoleplayMode, toggleRoleplayGoal, type RoleplaySceneId, type RoleplaySession } from '@/services/speaking/roleplay-v5';
import { useTheme, useThemeStyles } from "@/theme/ThemeProvider";
import type { ThemeTokens } from "@/theme/tokens";

type NativeSpeechModule = {
  isRecognitionAvailable: () => boolean;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  start: (options: ExpoSpeechRecognitionOptions) => void;
  abort: () => void;
  addListener: (eventName: "start" | "end" | "result" | "error" | "nomatch", listener: (event: unknown) => void) => { remove: () => void };
};
const nativeSpeech = requireOptionalNativeModule<NativeSpeechModule>("ExpoSpeechRecognition");
const newSessionId = () => `rp-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;

export default function AiSpeakingScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const styles = useThemeStyles(createStyles);
  const { ask, dialog } = useConfirmation();
  useStudySession(db);
  const [session, setSession] = useState(() => createRoleplaySession());
  const sessionRef = useRef(session);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [draft, setDraft] = useState("");
  const [listening, setListening] = useState(false);
  const [readReplies, setReadReplies] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeCode, setNoticeCode] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const sessionId = useRef(newSessionId());
  const [history, setHistory] = useState<RoleplayHistoryRecord[]>([]);
  const [historyError, setHistoryError] = useState(false);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [summaryOptIn, setSummaryOptIn] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState('');
  const [limits, setLimits] = useState<RoleplayAiLimits | null>(null);
  const active = useRef(false);
  const requestController = useRef<AbortController | null>(null);
  const voiceActive = useRef(false);
  const permissionPending = useRef(false);
  const voiceGeneration = useRef(0);
  const voiceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackGeneration = useRef(0);
  const scrollRef = useRef<ScrollView | null>(null);
  const requesting = !!session.pending;
  const busy = requesting || listening || historyBusy;
  const exhausted = session.attemptsUsed >= session.turnLimit;
  const practiceScene = roleplayScene(session.scene);
  const goal = currentRoleplayGoal(session);
  const summary = roleplaySummary(session);
  const canSend = !busy && !exhausted && !!draft.trim() && (session.mode !== 'AI' || session.consent);
  const publish = useCallback((next: RoleplaySession) => { sessionRef.current = next; setSession(next); }, []);
  const refreshHistory = useCallback(async () => {
    try { const rows = await listRoleplayHistory(db); if (active.current) { setHistory(rows); setHistoryError(false); } }
    catch { if (active.current) setHistoryError(true); }
  }, [db]);

  const stopVoice = useCallback(() => {
    voiceGeneration.current++; voiceActive.current = false;
    permissionPending.current = false;
    if (voiceTimer.current) clearTimeout(voiceTimer.current);
    voiceTimer.current = null; nativeSpeech?.abort(); setListening(false);
  }, []);
  const cancelPending = useCallback(() => {
    requestController.current?.abort(); requestController.current = null;
    const current = sessionRef.current;
    if (current.pending) {
      setDraft(current.pending.text);
      publish(cancelRoleplayTurn(current));
      setNotice(roleplayFailureHint('cancelled')); setNoticeCode('cancelled');
    }
  }, [publish]);

  useFocusEffect(useCallback(() => {
    active.current = true;
    void refreshHistory();
    void getRoleplayAiLimits(db).then((value) => { if (active.current) setLimits(value); })
      .catch(() => { if (active.current) setLimits(null); });
    const appState = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        active.current = true;
        return;
      }
      active.current = false;
      if (permissionPending.current) return;
      stopVoice(); cancelPending(); playbackGeneration.current++;
      setSpeakingId(null);
      void stopChineseSpeech();
    });
    return () => {
      active.current = false;
      appState.remove();
      stopVoice(); cancelPending(); playbackGeneration.current++;
      void stopChineseSpeech();
      setSpeakingId(null);
    };
  }, [cancelPending, stopVoice, db, refreshHistory]));

  const playReply = useCallback(async (text: string, id: string) => {
    if (!active.current) return;
    const playback = ++playbackGeneration.current;
    setSpeakingId(id);
    setNotice(null);
    const result = await speakChinese(text, {
      onDone: () => { if (active.current && playback === playbackGeneration.current) setSpeakingId(null); },
      onStopped: () => { if (active.current && playback === playbackGeneration.current) setSpeakingId(null); },
      onError: () => { if (active.current && playback === playbackGeneration.current) { setSpeakingId(null); setNotice("Chưa phát được giọng Mandarin. Bạn vẫn có thể đọc nội dung."); } },
    });
    if (!result.ok && active.current && playback === playbackGeneration.current) {
      setSpeakingId(null);
      setNotice(result.reason === "missing-mandarin-voice"
        ? "Thiết bị chưa có giọng Mandarin. Hãy cài giọng tiếng Trung trong cài đặt hệ thống."
        : "Chưa phát được câu trả lời. Hãy thử lại.");
    }
  }, []);

  const sendTurn = useCallback(async (rawText: string) => {
    if (!active.current || sessionRef.current.pending || voiceActive.current) return;
    let next: RoleplaySession;
    try { next = beginRoleplayTurn(sessionRef.current, rawText); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Chưa thể bắt đầu lượt.'); return; }
    publish(next);
    setNotice(null);
    setNoticeCode(null);
    setDraft("");
    const controller = new AbortController();
    requestController.current = controller;
    try {
      const reply = await requestRoleplayReply(next, controller.signal,
        budgetedRoleplayTransport(db, sessionId.current, sendGeminiConversationTurn));
      if (!active.current || controller.signal.aborted || requestController.current !== controller) return;
      publish(finishRoleplayTurn(sessionRef.current, next.pending!.id, reply));
      if (readReplies) void playReply(reply.replyChinese, String(next.pending!.id));
    } catch (error) {
      if (!active.current || controller.signal.aborted || requestController.current !== controller) return;
      const item = error as { code?: string };
      publish(cancelRoleplayTurn(sessionRef.current, next.pending!.id));
      setNotice(roleplayFailureHint(item.code ?? 'unknown'));
      setNoticeCode(item.code ?? "unknown");
      setDraft(next.pending!.text);
    } finally {
      if (requestController.current === controller) requestController.current = null;
    }
  }, [db, playReply, publish, readReplies]);

  useEffect(() => {
    if (!nativeSpeech || Platform.OS === "web") return undefined;
    const start = nativeSpeech.addListener("start", () => {
      if (!active.current || !voiceActive.current) return;
      setListening(true);
      setNotice("Đang nghe tiếng Trung… hãy nói một câu ngắn.");
      setNoticeCode(null);
    });
    const end = nativeSpeech.addListener("end", () => {
      voiceActive.current = false;
      if (voiceTimer.current) clearTimeout(voiceTimer.current); voiceTimer.current = null;
      if (active.current) setListening(false);
    });
    const result = nativeSpeech.addListener("result", (event) => {
      const speech = event as ExpoSpeechRecognitionResultEvent;
      if (!speech.isFinal || !active.current || !voiceActive.current) return;
      stopVoice();
      const transcript = speech.results[0]?.transcript?.trim() ?? "";
      if (!transcript) {
        setNotice("Chưa nhận được lời nói. Hãy nói lại gần micro hoặc nhập câu.");
        return;
      }
      if (transcript.length > ROLEPLAY_MAX_INPUT) {
        setDraft(transcript.slice(0, ROLEPLAY_MAX_INPUT));
        setNotice('Transcript vượt 300 ký tự; chỉ giữ 300 ký tự đầu để bạn sửa. Chưa gửi AI.');
      } else {
        setDraft(transcript);
        setNotice('Đã nhận thành chữ. Kiểm tra/sửa rồi bấm Gửi; chưa gửi lên AI. Nhận chữ không phải chấm phát âm.');
      }
    });
    const noMatch = nativeSpeech.addListener("nomatch", () => {
      if (!active.current || !voiceActive.current) return;
      stopVoice();
      setNotice("Chưa nhận ra câu nói. Hãy nói chậm hơn hoặc nhập câu bằng bàn phím.");
    });
    const error = nativeSpeech.addListener("error", (event) => {
      const speechError = event as ExpoSpeechRecognitionErrorEvent;
      if (!active.current || !voiceActive.current || speechError.error === "aborted") return;
      stopVoice();
      setNotice(speechError.error === "not-allowed" || speechError.error === "service-not-allowed"
        ? "Chưa có quyền micro/nhận dạng giọng nói. Hãy cấp quyền trong Cài đặt rồi thử lại."
        : speechError.error === "network"
          ? "Dịch vụ nhận giọng nói đang lỗi mạng. Hãy nhập câu hoặc thử lại."
          : "Không nhận được lời nói. Hãy kiểm tra dịch vụ nhận giọng nói và thử lại.");
    });
    return () => [start, end, result, noMatch, error].forEach((item) => item.remove());
  }, [stopVoice]);

  useEffect(() => {
    // No forced animated scrolling; the user can inspect goals and privacy without losing position.
    if (session.exchanges.length) requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: false }));
  }, [session.exchanges.length]);

  useEffect(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }));
  }, [conversationStarted]);

  const beginListening = async () => {
    if (sessionRef.current.pending || voiceActive.current || exhausted || !active.current) return;
    if (Platform.OS === "web" || !nativeSpeech) {
      setNotice("Nhận giọng nói cần bản Android/iOS. Bạn vẫn có thể nhập câu tiếng Trung bên dưới.");
      return;
    }
    if (!nativeSpeech.isRecognitionAvailable()) {
      setNotice("Thiết bị chưa có dịch vụ nhận giọng nói. Hãy cập nhật dịch vụ Speech hoặc nhập câu.");
      return;
    }
    playbackGeneration.current++; setSpeakingId(null); void stopChineseSpeech();
    const generation = ++voiceGeneration.current;
    voiceActive.current = true; setListening(true);
    try {
      permissionPending.current = true;
      let permission: { granted: boolean };
      try {
        permission = await nativeSpeech.requestPermissionsAsync();
      } finally {
        permissionPending.current = false;
      }
      if (generation !== voiceGeneration.current) return;
      if (!permission.granted) {
        stopVoice();
        setNotice("Cần cấp quyền micro và nhận dạng giọng nói. Bạn có thể nhập câu bằng bàn phím.");
        return;
      }
      if (!active.current || !voiceActive.current) return;
      setNotice("Đang mở micro…");
      voiceTimer.current = setTimeout(() => {
        stopVoice();
        if (active.current) setNotice('Đã dừng nhận giọng nói sau 20 giây. Có thể nhập câu bằng bàn phím.');
      }, ROLEPLAY_VOICE_LIMIT_MS);
      nativeSpeech.start({
        lang: "zh-CN",
        continuous: false,
        interimResults: true,
        maxAlternatives: 1,
        androidIntentOptions: { EXTRA_LANGUAGE_MODEL: "free_form" },
      });
    } catch {
      if (generation !== voiceGeneration.current || !active.current) return;
      stopVoice();
      setNotice("Không thể mở micro. Hãy thử lại hoặc nhập câu bằng bàn phím.");
    }
  };

  const explainMicrophone = () => {
    void ask({
      title: 'Nhận lời nói thành chữ',
      message: 'Dịch vụ nhận giọng nói của hệ thống có thể dùng mạng theo cài đặt thiết bị. Ứng dụng không gửi tệp âm thanh tới Gemini. Bản chép lời chỉ điền vào ô để bạn kiểm tra; không tự gửi và không chấm điểm phát âm.',
      acceptLabel: 'Bật micro',
      cancelLabel: 'Hủy',
    }).then((accepted) => { if (accepted) void beginListening(); });
  };

  const submitTyped = () => { if (!busy) void sendTurn(draft); };
  const clearConversation = () => {
    setConversationStarted(false);
    stopVoice(); cancelPending(); playbackGeneration.current++;
    publish(resetRoleplaySession(sessionRef.current));
    sessionId.current = newSessionId();
    setSummaryOptIn(false); setSummaryDraft('');
    setDraft("");
    setNotice(null);
    setNoticeCode(null);
    setSpeakingId(null);
    void stopChineseSpeech();
  };
  const changePractice = (scene: RoleplaySceneId, level = session.level, turnLimit = session.turnLimit) => {
    clearConversation(); publish(resetRoleplaySession(sessionRef.current, scene, level, turnLimit));
  };
  const useOffline = () => {
    cancelPending(); publish(setRoleplayMode(sessionRef.current, 'OFFLINE'));
    setNotice('Kịch bản cố định chạy tại máy, không gọi Gemini và không đánh giá câu của bạn.'); setNoticeCode(null);
  };
  const withdrawConsent = () => {
    cancelPending(); publish(setRoleplayConsent(sessionRef.current, false));
    setNotice('Đã rút đồng ý; các lượt sau dùng offline. Không thể thu hồi chữ đã gửi trước đó.'); setNoticeCode(null);
  };
  const saveSummary = async () => {
    if (busy) return;
    setHistoryBusy(true);
    try {
      const row = minimizeRoleplayHistory(sessionId.current, sessionRef.current, summaryOptIn, summaryDraft);
      await saveRoleplayHistory(db, row);
      await refreshHistory();
      if (active.current) setNotice('Đã lưu tóm tắt tại máy; không lưu toàn bộ chat hay âm thanh.');
    } catch { if (active.current) setNotice('Chưa lưu được, hoặc phiên này đã lưu. Lịch sử cũ không bị ghi đè.'); }
    finally { setHistoryBusy(false); }
  };
  const removeHistory = async (id: string) => {
    const confirmed = await ask({ title: 'Xóa tóm tắt tại máy?', message: 'Không hoàn tác. Giới hạn AI đã dùng không được đặt lại.', acceptLabel: 'Xóa tóm tắt', cancelLabel: 'Giữ lại', acceptVariant: 'danger' });
    if (!confirmed || !active.current) return;
    setHistoryBusy(true);
    void deleteRoleplayHistory(db, id, true).then(refreshHistory)
      .catch(() => { if (active.current) setNotice('Chưa xóa được lịch sử.'); })
      .finally(() => setHistoryBusy(false));
  };
  const configureLimits = async (value: RoleplayAiLimits) => {
    if (busy) return;
    setHistoryBusy(true);
    try { await setRoleplayAiLimits(db, value); if (active.current) setLimits(value); }
    catch { if (active.current) setNotice('Chưa lưu được giới hạn AI. Không gửi AI nếu không kiểm tra được quota.'); }
    finally { setHistoryBusy(false); }
  };
  const startConversation = () => {
    if (session.mode === 'AI' && !session.consent) {
      setNotice('Hãy đọc và đồng ý với phần quyền riêng tư trước khi bắt đầu dùng AI. Kịch bản offline luôn sẵn có.');
      return;
    }
    setNotice(null);
    setConversationStarted(true);
  };

  return (
    <Screen scroll={false} avoidKeyboard hideTitle hideHeader title="Luyện nói với AI">
      {dialog}
      <View style={styles.keyboard}>
        <View style={styles.body}>
          <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={styles.messageList} keyboardShouldPersistTaps="handled">
          {!conversationStarted ? <>
          <View style={styles.studioHero}>
            <View style={styles.studioArt}><LearningLandscape mood="voice" scene="speak" height={122} /><View style={styles.studioSeal}><Ionicons name="mic" size={20} color="#FFFFFF" /></View><Text style={styles.studioArtLabel}>HỘI THOẠI TÌNH HUỐNG</Text></View>
            <View style={styles.studioHeroBody}><Text style={styles.studioEyebrow}>TÌNH HUỐNG ĐANG CHỌN</Text><Text style={styles.studioTitle}>{practiceScene.label}</Text><Text style={styles.studioCopy}>{practiceScene.setting}</Text><View style={styles.studioMeta}><Text style={styles.studioMetaText}>HSK {session.level}</Text><Text style={styles.metaBullet}>·</Text><Text style={styles.studioMetaText}>{session.turnLimit} lượt tối đa</Text><Text style={styles.metaBullet}>·</Text><Text style={[styles.studioMode, session.mode === 'AI' && styles.studioModeAi]}>{session.mode === 'AI' ? 'AI TÙY CHỌN' : 'OFFLINE'}</Text></View></View>
          </View>
          <View style={[styles.card, styles.setupCard]}>
            <View style={styles.optionHeader}>
              <Text style={styles.sectionTitle}>Chủ đề</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Xóa cuộc trò chuyện" disabled={busy} onPress={clearConversation} style={styles.clearButton}>
                <Text style={styles.link}>Làm mới</Text>
              </Pressable>
            </View>
            <View style={styles.chips}>
              {ROLEPLAY_SCENES.map((option) => {
                const selected = session.scene === option.id;
                return <Pressable key={option.id} accessibilityRole="button" accessibilityState={{ selected, disabled: busy }} disabled={busy}
                  onPress={() => changePractice(option.id)} style={[styles.chip, selected && styles.chipSelected]}>
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
                </Pressable>;
              })}
            </View>
            <View style={styles.optionHeader}><Text style={styles.sectionTitle}>Trình độ HSK</Text><Text style={styles.noteInline}>1–6</Text></View>
            <View style={styles.levels}>
              {[1, 2, 3, 4, 5, 6].map((value) => {
                const selected = session.level === value;
                return <Pressable key={value} accessibilityRole="button" accessibilityLabel={"Trình độ HSK " + value} accessibilityState={{ selected, disabled: busy }} disabled={busy}
                  onPress={() => changePractice(session.scene, value)} style={[styles.levelChip, selected && styles.chipSelected]}>
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{value}</Text>
                </Pressable>;
              })}
            </View>
            <Text style={styles.bodyCopy}>{practiceScene.setting}</Text>
            <Text style={styles.noteInline}>Mức luyện gợi ý: {practiceScene.recommendedLevel}. Tiêu chí thành công là checklist tự đánh giá bên dưới.</Text>
            <Text style={styles.bodyCopy}>Từ gợi ý: {practiceScene.targetWords.join(' · ')}</Text>
            <Text style={styles.bodyCopy}>Cấu trúc: {practiceScene.targetGrammar.join(' · ')}</Text>
            <Text style={styles.noteInline}>Trình độ là mức luyện mong muốn, không phải chứng nhận đề HSK. Đổi chủ đề/trình độ sẽ mở phiên offline mới và xóa chat tại màn hình.</Text>
            <Text style={styles.sectionTitle}>Giới hạn phiên</Text>
            <View style={styles.chips}>{ROLEPLAY_TURN_LIMITS.map((limit) => <Pressable key={limit} accessibilityRole="button"
              accessibilityLabel={`${limit} lượt mỗi phiên`} accessibilityState={{ selected: session.turnLimit === limit, disabled: busy || session.attemptsUsed > 0 }}
              disabled={busy || session.attemptsUsed > 0} onPress={() => changePractice(session.scene, session.level, limit)}
              style={[styles.chip, session.turnLimit === limit && styles.chipSelected]}>
              <Text style={[styles.chipText, session.turnLimit === limit && styles.chipTextSelected]}>{limit} lượt</Text>
            </Pressable>)}</View>
            <Text style={styles.bodyCopy}>Đã dùng {session.attemptsUsed}/{session.turnLimit} lượt · tối đa {ROLEPLAY_MAX_INPUT} ký tự/lượt. Lượt lỗi/hủy vẫn tính; không tự thử lại.</Text>
            <Text style={styles.sectionTitle}>Ngân sách AI tại máy</Text>
            <Text style={styles.bodyCopy}>{limits ? `${limits.daily_limit} lượt/ngày UTC · ${limits.session_limit} lượt AI/phiên. Lỗi/hủy vẫn tính sau khi giữ lượt; làm mới/xóa lịch sử không xóa quota ngày.` : 'Chưa đọc được quota: AI sẽ không gửi. Offline vẫn dùng được.'}</Text>
            {limits ? <>
              <View style={styles.chips}>{[10, 20, 40].map((daily) => <PrimaryButton key={daily} label={`${daily}/ngày`}
                variant={limits.daily_limit === daily ? 'primary' : 'secondary'} disabled={busy}
                onPress={() => void configureLimits({ ...limits, daily_limit: daily })} />)}</View>
              <View style={styles.chips}>{ROLEPLAY_TURN_LIMITS.map((cap) => <PrimaryButton key={cap} label={`${cap} AI/phiên`}
                variant={limits.session_limit === cap ? 'primary' : 'secondary'} disabled={busy}
                onPress={() => void configureLimits({ ...limits, session_limit: cap })} />)}</View>
            </> : null}
            <View style={styles.chips}>
              <PrimaryButton label="Kịch bản offline" variant={session.mode === 'OFFLINE' ? 'primary' : 'secondary'} disabled={busy} onPress={useOffline} />
              <PrimaryButton label="Dùng AI tùy chọn" variant={session.mode === 'AI' ? 'primary' : 'secondary'} disabled={busy || !session.consent}
                onPress={() => { publish(setRoleplayMode(sessionRef.current, 'AI')); setNotice(null); setNoticeCode(null); }} />
            </View>
          </View>
          <View style={[styles.card, styles.setupCard]}>
            <Text style={styles.sectionTitle}>Tóm tắt tại máy · {history.length} bản lưu</Text>
            <Text style={styles.bodyCopy}>Chỉ lưu chủ đề, mức luyện, lượt đã dùng, checklist và từ mục tiêu đã xuất hiện. Không lưu chat/audio. Không phải điểm hay xác nhận AI.</Text>
            <View style={styles.voiceRow}><Text style={styles.voiceLabel}>Cho phép lưu ghi chú tóm tắt</Text>
              <Switch accessibilityLabel="Cho phép lưu ghi chú tóm tắt riêng, không lưu toàn bộ transcript" disabled={busy} value={summaryOptIn}
                onValueChange={(value) => { setSummaryOptIn(value); if (!value) setSummaryDraft(''); }} /></View>
            {summaryOptIn ? <TextInput accessibilityLabel="Tóm tắt tự viết, tránh thông tin riêng tư" editable={!busy} multiline maxLength={600}
              placeholder="Tự viết tóm tắt ngắn, không chép toàn bộ hội thoại" style={styles.input} value={summaryDraft} onChangeText={setSummaryDraft} /> : null}
            <PrimaryButton label="Lưu tóm tắt phiên" disabled={busy || session.attemptsUsed === 0} onPress={() => void saveSummary()} />
            {historyError ? <><Text style={styles.bodyCopy}>Chưa đọc được lịch sử tại máy.</Text><PrimaryButton label="Đọc lại lịch sử" variant="secondary" disabled={busy} onPress={() => void refreshHistory()} /></> : null}
            {!historyError && !history.length ? <Text style={styles.bodyCopy}>Chưa có tóm tắt được lưu.</Text> : null}
            {history.map((row) => <View key={row.id} style={styles.coachNote}>
              <Text style={styles.bodyCopy}>{roleplayHistoryLabel(row)} · mức {row.level} · {row.saved_at.slice(0, 10)} · {row.attempts} lượt · tự đánh dấu {row.completed_goals}/{row.total_goals}</Text>
              {row.transcript_summary ? <Text style={styles.bodyCopy}>{row.transcript_summary}</Text> : null}
              <PrimaryButton label="Xóa tóm tắt này" variant="ghost" disabled={busy} onPress={() => removeHistory(row.id)} />
            </View>)}
          </View>
          <View style={[styles.card, styles.setupCard]}>
            <Text style={styles.sectionTitle}>Tự đánh giá mục tiêu: {summary.completedGoals}/{summary.totalGoals}</Text>
            <Text style={styles.bodyCopy}>Bạn tự đánh dấu sau khi luyện. Checklist không phải AI xác nhận, điểm thi hay điểm phát âm.</Text>
            {practiceScene.goals.map((item) => <Pressable key={item.id} accessibilityRole="checkbox" accessibilityLabel={item.label}
              accessibilityState={{ checked: session.checkedGoals.includes(item.id), disabled: busy }} disabled={busy}
              style={styles.goalRow} onPress={() => publish(toggleRoleplayGoal(sessionRef.current, item.id))}>
              <Text style={styles.bodyCopy}>{session.checkedGoals.includes(item.id) ? '☑' : '☐'} {item.label}</Text>
            </Pressable>)}
            <Text style={styles.sectionTitle}>Mục tiêu hiện tại: {goal.label}</Text>
            <Text selectable style={styles.starter}>{goal.learnerChinese}</Text>
            <PrimaryButton variant="secondary" label="Dùng câu mẫu để luyện" disabled={busy || exhausted} onPress={() => setDraft(goal.learnerChinese)} />
            <Text style={styles.bodyCopy}>Từ đã dùng (đối chiếu chữ, không chấm nói): {summary.usedWords.join(' · ') || 'Chưa có'}</Text>
          </View>
          <View style={[styles.card, styles.setupCard]}>
            <Text style={styles.sectionTitle}>Đồng ý trước khi gửi AI</Text>
            <Text style={styles.bodyCopy}>{ROLEPLAY_CONSENT_COPY}</Text>
            <Text style={styles.noteInline}>Kịch bản cố định không gọi mạng. Câu mẫu soạn sẵn, không phải phản hồi AI hay nội dung thi chính thức.</Text>
            {session.consent ? <PrimaryButton variant="ghost" label="Rút đồng ý · quay về offline" onPress={withdrawConsent} />
              : <PrimaryButton variant="secondary" label="Tôi đồng ý gửi chữ tối thiểu khi dùng AI" disabled={busy}
                onPress={() => publish(setRoleplayConsent(sessionRef.current, true))} />}
          </View>
          </> : <View style={[styles.card, styles.sessionBar]}>
            <View style={styles.sessionArt}><LearningLandscape mood="voice" scene="speak" height={76} /><View style={styles.sessionArtBadge}><Ionicons name="mic" size={15} color="#FFFFFF" /></View></View>
            <View style={styles.sessionHeader}>
              <View style={styles.sessionCopy}>
                <Text style={styles.sessionEyebrow}>ĐANG LUYỆN · {session.mode === 'AI' ? 'AI TÙY CHỌN' : 'OFFLINE'}</Text>
                <Text style={styles.sessionTitle}>{practiceScene.label}</Text>
                <Text style={styles.bodyCopy}>HSK {session.level} · Tự đánh dấu {summary.completedGoals}/{summary.totalGoals} mục tiêu</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Mở thiết lập tình huống" disabled={busy} onPress={() => setConversationStarted(false)} style={styles.clearButton}>
                <Text style={styles.link}>Thiết lập</Text>
              </Pressable>
            </View>
            <Text style={styles.sessionGoal}>Mục tiêu hiện tại: {goal.label}</Text>
          </View>}
            {conversationStarted && session.exchanges.length === 0 ? (
              <View style={[styles.card, styles.welcomeCard]}>
                <Ionicons color={theme.primaryText} name="chatbubbles-outline" size={29} />
                <Text style={styles.welcomeTitle}>Mình bắt đầu nhé</Text>
                <Text style={styles.bodyCopy}>{practiceScene.setting} · Nhập câu của bạn, hoặc dùng câu mẫu rồi tự sửa theo tình huống.</Text>
                <Text style={styles.starter}>Gợi ý: {goal.learnerChinese}</Text>
              </View>
            ) : null}
            {conversationStarted ? session.exchanges.map((item) => <View key={item.id} style={styles.exchange}>
              <View style={[styles.bubble, styles.userBubble]}>
                <Text style={styles.userLabel}>BẠN</Text>
                <Text style={styles.userText}>{item.text}</Text>
              </View>
              <View style={[styles.card, styles.assistantBubble]}>
                <View style={styles.aiHeader}>
                  <Text style={styles.aiLabel}>{item.origin === 'AI' ? 'BẠN LUYỆN AI · CẦN TỰ KIỂM TRA' : 'KỊCH BẢN OFFLINE · CỐ ĐỊNH'}</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel={speakingId === String(item.id) ? "Dừng phát câu trả lời" : "Nghe câu trả lời tiếng Trung"}
                    disabled={listening} onPress={() => speakingId === String(item.id) ? void stopChineseSpeech() : void playReply(item.reply.replyChinese, String(item.id))}
                    style={styles.replayButton}>
                    <Ionicons color={theme.primaryText} name={speakingId === String(item.id) ? "stop" : "volume-high"} size={21} />
                    <Text style={styles.replayText}>{speakingId === String(item.id) ? "Dừng" : "Nghe lại"}</Text>
                  </Pressable>
                </View>
                <Text style={styles.replyChinese}>{item.reply.replyChinese}</Text>
                <Text style={styles.replyPinyin}>{item.reply.pinyin}</Text>
                <Text style={styles.replyMeaning}>{item.reply.translationVi}</Text>
                <View style={styles.coachNote}>
                  <Text style={styles.coachLabel}>{item.origin === 'AI' ? 'GỢI Ý VỀ CHỮ · KHÔNG CHẤM PHÁT ÂM' : 'CÁCH TỰ LUYỆN'}</Text>
                  <Text style={styles.bodyCopy}>{item.reply.correctionVi}</Text>
                </View>
                {item.reply.suggestedChinese ? <Text style={styles.suggestion}>Bạn có thể đáp: {item.reply.suggestedChinese}</Text> : null}
              </View>
            </View>) : null}
            {conversationStarted && exhausted && session.attemptsUsed > 0 ? <View style={[styles.card, styles.resultCard]}>
              <Text style={styles.resultEyebrow}>KẾT THÚC PHIÊN</Text>
              <Text style={styles.sessionTitle}>{practiceScene.label}</Text>
              <Text style={styles.bodyCopy}>{summary.completedGoals}/{summary.totalGoals} mục tiêu do bạn tự đánh dấu · {session.attemptsUsed} lượt đã dùng.</Text>
              <Text style={styles.bodyCopy}>Từ mục tiêu xuất hiện: {summary.usedWords.join(' · ') || 'Chưa phát hiện từ mục tiêu trong nội dung đã nhập.'}</Text>
              <Text style={styles.noteInline}>Đây không phải điểm phát âm, điểm AI hay chứng nhận HSK. Nội dung chat và âm thanh không được lưu.</Text>
              <View style={styles.voiceRow}><Text style={styles.voiceLabel}>Cho phép lưu ghi chú tóm tắt riêng</Text>
                <Switch accessibilityLabel="Cho phép lưu ghi chú tóm tắt riêng, không lưu toàn bộ transcript" disabled={busy} value={summaryOptIn}
                  onValueChange={(value) => { setSummaryOptIn(value); if (!value) setSummaryDraft(''); }} /></View>
              {summaryOptIn ? <TextInput accessibilityLabel="Tóm tắt tự viết, tránh thông tin riêng tư" editable={!busy} multiline maxLength={600}
                placeholder="Tự viết tóm tắt ngắn, không chép toàn bộ hội thoại" style={styles.input} value={summaryDraft} onChangeText={setSummaryDraft} /> : null}
              <PrimaryButton label="Lưu tóm tắt tại máy" disabled={busy || session.attemptsUsed === 0} onPress={() => void saveSummary()} />
              <PrimaryButton label="Chọn tình huống khác" variant="secondary" disabled={busy} onPress={() => setConversationStarted(false)} />
            </View> : null}
            {requesting ? <View style={[styles.card, styles.pending]}><ActivityIndicator color={theme.primary} /><Text style={styles.bodyCopy}>Đang chuẩn bị lời đáp {session.mode === 'AI' ? 'AI' : 'offline'}…</Text></View> : null}

          {notice ? <View accessibilityLiveRegion="polite" style={[styles.noticeBox, (noticeCode === "login-required" || noticeCode === "unauthorized") && styles.noticeWarning]}>
            <Text style={styles.noticeText}>{notice}</Text>
            {noticeCode === "login-required" || noticeCode === "unauthorized"
              ? <PrimaryButton label="Đăng nhập Cloud" variant="secondary" onPress={() => router.push("/cloud" as Href)} />
              : null}
            {noticeCode && noticeCode !== 'cancelled' ? <PrimaryButton label="Tiếp tục bằng kịch bản offline" variant="secondary" onPress={useOffline} /> : null}
          </View> : null}

          {conversationStarted ? <>
            <View style={styles.privacyRow}>
              <Text style={styles.privacyCopy}>Micro dùng dịch vụ nhận giọng nói hệ thống (có thể dùng mạng); transcript luôn chờ bạn kiểm tra và bấm Gửi. Không suy ra điểm phát âm từ chữ. Chat chỉ giữ trong màn hình; Làm mới để xóa. Tóm tắt chỉ lưu khi bấm Lưu; ghi chú riêng cần bật đồng ý. Không lưu audio.</Text>
            </View>
            <View style={styles.voiceRow}>
              <Text style={styles.voiceLabel}>Đọc câu trả lời</Text>
              <Switch accessibilityLabel="Tự đọc câu trả lời của AI" value={readReplies} onValueChange={setReadReplies}
                trackColor={{ false: theme.border, true: theme.primary }} thumbColor={theme.surface} />
            </View>
          </> : null}
          {exhausted ? <View style={[styles.card, styles.setupCard]}><Text accessibilityLiveRegion="polite" style={styles.bodyCopy}>Đã hết lượt phiên. Tự xem lại checklist/câu mẫu; bấm Làm mới nếu muốn bắt đầu lại. Không có điểm phát âm/HSK được tính.</Text></View> : null}
          </ScrollView>
          <SafeBottomAction style={styles.actionDock}>
          {!conversationStarted ? <PrimaryButton
            label={session.exchanges.length ? 'Quay lại cuộc hội thoại' : `Bắt đầu luyện ${practiceScene.label.toLowerCase()}`}
            disabled={busy || (session.mode === 'AI' && !session.consent)} onPress={startConversation} /> : <>
            {busy ? <PrimaryButton label={listening ? 'Dừng nhận giọng nói' : 'Hủy lượt đang chờ'} variant="ghost"
              onPress={() => { stopVoice(); cancelPending(); }} /> : null}
            <Text style={styles.noteInline}>{session.mode === 'AI' ? 'AI tùy chọn' : 'Kịch bản offline'} · {draft.length}/{ROLEPLAY_MAX_INPUT} ký tự · {session.attemptsUsed}/{session.turnLimit} lượt</Text>
            <View style={styles.composer}>
              <TextInput accessibilityLabel="Câu tiếng Trung để luyện vai" editable={!busy && !exhausted} multiline maxLength={ROLEPLAY_MAX_INPUT}
                onChangeText={setDraft} onSubmitEditing={submitTyped} placeholder="Nhập câu tiếng Trung…"
                placeholderTextColor={theme.textMuted} returnKeyType="send" selectionColor={theme.primary}
                style={styles.input} value={draft} />
              <Pressable accessibilityRole="button" accessibilityLabel={listening ? "Đang nghe tiếng Trung" : "Nhận tiếng Trung thành bản nháp, không tự gửi"}
                accessibilityState={{ disabled: busy || exhausted || Platform.OS === "web" }} disabled={busy || exhausted || Platform.OS === "web"}
                onPress={explainMicrophone} style={({ pressed }) => [styles.actionButton, styles.micButton, listening && styles.micActive, pressed && !busy && styles.pressed]}>
                <Ionicons color={listening ? theme.onPrimary : theme.primaryText} name={listening ? "radio" : "mic"} size={22} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={session.mode === 'AI' ? 'Gửi chữ đã kiểm tra lên AI' : 'Luyện với kịch bản offline'} disabled={!canSend}
                onPress={submitTyped} style={({ pressed }) => [styles.actionButton, styles.sendButton, !canSend && styles.disabled, pressed && !busy && styles.pressed]}>
                {requesting ? <ActivityIndicator color={theme.onPrimary} /> : <Ionicons color={theme.onPrimary} name="send" size={19} />}
              </Pressable>
            </View>
          </>}
          </SafeBottomAction>
        </View>
      </View>
    </Screen>
  );
}

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    keyboard: { flex: 1, width: '100%', minWidth: 0 },
    body: { flex: 1, minWidth: 0, gap: spacing.sm, paddingBottom: 0 },
    actionDock: { gap: spacing.xs },
    card: { ...themedCard(theme), borderColor: theme.border, borderWidth: 1 },
    studioHero: { borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, marginBottom: spacing.xs },
    studioArt: { position: 'relative' }, studioSeal: { position: 'absolute', left: spacing.md, top: spacing.md, width: 40, height: 40, borderRadius: 20, backgroundColor: theme.skillColors.speaking, alignItems: 'center', justifyContent: 'center' }, studioArtLabel: { position: 'absolute', right: spacing.md, bottom: spacing.md, color: '#433542', backgroundColor: '#FFFFFFE8', overflow: 'hidden', borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 6, fontSize: 9, fontWeight: '900', letterSpacing: 0.6 }, studioHeroBody: { padding: spacing.md, gap: spacing.xs }, studioEyebrow: { color: theme.skillColors.speaking, fontSize: 10, fontWeight: '900', letterSpacing: 0.9 }, studioTitle: { color: theme.textPrimary, fontSize: 22, lineHeight: 28, fontWeight: '900' }, studioCopy: { color: theme.textSecondary, fontSize: 13, lineHeight: 20 }, studioMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs, paddingTop: spacing.xs }, studioMetaText: { color: theme.textMuted, fontSize: 10, fontWeight: '900' }, metaBullet: { color: theme.textMuted }, studioMode: { color: theme.success, fontSize: 10, fontWeight: '900', letterSpacing: 0.4 }, studioModeAi: { color: theme.skillColors.speaking },
    setupCard: { gap: spacing.sm, padding: spacing.md },
    sessionBar: { gap: spacing.sm, padding: spacing.md, borderLeftWidth: 4, borderLeftColor: theme.skillColors.speaking }, sessionArt: { position: 'relative', borderRadius: radius.md, overflow: 'hidden' }, sessionArtBadge: { position: 'absolute', left: spacing.sm, top: spacing.sm, width: 30, height: 30, borderRadius: 15, backgroundColor: theme.skillColors.speaking, alignItems: 'center', justifyContent: 'center' },
    sessionHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
    sessionCopy: { flex: 1, minWidth: 0, gap: 4 }, sessionEyebrow: { color: theme.skillColors.speaking, fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
    sessionTitle: { color: theme.textPrimary, fontSize: 22, lineHeight: 29, fontWeight: '900' },
    sessionGoal: { color: theme.textSecondary, fontSize: 14, lineHeight: 20, backgroundColor: theme.backgroundSecondary, borderRadius: radius.sm, padding: spacing.sm },
    resultCard: { gap: spacing.sm, padding: spacing.md, borderColor: theme.success },
    resultEyebrow: { color: theme.success, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    optionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
    sectionTitle: { color: theme.textPrimary, fontSize: 14, fontWeight: "900" },
    noteInline: { color: theme.textMuted, fontSize: 12 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
    chip: { alignItems: "center", backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radius.pill, borderWidth: 1, justifyContent: "center", minHeight: 48, paddingHorizontal: spacing.md },
    chipSelected: { backgroundColor: theme.primary, borderColor: theme.primary },
    chipText: { color: theme.textSecondary, fontSize: 12, fontWeight: "800" },
    chipTextSelected: { color: theme.onPrimary },
    levels: { flexDirection: "row", gap: spacing.xs },
    levelChip: { alignItems: "center", backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radius.pill, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 48 },
    messages: { flex: 1, minWidth: 0 },
    messageList: { gap: spacing.sm, paddingVertical: spacing.xs, minWidth: 0 },
    exchange: { gap: spacing.sm }, goalRow: { minHeight: 48, justifyContent: 'center', paddingVertical: spacing.xs },
    welcomeCard: { alignItems: "center", gap: spacing.sm, padding: spacing.lg },
    welcomeTitle: { color: theme.textPrimary, fontSize: 18, fontWeight: "900", textAlign: "center" },
    bodyCopy: { color: theme.textSecondary, fontSize: 13, lineHeight: 20 },
    starter: { color: theme.primaryText, fontSize: 16, fontWeight: "800", textAlign: "center" },
    bubble: { borderRadius: radius.lg, maxWidth: "90%", padding: spacing.md },
    userBubble: { alignSelf: "flex-end", backgroundColor: theme.primary },
    userLabel: { color: theme.onPrimary, fontSize: 11, fontWeight: "900", letterSpacing: 0.8 },
    userText: { color: theme.onPrimary, fontSize: 16, lineHeight: 23, marginTop: spacing.xs },
    assistantBubble: { gap: spacing.xs, padding: spacing.md },
    aiHeader: { alignItems: "center", flexDirection: "row", flexWrap: 'wrap', justifyContent: "space-between", gap: spacing.xs },
    aiLabel: { color: theme.primaryText, fontSize: 11, fontWeight: "900", letterSpacing: 0.8 },
    replayButton: { alignItems: "center", flexDirection: "row", gap: spacing.xs, minHeight: 48, paddingHorizontal: spacing.sm },
    replayText: { color: theme.primaryText, fontSize: 12, fontWeight: "800" },
    replyChinese: { color: theme.textPrimary, fontSize: 23, fontWeight: "800", lineHeight: 33 },
    replyPinyin: { color: theme.primaryText, fontSize: 15, fontWeight: "700" },
    replyMeaning: { color: theme.textSecondary, fontSize: 14, lineHeight: 20 },
    coachNote: { backgroundColor: theme.primarySoft, borderRadius: radius.md, gap: 3, marginTop: spacing.xs, padding: spacing.sm },
    coachLabel: { color: theme.primaryText, fontSize: 10, fontWeight: "900", letterSpacing: 0.7 },
    suggestion: { color: theme.textMuted, fontSize: 13, lineHeight: 19, marginTop: spacing.xs },
    pending: { alignItems: "center", flexDirection: "row", gap: spacing.sm, padding: spacing.md },
    noticeBox: { backgroundColor: theme.errorSoft, borderColor: theme.error, borderRadius: radius.md, borderWidth: 1, gap: spacing.xs, padding: spacing.sm },
    noticeWarning: { backgroundColor: theme.warningSoft, borderColor: theme.warning },
    noticeText: { color: theme.textSecondary, fontSize: 13, lineHeight: 19 },
    privacyRow: { backgroundColor: theme.backgroundSecondary, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
    privacyCopy: { color: theme.textSecondary, fontSize: 12, lineHeight: 18 },
    voiceRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
    voiceLabel: { color: theme.textSecondary, fontSize: 12, fontWeight: "700" },
    composer: { width: '100%', minWidth: 0, alignItems: "flex-end", flexDirection: "row", gap: spacing.xs },
    input: { backgroundColor: theme.surface, borderColor: theme.border, borderRadius: radius.md, borderWidth: 1, color: theme.textPrimary, flex: 1, minWidth: 0, fontSize: 15, lineHeight: 20, maxHeight: 110, minHeight: 48, paddingHorizontal: spacing.md, paddingTop: 12, textAlignVertical: "center" },
    actionButton: { alignItems: "center", borderRadius: radius.md, height: 50, justifyContent: "center", width: 50 },
    micButton: { backgroundColor: theme.primarySoft, borderColor: theme.primary, borderWidth: 1 },
    micActive: { backgroundColor: theme.error, borderColor: theme.error },
    sendButton: { backgroundColor: theme.primary },
    disabled: { opacity: 0.45 },
    pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
    clearButton: { justifyContent: "center", minHeight: 48, paddingHorizontal: spacing.xs },
    link: { color: theme.primaryText, fontSize: 12, fontWeight: "800" },
  });
}
