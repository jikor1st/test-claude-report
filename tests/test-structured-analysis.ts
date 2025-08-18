import { analyzeWithClaudeCode } from '../src/cli/utils/claudeApi';
import { parseSession } from '../src/cli/utils/sessionAnalyzer';
import { promises as fs } from 'fs';
import { join } from 'path';

async function testStructuredAnalysis() {
  console.log('🧪 구조화된 데이터 분석 테스트 시작...\n');
  
  try {
    // 테스트 세션 파일 읽기
    const sessionPath = join(__dirname, 'test-structured', 'session.jsonl');
    const sessionContent = await fs.readFile(sessionPath, 'utf8');
    
    console.log('📄 세션 파일 읽기 완료');
    
    // 세션 파싱
    const session = parseSession(sessionContent, 'test-structured');
    
    if (!session) {
      console.error('❌ 세션 파싱 실패');
      return;
    }
    
    console.log(`✅ 세션 파싱 완료 - ${session.messages.length}개 메시지`);
    
    // 구조화된 데이터 추출 테스트
    const { 
      extractStructuredPatches,
      extractTodos,
      extractToolUsage,
      extractErrorMessages
    } = await import('../src/cli/utils/codeExtractor');
    
    const patches = extractStructuredPatches(session.messages);
    const todos = extractTodos(session.messages);
    const errors = extractErrorMessages(session.messages);
    
    console.log('\n📊 구조화된 데이터 추출 결과:');
    console.log(`- 패치: ${patches.length}개`);
    if (patches.length > 0) {
      console.log(`  파일: ${patches[0].file}`);
      console.log(`  언어: ${patches[0].language || '감지 안됨'}`);
    }
    
    console.log(`- TODO: ${todos.length}개`);
    todos.forEach(todo => {
      console.log(`  [${todo.status}] ${todo.content}`);
    });
    
    console.log(`- 에러: ${errors.length}개`);
    if (errors.length > 0) {
      console.log(`  첫 번째 에러: ${errors[0].matchedText}`);
    }
    
    // AI 분석 실행
    console.log('\n🤖 AI 분석 시작...');
    const result = await analyzeWithClaudeCode(session);
    
    if (result) {
      console.log('\n✅ AI 분석 완료!');
      console.log(`- 템플릿 타입: ${result.templateType}`);
      console.log(`- 제목: ${result.analysis.title}`);
      console.log(`- 요약: ${result.analysis.summary}`);
      console.log(`- 주요 작업: ${result.analysis.timeline.mainTasks.length}개`);
      
      // 결과 저장
      const outputPath = join(__dirname, 'test-structured-result.json');
      await fs.writeFile(outputPath, JSON.stringify(result, null, 2), 'utf8');
      console.log(`\n💾 결과 저장 완료: ${outputPath}`);
    } else {
      console.error('❌ AI 분석 실패');
    }
    
  } catch (error) {
    console.error('❌ 테스트 중 오류:', error);
  }
}

// 테스트 실행
testStructuredAnalysis();