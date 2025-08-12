# PRD: Claude Report - Claude Code 대화 분석 도구

## 📋 **프로젝트 개요**

### **프로젝트명**

`claude-report-analyzer` (NPM 패키지명)

### **목적**

Claude Code 프로젝트의 대화 세션을 자동으로 분석하고 요약하여 웹 대시보드를 통해 시각화하는 도구

### **대상 사용자**

- Claude Code를 로컬에 설치하여 사용하는 개발자
- Claude Code 프로젝트의 진행 상황을 추적하고 싶은 사용자
- 팀 단위로 Claude Code 사용 현황을 모니터링하려는 조직

### **핵심 가치**

- Claude Code 프로젝트의 대화 기록을 구조화된 형태로 분석
- 날짜별/프로젝트별 진행 상황을 한눈에 파악
- 자동화된 분석을 통한 시간 절약
- 개발 생산성 향상을 위한 인사이트 제공
- **실시간 분석 진행률 확인**
- **세션별 즉시 리포트 생성으로 빠른 결과 확인**
- **토큰 사용량 최적화를 위한 개별 날짜 분석**

## 🎯 **구현 현황**

### **구현 완료 기능**

1. **프로젝트 스캔 및 목록 표시** ✅
   - Claude 프로젝트 자동 감지
   - 프로젝트별 세션 수 및 분석 상태 표시
   - 분석되지 않은 프로젝트도 정상 표시

2. **AI 기반 세션 분석** ✅
   - Claude API를 통한 자동 대화 분석
   - 제목, 요약, 주요 인사이트 추출
   - 기술 스택 및 코드 품질 분석
   - 타임라인 기반 진행 상황 정리
   - 중복 분석 방지 메커니즘

3. **날짜별 분석 시스템** ✅
   - 캘린더 UI로 날짜별 세션 확인
   - 특정 날짜만 선택적 분석 가능
   - 분석 대기 세션 수 실시간 표시
   - 날짜별 그룹화 및 필터링

4. **실시간 리포트 생성** ✅
   - 세션별 개별 분석 및 즉시 저장
   - 전체 분석 완료 전에도 결과 확인 가능
   - 기존 리포트에 새 세션 추가 기능
   - 분석 진행률 실시간 업데이트

5. **향상된 UX** ✅
   - 분석 대기 세션 섹션 추가
   - 캘린더에서 날짜 클릭 시 즉시 리포트 표시
   - 세션별 분석 진행률 표시 (프로그레스 바)
   - 마크다운 렌더링 및 코드 하이라이팅
   - 즉각적인 UI 피드백 (로딩 애니메이션, 토스트 알림)
   - 3초마다 상태 업데이트로 빠른 반응성
   - 프로젝트 목록에서 분석 대기 세션 수 뱃지 표시
   - 분석 중인 날짜 시각적 구분 (파란색 배경)
   - 새로고침 버튼 추가
   - AIAnalysisPanel 컴포넌트를 통한 개별 세션 AI 분석

6. **에러 처리 및 안정성** ✅
   - JSON 파싱 오류 해결 (다양한 형식 지원)
   - URL 인코딩/디코딩 문제 해결
   - 안전한 JSON 직렬화
   - 분석 실패 시 개별 세션 건너뛰기
   - 메타데이터 없는 프로젝트 처리

## 🏗️ **기술 스택**

### **백엔드/CLI**

- **언어**: Node.js + TypeScript
- **패키지 관리**: NPM
- **CLI 프레임워크**: Commander.js
- **파일 시스템**: Node.js fs/promises
- **JSON 처리**: 안전한 직렬화 함수 구현
- **AI 분석**: Anthropic Claude API
- **웹 서버**: Express.js
- **CORS**: cors 미들웨어
- **로깅**: console 및 파일 기반 디버깅

### **프론트엔드**

