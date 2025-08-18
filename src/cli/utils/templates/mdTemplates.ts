import { promises as fs } from 'fs';
import { join } from 'path';
import { TemplateType } from './types';

export interface MdTemplate {
  type: TemplateType;
  fileName: string;
  title: string;
  description: string;
}

/**
 * MD 템플릿 파일과 템플릿 타입 매핑
 */
export const mdTemplateMapping: Record<string, TemplateType[]> = {
  '문제 해결 과정 템플릿.md': ['bug-fix', 'debugging'],
  '문제 해결 과정 템플릿_간결.md': ['bug-fix', 'debugging'],
  '기술 튜토리얼 템플릿.md': ['learning', 'documentation'],
  '프로젝트 회고록 템플릿.md': ['general', 'architecture'],
  '기술 비교 분석 템플릿.md': ['code-review', 'performance', 'architecture']
};

/**
 * 템플릿 타입별 권장 MD 템플릿
 */
export const templateTypeToMdTemplate: Record<TemplateType, string> = {
  'bug-fix': '문제 해결 과정 템플릿_간결.md',
  'feature-dev': '프로젝트 회고록 템플릿.md',
  'code-review': '기술 비교 분석 템플릿.md',
  'refactoring': '기술 비교 분석 템플릿.md',
  'documentation': '기술 튜토리얼 템플릿.md',
  'debugging': '문제 해결 과정 템플릿_간결.md',
  'architecture': '기술 비교 분석 템플릿.md',
  'performance': '기술 비교 분석 템플릿.md',
  'testing': '프로젝트 회고록 템플릿.md',
  'learning': '기술 튜토리얼 템플릿.md',
  'general': '프로젝트 회고록 템플릿.md'
};

/**
 * MD 템플릿 파일 읽기
 */
export async function loadMdTemplate(templateType: TemplateType): Promise<string> {
  const templateFileName = templateTypeToMdTemplate[templateType];
  const templatePath = join(process.cwd(), 'templates', templateFileName);
  
  try {
    const templateContent = await fs.readFile(templatePath, 'utf8');
    return templateContent;
  } catch (error) {
    console.error(`템플릿 파일 읽기 실패 (${templateFileName}):`, error);
    // 폴백: 기본 템플릿 반환
    return getDefaultTemplate();
  }
}

/**
 * 기본 템플릿
 */
function getDefaultTemplate(): string {
  return `# [제목]

---

title: "[제목]"
date: ${new Date().toISOString().split('T')[0]}
tags: [태그1, 태그2]
category: General
author: Claude Reporter
description: "[설명]"

---

## 📋 개요

[세션 내용 요약]

## 🔍 주요 내용

[주요 논의 사항]

## 💡 핵심 인사이트

[핵심 발견사항]

## 🛠️ 기술 정보

[사용된 기술 스택]

## 📝 결론

[결론 및 다음 단계]
`;
}

/**
 * MD 템플릿을 AI 분석 결과로 채우기
 */
export function fillMdTemplate(template: string, analysisResult: any, sessionInfo: any): string {
  let filledTemplate = template;
  
  // 템플릿별 특수 치환을 먼저 수행
  if (template.includes('문제 해결 과정') && template.includes('_간결')) {
    filledTemplate = fillConciseProblemSolvingTemplate(filledTemplate, analysisResult, sessionInfo);
  } else if (template.includes('문제 해결 과정')) {
    filledTemplate = fillProblemSolvingTemplate(filledTemplate, analysisResult, sessionInfo);
  } else if (template.includes('기술 튜토리얼')) {
    filledTemplate = fillTutorialTemplate(filledTemplate, analysisResult);
  } else if (template.includes('프로젝트 회고록')) {
    filledTemplate = fillRetrospectiveTemplate(filledTemplate, analysisResult);
  } else if (template.includes('기술 비교 분석')) {
    filledTemplate = fillComparisonTemplate(filledTemplate, analysisResult);
  }
  
  // 기본 정보 치환 (템플릿별 치환 후에 수행)
  filledTemplate = filledTemplate
    .replace(/\[제목\]/g, analysisResult.title || '제목 없음')
    .replace(/\[YYYY-MM-DD\]/g, new Date().toISOString().split('T')[0])
    .replace(/\[작성자명\]/g, 'Claude Reporter')
    .replace(/\[설명\]/g, analysisResult.summary || '설명 없음');
  
  return filledTemplate;
}

