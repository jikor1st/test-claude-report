import { promises as fs } from 'fs';
import { join, basename } from 'path';
import type { SessionReport, DailyReport } from '../../shared/types';
import { safeStringify, extractTextContent } from '../../shared/utils';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ClaudeSession {
  id: string;
  name: string;
  created: string;
  updated: string;
  messages: ClaudeMessage[];
}

// Claude Desktop이 제공한 정확한 타입 정의
interface BaseMessage {
  type: 'user' | 'assistant' | 'system' | 'result' | 'thinking' | 'summary';
  session_id?: string;
  sessionId?: string; // 기존 호환성
  timestamp?: string;
  parentUuid?: string;
  uuid?: string;
}

interface UserMessage extends BaseMessage {
  type: 'user';
  message: {
    role: 'user';
    content: string | Array<{type: 'text'; text: string}> | Array<{type: 'tool_result'; tool_use_id: string}>;
  };
  toolUseResult?: any;
}

interface AssistantMessage extends BaseMessage {
  type: 'assistant';
  message: {
    role: 'assistant';
    content: Array<{type: 'text'; text: string}> | Array<{type: 'tool_use'; id: string; name: string; input: any}>;
  };
}

interface SystemMessage extends BaseMessage {
  type: 'system';
  subtype: 'init';
  cwd?: string;
  tools?: string[];
  mcp_servers?: Record<string, any>;
}

interface ResultMessage extends BaseMessage {
  type: 'result';
  subtype: 'success' | 'error_max_turns' | 'error_during_execution';
  duration_ms?: number;
  total_cost_usd?: number;
  num_turns?: number;
}

interface SummaryMessage extends BaseMessage {
  type: 'summary';
  summary: string;
  leafUuid?: string;
}

interface ThinkingMessage extends BaseMessage {
  type: 'thinking';
  content?: string;
}

type ClaudeCodeLine = UserMessage | AssistantMessage | SystemMessage | ResultMessage | SummaryMessage | ThinkingMessage;