- **프레임워크**: React 19 + TypeScript
- **빌드 도구**: Vite
- **스타일링**: Tailwind CSS
- **마크다운 렌더링**: react-markdown + remark-gfm
- **코드 하이라이팅**: react-syntax-highlighter
- **라우팅**: React Router DOM
- **상태 관리**: React Context API
- **아이콘**: Lucide React
- **날짜 관리**: 커스텀 캘린더 컴포넌트
- **토스트 알림**: react-hot-toast
- **클래스명 유틸**: clsx + tailwind-merge

### **데이터 저장**

- **형태**: JSON 파일 기반
- **위치**: `reports/projects/` 디렉토리
- **구조**: 프로젝트별 > 날짜별 리포트

## 📁 **프로젝트 구조**

```
claude-report/
├── package.json
├── tsconfig.json
├── tsconfig.cli.json
├── README.md
├── CLAUDE.md                     # 프로젝트 명세서
├── .env                          # 환경 변수 설정
├── tests/                        # 테스트 파일
│   ├── README.md
│   ├── mini-ai-test.ts          # AI 분석 테스트
│   ├── mini-test.jsonl          # 테스트용 세션 파일
│   └── test-mini-project/       # 테스트 프로젝트
├── src/
│   ├── cli/
│   │   ├── index.ts              # CLI 진입점
│   │   ├── commands/
│   │   │   ├── init.ts           # 초기화 명령어
│   │   │   ├── scan.ts           # 스캔 명령어 (AI 분석 기본 활성화)
│   │   │   └── dashboard.ts      # 대시보드 실행 (API 서버 + Vite 동시 실행)
│   │   └── utils/
│   │       ├── config.ts         # 설정 관리
│   │       ├── scanner.ts        # 프로젝트 스캔
│   │       ├── analyzer.ts       # 대화 분석 (개별 세션 분석)
│   │       ├── sessionAnalyzer.ts # 세션 파싱 (Claude Desktop JSONL 완벽 지원)
│   │       └── claudeApi.ts      # Claude API 연동
│   ├── server/
│   │   └── index.ts              # Express 서버
│   ├── web/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── components/
│   │   │   ├── ProjectList.tsx       # 프로젝트 목록
│   │   │   ├── ProjectDetail.tsx     # 프로젝트 상세 (개선됨)
│   │   │   ├── SessionCalendar.tsx   # 캘린더 컴포넌트
│   │   │   ├── ReportList.tsx        # 리포트 목록
│   │   │   ├── ReportViewer.tsx      # 마크다운 렌더러
│   │   │   └── AIAnalysisPanel.tsx   # AI 분석 전용 패널
│   │   ├── contexts/
│   │   │   └── AnalysisContext.tsx   # 분석 상태 관리 (서버 기반)
│   │   ├── lib/
│   │   │   └── utils.ts              # Tailwind 유틸리티
│   │   ├── utils/
│   │   │   └── api.ts                # API 클라이언트
│   │   └── types/
│   │       └── index.ts              # 타입 정의
│   └── shared/
│       ├── types.ts                  # 공통 타입
│       └── utils.ts                  # 공통 유틸리티
├── public/
├── dist/                             # 빌드 결과물
└── reports/                          # 분석 리포트 저장
    └── projects/
        └── [project-name]/
            ├── metadata.json
            └── reports/
                └── YYYY-MM-DD.json
```

## 🔧 **핵심 기능 상세**

### **1. 프로젝트 초기화 및 설정**

#### **환경 변수 (.env)**
```
CLAUDE_PROJECTS_PATH=/Users/[username]/.claude/projects
```

#### **Claude 프로젝트 경로**
- 기본 경로: `~/.claude/projects`
- 프로젝트명 형식: `-Users-username-path-to-project`

### **2. 세션 파일 파싱**

#### **지원 형식**
- **JSONL 형식** (Claude Desktop/Code 기본 형식)
- 각 라인이 독립적인 JSON 객체
- `type` 필드로 메시지 타입 구분

