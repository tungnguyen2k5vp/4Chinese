import { requireOptionalNativeModule } from 'expo-modules-core';

import { combineCharacterCandidates, segmentStrokesByWritingOrder } from './segmentation';

import { parseNativePracticeResult, type NativePracticeResult } from '@/db/native-practice';

export type InkPoint={x:number;y:number;t:number};
export type InkStroke={points:InkPoint[]};
type NativeRecognizer={
  recognize(strokes:InkStroke[],width:number,height:number,languageTag:string):Promise<string[]>;
  openPractice?:(target:string)=>Promise<unknown>;
  getPendingPracticeResults?:()=>Promise<unknown>;
  acknowledgePracticeResult?:(id:string)=>Promise<void>;
};

const nativeRecognizer =
  requireOptionalNativeModule<NativeRecognizer>('DigitalInkRecognition');

export function isChineseInkRecognitionAvailable(): boolean {
  return Boolean(nativeRecognizer);
}

export function isNativePracticeAvailable(): boolean {
  return typeof nativeRecognizer?.openPractice === 'function'
    && typeof nativeRecognizer.getPendingPracticeResults === 'function'
    && typeof nativeRecognizer.acknowledgePracticeResult === 'function';
}

export async function openNativePractice(target: string): Promise<NativePracticeResult | null> {
  if (!nativeRecognizer?.openPractice || Array.from(target).length < 1 || Array.from(target).length > 4) {
    throw new Error('Luyện viết toàn màn hình cần bản Android mới và 1–4 Hán tự.');
  }
  const result = await nativeRecognizer.openPractice(target);
  return result == null ? null : parseNativePracticeResult(result);
}

export async function getPendingNativePractice(): Promise<NativePracticeResult[]> {
  if (!nativeRecognizer?.getPendingPracticeResults) return [];
  const results = await nativeRecognizer.getPendingPracticeResults();
  if (!Array.isArray(results)) throw new Error('INVALID_NATIVE_PRACTICE_QUEUE');
  return results.map(parseNativePracticeResult);
}

export async function acknowledgeNativePractice(id: string): Promise<void> {
  if (!nativeRecognizer?.acknowledgePracticeResult) throw new Error('NATIVE_PRACTICE_UNAVAILABLE');
  await nativeRecognizer.acknowledgePracticeResult(id);
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
