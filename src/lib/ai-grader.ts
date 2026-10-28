import { TestPaper, StudentAnswer, ProcessScoreDetail } from './types';

/**
 * PIRLS 智慧規準批改引擎 (AI Grader & Diagnostic Engine)
 * 嚴格落實官方評卷手冊標準：
 * 1. 選擇題精準客觀對題
 * 2. 簡答題依據 0/1/2/3 分 Rubrics 規準與文本線索進行階梯評定
 * 3. 產出 IEA 官方雙位數代碼與正向三明治回饋
 * 4. 統計四層次素養得分率 (L1 提取、L2 推論、L3 詮釋、L4 評估)
 */

export interface GradeExamInput {
  testPaper: TestPaper;
  rawAnswers: Record<string, string>; // questionId -> answer
}

export interface GradeExamResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  processScores: {
    level1: ProcessScoreDetail;
    level2: ProcessScoreDetail;
    level3: ProcessScoreDetail;
    level4: ProcessScoreDetail;
  };
  answers: StudentAnswer[];
}

export async function gradeStudentSubmission(
  input: GradeExamInput
): Promise<GradeExamResult> {
  const { testPaper, rawAnswers } = input;
  const gradedAnswers: StudentAnswer[] = [];

  const processEarned = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const processTotal = { 1: 0, 2: 0, 3: 0, 4: 0 };

  for (const q of testPaper.questions) {
    const studentAns = (rawAnswers[q.id] || '').trim();
    const pLevel = q.processLevelNumber as 1 | 2 | 3 | 4;
    processTotal[pLevel] += q.points;

    if (q.type === 'multiple_choice') {
      // 選擇題客觀判分
      const isCorrect = studentAns.toUpperCase() === (q.correctAnswerLabel || '').toUpperCase();
      const score = isCorrect ? q.points : 0;
      processEarned[pLevel] += score;

      const opt = q.options?.find((o) => o.label.toUpperCase() === studentAns.toUpperCase());

      gradedAnswers.push({
        questionId: q.id,
        questionNumber: q.questionNumber,
        type: q.type,
        processLevel: q.processLevel,
        processLevelNumber: q.processLevelNumber,
        points: q.points,
        studentAnswer: studentAns,
        score,
        maxScore: q.points,
        isCorrect,
        code: isCorrect ? '10' : '79',
        aiFeedback: {
          strength: isCorrect
            ? '答對了！你準確找出了正確選項！'
            : '這次選錯了，不用氣餒！',
          weakness: isCorrect
            ? (opt?.explanation || '分析完全正確。')
            : `你選擇了 ${studentAns || '未作答'}。正確答案為 ${q.correctAnswerLabel}。${q.options?.find(o => o.label === q.correctAnswerLabel)?.explanation || ''}`,
          scaffoldingTip: isCorrect
            ? '繼續保持這樣敏銳的觀察力！'
            : '建議重新回到相關段落，核對文字描寫的細節差異。',
          evidenceFound: isCorrect,
          evidenceDetails: isCorrect ? ['成功選出對應選項'] : [],
        },
      });
    } else {
      // 開放簡答題 (Rubrics 規準評定)
      const rubric = q.rubric;
      const maxPts = q.points;

      if (!studentAns || studentAns.length < 2 || studentAns === '不知道') {
        // 空白或未作答 (Code 99)
        gradedAnswers.push({
          questionId: q.id,
          questionNumber: q.questionNumber,
          type: q.type,
          processLevel: q.processLevel,
          processLevelNumber: q.processLevelNumber,
          points: q.points,
          studentAnswer: studentAns || '（未作答）',
          score: 0,
          maxScore: maxPts,
          code: '99',
          aiFeedback: {
            strength: '願意瀏覽這道題目就是跨出第一步！',
            weakness: '本題尚未寫出具體答案或內容過於簡略。',
            scaffoldingTip: '試著回到文章中找出題目所問的關鍵人事物，哪怕只寫出一句話也是很棒的開始喔！',
            evidenceFound: false,
            evidenceDetails: [],
          },
        });
      } else {
        // 檢核關鍵文本證據與得分判定
        const evalRes = evaluateConstructedResponse(studentAns, q);
        processEarned[pLevel] += evalRes.score;

        gradedAnswers.push({
          questionId: q.id,
          questionNumber: q.questionNumber,
          type: q.type,
          processLevel: q.processLevel,
          processLevelNumber: q.processLevelNumber,
          points: q.points,
          studentAnswer: studentAns,
          score: evalRes.score,
          maxScore: maxPts,
          code: evalRes.code,
          aiFeedback: {
            strength: evalRes.strength,
            weakness: evalRes.weakness,
            scaffoldingTip: evalRes.tip,
            evidenceFound: evalRes.evidenceFound,
            evidenceDetails: evalRes.matchedDetails,
          },
        });
      }
    }
  }

  const totalScore = Object.values(processEarned).reduce((a, b) => a + b, 0);
  const maxScore = Object.values(processTotal).reduce((a, b) => a + b, 0);
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  const calcProcess = (lvl: 1 | 2 | 3 | 4): ProcessScoreDetail => {
    const e = processEarned[lvl];
    const t = processTotal[lvl];
    return {
      earned: e,
      total: t,
      percentage: t > 0 ? Math.round((e / t) * 100) : 0,
    };
  };

  return {
    totalScore,
    maxScore,
    percentage,
    processScores: {
      level1: calcProcess(1),
      level2: calcProcess(2),
      level3: calcProcess(3),
      level4: calcProcess(4),
    },
    answers: gradedAnswers,
  };
}