/**
 * 문제 해결 과정 템플릿 채우기
 */
function fillProblemSolvingTemplate(template: string, result: any, sessionInfo: any): string {
  let filled = template;
  
  // 코드 블록 정리 함수
  const formatCodeBlock = (code: string, lang: string = 'jsx') => {
    if (!code || code === '// 문제가 된 코드 부분') return '';
    
    // 이미 코드 블록으로 감싸진 경우 내용만 추출
    if (code.includes('```')) {
      const match = code.match(/```[\w]*\n?([\s\S]*?)```/);
      if (match) {
        code = match[1].trim();
      }
    }
    
    // 코드가 너무 길면 요약
    const lines = code.split('\n');
    if (lines.length > 20) {
      const preview = lines.slice(0, 15).join('\n');
      const lastLines = lines.slice(-3).join('\n');
      return `\`\`\`${lang}\n${preview}\n// ... (${lines.length - 18}줄 생략)\n${lastLines}\n\`\`\``;
    }
    
    return `\`\`\`${lang}\n${code}\n\`\`\``;
  };
  
  // 긴 텍스트 요약 함수
  const summarizeText = (text: string, maxLength: number = 200) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    
    // 문장 단위로 자르기
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let summary = '';
    
    for (const sentence of sentences) {
      if ((summary + sentence).length > maxLength) {
        if (summary) break;
        // 첫 문장도 너무 길면 단어 단위로 자르기
        return sentence.substring(0, maxLength - 3) + '...';
      }
      summary += sentence;
    }
    
    return summary || text.substring(0, maxLength - 3) + '...';
  };
  
  // 제목 처리 - 중복 제거
  const errorTitle = result.title || '문제 해결';
  
  // 제목에서 이미 이모지나 "해결기" 같은 단어가 있으면 제거
  const cleanTitle = errorTitle
    .replace(/^[🐛🔧🚨💡✅]/, '') // 이모지 제거
    .replace(/해결기[:：]?\s*/, '') // "해결기" 제거
    .replace(/버그\s*수정[:：]?\s*/, '') // "버그 수정" 제거
    .replace(/디버깅[:：]?\s*/, '') // "디버깅" 제거
    .trim();
  
  filled = filled
    .replace(/\[에러명\]/g, cleanTitle)
    .replace(/\[기간\]/g, ''); // 기간은 제거
  
  // 문제 상황 섹션
  if (result.bugDescription || result.symptoms || result.keyInsights || result.errorMessages) {
    let errorMessage = '';
    
    // 구조화된 에러 메시지가 있으면 우선 사용
    if (result.errorMessages && result.errorMessages.length > 0) {
      errorMessage = result.errorMessages[0].matchedText || result.errorMessages[0];
    } else {
      errorMessage = result.bugDescription?.symptoms || 
                    result.symptoms?.description || 
                    result.keyInsights?.[0] || 
                    '문제 증상 설명';
    }
    
    // 긴 에러 메시지 요약
    errorMessage = summarizeText(errorMessage, 300);
    
    filled = filled
      .replace('에러 메시지: [실제 에러 메시지]', `에러 메시지: ${errorMessage}`)
      .replace('발생 환경: [환경 정보]', `발생 환경: ${result.environment || '개발 환경'}`)
      .replace('발생 빈도: [빈도 정보]', `발생 빈도: ${result.frequency || '지속적'}`)
      .replace('영향도: [영향 범위]', `영향도: ${result.impact || '중간'}`);
  }
  
  // 사용자 신고 내용
  const userReport = result.summary || '문제 상황에 대한 설명';
  filled = filled.replace('"[사용자가 신고한 내용]"', `"${userReport}"`);
  
  // 문제 분석 과정은 간결한 템플릿에서는 원인 분석 섹션에 통합됨
  // 따라서 별도의 처리 불필요
  
  // 원인 발견 섹션
  const rootCause = result.rootCause?.description || 
                   result.rootCause?.analysis || 
                   result.keyInsights?.[1] || 
                   result.summary ||
                   '근본 원인 분석 내용';
                   
  filled = filled.replace(/\[발견된 실제 원인에 대한 설명\]/g, rootCause);
  
  // 문제 코드 (2단계 분석 결과 활용)
  const problematicCode = result.problematicCode || 
                         result.rootCause?.codeLocation || 
                         result.solution?.codeChanges ||
                         '// 문제가 된 코드 부분';
  
  // 문제가 된 코드 부분 채우기
  if (problematicCode && problematicCode !== '// 문제가 된 코드 부분') {
    const formattedCode = formatCodeBlock(problematicCode);
    if (formattedCode) {
      // 코드 블록 안의 내용만 추출
      const codeMatch = formattedCode.match(/```[\w]*\n?([\s\S]*?)```/);
      const codeContent = codeMatch ? codeMatch[1] : problematicCode;
      filled = filled.replace('[원인이 된 코드와 설명]', codeContent.trim());
    } else {
      filled = filled.replace('[원인이 된 코드와 설명]', '// 코드 분석 중');
    }
  } else {
    filled = filled.replace('[원인이 된 코드와 설명]', '// 코드 분석 중');
  }
  
  // 근본 원인 분석
  const reasons = [
    result.rootCause?.whyItHappened || rootCause,
    ...(result.timeline?.challenges || [])
  ].filter(Boolean).slice(0, 3);
  
  // 각 원인을 개별적으로 치환
  filled = filled
    .replace('[원인 1]', reasons[0] || rootCause)
    .replace('[원인 2]', reasons[1] || '코드 리뷰 프로세스 부재')
    .replace('[원인 3]', reasons[2] || '테스트 커버리지 부족');
  
  // 설명 태그 제거
  filled = filled.replace(/\[설명\]/g, '');
  
  // 해결 과정 (2단계 분석 결과 우선 사용)
  const solutionCode = result.solution?.codeChanges || 
                      result.solution?.implementation || 
                      result.solution?.approach || 
                      '// 해결 방법 구현';
  
  // 임시 해결책과 근본적 해결책 구분
  const hotfix = result.solution?.approach || 
                 (typeof solutionCode === 'string' ? solutionCode : '// 임시 해결 방법');
  const permanentFix = result.solution?.codeChanges || 
                      result.solution?.implementation || 
                      solutionCode;
  
  // 해결책 코드 채우기
  const processCodeForTemplate = (code: string, defaultText: string = '// 코드 구현') => {
    if (!code || code === defaultText) return defaultText;
    
    const formatted = formatCodeBlock(code);
    if (formatted) {
      // 코드 블록 내용만 추출
      const match = formatted.match(/```[\w]*\n?([\s\S]*?)```/);
      return match ? match[1].trim() : code;
    }
    return code;
  };
  
  filled = filled
    .replace('[임시 해결책 코드]', processCodeForTemplate(hotfix, '// 임시 해결 방법'))
    .replace('[근본적 해결책 코드]', processCodeForTemplate(permanentFix, '// 근본적 해결 방법'))
    .replace('[검증을 위한 테스트 코드]', processCodeForTemplate(
      result.verification?.testingMethod || 
      result.solution?.testCode ||
      'test("해결 검증", () => { /* 테스트 */ })',
      'test("해결 검증", () => { /* 테스트 */ })'
    ));
  
  // 해결 결과
  filled = filled
    .replace('[지표1]', '응답 시간')
    .replace('[이전값]', '느림')
    .replace('[개선값]', '빠름');
    
  // 두 번째 행
  const secondRowMatch = filled.match(/\| \[지표2\] \| \[이전값\] \| \[개선값\] \|/);
  if (secondRowMatch) {
    filled = filled.replace(secondRowMatch[0], '| 에러 발생 | 발생 | 해결 |');
  }
  
  // 세 번째 행
  const thirdRowMatch = filled.match(/\| \[지표3\] \| \[이전값\] \| \[개선값\] \|/);
  if (thirdRowMatch) {
    filled = filled.replace(thirdRowMatch[0], '| 사용자 만족도 | 낮음 | 높음 |');
  }
  
  filled = filled.replace('[성능 관련 지표들]', result.measurements?.after?.improvements?.join(', ') || '성능 개선 확인');
  
  // 배운 교훈 - 간결하게 처리
  const lessons = result.lessonsLearned || 
                 result.codeQuality?.improvements || 
                 result.keyInsights || 
                 [];
  
  const lessonsList = Array.isArray(lessons) ? lessons : [lessons];
  
  // 교훈을 최대 3개씩 카테고리별로 배분
  const maxLessonsPerCategory = 3;
  const technicalLessons = lessonsList.filter((_, idx) => idx % 3 === 0).slice(0, maxLessonsPerCategory);
  const processLessons = lessonsList.filter((_, idx) => idx % 3 === 1).slice(0, maxLessonsPerCategory);
  const futureLessons = lessonsList.filter((_, idx) => idx % 3 === 2).slice(0, maxLessonsPerCategory);
  
  // 카테고리 제목 설정
  filled = filled
    .replace(/\[교훈 카테고리 1\]/g, '기술적 교훈')
    .replace(/\[교훈 카테고리 2\]/g, '프로세스 개선')
    .replace(/\[교훈 카테고리 3\]/g, '향후 참고사항');
  
  // 각 카테고리의 교훈 채우기
  const fillLessons = (categoryName: string, lessonItems: string[]) => {
    const pattern = new RegExp(`(### ${categoryName}[\\s\\S]*?)- \\[구체적인 교훈\\]`, 'g');
    lessonItems.forEach((lesson, idx) => {
      const summarized = summarizeText(lesson, 150);
      if (idx === 0) {
        filled = filled.replace(pattern, `$1- ${summarized}`);
      } else {
        const sectionPattern = new RegExp(`(### ${categoryName}[\\s\\S]*?)(\n\n###|$)`);
        filled = filled.replace(sectionPattern, `$1\n- ${summarized}$2`);
      }
    });
  };
  
  fillLessons('기술적 교훈', technicalLessons);
  fillLessons('프로세스 개선', processLessons);
  fillLessons('향후 참고사항', futureLessons);
  
  // 남은 플레이스홀더 제거
  filled = filled.replace(/- \[구체적인 교훈\]\n/g, '');
  
  // 재발 방지 대책 - 간결하게 처리
  const preventions = result.preventionMeasures || 
                     result.furtherOptimizations ||
                     result.futureEnhancements ||
                     [];
  
  const preventionsList = Array.isArray(preventions) ? preventions : [preventions];
  const maxPreventions = 3;
  const topPreventions = preventionsList.slice(0, maxPreventions);
  
  // 대책 제목 설정
  const preventionTitles = [
    '코드 리뷰 프로세스 강화',
    '자동화된 테스트 추가',
    '문서화 및 가이드라인 업데이트'
  ];
  
  preventionTitles.forEach((title, idx) => {
    filled = filled.replace(new RegExp(`\\[대책 ${idx + 1}\\]`, 'g'), title);
  });
  
  // 대책 내용 채우기
  topPreventions.forEach((prevention, idx) => {
    const title = preventionTitles[idx];
    const summarized = summarizeText(prevention, 150);
    const pattern = new RegExp(`(### ${title}[\\s\\S]*?)- \\[구체적인 대책 내용\\]`);
    filled = filled.replace(pattern, `$1- ${summarized}`);
  });
  
  // 남은 플레이스홀더 제거
  filled = filled.replace(/- \[구체적인 대책 내용\]\n/g, '');
  
  // 재발 방지 코드 찾기 및 치환 - 중첩된 코드 블록 처리
  const preventionCode = result.preventionCode || '// 검증 로직 추가';
  const preventionContent = preventionCode.match(/```[\w]*\n?([\s\S]*?)```/)?.[1]?.trim() || preventionCode;
  filled = filled.replace('[예방 코드]', preventionContent);
  filled = filled.replace('[시스템적 개선 사항]', '시스템 모니터링 강화 및 알림 설정');
  
  // 참고 자료
  filled = filled
    .replace('[참고 자료 1]', 'Claude 분석 리포트')
    .replace('[참고 자료 2]', '프로젝트 문서')
    .replace('[참고 자료 3]', '기술 가이드')
    .replace(/https:\/\/claude\.ai\/chat\/URL/g, '#');
  
  // 마무리
  const conclusion = result.conclusions?.[0] || 
                    result.summary || 
                    '이번 문제 해결을 통해 시스템의 안정성을 향상시켰습니다.';
  
  filled = filled.replace('[이번 문제 해결을 통해 얻은 인사이트와 감상]', conclusion);
  
  // 남은 플레이스홀더 처리
  filled = filled.replace(/\[[^\]]+\]/g, (match) => {
    if (match.includes('태그') || match === '[디버깅, 문제해결, 기술태그]') {
      const tags = [
        'debugging',
        'troubleshooting',
        ...(result.technicalDetails?.languages || []),
        ...(result.technicalDetails?.frameworks || [])
      ].filter(Boolean).join(', ');
      return tags || 'debugging, troubleshooting';
    }
    if (match.includes('카테고리')) return 'Troubleshooting';
    if (match.includes('설명') || match === '[에러/문제에 대한 간단한 설명]') {
      return result.summary || '문제 해결 과정';
    }
    if (match.includes('작성자명')) return 'Claude Reporter';
    if (match.includes('YYYY-MM-DD')) return new Date().toISOString().split('T')[0];
    // 나머지 플레이스홀더는 빈 문자열로 (삭제)
    return match;
  });
  
  return filled;
}

