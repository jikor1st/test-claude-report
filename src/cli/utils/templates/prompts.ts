import { TemplateType } from './types';

export const templatePrompts: Record<TemplateType, (content: string) => string> = {
  'bug-fix': (content: string) => `
다음 대화를 분석하여 버그 수정 리포트를 작성해주세요.
중요: 대화에서 언급된 코드 조각이나 변경사항은 반드시 포함해주세요.

대화 내용:
${content}

다음 JSON 형식으로 응답해주세요:
{
  "title": "버그 수정: [구체적인 버그 제목]",
  "summary": "발견된 버그와 해결 방법을 2-3문장으로 요약",
  "bugDescription": {
    "symptoms": "버그의 증상과 발생 조건",
    "affectedComponents": "영향받은 컴포넌트나 모듈",
    "severity": "심각도 (critical/high/medium/low)"
  },
  "rootCause": {
    "analysis": "근본 원인 분석",
    "codeLocation": "문제가 발생한 코드 위치 (파일명과 라인 번호 포함)",
    "whyItHappened": "왜 이 버그가 발생했는지"
  },
  "solution": {
    "approach": "해결 접근 방법",
    "implementation": "구체적인 구현 내용 (실제 코드 포함)",
    "codeChanges": "주요 코드 변경사항 (before/after 형식으로)"
  },
  "debuggingProcess": [
    {
      "step": 1,
      "action": "수행한 디버깅 작업",
      "code": "// 사용한 코드나 명령어",
      "finding": "발견한 내용",
      "hypothesis": "세운 가설"
    }
  ],
  "verification": {
    "testingMethod": "검증 방법",
    "results": "테스트 결과",
    "edgeCases": "확인한 엣지 케이스"
  },
  "preventionMeasures": "향후 유사한 버그를 방지하기 위한 방안",
  "lessonsLearned": ["배운 점 1", "배운 점 2"],
  "timeline": {
    "mainTasks": ["수행한 주요 작업들"],
    "completedGoals": ["달성한 목표들"],
    "challenges": ["직면했던 도전과제들"]
  }
}`,

  'feature-dev': (content: string) => `
다음 대화를 분석하여 기능 개발 리포트를 작성해주세요.

대화 내용:
${content}

다음 JSON 형식으로 응답해주세요:
{
  "title": "기능 개발: [기능명]",
  "summary": "개발한 기능의 핵심 내용을 2-3문장으로 요약",
  "requirements": {
    "businessGoal": "비즈니스 목표",
    "functionalRequirements": ["기능 요구사항 1", "기능 요구사항 2"],
    "nonFunctionalRequirements": ["비기능 요구사항 1", "비기능 요구사항 2"]
  },
  "designApproach": {
    "architecture": "아키텍처 설계 접근법",
    "keyDecisions": ["주요 설계 결정 1", "주요 설계 결정 2"],
    "tradeoffs": "고려한 트레이드오프"
  },
  "implementation": {
    "mainComponents": ["구현한 주요 컴포넌트"],
    "apiEndpoints": ["생성/수정한 API 엔드포인트"],
    "dataModels": ["데이터 모델 변경사항"],
    "uiChanges": "UI/UX 변경사항"
  },
  "technicalDetails": {
    "languages": ["사용된 프로그래밍 언어"],
    "frameworks": ["사용된 프레임워크"],
    "libraries": ["주요 라이브러리"],
    "patterns": ["적용한 디자인 패턴"]
  },
  "testResults": {
    "unitTests": "단위 테스트 결과",
    "integrationTests": "통합 테스트 결과",
    "manualTesting": "수동 테스트 결과"
  },
  "deploymentNotes": "배포 시 주의사항",
  "futureEnhancements": ["향후 개선 가능한 부분"]
}`,

  'code-review': (content: string) => `
다음 대화를 분석하여 코드 리뷰 리포트를 작성해주세요.

대화 내용:
${content}

다음 JSON 형식으로 응답해주세요:
{
  "title": "코드 리뷰: [리뷰 대상]",
  "summary": "코드 리뷰의 주요 내용을 2-3문장으로 요약",
  "reviewTarget": {
    "scope": "리뷰 범위",
    "files": ["리뷰한 파일 목록"],
    "pullRequest": "PR 번호나 커밋 정보"
  },
  "findings": {
    "critical": ["중요한 문제점"],
    "major": ["주요 개선사항"],
    "minor": ["사소한 개선사항"]
  },
  "positives": ["잘 작성된 부분", "좋은 프랙티스"],
  "improvements": {
    "codeQuality": ["코드 품질 개선 제안"],
    "performance": ["성능 개선 제안"],
    "security": ["보안 개선 제안"],
    "maintainability": ["유지보수성 개선 제안"]
  },
  "codeSmells": ["발견된 코드 스멜"],
  "actionItems": [
    {
      "priority": "high/medium/low",
      "description": "수행해야 할 작업",
      "assignee": "담당자"
    }
  ]
}`,

  'refactoring': (content: string) => `
다음 대화를 분석하여 리팩토링 리포트를 작성해주세요.

대화 내용:
${content}

다음 JSON 형식으로 응답해주세요:
{
  "title": "리팩토링: [대상 코드/모듈]",
  "summary": "리팩토링의 목적과 결과를 2-3문장으로 요약",
  "goals": ["리팩토링 목표 1", "리팩토링 목표 2"],
  "beforeState": {
    "problems": ["기존 코드의 문제점"],
    "metrics": {
      "complexity": "복잡도",
      "duplication": "중복 정도",
      "coupling": "결합도"
    }
  },
  "afterState": {
    "improvements": ["개선된 점"],
    "metrics": {
      "complexity": "개선된 복잡도",
      "duplication": "감소된 중복",
      "coupling": "낮아진 결합도"
    }
  },
  "refactoringTechniques": ["적용한 리팩토링 기법"],
  "designPatterns": ["적용한 디자인 패턴"],
  "improvements": {
    "readability": "가독성 개선 내용",
    "maintainability": "유지보수성 개선 내용",
    "testability": "테스트 용이성 개선 내용"
  },
  "performanceImpact": "성능에 미친 영향",
  "breakingChanges": ["호환성을 깨는 변경사항"],
  "migrationGuide": "마이그레이션 가이드"
}`,

  'documentation': (content: string) => `
다음 대화를 분석하여 문서화 리포트를 작성해주세요.

대화 내용:
${content}

다음 JSON 형식으로 응답해주세요:
{
  "title": "문서화: [문서 제목]",
  "summary": "문서화 작업의 핵심 내용을 2-3문장으로 요약",
  "target": {
    "type": "문서 타입 (README/API/Guide/Tutorial)",
    "audience": "대상 독자",
    "purpose": "문서의 목적"
  },
  "content": {
    "overview": "문서 개요",
    "structure": ["문서 구조와 섹션"]
  },
  "mainSections": [
    {
      "title": "섹션 제목",
      "content": "섹션 내용 요약",
      "keyPoints": ["핵심 포인트"]
    }
  ],
  "examples": ["포함된 예제 코드나 사용 예시"],
  "references": ["참고 자료 및 링크"],
  "changelog": "문서 변경 이력",
  "reviewNotes": "문서 검토 및 개선 필요사항"
}`,

  'debugging': (content: string) => `
다음 대화를 분석하여 디버깅 리포트를 작성해주세요.

대화 내용:
${content}

다음 JSON 형식으로 응답해주세요:
{
  "title": "디버깅: [문제 설명]",
  "summary": "디버깅 과정과 결과를 2-3문장으로 요약",
  "symptoms": {
    "description": "문제 증상 설명",
    "errorMessages": ["발생한 에러 메시지"],
    "frequency": "발생 빈도",
    "impact": "영향 범위"
  },
  "debuggingProcess": [
    {
      "step": "단계 번호",
      "action": "수행한 작업",
      "finding": "발견한 내용",
      "hypothesis": "가설"
    }
  ],
  "rootCause": {
    "description": "근본 원인",
    "location": "문제 발생 위치",
    "explanation": "왜 이 문제가 발생했는지"
  },
  "solution": {
    "approach": "해결 방법",
    "implementation": "구현 내용",
    "verification": "검증 방법"
  },
  "toolsUsed": ["사용한 디버깅 도구"],
  "reproducationSteps": ["문제 재현 단계"],
  "lessonsLearned": ["배운 점과 향후 예방 방법"]
}`,

  'architecture': (content: string) => `
다음 대화를 분석하여 아키텍처 설계 리포트를 작성해주세요.

대화 내용:
${content}

다음 JSON 형식으로 응답해주세요:
{
  "title": "아키텍처 설계: [시스템/컴포넌트명]",
  "summary": "아키텍처 설계의 핵심을 2-3문장으로 요약",
  "designGoals": ["설계 목표 1", "설계 목표 2"],
  "architectureOverview": {
    "type": "아키텍처 타입 (monolithic/microservices/serverless 등)",
    "description": "전체 아키텍처 설명",
    "keyPrinciples": ["핵심 설계 원칙"]
  },
  "components": [
    {
      "name": "컴포넌트명",
      "responsibility": "책임과 역할",
      "technology": "사용 기술",
      "interfaces": ["제공하는 인터페이스"]
    }
  ],
  "dataFlow": {
    "description": "데이터 흐름 설명",
    "patterns": ["사용된 데이터 패턴"]
  },
  "decisions": [
    {
      "decision": "결정 사항",
      "rationale": "결정 이유",
      "alternatives": ["고려한 대안"],
      "tradeoffs": "트레이드오프"
    }
  ],
  "securityConsiderations": ["보안 고려사항"],
  "scalabilityStrategy": "확장성 전략",
  "futureConsiderations": ["향후 고려사항"]
}`,

  'performance': (content: string) => `
다음 대화를 분석하여 성능 최적화 리포트를 작성해주세요.

대화 내용:
${content}

다음 JSON 형식으로 응답해주세요:
{
  "title": "성능 최적화: [대상 시스템/기능]",
  "summary": "성능 최적화 작업의 핵심을 2-3문장으로 요약",
  "performanceIssues": [
    {
      "issue": "성능 이슈",
      "impact": "영향",
      "severity": "심각도"
    }
  ],
  "measurements": {
    "before": {
      "metrics": {"응답시간": "값", "처리량": "값", "리소스사용률": "값"},
      "bottlenecks": ["병목 지점"]
    },
    "after": {
      "metrics": {"응답시간": "값", "처리량": "값", "리소스사용률": "값"},
      "improvements": ["개선된 부분"]
    }
  },
  "optimizations": [
    {
      "technique": "최적화 기법",
      "implementation": "구현 방법",
      "impact": "성능 개선 효과"
    }
  ],
  "codeChanges": ["주요 코드 변경사항"],
  "tradeoffs": ["성능 vs 다른 품질 속성 간의 트레이드오프"],
  "benchmarks": {
    "methodology": "벤치마크 방법론",
    "results": "벤치마크 결과"
  },
  "furtherOptimizations": ["추가 최적화 가능 영역"],
  "monitoringStrategy": "성능 모니터링 전략"
}`,

  'testing': (content: string) => `
다음 대화를 분석하여 테스트 리포트를 작성해주세요.

대화 내용:
${content}

다음 JSON 형식으로 응답해주세요:
{
  "title": "테스트: [테스트 대상]",
  "summary": "테스트 작업의 핵심을 2-3문장으로 요약",
  "testTarget": {
    "component": "테스트 대상 컴포넌트/모듈",
    "scope": "테스트 범위",
    "version": "버전 정보"
  },
  "testStrategy": {
    "approach": "테스트 접근 방법",
    "levels": ["테스트 레벨 (unit/integration/e2e)"],
    "prioritization": "우선순위 전략"
  },
  "testCases": [
    {
      "id": "테스트 ID",
      "description": "테스트 설명",
      "type": "테스트 타입",
      "expectedResult": "예상 결과",
      "actualResult": "실제 결과",
      "status": "pass/fail"
    }
  ],
  "results": {
    "summary": {"총 테스트": 0, "성공": 0, "실패": 0, "스킵": 0},
    "failureAnalysis": ["실패 원인 분석"],
    "regressionTests": "회귀 테스트 결과"
  },
  "coverage": {
    "lineCoverage": "라인 커버리지 %",
    "branchCoverage": "브랜치 커버리지 %",
    "uncoveredAreas": ["커버되지 않은 영역"]
  },
  "edgeCases": ["테스트한 엣지 케이스"],
  "performanceTests": "성능 테스트 결과",
  "recommendations": ["테스트 개선 권장사항"]
}`,

  'learning': (content: string) => `
다음 대화를 분석하여 학습 리포트를 작성해주세요.

대화 내용:
${content}

다음 JSON 형식으로 응답해주세요:
{
  "title": "학습: [주제]",
  "summary": "학습 내용의 핵심을 2-3문장으로 요약",
  "topic": {
    "main": "주요 학습 주제",
    "subtopics": ["세부 주제 1", "세부 주제 2"],
    "difficulty": "난이도 (beginner/intermediate/advanced)"
  },
  "keyConcepts": [
    {
      "concept": "개념명",
      "definition": "정의",
      "importance": "중요성",
      "realWorldApplication": "실제 적용 사례"
    }
  ],
  "examples": [
    {
      "description": "예제 설명",
      "code": "예제 코드",
      "explanation": "코드 설명"
    }
  ],
  "commonMistakes": ["흔한 실수와 주의사항"],
  "bestPractices": ["모범 사례"],
  "practiceExercises": ["연습 문제"],
  "furtherReading": ["추가 학습 자료"],
  "relatedTopics": ["관련 주제"],
  "questionsAnswered": ["답변한 질문들"],
  "keyTakeaways": ["핵심 요점"]
}`,

  'general': (content: string) => `
다음 대화를 분석하여 일반 리포트를 작성해주세요.

대화 내용:
${content}

다음 JSON 형식으로 응답해주세요:
{
  "title": "대화 주제를 나타내는 명확한 제목",
  "summary": "전체 대화의 핵심 내용을 2-3문장으로 요약",
  "mainTopics": ["주요 논의 주제 1", "주요 논의 주제 2"],
  "discussions": [
    {
      "topic": "논의 주제",
      "keyPoints": ["핵심 포인트"],
      "decisions": ["결정 사항"],
      "insights": ["인사이트"]
    }
  ],
  "technicalDetails": {
    "languages": ["언급된 프로그래밍 언어"],
    "frameworks": ["언급된 프레임워크"],
    "tools": ["사용된 도구"],
    "concepts": ["다룬 기술 개념"]
  },
  "codeSnippets": ["중요한 코드 조각들"],
  "conclusions": ["주요 결론"],
  "actionItems": ["후속 조치 사항"],
  "references": ["참고 자료"],
  "notes": "추가 메모"
}`
};