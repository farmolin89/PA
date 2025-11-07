const path = require('path');
const knex = require('knex');

jest.mock('../../event-emitter', () => ({
  sendEvent: jest.fn(),
  initializeSSE: jest.fn(),
}));

const { sendEvent } = require('../../event-emitter');
const createTestService = require('../../services/testService');
const createTestTakingService = require('../../services/testTakingService');
const createReviewService = require('../../services/reviewService');

const MIGRATIONS_DIR = path.resolve(__dirname, '..', '..', 'migrations');

/**
 * Создает UUID-подобную строку с инкрементом для удобства чтения тестов.
 */
function buildUuid(suffix) {
  return `00000000-0000-0000-0000-00000000000${suffix}`;
}

describe('Админка и логика тестирования', () => {
  let db;
  let testService;
  let testTakingService;
  let reviewService;

  beforeAll(async () => {
    db = knex({
      client: 'sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await db.migrate.latest({ directory: MIGRATIONS_DIR });

    testService = createTestService(db);
    testTakingService = createTestTakingService(db);
    reviewService = createReviewService(db);
  });

  afterEach(async () => {
    await db('answers').del();
    await db('results').del();
    await db('options').del();
    await db('questions').del();
    await db('test_settings').del();
    await db('tests').del();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await db.destroy();
  });

  test('getTestingSummary считает только завершенные и сданные попытки', async () => {
    const testId = buildUuid(1);
    await db('tests').insert({ id: testId, name: 'Охрана труда', is_active: true });
    await db('test_settings').insert({
      test_id: testId,
      duration_minutes: 30,
      questions_per_test: 10,
      passing_score: 7,
    });

    const now = new Date().toISOString();
    await db('results').insert([
      { test_id: testId, fio: 'Иван Иванов', score: 8, total: 10, percentage: 80, status: 'completed', passed: true, date: now },
      { test_id: testId, fio: 'Петр Петров', score: 6, total: 10, percentage: 60, status: 'completed', passed: false, date: now },
      { test_id: testId, fio: 'Анна Смирнова', score: 0, total: 10, percentage: 0, status: 'pending_review', passed: false, date: now },
    ]);

    const summary = await testService.getTestingSummary();

    expect(summary).toEqual({
      totalTests: 1,
      passedTests: 1,
      avgResult: 70,
      needsReview: 1,
    });
  });

  test('getTestAnalytics и getAllTests игнорируют незавершенные попытки в расчетах', async () => {
    const testId = buildUuid(2);
    await db('tests').insert({ id: testId, name: 'Промышленная безопасность', is_active: false });
    await db('test_settings').insert({
      test_id: testId,
      duration_minutes: 45,
      questions_per_test: 12,
      passing_score: 9,
    });

    const questionA = buildUuid('A');
    const questionB = buildUuid('B');
    await db('questions').insert([
      { id: questionA, test_id: testId, text: 'Вопрос 1', type: 'checkbox', correct_option_key: JSON.stringify(['A']) },
      { id: questionB, test_id: testId, text: 'Вопрос 2', type: 'checkbox', correct_option_key: JSON.stringify(['B']) },
    ]);
    await db('options').insert([
      { id: `${questionA}-A`, question_id: questionA, text: 'Правильный ответ 1' },
      { id: `${questionA}-B`, question_id: questionA, text: 'Неверный ответ 1' },
      { id: `${questionB}-A`, question_id: questionB, text: 'Неверный ответ 2' },
      { id: `${questionB}-B`, question_id: questionB, text: 'Правильный ответ 2' },
    ]);

    const [resultPassedId] = await db('results').insert({
      test_id: testId,
      fio: 'Мария Сидорова',
      score: 12,
      total: 12,
      percentage: 100,
      status: 'completed',
      passed: true,
      date: new Date().toISOString(),
    });
    const [resultFailedId] = await db('results').insert({
      test_id: testId,
      fio: 'Сергей Николаев',
      score: 5,
      total: 12,
      percentage: 42,
      status: 'completed',
      passed: false,
      date: new Date().toISOString(),
    });
    const [resultPendingId] = await db('results').insert({
      test_id: testId,
      fio: 'Ольга Павлова',
      score: 0,
      total: 12,
      percentage: 0,
      status: 'pending_review',
      passed: false,
      date: new Date().toISOString(),
    });

    await db('answers').insert([
      { result_id: resultPassedId, question_id: questionA, user_answer: JSON.stringify([`${questionA}-A`]), is_correct: true, review_status: 'auto' },
      { result_id: resultPassedId, question_id: questionB, user_answer: JSON.stringify([`${questionB}-B`]), is_correct: true, review_status: 'auto' },
      { result_id: resultFailedId, question_id: questionA, user_answer: JSON.stringify([`${questionA}-B`]), is_correct: false, review_status: 'auto' },
      { result_id: resultFailedId, question_id: questionB, user_answer: JSON.stringify([`${questionB}-A`]), is_correct: false, review_status: 'auto' },
      { result_id: resultPendingId, question_id: questionA, user_answer: JSON.stringify([`${questionA}-B`]), is_correct: false, review_status: 'pending' },
    ]);

    const analytics = await testService.getTestAnalytics(testId);

    expect(analytics.summaryStats.totalAttempts).toBe(3);
    expect(analytics.summaryStats.passRate).toBe(50);
    expect(analytics.summaryStats.averagePercentage).toBe(71); // (100 + 42) / 2 округляется до 71

    const totalAnswersCount = analytics.mostDifficultQuestions.reduce((acc, item) => acc + Number(item.totalAnswers), 0);
    expect(totalAnswersCount).toBe(4);

    const completedDistributionTotal = analytics.scoreDistribution.reduce((acc, bucket) => acc + Number(bucket.count), 0);
    expect(completedDistributionTotal).toBe(2);

    const tests = await testService.getAllTests();
    expect(tests).toHaveLength(1);
    expect(tests[0].attemptsCount).toBe(3);
    expect(tests[0].passRate).toBe(50);
    expect(tests[0].avgScore).toBe(71);
  });

  test('полный цикл: прохождение с ручной проверкой обновляет результат и шлет событие', async () => {
    const testId = buildUuid(3);
    await db('tests').insert({ id: testId, name: 'Инструктаж по технике безопасности', is_active: true });
    await db('test_settings').insert({
      test_id: testId,
      duration_minutes: 20,
      questions_per_test: 2,
      passing_score: 2,
    });

    const questionChoice = buildUuid('C');
    const questionText = buildUuid('D');
    await db('questions').insert([
      { id: questionChoice, test_id: testId, text: 'Выберите верный вариант', type: 'checkbox', correct_option_key: JSON.stringify(['A']) },
      { id: questionText, test_id: testId, text: 'Опишите порядок действий', type: 'text_input' },
    ]);
    await db('options').insert([
      { id: `${questionChoice}-A`, question_id: questionChoice, text: 'Верный вариант' },
      { id: `${questionChoice}-B`, question_id: questionChoice, text: 'Неверный вариант' },
    ]);

    const startTime = Date.now();
    const attempt = await testTakingService.processAndSaveResults({
      testId,
      fio: 'Тестовый Пользователь',
      startTime,
      userAnswers: [
        { questionId: questionChoice, answerIds: [`${questionChoice}-A`] },
        { questionId: questionText, answerIds: ['Ответ на вопрос'] },
      ],
    });

    expect(attempt.status).toBe('pending_review');

    const pendingAnswer = await db('answers').where({ question_id: questionText }).first();
    expect(pendingAnswer.review_status).toBe('pending');

    await reviewService.submitBatch([{ answerId: pendingAnswer.id, isCorrect: true }]);

    const updatedResult = await db('results').where({ id: pendingAnswer.result_id }).first();
    expect(updatedResult.status).toBe('completed');
    expect(Boolean(updatedResult.passed)).toBe(true);
    expect(updatedResult.score).toBe(2);
    expect(updatedResult.percentage).toBe(100);

    const reviewedAnswer = await db('answers').where({ id: pendingAnswer.id }).first();
    expect(reviewedAnswer.review_status).toBe('manual_correct');
    expect(Boolean(reviewedAnswer.is_correct)).toBe(true);

    expect(sendEvent).toHaveBeenCalledWith(expect.objectContaining({ resultId: pendingAnswer.result_id }), 'result-reviewed');
  });
});
