import { requireOptionalNativeModule } from 'expo-modules-core';

import { combineCharacterCandidates, segmentStrokesByWritingOrder } from './segmentation';

export type InkPoint={x:number;y:number;t:number};
export type InkStroke={points:InkPoint[]};
type NativeRecognizer={recognize(strokes:InkStroke[],width:number,height:number,languageTag:string):Promise<string[]>};

const nativeRecognizer =
  requireOptionalNativeModule<NativeRecognizer>('DigitalInkRecognition');

export function isChineseInkRecognitionAvailable(): boolean {
  return Boolean(nativeRecognizer);
}

export async function recognizeChineseInk(strokes:InkStroke[],width:number,height:number):Promise<{available:boolean;candidates:string[]}> {
  if(!nativeRecognizer)return {available:false,candidates:[]};
  const candidates=await nativeRecognizer.recognize(strokes,width,height,'zh-Hani-CN');
  return {available:true,candidates:candidates.slice(0,8)};
}

export async function recognizeChineseInkSequence(
  strokes: InkStroke[], width: number, height: number, characterCount: number,
): Promise<{ available: boolean; candidates: string[] }> {
  if (!nativeRecognizer) return { available: false, candidates: [] };
  const expected = Math.max(1, Math.trunc(characterCount));
  const full = await nativeRecognizer.recognize(strokes, width, height, 'zh-Hani-CN');
  if (expected === 1) return { available: true, candidates: full.slice(0, 8) };
  const wholeWords = full.filter((item) => Array.from(item.trim()).length === expected);
  const groups = segmentStrokesByWritingOrder(strokes, expected);
  if (groups.length !== expected) {
    return { available: true, candidates: wholeWords.slice(0, 8) };
  }
  const groupCandidates = await Promise.all(
    groups.map((group) => nativeRecognizer.recognize(group, width, height, 'zh-Hani-CN')),
  );
  const combined = combineCharacterCandidates(groupCandidates, 8);
  return {
    available: true,
    candidates: Array.from(new Set([...wholeWords, ...combined])).slice(0, 8),
  };
}
