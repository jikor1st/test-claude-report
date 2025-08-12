import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, FileText, ChevronRight } from 'lucide-react';
import type { DailyReport } from '../types';

interface ReportListProps {
  projectId: string;
  reports: DailyReport[];
}

const ReportList: React.FC<ReportListProps> = ({ projectId, reports }) => {
  if (reports.length === 0) {
    return (
      <div className="p-8 text-center">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-sm font-medium">리포트가 없습니다</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          이 프로젝트의 대화 세션을 분석하여 리포트를 생성하세요
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {reports.map((report) => (
        <Link
          key={report.date}
          to={`/project/${projectId}/report/${report.date}`}
          className="group flex items-center justify-between px-6 py-4 hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-primary/10 p-2 text-primary group-hover:bg-primary/20 transition-colors">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium">
                {new Date(report.date).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long'
                })}
              </h3>
              <p className="text-sm text-muted-foreground">{report.summary}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-2xl font-bold">{report.totalSessions}</p>
              <p className="text-xs text-muted-foreground">세션</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
        </Link>
      ))}
    </div>
  );
};

export default ReportList;