#### **메시지 타입**
- `user`: 사용자 입력
- `assistant`: Claude 응답
- `system`: 시스템 초기화
- `result`: 세션 결과
- `thinking`: Claude 내부 추론
- `summary`: 세션 요약

#### **세션 파싱 구현**
```typescript
// Claude Desktop/Code 공식 타입 정의 (완벽 지원)
interface BaseMessage {
  type: 'user' | 'assistant' | 'system' | 'result' | 'thinking' | 'summary';
  session_id?: string;
  sessionId?: string; // 기존 호환성
  timestamp?: string;
  parentUuid?: string;
  uuid?: string;
  content?: Array<{
    type: 'text' | 'tool_use' | 'tool_result';
    text?: string;
    name?: string;
    id?: string;
    input?: any;
    output?: any;
  }>;
}
```

### **3. AI 분석 시스템**

#### **분석 프로세스**
1. 세션 파일을 파싱하여 대화 내용 추출
2. Claude API로 전체 대화 내용 분석
3. 개별 세션 분석 후 즉시 리포트 저장
4. 서버 메모리에 분석 상태 관리

#### **AI 분석 응답 구조**
```typescript
interface ClaudeAnalysisResponse {
  title: string;
  summary: string;
  keyInsights: string[];
  technicalDetails: {
    languages: string[];
    frameworks: string[];
  };
  codeQuality: {
    strengths: string[];
    improvements: string[];
  };
  timeline: {
    mainTasks: string[];
    completedGoals: string[];
    challenges: string[];
  };
}
```

### **4. 날짜별 분석 시스템**

**주요 개선사항:**
- 개별 세션 분석 방식으로 변경
- 각 세션 완료 시 즉시 리포트 저장
- 실시간 진행률 업데이트
- 토큰 절약을 위해 전체 분석 버튼 제거

### **5. 분석 상태 관리**

```typescript
interface AnalysisStatus {
  projectId: string;
  status: 'analyzing' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  error?: string;
  progress?: {
    current: number;
    total: number;
    message: string;
  };
}

// 서버 메모리 기반 상태 저장
const analysisStore = new Map<string, AnalysisStatus>();

// 날짜별 분석 키: `${projectId}:${date}`
// 프로젝트별 분석 키: `${projectId}`
```

## 💡 **UX 개선사항**

### **1. 즉각적인 피드백**
- 분석 버튼 클릭 시 즉시 로딩 상태 표시
- 클릭된 날짜 추적으로 중복 클릭 방지
- 토스트 알림으로 진행 상태 실시간 전달

### **2. 시각적 구분**
- 분석 중: 파란색 배경 + 애니메이션
- 분석 완료: 녹색 체크 아이콘
- 분석 대기: 노란색 별 아이콘 + 세션 수
- 프로젝트 카드: 새 세션 있으면 노란색 강조

### **3. 성능 최적화**
- 3초마다 상태 폴링 (기존 10초)
- 개별 세션 분석으로 빠른 결과 확인
- 날짜별 선택적 분석으로 토큰 절약

### **4. 사용성 개선**
- 새로고침 버튼으로 수동 업데이트
- 버튼 호버 시 도움말 표시
- 프로젝트 목록에서 바로 분석 대기 수 확인
- 캘린더 뷰와 리스트 뷰 전환 가능

## 🚨 **에러 처리 및 안전장치**

### **에러 시나리오**

1. Claude 프로젝트 폴더 접근 불가
2. 세션 파일 읽기 실패
3. Claude Code API 호출 실패
4. JSON 파싱 에러
5. 웹 서버 실행 실패
6. **객체 직렬화 문제**: 분석 결과에서 `[object Object]`로 표시되는 문제
   - 원인: JSON.stringify 시 순환 참조 또는 특수 객체 처리 실패
   - 해결: 안전한 직렬화 함수 구현, 객체 타입 검증
