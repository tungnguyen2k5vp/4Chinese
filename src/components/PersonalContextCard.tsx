import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { themedCard } from '@/constants/design';
import { contextCloze, deleteVocabularyContext, listVocabularyContexts, type VocabularyContextRow } from '@/db/vocabulary-context';
import { useConfirmation } from '@/hooks/use-confirmation';
import { useTheme } from '@/theme/ThemeProvider';

const sourceLabels = { READER:'tài liệu đã đọc',STORY:'truyện',OCR:'ảnh đã tra',LESSON:'bài học',
  LISTENING:'bài nghe',AI_SELECTED:'đoạn hội thoại đã chọn',CUSTOM:'ngữ cảnh tự thêm' };

/** Personal text is fetched locally and never passed to speech/AI automatically. */
export function PersonalContextCard({ vocabularyId, answers, reveal = false, editable = false, onHint }:
  { vocabularyId:string; answers:readonly string[]; reveal?:boolean; editable?:boolean; onHint?:() => void }) {
  const db = useSQLiteContext(); const theme = useTheme(); const {ask,dialog} = useConfirmation();
  const [state,setState] = useState<{id:string;rows:VocabularyContextRow[];error:boolean} | null>(null);
  const [expanded,setExpanded] = useState(false); const [retry,setRetry] = useState(0); const [deleting,setDeleting] = useState(false);
  useEffect(() => {
    let active = true;
    listVocabularyContexts(db,vocabularyId,3,undefined,editable).then(rows => {
      if (active) setState({id:vocabularyId,rows,error:false});
    }).catch(() => { if (active) setState({id:vocabularyId,rows:[],error:true}); });
    return () => { active=false; };
  },[db,vocabularyId,retry,editable]);
  const current = state?.id === vocabularyId ? state : null;
  if (!current) return editable ? <Text style={{color:theme.textMuted}}>Đang tải ngữ cảnh cá nhân…</Text> : null;
  if (current.error) return editable ? <Pressable accessibilityRole="button" onPress={() => setRetry(value=>value+1)} style={{minHeight:48,justifyContent:'center'}}>
    <Text style={{color:theme.primaryText}}>Chưa tải được ngữ cảnh. Chạm để thử lại.</Text></Pressable> : null;
  const rows = current.rows.filter(row => reveal || contextCloze(row.sentence,answers) !== null);
  if (!rows.length) return null;
  const open = reveal || expanded;
  const remove = async (row:VocabularyContextRow) => {
    if (deleting || !await ask({title:'Xóa ngữ cảnh này?',message:'Chỉ xóa câu đã lưu; từ và tiến độ ôn vẫn giữ nguyên.',acceptLabel:'Xóa ngữ cảnh',cancelLabel:'Giữ lại'})) return;
    setDeleting(true);
    try { await deleteVocabularyContext(db,row); setRetry(value=>value+1); }
    catch { setState({...current,error:true}); }
    finally { setDeleting(false); }
  };
  return <View style={[themedCard(theme),{padding:16,gap:12}]}>
    <Text accessibilityRole="header" style={{color:theme.textPrimary,fontSize:18,fontWeight:'700'}}>Bạn đã gặp từ này</Text>
    <Text style={{color:theme.textMuted}}>Ngữ cảnh cá nhân · lưu trên máy</Text>
    {!open ? <Pressable accessibilityRole="button" onPress={() => {setExpanded(true);onHint?.();}} style={{minHeight:48,justifyContent:'center'}}>
      <Text style={{color:theme.primaryText}}>Xem gợi ý ngữ cảnh (ẩn từ cần nhớ)</Text></Pressable> : rows.map(row =>
      <View key={`${row.source_type}:${row.source_id}:${row.location}`} style={{gap:8}}>
        <Text style={{color:theme.textMuted}}>Trong {row.source_title.trim() || sourceLabels[row.source_type]}</Text>
        <Text style={{color:theme.textPrimary,fontSize:20,lineHeight:32}}>{reveal ? row.sentence : contextCloze(row.sentence,answers)}</Text>
        {editable ? <Pressable accessibilityRole="button" accessibilityLabel="Xóa ngữ cảnh đã lưu" disabled={deleting} onPress={() => void remove(row)} style={{minHeight:48,justifyContent:'center'}}>
          <Text style={{color:theme.error}}>Xóa ngữ cảnh</Text></Pressable> : null}
      </View>)}
    {dialog}
  </View>;
}
