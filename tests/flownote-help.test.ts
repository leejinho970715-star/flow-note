import test from 'node:test';
import assert from 'node:assert/strict';
import { HELP_ARTICLES, searchHelp, answerHelp } from '../demos/weekly-report/help.js';

test('public manual covers workspace views and Korean spacing without executing actions', () => {
  assert.equal(HELP_ARTICLES.length, 16);
  assert.equal(new Set(HELP_ARTICLES.map(article => article.id)).size, 16);
  for (const article of HELP_ARTICLES) {
    assert.ok(article.title && article.body && article.steps.length && article.keywords.length);
    assert.ok(['home', 'projects', 'compose', 'reports', 'team', 'audit'].includes(article.view));
  }
  assert.equal(searchHelp('고객등록')[0].article.id, 'client');
  assert.equal(searchHelp('고객 등록')[0].article.id, 'client');
  assert.equal(searchHelp('CSV')[0].article.id, 'csv');
  assert.ok(searchHelp('승인').length <= 5);
  assert.equal(searchHelp('고').length, 0);
  assert.equal(searchHelp('').length, 0);
});

test('approval question explains self approval and state limits; v2 explains new approval', () => {
  const result = answerHelp('승인 안돼요');
  assert.equal(result.matched, true);
  assert.equal(result.articles[0].id, 'approval');
  assert.match(result.answer, /자기 승인할 수 없습니다/);
  assert.match(result.answer, /검수 대기/);
  const version = answerHelp('v2');
  assert.equal(version.articles[0].id, 'versions');
  assert.match(version.answer, /이전 승인이 새 버전에 이어지지 않습니다/);
});

test('unsupported finance, predictions and mail requests never pretend to run', () => {
  for (const query of ['입금이체해줘', '세금신고', '내년 예상 매출 알려줘', '고객 이메일 보내줘', '메일 발송해줘']) {
    const result = answerHelp(query);
    assert.equal(result.matched, false, query);
    assert.match(result.answer, /지원하지 않으며 어떤 작업도 실행하지 않았습니다/);
    assert.equal(result.articles[0].id, 'scope');
  }
});

test('unknown questions and private customer queries do not fabricate company data', () => {
  assert.equal(answerHelp('모르는문장').matched, false);
  assert.deepEqual(answerHelp('모르는문장').articles, []);
  assert.equal(answerHelp('우리 회사 고객 보고서 보여줘').matched, false);
  assert.equal(answerHelp('고객등록').matched, true);
  assert.match(answerHelp('전달').answer, /수동/);
  assert.match(answerHelp('백업').answer, /서버 운영자/);
  assert.match(answerHelp('계정복구').answer, /아직 제공하지 않습니다/);
});