7. **URL 인코딩 문제**: 특수 문자가 포함된 프로젝트 ID
   - 원인: URL 경로에 특수 문자 포함
   - 해결: encodeURIComponent/decodeURIComponent 사용

### **최근 수정사항**

1. **타입 에러 수정**
   - `ProjectMetadata` 인터페이스에 선택적 필드 추가
   - `unanalyzedCount` 타입 가드 추가
   - 이벤트 핸들러 타입 문제 해결

2. **리포트 개수 정확성 개선**
   - 실제 리포트 파일 개수를 확인하여 `totalReports` 업데이트
   - 메타데이터 로드 시 리포트 디렉토리 스캔
   - 중복 카운트 방지

### **에러 처리 방식**

- 명확한 에러 메시지 표시
- 자동 재시도 (최대 3회)
- Graceful degradation
- 로그 파일 생성 (`analyzer-debug.log`, `api-debug.log`)
- **안전한 JSON 직렬화 유틸리티**:
  ```typescript
  function safeStringify(obj: any): string {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
      }
      return value;
    }, 2);
  }
  ```

## 📋 **CLI 명령어 정의**

```bash
# 대시보드 실행
npm run claude-report dashboard
npm run claude-report dashboard -- -p 3001
npm run claude-report dashboard -- --api-port 3002  # API 포트 지정

# 프로젝트 스캔
npm run claude-report scan --project [project-name]
npm run claude-report scan --project [project-name] --no-ai  # AI 분석 비활성화
npm run claude-report scan --limit 20  # 세션 수 제한 (기본값: 10)

# 개발 모드
npm run dev      # CLI 개발 모드
npx tsx src/server/index.ts  # 서버 실행
npx vite        # 웹 개발 서버

# 빌드
npm run build:cli
npm run build:web
```

## 📡 **API 엔드포인트**

### **1. 프로젝트 목록 (GET /api/projects)**
모든 Claude 프로젝트 목록과 각 프로젝트의 분석 대기 세션 수 반환

### **2. 프로젝트 상세 (GET /api/projects/:id)**
특정 프로젝트의 메타데이터와 날짜별 리포트 목록 반환

### **3. 세션 목록 (GET /api/projects/:id/sessions)**
프로젝트의 모든 세션을 날짜별로 그룹화하여 반환

### **4. 날짜별 분석 (POST /api/projects/:id/analyze-by-date)**
특정 날짜의 세션들을 개별적으로 분석하고 즉시 저장

### **5. 분석 상태 (GET /api/analysis-status)**
모든 진행 중인 분석 상태 반환 (3초마다 폴링)

## 🔧 **설치 및 실행**

### **1. 설치**
```bash
git clone https://github.com/yourusername/claude-report.git
cd claude-report
npm install
```

### **2. 환경 설정**
```bash
# .env 파일 생성
echo "CLAUDE_PROJECTS_PATH=/Users/$(whoami)/.claude/projects" > .env
```

### **3. 실행**
```bash
# 대시보드 실행
npm run claude-report dashboard

# CLI로 프로젝트 스캔
npm run claude-report scan --project [project-name] --ai
```

### **4. 빌드**
```bash
# 전체 빌드
npm run build

# CLI만 빌드
npm run build:cli

# 웹만 빌드
npm run build:web
```

### **5. 테스트**
```bash
# AI 분석 테스트
npx tsx tests/mini-ai-test.ts

# 테스트 프로젝트로 분석 테스트
CLAUDE_PROJECTS_PATH="./tests/test-mini-project" npm run claude-report scan --project test-mini-project --ai
```

## ✅ **품질 보증**

### **코드 품질**
- TypeScript 전체 적용
- 타입 안정성 보장
- 에러 처리 구현
- 디버깅 로그 시스템

### **성능**
- 대용량 세션 파일 처리 가능
- 스트리밍 방식 JSON 파싱
- 비동기 처리로 UI 반응성 유지
- 개별 세션 분석으로 빠른 결과 확인

