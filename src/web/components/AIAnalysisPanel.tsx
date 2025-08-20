import React, { useState, useEffect } from 'react';
import { Brain, Loader2, AlertCircle, FileText, ToggleLeft, ToggleRight } from 'lucide-react';
import type { SessionReport } from '../../shared/types';
import type { ClaudeMessage } from '../../cli/utils/sessionAnalyzer';

interface AIAnalysisPanelProps {
  session: SessionReport;
  projectId: string;
}

interface RawSessionData {
  sessionId: string;
  name: string;
  created: string;
  updated: string;
  messages: ClaudeMessage[];
}

export function AIAnalysisPanel({ session, projectId }: AIAnalysisPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRawData, setShowRawData] = useState(false);
  const [rawData, setRawData] = useState<RawSessionData | null>(null);
  const [loadingRawData, setLoadingRawData] = useState(false);

  useEffect(() => {
    if (showRawData && !rawData) {
      fetchRawData();
    }
  }, [showRawData]);

  const fetchRawData = async () => {
    setLoadingRawData(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/sessions/${encodeURIComponent(session.sessionId)}/raw`);
      
      if (!response.ok) {
        throw new Error('원본 데이터를 가져오는데 실패했습니다');
      }

      const data = await response.json();
      setRawData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoadingRawData(false);
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      // API 서버로 AI 분석 요청
      const response = await fetch(`/api/analyze/${session.sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('분석 요청 실패');
      }

      const result = await response.json();
      
      // 분석 결과로 페이지 새로고침
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 이미 AI 분석이 완료된 경우
  if (session.aiInsights) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
            {showRawData ? (
              <>
                <FileText className="w-5 h-5" />
                원본 대화 내용
              </>
            ) : (
              <>
                <Brain className="w-5 h-5" />
                AI 분석 결과
              </>
            )}
          </h3>
          <button
            onClick={() => setShowRawData(!showRawData)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-blue-300 text-blue-700 rounded-md hover:bg-blue-50 transition-colors"
          >
            {showRawData ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            {showRawData ? 'AI 분석 보기' : '원본 대화 보기'}
          </button>
        </div>
        
        {error && (
          <div className="flex items-center gap-2 text-red-600 mb-4">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* AI 분석 결과 표시 */}
        {!showRawData && (
          <div className="space-y-4">
            {/* 핵심 인사이트 */}
            <div>
              <h4 className="font-medium text-blue-800 mb-2">핵심 인사이트</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                {session.aiInsights.keyInsights.map((insight, idx) => (
                  <li key={idx}>{insight}</li>
                ))}
              </ul>
            </div>

            {/* 코드 품질 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-green-800 mb-2">강점</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {session.aiInsights.codeQuality.strengths.map((strength, idx) => (
                    <li key={idx}>{strength}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-amber-800 mb-2">개선사항</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {session.aiInsights.codeQuality.improvements.map((improvement, idx) => (
                    <li key={idx}>{improvement}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 타임라인 */}
            <div>
              <h4 className="font-medium text-blue-800 mb-2">작업 타임라인</h4>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-600">주요 작업:</span>
                  <p className="text-gray-700">{session.aiInsights.timeline.mainTasks.join(', ')}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">완료된 목표:</span>
                  <p className="text-gray-700">{session.aiInsights.timeline.completedGoals.join(', ')}</p>
                </div>
                {session.aiInsights.timeline.challenges.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">도전과제:</span>
                    <p className="text-gray-700">{session.aiInsights.timeline.challenges.join(', ')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 원본 데이터 표시 */}
        {showRawData && (
          <div className="space-y-4">
            {loadingRawData ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">원본 데이터 로딩 중...</span>
              </div>
            ) : rawData ? (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {rawData.messages.map((message, index) => (
                  <div key={index} className={`p-4 rounded-lg ${message.role === 'user' ? 'bg-gray-100' : 'bg-white border border-gray-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`font-semibold ${message.role === 'user' ? 'text-blue-700' : 'text-green-700'}`}>
                        {message.role === 'user' ? '👤 사용자' : '🤖 Claude'}
                      </span>
                      {message.timestamp && (
                        <span className="text-xs text-gray-500">
                          {new Date(message.timestamp).toLocaleString('ko-KR')}
                        </span>
                      )}
                    </div>
                    <div className="whitespace-pre-wrap text-sm text-gray-700">
                      {message.content}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                원본 데이터를 불러올 수 없습니다.
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // AI 분석이 아직 안 된 경우
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Brain className="w-5 h-5" />
          AI 분석
        </h3>
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              분석 중...
            </>
          ) : (
            <>
              <Brain className="w-4 h-4" />
              AI 분석 시작
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 mb-4">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <p className="text-gray-600">
        Claude AI를 사용하여 이 세션의 코드를 분석하고 인사이트를 생성합니다.
        로컬에 Claude Code가 실행 중이어야 합니다.
      </p>
    </div>
  );
}