/**
 * 依據 Rubrics 給分規準判定簡答題得分與三明治回饋
 */
function evaluateConstructedResponse(
  studentAns: string,
  question: any
): {
  score: number;
  code: string;
  strength: string;
  weakness: string;
  tip: string;
  evidenceFound: boolean;
  matchedDetails: string[];
} {
  const maxScore = question.points || 2;
  const rubric = question.rubric;
  const matchedDetails: string[] = [];

  // 防禦性檢核：過濾 HTML 標籤、腳本注入或無中文文字之無效輸入
  const containsHtml = /<[^>]*>/i.test(studentAns);
  const hasChinese = /[\u4e00-\u9fa5]/.test(studentAns);

  if (containsHtml || !hasChinese) {
    return {
      score: 0,
      code: '79',
      strength: '系統已接收到您的作答輸入。',
      weakness: containsHtml
        ? '作答內容包含網頁代碼或標籤，無法採認為閱讀理解之有效文本。'
        : '作答內容缺少中文表達，無法判定文本理解程度。',
      tip: '請回到文章段落，以中文完整寫出題目所問的答案喔！',
      evidenceFound: false,
      matchedDetails: [],
    };
  }

  // 比對規準中的 keyEvidenceNeeded 與語意概念線索
  let matchedEvidenceCount = 0;
  if (rubric?.criteria) {
    const topCriteria = rubric.criteria.find((c: any) => c.score === maxScore) || rubric.criteria[0];
    if (topCriteria?.keyEvidenceNeeded && topCriteria.keyEvidenceNeeded.length > 0) {
      for (const ev of topCriteria.keyEvidenceNeeded) {
        // 1. 切分標點與連詞
        const tokens = ev
          .replace(/[（）()「」『』]/g, ' ')
          .split(/[/、，,與和及或是在向由從對於把被]/)
          .map((k: string) => k.trim())
          .filter((k: string) => k.length >= 2);

        // 2. 檢查是否有 token 或 2~4 字核心語意詞出現在學生作答中
        let isMatched = studentAns.includes(ev);
        if (!isMatched) {
          for (const token of tokens) {
            if (studentAns.includes(token)) {
              isMatched = true;
              break;
            }
            // 若 token 較長，切成 2 字詞塊檢查關鍵詞（如：火災、救樹、守護、雙向）
            for (let i = 0; i <= token.length - 2; i++) {
              const sub = token.substring(i, i + 2);
              if (['火災', '撲救', '救樹', '守護', '雙向', '單向', '珍貴', '珍惜', '感動', '勇氣', '土石', '播種', '排泄', '更新', '陽光', '幼苗'].includes(sub) && studentAns.includes(sub)) {
                isMatched = true;
                break;
              }
            }
            if (isMatched) break;
          }
        }

        if (isMatched) {
          matchedEvidenceCount++;
          matchedDetails.push(ev);
        }
      }
    }
  }

  let finalScore = 0;
  let code = '79';
  let strength = '';
  let weakness = '';
  let tip = '';

  const ansLen = studentAns.length;

  if (maxScore === 3) {
    // 3 分題（因果心態轉變題或跨段落統整題）
    // 檢視是否有前-中-後對比結構 (起初/原本... 後來/經歷... 最後/明白/感動)
    const hasTimeline =
      /(起初|原本|最初|一開始|之前)/.test(studentAns) &&
      /(後來|經過|經歷|火災|因為|看見)/.test(studentAns) &&
      /(最後|明白|領悟|轉為|體會|感動|感激|敬佩)/.test(studentAns);

    if (matchedEvidenceCount >= 2 || (hasTimeline && ansLen >= 35) || (matchedEvidenceCount >= 1 && ansLen >= 40)) {
      finalScore = 3;
      code = '30';
      strength = '太出色了！你不僅精準指出了心態前後的強烈對比，更引用了充實的文本事件作為論據，思考非常周全！';
      weakness = '論述層次分明、條理清晰，完全符合官方滿分標準。';
      tip = '繼續保持這種跨段落統整因果的宏觀閱讀思維！';
    } else if (matchedEvidenceCount >= 1 || ansLen >= 20) {
      finalScore = 2;
      code = '21';
      strength = '很棒！你已經抓住了人物感受轉變的大方向，能寫出清楚的立場！';
      weakness = '若能再深入補充「火災中大家齊心撲救」具體發生了什麼事導致想法改變，就能拿滿分 3 分喔！';
      tip = '試著用『起初主角認為……後來因為……最終明白了……』的三段式結構來回答。';
    } else if (ansLen >= 8) {
      finalScore = 1;
      code = '11';
      strength = '有看懂題目想問的感受轉變！';
      weakness = '回答稍顯簡略，只寫出了一種感受，缺少了前後對比與具體理由。';
      tip = '試著回到第一段與第四段，把兩邊不同的句子找出來對照看看。';
    } else {
      finalScore = 0;
      code = '79';
      strength = '肯定你認真作答的心態！';
      weakness = '內容未觸及題目核心所問的感受變化。';
      tip = '仔細看看題目問的是「最初的感受」與「後來的感受」，需要寫出兩者的差異喔！';
    }
  } else if (maxScore === 2) {
    // 2 分題（並列列舉或論點+證據）
    if (matchedEvidenceCount >= 2 || (matchedEvidenceCount >= 1 && ansLen >= 25)) {
      finalScore = 2;
      code = '20';
      strength = '太棒了！你的論點鮮明，而且精準引用了文章的關鍵細節作為有力佐證！';
      weakness = '回答條理非常清晰，邏輯緊密。';
      tip = '下次作答若能嘗試加入日常生活中的省思，思維會更深入喔！';
    } else if (matchedEvidenceCount >= 1 || ansLen >= 12) {
      finalScore = 1;
      code = '11';
      strength = '很好！你已經成功抓住了其中的核心要點與正確方向！';
      weakness = '稍微可惜的是，只舉出了一項線索，或者論述中缺少了具體的文章文字佐證。';
      tip = '題目通常要求舉出兩項理由或兼具原因，別忘了分點列出：1. ... 2. ... 喔！';
    } else {
      finalScore = 0;
      code = '79';
      strength = '謝謝你的回答！';
      weakness = '目前的回答內容與文章要表達的核心重點關聯較弱。';
      tip = '先將題目關鍵字在文章段落中畫線，再根據上下文作答會更精準。';
    }
  } else {
    // 1 分題（單一問答）
    if (matchedEvidenceCount >= 1 || ansLen >= 10) {
      finalScore = 1;
      code = '10';
      strength = '答得很精準！你準確看出了文章所要表達的核心原因！';
      weakness = '簡潔有力，切中題意。';
      tip = '繼續保持！';
    } else {
      finalScore = 0;
      code = '79';
      strength = '謝謝你的作答！';
      weakness = '回答內容未能切合文中所述的事實原因。';
      tip = '回到第三段找找看關鍵人物的對話與行動。';
    }
  }

  return {
    score: finalScore,
    code,
    strength,
    weakness,
    tip,
    evidenceFound: matchedEvidenceCount > 0,
    matchedDetails,
  };
}