export async function findSessionFiles(projectPath: string): Promise<string[]> {
  try {
    const files: string[] = [];
    
    // 프로젝트 루트 디렉토리 직접 스캔
    try {
      const entries = await fs.readdir(projectPath, { withFileTypes: true });
      console.log(`Scanning directory: ${projectPath}`);
      
      for (const entry of entries) {
        const fullPath = join(projectPath, entry.name);
        
        if (entry.isFile()) {
          // JSONL 파일 우선 확인
          if (entry.name.endsWith('.jsonl')) {
            console.log(`Found JSONL file: ${entry.name}`);
            files.push(fullPath);
          }
          // JSON 파일
          else if (entry.name.endsWith('.json')) {
            console.log(`Found JSON file: ${entry.name}`);
            files.push(fullPath);
          }
          // TXT 파일
          else if (entry.name.endsWith('.txt')) {
            console.log(`Found TXT file: ${entry.name}`);
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${projectPath}:`, error);
    }
    
    // 하위 디렉토리도 확인
    const subDirs = ['.claude', 'sessions', '.sessions', 'conversations', '.conversations'];
    for (const subDir of subDirs) {
      const subPath = join(projectPath, subDir);
      try {
        await fs.access(subPath);
        const entries = await fs.readdir(subPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = join(subPath, entry.name);
          if (entry.isFile() && (entry.name.endsWith('.jsonl') || entry.name.endsWith('.json') || entry.name.endsWith('.txt'))) {
            console.log(`Found file in ${subDir}: ${entry.name}`);
            files.push(fullPath);
          }
        }
      } catch (error) {
        // 하위 디렉토리가 없으면 무시
      }
    }
    
    console.log(`Total files found: ${files.length}`);
    
    // 실제 세션 파일인지 확인
    const sessionFiles: string[] = [];
    for (const file of files) {
      const isSession = await isSessionFile(file);
      if (isSession) {
        console.log(`Confirmed as session file: ${basename(file)}`);
        sessionFiles.push(file);
      } else {
        console.log(`Not a session file: ${basename(file)}`);
      }
    }
    
    console.log(`Total Claude session files identified: ${sessionFiles.length}`);
    return sessionFiles;
  } catch (error) {
    console.error('Error finding session files:', error);
    return [];
  }
}

async function isSessionFile(filePath: string): Promise<boolean> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    
    // JSONL 형식 확인 - Claude Code의 실제 형식
    if (filePath.endsWith('.jsonl')) {
      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length > 0) {
        try {
          // 첫 번째 줄만 확인
          const firstLine = JSON.parse(lines[0]);
          
          // Claude Desktop/Code JSONL 형식: type 필드 확인
          if (firstLine.type) {
            const validTypes = ['user', 'assistant', 'system', 'result', 'thinking', 'summary'];
            if (validTypes.includes(firstLine.type) || firstLine.message || firstLine.session_id || firstLine.sessionId) {
              console.log('Found Claude Desktop/Code JSONL format');
              return true;
            }
          }
          
          console.log('JSONL first line structure:', Object.keys(firstLine));
        } catch (e) {
          console.error('Failed to parse JSONL first line:', e);
          return false;
        }
      }
    }
    
    // JSON 형식 확인
    try {
      const data = JSON.parse(content);
      
      // 배열인 경우
      if (Array.isArray(data)) {
        if (data.length > 0) {
          const firstItem = data[0];
          if (firstItem.role || firstItem.content || (firstItem.type && firstItem.message)) {
            return true;
          }
        }
      }
      
      // 객체인 경우
      if (typeof data === 'object' && data !== null) {
        if (data.messages || data.conversation || data.history || data.turns) {
          return true;
        }
      }
      
      return false;
    } catch {
      // JSON 파싱 실패 시 텍스트 형식 확인
      if (content.includes('Human:') || content.includes('Assistant:') || content.includes('User:')) {
        return true;
      }
      return false;
    }
  } catch (error) {
    console.error(`Error checking session file ${filePath}:`, error);
    return false;
  }
}

export async function parseSessionFile(filePath: string): Promise<ClaudeSession | null> {
  try {
    console.log(`\nParsing session file: ${filePath}`);
    const content = await fs.readFile(filePath, 'utf-8');
    const stats = await fs.stat(filePath);
    
    let messages: ClaudeMessage[] = [];
    let sessionName = basename(filePath, '.jsonl').replace('.json', '').replace('.txt', '');
    let sessionCreated = stats.birthtime;
    let sessionUpdated = stats.mtime;
    let sessionId: string | null = null;
    
    // JSONL 형식 파싱 - Claude Code 형식
    if (filePath.endsWith('.jsonl')) {
      const lines = content.split('\n').filter(line => line.trim());
      console.log(`JSONL file has ${lines.length} lines`);
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line) as ClaudeCodeLine;
          
          // 세션 ID 추출 (두 가지 형식 모두 지원)
          const sid = data.session_id || data.sessionId;
          if (sid && !sessionId) {
            sessionId = sid;
          }
          
          // 타임스탬프로 세션 시간 업데이트
          if (data.timestamp) {
            const timestamp = new Date(data.timestamp);
            if (timestamp < sessionCreated) sessionCreated = timestamp;
            if (timestamp > sessionUpdated) sessionUpdated = timestamp;
          }
          
          // 메시지 타입별 처리
          if (data.type === 'user' && 'message' in data) {
            let content = '';
            if (typeof data.message.content === 'string') {
              content = data.message.content;
            } else if (Array.isArray(data.message.content)) {
              // content가 배열인 경우 처리
              const parts: string[] = [];
              data.message.content.forEach((item: any) => {
                if (item.type === 'text' && item.text) {
                  parts.push(item.text);
                } else if (item.type === 'tool_result') {
                  // tool_result 처리
                  const resultParts = [`[Tool Result`];
                  if (item.tool_use_id) resultParts.push(`ID: ${item.tool_use_id}`);
                  
                  // 실제 결과는 toolUseResult 필드나 content 필드에 있을 수 있음
                  const result = (data as UserMessage).toolUseResult || item.content || item.result;
                  if (result) {
                    const resultStr = typeof result === 'string' 
                      ? result 
                      : safeStringify(result, 2);
                    resultParts.push(`Result: ${resultStr}`);
                  }
                  parts.push(resultParts.join(' | ') + ']');
                }
              });
              content = parts.join('\n');
            } else if (data.message.content && typeof data.message.content === 'object') {
              // 객체인 경우 텍스트 추출 시도
              content = extractTextContent(data.message.content);
              if (!content) {
                console.warn('Unexpected content format for user message:', safeStringify(data.message.content));
              }
            }
            
            // toolUseResult가 있는 경우 추가
            if (data.toolUseResult && !content.includes('[Tool Result:')) {
              const toolResult = typeof data.toolUseResult === 'string' 
                ? data.toolUseResult 
                : safeStringify(data.toolUseResult, 2);
              content = content ? `${content}\n[Tool Result: ${toolResult}]` : `[Tool Result: ${toolResult}]`;
            }
            
            if (content) {
              messages.push({
                role: 'user',
                content: content,
                timestamp: data.timestamp
              });
            }
          } else if (data.type === 'assistant' && 'message' in data) {
            let content = '';
            
            // Assistant 메시지의 content는 항상 배열
            if (Array.isArray(data.message.content)) {
              // content 배열에서 텍스트와 도구 사용 추출
              const parts: string[] = [];
              data.message.content.forEach((item: any) => {
                if (item.type === 'text' && item.text) {
                  parts.push(item.text);
                } else if (item.type === 'tool_use') {
                  const toolInfo = [`[Tool Use: ${item.name || 'unknown'}`];
                  if (item.id) toolInfo.push(`ID: ${item.id}`);
                  if (item.input) {
                    const inputStr = typeof item.input === 'string' ? item.input : safeStringify(item.input);
                    toolInfo.push(`Input: ${inputStr}`);
                  }
                  parts.push(toolInfo.join(' | ') + ']');
                }
              });
              content = parts.join('\n');
            }
            
            if (content) {
              messages.push({
                role: 'assistant',
                content: content,
                timestamp: data.timestamp
              });
            }
          } else if (data.type === 'system' && 'subtype' in data && data.subtype === 'init') {
            // 시스템 초기화 메시지
            if (data.cwd) {
              messages.push({
                role: 'assistant',
                content: `[System Init] Working directory: ${data.cwd}`,
                timestamp: data.timestamp
              });
            }
          } else if (data.type === 'result' && 'subtype' in data) {
            // 결과 메시지
            const resultInfo = [`[Session Result: ${data.subtype}]`];
            if (data.duration_ms) resultInfo.push(`Duration: ${Math.round(data.duration_ms / 1000)}s`);
            if (data.total_cost_usd) resultInfo.push(`Cost: $${data.total_cost_usd.toFixed(4)}`);
            if (data.num_turns) resultInfo.push(`Turns: ${data.num_turns}`);
            
            messages.push({
              role: 'assistant',
              content: resultInfo.join(' | '),
              timestamp: data.timestamp
            });
          } else if (data.type === 'summary' && 'summary' in data) {
            // summary 타입 처리
            sessionName = data.summary || sessionName;
          } else if (data.type === 'thinking' && 'content' in data) {
            // thinking 메시지 (Claude의 내부 추론)
            if (data.content) {
              messages.push({
                role: 'assistant',
                content: `[Thinking] ${data.content}`,
                timestamp: data.timestamp
              });
            }
          }
        } catch (error) {
          // 파싱 실패한 줄은 무시
          console.error('Error parsing JSONL line:', error);
        }
      }
      
      // 세션 이름 설정
      if (sessionId) {
        sessionName = sessionId;
      }
      
      // console.log(`Parsed ${messages.length} messages from JSONL`);
    } 
    // 텍스트 형식 파싱
    else if (filePath.endsWith('.txt') || (!content.startsWith('{') && !content.startsWith('['))) {
      const parts = content.split(/\n(?=Human:|Assistant:|User:)/);
      for (const part of parts) {
        if (part.trim()) {
          if (part.startsWith('Human:') || part.startsWith('User:')) {
            messages.push({
              role: 'user',
              content: part.replace(/^(Human:|User:)\s*/, '').trim()
            });
          } else if (part.startsWith('Assistant:')) {
            messages.push({
              role: 'assistant',
              content: part.replace(/^Assistant:\s*/, '').trim()
            });
          }
        }
      }
    }
    // JSON 형식 파싱
    else {
      try {
        const data = JSON.parse(content);
        
        // 배열 형식
        if (Array.isArray(data)) {
          messages = data.filter(item => item.role && item.content)
            .map(item => ({
              role: item.role,
              content: item.content,
              timestamp: item.timestamp
            }));
        }
        // 객체 형식
        else if (typeof data === 'object' && data !== null) {
          // 다양한 필드명 확인
          const messageFields = ['messages', 'conversation', 'history', 'turns'];
          for (const field of messageFields) {
            if (data[field]) {
              const items = Array.isArray(data[field]) ? data[field] : data[field].messages || [];
              messages = items.filter((item: any) => item.role && item.content)
                .map((item: any) => ({
                  role: item.role,
                  content: item.content,
                  timestamp: item.timestamp
                }));
              break;
            }
          }
          
          // 세션 이름 추출
          if (data.name) sessionName = data.name;
          else if (data.title) sessionName = data.title;
          else if (data.id) sessionName = data.id;
        }
      } catch (error) {
        console.error('Error parsing JSON:', error);
      }
    }
    
    if (messages.length === 0) {
      console.log(`No messages found in file: ${filePath}`);
      return null;
    }
    
    // console.log(`Successfully parsed session: ${sessionName} with ${messages.length} messages`);
    
    return {
      id: basename(filePath),
      name: sessionName,
      created: sessionCreated.toISOString(),
      updated: sessionUpdated.toISOString(),
      messages
    };
  } catch (error) {
    console.error('Error parsing session file:', error);
    return null;
  }
}

export function analyzeSessionContent(session: ClaudeSession): SessionReport {
  const messages = session.messages;
  
  // 대화 내용 분석
  let totalTokens = 0;
  const codeBlocks: string[] = [];
  const topics = new Set<string>();
  const filesModified = new Set<string>();
  let linesAdded = 0;
  let linesRemoved = 0;
  
  // 메시지 분석
  messages.forEach(msg => {
    const content = msg.content || '';
    totalTokens += content.length / 4; // 대략적인 토큰 수 추정
    
    // 코드 블록 추출
    const codeMatches = content.match(/```[\s\S]*?```/g);
    if (codeMatches) {
      codeBlocks.push(...codeMatches);
    }
    
    // 파일 경로 추출 - 더 정확한 패턴
    const filePathMatches = content.match(/(?:^|\s|["'`])([./]?[\w-]+(?:\/[\w-]+)*\.\w+)/gm);
    if (filePathMatches) {
      filePathMatches.forEach(match => {
        const cleaned = match.trim().replace(/["'`]/g, '');
        if (cleaned.includes('.')) {
          filesModified.add(cleaned);
        }
      });
    }
    
    // 주요 키워드 추출 (한글 포함)
    const keywords = [
      'react', 'typescript', 'javascript', 'python', 'api', 'database', 
      'frontend', 'backend', 'bug', 'feature', 'refactor', 'test', 'deploy',
      '리액트', '타입스크립트', '자바스크립트', '파이썬', '프론트엔드', '백엔드',
      '버그', '기능', '리팩토링', '테스트', '배포', 'claude', 'ai', '분석'
    ];
    keywords.forEach(keyword => {
      if (content.toLowerCase().includes(keyword.toLowerCase())) {
        topics.add(keyword);
      }
    });
    
    // 코드 변경 추정
    const addedLines = (content.match(/^\+(?!\+)/gm) || []).length;
    const removedLines = (content.match(/^-(?!-)/gm) || []).length;
    linesAdded += addedLines;
    linesRemoved += removedLines;
  });
  
  // 대화 요약 생성
  const userMessages = messages.filter(m => m.role === 'user');
  const assistantMessages = messages.filter(m => m.role === 'assistant');
  
  let title = '대화 세션';
  let summary = `${userMessages.length}개의 질문과 ${assistantMessages.length}개의 응답`;
  
  // 첫 번째 사용자 메시지로 제목 생성
  if (userMessages.length > 0 && userMessages[0].content) {
    const firstMessage = userMessages[0].content;
    // 첫 줄만 추출하고 정리
    let firstLine = firstMessage.split('\n')[0].trim();
    // 너무 길면 자르기
    if (firstLine.length > 100) {
      firstLine = firstLine.substring(0, 100) + '...';
    }
    title = firstLine || '대화 세션';
  }
  
  // MDX 콘텐츠 생성
  const mdxContent = generateMDXContent(session);
  
  // 대화 시간 계산
  const startTime = new Date(session.created);
  const endTime = new Date(session.updated);
  const durationMs = endTime.getTime() - startTime.getTime();
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  const duration = hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`;
  
  return {
    sessionId: session.id,
    date: startTime.toISOString().split('T')[0],
    title,
    summary,
    mdxContent,
    keyTopics: Array.from(topics).slice(0, 10), // 최대 10개 토픽
    codeChanges: {
      filesModified: Array.from(filesModified),
      linesAdded,
      linesRemoved
    },
    duration,
    status: 'completed'
  };
}

function generateMDXContent(session: ClaudeSession): string {
  const lines: string[] = [];
  
  lines.push(`# ${session.name}`);
  lines.push('');
  lines.push(`> 세션 ID: ${session.id}`);
  lines.push(`> 생성: ${new Date(session.created).toLocaleString('ko-KR')}`);
  lines.push(`> 수정: ${new Date(session.updated).toLocaleString('ko-KR')}`);
  lines.push('');
  lines.push('## 대화 내용');
  lines.push('');
  
  let questionCount = 0;
  session.messages.forEach((msg, index) => {
    if (msg.role === 'user') {
      questionCount++;
      lines.push(`### 💬 질문 ${questionCount}`);
      lines.push('');
      lines.push(msg.content);
      lines.push('');
    } else if (msg.role === 'assistant') {
      lines.push(`### 🤖 응답`);
      lines.push('');
      // 긴 응답은 접을 수 있게 처리
      if (msg.content.length > 1000) {
        lines.push('<details>');
        lines.push('<summary>응답 내용 (클릭하여 펼치기)</summary>');
        lines.push('');
        lines.push(msg.content);
        lines.push('');
        lines.push('</details>');
      } else {
        lines.push(msg.content);
      }
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  });
  
  return lines.join('\n');
}

export async function groupSessionsByDate(sessions: SessionReport[]): Promise<Map<string, SessionReport[]>> {
  const grouped = new Map<string, SessionReport[]>();
  
  sessions.forEach(session => {
    const date = session.date;
    if (!grouped.has(date)) {
      grouped.set(date, []);
    }
    grouped.get(date)!.push(session);
  });
  
  // 날짜순 정렬
  const sortedMap = new Map([...grouped.entries()].sort((a, b) => b[0].localeCompare(a[0])));
  
  return sortedMap;
}