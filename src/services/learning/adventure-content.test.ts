import { describe, expect, it } from 'vitest';

import { assemblyCharacters, assemblyMatches, choiceStories, readingDocuments, sceneMissions } from './adventure-content';
import { practiceScenes } from './interactive-content';

describe('offline interactive adventures', () => {
  it('gives every scene three distinct, deliverable missions with two destinations', () => {
    for (const scene of practiceScenes) {
      const content = sceneMissions[scene.id];
      expect(content.places).toHaveLength(2);
      expect(new Set(content.places).size).toBe(2);
      expect(content.tasks).toHaveLength(3);
      expect(new Set(content.tasks.map(task => task.chinese)).size).toBe(3);
      for (const task of content.tasks) {
        expect(scene.words.some(word => word.id === task.item)).toBe(true);
        expect(content.places[task.place]).toBeTruthy();
        expect(task.pinyin.length).toBeGreaterThan(8);
        expect(task.meaning.length).toBeGreaterThan(8);
        expect(task.explanation.length).toBeGreaterThan(10);
      }
    }
  });

  it('makes all 16 story endings reachable in exactly two choices without cycles or dead ends', () => {
    expect(choiceStories).toHaveLength(4);
    const endings = new Set<string>();
    for (const story of choiceStories) {
      const visited = new Set<string>(), final = new Set<string>();
      const walk = (id: string, path: string[]) => {
        expect(path).not.toContain(id);
        const node = story.nodes[id];
        expect(node).toBeDefined();
        if (!node) return;
        visited.add(id);
        for (const field of ['chinese', 'pinyin', 'meaning'] as const) expect(node[field].length).toBeGreaterThan(3);
        if (node.ending) {
          expect(path).toHaveLength(2);
          expect(node.choices).toBeUndefined();
          expect(node.takeaway?.length).toBeGreaterThan(10);
          final.add(id); endings.add(node.ending);
        } else {
          expect(node.choices).toHaveLength(2);
          expect(new Set(node.choices!.map(choice => choice.chinese)).size).toBe(2);
          expect(new Set(node.choices!.map(choice => choice.next)).size).toBe(2);
          for (const choice of node.choices!) {
            expect(choice.pinyin.length).toBeGreaterThan(3);
            expect(choice.meaning.length).toBeGreaterThan(3);
            walk(choice.next, [...path, id]);
          }
        }
      };
      walk(story.start, []);
      expect(final.size).toBe(4);
      expect([...visited].sort()).toEqual(Object.keys(story.nodes).sort());
    }
    expect(endings.size).toBe(16);
  });

  it('uses known decompositions and preserves order, duplicate pieces and enclosing forms', () => {
    expect(assemblyCharacters).toHaveLength(12);
    const layouts = new Set<string>();
    for (const puzzle of assemblyCharacters) {
      expect(puzzle.structure).toBeTruthy();
      expect(puzzle.structure.parts).toHaveLength(2);
      expect(puzzle.structure.sourceUrl).toMatch(/^https:\/\/www\.zdic\.net\/hans\//u);
      expect(assemblyMatches(puzzle.structure.parts, puzzle.character)).toBe(true);
      expect(assemblyMatches(puzzle.structure.parts.slice(1), puzzle.character)).toBe(false);
      expect(assemblyMatches([...puzzle.structure.parts, '口'], puzzle.character)).toBe(false);
      layouts.add(puzzle.structure.layout);
    }
    expect(layouts.size).toBe(4);
    expect(assemblyMatches(['木', '木'], '林')).toBe(true);
    expect(assemblyMatches(['木', '口'], '林')).toBe(false);
    expect(assemblyMatches(['囗', '玉'], '国')).toBe(true);
    expect(assemblyMatches(['口', '玉'], '国')).toBe(false);
    expect(assemblyMatches(['月', '日'], '明')).toBe(false);
    expect(assemblyMatches([], '未知')).toBe(false);
  });

  it('grounds every reading answer in existing, translated evidence rows', () => {
    expect(readingDocuments).toHaveLength(3);
    for (const document of readingDocuments) {
      const rows = document.rows.map(row => row.id);
      expect(new Set(rows).size).toBe(rows.length);
      expect(document.questions).toHaveLength(4);
      for (const row of document.rows) {
        expect(row.chinese.length).toBeGreaterThan(2);
        expect(row.meaning.length).toBeGreaterThan(2);
        expect(row.pinyin.length).toBeGreaterThan(2);
      }
      for (const question of document.questions) {
        expect(new Set(question.choices).size).toBe(3);
        expect(question.choices[question.answer]).toBeTruthy();
        expect(question.evidence.length).toBeGreaterThan(0);
        for (const id of question.evidence) expect(rows).toContain(id);
        expect(question.explanation.length).toBeGreaterThan(20);
      }
    }
  });
});