/**
 * 간결한 문제 해결 과정 템플릿 채우기
 */
function fillConciseProblemSolvingTemplate(template: string, result: any, sessionInfo: any): string {
  let filled = template;
  
  // 코드 블록 정리 함수 (재사용)
  const formatCodeBlock = (code: string, lang: string = 'jsx') => {
    if (!code || code === '// 문제가 된 코드 부분') return '';
    
    // 이미 코드 블록으로 감싸진 경우 내용만 추출
    if (code.includes('```')) {
      const match = code.match(/```[\w]*\n?([\s\S]*?)```/);
      if (match) {
        code = match[1].trim();
      }
    }
    
    // 코드가 너무 길면 요약
    const lines = code.split('\n');
    if (lines.length > 15) {
      const preview = lines.slice(0, 10).join('\n');
      const lastLines = lines.slice(-3).join('\n');
      return `\`\`\`${lang}\n${preview}\n// ... (${lines.length - 13}줄 생략)\n${lastLines}\n\`\`\``;
    }
    
    return `\`\`\`${lang}\n${code}\n\`\`\``;
  };
  
  // 제목 처리 - 중복 제거
  const errorTitle = result.title || '문제 해결';
  
  // 제목에서 이미 이모지나 "해결기" 같은 단어가 있으면 제거
  const cleanTitle = errorTitle
    .replace(/^[🐛🔧🚨💡✅]\s*/, '') // 이모지 제거
    .replace(/해결기[:：]?\s*/, '') // "해결기" 제거
    .replace(/버그\s*수정[:：]?\s*/, '') // "버그 수정" 제거
    .replace(/디버깅[:：]?\s*/, '') // "디버깅" 제거
    .trim();
  
  filled = filled.replace(/\[에러명\]/g, cleanTitle);
  
  // 문제 상황 - 간결하게 한 줄로
  let errorMessage = '';
  if (result.errorMessages && result.errorMessages.length > 0) {
    errorMessage = result.errorMessages[0].matchedText || result.errorMessages[0];
  } else {
    errorMessage = result.bugDescription?.symptoms || 
                  result.symptoms?.description || 
                  result.keyInsights?.[0] || 
                  '문제 증상';
  }
  
  // 200자 이내로 요약
  if (errorMessage.length > 200) {
    errorMessage = errorMessage.substring(0, 197) + '...';
  }
  
  filled = filled
    .replace('[실제 에러 메시지]', errorMessage)
    .replace('[환경 정보]', result.environment || '개발')
    .replace('[빈도 정보]', result.frequency || '지속적')
    .replace('[영향 범위]', result.impact || '중간');
    
  // 사용자 신고 내용
  filled = filled.replace('[사용자가 신고한 내용]', result.summary || '문제 상황 설명');
  
  // 문제 코드 섹션
  const problematicCode = result.problematicCode || 
                         result.rootCause?.codeLocation || 
                         result.solution?.codeChanges ||
                         '// 문제 코드';
  
  const formattedProblemCode = formatCodeBlock(problematicCode);
  if (formattedProblemCode) {
    const codeMatch = formattedProblemCode.match(/```[\w]*\n?([\s\S]*?)```/);
    const codeContent = codeMatch ? codeMatch[1] : problematicCode;
    filled = filled.replace('[원인이 된 코드와 설명]', codeContent.trim());
  } else {
    filled = filled.replace('[원인이 된 코드와 설명]', '// 문제 코드 분석 중');
  }
  
  // 근본 원인 - 최대 2개만
  const rootCause = result.rootCause?.description || 
                   result.rootCause?.analysis || 
                   result.keyInsights?.[1] || 
                   '원인 분석';
                   
  const reasons = [
    result.rootCause?.whyItHappened || rootCause,
    ...(result.timeline?.challenges || [])
  ].filter(Boolean).slice(0, 2);
  
  filled = filled
    .replace('[원인 1]', reasons[0] || rootCause)
    .replace('[원인 2]', reasons[1] || '추가 원인 분석 필요')
    .replace('[설명]', '');
    
  // 해결 방법 - 근본적 해결책만
  const solutionCode = result.solution?.codeChanges || 
                      result.solution?.implementation || 
                      '// 해결 코드';
                      
  const formattedSolution = formatCodeBlock(solutionCode);
  if (formattedSolution) {
    const codeMatch = formattedSolution.match(/```[\w]*\n?([\s\S]*?)```/);
    const codeContent = codeMatch ? codeMatch[1] : solutionCode;
    filled = filled.replace('[근본적 해결책 코드]', codeContent.trim());
  } else {
    filled = filled.replace('[근본적 해결책 코드]', '// 해결 방법 구현');
  }
  
  // 검증 결과 - 간단한 테이블
  filled = filled
    .replace('[지표1]', '성능')
    .replace('[이전값]', '느림')
    .replace('[개선값]', '빠름')
    .replace('[지표2]', '에러')
    .replace('[이전값]', '발생')
    .replace('[개선값]', '해결');
    
  // 배운 점 - 각 카테고리 1개씩만
  const lessons = result.lessonsLearned || 
                 result.codeQuality?.improvements || 
                 result.keyInsights || 
                 [];
                 
  const lessonsList = Array.isArray(lessons) ? lessons : [lessons];
  
  filled = filled
    .replace('[교훈 카테고리 1]', '기술적 교훈')
    .replace('[교훈 카테고리 2]', '프로세스 개선');
    
  filled = filled
    .replace(/- \[구체적인 교훈\]/g, function(match, offset) {
      const beforeText = filled.substring(0, offset);
      const categoryCount = (beforeText.match(/### /g) || []).length;
      
      if (categoryCount === 3 && lessonsList[0]) { // 첫 번째 카테고리
        return `- ${lessonsList[0].substring(0, 100)}`;
      } else if (categoryCount === 4 && lessonsList[1]) { // 두 번째 카테고리
        return `- ${lessonsList[1].substring(0, 100)}`;
      }
      return '- 개선 필요';
    });
    
  // 재발 방지 - 간단히 2개만
  const preventions = result.preventionMeasures || 
                     result.furtherOptimizations ||
                     ['코드 리뷰 강화', '테스트 추가'];
                     
  const preventionsList = Array.isArray(preventions) ? preventions : [preventions];
  
  filled = filled
    .replace('[대책 1]', '코드 리뷰 강화')
    .replace('[대책 2]', '테스트 자동화');
    
  filled = filled
    .replace(/- \[구체적인 대책 내용\]/g, function(match, offset) {
      const beforeText = filled.substring(0, offset);
      const sectionCount = (beforeText.match(/### /g) || []).length;
      
      if (sectionCount === 5 && preventionsList[0]) { // 첫 번째 대책
        return `- ${preventionsList[0].substring(0, 100)}`;
      } else if (sectionCount === 6 && preventionsList[1]) { // 두 번째 대책
        return `- ${preventionsList[1].substring(0, 100)}`;
      }
      return '- 프로세스 개선';
    });
    
  // 마무리
  const conclusion = result.conclusions?.[0] || 
                    result.summary || 
                    '문제 해결 완료';
                    
  filled = filled.replace('[이번 문제 해결을 통해 얻은 인사이트와 감상]', conclusion);
  
  // 남은 플레이스홀더 처리
  filled = filled.replace(/\[[^\]]+\]/g, (match) => {
    if (match.includes('태그')) {
      const tags = [
        'debugging',
        ...(result.technicalDetails?.languages || []),
        ...(result.technicalDetails?.frameworks || [])
      ].filter(Boolean).slice(0, 3).join(', ');
      return tags || 'debugging';
    }
    return '';
  });
  
  return filled;
}

/**
 * 기술 튜토리얼 템플릿 채우기
 */
function fillTutorialTemplate(template: string, result: any): string {
  let filled = template;
  
  filled = filled
    .replace('[기술명]', result.topic?.main || result.title || '기술')
    .replace('[기술에 대한 간단한 설명]', result.summary || '');
  
  // 학습 목표
  if (result.keyConcepts) {
    const goals = result.keyConcepts
      .slice(0, 3)
      .map((concept: any) => `- [ ] ${concept.concept || concept}`)
      .join('\n');
    filled = filled.replace(/- \[ \]  \[목표 1\]\n- \[ \]  \[목표 2\]\n- \[ \]  \[목표 3\]/, goals);
  }
  
  // 코드 예제
  if (result.examples && result.examples.length > 0) {
    const example = result.examples[0];
    filled = filled.replace('[명령어들을 여기에 작성]', example.code || '# 예제 코드');
  }
  
  return filled;
}

/**
 * 프로젝트 회고록 템플릿 채우기
 */
function fillRetrospectiveTemplate(template: string, result: any): string {
  let filled = template;
  
  filled = filled
    .replace(/\[프로젝트명\]/g, result.title || '프로젝트')
    .replace('[프로젝트에 대한 간단한 설명]', result.summary || '');
  
  // 기술 스택
  const techStack = [
    ...(result.technicalDetails?.languages || []),
    ...(result.technicalDetails?.frameworks || []),
    ...(result.technicalDetails?.toolsUsed || [])
  ].join(', ');
  filled = filled.replace('[사용한 기술들]', techStack || '기술 스택');
  
  // 성과
  if (result.timeline?.completedGoals) {
    const achievements = result.timeline.completedGoals
      .map((goal: string) => `- **${goal}**: 완료`)
      .join('\n');
    filled = filled.replace(/- \*\*\[성과 1\]\*\*: \[구체적인 수치나 결과\]/, achievements);
  }
  
  return filled;
}

/**
 * 기술 비교 분석 템플릿 채우기
 */
function fillComparisonTemplate(template: string, result: any): string {
  let filled = template;
  
  // 제목에서 비교 대상 추출
  const titleMatch = result.title?.match(/(.+) vs (.+)/);
  if (titleMatch) {
    filled = filled
      .replace(/\[기술A\]/g, titleMatch[1])
      .replace(/\[기술B\]/g, titleMatch[2])
      .replace(/\[기술C\]/g, '기타');
  }
  
  filled = filled
    .replace('[비교 대상들에 대한 간단한 설명]', result.summary || '')
    .replace('[연도]', new Date().getFullYear().toString());
  
  // 장단점
  if (result.codeQuality) {
    const strengths = result.codeQuality.strengths.map((s: string) => `- ${s}`).join('\n');
    const weaknesses = result.codeQuality.improvements.map((i: string) => `- ${i}`).join('\n');
    
    filled = filled
      .replace(/- \[장점 1\]\n- \[장점 2\]/, strengths || '- 장점 분석 필요')
      .replace(/- \[단점 1\]\n- \[단점 2\]/, weaknesses || '- 개선점 분석 필요');
  }
  
  return filled;
}