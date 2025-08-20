export type TemplateType = 
  | 'bug-fix'           // 버그 수정 관련 대화
  | 'feature-dev'       // 기능 개발 관련 대화
  | 'code-review'       // 코드 리뷰 관련 대화
  | 'refactoring'       // 리팩토링 관련 대화
  | 'documentation'     // 문서화 관련 대화
  | 'debugging'         // 디버깅 관련 대화
  | 'architecture'      // 아키텍처 설계 관련 대화
  | 'performance'       // 성능 최적화 관련 대화
  | 'testing'           // 테스트 관련 대화
  | 'learning'          // 학습/질문 관련 대화
  | 'general';          // 일반적인 대화

export interface TemplatePrompt {
  type: TemplateType;
  name: string;
  description: string;
  keywords: string[];  // 템플릿 자동 선택을 위한 키워드
  structure: {
    sections: string[];
    requiredFields: string[];
    optionalFields: string[];
  };
  exampleOutput?: string;
}

export interface TemplateAnalysisResult {
  templateType: TemplateType;
  confidence: number;  // 0-1 사이의 신뢰도
  reason: string;      // 선택 이유
}

export interface ReportTemplate {
  generatePrompt: (sessionContent: string) => string;
  formatResponse: (analysis: any) => string;
  validateResponse: (analysis: any) => boolean;
}