import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Loader2, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

interface SessionData {
  total: number;
  analyzed: number;
  unanalyzed: number;
  sessions: Array<{
    id: string;
    name: string;
    created: string;
    analyzed: boolean;
  }>;
}

interface SessionCalendarProps {
  projectId: string;
  sessionsByDate: Record<string, SessionData>;
  onDateSelect: (date: string, data: SessionData) => void;
  analyzingDates?: Set<string>;
}

const SessionCalendar: React.FC<SessionCalendarProps> = ({ 
  projectId, 
  sessionsByDate, 
  onDateSelect,
  analyzingDates = new Set()
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days: (number | null)[] = [];
    
    // 이전 달의 빈 칸
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    // 현재 달의 날짜들
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };

  const formatDate = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleDateClick = (day: number) => {
    const dateStr = formatDate(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(dateStr);
    
    if (sessionsByDate[dateStr]) {
      onDateSelect(dateStr, sessionsByDate[dateStr]);
    }
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ];
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          {currentDate.getFullYear()}년 {monthNames[currentDate.getMonth()]}
        </h3>
        
        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} />;
          }

          const dateStr = formatDate(currentDate.getFullYear(), currentDate.getMonth(), day);
          const sessionData = sessionsByDate[dateStr];
          const isAnalyzing = analyzingDates.has(dateStr);
          const hasData = !!sessionData;
          const hasUnanalyzed = sessionData?.unanalyzed > 0;
          const allAnalyzed = sessionData && sessionData.unanalyzed === 0 && sessionData.analyzed > 0;

          return (
            <button
              key={day}
              onClick={() => handleDateClick(day)}
              disabled={!hasData}
              className={cn(
                "aspect-square p-2 rounded-lg border transition-all relative group",
                "hover:bg-gray-50 hover:border-gray-300",
                selectedDate === dateStr && "bg-primary/10 border-primary",
                !hasData && "opacity-50 cursor-not-allowed",
                isAnalyzing && "animate-pulse bg-blue-50 border-blue-300"
              )}
            >
              <div className="text-sm font-medium">{day}</div>
              
              {hasData && (
                <div className="absolute bottom-1 left-1 right-1">
                  {isAnalyzing ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    </div>
                  ) : allAnalyzed ? (
                    <div className="flex items-center justify-center">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    </div>
                  ) : hasUnanalyzed ? (
                    <div className="flex items-center justify-center gap-0.5">
                      <Sparkles className="h-3 w-3 text-yellow-500" />
                      <span className="text-[10px] font-bold text-yellow-600">
                        {sessionData.unanalyzed}
                      </span>
                    </div>
                  ) : null}
                </div>
              )}
              
              {hasData && (
                <div className="absolute top-0.5 right-0.5">
                  <span className="text-[10px] text-gray-500">
                    {sessionData.total}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-center gap-6 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-yellow-500" />
          <span>분석 필요</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3 text-green-500" />
          <span>분석 완료</span>
        </div>
        <div className="flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          <span>분석 중</span>
        </div>
      </div>
    </div>
  );
};

export default SessionCalendar;