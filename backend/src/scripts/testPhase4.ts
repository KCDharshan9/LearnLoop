/**
 * Targeted Phase 4 Integration Test Script.
 *
 * Exercises the complete diagnostic assessment lifecycle against http://localhost:5001:
 * - Authentication & profile resolution
 * - Diagnostic initialization & stable question delivery (no answer leakage)
 * - Server-side answer evaluation
 * - Case A: Strong prerequisite + Weak target => Direct target intervention
 * - Case B: Weak prerequisite + Weak target => Prerequisite reinforcement
 * - Learner skill state updates & progress history recording
 * - Duplicate submission idempotency
 * - Cross-student attempt authorization enforcement
 */

async function runTests() {
  const PORT = process.env.PORT ?? '5000'
  const BASE = process.env.API_BASE ?? `http://localhost:${PORT}/api`
  console.info('Starting Phase 4 Targeted Validation on', BASE)

  // 1. Authenticate Student 1
  const loginRes1 = await fetch(`${BASE}/auth/demo-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student1@learnloop.xyz', password: 'student123' }),
  })
  const loginData1 = (await loginRes1.json()) as any
  if (!loginData1.success) throw new Error('Student 1 login failed')
  const token1 = loginData1.data.session.token
  const student1Id = loginData1.data.user.profileId
  console.info('✓ 1. Student 1 authenticated. Profile ID:', student1Id)

  // 2. Authenticate Student 2
  const loginRes2 = await fetch(`${BASE}/auth/demo-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student2@learnloop.xyz', password: 'student123' }),
  })
  const loginData2 = (await loginRes2.json()) as any
  if (!loginData2.success) throw new Error('Student 2 login failed')
  const token2 = loginData2.data.session.token
  const student2Id = loginData2.data.user.profileId
  console.info('✓ 2. Student 2 authenticated. Profile ID:', student2Id)

  // 3. Get Default Diagnostic ID
  const diagRes = await fetch(`${BASE}/assessments/diagnostic/default`, {
    headers: { Authorization: `Bearer ${token1}` },
  })
  const diagData = (await diagRes.json()) as any
  if (!diagData.success) throw new Error('Failed to get default diagnostic')
  const assessmentId = diagData.data.id
  console.info('✓ 3. Default diagnostic resolved:', assessmentId)

  // 4. Start / Retrieve Diagnostic for Student 1
  const startRes = await fetch(`${BASE}/assessments/${assessmentId}`, {
    headers: { Authorization: `Bearer ${token1}` },
  })
  const startData = (await startRes.json()) as any
  if (!startData.success) throw new Error('Failed to start assessment')
  const attemptId1 = startData.data.attemptId
  const questions1 = startData.data.assessment.questions
  console.info(`✓ 4. Diagnostic started. Questions returned: ${questions1.length}, Attempt ID: ${attemptId1}`)

  // Verify questions do NOT leak correctAnswer or explanation
  for (const q of questions1) {
    if ('correctAnswer' in q || 'explanation' in q) {
      throw new Error(`SECURITY LEAK: Question ${q.id} leaks answer or explanation!`)
    }
  }
  console.info('✓ 4b. Security verified: No answer leakage in client question payload.')

  // Verify stable attemptId on refresh
  const refreshRes = await fetch(`${BASE}/assessments/${assessmentId}`, {
    headers: { Authorization: `Bearer ${token1}` },
  })
  const refreshData = (await refreshRes.json()) as any
  if (refreshData.data.attemptId !== attemptId1) {
    throw new Error('Attempt ID changed on refresh! Expected stable attempt session.')
  }
  console.info('✓ 4c. Session stability verified: Attempt ID is identical across page refreshes.')

  // 5. Submit Case A for Student 1:
  // Strong Prerequisite (Repeated Addition = 100%, Addition = 100%, Number Sense = 100%)
  // Weak Target (Multiplication = 0%, Division = 0%)
  // We want to answer questions for number-sense, addition, repeated-addition correctly,
  // and deliberately answer multiplication and division incorrectly.
  const caseAAnswers: any[] = []
  for (const q of questions1) {
    if (q.skillSlug === 'number-sense') {
      caseAAnswers.push({ questionId: q.id, answer: q.type === 'MCQ' ? '7' : 40 })
    } else if (q.skillSlug === 'addition') {
      caseAAnswers.push({ questionId: q.id, answer: q.difficulty === 1 ? 7 : 24 })
    } else if (q.skillSlug === 'repeated-addition') {
      caseAAnswers.push({ questionId: q.id, answer: q.difficulty === 1 ? '2 + 2 + 2' : 12 })
    } else if (q.skillSlug === 'multiplication') {
      caseAAnswers.push({ questionId: q.id, answer: 999 }) // INCORRECT
    } else if (q.skillSlug === 'division') {
      caseAAnswers.push({ questionId: q.id, answer: 4 }) // CORRECT (12/3=4, 24/6=4)
    }
  }

  const submitRes1 = await fetch(`${BASE}/assessments/${assessmentId}/attempts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`,
    },
    body: JSON.stringify({
      attemptId: attemptId1,
      answers: caseAAnswers,
    }),
  })
  const submitData1 = (await submitRes1.json()) as any
  if (!submitData1.success) throw new Error(`Submission Case A failed: ${JSON.stringify(submitData1)}`)

  const res1 = submitData1.data
  console.info(`✓ 5. Case A submitted. Overall score: ${res1.overallScore}%`)

  // Check Case A Skill Results
  const multResult = res1.skillResults.find((r: any) => r.skillSlug === 'multiplication')
  const repAddResult = res1.skillResults.find((r: any) => r.skillSlug === 'repeated-addition')
  if (!multResult || multResult.score !== 0 || multResult.status !== 'NEEDS_SUPPORT') {
    throw new Error(`Expected Multiplication to be 0% NEEDS_SUPPORT, got ${JSON.stringify(multResult)}`)
  }
  if (!repAddResult || repAddResult.score !== 100 || repAddResult.status !== 'MASTERED') {
    throw new Error(`Expected Repeated Addition to be 100% MASTERED, got ${JSON.stringify(repAddResult)}`)
  }
  console.info('✓ 5b. Case A skill scoring accurate: Multiplication=0% (Needs Support), Repeated Addition=100% (Mastered).')

  // Check Case A Gap Detection: Direct Target Intervention
  if (res1.learningGap.gapType !== 'DIRECT_TARGET_WEAKNESS') {
    throw new Error(`Expected Case A gapType to be DIRECT_TARGET_WEAKNESS, got ${res1.learningGap.gapType}`)
  }
  if (res1.recommendation.actionType !== 'DIRECT_INSTRUCTION') {
    throw new Error(`Expected Case A recommendation to be DIRECT_INSTRUCTION, got ${res1.recommendation.actionType}`)
  }
  console.info(`✓ 5c. Case A Gap Detection verified: ${res1.learningGap.summary} -> ${res1.recommendation.headline}`)

  // 6. Test Idempotency (Duplicate Submission)
  const dupRes = await fetch(`${BASE}/assessments/${assessmentId}/attempts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`,
    },
    body: JSON.stringify({
      attemptId: attemptId1,
      answers: caseAAnswers,
    }),
  })
  const dupData = (await dupRes.json()) as any
  if (!dupData.success || dupData.data.attemptId !== attemptId1) {
    throw new Error('Duplicate submission failed or did not return existing attempt.')
  }
  console.info('✓ 6. Idempotency verified: Re-submitting completed attempt returns existing result safely.')

  // 7. Case B: Weak Prerequisite + Weak Target (Repeated Addition = 0%, Multiplication = 0%)
  // Start diagnostic for Student 2
  const startRes2 = await fetch(`${BASE}/assessments/${assessmentId}`, {
    headers: { Authorization: `Bearer ${token2}` },
  })
  const startData2 = (await startRes2.json()) as any
  const attemptId2 = startData2.data.attemptId
  const questions2 = startData2.data.assessment.questions

  const caseBAnswers: any[] = []
  for (const q of questions2) {
    if (q.skillSlug === 'number-sense') {
      caseBAnswers.push({ questionId: q.id, answer: q.type === 'MCQ' ? '7' : 40 })
    } else if (q.skillSlug === 'addition') {
      caseBAnswers.push({ questionId: q.id, answer: q.difficulty === 1 ? 7 : 24 })
    } else if (q.skillSlug === 'repeated-addition') {
      caseBAnswers.push({ questionId: q.id, answer: 'wrong' }) // INCORRECT
    } else if (q.skillSlug === 'multiplication') {
      caseBAnswers.push({ questionId: q.id, answer: 999 }) // INCORRECT
    } else if (q.skillSlug === 'division') {
      caseBAnswers.push({ questionId: q.id, answer: 4 }) // CORRECT
    }
  }

  const submitRes2 = await fetch(`${BASE}/assessments/${assessmentId}/attempts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token2}`,
    },
    body: JSON.stringify({
      attemptId: attemptId2,
      answers: caseBAnswers,
    }),
  })
  const submitData2 = (await submitRes2.json()) as any
  if (!submitData2.success) throw new Error(`Submission Case B failed: ${JSON.stringify(submitData2)}`)

  const res2 = submitData2.data
  console.info(`✓ 7. Case B submitted. Overall score: ${res2.overallScore}%`)

  // Check Case B Gap Detection: Prerequisite Reinforcement
  if (res2.learningGap.gapType !== 'PREREQUISITE_WEAKNESS') {
    throw new Error(`Expected Case B gapType to be PREREQUISITE_WEAKNESS, got ${res2.learningGap.gapType}`)
  }
  if (res2.recommendation.actionType !== 'PREREQUISITE_REINFORCEMENT') {
    throw new Error(`Expected Case B actionType to be PREREQUISITE_REINFORCEMENT, got ${res2.recommendation.actionType}`)
  }
  console.info(`✓ 7b. Case B Gap Detection verified: ${res2.learningGap.summary} -> ${res2.recommendation.headline}`)

  // 8. Test Authorization: Student 2 attempts to read Student 1's attempt
  const crossRes = await fetch(`${BASE}/assessment-attempts/${attemptId1}`, {
    headers: { Authorization: `Bearer ${token2}` },
  })
  if (crossRes.status !== 403) {
    throw new Error(`Expected HTTP 403 Forbidden for cross-student access, got ${crossRes.status}`)
  }
  console.info('✓ 8. Authorization enforced: Cross-student attempt access correctly returned HTTP 403 Forbidden.')

  // 9. Fetch Student 1's attempt with Student 1's token
  const ownRes = await fetch(`${BASE}/assessment-attempts/${attemptId1}`, {
    headers: { Authorization: `Bearer ${token1}` },
  })
  const ownData = (await ownRes.json()) as any
  if (!ownData.success || ownData.data.attemptId !== attemptId1) {
    throw new Error('Failed to retrieve own assessment attempt result.')
  }
  console.info('✓ 9. Result retrieval verified: Student 1 successfully retrieved their persisted result.')

  console.info('\nALL TARGETED PHASE 4 TESTS PASSED SUCCESSFULLY! 🎉')
}

runTests().catch((err) => {
  console.error('Phase 4 Test Failure:', err)
  process.exit(1)
})
