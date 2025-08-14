import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { DailyReport, SessionReport } from '../types';

export async function generatePDFFromElement(element: HTMLElement, filename: string): Promise<void> {
  try {
    // 캔버스로 변환
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    // 첫 페이지 추가
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // 필요한 경우 추가 페이지
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  } catch (error) {
    console.error('PDF 생성 중 오류 발생:', error);
    throw error;
  }
}

export function generatePDFFromReport(report: DailyReport, selectedSession?: SessionReport): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      // 폰트 설정
      pdf.setFont('helvetica');

      // 제목
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      const title = `${new Date(report.date).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      })} 리포트`;
      pdf.text(title, margin, yPosition);
      yPosition += 15;

      // 요약
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      const summaryLines = pdf.splitTextToSize(report.summary, contentWidth);
      pdf.text(summaryLines, margin, yPosition);
      yPosition += summaryLines.length * 5 + 10;

      // 구분선
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      // 세션 처리
      const sessions = selectedSession ? [selectedSession] : report.sessions;

      sessions.forEach((session, index) => {
        // 페이지 체크
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = margin;
        }

        // 세션 제목
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        const sessionTitle = selectedSession ? session.title : `${index + 1}. ${session.title}`;
        const titleLines = pdf.splitTextToSize(sessionTitle, contentWidth);
        pdf.text(titleLines, margin, yPosition);
        yPosition += titleLines.length * 7 + 5;

        // 세션 요약
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        const sessionSummaryLines = pdf.splitTextToSize(session.summary, contentWidth);
        pdf.text(sessionSummaryLines, margin, yPosition);
        yPosition += sessionSummaryLines.length * 5 + 8;

        // 주요 토픽
        if (session.keyTopics && session.keyTopics.length > 0) {
          pdf.setFont('helvetica', 'bold');
          pdf.text('주요 토픽:', margin, yPosition);
          yPosition += 6;
          
          pdf.setFont('helvetica', 'normal');
          session.keyTopics.forEach(topic => {
            if (yPosition > pageHeight - 20) {
              pdf.addPage();
              yPosition = margin;
            }
            pdf.text(`• ${topic}`, margin + 5, yPosition);
            yPosition += 5;
          });
          yPosition += 5;
        }

        // AI 인사이트
        if (session.aiInsights) {
          // 주요 인사이트
          if (session.aiInsights.keyInsights && session.aiInsights.keyInsights.length > 0) {
            if (yPosition > pageHeight - 30) {
              pdf.addPage();
              yPosition = margin;
            }
            
            pdf.setFont('helvetica', 'bold');
            pdf.text('AI 분석 - 주요 인사이트:', margin, yPosition);
            yPosition += 6;
            
            pdf.setFont('helvetica', 'normal');
            session.aiInsights.keyInsights.forEach(insight => {
              if (yPosition > pageHeight - 20) {
                pdf.addPage();
                yPosition = margin;
              }
              const insightLines = pdf.splitTextToSize(`• ${insight}`, contentWidth - 5);
              pdf.text(insightLines, margin + 5, yPosition);
              yPosition += insightLines.length * 5;
            });
            yPosition += 5;
          }

          // 코드 품질 - 강점
          if (session.aiInsights.codeQuality?.strengths && session.aiInsights.codeQuality.strengths.length > 0) {
            if (yPosition > pageHeight - 30) {
              pdf.addPage();
              yPosition = margin;
            }
            
            pdf.setFont('helvetica', 'bold');
            pdf.text('코드 품질 - 강점:', margin, yPosition);
            yPosition += 6;
            
            pdf.setFont('helvetica', 'normal');
            session.aiInsights.codeQuality.strengths.forEach(strength => {
              if (yPosition > pageHeight - 20) {
                pdf.addPage();
                yPosition = margin;
              }
              const strengthLines = pdf.splitTextToSize(`• ${strength}`, contentWidth - 5);
              pdf.text(strengthLines, margin + 5, yPosition);
              yPosition += strengthLines.length * 5;
            });
            yPosition += 5;
          }

          // 코드 품질 - 개선사항
          if (session.aiInsights.codeQuality?.improvements && session.aiInsights.codeQuality.improvements.length > 0) {
            if (yPosition > pageHeight - 30) {
              pdf.addPage();
              yPosition = margin;
            }
            
            pdf.setFont('helvetica', 'bold');
            pdf.text('코드 품질 - 개선사항:', margin, yPosition);
            yPosition += 6;
            
            pdf.setFont('helvetica', 'normal');
            session.aiInsights.codeQuality.improvements.forEach(improvement => {
              if (yPosition > pageHeight - 20) {
                pdf.addPage();
                yPosition = margin;
              }
              const improvementLines = pdf.splitTextToSize(`• ${improvement}`, contentWidth - 5);
              pdf.text(improvementLines, margin + 5, yPosition);
              yPosition += improvementLines.length * 5;
            });
            yPosition += 5;
          }

          // 타임라인
          if (session.aiInsights.timeline) {
            if (session.aiInsights.timeline.mainTasks && session.aiInsights.timeline.mainTasks.length > 0) {
              if (yPosition > pageHeight - 30) {
                pdf.addPage();
                yPosition = margin;
              }
              
              pdf.setFont('helvetica', 'bold');
              pdf.text('작업 타임라인 - 주요 작업:', margin, yPosition);
              yPosition += 6;
              
              pdf.setFont('helvetica', 'normal');
              session.aiInsights.timeline.mainTasks.forEach(task => {
                if (yPosition > pageHeight - 20) {
                  pdf.addPage();
                  yPosition = margin;
                }
                const taskLines = pdf.splitTextToSize(`✓ ${task}`, contentWidth - 5);
                pdf.text(taskLines, margin + 5, yPosition);
                yPosition += taskLines.length * 5;
              });
              yPosition += 5;
            }

            if (session.aiInsights.timeline.challenges && session.aiInsights.timeline.challenges.length > 0) {
              if (yPosition > pageHeight - 30) {
                pdf.addPage();
                yPosition = margin;
              }
              
              pdf.setFont('helvetica', 'bold');
              pdf.text('해결한 문제:', margin, yPosition);
              yPosition += 6;
              
              pdf.setFont('helvetica', 'normal');
              session.aiInsights.timeline.challenges.forEach(challenge => {
                if (yPosition > pageHeight - 20) {
                  pdf.addPage();
                  yPosition = margin;
                }
                const challengeLines = pdf.splitTextToSize(`• ${challenge}`, contentWidth - 5);
                pdf.text(challengeLines, margin + 5, yPosition);
                yPosition += challengeLines.length * 5;
              });
              yPosition += 5;
            }
          }
        }

        // 세션 간 구분
        if (index < sessions.length - 1) {
          yPosition += 5;
          pdf.setDrawColor(200, 200, 200);
          pdf.line(margin, yPosition, pageWidth - margin, yPosition);
          yPosition += 10;
        }
      });

      // 푸터
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'italic');
        pdf.text(
          `Generated by Claude Report Analyzer - Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      // 파일명 생성
      const date = new Date(report.date).toISOString().split('T')[0];
      const filename = selectedSession 
        ? `report_${date}_${selectedSession.sessionId}.pdf`
        : `report_${date}_full.pdf`;

      pdf.save(filename);
      resolve();
    } catch (error) {
      console.error('PDF 생성 중 오류:', error);
      reject(error);
    }
  });
}