### **사용성**
- 직관적인 UI/UX
- 실시간 진행률 표시
- 반응형 디자인
- 마크다운 렌더링 지원

### **안정성**
- 중복 분석 방지
- 에러 발생 시 개별 세션 건너뛰기
- 안전한 JSON 직렬화
- URL 인코딩 처리

## 🚀 **향후 개선 계획**

### **단기 과제**
- 배치 분석 성능 최적화
- 분석 결과 캐싱
- 오프라인 모드 지원
- WebSocket 기반 실시간 업데이트

### **장기 과제**
- 팀 협업 기능
- 분석 리포트 내보내기 (PDF, Markdown)
- 커스텀 분석 규칙 설정
- 통계 대시보드 고도화
- VS Code 확장 프로그램

## 📝 **개발 가이드**

### **프로젝트 설정**
1. 저장소 클론
2. `npm install` 실행
3. `.env` 파일 생성 및 경로 설정
4. `npm run build:cli` 실행

### **개발 서버 실행**
1. 터미널 1: `npx tsx src/server/index.ts` (API 서버)
2. 터미널 2: `npx vite --root src/web` (웹 개발 서버)
3. 브라우저에서 `http://localhost:5173` 접속

### **디버깅**
- `analyzer-debug.log`: 세션 분석 상세 로그
- `api-debug.log`: API 서버 로그
- 브라우저 콘솔에서 API 호출 확인

### **주의사항**
- Claude API 키는 환경변수로 관리
- 대용량 세션 분석 시 API 제한 확인
- 프로젝트 경로에 특수문자 포함 시 인코딩 필요
- 서버 실행 시 포트 충돌 확인 (3000, 3001)

---

이 도구는 Claude Code 사용자의 생산성 향상을 위해 지속적으로 개선되고 있습니다.

## 📊 **기술적 세부사항**

### **세션 분석 플로우**
```
1. 세션 파일 감지 (JSONL)
   ↓
2. 타임스탬프 기반 날짜 추출
   ↓
3. 중복 체크 (analyzedSessions)
   ↓
4. Claude API 호출
   ↓
5. 결과 즉시 저장
   ↓
6. UI 실시간 업데이트
```

### **주요 해결 과제**
1. **JSONL 파싱**: 라인별 독립 파싱으로 대용량 파일 처리
2. **중복 방지**: 세션 ID 기반 분석 이력 관리
3. **실시간 진행률**: 서버 메모리 기반 상태 관리
4. **토큰 최적화**: 날짜별 선택적 분석, 전체 분석 버튼 제거
5. **에러 복구**: 개별 세션 실패 시 전체 프로세스 계속 진행
6. **리포트 개수 정확성**: 실제 파일 개수 기반으로 카운트 동기화
7. **프로젝트 상태별 UI**: 분석 완료/대기/미분석 상태별 시각적 구분

## 🎨 **최신 UI 개선사항** (2025-08-12 업데이트)

### **프로젝트 목록 상태 표시 개선**

#### **문제점**
- 분석 완료된 프로젝트의 UI가 명확하지 않아 상태 구분이 어려움
- 모든 프로젝트가 동일한 스타일로 표시되어 시각적 피드백 부족

#### **해결책**
1. **3가지 프로젝트 상태별 UI 구분**
   ```typescript
   // 분석 필요 (노란색 테마)
   hasUnanalyzed && "border-yellow-200 bg-yellow-50/50"
   
   // 분석 완료 (부드러운 파란색 테마)
   isCompletelyAnalyzed && "border-blue-200 bg-blue-50/30"
   
   // 미분석 (기본 테마)
   default styling
   ```

