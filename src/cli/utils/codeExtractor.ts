import type { ClaudeMessage } from './sessionAnalyzer';

export interface SearchResult {
  messageIndex: number;
  role: string;
  timestamp?: string;
  content: string;
  matchedText: string;
  context: {
    before: string;
    after: string;
  };
}

/**
 * 메시지에서 코드 블록 추출
 */
export function extractCodeBlocks(messages: ClaudeMessage[]): Map<string, string[]> {
  const codeBlocks = new Map<string, string[]>();
  
  messages.forEach((message) => {
    // 코드 블록 찾기 (```로 감싸진 부분)
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(message.content)) !== null) {
      const language = match[1] || 'code';
      const code = match[2].trim();
      
      if (!codeBlocks.has(language)) {
        codeBlocks.set(language, []);
      }
      codeBlocks.get(language)!.push(code);
    }
    
    // 인라인 코드도 찾기 (`로 감싸진 부분)
    const inlineCodeRegex = /`([^`]+)`/g;
    while ((match = inlineCodeRegex.exec(message.content)) !== null) {
      if (!codeBlocks.has('inline')) {
        codeBlocks.set('inline', []);
      }
      codeBlocks.get('inline')!.push(match[1]);
    }
  });
  
  return codeBlocks;
}

/**
 * 특정 키워드가 포함된 코드 블록 찾기
 */
export function findCodeWithKeyword(messages: ClaudeMessage[], keyword: string): string | null {
  const codeBlocks = extractCodeBlocks(messages);
  
  for (const [language, blocks] of codeBlocks) {
    for (const block of blocks) {
      if (block.toLowerCase().includes(keyword.toLowerCase())) {
        return block;
      }
    }
  }
  
  return null;
}

/**
 * 파일명이나 컴포넌트명이 언급된 코드 찾기
 */
export function findCodeByComponentName(messages: ClaudeMessage[], componentName: string): string | null {
  const patterns = [
    new RegExp(`(class|function|const|let|var)\\s+${componentName}`, 'i'),
    new RegExp(`${componentName}\\.`, 'i'),
    new RegExp(`<${componentName}`, 'i'),
    new RegExp(`${componentName}\\(`, 'i')
  ];
  
  const codeBlocks = extractCodeBlocks(messages);
  
  for (const [language, blocks] of codeBlocks) {
    for (const block of blocks) {
      for (const pattern of patterns) {
        if (pattern.test(block)) {
          return block;
        }
      }
    }
  }
  
  return null;
}

/**
 * 특정 패턴으로 메시지 검색 (정규식 지원)
 */
export function searchByPattern(
  messages: ClaudeMessage[],
  pattern: string | RegExp,
  contextLength: number = 100
): SearchResult[] {
  const results: SearchResult[] = [];
  const regex = typeof pattern === 'string' ? new RegExp(pattern, 'g') : pattern;
  
  messages.forEach((msg, index) => {
    let match;
    while ((match = regex.exec(msg.content)) !== null) {
      const startPos = Math.max(0, match.index - contextLength);
      const endPos = Math.min(msg.content.length, match.index + match[0].length + contextLength);
      
      results.push({
        messageIndex: index,
        role: msg.role,
        timestamp: msg.timestamp,
        content: msg.content,
        matchedText: match[0],
        context: {
          before: msg.content.substring(startPos, match.index),
          after: msg.content.substring(match.index + match[0].length, endPos)
        }
      });
    }
  });
  
  return results;
}

/**
 * 메시지에서 특정 패턴에 맞는 내용 추출
 */
export function extractContentByPattern(messages: ClaudeMessage[], pattern: RegExp): string[] {
  const results: string[] = [];
  
  messages.forEach((message) => {
    const matches = message.content.match(pattern);
    if (matches) {
      results.push(...matches);
    }
  });
  
  return results;
}

/**
 * 에러 관련 메시지 추출
 */
export function extractErrorMessages(messages: ClaudeMessage[]): SearchResult[] {
  const errorPatterns = [
    /error:?\s*(.+)/gi,
    /exception:?\s*(.+)/gi,
    /failed:?\s*(.+)/gi,
    /⚠️\s*(.+)/g,
    /🚨\s*(.+)/g,
    /❌\s*(.+)/g,
    /에러:?\s*(.+)/g,
    /오류:?\s*(.+)/g,
    /실패:?\s*(.+)/g,
    /문제:?\s*(.+)/g,
    /버그:?\s*(.+)/g,
    /이슈:?\s*(.+)/g,
    // 특정 에러 패턴들
    /TransactionTooLargeException.*bytes/gi,
    /null\s*pointer\s*exception/gi,
    /undefined\s*is\s*not\s*a\s*function/gi,
    /cannot\s*read\s*property.*of\s*(null|undefined)/gi,
    // 증상 설명 패턴
    /동작하지\s*않/g,
    /작동하지\s*않/g,
    /클릭이?\s*안\s*되/g,
    /클릭을?\s*해도/g,
    /반응이?\s*없/g
  ];
  
  const results: SearchResult[] = [];
  
  errorPatterns.forEach(pattern => {
    const patternResults = searchByPattern(messages, pattern);
    results.push(...patternResults);
  });
  
  // 중복 제거 및 우선순위 정렬
  const uniqueResults = results.filter((result, index, self) => 
    index === self.findIndex(r => 
      r.messageIndex === result.messageIndex && 
      r.matchedText === result.matchedText
    )
  );
  
  // 사용자 메시지 우선, 더 구체적인 에러 우선
  return uniqueResults.sort((a, b) => {
    // 사용자 메시지 우선
    if (a.role === 'user' && b.role !== 'user') return -1;
    if (a.role !== 'user' && b.role === 'user') return 1;
    
    // 더 긴 매치 (더 구체적인) 우선
    return b.matchedText.length - a.matchedText.length;
  });
}

/**
 * 해결 방법 관련 메시지 추출
 */
export function extractSolutionMessages(messages: ClaudeMessage[]): SearchResult[] {
  const solutionPatterns = [
    /해결:?\s*(.+)/g,
    /수정:?\s*(.+)/g,
    /해결\s*방법:?\s*(.+)/g,
    /solution:?\s*(.+)/gi,
    /fixed:?\s*(.+)/gi,
    /resolved:?\s*(.+)/gi,
    /✅\s*(.+)/g,
    /💡\s*(.+)/g,
    /🛠️\s*(.+)/g
  ];
  
  const results: SearchResult[] = [];
  
  solutionPatterns.forEach(pattern => {
    const patternResults = searchByPattern(messages, pattern);
    results.push(...patternResults);
  });
  
  // 중복 제거
  return results.filter((result, index, self) => 
    index === self.findIndex(r => 
      r.messageIndex === result.messageIndex && 
      r.matchedText === result.matchedText
    )
  );
}

/**
 * 에러 메시지나 스택 트레이스 찾기 (기존 호환성)
 */
export function findErrorMessages(messages: ClaudeMessage[]): string[] {
  const errorPatterns = [
    /Error:.*$/gm,
    /TypeError:.*$/gm,
    /ReferenceError:.*$/gm,
    /SyntaxError:.*$/gm,
    /at\s+.*\(.*:\d+:\d+\)/gm,
    /Failed to.*$/gm,
    /Cannot\s+.*$/gm,
    /Unable to.*$/gm
  ];
  
  const errors: string[] = [];
  
  messages.forEach((message) => {
    errorPatterns.forEach((pattern) => {
      const matches = message.content.match(pattern);
      if (matches) {
        errors.push(...matches);
      }
    });
  });
  
  return [...new Set(errors)]; // 중복 제거
}

/**
 * 파일 경로 추출
 */
export function extractFilePaths(messages: ClaudeMessage[]): string[] {
  const pathPattern = /(?:\/[\w.-]+)+(?:\.\w+)?|(?:[A-Za-z]:\\[\w\\.-]+)+/g;
  const paths: string[] = [];
  
  messages.forEach((message) => {
    const matches = message.content.match(pathPattern);
    if (matches) {
      paths.push(...matches);
    }
  });
  
  return [...new Set(paths)].filter(path => {
    // 실제 파일 경로처럼 보이는 것만 필터링
    return path.includes('.') || path.includes('/src/') || path.includes('\\src\\');
  });
}

/**
 * 변경 전후 코드 찾기 (before/after 패턴)
 */
export function findBeforeAfterCode(messages: ClaudeMessage[]): { before: string | null, after: string | null } {
  let beforeCode: string | null = null;
  let afterCode: string | null = null;
  const allCodeBlocks: Array<{ index: number, code: string, context: string }> = [];
  
  // 모든 코드 블록 수집
  messages.forEach((message, idx) => {
    const codeBlocks = message.content.match(/```[\w]*\n?([\s\S]*?)```/g);
    if (codeBlocks) {
      codeBlocks.forEach(block => {
        // 코드 블록 주변 텍스트 (100자) 추출
        const blockIndex = message.content.indexOf(block);
        const contextStart = Math.max(0, blockIndex - 100);
        const contextEnd = Math.min(message.content.length, blockIndex + block.length + 100);
        const context = message.content.substring(contextStart, contextEnd).toLowerCase();
        
        allCodeBlocks.push({
          index: idx,
          code: block,
          context
        });
      });
    }
  });
  
  // Before 코드 찾기 - 더 정확한 패턴 매칭
  const beforePatterns = [
    /기존\s*코드|문제\s*코드|원래\s*코드|before|previous|원인.*코드|버그.*코드|잘못된.*코드/,
    /문제가\s*된.*코드|에러.*코드|오류.*코드/
  ];
  
  for (const block of allCodeBlocks) {
    if (!beforeCode && beforePatterns.some(pattern => pattern.test(block.context))) {
      beforeCode = block.code;
      break;
    }
  }
  
  // After 코드 찾기 - 더 정확한 패턴 매칭
  const afterPatterns = [
    /수정.*코드|해결.*코드|개선.*코드|after|fixed|solution|해결책/,
    /올바른.*코드|정상.*코드|함수형\s*업데이트/
  ];
  
  for (const block of allCodeBlocks) {
    if (!afterCode && block.code !== beforeCode && afterPatterns.some(pattern => pattern.test(block.context))) {
      afterCode = block.code;
      break;
    }
  }
  
  // 못 찾았을 경우 대체 전략 - 사용자/어시스턴트 메시지 기반
  if (!beforeCode && allCodeBlocks.length > 0) {
    // 사용자 메시지의 첫 번째 코드 블록을 문제 코드로 간주
    const userBlocks = allCodeBlocks.filter((_, idx) => messages[idx]?.role === 'user');
    if (userBlocks.length > 0) {
      beforeCode = userBlocks[0].code;
    }
  }
  
  if (!afterCode && allCodeBlocks.length > 1) {
    // 어시스턴트 메시지의 마지막 코드 블록을 해결 코드로 간주
    const assistantBlocks = allCodeBlocks.filter((_, idx) => messages[idx]?.role === 'assistant');
    if (assistantBlocks.length > 0) {
      afterCode = assistantBlocks[assistantBlocks.length - 1].code;
    }
  }
  
  return { before: beforeCode, after: afterCode };
}

/**
 * 구조화된 패치 데이터 추출
 */
export function extractStructuredPatches(messages: ClaudeMessage[]): Array<{
  file: string;
  patch: string;
  summary?: string;
  language?: string;
}> {
  const patches: Array<{
    file: string;
    patch: string;
    summary?: string;
    language?: string;
  }> = [];
  
  messages.forEach((message) => {
    // structuredPatch 패턴 찾기
    const structuredPatchRegex = /structuredPatch:\s*{([^}]+)}/g;
    let match;
    
    while ((match = structuredPatchRegex.exec(message.content)) !== null) {
      const patchContent = match[1];
      
      // 파일명 추출
      const fileMatch = patchContent.match(/file:\s*["']([^"']+)["']/);
      const patchMatch = patchContent.match(/patch:\s*["']([^"']+)["']/);
      
      if (fileMatch && patchMatch) {
        // 언어 감지
        const extension = fileMatch[1].split('.').pop() || '';
        const languageMap: { [key: string]: string } = {
          'ts': 'typescript',
          'tsx': 'typescript',
          'js': 'javascript',
          'jsx': 'javascript',
          'py': 'python',
          'java': 'java',
          'go': 'go',
          'rs': 'rust'
        };
        
        patches.push({
          file: fileMatch[1],
          patch: patchMatch[1].replace(/\\n/g, '\n').replace(/\\t/g, '\t'),
          language: languageMap[extension] || extension
        });
      }
    }
    
    // Edit 도구 사용 패턴도 찾기
    const editToolRegex = /<function_calls>[\s\S]*?<invoke name="Edit">[\s\S]*?<parameter name="file_path">([^<]+)<\/antml:parameter>[\s\S]*?<parameter name="old_string">([^<]+)<\/antml:parameter>[\s\S]*?<parameter name="new_string">([^<]+)<\/antml:parameter>[\s\S]*?<\/antml:invoke>/g;
    
    while ((match = editToolRegex.exec(message.content)) !== null) {
      const [, filePath, oldString, newString] = match;
      if (filePath && oldString && newString) {
        const extension = filePath.split('.').pop() || '';
        patches.push({
          file: filePath,
          patch: `--- ${filePath}\n+++ ${filePath}\n@@ -1,1 +1,1 @@\n-${oldString}\n+${newString}`,
          summary: `Changed from:\n${oldString}\n\nTo:\n${newString}`,
          language: extension
        });
      }
    }
  });
  
  return patches;
}

/**
 * TODO 항목 추출
 */
export function extractTodos(messages: ClaudeMessage[]): Array<{
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority?: 'high' | 'medium' | 'low';
  id?: string;
}> {
  const todos: Array<{
    content: string;
    status: 'pending' | 'in_progress' | 'completed';
    priority?: 'high' | 'medium' | 'low';
    id?: string;
  }> = [];
  
  messages.forEach((message) => {
    // TodoWrite 도구 사용 패턴
    const todoWriteRegex = /<function_calls>[\s\S]*?<invoke name="TodoWrite">[\s\S]*?<parameter name="todos">([\s\S]*?)<\/antml:parameter>[\s\S]*?<\/antml:invoke>/g;
    let match;
    
    while ((match = todoWriteRegex.exec(message.content)) !== null) {
      try {
        const todosJson = JSON.parse(match[1]);
        if (Array.isArray(todosJson)) {
          todos.push(...todosJson.map((todo: any) => ({
            content: todo.content || '',
            status: todo.status || 'pending',
            priority: todo.priority,
            id: todo.id
          })));
        }
      } catch (e) {
        // JSON 파싱 실패 시 무시
      }
    }
    
    // 일반적인 TODO 패턴
    const todoPatterns = [
      /(?:TODO|할 일|작업):\s*(.+)/gi,
      /\[\s*\]\s*(.+)/g,  // 체크박스 패턴
      /\d+\.\s*(.+)(?=\n\d+\.|$)/g,  // 번호 리스트
      /[-*]\s*(.+)(?=\n[-*]|$)/g  // 불릿 리스트
    ];
    
    todoPatterns.forEach(pattern => {
      const matches = message.content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const content = match.replace(pattern, '$1').trim();
          if (content && content.length > 5 && content.length < 200) {
            // 중복 체크
            if (!todos.some(t => t.content === content)) {
              todos.push({
                content,
                status: 'pending'
              });
            }
          }
        });
      }
    });
  });
  
  return todos;
}

/**
 * 도구 사용 내역 추출
 */
export function extractToolUsage(messages: ClaudeMessage[]): Array<{
  tool: string;
  parameters: any;
  timestamp?: string;
}> {
  const toolUsages: Array<{
    tool: string;
    parameters: any;
    timestamp?: string;
  }> = [];
  
  messages.forEach((message) => {
    // 도구 사용 패턴
    const toolRegex = /<function_calls>[\s\S]*?<invoke name="([^"]+)">([\s\S]*?)<\/antml:invoke>/g;
    let match;
    
    while ((match = toolRegex.exec(message.content)) !== null) {
      const [, toolName, parametersXml] = match;
      const parameters: any = {};
      
      // 파라미터 추출
      const paramRegex = /<parameter name="([^"]+)">([^<]*)<\/antml:parameter>/g;
      let paramMatch;
      
      while ((paramMatch = paramRegex.exec(parametersXml)) !== null) {
        const [, paramName, paramValue] = paramMatch;
        parameters[paramName] = paramValue;
      }
      
      toolUsages.push({
        tool: toolName,
        parameters,
        timestamp: message.timestamp
      });
    }
  });
  
  return toolUsages;
}

/**
 * 디버깅 과정 추출
 */
export function extractDebuggingSteps(messages: ClaudeMessage[]): Array<{ action: string, code?: string, result?: string, finding?: string, hypothesis?: string, step?: number }> {
  const steps: Array<{ action: string, code?: string, result?: string, finding?: string, hypothesis?: string, step?: number }> = [];
  const processedIndices = new Set<number>();
  
  const stepPatterns = [
    { pattern: /(\d+)차 시도\s*:\s*(.+)/i, type: 'numbered' },
    { pattern: /시도\s*(\d+)\s*:\s*(.+)/i, type: 'numbered' },
    { pattern: /Step\s*(\d+)\s*:\s*(.+)/i, type: 'numbered' },
    { pattern: /(첫 번째|두 번째|세 번째)\s*(.+)/, type: 'ordinal' },
    { pattern: /(먼저|다음으로|마지막으로)\s*(.+)/, type: 'sequence' },
    { pattern: /^(\d+)\.\s*(.+)/, type: 'list' }
  ];
  
  messages.forEach((message, idx) => {
    if (processedIndices.has(idx)) return;
    
    for (const { pattern, type } of stepPatterns) {
      const match = message.content.match(pattern);
      if (match) {
        processedIndices.add(idx);
        
        let stepNumber = 0;
        let actionText = '';
        
        if (type === 'numbered') {
          stepNumber = parseInt(match[1]);
          actionText = match[2] || match[0];
        } else if (type === 'ordinal') {
          const ordinalMap: { [key: string]: number } = {
            '첫 번째': 1,
            '두 번째': 2,
            '세 번째': 3
          };
          stepNumber = ordinalMap[match[1]] || 0;
          actionText = match[2] || match[0];
        } else {
          actionText = match[2] || match[0];
        }
        
        // 액션 텍스트 정리
        actionText = actionText.trim().substring(0, 200);
        
        // 관련 코드 찾기
        let code: string | undefined;
        const nextMessages = messages.slice(idx, idx + 3);
        
        // 같은 메시지 내 코드 블록 찾기
        const codeMatch = message.content.match(/```[\w]*\n?([\s\S]*?)```/);
        if (codeMatch) {
          code = codeMatch[1].trim();
        } else {
          // 다음 메시지들에서 코드 찾기
          for (const msg of nextMessages.slice(1)) {
            const nextCodeMatch = msg.content.match(/```[\w]*\n?([\s\S]*?)```/);
            if (nextCodeMatch) {
              code = nextCodeMatch[1].trim();
              break;
            }
          }
        }
        
        // 가설 찾기
        let hypothesis: string | undefined;
        const hypothesisMatch = message.content.match(/가설\s*[:：]\s*(.+)|hypothesis\s*[:：]\s*(.+)/i);
        if (hypothesisMatch) {
          hypothesis = (hypothesisMatch[1] || hypothesisMatch[2])?.trim();
        }
        
        // 발견사항 찾기
        let finding: string | undefined;
        const findingPatterns = [
          /발견\s*[:：]\s*(.+)/,
          /결과\s*[:：]\s*(.+)/,
          /확인\s*[:：]\s*(.+)/,
          /finding\s*[:：]\s*(.+)/i,
          /result\s*[:：]\s*(.+)/i
        ];
        
        for (const pattern of findingPatterns) {
          const findingMatch = message.content.match(pattern);
          if (findingMatch) {
            finding = findingMatch[1].trim();
            break;
          }
        }
        
        steps.push({
          step: stepNumber,
          action: actionText,
          code,
          hypothesis,
          finding,
          result: finding || nextMessages[1]?.content.substring(0, 200)
        });
        
        break;
      }
    }
  });
  
  // 중복 제거 및 정렬
  const uniqueSteps = steps.filter((step, index, self) =>
    index === self.findIndex((s) => s.action === step.action)
  );
  
  return uniqueSteps.sort((a, b) => (a.step || 0) - (b.step || 0));
}