import { analyzeWithClaudeCode } from './src/cli/utils/claudeApi';

async function testAI() {
  const testSession = {
    id: 'test-session',
    name: 'Test Session',
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    messages: [
      { role: 'user' as const, content: 'How do I create a React component?', timestamp: new Date().toISOString() },
      { role: 'assistant' as const, content: 'To create a React component, you can use either a function or class...', timestamp: new Date().toISOString() }
    ]
  };

  console.log('Testing AI analysis...');
  const result = await analyzeWithClaudeCode(testSession);
  
  if (result) {
    console.log('✅ AI Analysis successful:');
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('❌ AI Analysis failed');
  }
}

testAI().catch(console.error);