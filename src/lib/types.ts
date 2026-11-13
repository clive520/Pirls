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
  teacherId: string; // 主責導師 / 建立者 ID
  coTeacherIds?: string[]; // 共同管理該班級的教師 IDs
  studentCount: number;
  createdAt: string;
  // 前端檢視輔助屬性
  isOwner?: boolean; // 當前登入教師是否為該班主責建立者
  isCoTeacher?: boolean; // 當前登入教師是否為受邀協同教師
  primaryTeacherName?: string; // 主責導師顯示名稱
  coTeacherNames?: string[]; // 協同教師顯示名稱清單
}

export interface CoTeacherMember {
  id: string;
  displayName: string;
  username: string;
  school?: string;
  role: UserRole;
  isOwner?: boolean;
}

export interface ClassCoTeachersData {
  classId: string;
  className: string;
  gradeLevel: number;
  owner: CoTeacherMember;
  coTeachers: CoTeacherMember[];
  availableTeachers: CoTeacherMember[];
  isOwner: boolean;
  isCoTeacher: boolean;
}

export interface AuthSession {
  userId: string;
  username: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  classId?: string;
  className?: string;
  seatNumber?: number;
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
  imagePrompt?: string; // 供教師複製至 Midjourney / DALL-E / 繪圖 AI 的精準生圖提示詞
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
  allowRetake?: boolean; // 是否允許多次作答（false: 僅限一次作答，true: 允許多次作答；預設為 true）
  createdAt: string;
  updatedAt: string;
}

/* ==========================================================
   PIRLS 獨立指派事件 (TestAssignment) 型別規格
   ========================================================== */

export interface TestAssignment {
  id: string;               // 唯一指派事件 ID (如 asgn_1794...)
  testPaperId: string;      // 關聯的文章試卷 ID
  testPaperTitle: string;   // 試卷原始標題
  teacherId: string;        // 發起指派的教師 ID
  teacherName: string;      // 發起指派的教師姓名
  classId: string;          // 指派目標班級 ID
  className: string;        // 班級名稱 (如 四年甲班)
  gradeLevel: number;       // 年級 (3-6)
  
  // 任務標題 (自動格式化: 《標題》(張老師 11/07 派卷)，亦支援自訂)
  assignmentTitle: string;

  // 評量模式與安全代碼 (獨立於試卷本身)
  allowRetake: boolean;     // false: 僅限作答一次, true: 允許多次練習
  examCode?: string;        // 專屬安全代碼 (選填)

  // 測驗有效期限機制 (核心新增)
  deadlineType: 'unlimited' | 'scheduled'; // 'unlimited' (無限期) | 'scheduled' (指定截止時間)
  dueDate: string | null;   // ISO 日期時間字串 (如 2026-11-15T17:00:00.000Z)，無限期時為 null

  status: 'active' | 'closed'; // active (進行中) | closed (已截止/教師手動提早關閉)
  