2. **상태별 뱃지 시스템**
   - **분석 필요**: `노란색 뱃지 + Sparkles 아이콘 + "분석 필요"`
   - **분석 완료**: `부드러운 파란색 뱃지 + CheckCircle 아이콘 + "분석 완료"`
   - **미분석**: `회색 뱃지 + Clock 아이콘 + "미분석"`

3. **우측 상단 인디케이터**
   - **분석 필요**: 노란색 원형 뱃지 (애니메이션)
   - **분석 완료**: 파란색 원형 뱃지 (체크 아이콘)

4. **폴더 아이콘 색상 구분**
   - **분석 필요**: `bg-yellow-100 text-yellow-600`
   - **분석 완료**: `bg-blue-100 text-blue-600`
   - **기본**: `bg-primary/10 text-primary`

5. **버튼 텍스트 및 색상**
   - **분석 필요**: "분석하기" (노란색 배경)
   - **분석 완료**: "리포트 보기" (파란색 배경)
   - **기본**: "프로젝트 상세 보기" (파란색 배경)

#### **개선된 사용자 경험**
- 프로젝트 상태를 한눈에 파악 가능
- 분석이 필요한 프로젝트 우선순위 명확화
- 완료된 프로젝트에 대한 성취감 제공
- 일관된 색상 시스템으로 직관적 인터페이스

#### **기술 구현**
```typescript
const hasUnanalyzed = project.unanalyzedCount && project.unanalyzedCount > 0;
const hasReports = project.totalReports > 0;
const isCompletelyAnalyzed = hasReports && !hasUnanalyzed;
```

#### **추가 수정사항** (2025-08-11 오후)

**색상 조정**:
- **기존 문제**: 초록색이 너무 강해서 눈이 아픔
- **해결**: 초록색을 부드러운 파란색으로 변경 (`green-*` → `blue-*`)
- **결과**: 더 부드러운 시각적 경험 제공

**숫자 표시 오류 수정**:
- **기존 문제**: `unanalyzedCount`가 0일 때도 표시되는 문제
- **해결**: 조건문 개선 `(project.unanalyzedCount ?? 0) > 0`
- **결과**: 0개 세션일 때 불필요한 숫자 표시 제거

**기술 구현**:
```typescript
const hasUnanalyzed = (project.unanalyzedCount ?? 0) > 0;
const hasReports = project.totalReports > 0;
const isCompletelyAnalyzed = hasReports && !hasUnanalyzed;
```

이러한 개선으로 사용자가 프로젝트의 분석 상태를 직관적이고 편안하게 파악하고, 적절한 액션을 취할 수 있도록 안내합니다.

## 🔄 **최신 업데이트 내역** (2025-08-12)

### **주요 변경사항**

1. **NPM 패키지명 변경**
   - 변경: `claude-report` → `claude-report-analyzer`
   - package.json의 실제 패키지명 반영

2. **React 버전 업그레이드**
   - React 18 → React 19
   - 최신 React 기능 활용

3. **CLI 명령어 개선**
   - `dashboard` 명령어: API 서버와 Vite 서버 동시 실행
   - `scan` 명령어: AI 분석 기본 활성화 (--no-ai로 비활성화 가능)
   - 세션 제한 기본값: 10개

4. **새로운 컴포넌트**
   - `AIAnalysisPanel.tsx`: 개별 세션에 대한 AI 분석 UI 제공
   - 분석 결과를 시각적으로 표시 (인사이트, 코드 품질, 타임라인)

5. **세션 파싱 개선**
   - Claude Desktop/Code JSONL 형식 완벽 지원
   - tool_use, tool_result 등 복잡한 content 구조 처리

6. **개발 환경 설정**
   - Vite 루트 디렉토리: `src/web`
   - 개발 서버 포트: 5173 (Vite 기본값)

### **호환성 및 안정성**
- Claude Desktop/Code의 모든 메시지 타입 지원
- 안전한 JSON 직렬화로 순환 참조 문제 해결
- URL 인코딩/디코딩으로 특수 문자 경로 처리