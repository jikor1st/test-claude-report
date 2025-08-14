import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import type { ClaudeSession, ClaudeMessage } from './sessionAnalyzer';

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
}

/**
 * Claude Code CLI를 사용하여 세션 분석
 */
export async function analyzeWithClaudeCode(session: ClaudeSession): Promise<ClaudeAnalysisResult | null> {
  try {
    // Claude Code가 실행 중인지 확인
    const isClaudeRunning = await checkClaudeCodeRunning();
    if (!isClaudeRunning) {
      console.log('⚠️  Claude Code가 실행되고 있지 않습니다.');
      return null;
    }

    // 분석 프롬프트 생성
    const prompt = createAnalysisPrompt(session);
    
    // 프롬프트를 파일로 저장하고 Claude Code CLI로 전달
    const tempPromptFile = `/tmp/claude-analysis-${Date.now()}.txt`;
    await fs.writeFile(tempPromptFile, prompt, 'utf8');
    
    console.log('🤖 Claude AI로 세션 분석 중...');
    
    try {
      // Claude Code CLI를 통해 분석 실행
      const analysisCommand = `claude < "${tempPromptFile}"`;
      const { stdout, stderr } = await execAsync(analysisCommand, {
        maxBuffer: 1024 * 1024 * 50, // 50MB로 증가
        timeout: 120000, // 120초(2분) 타임아웃으로 증가
        encoding: 'utf8'
      });
      
      // 임시 파일 삭제
      try {
        await fs.unlink(tempPromptFile);
      } catch {
        // 삭제 실패 무시
      }

      if (stderr && !stderr.includes('Warning')) {
        console.error('Claude 분석 중 오류:', stderr);
      }
      
      if (!stdout || stdout.trim().length === 0) {
        console.error('Claude가 빈 응답을 반환했습니다.');
        return null;
      }

      // 결과 파싱
      const result = parseAnalysisResult(stdout);
      
      if (!result) {
        console.log('파싱 실패. 응답 샘플:', stdout.substring(0, 500));
      }
      
      return result;
    } catch (execError) {
      // 임시 파일 삭제
      try {
        await fs.unlink(tempPromptFile);
      } catch {
        // 삭제 실패 무시
      }
      throw execError;
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
    const { stdout } = await execAsync('ps aux | grep -i "claude" | grep -v grep');
    return stdout.includes('claude');
  } catch {
    return false;
  }
}

/**
 * 분석 프롬프트 생성
 */
function createAnalysisPrompt(session: ClaudeSession): string {
  // 모든 메시지를 포함하되, 너무 긴 메시지는 적절히 자름
  const conversationSummary = session.messages
    .map((msg: ClaudeMessage, idx: number) => {
      // 메시지 내용 정리 (특수 문자 제거)
      let cleanContent = msg.content
        .replace(/["""]/g, '"') // 특수 따옴표를 일반 따옴표로
        .replace(/\n/g, ' ') // 줄바꿈을 공백으로
        .replace(/\s+/g, ' ') // 연속된 공백을 하나로
        .trim();
      
      // 개별 메시지가 너무 길면 자르기 (1000자)
      if (cleanContent.length > 1000) {
        cleanContent = cleanContent.substring(0, 1000) + '...';
      }
      
      return `${idx + 1}. [${msg.role}]: ${cleanContent}`;
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
function parseAnalysisResult(response: string): ClaudeAnalysisResult | null {
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
    
    // 기본값 설정
    return {
      title: result.title || '제목 없음',
      summary: result.summary || '요약 없음',
      keyInsights: result.keyInsights || [],
      technicalDetails: {
        languages: result.technicalDetails?.languages || [],
        frameworks: result.technicalDetails?.frameworks || [],
        toolsUsed: result.technicalDetails?.toolsUsed || []
      },
      codeQuality: {
        strengths: result.codeQuality?.strengths || [],
        improvements: result.codeQuality?.improvements || []
      },
      timeline: {
        mainTasks: result.timeline?.mainTasks || [],
        completedGoals: result.timeline?.completedGoals || [],
        challenges: result.timeline?.challenges || []
      }
    };
  } catch (error) {
    console.error('응답 파싱 실패:', error);
    if (error instanceof SyntaxError) {
      console.error('JSON 파싱 오류 위치:', error.message);
    }
    return null;
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