  // 期限延長時之重測設定
  allowRetakeOnExtend?: boolean;

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

export type ReviewStatus = 'unreviewed' | 'ai_reviewed' | 'teacher_reviewed';

export interface ExamSubmission {
  id: string;
  assignmentId?: string; // 關聯的獨立指派事件 ID
  isPractice?: boolean; // 是否為自主練習提交
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
  classAvgScaleScore?: number; // 班級平均國際量尺分數
  classAvgScore?: number; // 班級平均原始得分
  classProcessScores?: {
    level1: ProcessScoreDetail;
    level2: ProcessScoreDetail;
    level3: ProcessScoreDetail;
    level4: ProcessScoreDetail;
  };
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
  // 作答時間記錄
  startedAt?: string; // 學生進入測驗開始作答時間 ISO
  durationSeconds?: number; // 學生作答總耗時 (秒)
  // 複閱三態管理 ('unreviewed' 未複閱 | 'ai_reviewed' AI 複閱 | 'teacher_reviewed' 老師複閱)
  reviewStatus?: ReviewStatus;
  reviewedByRole?: 'ai' | 'teacher'; // 審核角色
  aiReviewedAt?: string; // AI 完成自動再閱卷時間 ISO
  // 教師手動複閱與整體評估註記
  isTeacherReviewed?: boolean;
  reviewedAt?: string;
  reviewedBy?: string;
  teacherGeneralNote?: string;
  aiPedagogicalAdvice?: AiPedagogicalAdvice;
}

export interface QuestionMirrorInsight {
  questionNumber: number;
  prompt: string; // 題目題幹
  studentAnswer: string; // 學生當時作答
  clueFromArticle: string; // 課文隱藏的秘密線索 (課文段落/情節)
  howToImprove: string; // 下次這樣寫就能拿滿分 (具體示範與補強指引)
}

export interface StudentThinkingProfile {
  superpower: {
    title: string; // 例如：「細節神探」
    description: string; // 肯定孩子的閱讀亮點
  };
  unlockingSkill: {
    title: string; // 例如：「心境翻譯官」
    description: string; // 指引正在解鎖的高階思維技能
  };
}

export interface AiPedagogicalAdvice {
  thinkingProfile?: StudentThinkingProfile; // 思維風格與超能力標籤
  questionMirrors?: QuestionMirrorInsight[]; // 錯題鏡像對照（真實原答 vs 文章關鍵線索 vs 升級示範）
  tacticsTips?: string[]; // 答題通關小祕技（口訣式/具體操作法）
  microAction?: string; // 本週閱讀微任務
  levelAnalysis: string; // 各層次思維能力落點綜合解析
  improvementSuggestions: string[]; // 給學生的閱讀具體改進建議事項 (舊版相容)
  actionPlan?: string; // 具體行動計畫
  teacherFeedbackDraft?: string; // 導師親筆講評草稿
  isAiGenerated?: boolean; // 是否由大語言模型即時生成
  generatedAt?: string;
}

/* ==========================================================
   PIRLS 前後測歷程對照分析型別 (Longitudinal Pre/Post Analysis)
   ========================================================== */

export interface LevelComparisonItem {
  level: 'level1' | 'level2' | 'level3' | 'level4';
  name: string;
  shortName: string;
  prePercentage: number;
  postPercentage: number;
  deltaPercentage: number;
  preEarned?: number;
  preTotal?: number;
  postEarned?: number;
  postTotal?: number;
  description: string;
}

export interface StudentComparativeItem {
  studentId: string;
  studentName: string;
  seatNumber?: number;
  hasBoth: boolean;
  preScore?: number;
  postScore?: number;
  preMaxScore?: number;
  postMaxScore?: number;
  scoreDelta?: number;
  preScaleScore?: number;
  postScaleScore?: number;
  scaleScoreDelta?: number;
  l1Delta?: number;
  l2Delta?: number;
  l3Delta?: number;
  l4Delta?: number;
}

export interface ComparativeAnalysisData {
  scope: 'class' | 'student';
  classId: string;
  className: string;
  studentId?: string;
  studentName?: string;
  preTest: {
    id: string;
    title: string;
    submittedCount: number;
    avgScore: number;
    maxScore: number;
    scaleScore: number;
    benchmarkName: string;
  };
  postTest: {
    id: string;
    title: string;
    submittedCount: number;
    avgScore: number;
    maxScore: number;
    scaleScore: number;
    benchmarkName: string;
  };
  scaleScoreDelta: number;
  levels: {
    level1: LevelComparisonItem;
    level2: LevelComparisonItem;
    level3: LevelComparisonItem;
    level4: LevelComparisonItem;
  };
  mostImprovedLevel: 'level1' | 'level2' | 'level3' | 'level4';
  needsFocusLevel: 'level1' | 'level2' | 'level3' | 'level4';
  pairedStudentsCount: number;
  studentComparisons: StudentComparativeItem[];
}
