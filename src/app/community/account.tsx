import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { AvatarPicker } from '@/components/community/Illustrations';
import { confirmSocial, SocialError, SocialInput, useSocialStyles } from '@/components/community/SocialUI';
import { accountError, communityAccount, confirmAccountRecovery, confirmEmailLink, requestAccountRecovery, requestEmailLink } from '@/services/community/account';
import { editProfile, me, socialError, type SocialProfile } from '@/services/community/api';
import { useSocialRefresh } from '@/services/community/use-social-refresh';
import { useTheme } from '@/theme/ThemeProvider';

export default function CommunityAccount() {
  const s = useSocialStyles(), t = useTheme();
  const [profile, setProfile] = useState<SocialProfile | null>(null), [name, setName] = useState(''), [bio, setBio] = useState(''), [avatar, setAvatar] = useState(0);
  const [email, setEmail] = useState(''), [token, setToken] = useState(''), [linked, setLinked] = useState(''), [mode, setMode] = useState<'link' | 'recover'>('link');
  const [sent, setSent] = useState<{ email: string; mode: 'link' | 'recover'; id: string } | null>(null), [notice, setNotice] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const loadedId = useRef(''), lock = useRef(false);
  const live = useSocialRefresh(['social_friendships'], async () => {
    const own = await me(); setProfile(own);
    if (loadedId.current !== own.id) { loadedId.current = own.id; setName(own.display_name); setBio(own.bio); setAvatar(own.icon ?? own.avatar); }
    const account = await communityAccount(); setLinked(account.email ?? '');
  });
  const run = async (action: () => Promise<unknown>, auth = false) => {
    if (lock.current) return; lock.current = true; setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (e) { setError(auth ? accountError(e) : socialError(e)); } finally { lock.current = false; setBusy(false); }
  };
  const verify = () => run(async () => {
    if (!sent) return;
    if (sent.mode === 'link') await confirmEmailLink(sent.email, token, sent.id);
    else { await confirmAccountRecovery(sent.email, token); loadedId.current = ''; }
    setSent(null); setToken(''); await live.refresh(); setNotice('Đã xác nhận. ID, bạn bè và tin nhắn đi cùng tài khoản này.');
  }, true);
  return <Screen maxWidth={740} title="Tài khoản 4Chinese" subtitle="Hồ sơ học tập và kết nối của bạn." avoidKeyboard safeAreaEdges={['top', 'bottom']}>
    <View style={{ width: '100%', maxWidth: 700, alignSelf: 'center', gap: 18 }}>
    <SocialError message={error || live.error} />{notice ? <Text accessibilityLiveRegion="polite" style={[s.muted, { color: t.success }]}>{notice}</Text> : null}
    {!profile ? <PrimaryButton label="Kết nối lại" loading={live.loading} onPress={() => { void live.refresh(); }} /> : <>
      <View style={[s.card, { borderTopWidth: 4, borderTopColor: t.primary }]}><Text style={s.heading}>{profile.display_name}</Text><Text selectable style={s.small}>ID: FC-{profile.handle} · dùng để kết bạn</Text>
        <AvatarPicker value={avatar} disabled={busy} onChange={setAvatar} />
        <SocialInput placeholder="Tên hiển thị" value={name} onChangeText={setName} maxLength={40} editable={!busy} />
        <SocialInput placeholder="Một chút về bạn" value={bio} onChangeText={setBio} maxLength={180} multiline editable={!busy} />
        <PrimaryButton label="Lưu hồ sơ" loading={busy} disabled={!name.trim()} onPress={() => { void run(async () => { const own = await editProfile({ display_name: name.trim(), bio, avatar: avatar < 6 ? avatar : 0, icon: avatar }); setProfile(own); setNotice('Đã lưu hồ sơ.'); }); }} />
      </View>
      <View style={s.card}><Text style={s.heading}>{linked ? 'Đã giữ tài khoản bằng email' : 'Giữ tài khoản khi đổi máy'}</Text>
        {linked ? <><Text selectable style={s.name}>{linked}</Text><Text style={s.muted}>Dùng email này để mở lại cùng hồ sơ, bạn bè và tin nhắn trên web hoặc máy khác. Email không hiển thị công khai.</Text></> : <Text style={s.muted}>Liên kết email để giữ hồ sơ khi đổi máy. Bạn vẫn học offline bình thường.</Text>}
        {!linked || mode === 'recover' ? <>
          <View style={[s.row, { flexWrap: 'wrap' }]}>{!linked ? <PrimaryButton label="Liên kết email" variant={mode === 'link' ? 'secondary' : 'ghost'} disabled={busy} onPress={() => { setMode('link'); setSent(null); setToken(''); }} /> : null}<PrimaryButton label="Tài khoản đã có" variant={mode === 'recover' ? 'secondary' : 'ghost'} disabled={busy} onPress={() => { setMode('recover'); setSent(null); setToken(''); }} /></View>
          {mode === 'recover' ? <Text style={[s.muted, { color: t.warning }]}>Đăng nhập sẽ chuyển sang ID của email đã liên kết. Hồ sơ khách hiện tại không tự gộp vào tài khoản đó; hãy liên kết nó trước nếu muốn giữ.</Text> : null}
          <SocialInput placeholder="Email của bạn" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} value={email} onChangeText={value => { setEmail(value); setSent(null); setToken(''); }} editable={!busy} />
          <PrimaryButton label={sent ? 'Gửi lại mã xác nhận' : mode === 'link' ? 'Gửi mã liên kết' : 'Gửi mã đăng nhập'} variant="secondary" loading={busy} disabled={!email.trim()} onPress={() => { void run(async () => {
            const value = email.trim(); let expectedId = profile.id;
            if (mode === 'link') expectedId = await requestEmailLink(value); else await requestAccountRecovery(value);
            setSent({ email: value, mode, id: expectedId }); setNotice('Kiểm tra email, nhập mã xác nhận mới nhất hoặc sao chép link xác nhận trong email và dán vào ô bên dưới.');
          }, true); }} />
          {sent ? <><SocialInput placeholder="Mã hoặc link xác nhận trong email" value={token} onChangeText={setToken} autoCapitalize="none" autoCorrect={false} autoComplete="one-time-code" maxLength={2048} editable={!busy} />
            <PrimaryButton label={sent.mode === 'link' ? 'Xác nhận & giữ nguyên ID' : 'Đăng nhập tài khoản này'} loading={busy} disabled={token.trim().length < 6} onPress={() => {
              if (sent.mode === 'link') { void verify(); return; }
              confirmSocial('Chuyển tài khoản cộng đồng?', 'ID, bạn bè và tin nhắn sẽ chuyển sang tài khoản đã liên kết email. ID khách hiện tại không được gộp; tin đang chờ của ID cũ được giữ riêng trên máy. Tiến độ học trên máy vẫn giữ nguyên.', 'Đăng nhập', () => { void verify(); });
            }} />
          </> : null}
        </> : <PrimaryButton label="Đăng nhập tài khoản khác" variant="ghost" disabled={busy} onPress={() => { setMode('recover'); setSent(null); }} />}
        <PrimaryButton label="Làm mới tài khoản" variant="ghost" loading={live.loading} onPress={() => { void live.refresh(); }} />
      </View>
      <View style={[s.card, { backgroundColor: t.primarySoft }]}><Text style={s.heading}>Học tập & sao lưu</Text><Text style={s.muted}>Tiến độ hiện tại vẫn ở thiết bị này. Mở Cloud để dùng tài khoản đã liên kết; chỉ sao lưu hoặc khôi phục khi bạn chọn.</Text><PrimaryButton label="Mở sao lưu & tài khoản học tập" variant="secondary" onPress={() => router.push('/cloud')} /><Text style={s.small}>Đăng nhập và sửa hồ sơ không đặt lại tiến độ, bài đã học hoặc lịch ôn.</Text></View>
    </>}
  </View></Screen>;
}
