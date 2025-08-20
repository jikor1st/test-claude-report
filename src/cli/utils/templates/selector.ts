import { TemplateType, TemplateAnalysisResult } from './types';
import { templateDefinitions } from './definitions';

export class TemplateSelector {
  /**
   * 세션 내용을 분석하여 가장 적합한 템플릿 타입을 선택
   */
  static async selectTemplate(sessionContent: string): Promise<TemplateAnalysisResult> {
    // 각 템플릿별 점수 계산
    const scores = this.calculateTemplateScores(sessionContent);
    
    // general 템플릿 제외하고 가장 높은 점수 찾기
    const nonGeneralScores = scores.filter(s => s.type !== 'general');
    const bestNonGeneral = nonGeneralScores.reduce((best, current) => 
      current.score > best.score ? current : best, nonGeneralScores[0] || { score: 0, type: 'general' as TemplateType, matchedKeywords: [] }
    );

    // 신뢰도 임계값 설정
    const MIN_CONFIDENCE_THRESHOLD = 0.3; // 30% 미만이면 템플릿 사용 안함
    const MIN_SCORE_THRESHOLD = 3; // 최소 3점 이상이어야 템플릿 사용

    // 신뢰도 계산 (0-1 사이의 값)
    const confidence = Math.min(bestNonGeneral.score / 15, 1); // 15점 만점으로 조정

    // 템플릿을 사용할지 결정
    const shouldUseTemplate = confidence >= MIN_CONFIDENCE_THRESHOLD && bestNonGeneral.score >= MIN_SCORE_THRESHOLD;

    if (!shouldUseTemplate) {
      return {
        templateType: null, // 템플릿 사용 안함
        confidence: 0,
        reason: `템플릿 매칭 신뢰도가 낮음 (${(confidence * 100).toFixed(0)}%). 자유 형식으로 분석합니다.`
      };
    }

    return {
      templateType: bestNonGeneral.type,
      confidence,
      reason: this.generateReason(bestNonGeneral.type, bestNonGeneral.matchedKeywords)
    };
  }

  /**
   * 각 템플릿별 점수 계산
   */
  private static calculateTemplateScores(content: string): Array<{
    type: TemplateType;
    score: number;
    matchedKeywords: string[];
  }> {
    const lowerContent = content.toLowerCase();
    const scores: Array<{
      type: TemplateType;
      score: number;
      matchedKeywords: string[];
    }> = [];

    for (const [type, template] of Object.entries(templateDefinitions)) {
      let score = 0;
      const matchedKeywords: string[] = [];

      // 키워드 매칭
      for (const keyword of template.keywords) {
        const lowerKeyword = keyword.toLowerCase();
        const matches = (lowerContent.match(new RegExp(lowerKeyword, 'g')) || []).length;
        if (matches > 0) {
          score += matches * 2; // 키워드 매칭은 2점씩
          matchedKeywords.push(keyword);
        }
      }

      // 특별한 패턴 감지
      score += this.detectSpecialPatterns(type as TemplateType, content);

      scores.push({
        type: type as TemplateType,
        score,
        matchedKeywords
      });
    }

    // general 템플릿은 기본 점수 부여 (다른 템플릿이 낮은 점수일 때 선택되도록)
    const generalIndex = scores.findIndex(s => s.type === 'general');
    if (generalIndex !== -1) {
      scores[generalIndex].score = 1;
    }

    return scores;
  }

  /**
   * 특정 템플릿에 대한 특별한 패턴 감지
   */
  private static detectSpecialPatterns(type: TemplateType, content: string): number {
    let score = 0;

    switch (type) {
      case 'bug-fix':
        // 에러 메시지 패턴
        if (/Error:|TypeError:|ReferenceError:|SyntaxError:/i.test(content)) score += 5;
        if (/stack trace|traceback/i.test(content)) score += 3;
        if (/fix|fixed|해결|수정/i.test(content)) score += 2;
        break;

      case 'feature-dev':
        // 기능 구현 패턴
        if (/implement|구현|개발|create|생성/i.test(content)) score += 3;
        if (/new feature|새 기능|새로운 기능/i.test(content)) score += 5;
        break;

      case 'code-review':
        // 코드 리뷰 패턴
        if (/review|리뷰|검토|code quality|코드 품질/i.test(content)) score += 4;
        if (/suggest|제안|recommend|권장/i.test(content)) score += 2;
        break;

      case 'refactoring':
        // 리팩토링 패턴
        if (/refactor|리팩토링|restructure|재구성/i.test(content)) score += 5;
        if (/clean code|클린 코드|improve structure|구조 개선/i.test(content)) score += 3;
        break;

      case 'debugging':
        // 디버깅 패턴
        if (/debug|디버그|trace|추적|investigate|조사/i.test(content)) score += 4;
        if (/console\.log|print|로그|log/i.test(content)) score += 2;
        break;

      case 'performance':
        // 성능 최적화 패턴
        if (/performance|성능|optimize|최적화|speed|속도/i.test(content)) score += 5;
        if (/benchmark|벤치마크|measure|측정/i.test(content)) score += 3;
        break;

      case 'testing':
        // 테스트 패턴
        if (/test|테스트|jest|mocha|pytest|unit test/i.test(content)) score += 5;
        if (/expect|assert|should|검증|verify/i.test(content)) score += 3;
        break;

      case 'architecture':
        // 아키텍처 패턴
        if (/architecture|아키텍처|design pattern|디자인 패턴/i.test(content)) score += 5;
        if (/structure|구조|component|컴포넌트|module|모듈/i.test(content)) score += 2;
        break;

      case 'documentation':
        // 문서화 패턴
        if (/document|문서|readme|docs|guide|가이드/i.test(content)) score += 5;
        if (/explain|설명|describe|서술/i.test(content)) score += 2;
        break;

      case 'learning':
        // 학습 패턴
        if (/how to|어떻게|what is|무엇|explain|설명해/i.test(content)) score += 4;
        if (/learn|학습|understand|이해|tutorial|튜토리얼/i.test(content)) score += 3;
        break;
    }

    return score;
  }

  /**
   * 선택 이유 생성
   */
  private static generateReason(type: TemplateType, matchedKeywords: string[]): string {
    const template = templateDefinitions[type];
    
    if (matchedKeywords.length > 0) {
      return `"${matchedKeywords.join('", "')}" 키워드가 발견되어 ${template.name} 템플릿을 선택했습니다.`;
    }
    
    if (type === 'general') {
      return '특정 패턴이 감지되지 않아 일반 템플릿을 선택했습니다.';
    }
    
    return `대화 내용이 ${template.description}에 해당하는 것으로 판단됩니다.`;
  }
}