import type { ExamQuestion } from './engine';
import type { ExamSnapshot } from './session';

export type ExamReviewFilter = 'all' | 'correct' | 'wrong' | 'unanswered' | 'flagged';
export function examAnswerState(question: ExamQuestion, answers: ExamSnapshot['answers']) {
  const answer = answers[question.id];
  return answer === undefined ? 'unanswered' : answer === question.correctIndex ? 'correct' : 'wrong';
}

export function examAnswerCounts(questions: readonly ExamQuestion[], answers: ExamSnapshot['answers']) {
  const correct = questions.filter(question => examAnswerState(question, answers) === 'correct').length;
  const unanswered = questions.filter(question => examAnswerState(question, answers) === 'unanswered').length;
  return { total: questions.length, answered: questions.length - unanswered, correct, wrong: questions.length - correct - unanswered, unanswered };
}

export function examReviewIndices(snapshot: ExamSnapshot, filter: ExamReviewFilter) {
  return snapshot.questions.flatMap((question, index) => filter === 'all' ||
    (filter === 'flagged' ? snapshot.flaggedIds.includes(question.id) : examAnswerState(question, snapshot.answers) === filter) ? [index] : []);
}

export function examPromptParts(question: ExamQuestion) {
  const lines = question.prompt.trim().split('\n').filter(line => line.trim());
  // ponytail: legacy reading items separate their last question line with a newline; keep all other prompts intact until structured passages exist.
  return question.skill === 'READING' && lines.length > 1 && /[?？]$/.test(lines.at(-1)!.trim())
    ? { passage: lines.slice(0, -1).join('\n'), instruction: lines.at(-1)! }
    : { passage: '', instruction: question.prompt };
}

export const examTimeLabel = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
