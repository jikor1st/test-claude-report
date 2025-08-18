import { TemplatePrompt, TemplateType } from './types';

export const templateDefinitions: Record<TemplateType, TemplatePrompt> = {
  'bug-fix': {
    type: 'bug-fix',
    name: '버그 수정 리포트',
    description: '버그 발견부터 해결까지의 과정을 문서화',
    keywords: ['버그', '오류', '에러', 'fix', 'error', 'bug', '수정', '해결', 'TypeError', 'ReferenceError'],
    structure: {
      sections: ['버그 설명', '원인 분석', '해결 방법', '검증 결과', '예방 방안'],
      requiredFields: ['bugDescription', 'rootCause', 'solution', 'verification'],
      optionalFields: ['preventionMeasures', 'relatedIssues', 'affectedFiles']
    }
  },
  'feature-dev': {
    type: 'feature-dev',
    name: '기능 개발 리포트',
    description: '새로운 기능의 설계부터 구현까지의 과정',
    keywords: ['기능', '개발', '구현', 'feature', 'implement', '추가', '새로운', 'new'],
    structure: {
      sections: ['기능 요구사항', '설계 접근법', '구현 내용', '테스트 결과', '배포 고려사항'],
      requiredFields: ['requirements', 'designApproach', 'implementation', 'testResults'],
      optionalFields: ['deploymentNotes', 'futureEnhancements', 'dependencies']
    }
  },
  'code-review': {
    type: 'code-review',
    name: '코드 리뷰 리포트',
    description: '코드 품질 검토 및 개선 제안',
    keywords: ['리뷰', '검토', 'review', '코드 품질', '개선', 'refactor', '최적화'],
    structure: {
      sections: ['리뷰 대상', '주요 발견사항', '개선 제안', '좋은 점', '액션 아이템'],
      requiredFields: ['reviewTarget', 'findings', 'improvements', 'positives'],
      optionalFields: ['actionItems', 'codeSmells', 'securityConcerns']
    }
  },
  'refactoring': {
    type: 'refactoring',
    name: '리팩토링 리포트',
    description: '코드 구조 개선 과정과 결과',
    keywords: ['리팩토링', 'refactor', '구조 개선', '클린 코드', 'clean code', '재구성'],
    structure: {
      sections: ['리팩토링 목표', '변경 전 상태', '변경 후 상태', '개선 효과', '추가 고려사항'],
      requiredFields: ['goals', 'beforeState', 'afterState', 'improvements'],
      optionalFields: ['performanceImpact', 'breakingChanges', 'migrationGuide']
    }
  },
  'documentation': {
    type: 'documentation',
    name: '문서화 리포트',
    description: '문서 작성 및 개선 활동',
    keywords: ['문서', 'documentation', 'README', 'docs', '설명', '가이드', 'guide'],
    structure: {
      sections: ['문서화 대상', '작성 내용', '주요 섹션', '사용 예시', '참고 자료'],
      requiredFields: ['target', 'content', 'mainSections'],
      optionalFields: ['examples', 'references', 'changelog']
    }
  },
  'debugging': {
    type: 'debugging',
    name: '디버깅 리포트',
    description: '문제 진단 및 해결 과정',
    keywords: ['디버깅', 'debug', '진단', '분석', 'trace', '추적', '로그', 'log'],
    structure: {
      sections: ['문제 증상', '디버깅 과정', '근본 원인', '해결 방법', '학습 내용'],
      requiredFields: ['symptoms', 'debuggingProcess', 'rootCause', 'solution'],
      optionalFields: ['lessonsLearned', 'toolsUsed', 'reproducationSteps']
    }
  },
  'architecture': {
    type: 'architecture',
    name: '아키텍처 설계 리포트',
    description: '시스템 설계 및 구조 결정',
    keywords: ['아키텍처', 'architecture', '설계', 'design', '구조', 'structure', '패턴', 'pattern'],
    structure: {
      sections: ['설계 목표', '아키텍처 개요', '주요 컴포넌트', '설계 결정사항', '트레이드오프'],
      requiredFields: ['designGoals', 'architectureOverview', 'components', 'decisions'],
      optionalFields: ['tradeoffs', 'alternativeApproaches', 'futureConsiderations']
    }
  },
  'performance': {
    type: 'performance',
    name: '성능 최적화 리포트',
    description: '성능 분석 및 개선 활동',
    keywords: ['성능', 'performance', '최적화', 'optimize', '속도', 'speed', '효율'],
    structure: {
      sections: ['성능 이슈', '측정 결과', '최적화 방법', '개선 효과', '추가 개선 가능성'],
      requiredFields: ['performanceIssues', 'measurements', 'optimizations', 'results'],
      optionalFields: ['furtherOptimizations', 'benchmarks', 'tradeoffs']
    }
  },
  'testing': {
    type: 'testing',
    name: '테스트 리포트',
    description: '테스트 작성 및 실행 결과',
    keywords: ['테스트', 'test', '검증', 'verify', 'QA', '품질', 'unit test', 'integration'],
    structure: {
      sections: ['테스트 대상', '테스트 전략', '테스트 케이스', '실행 결과', '커버리지'],
      requiredFields: ['testTarget', 'testStrategy', 'testCases', 'results'],
      optionalFields: ['coverage', 'edgeCases', 'performanceTests']
    }
  },
  'learning': {
    type: 'learning',
    name: '학습 리포트',
    description: '학습 내용 및 질문 응답',
    keywords: ['학습', 'learn', '질문', 'question', '설명', 'explain', '이해', 'understand'],
    structure: {
      sections: ['학습 주제', '핵심 개념', '예제 코드', '실습 내용', '추가 학습 자료'],
      requiredFields: ['topic', 'keyConcepts', 'examples'],
      optionalFields: ['practiceExercises', 'furtherReading', 'relatedTopics']
    }
  },
  'general': {
    type: 'general',
    name: '일반 리포트',
    description: '특정 카테고리에 속하지 않는 일반적인 대화',
    keywords: [],
    structure: {
      sections: ['주요 주제', '논의 내용', '결론', '후속 조치'],
      requiredFields: ['mainTopics', 'discussions', 'conclusions'],
      optionalFields: ['nextSteps', 'references', 'notes']
    }
  }
};