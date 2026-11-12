import {
  TestPaper,
  QuestionRubric,
  ExamSubmission,
  ClassRoom,
  User,
  AiPedagogicalAdvice,
  BenchmarkKey,
  ComparativeAnalysisData,
  ClassCoTeachersData,
  TestAssignment,
} from './types';

export class ApiClientError extends Error {
  public status: number;
  public data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.data = data;
  }
}

/**
 * 統一底層 HTTP Request 工具函式
 */
async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  // 預設 cache: 'no-store' 確保動態數據即時更新
  const res = await fetch(url, {
    cache: 'no-store',
    ...options,
    headers,
  });

  // 全域 401 登入逾期檢查
  if (res.status === 401 && typeof window !== 'undefined') {
    if (!window.location.pathname.startsWith('/login')) {
      console.warn('[ApiClient] 登入憑證已過期，自動導向登入頁');
      window.location.href = '/login?expired=true';
    }
  }

  let data: any;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    data = await res.text();
  }

  if (!res.ok || (data && typeof data === 'object' && data.success === false)) {
    const errorMsg = data?.error || data?.message || `HTTP ${res.status}: ${res.statusText}`;
    throw new ApiClientError(errorMsg, res.status, data);
  }

  return data as T;
}

// =========================================================================
// 回傳型別定義
// =========================================================================

export interface TeacherTestPapersResponse {
  testPapers: TestPaper[];
  assignmentStats: Record<string, any>;
  currentUserId: string;
  currentUserName: string;
  isAdmin: boolean;
}

export interface TeacherTestResultsResponse {
  testPaper: {
    id: string;
    title: string;
    totalPoints: number;
    targetGrade: number;
    textType: string;
  };
  stats: {
    totalSubmitted: number;
    avgScore: number;
    maxScore: number;
    avgScaleScore?: number;
  };
  benchmarkDistribution?: {
    totalCount: number;
    avgScaleScore: number;
    advanced: { count: number; percentage: number };
    high: { count: number; percentage: number };
    intermediate: { count: number; percentage: number };
    low: { count: number; percentage: number };
    below_low: { count: number; percentage: number };
  };
  submissions: any[];
}

export interface TeacherSubmissionDetailResponse {
  submission: ExamSubmission;
  testPaper: TestPaper;
  siblings: Array<{
    id: string;
    studentId: string;
    studentName: string;
    className?: string;
    seatNumber?: number;
    totalScore: number;
    maxScore: number;
    scaleScore: number;
    isTeacherReviewed: boolean;
  }>;
}

// =========================================================================
// 領域命名空間 API
// =========================================================================

