import { router, useLocalSearchParams, type Href } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { Linking, Pressable, Text, TextInput, View } from "react-native";

import { AudioButton } from "@/components/AudioButton";
import { ChineseAIEntry } from "@/components/ChineseAIEntry";
import { ChineseScreen as Screen } from "@/components/ChineseScreen";
import { PinyinText } from "@/components/PinyinText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { StrokeWriter } from "@/components/StrokeWriter";
import { Disclosure } from "@/components/chinese/Disclosure";
import {
  ChineseMemoryOnly,
  MemoryLink,
  MemoryLoadState,
  useMemoryResource,
} from "@/components/memory/MemoryPrimitives";
import { MotionPressable } from "@/components/ui/MotionPressable";
import { StudyTransition } from "@/components/ui/StudyTransition";
import { themedCard } from "@/constants/design";
import { findCommonRadical } from "@/data/common-radicals";
import { readMemoryMnemonic, saveMemoryMnemonic } from "@/db/hanzi-memory";
import { getNotes, getVocabulary } from "@/db/repository";
import { listVocabularyContexts } from "@/db/vocabulary-context";
import { characterAILaunch } from "@/services/ai/context";
import {
  buildStructureTree,
  canonicalRadical,
  characterStructure,
  componentMeaning,
  contrastGroupForCharacter,
  hanCharacters,
  relatedCharacters,
  type StructureNode,
} from "@/services/memory/character-content";
import { analyzeCharacter } from "@/services/vocabulary/character-analysis";
import { useTheme } from "@/theme/ThemeProvider";
export default function MemoryStructure() {
  const p = useLocalSearchParams<{ id?: string; character?: string }>();
  return (
    <ChineseMemoryOnly>
      <Structure
        key={`${p.id}:${p.character}`}
        id={p.id}
        initialCharacter={p.character}
      />
    </ChineseMemoryOnly>
  );
}
function Structure({
  id,
  initialCharacter,
}: {
  id?: string;
  initialCharacter?: string;
}) {
  const db = useSQLiteContext(),
    theme = useTheme();
  const [selected, setSelected] = useState(initialCharacter ?? ""),
    [saved, setSaved] = useState<Record<string, string>>({});
  const [part, setPart] = useState<{ character: string; index: number } | null>(null);
  const [hiddenFor, setHiddenFor] = useState<string | null>(null);
  const resource = useMemoryResource(
    useCallback(async () => {
      if (!id) return { word: null, notes: "", contexts: [] };
      const [word, notes, contexts] = await Promise.all([
        getVocabulary(db, id),
        getNotes(db, id),
        listVocabularyContexts(db, id),
      ]);
      return { word, notes, contexts };
    }, [db, id]),
  );
  const word = resource.data?.word;
  const chars = hanCharacters(word?.simplified ?? initialCharacter ?? "");
  const char = chars.includes(selected) ? selected : (chars[0] ?? "");
  const info = characterStructure(char),
    tree = buildStructureTree(char);
  const partIndex = part?.character === char ? part.index : -1;
  const strokeCharacter = tree.children[partIndex]?.character ?? char;
  const hidden = hiddenFor === char;
  const radical = info?.radical ? findCommonRadical(info.radical) : undefined;
  const family = relatedCharacters(char);
  const openCharacter = (character: string) => router.push({ pathname: '/memory/structure', params: { character } } as Href);
  return (
    <Screen
      title="Cấu tạo chữ & mẹo nhớ"
      hideHeader
      avoidKeyboard
    >
      <MemoryLoadState {...resource} />
      {!resource.loading && !resource.error && !chars.length ? (
        <MemoryLink
          label="Chọn từ đã học"
          onPress={() => router.replace("/memory/words?mode=structure" as Href)}
        />
      ) : null}
      {chars.length ? (
        <>
          {word ? <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Text style={{ flex: 1, color: theme.textPrimary, fontSize: 25, fontWeight: '800' }}>{word.simplified}</Text><AudioButton text={word.simplified} /></View>
            <PinyinText value={word.pinyin} />
            <Text style={{ color: theme.textSecondary, lineHeight: 22 }}>Nghĩa cả từ: {word.primaryMeaningVi}</Text>
            <Text style={{ color: theme.textMuted, fontSize: 13 }}>Chạm từng chữ để tách cấu tạo. Nghĩa của từ cần đọc trong ngữ cảnh.</Text>
          </View> : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {chars.map((character) => (
              <Pressable
                key={character}
                accessibilityRole="button"
                accessibilityState={{ selected: char === character }}
                onPress={() => setSelected(character)}
                style={{
                  minHeight: 52,
                  minWidth: 52,
                  padding: 10,
                  borderWidth: 1,
                  borderColor:
                    char === character ? theme.primary : theme.border,
                  borderRadius: 14,
                  alignItems: "center",
                  backgroundColor: theme.surface,
                }}
              >
                <Text style={{ color: theme.textPrimary, fontSize: 26 }}>
                  {character}
                </Text>
              </Pressable>
            ))}
          </View>
          <ChineseAIEntry label={`Tạo mẹo nhớ ${char} với AI`} context={characterAILaunch(char, word?.id)} />
          <StudyTransition turnKey={char} effect="reveal" style={[themedCard(theme), { gap: 10, padding: 14 }]}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            <Text
              style={{
                color: theme.textPrimary,
                fontSize: 42,
                fontWeight: "800",
              }}
            >
              {char}
            </Text>
            {info ? (
              <View style={{ flex: 1, minWidth: 100, gap: 4 }}>
                <PinyinText value={info.pinyin} style={{ fontSize: 15 }} />
                <Text style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 20 }}>
                  {info.meaning}
                </Text>
              </View>
            ) : null}
            <AudioButton text={char} />
            </View>
            {info ? <MotionPressable accessibilityRole="button" accessibilityLabel={hidden ? 'Mở cấu tạo chữ' : 'Che cấu tạo để tự nhớ'} accessibilityState={{ expanded: !hidden }} onPress={() => { setHiddenFor(hidden ? null : char); setPart(null); }} style={{ minHeight: 48, justifyContent: 'center', padding: 10, borderRadius: 12, backgroundColor: theme.primarySoft }}><Text style={{ color: theme.primaryText, fontWeight: '700' }}>{hidden ? 'Mở cấu tạo để đối chiếu' : 'Che cấu tạo · thử nhớ các phần'}</Text></MotionPressable> : null}
            {info && !hidden ? (
              <>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {[char, ...tree.children.map(node => node.character)].map((component, index) => {
                    const active = partIndex === index - 1;
                    return <MotionPressable key={`${char}:${index}`} accessibilityRole="radio" accessibilityLabel={index === 0 ? `Xem toàn chữ ${char}` : `Xem nét thành phần ${index}: ${component}`} accessibilityState={{ checked: active }} onPress={() => setPart({ character: char, index: index - 1 })} style={{ minWidth: 48, minHeight: 48, padding: 8, borderRadius: 12, borderWidth: 1, borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.primarySoft : theme.surface, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: theme.textPrimary, fontSize: index === 0 ? 15 : 24 }}>{index === 0 ? 'Toàn chữ' : component}</Text></MotionPressable>;
                  })}
                </View>
                <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                  {info.layout} · Bộ tra: {info.radical}{info.radical && canonicalRadical(info.radical) !== info.radical ? ` (dạng của ${canonicalRadical(info.radical)})` : ''} · {radical?.name ?? componentMeaning(info.radical ?? '')}
                </Text>
                <View style={{ gap: 6 }}>
                  {info.parts.map((component, index) => {
                    const role = info.roles.find(item => item.part === component)?.role;
                    return <Text key={`${component}:${index}`} style={{ color: theme.textSecondary, lineHeight: 23 }}><Text style={{ color: theme.textPrimary, fontWeight: '800' }}>{component}</Text> · {componentMeaning(component)}{role ? role === 'semantic' ? ' · gợi nghĩa' : ' · gợi âm' : ' · thành phần hình thể'}</Text>;
                  })}
                </View>
                {info.roles.length ? <Text style={{ color: theme.textMuted, fontSize: 13, lineHeight: 20 }}>Phần gợi âm không đảm bảo cùng âm hoặc cùng thanh điệu.</Text> : null}
              </>
            ) : !info ? (
              <Text style={{ color: theme.textMuted }}>
                Chưa có cấu tạo đã xác minh. Bạn vẫn có thể xem nét viết.
              </Text>
            ) : <Text style={{ color: theme.textSecondary, lineHeight: 23 }}>Tự nhẩm các thành phần và bộ tra của {char}, rồi mở cấu tạo để đối chiếu.</Text>}
            <StudyTransition turnKey={`${char}:${partIndex}`} effect="reveal" testID="structure-component-strokes">
              {info && !hidden ? <Text accessibilityLiveRegion="polite" style={{ color: theme.textSecondary, fontSize: 13 }}>{partIndex < 0 ? `${tree.children.map(node => node.character).join(' + ')} = ${char}` : `Thành phần ${partIndex + 1}: ${strokeCharacter} · ${componentMeaning(strokeCharacter)}`}</Text> : null}
              <StrokeWriter key={`${char}:${hidden ? -1 : partIndex}`} character={hidden ? char : strokeCharacter} />
            </StudyTransition>
            {word || contrastGroupForCharacter(char) ? (
              <MemoryLink
                label="Che chữ và tự viết lại"
                onPress={() =>
                  router.push({
                    pathname: "/memory/session",
                    params: word
                      ? { id: word.id, mode: "writing", assisted: "1" }
                      : { character: char, mode: "writing", assisted: "1" },
                  } as Href)
                }
              />
            ) : (
              <Text style={{ color: theme.textMuted }}>
                Hãy mở từ có nghĩa đã xác minh trong kho để luyện viết từ trí
                nhớ.
              </Text>
            )}
          </StudyTransition>
          {info && !hidden ? <>
            {tree.children.some(node => node.children.length) ? <Disclosure title="Tách sâu hơn"><StructureBranch node={tree} /></Disclosure> : null}
            {family.radical.length ? <Disclosure title={`Cùng bộ ${info.radical} · ${family.radical.length} chữ`}><CharacterFamily characters={family.radical} onPress={openCharacter} /></Disclosure> : null}
            {family.component.length ? <Disclosure title="So sánh chữ chung thành phần"><Text style={{ color: theme.textMuted, fontSize: 13, lineHeight: 20 }}>Chung thành phần không đồng nghĩa với chung nghĩa hay cách đọc.</Text><CharacterFamily characters={family.component} onPress={openCharacter} /></Disclosure> : null}
            <Disclosure title="Gợi ý liên tưởng để nhớ"><Text style={{ color: theme.textSecondary, lineHeight: 24 }}>{analyzeCharacter(char, '').mnemonic}</Text></Disclosure>
          </> : null}
          {word ? (
            <MnemonicEditor
              key={`${word.id}:${char}`}
              initial={
                saved[char] ??
                readMemoryMnemonic(resource.data?.notes ?? "", char)
              }
              onSave={async (text) => {
                await saveMemoryMnemonic(db, word.id, char, text);
                setSaved((previous) => ({ ...previous, [char]: text }));
              }}
            />
          ) : null}
          {resource.data?.contexts.length || word?.examples.length ? <Disclosure title="Ngữ cảnh & ví dụ">
          {resource.data?.contexts.map((context) => (
            <View key={context.id} style={[themedCard(theme), { gap: 8 }]}>
              <Text style={{ color: theme.textPrimary, fontWeight: "800" }}>
                Ngữ cảnh bạn đã lưu · {context.source_type}
              </Text>
              <Text style={{ color: theme.textPrimary, fontSize: 20 }}>
                {context.sentence}
              </Text>
              {context.translation_vi ? (
                <Text style={{ color: theme.textSecondary }}>
                  {context.translation_vi}
                </Text>
              ) : null}
            </View>
          ))}
          {word?.examples.slice(0, 2).map((example) => (
            <View key={example.id} style={[themedCard(theme), { gap: 8 }]}>
              <Text style={{ color: theme.textMuted }}>
                Ví dụ trong mục từ hiện có
              </Text>
              <Text style={{ color: theme.textPrimary, fontSize: 20 }}>
                {example.chinese}
              </Text>
              <PinyinText value={example.pinyin} />
              <Text style={{ color: theme.textSecondary }}>
                {example.vietnamese}
              </Text>
            </View>
          ))}
          </Disclosure> : null}
          <Disclosure title="Nguồn & lưu ý">
            <Text style={{ color: theme.textMuted, fontSize: 13, lineHeight: 19 }}>Cấu tạo mô tả cách ghép chữ. Mẹo nhớ là liên tưởng cá nhân, không phải nguồn gốc lịch sử của chữ.</Text>
            {info ? <MemoryLink label="Nguồn mô tả chữ" onPress={() => void Linking.openURL(info.sourceUrl)} /> : null}
          </Disclosure>
        </>
      ) : null}
    </Screen>
  );
}
function CharacterFamily({ characters, onPress }: { characters: string[]; onPress: (character: string) => void }) {
  const theme = useTheme();
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{characters.map(character => <MotionPressable key={character} accessibilityRole="button" accessibilityLabel={`Xem cấu tạo ${character}, ${characterStructure(character)?.meaning}`} onPress={() => onPress(character)} style={{ minWidth: 64, minHeight: 64, padding: 10, gap: 3, alignItems: 'center', borderWidth: 1, borderColor: theme.border, borderRadius: 12 }}><Text style={{ color: theme.textPrimary, fontSize: 26 }}>{character}</Text><Text style={{ color: theme.textSecondary, fontSize: 12 }}>{characterStructure(character)?.pinyin}</Text></MotionPressable>)}</View>;
}
function StructureBranch({ node }: { node: StructureNode }) {
  const theme = useTheme();
  return <View style={{ gap: 8 }}><Text style={{ color: theme.textPrimary, fontSize: 17, lineHeight: 26 }}>{node.character}{node.children.length ? ` → ${node.children.map(child => child.character).join(' + ')}` : ` · ${componentMeaning(node.character)}`}</Text>{node.children.filter(child => child.children.length).map((child, index) => <View key={`${child.character}:${index}`} style={{ marginLeft: 16, paddingLeft: 12, borderLeftWidth: 2, borderColor: theme.border }}><StructureBranch node={child} /></View>)}</View>;
}
function MnemonicEditor({
  initial,
  onSave,
}: {
  initial: string;
  onSave: (text: string) => Promise<void>;
}) {
  const theme = useTheme();
  const [text, setText] = useState(initial),
    [saving, setSaving] = useState(false),
    [message, setMessage] = useState("");
  return (
    <View style={[themedCard(theme), { gap: 10 }]}>
      <Text style={{ color: theme.textPrimary, fontWeight: "800" }}>
        Mẹo nhớ của tôi
      </Text>
      <Text style={{ color: theme.textMuted }}>
        Viết một liên tưởng ngắn để dễ nhớ hơn.
      </Text>
      <TextInput
        accessibilityLabel="Câu chuyện ghi nhớ cá nhân"
        multiline
        maxLength={1500}
        value={text}
        onChangeText={setText}
        editable={!saving}
        placeholder="Tôi liên tưởng chữ này với…"
        placeholderTextColor={theme.textMuted}
        style={{
          minHeight: 88,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 14,
          padding: 12,
          color: theme.textPrimary,
          textAlignVertical: "top",
        }}
      />
      <PrimaryButton
        label={saving ? "Đang lưu…" : "Lưu mẹo nhớ"}
        disabled={saving}
        onPress={() => {
          setSaving(true);
          setMessage("");
          void onSave(text)
            .then(() => setMessage("Đã lưu trong ghi chú của từ."))
            .catch(() =>
              setMessage(
                "Chưa lưu được. Hãy kiểm tra từ đã có ghi chú/tiến độ và thử lại; nội dung đang nhập vẫn còn.",
              ),
            )
            .finally(() => setSaving(false));
        }}
      />
      {message ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: theme.textSecondary }}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}
