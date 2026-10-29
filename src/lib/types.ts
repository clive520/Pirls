export type UserRole = 'admin' | 'teacher' | 'student';
export type UserStatus = 'active' | 'pending' | 'suspended';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  school?: string;
  teacherId?: string; // 學生歸屬的教師 ID
  classId?: string;   // 學生歸屬的班級 ID
  className?: string; // 班級名稱 (e.g. 四年甲班)
  seatNumber?: number; // 座號
  gradeLevel?: number; // 3-6 年級
  initialPassword?: string; // 學生初始或重設之明碼（供教師備忘與列印帳密卡片）
  createdAt: string;
}

export interface ClassRoom {
  id: string;
  name: string;
  gradeLevel: number;
  teacherId: string;
  studentCount: number;
  createdAt: string;
}

export interface AuthSession {
  userId: string;
  username: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  classId?: string;
  className?: string;
  gradeLevel?: number;
}

/* ==========================================================
   PIRLS 題本、題目與給分規準型別規格 (對齊真實考古題)
   ========================================================== */

export type CognitiveProcess = 'retrieve' | 'inference' | 'interpret' | 'evaluate';
export type QuestionType = 'multiple_choice' | 'constructed_response';
export type QuestionSubtype = 
  | 'single_choice'    // 一般文字選擇題
  | 'picture_choice'   // 圖片選項選擇題（如《屋頂上的花》農舍題）
  | 'single_cr'        // 單一問答題 (1分)
  | 'list_cr'          // 並列列舉題 (2分，1.____ 2.____)
  | 'table_cr'         // 資訊矩陣表格填空 (3分)
  | 'deep_cr';         // 跨情節因果心態轉變申論 (3分)

export interface MultipleChoiceOption {
  label: 'A' | 'B' | 'C' | 'D';
  text: string;
  imageUrl?: string; // 選項圖片
  isCorrect: boolean;
  explanation: string;
}

export interface RubricCriteria {
  score: number; // 0, 1, 2, 3
  code: string;  // IEA 官方雙位數代碼: '30'/'20'/'10' 滿分, '21'/'11' 部分得分, '79' 未得分, '99' 空白
  description: string;
  keyEvidenceNeeded: string[];
}

export interface QuestionRubric {
  maxScore: number;
  criteria: RubricCriteria[];
  sampleFullCreditAnswer: string;
  samplePartialCreditAnswer?: string;
}

export interface TestQuestion {
  id: string;
  questionNumber: number;
  processLevel: CognitiveProcess;
  processLevelNumber: 1 | 2 | 3 | 4;
  type: QuestionType;
  subtype?: QuestionSubtype;
  prompt: string;
  thumbnailUrl?: string; // 題幹情境小插圖截圖 (如江婆婆微笑頭像)
  points: number;
  options?: MultipleChoiceOption[];
  correctAnswerLabel?: string;
  rubric?: QuestionRubric;
}

export interface ArticleIllustration {
  id: string;
  paragraphNumber: number;
  caption: string;
  type: 'svg_diagram' | 'illustration_url';
  svgCode?: string; // 支援內建渲染之 SVG 流程圖/循環圖
  imageUrl?: string;
}

export interface TestPaper {
  id: string;
  title: string;
  targetGrade: number; // 3-6
  textType: 'literary' | 'informational';
  themeSummary: string;
  wordCount: number;
  articleContent: string;
  paragraphs: Array<{ paragraphNumber: number; text: string }>;
  illustrations?: ArticleIllustration[];
  questions: TestQuestion[];
  totalPoints: number;
  creatorId: string;
  creatorName: string;
  isPublic: boolean;
  examCode?: string; // 班級測驗安全代碼/密碼 (若為空則不設限)
  dueDate?: string; // 測驗截止時間 (可選)
  assignedClassIds?: string[];
  timeLimitMinutes: number; // 0 為不限時
  createdAt: string;
  updatedAt: string;
}

/* ==========================================================
   學生作答、AI 批改與診斷紀錄型別規格
   ========================================================== */

export interface StudentAnswer {
  questionId: string;
  questionNumber: number;
  type: QuestionType;
  processLevel: CognitiveProcess;
  processLevelNumber: 1 | 2 | 3 | 4;
  points: number;
  studentAnswer: string; // 選擇題選項 (如 'B') 或 簡答題文字
  score: number;
  maxScore: number;
  isCorrect?: boolean;
  code?: string; // IEA 代碼 (如 '20', '11', '79')
  aiFeedback?: {
    strength: string;
    weakness: string;
    scaffoldingTip: string;
    evidenceFound: boolean;
    evidenceDetails: string[];
  };
  // 教師手動閱卷與改分擴充
  isTeacherReviewed?: boolean;
  teacherScore?: number;
  teacherComment?: string;
  originalScore?: number; // 保留 AI 初評之原始分數
  // AI 深度再閱擴充
  aiRegraded?: boolean;
  aiRegradeSuggestion?: {
    suggestedScore: number;
    reason: string;
    evidenceFound: string[];
    improvedFeedback?: string;
  };
}

export interface ProcessScoreDetail {
  earned: number;
  total: number;
  percentage: number;
}

export type BenchmarkKey = 'advanced' | 'high' | 'intermediate' | 'low' | 'below_low';

export interface PIRLSBenchmarkInfo {
  key: BenchmarkKey;
  name: string;
  enName: string;
  minScore: number;
  maxScore: number;
  badgeColor: string;
  badgeTextColor: string;
  description: string;
  instructionalFocus: string;
}

export interface ExamSubmission {
  id: string;
  testPaperId: string;
  testPaperTitle: string;
  targetGrade: number;
  textType: 'literary' | 'informational';
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  seatNumber?: number;
  totalScore: number;
  maxScore: number;
  percentage: number;
  scaleScore?: number; // PIRLS 國際量尺估計分 (250 ~ 750，平均數 500、標準差 100)
  benchmarkKey?: BenchmarkKey;
  benchmarkName?: string;
  benchmarkDescription?: string;
  classPR?: number; // 班級同儕百分等級 (1 ~ 99)
  normPR?: number; // 國際/同年級常模百分等級 (1 ~ 99)
  processScores: {
    level1: ProcessScoreDetail; // 直接提取
    level2: ProcessScoreDetail; // 直接推論
    level3: ProcessScoreDetail; // 詮釋整合
    level4: ProcessScoreDetail; // 檢驗評估
  };
  answers: StudentAnswer[];
  submittedAt: string;
  // 教師手動複閱與整體評估註記
  isTeacherReviewed?: boolean;
  reviewedAt?: string;
  reviewedBy?: string;
  teacherGeneralNote?: string;
}
