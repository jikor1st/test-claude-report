import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { DailyReport, SessionReport } from '../types';

// HTML을 이미지로 변환하여 PDF 생성 (한글 지원, 세션별 페이지 분리)
export async function generatePDFFromReport(report: DailyReport, selectedSession?: SessionReport): Promise<void> {
  const sessions = selectedSession ? [selectedSession] : report.sessions;
  
  // PDF 생성
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  // 첫 페이지: 타이틀 페이지
  const titleDiv = document.createElement('div');
  titleDiv.style.position = 'absolute';
  titleDiv.style.left = '-9999px';
  titleDiv.style.width = '210mm';
  titleDiv.style.padding = '20mm';
  titleDiv.style.backgroundColor = 'white';
  titleDiv.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  
  const dateStr = new Date(report.date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  
  titleDiv.innerHTML = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
      <h1 style="font-size: 36px; margin-bottom: 30px; text-align: center;">${dateStr}</h1>
      <h2 style="font-size: 28px; margin-bottom: 20px; text-align: center; color: #333;">Claude Report</h2>
      <p style="font-size: 16px; color: #666; text-align: center; max-width: 80%; line-height: 1.6;">${report.summary}</p>
      <div style="margin-top: 50px; padding: 20px; background-color: #f0f7ff; border-radius: 10px;">
        <p style="font-size: 18px; margin: 0; color: #1976d2;">총 ${sessions.length}개 세션</p>
      </div>
    </div>
  `;
  
  document.body.appendChild(titleDiv);
  
  try {
    // 타이틀 페이지 렌더링
    const titleCanvas = await html2canvas(titleDiv, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });
    
    const imgWidth = 210;
    const imgHeight = (titleCanvas.height * imgWidth) / titleCanvas.width;
    
    pdf.addImage(
      titleCanvas.toDataURL('image/png'),
      'PNG',
      0,
      0,
      imgWidth,
      Math.min(imgHeight, 297) // A4 height limit
    );
    
    document.body.removeChild(titleDiv);
    
    // 각 세션을 별도 페이지로 렌더링
    for (let index = 0; index < sessions.length; index++) {
      const session = sessions[index];
      pdf.addPage();
      
      const sessionDiv = document.createElement('div');
      sessionDiv.style.position = 'absolute';
      sessionDiv.style.left = '-9999px';
      sessionDiv.style.width = '210mm';
      sessionDiv.style.padding = '15mm';
      sessionDiv.style.backgroundColor = 'white';
      sessionDiv.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      
      let sessionHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="margin-bottom: 10px; padding: 10px; background-color: #f5f5f5; border-radius: 8px;">
            <span style="font-size: 14px; color: #666;">세션 ${index + 1} / ${sessions.length}</span>
          </div>
          <h1 style="font-size: 24px; margin-bottom: 15px; color: #333;">${session.title}</h1>
          <p style="font-size: 14px; color: #666; margin-bottom: 25px; line-height: 1.5;">${session.summary}</p>
      `;
      
      // 주요 토픽
      if (session.keyTopics && session.keyTopics.length > 0) {
        sessionHtml += `
          <div style="margin-bottom: 20px;">
            <h3 style="font-size: 16px; margin-bottom: 10px;">📌 주요 토픽</h3>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              ${session.keyTopics.map(topic => 
                `<span style="background-color: #e3f2fd; color: #1976d2; padding: 4px 12px; border-radius: 16px; font-size: 12px;">${topic}</span>`
              ).join('')}
            </div>
          </div>
        `;
      }
      
      // AI 인사이트
      if (session.aiInsights) {
        sessionHtml += '<div style="margin-bottom: 20px;">';
        
        // 주요 인사이트
        if (session.aiInsights.keyInsights && session.aiInsights.keyInsights.length > 0) {
          sessionHtml += `
            <div style="background-color: #f0f7ff; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
              <h4 style="font-size: 14px; margin-bottom: 10px; color: #1976d2;">✨ 주요 인사이트</h4>
              <ul style="margin: 0; padding-left: 20px;">
                ${session.aiInsights.keyInsights.map(insight => 
                  `<li style="margin-bottom: 5px; font-size: 13px;">${insight}</li>`
                ).join('')}
              </ul>
            </div>
          `;
        }
        
        // 코드 품질
        const hasStrengths = session.aiInsights.codeQuality?.strengths && session.aiInsights.codeQuality.strengths.length > 0;
        const hasImprovements = session.aiInsights.codeQuality?.improvements && session.aiInsights.codeQuality.improvements.length > 0;
        
        if (hasStrengths || hasImprovements) {
          sessionHtml += '<div style="display: flex; gap: 15px; margin-bottom: 15px;">';
          
          if (hasStrengths) {
            sessionHtml += `
              <div style="flex: 1; background-color: #f0fdf4; padding: 15px; border-radius: 8px;">
                <h4 style="font-size: 14px; margin-bottom: 10px; color: #16a34a;">✅ 강점</h4>
                <ul style="margin: 0; padding-left: 20px;">
                  ${session.aiInsights.codeQuality!.strengths!.map(strength => 
                    `<li style="margin-bottom: 5px; font-size: 12px;">${strength}</li>`
                  ).join('')}
                </ul>
              </div>
            `;
          }
          
          if (hasImprovements) {
            sessionHtml += `
              <div style="flex: 1; background-color: #fffbeb; padding: 15px; border-radius: 8px;">
                <h4 style="font-size: 14px; margin-bottom: 10px; color: #ca8a04;">⚠️ 개선사항</h4>
                <ul style="margin: 0; padding-left: 20px;">
                  ${session.aiInsights.codeQuality!.improvements!.map(improvement => 
                    `<li style="margin-bottom: 5px; font-size: 12px;">${improvement}</li>`
                  ).join('')}
                </ul>
              </div>
            `;
          }
          
          sessionHtml += '</div>';
        }
        
        // 타임라인
        if (session.aiInsights.timeline) {
          const hasMainTasks = session.aiInsights.timeline.mainTasks && session.aiInsights.timeline.mainTasks.length > 0;
          const hasChallenges = session.aiInsights.timeline.challenges && session.aiInsights.timeline.challenges.length > 0;
          
          if (hasMainTasks || hasChallenges) {
            sessionHtml += `
              <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px;">
                <h4 style="font-size: 14px; margin-bottom: 10px;">📅 작업 타임라인</h4>
            `;
            
            if (hasMainTasks) {
              sessionHtml += `
                <div style="margin-bottom: 10px;">
                  <h5 style="font-size: 12px; color: #666; margin-bottom: 5px;">주요 작업</h5>
                  <ul style="margin: 0; padding-left: 20px;">
                    ${session.aiInsights.timeline.mainTasks!.map(task => 
                      `<li style="margin-bottom: 3px; font-size: 12px;">✓ ${task}</li>`
                    ).join('')}
                  </ul>
                </div>
              `;
            }
            
            if (hasChallenges) {
              sessionHtml += `
                <div>
                  <h5 style="font-size: 12px; color: #666; margin-bottom: 5px;">해결한 문제</h5>
                  <ul style="margin: 0; padding-left: 20px;">
                    ${session.aiInsights.timeline.challenges!.map(challenge => 
                      `<li style="margin-bottom: 3px; font-size: 12px;">🔧 ${challenge}</li>`
                    ).join('')}
                  </ul>
                </div>
              `;
            }
            
            sessionHtml += '</div>';
          }
        }
        
        sessionHtml += '</div>';
      }
      
      sessionHtml += `
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e0e0e0; text-align: center; color: #999; font-size: 11px;">
          Generated by Claude Report Analyzer • ${dateStr}
        </div>
      </div>
      `;
      
      sessionDiv.innerHTML = sessionHtml;
      document.body.appendChild(sessionDiv);
      
      try {
        // 세션 페이지 렌더링
        const sessionCanvas = await html2canvas(sessionDiv, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });
        
        const sessionImgHeight = (sessionCanvas.height * imgWidth) / sessionCanvas.width;
        
        pdf.addImage(
          sessionCanvas.toDataURL('image/png'),
          'PNG',
          0,
          0,
          imgWidth,
          Math.min(sessionImgHeight, 297)
        );
      } finally {
        document.body.removeChild(sessionDiv);
      }
    }
    
    // 파일명 생성 및 저장
    const date = new Date(report.date).toISOString().split('T')[0];
    const filename = selectedSession 
      ? `report_${date}_${selectedSession.sessionId}.pdf`
      : `report_${date}_full.pdf`;
    
    pdf.save(filename);
  } catch (error) {
    console.error('PDF 생성 중 오류:', error);
    // 타이틀 div가 남아있을 경우 제거
    if (titleDiv.parentNode) {
      document.body.removeChild(titleDiv);
    }
    throw error;
  }
}