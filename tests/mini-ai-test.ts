import { parseSessionFile, analyzeSessionContent } from './src/cli/utils/sessionAnalyzer';
import { analyzeWithClaudeCode } from './src/cli/utils/claudeApi';

async function miniTest() {
  console.log('🧪 Mini AI test...\n');
  
  // 세션 파싱
  const session = await parseSessionFile('./mini-test.jsonl');
  if (!session) {
    console.log('❌ Failed to parse session');
    return;
  }
  
  console.log('✅ Session parsed:', {
    name: session.name,
    messages: session.messages.length
  });
  
  // 기본 분석
  const report = analyzeSessionContent(session);
  console.log('\n📊 Basic analysis:', {
    title: report.title,
    topics: report.keyTopics
  });
  
  // AI 분석
  console.log('\n🤖 Running AI analysis...');
  const aiResult = await analyzeWithClaudeCode(session);
  
  if (aiResult) {
    console.log('✅ AI analysis result:');
    console.log(JSON.stringify(aiResult, null, 2));
  } else {
    console.log('❌ AI analysis failed');
  }
}

miniTest().catch(console.error);