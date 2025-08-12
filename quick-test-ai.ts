import { analyzeProject } from './src/cli/utils/analyzer';
import { saveDailyReport } from './src/cli/utils/analyzer';
import { ensureProjectReportDir } from './src/cli/utils/scanner';

async function quickTest() {
  console.log('🚀 Quick AI analysis test...\n');
  
  // 테스트 프로젝트 경로
  const projectPath = '/Users/herren/.claude/projects/-Users-herren-Desktop-herren-test-claude-report';
  const projectName = '-Users-herren-Desktop-herren-test-claude-report';
  
  // AI 분석 활성화하여 프로젝트 분석
  console.log('📍 Starting analysis with AI...');
  const groupedSessions = await analyzeProject(projectPath, { useAI: true });
  
  console.log(`\n📊 Analysis complete:`);
  console.log(`- Total dates: ${groupedSessions.size}`);
  
  // 리포트 저장
  const projectReportDir = await ensureProjectReportDir(projectName);
  
  for (const [date, sessions] of groupedSessions) {
    console.log(`\n📅 ${date}: ${sessions.length} sessions`);
    
    // AI 분석 결과 확인
    sessions.forEach((session, idx) => {
      console.log(`  ${idx + 1}. ${session.title}`);
      if (session.aiInsights) {
        console.log(`     ✨ AI Insights: ${session.aiInsights.keyInsights.length} insights`);
        console.log(`     📊 Quality: ${session.aiInsights.codeQuality.strengths.length} strengths, ${session.aiInsights.codeQuality.improvements.length} improvements`);
      } else {
        console.log(`     ❌ No AI insights`);
      }
    });
    
    await saveDailyReport(projectReportDir, date, sessions);
  }
  
  console.log(`\n✅ Test complete! Reports saved to: ${projectReportDir}`);
}

quickTest().catch(console.error);