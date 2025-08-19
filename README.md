# Claude Report Analyzer

Claude Code 프로젝트의 대화 세션을 자동으로 분석하고 웹 대시보드로 시각화하는 도구입니다.

## 🚀 빠른 시작

### 가장 쉬운 방법: 원클릭 실행 ⭐

```bash
# 한 줄로 모든 것을 실행 (프로젝트 생성 + 설치 + 대시보드 실행)
npx claude-report-analyzer start

# 또는 프로젝트 이름 지정
npx claude-report-analyzer start my-project
```
- 자동으로 프로젝트 생성, 의존성 설치, 대시보드 실행
- `Ctrl+C`로 종료

### 방법 1: 대화형 프로젝트 생성

```bash
# 프로젝트 생성 (자동 설치 + 실행 옵션)
npx claude-report-analyzer create my-analyzer
# → 의존성 자동 설치
# → "Start dashboard now? (Y/n)" 질문에 Y 입력
# → 대시보드 자동 실행
```

### 방법 2: 수동 실행

```bash
# 현재 디렉토리에서 대시보드 실행
npx claude-report-analyzer dashboard

# 프로젝트 스캔 및 분석
npx claude-report-analyzer scan --project [project-name]
```

### 전역 설치

```bash
# npm으로 설치
npm install -g claude-report-analyzer

# 실행
claude-report dashboard
claude-report scan --project [project-name]
```

## 📋 사전 요구사항

- Node.js 18.0.0 이상
- Claude CLI가 설치되어 있어야 함 (`npm install -g @anthropic-ai/claude-cli`)
- Claude Code 프로젝트 경로: `~/.claude/projects`

## 🔧 초기 설정

1. 환경 변수 설정 (.env 파일 생성)
```bash
CLAUDE_PROJECTS_PATH=/Users/[username]/.claude/projects
```

2. Claude CLI 인증
```bash
claude login
```

## 📖 주요 명령어

### `dashboard`
웹 대시보드를 실행합니다.

```bash
npx claude-report-analyzer dashboard
# 또는
npx claude-report-analyzer dashboard -p 3001  # 포트 지정
```

대시보드 기능:
- 프로젝트 목록 및 상태 확인
- 날짜별 세션 분석
- AI 기반 인사이트 생성
- PDF/Markdown 내보내기

### `scan`
특정 프로젝트의 세션을 분석합니다.

```bash
npx claude-report-analyzer scan --project [project-name]

# 옵션
--limit 10        # 분석할 세션 수 제한
--no-ai          # AI 분석 비활성화
```

### `init`
초기 설정을 진행합니다.

```bash
npx claude-report-analyzer init
```

## 🎯 주요 기능

### 1. 자동 세션 분석
- Claude Code 대화 내용을 자동으로 파싱
- AI를 통한 심층 분석 (제목, 요약, 인사이트 추출)
- 11가지 템플릿 기반 분석

### 2. 실시간 대시보드
- 프로젝트별 진행 상황 추적
- 캘린더 뷰로 날짜별 세션 확인
- 실시간 분석 진행률 표시

### 3. 리포트 생성
- PDF 내보내기 (한글 지원)
- Markdown 내보내기
- 세션별 상세 리포트

### 4. 통계 및 인사이트
- 코드 품질 분석
- 기술 스택 추출
- 작업 타임라인
- 문제 해결 패턴 분석

## 📁 데이터 저장 위치

분석된 리포트는 다음 경로에 저장됩니다:
```
./reports/projects/[project-name]/
├── metadata.json
└── reports/
    ├── 2024-01-01.json
    ├── 2024-01-02.json
    └── ...
```

## 🛠️ 개발 모드

```bash
# 저장소 클론
git clone https://github.com/yourusername/claude-report-analyzer
cd claude-report-analyzer

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build
```

## 📝 분석 템플릿

- bug-fix: 버그 수정 세션
- feature-dev: 기능 개발
- code-review: 코드 리뷰
- debugging: 디버깅
- refactoring: 리팩토링
- performance: 성능 최적화
- architecture: 아키텍처 설계
- documentation: 문서화
- testing: 테스트 작성
- deployment: 배포
- general: 일반 대화

## 🔐 보안 및 프라이버시

- 모든 데이터는 로컬에 저장됩니다
- Claude API 호출 시에만 네트워크 사용
- 민감한 정보는 자동으로 필터링

## 📄 라이선스

MIT License

## 🤝 기여하기

이슈 및 PR은 언제나 환영합니다!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 문의

- Issues: [GitHub Issues](https://github.com/yourusername/claude-report-analyzer/issues)
- Email: your-email@example.com

## 🙏 Acknowledgments

- Claude by Anthropic
- React & TypeScript Community
- All contributors