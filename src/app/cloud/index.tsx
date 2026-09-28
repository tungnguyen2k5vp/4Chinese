import Constants from 'expo-constants';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { card, colors, spacing } from '@/constants/design';
import { exportLocalBackup, importLocalBackup } from '@/db/backup-repository';
import { getSettings } from '@/db/repository';
import { type ParsedBackupArchive } from '@/services/backup/archive';
import { createDeviceBackupArchive, materializeArchiveImages, writeRestorePointArchive } from '@/services/backup/device-archive';
import { deleteCloudBackup, downloadCloudBackup, listCloudBackups, uploadCloudBackup,
  type CloudBackupItem } from '@/services/cloud/backup';
import { getCloudClient } from '@/services/cloud/client';
import { useAppStore } from '@/stores/app-store';

const client = getCloudClient();

export default function CloudBackupScreen() {
  const db = useSQLiteContext();
  const setSettings = useAppStore((state) => state.setSettings);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<CloudBackupItem[]>([]);

  useEffect(() => {
    if (!client) return;
    let live = true;
    void client.auth.getUser().then(({ data }) => { if (live) setSignedIn(!!data.user); });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (live) setSignedIn(!!session?.user);
    });
    return () => { live = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!client || !signedIn) return;
    let live = true;
    void listCloudBackups(client).then((backups) => { if (live) setItems(backups); })
      .catch(() => { /* The manual refresh button exposes retry without blocking offline use. */ });
    return () => { live = false; };
  }, [signedIn]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try { await action(); }
    catch (error) { Alert.alert('Chưa thực hiện được', error instanceof Error ? error.message : 'Vui lòng thử lại.'); }
    finally { setBusy(false); }
  };

  const refresh = () => run(async () => { if (client) setItems(await listCloudBackups(client)); });
  const signIn = (register: boolean) => run(async () => {
    if (!client) return;
    if (!email.trim() || password.length < 6) throw new Error('Nhập email và mật khẩu ít nhất 6 ký tự.');
    const result = register
      ? await client.auth.signUp({ email: email.trim(), password })
      : await client.auth.signInWithPassword({ email: email.trim(), password });
    if (result.error) throw result.error;
    setPassword('');
    if (register && !result.data.session) Alert.alert('Kiểm tra email', 'Xác nhận email trước khi đăng nhập.');
    else setItems(await listCloudBackups(client));
  });

  const restore = (parsed: ParsedBackupArchive) => run(async () => {
    const before = await exportLocalBackup(db, Constants.expoConfig?.version ?? 'unknown');
    await writeRestorePointArchive(await createDeviceBackupArchive(before));
    const backup = await materializeArchiveImages(parsed);
    await importLocalBackup(db, backup);
    setSettings(await getSettings(db));
    Alert.alert('Đã khôi phục', 'Dữ liệu cục bộ đã được thay bằng bản sao lưu. Có thể hoàn tác trong Cài đặt.');
  });

  const confirmRestore = (name: string) => run(async () => {
    if (!client) return;
    const parsed = await downloadCloudBackup(client, name);
    Alert.alert('Khôi phục bản sao lưu?', `Bản ${new Date(parsed.backup.createdAt).toLocaleString('vi-VN')} sẽ thay dữ liệu học trên máy.`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Khôi phục', style: 'destructive', onPress: () => void restore(parsed) },
    ]);
  });

  return <Screen title="Sao lưu đám mây" subtitle="Tự chọn tải lên hoặc khôi phục; dữ liệu trên máy vẫn dùng được offline.">
    {!client ? <View style={card}><Text>Chưa cấu hình Supabase. Sao lưu ZIP cục bộ vẫn hoạt động.</Text></View> : !signedIn ?
      <View style={[card, styles.block]}>
        <Text style={styles.heading}>Đăng nhập</Text>
        <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address"
          value={email} onChangeText={setEmail} editable={!busy} />
        <TextInput style={styles.input} placeholder="Mật khẩu" secureTextEntry value={password}
          onChangeText={setPassword} editable={!busy} />
        <Pressable style={styles.button} disabled={busy} onPress={() => void signIn(false)}><Text style={styles.buttonText}>Đăng nhập</Text></Pressable>
        <Pressable disabled={busy} onPress={() => void signIn(true)}><Text style={styles.link}>Tạo tài khoản bằng email</Text></Pressable>
      </View> : <>
        <View style={[card, styles.block]}>
          <Text style={styles.heading}>Bản sao lưu của bạn</Text>
          <Text style={styles.note}>Chỉ tải lên khi bạn bấm nút. Khôi phục sẽ thay dữ liệu trên máy sau khi tạo điểm hoàn tác.</Text>
          <Pressable style={styles.button} disabled={busy} onPress={() => void run(async () => {
            const backup = await exportLocalBackup(db, Constants.expoConfig?.version ?? 'unknown');
            await uploadCloudBackup(client, await createDeviceBackupArchive(backup));
            setItems(await listCloudBackups(client));
            Alert.alert('Đã tải lên', 'Bản sao lưu ZIP đã được lưu vào tài khoản của bạn.');
          })}><Text style={styles.buttonText}>{busy ? 'Đang xử lý…' : 'Sao lưu lên cloud'}</Text></Pressable>
          <Pressable disabled={busy} onPress={() => void refresh()}><Text style={styles.link}>Làm mới danh sách</Text></Pressable>
          {items.map((item) => <View key={item.name} style={styles.item}>
            <Text style={styles.itemTitle}>{item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : item.name}</Text>
            <View style={styles.actions}>
              <Pressable disabled={busy} onPress={() => void confirmRestore(item.name)}><Text style={styles.link}>Khôi phục</Text></Pressable>
              <Pressable disabled={busy} onPress={() => Alert.alert('Xóa bản sao lưu?', 'Tệp này sẽ bị xóa vĩnh viễn khỏi cloud.', [
                { text: 'Hủy', style: 'cancel' },
                { text: 'Xóa', style: 'destructive', onPress: () => void run(async () => {
                  await deleteCloudBackup(client, item.name);
                  setItems(await listCloudBackups(client));
                }) },
              ])}><Text style={styles.delete}>Xóa</Text></Pressable>
            </View>
          </View>)}
          <Pressable disabled={busy} onPress={() => void run(async () => {
            const { error } = await client.auth.signOut();
            if (error) throw error;
            setItems([]);
          })}><Text style={styles.link}>Đăng xuất</Text></Pressable>
        </View>
      </>}
  </Screen>;
}

const styles = StyleSheet.create({
  block: { gap: spacing.md },
  heading: { color: colors.text, fontSize: 20, fontWeight: '800' },
  note: { color: colors.textMuted, lineHeight: 20 },
  input: { backgroundColor: '#f7f8fc', borderWidth: 1, borderColor: '#dce2ee', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, color: colors.text },
  button: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '800' },
  link: { color: colors.primary, fontWeight: '700' },
  delete: { color: '#c43b3b', fontWeight: '700' },
  item: { borderTopWidth: 1, borderTopColor: '#e1e5ed', paddingTop: spacing.md, gap: spacing.sm },
  itemTitle: { color: colors.text, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: spacing.lg },
});