export const api = {
  // -----------------------------------------------------------------------
  // 教師端 (Teacher)
  // -----------------------------------------------------------------------
  teacher: {
    /** 取得題庫列表與指派統計 */
    getTestPapers: () =>
      request<TeacherTestPapersResponse>('/api/teacher/test-papers'),

    /** 取得單份試卷詳情 */
    getTestPaper: (id: string) =>
      request<{ testPaper: TestPaper }>(`/api/teacher/test-papers/${id}`),

    /** 建立新試卷存入題庫 */
    createTestPaper: (testPaper: Partial<TestPaper>) =>
      request<{ success: boolean; id: string; message?: string }>('/api/teacher/test-papers', {
        method: 'POST',
        body: JSON.stringify({ testPaper }),
      }),

    /** 更新已建立的試卷（再度編輯） */
    updateTestPaper: (id: string, testPaper: Partial<TestPaper>) =>
      request<{ success: boolean; testPaper: TestPaper; message?: string }>(
        `/api/teacher/test-papers/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify({ testPaper }),
        }
      ),

    /** 刪除試卷（嚴格限建立者本人或管理員） */
    deleteTestPaper: (id: string) =>
      request<{ success: boolean; message?: string }>(`/api/teacher/test-papers/${id}`, {
        method: 'DELETE',
      }),

    /** 調用 AI 重新生成指定配分的 PIRLS 官方給分規準 (Rubrics) */
    regenerateQuestionRubric: (params: {
      articleTitle: string;
      articleContent: string;
      prompt: string;
      processLevel: string;
      processLevelNumber: number;
      targetGrade?: number;
      newPoints: number;
      currentRubric?: QuestionRubric;
      provider?: string;
      apiKey?: string;
      customBaseUrl?: string;
      preferredModel?: string;
    }) =>
      request<{ success: boolean; rubric: QuestionRubric; error?: string }>('/api/ai/regenerate-rubric', {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    /** 指派試卷至班級、調整公開與作答設定 (相容舊呼叫) */
    assignTestPaper: (
      id: string,
      options: {
        classIds: string[];
        isPublic: boolean;
        examCode?: string;
        allowRetake?: boolean;
        deadlineType?: 'unlimited' | 'scheduled';
        dueDate?: string | null;
      }
    ) =>
      request<{ success: boolean; message?: string; assignments?: TestAssignment[]; testPaper?: TestPaper }>(
        `/api/teacher/test-papers/${id}/assign`,
        {
          method: 'POST',
          body: JSON.stringify(options),
        }
      ),

    /** 取得當前教師負責與協同班級的所有獨立指派任務事件與進度 */
    getAssignments: () =>
      request<{
        success: boolean;
        assignments: TestAssignment[];
        stats: Record<string, { totalStudents: number; submittedCount: number; avgScore: number; maxScore: number }>;
        currentUserId: string;
        isAdmin: boolean;
      }>('/api/teacher/assignments'),

    /** 建立獨立指派任務事件（為各勾選班級分別建立獨立實例） */
    createAssignments: (payload: {
      testPaperId: string;
      classIds: string[];
      allowRetake?: boolean;
      examCode?: string;
      deadlineType?: 'unlimited' | 'scheduled';
      dueDate?: string | null;
    }) =>
      request<{ success: boolean; assignments: TestAssignment[]; message?: string }>(
        '/api/teacher/assignments',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      ),

    /** 修改單一獨立指派任務事件（期限、安全碼、重測許可、關閉狀態） */
    updateAssignment: (
      id: string,
      updates: Partial<TestAssignment> & { allowRetakeOnExtend?: boolean }
    ) =>
      request<{ success: boolean; assignment: TestAssignment; message?: string }>(
        `/api/teacher/assignments/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify(updates),
        }
      ),

    /** 撤回/刪除單一獨立指派任務事件 */
    deleteAssignment: (id: string) =>
      request<{ success: boolean; message?: string }>(`/api/teacher/assignments/${id}`, {
        method: 'DELETE',
      }),

    /** 取得試卷的全班受測紀錄與 PIRLS 基準分佈（可指定獨立指派事件 assignmentId） */
    getTestSubmissions: (testId: string, assignmentId?: string) =>
      request<TeacherTestResultsResponse>(
        `/api/teacher/test-papers/${testId}/submissions${
          assignmentId ? `?assignmentId=${encodeURIComponent(assignmentId)}` : ''
        }`
      ),

    /** 取得單一學生作答卷、文章原文與同儕名冊（網頁複閱模式） */
    getSubmissionDetail: (submissionId: string) =>
      request<TeacherSubmissionDetailResponse>(`/api/teacher/submissions/${submissionId}`),

    /** 教師正式核定學生作答（更新分數、評語與思維落點建議） */
    reviewSubmission: (
      submissionId: string,
      payload: {
        answersUpdates: Array<{ questionId: string; newScore: number; teacherComment?: string }>;
        teacherGeneralNote?: string;
        aiPedagogicalAdvice?: any;
      }
    ) =>
      request<{ success: boolean; submission: ExamSubmission; message?: string }>(
        `/api/teacher/submissions/${submissionId}/review`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      ),

    /** 呼叫 Gemini AI 進行開放簡答題深度再閱 */
    aiRegradeQuestion: (submissionId: string, questionId: string) =>
      request<{
        success: boolean;
        message?: string;
        results: Array<{
          questionId: string;
          questionNumber?: number;
          suggestedScore: number;
          originalScore?: number;
          reason: string;
          rubricMatched?: string;
          keyEvidenceFound?: string[];
        }>;
      }>(`/api/teacher/submissions/${submissionId}/ai-regrade`, {
        method: 'POST',
        body: JSON.stringify({ questionId }),
      }),

    /** 一鍵對整份試卷的開放簡答題執行 AI 深度再閱卷核定並存庫 */
    autoRegradeAllSubmission: (submissionId: string) =>
      request<{
        success: boolean;
        message: string;
        submission: ExamSubmission;
        regradedCount: number;
      }>(`/api/teacher/submissions/${submissionId}/auto-regrade-all`, {
        method: 'POST',
      }),

    /** 呼叫 AI 提煉四層次思維能力落點分析與學生具體改進建議 (支援 saveToDb: true 自動存庫) */
    getAiPedagogicalAdvice: (
      submissionId: string,
      currentScores?: Record<string, number>,
      saveToDb?: boolean
    ) =>
      request<{ success: boolean; advice: AiPedagogicalAdvice; submission?: ExamSubmission }>(
        `/api/teacher/submissions/${submissionId}/ai-pedagogical-advice`,
        {
          method: 'POST',
          body: JSON.stringify({ currentScores, saveToDb }),
        }
      ),

    /** 取得任教班級清單 */
    getClasses: () =>
      request<{ classes: ClassRoom[] }>('/api/teacher/classes'),

    /** 建立新班級 */
    createClass: (name: string, gradeLevel: number) =>
      request<{ success: boolean; class: ClassRoom }>('/api/teacher/classes', {
        method: 'POST',
        body: JSON.stringify({ name, gradeLevel }),
      }),

    /** 刪除班級（限主責導師與管理員） */
    deleteClass: (classId: string) =>
      request<{ success: boolean; message?: string }>(`/api/teacher/classes?classId=${classId}`, {
        method: 'DELETE',
      }),

    /** 取得班級協同教學與共同管理名單 */
    getClassCoTeachers: (classId: string) =>
      request<{ success: boolean; data: ClassCoTeachersData }>(
        `/api/teacher/classes/${classId}/co-teachers`
      ),

    /** 邀請其他老師加入班級共同管理（限主責導師與管理員） */
    addCoTeacher: (classId: string, teacherId: string) =>
      request<{ success: boolean; message: string; data: ClassCoTeachersData }>(
        `/api/teacher/classes/${classId}/co-teachers`,
        {
          method: 'POST',
          body: JSON.stringify({ teacherId }),
        }
      ),

    /** 移除協同教師 / 協同教師本人主動退出共同管理 */
    removeCoTeacher: (classId: string, teacherId: string) =>
      request<{ success: boolean; message: string; data: ClassCoTeachersData }>(
        `/api/teacher/classes/${classId}/co-teachers?teacherId=${teacherId}`,
        {
          method: 'DELETE',
        }
      ),

    /** 取得班級學生名冊 */
    getStudents: (classId: string) =>
      request<{ students: User[] }>(`/api/teacher/students?classId=${classId}`),

    /** 取得班級前後測歷程對照分析與可選試卷清單 */
    getComparativeAnalytics: (params?: {
      classId?: string;
      preTestId?: string;
      postTestId?: string;
      studentId?: string;
    }) => {
      const q = new URLSearchParams();
      if (params?.classId) q.set('classId', params.classId);
      if (params?.preTestId) q.set('preTestId', params.preTestId);
      if (params?.postTestId) q.set('postTestId', params.postTestId);
      if (params?.studentId) q.set('studentId', params.studentId);
      const queryStr = q.toString() ? `?${q.toString()}` : '';
      return request<{
        success: boolean;
        classes: ClassRoom[];
        selectedClassId: string;
        students: Array<{ id: string; name: string; seatNumber?: number }>;
        availableTestPapers: Array<{
          id: string;
          title: string;
          textType: string;
          targetGrade: number;
          submittedCount: number;
          createdAt: string;
        }>;
        selectedPreTestId: string | null;
        selectedPostTestId: string | null;
        comparativeData: ComparativeAnalysisData | null;
      }>(`/api/teacher/analytics/comparative${queryStr}`);
    },

    /** 呼叫 AI 生成歷程成長診斷與教學處方 */
    getComparativeAiInsight: (data: ComparativeAnalysisData) =>
      request<{
        success: boolean;
        insight: {
          growthHighlight: string;
          bottleneckAnalysis: string;
          actionPlans: Array<{ title: string; strategy: string }>;
          benchmarkTarget: string;
          generatedAt: string;
        };
      }>('/api/teacher/analytics/comparative/ai-insight', {
        method: 'POST',
        body: JSON.stringify({ data }),
      }),

    /** 批次建立學生帳號 */
    createStudents: (
      classId: string,
      students: Array<{ username: string; displayName: string; seatNumber: number; plainPassword?: string }>,
      gradeLevel?: number
    ) =>
      request<{ success: boolean; message: string; students: any[] }>('/api/teacher/students', {
        method: 'POST',
        body: JSON.stringify({ classId, gradeLevel, students }),
      }),
  },

  // -----------------------------------------------------------------------
  // 學生端 (Student)
  // -----------------------------------------------------------------------
  student: {
    /** 取得指派給我班級的未完成/已完成測驗任務 */
    getAssignedTests: () =>
      request<{ assignedTests: any[] }>('/api/student/assigned-tests'),

    /** 取得學生測驗試卷與作答狀態 */
    getExam: (testPaperId: string, assignmentId?: string) => {
      const q = assignmentId ? `?assignmentId=${encodeURIComponent(assignmentId)}` : '';
      return request<{
        testPaper: TestPaper;
        assignment?: TestAssignment | null;
        alreadySubmitted: boolean;
        allowRetake: boolean;
        isExpired?: boolean;
        submissionId?: string | null;
      }>(`/api/student/exam/${testPaperId}${q}`);
    },

    /** 學生送出線上評量答案卷 */
    submitExam: (payload: {
      testPaperId: string;
      assignmentId?: string;
      rawAnswers: Record<string, any>;
      timeSpentSeconds?: number;
      durationSeconds?: number;
      startedAt?: string;
    }) =>
      request<{ success: boolean; submissionId: string; message?: string }>(
        '/api/student/submit-exam',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      ),

    /** 取得學生個人診斷報告書 */
    getSubmission: (id: string) =>
      request<{
        submission: ExamSubmission;
        testPaper: TestPaper;
      }>(`/api/student/submissions/${id}`),
  },

  // -----------------------------------------------------------------------
  // 管理員端 (Admin)
  // -----------------------------------------------------------------------
  admin: {
    /** 取得全校教師、管理員名單與待審核清單 */
    getTeachers: () =>
      request<{
        pendingTeachers: any[];
        approvedTeachers: any[];
        admins: any[];
        availableTransferTargets: any[];
      }>('/api/admin/teachers'),

    /** 管理員操作（審核、駁回、刪除、角色變更、建立教師、重設密碼） */
    manageTeacher: (payload: {
      action:
        | 'approve'
        | 'reject'
        | 'delete'
        | 'reset_to_pending'
        | 'make_admin'
        | 'revoke_admin'
        | 'create_teacher'
        | 'reset_password'
        | (string & {});
      teacherId?: string;
      transferToTeacherId?: string;
      [key: string]: any;
    }) =>
      request<{ success: boolean; message?: string }>('/api/admin/teachers', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  // -----------------------------------------------------------------------
  // AI 服務 (AI Engine)
  // -----------------------------------------------------------------------
  ai: {
    /** 測試所輸入的 API 金鑰有效性與額度 */
    verifyKey: (payload: {
      provider: string;
      apiKey?: string;
      customBaseUrl?: string;
      model?: string;
    }) =>
      request<{ ok: boolean; message: string }>('/api/ai/verify-key', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    /** 人機協同命題：非同步生成 PIRLS 四層次考卷 */
    generateTest: (payload: any) =>
      request<{ testPaper: TestPaper }>('/api/ai/generate-test', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  // -----------------------------------------------------------------------
  // 認證 (Auth)
  // -----------------------------------------------------------------------
  auth: {
    /** 帳密登入 */
    login: (credentials: { username: string; password: string; role?: string }) =>
      request<{ success: boolean; user: User; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),

    /** 教師註冊 */
    register: (payload: { username: string; password: string; name: string }) =>
      request<{ success: boolean; message?: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    /** 登出 */
    logout: () =>
      request<{ success: boolean }>('/api/auth/logout', {
        method: 'POST',
      }),

    /** 驗證當前 Session 使用者 */
    getMe: () =>
      request<{ user: User }>('/api/auth/me'),

    /** 取得學生登入用之班級選單 */
    getClassDirectory: () =>
      request<{ classes: Array<{ id: string; name: string; gradeLevel: number }> }>(
        '/api/auth/class-directory'
      ),
  },
};

export default api;
