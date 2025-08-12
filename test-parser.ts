import { findSessionFiles, parseSessionFile, analyzeSessionContent } from './src/cli/utils/sessionAnalyzer';

async function test() {
  console.log('Testing Claude Desktop JSONL parser...\n');
  
  const files = await findSessionFiles('./test-project');
  console.log('Found files:', files);
  
  if (files.length > 0) {
    const session = await parseSessionFile(files[0]);
    if (session) {
      console.log('\n✅ Parsed session:', {
        name: session.name,
        messages: session.messages.length,
        created: session.created,
        updated: session.updated
      });
      
      console.log('\n📝 Messages:');
      session.messages.forEach((msg, i) => {
        console.log(`${i + 1}. [${msg.role}] ${msg.content.substring(0, 100)}...`);
      });
      
      const report = analyzeSessionContent(session);
      console.log('\n📊 Analysis Report:', {
        title: report.title,
        summary: report.summary,
        duration: report.duration,
        keyTopics: report.keyTopics
      });
    }
  }
}

test().catch(console.error);