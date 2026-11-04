import { Platform } from 'react-native';

/** Explicit file export only. The caller retains the JSON if sharing fails or is cancelled. */
export async function shareAIContent(text: string): Promise<void> {
  if (text.length > 65536) throw new Error('Bản nháp quá lớn để xuất.');
  const draft = JSON.parse(text);
  if (draft?.format !== '4chinese.ai-content-draft.v1' || draft.status !== 'human-reviewed-draft' || draft.officialExam !== false) throw new Error('Chỉ xuất được bản nháp đã tự đối chiếu.');
  const filename = `4chinese-ai-draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = filename;
    try { document.body.appendChild(link); link.click(); }
    finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    return;
  }
  const [{ File, Paths }, Sharing] = await Promise.all([import('expo-file-system'), import('expo-sharing')]);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Thiết bị chưa hỗ trợ chia sẻ tệp. JSON vẫn còn để sao chép.');
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: false }); file.write(text, { encoding: 'utf8' });
  // ponytail: retain the cache file while the receiving app reads it; add expiry cleanup if exports become frequent.
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Xuất bài luyện AI đã tự đối chiếu', UTI: 'public.json' });
}
