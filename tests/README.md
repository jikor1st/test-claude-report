# 테스트 파일

이 폴더는 Claude Report의 테스트 파일들을 포함합니다.

## 파일 구조

- `mini-ai-test.ts` - Claude AI API 테스트 스크립트
- `mini-test.jsonl` - 테스트용 미니 세션 파일
- `test-mini-project/` - 테스트용 미니 프로젝트 디렉토리
  - `session-mini.jsonl` - 테스트용 세션 파일
  - `session1.jsonl` - 테스트용 세션 파일

## 테스트 실행

```bash
# AI 분석 테스트
npx tsx tests/mini-ai-test.ts

# 테스트 프로젝트로 분석 테스트
CLAUDE_PROJECTS_PATH="./tests/test-mini-project" npm run claude-report scan --project test-mini-project --ai
```