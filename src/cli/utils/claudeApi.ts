import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import type { ClaudeSession, ClaudeMessage } from './sessionAnalyzer';
import { TemplateSelector } from './templates/selector';
import { templatePrompts } from './templates/prompts';
import { TemplateType } from './templates/types';

const execAsync = promisify(exec);

interface ClaudeAnalysisResult {
  title: string;
  summary: string;
  keyInsights: string[];
  technicalDetails: {
    languages: string[];
    frameworks: string[];
    toolsUsed: string[];
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
  // Additional properties for bug-fix and debugging templates
  bugDescription?: any;
  debuggingProcess?: any;
  solution?: any;
  problematicCode?: any;
}

/**
 * Claude Code CLI를 사용하여 세션 분석 (2단계 분석)
 */
export async function analyzeWithClaudeCode(session: ClaudeSession): Promise<{ analysis: ClaudeAnalysisResult; templateType: TemplateType } | null> {
  try {
    // Claude Code가 실행 중인지 확인
    const isClaudeRunning = await checkClaudeCodeRunning();
    if (!isClaudeRunning) {
      console.log('⚠️  Claude Code가 실행되고 있지 않습니다.');
      return null;
    }

    // 세션 내용 추출
    const sessionContent = extractSessionContent(session);
    
    // 템플릿 자동 선택
    const templateAnalysis = await TemplateSelector.selectTemplate(sessionContent);
    console.log(`📝 선택된 템플릿: ${templateAnalysis.templateType} (신뢰도: ${(templateAnalysis.confidence * 100).toFixed(0)}%)`);
    console.log(`   이유: ${templateAnalysis.reason}`);

    // 분석 프롬프트 생성 (선택된 템플릿 사용)
    const prompt = createAnalysisPromptWithTemplate(session, templateAnalysis.templateType);
    
    // 프롬프트 크기 체크 및 제한
    const maxPromptSize = 30000; // 30KB 제한
    let finalPrompt = prompt;
    if (prompt.length > maxPromptSize) {
      console.log(`⚠️  프롬프트가 너무 깁니다 (${prompt.length}자). 축소합니다...`);
      // 프롬프트 축소 - 메시지 수를 줄임
      const reducedSession = {
        ...session,
        messages: session.messages.slice(-20) // 최근 20개 메시지만 사용
      };
      finalPrompt = createAnalysisPromptWithTemplate(reducedSession, templateAnalysis.templateType);
    }
    
    // 프롬프트를 파일로 저장하고 Claude Code CLI로 전달
    const tempPromptFile = `/tmp/claude-analysis-${Date.now()}.txt`;
    await fs.writeFile(tempPromptFile, finalPrompt, 'utf8');
    
    console.log('🤖 Claude AI로 세션 분석 중...');
    console.log(`   프롬프트 크기: ${finalPrompt.length}자`);
    
    try {
      // Claude Code CLI를 통해 분석 실행 - --print 옵션 사용
      let analysisCommand: string;
      const execOptions: any = {
        maxBuffer: 1024 * 1024 * 50, // 50MB
        timeout: 180000, // 3분
        encoding: 'utf8',
        shell: '/bin/bash'
      };
      
      // cat으로 파일을 읽어서 claude에 파이프
      analysisCommand = `cat "${tempPromptFile}" | claude --print`;
      
      console.log(`   실행 명령: cat [파일] | claude --print`);
      const { stdout, stderr } = await execAsync(analysisCommand, execOptions);
      
      // 임시 파일 삭제
      try {
        await fs.unlink(tempPromptFile);
      } catch {
        // 삭제 실패 무시
      }

      if (stderr && !stderr.includes('Warning')) {
        console.error('Claude 분석 중 오류:', stderr);
      }
      
      const stdoutStr = typeof stdout === 'string' ? stdout : stdout.toString();
      if (!stdoutStr || stdoutStr.trim().length === 0) {
        console.error('Claude가 빈 응답을 반환했습니다.');
        return null;
      }

      // 결과 파싱 (템플릿 타입에 따라 다르게 처리)
      const result = parseAnalysisResult(stdoutStr, templateAnalysis.templateType);
      
      if (!result) {
        console.log('파싱 실패. 응답 샘플:', stdoutStr.substring(0, 500));
        return null;
      }
      
      // 2단계 분석: 템플릿에 따라 추가 정보 추출
      const enhancedResult = await performSecondStageAnalysis(result, session, templateAnalysis.templateType);
      
      return { analysis: enhancedResult, templateType: templateAnalysis.templateType };
    } catch (execError: any) {
      // 임시 파일 삭제
      try {
        await fs.unlink(tempPromptFile);
      } catch {
        // 삭제 실패 무시
      }
      
      console.error('Claude CLI 실행 실패:', execError);
      
      // 에러 상세 정보 출력
      if (execError.code === 'ENOENT') {
        console.error('⚠️  Claude CLI가 설치되어 있지 않습니다.');
        console.error('   설치 방법: npm install -g @anthropic-ai/claude-cli');
      } else if (execError.signal === 'SIGTERM' || execError.killed) {
        console.error('⚠️  Claude CLI가 타임아웃되었습니다. 프롬프트가 너무 길 수 있습니다.');
        
        // 더 짧은 세션으로 재시도
        if (session.messages.length > 10) {
          console.log('💡 더 짧은 세션으로 재시도합니다...');
          const shortSession = {
            ...session,
            messages: session.messages.slice(-10) // 최근 10개 메시지만
          };
          return analyzeWithClaudeCode(shortSession);
        }
      } else if (execError.code) {
        console.error(`⚠️  Claude CLI 종료 코드: ${execError.code}`);
        if (execError.stderr) {
          console.error(`   에러 출력: ${execError.stderr}`);
        }
      }
      
      return null;
    }
  } catch (error) {
    console.error('Claude 분석 실패:', error);
    return null;
  }
}

/**
 * Claude Code 실행 여부 확인
 */
async function checkClaudeCodeRunning(): Promise<boolean> {
  try {
    // claude 명령어가 사용 가능한지 확인
    const { stdout } = await execAsync('which claude', { 
      timeout: 5000 
    });
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * 세션 내용 추출
 */
function extractSessionContent(session: ClaudeSession): string {
  return session.messages
    .map((msg: ClaudeMessage) => `[${msg.role}]: ${msg.content}`)
    .join('\n');
}

/**
 * 템플릿을 사용한 분석 프롬프트 생성
 */
function createAnalysisPromptWithTemplate(session: ClaudeSession, templateType: TemplateType): string {
  // 구조화된 데이터 먼저 추출
  const { 
    extractStructuredPatches,
    extractTodos,
    extractToolUsage,
    extractErrorMessages,
    extractSolutionMessages,
    findBeforeAfterCode
  } = require('./codeExtractor');
  
  const structuredPatches = extractStructuredPatches(session.messages);
  const todos = extractTodos(session.messages);
  const toolUsages = extractToolUsage(session.messages);
  const errorMessages = extractErrorMessages(session.messages);
  const solutionMessages = extractSolutionMessages(session.messages);
  const { before, after } = findBeforeAfterCode(session.messages);
  
  // 핵심 메시지만 선별 (구조화된 데이터가 있는 메시지 우선)
  const importantMessages = session.messages.filter((msg, idx) => {
    // 첫 번째와 마지막 메시지는 항상 포함
    if (idx === 0 || idx === session.messages.length - 1) return true;
    
    // 에러나 해결책이 포함된 메시지
    if (errorMessages.some((e: any) => e.messageIndex === idx)) return true;
    if (solutionMessages.some((s: any) => s.messageIndex === idx)) return true;
    
    // 도구 사용이 포함된 메시지
    if (toolUsages.some((t: any) => msg.timestamp === t.timestamp)) return true;
    
    // 코드 블록이 포함된 메시지
    if (msg.content.includes('```')) return true;
    
    return false;
  });
  
  // 구조화된 요약 생성
  let structuredSummary = '';
  
  if (todos.length > 0) {
    structuredSummary += '\n\n## 주요 작업 (TODOs):\n';
    todos.forEach((todo: any, idx: number) => {
      if (idx < 10) { // 최대 10개만
        structuredSummary += `- [${todo.status}] ${todo.content}\n`;
      }
    });
  }
  
  if (structuredPatches.length > 0) {
    structuredSummary += '\n\n## 코드 변경사항:\n';
    structuredPatches.forEach((patch: any, idx: number) => {
      if (idx < 5) { // 최대 5개만
        structuredSummary += `\n### ${patch.file}\n`;
        structuredSummary += '```' + (patch.language || '') + '\n';
        structuredSummary += patch.patch.substring(0, 500); // 패치 일부만
        if (patch.patch.length > 500) structuredSummary += '\n... (생략)';
        structuredSummary += '\n```\n';
      }
    });
  }
  
  if (errorMessages.length > 0) {
    structuredSummary += '\n\n## 발견된 에러:\n';
    errorMessages.slice(0, 5).forEach((err: any) => {
      structuredSummary += `- ${err.matchedText}\n`;
    });
  }
  
  if (before || after) {
    structuredSummary += '\n\n## 코드 변경 전후:\n';
    if (before) {
      structuredSummary += '\n### 변경 전:\n' + before + '\n';
    }
    if (after) {
      structuredSummary += '\n### 변경 후:\n' + after + '\n';
    }
  }
  
  // 중요 메시지 요약 (구조화된 데이터를 제외한 컨텍스트)
  const contextMessages = importantMessages
    .map((msg: ClaudeMessage, idx: number) => {
      let content = msg.content;
      
      // 도구 사용 부분 제거 (이미 구조화된 데이터로 추출됨)
      content = content.replace(/<function_calls>[\s\S]*?<\/antml:function_calls>/g, '[도구 사용]');
      
      // 긴 코드 블록 축약
      content = content.replace(/```[\s\S]{500,}?```/g, '```\n[긴 코드 블록 - 구조화된 데이터 참조]\n```');
      
      // 메시지 길이 제한
      if (content.length > 500) {
        content = content.substring(0, 500) + '... [생략]';
      }
      
      return `[${msg.role}]: ${content}`;
    })
    .join('\n\n---\n\n');
  
  // 최종 프롬프트 생성
  const promptContent = `
세션 요약:
- 총 메시지: ${session.messages.length}개
- 중요 메시지: ${importantMessages.length}개
- 도구 사용: ${toolUsages.length}회
- 코드 변경: ${structuredPatches.length}개 파일

${structuredSummary}

## 주요 대화 내용:
${contextMessages}
`;
  
  const promptGenerator = templatePrompts[templateType];
  return promptGenerator(promptContent);
}

/**
 * 분석 프롬프트 생성 (기존 함수, 폴백용)
 */
function createAnalysisPrompt(session: ClaudeSession): string {
  // 모든 메시지를 포함하되, 너무 긴 메시지는 적절히 자름
  const conversationSummary = session.messages
    .map((msg: ClaudeMessage, idx: number) => {
      let cleanContent = msg.content;
      
      // 코드 블록 보존
      const codeBlockRegex = /```[\s\S]*?```/g;
      const codeBlocks = cleanContent.match(codeBlockRegex) || [];
      
      // 코드 블록을 제외한 텍스트 처리
      let processedContent = cleanContent;
      codeBlocks.forEach((block, i) => {
        processedContent = processedContent.replace(block, `__CODE_BLOCK_${i}__`);
      });
      
      // 텍스트 부분만 정리
      processedContent = processedContent
        .replace(/["""]/g, '"')
        .replace(/\n+/g, ' ') // 기존 프롬프트는 한 줄로 표시
        .replace(/\s+/g, ' ')
        .trim();
      
      // 코드 블록 복원 (축약된 형태로)
      codeBlocks.forEach((block, i) => {
        // 코드 블록의 첫 줄만 표시
        const firstLine = block.split('\n')[0] + '...```';
        processedContent = processedContent.replace(`__CODE_BLOCK_${i}__`, firstLine);
      });
      
      // 개별 메시지가 너무 길면 자르기 (2000자로 증가)
      if (processedContent.length > 2000) {
        processedContent = processedContent.substring(0, 2000) + '...';
      }
      
      return `${idx + 1}. [${msg.role}]: ${processedContent}`;
    })
    .join('\n');

  // 대용량 세션인 경우 경고 메시지 추가
  const isLargeSession = session.messages.length > 100;
  const warningMessage = isLargeSession 
    ? `\n⚠️ 주의: 이 세션은 ${session.messages.length}개의 메시지를 포함하는 대용량 세션입니다. 전체 대화의 맥락을 고려하여 분석해주세요.\n` 
    : '';

  return `다음 개발 세션 대화를 분석하고 구조화된 JSON 형식으로 인사이트를 제공해주세요.

세션 정보:
- 세션 ID: ${session.id}
- 생성: ${new Date(session.created).toLocaleString('ko-KR')}
- 마지막 수정: ${new Date(session.updated).toLocaleString('ko-KR')}
- 총 메시지 수: ${session.messages.length}
${warningMessage}
전체 대화 내용:
${conversationSummary}

아래의 정확한 JSON 구조로만 응답해주세요. 설명이나 추가 텍스트 없이 오직 JSON만 출력하세요.
JSON 내의 모든 문자열 값은 큰따옴표(")를 사용하고, 문자열 내부의 따옴표는 반드시 이스케이프(\\")해주세요.

{
  "title": "세션의 주요 주제를 나타내는 제목",
  "summary": "전체 세션의 핵심 내용 요약 (2-3문장)",
  "keyInsights": [
    "핵심 인사이트 1",
    "핵심 인사이트 2",
    "핵심 인사이트 3"
  ],
  "technicalDetails": {
    "languages": ["사용된 프로그래밍 언어들"],
    "frameworks": ["사용된 프레임워크들"],
    "toolsUsed": ["사용된 도구들"]
  },
  "codeQuality": {
    "strengths": ["코드의 장점들"],
    "improvements": ["개선할 수 있는 부분들"]
  },
  "timeline": {
    "mainTasks": ["수행한 주요 작업들"],
    "completedGoals": ["달성한 목표들"],
    "challenges": ["직면했던 도전과제들"]
  }
}`;
}

/**
 * Claude 응답 파싱 (더 안정적인 버전)
 */
function parseAnalysisResult(response: string, templateType?: TemplateType): ClaudeAnalysisResult | null {
  try {
    // 여러 가지 JSON 추출 방법 시도
    let jsonStr: string | null = null;
    
    // 방법 1: 완전한 JSON 객체 찾기 (중첩된 중괄호 처리)
    const jsonMatch = response.match(/\{(?:[^{}]|(?:\{[^{}]*\}))*\}/g);
    if (jsonMatch) {
      // 가장 큰 JSON 객체 찾기
      jsonStr = jsonMatch.reduce((longest, current) => 
        current.length > longest.length ? current : longest
      );
    }
    
    // 방법 2: JSON 코드 블록 찾기
    if (!jsonStr) {
      const codeBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch && codeBlockMatch[1]) {
        jsonStr = codeBlockMatch[1].trim();
      }
    }
    
    // 방법 3: 단순 중괄호 매칭
    if (!jsonStr) {
      const simpleMatch = response.match(/\{[\s\S]*\}/);
      if (simpleMatch) {
        jsonStr = simpleMatch[0];
      }
    }
    
    if (!jsonStr) {
      console.error('JSON 형식의 응답을 찾을 수 없습니다.');
      console.log('응답 내용:', response.substring(0, 500) + '...');
      return null;
    }

    // JSON 문자열 정리
    jsonStr = jsonStr
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // 제어 문자 제거
      .replace(/,\s*}/g, '}') // 마지막 쉼표 제거
      .replace(/,\s*]/g, ']'); // 배열의 마지막 쉼표 제거
    
    const result = JSON.parse(jsonStr);
    
    // 템플릿 타입에 따라 결과를 표준 형식으로 변환
    return convertToStandardFormat(result, templateType);
  } catch (error) {
    console.error('응답 파싱 실패:', error);
    if (error instanceof SyntaxError) {
      console.error('JSON 파싱 오류 위치:', error.message);
    }
    return null;
  }
}

/**
 * 템플릿별 응답을 표준 형식으로 변환
 */
function convertToStandardFormat(result: any, templateType?: TemplateType): ClaudeAnalysisResult {
  // 기본 형식 (템플릿이 없거나 general인 경우)
  if (!templateType || templateType === 'general') {
    return {
      title: result.title || '제목 없음',
      summary: result.summary || '요약 없음',
      keyInsights: result.keyInsights || result.mainTopics || [],
      technicalDetails: {
        languages: result.technicalDetails?.languages || [],
        frameworks: result.technicalDetails?.frameworks || [],
        toolsUsed: result.technicalDetails?.tools || result.technicalDetails?.toolsUsed || []
      },
      codeQuality: {
        strengths: result.codeQuality?.strengths || [],
        improvements: result.codeQuality?.improvements || []
      },
      timeline: {
        mainTasks: result.timeline?.mainTasks || result.discussions?.map((d: any) => d.topic) || [],
        completedGoals: result.timeline?.completedGoals || result.conclusions || [],
        challenges: result.timeline?.challenges || []
      }
    };
  }

  // 템플릿별 변환 로직
  switch (templateType) {
    case 'bug-fix':
      return {
        title: result.title || '버그 수정',
        summary: result.summary || result.bugDescription?.symptoms || '버그 수정 내용',
        keyInsights: [
          `문제: ${result.bugDescription?.symptoms || ''}`,
          `원인: ${result.rootCause?.analysis || ''}`,
          `해결: ${result.solution?.approach || ''}`
        ].filter(Boolean),
        technicalDetails: {
          languages: [],
          frameworks: [],
          toolsUsed: []
        },
        codeQuality: {
          strengths: result.verification?.results ? [`검증 완료: ${result.verification.results}`] : [],
          improvements: result.preventionMeasures ? [result.preventionMeasures] : []
        },
        timeline: {
          mainTasks: [result.solution?.implementation || '버그 수정 구현'].filter(Boolean),
          completedGoals: ['버그 해결'],
          challenges: [result.rootCause?.whyItHappened || ''].filter(Boolean)
        }
      };

    case 'feature-dev':
      return {
        title: result.title || '기능 개발',
        summary: result.summary || result.requirements?.businessGoal || '새 기능 구현',
        keyInsights: [
          ...(result.requirements?.functionalRequirements || []),
          ...(result.designApproach?.keyDecisions || [])
        ],
        technicalDetails: {
          languages: result.technicalDetails?.languages || [],
          frameworks: result.technicalDetails?.frameworks || [],
          toolsUsed: result.technicalDetails?.libraries || []
        },
        codeQuality: {
          strengths: result.testResults?.unitTests ? [`테스트 완료: ${result.testResults.unitTests}`] : [],
          improvements: result.futureEnhancements || []
        },
        timeline: {
          mainTasks: result.implementation?.mainComponents || [],
          completedGoals: ['기능 구현 완료'],
          challenges: []
        }
      };

    case 'code-review':
      return {
        title: result.title || '코드 리뷰',
        summary: result.summary || '코드 품질 검토',
        keyInsights: [
          ...(result.findings?.critical || []),
          ...(result.findings?.major || [])
        ],
        technicalDetails: {
          languages: [],
          frameworks: [],
          toolsUsed: []
        },
        codeQuality: {
          strengths: result.positives || [],
          improvements: [
            ...(result.improvements?.codeQuality || []),
            ...(result.improvements?.performance || [])
          ]
        },
        timeline: {
          mainTasks: result.reviewTarget?.files || [],
          completedGoals: ['코드 리뷰 완료'],
          challenges: result.codeSmells || []
        }
      };

    case 'debugging':
      return {
        title: result.title || '디버깅',
        summary: result.summary || result.symptoms?.description || '문제 해결',
        keyInsights: [
          `증상: ${result.symptoms?.description || ''}`,
          `원인: ${result.rootCause?.description || ''}`,
          `해결: ${result.solution?.approach || ''}`
        ].filter(Boolean),
        technicalDetails: {
          languages: [],
          frameworks: [],
          toolsUsed: result.toolsUsed || []
        },
        codeQuality: {
          strengths: [],
          improvements: result.lessonsLearned || []
        },
        timeline: {
          mainTasks: result.debuggingProcess?.map((p: any) => p.action) || [],
          completedGoals: ['문제 해결'],
          challenges: []
        }
      };

    case 'performance':
      return {
        title: result.title || '성능 최적화',
        summary: result.summary || '성능 개선 작업',
        keyInsights: result.optimizations?.map((o: any) => `${o.technique}: ${o.impact}`) || [],
        technicalDetails: {
          languages: [],
          frameworks: [],
          toolsUsed: []
        },
        codeQuality: {
          strengths: [`성능 개선: ${result.measurements?.after?.improvements?.join(', ') || ''}`].filter(Boolean),
          improvements: result.furtherOptimizations || []
        },
        timeline: {
          mainTasks: result.optimizations?.map((o: any) => o.technique) || [],
          completedGoals: ['성능 최적화 완료'],
          challenges: result.tradeoffs || []
        }
      };

    default:
      // 나머지 템플릿들은 기본 변환 사용
      return convertToStandardFormat(result, 'general');
  }
}

/**
 * 2단계 상세 분석 수행
 */
async function performSecondStageAnalysis(
  initialResult: ClaudeAnalysisResult,
  session: ClaudeSession,
  templateType: TemplateType
): Promise<ClaudeAnalysisResult> {
  try {
    // codeExtractor 모듈 임포트
    const { 
      extractCodeBlocks, 
      extractErrorMessages, 
      extractSolutionMessages,
      findBeforeAfterCode,
      extractDebuggingSteps,
      extractFilePaths,
      extractStructuredPatches,
      extractTodos,
      extractToolUsage
    } = await import('./codeExtractor');
    
    // 공통 데이터 추출
    const structuredPatches = extractStructuredPatches(session.messages);
    const todos = extractTodos(session.messages);
    const toolUsages = extractToolUsage(session.messages);
    
    console.log('🔍 구조화된 데이터 추출:', {
      patches: structuredPatches.length,
      todos: todos.length,
      tools: toolUsages.length
    });
    
    // 템플릿 타입에 따라 다른 추출 전략 사용
    switch (templateType) {
      case 'bug-fix':
      case 'debugging': {
        // 에러 메시지 추출
        const errorMessages = extractErrorMessages(session.messages);
        const solutionMessages = extractSolutionMessages(session.messages);
        const { before, after } = findBeforeAfterCode(session.messages);
        const debuggingSteps = extractDebuggingSteps(session.messages);
        
        // 구조화된 패치에서 코드 변경 내용 가져오기
        let enhancedBefore = before;
        let enhancedAfter = after;
        
        if (structuredPatches.length > 0) {
          // 첫 번째 패치에서 before/after 추출
          const firstPatch = structuredPatches[0];
          if (firstPatch.patch.includes('---') && firstPatch.patch.includes('+++')) {
            const patchLines = firstPatch.patch.split('\n');
            const minusLines = patchLines.filter(line => line.startsWith('-') && !line.startsWith('---')).map(line => line.substring(1));
            const plusLines = patchLines.filter(line => line.startsWith('+') && !line.startsWith('+++')).map(line => line.substring(1));
            
            if (minusLines.length > 0 && !enhancedBefore) {
              enhancedBefore = '```' + (firstPatch.language || '') + '\n' + minusLines.join('\n') + '\n```';
            }
            if (plusLines.length > 0 && !enhancedAfter) {
              enhancedAfter = '```' + (firstPatch.language || '') + '\n' + plusLines.join('\n') + '\n```';
            }
          }
        }
        
        // TODO에서 주요 작업 추출
        const mainTasks = todos
          .filter(todo => todo.status === 'completed' || todo.priority === 'high')
          .map(todo => todo.content);
        
        // 디버깅 로그 추가
        console.log('🔍 2단계 분석 - 에러 메시지:', errorMessages.length, '개');
        console.log('🔍 2단계 분석 - 코드 찾기:', { before: !!enhancedBefore, after: !!enhancedAfter });
        console.log('🔍 2단계 분석 - 디버깅 스텝:', debuggingSteps.length, '개');
        console.log('🔍 2단계 분석 - 구조화된 패치:', structuredPatches.length, '개');
        console.log('🔍 2단계 분석 - TODO 작업:', mainTasks.length, '개');
        
        // 초기 결과에 추가 정보 병합
        const enhancedResult = {
          ...initialResult,
          // 에러 정보 강화
          bugDescription: {
            symptoms: errorMessages[0]?.matchedText || initialResult.summary,
            ...initialResult.bugDescription
          },
          // 디버깅 과정 추가
          debuggingProcess: debuggingSteps.length > 0 ? debuggingSteps : 
                           initialResult.debuggingProcess,
          // 해결책 코드 추가
          solution: {
            ...initialResult.solution,
            codeChanges: enhancedAfter || initialResult.solution?.codeChanges,
            approach: solutionMessages[0]?.matchedText || initialResult.solution?.approach
          },
          // 문제 코드 추가  
          problematicCode: enhancedBefore || initialResult.problematicCode || undefined,
          // 타임라인에 TODO 작업 추가
          timeline: {
            ...initialResult.timeline,
            mainTasks: mainTasks.length > 0 ? mainTasks : initialResult.timeline?.mainTasks || []
          }
        };
        
        console.log('🔍 2단계 분석 완료 - problematicCode:', !!enhancedResult.problematicCode);
        console.log('🔍 2단계 분석 완료 - solution.codeChanges:', !!enhancedResult.solution?.codeChanges);
        
        return enhancedResult as any;
      }
      
      case 'feature-dev': {
        // 코드 블록 추출
        const codeBlocks = extractCodeBlocks(session.messages);
        const filePaths = extractFilePaths(session.messages);
        
        // 구조화된 패치에서 파일 경로와 코드 추출
        const patchFiles = structuredPatches.map(p => p.file);
        const allFiles = [...new Set([...filePaths, ...patchFiles])];
        
        // TODO에서 주요 작업 추출
        const completedTasks = todos
          .filter(todo => todo.status === 'completed')
          .map(todo => todo.content);
        
        return {
          ...initialResult,
          implementation: {
            mainComponents: allFiles.slice(0, 10),
            codeExamples: structuredPatches.length > 0 
              ? structuredPatches.map(p => p.patch).slice(0, 3)
              : Array.from(codeBlocks.values()).flat().slice(0, 3)
          },
          timeline: {
            ...initialResult.timeline,
            mainTasks: completedTasks.length > 0 ? completedTasks : initialResult.timeline?.mainTasks || [],
            completedGoals: todos.filter(t => t.status === 'completed').map(t => t.content)
          }
        } as any;
      }
      
      case 'code-review': {
        const codeBlocks = extractCodeBlocks(session.messages);
        const { before, after } = findBeforeAfterCode(session.messages);
        
        return {
          ...initialResult,
          reviewTarget: {
            files: extractFilePaths(session.messages),
            beforeCode: before,
            afterCode: after
          }
        } as any;
      }
      
      default:
        // 기본적으로 코드 블록만 추가
        const codeBlocks = extractCodeBlocks(session.messages);
        return {
          ...initialResult,
          codeExamples: Array.from(codeBlocks.values()).flat().slice(0, 5)
        } as any;
    }
  } catch (error) {
    console.error('2단계 분석 중 오류:', error);
    // 오류 발생 시 원본 결과 반환
    return initialResult;
  }
}

/**
 * 웹 OAuth 로그인을 위한 URL 생성
 */
export function getClaudeOAuthUrl(): string {
  // Claude OAuth 설정 (실제 구현 시 Anthropic OAuth 엔드포인트 사용)
  const clientId = process.env.CLAUDE_OAUTH_CLIENT_ID || 'your-client-id';
  const redirectUri = encodeURIComponent('http://localhost:3000/auth/callback');
  const scope = encodeURIComponent('read write');
  
  return `https://claude.ai/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
}

/**
 * OAuth 콜백 처리
 */
export async function handleOAuthCallback(code: string): Promise<string | null> {
  // OAuth 토큰 교환 로직
  // 실제 구현 시 Anthropic OAuth 토큰 엔드포인트 사용
  try {
    // 임시 구현
    console.log('OAuth callback with code:', code);
    return 'mock-access-token';
  } catch (error) {
    console.error('OAuth 토큰 교환 실패:', error);
    return null;
  }
}