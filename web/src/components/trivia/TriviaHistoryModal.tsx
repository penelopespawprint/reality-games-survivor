/**
 * Trivia History Modal
 * Shows all past answered questions with answers and fun facts
 */

import { useQuery } from '@tanstack/react-query';
import { X, CheckCircle, Loader2, History } from 'lucide-react';
import { apiWithAuth } from '@/lib/api';

interface HistoryQuestion {
  questionNumber: number;
  question: string;
  options: string[];
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
  funFact: string | null;
  castaway: string | null;
  answeredAt: string;
}

interface TriviaHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string;
}

export function TriviaHistoryModal({ isOpen, onClose, accessToken }: TriviaHistoryModalProps) {
  const { data, isLoading } = useQuery<{ history: HistoryQuestion[] }>({
    queryKey: ['trivia', 'history'],
    queryFn: async () => {
      const response = await apiWithAuth<{ data: { history: HistoryQuestion[] } }>(
        '/trivia/history',
        accessToken
      );
      if (response.error) throw new Error(response.error);
      return response.data?.data || { history: [] };
    },
    enabled: isOpen && !!accessToken,
  });

  if (!isOpen) return null;

  const history = data?.history || [];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-cream-200 flex items-center justify-between bg-gradient-to-r from-burgundy-50 to-amber-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-burgundy-100 rounded-full flex items-center justify-center">
              <History className="h-5 w-5 text-burgundy-600" />
            </div>
            <div>
              <h2 className="text-lg font-display font-bold text-neutral-800">Past Questions</h2>
              <p className="text-sm text-neutral-500">{history.length} questions answered correctly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-burgundy-500 animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-500">No questions answered yet</p>
              <p className="text-sm text-neutral-400 mt-1">Start the trivia to see your history here!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item, index) => (
                <div
                  key={index}
                  className="bg-cream-50 rounded-xl border border-cream-200 overflow-hidden"
                >
                  {/* Question Header */}
                  <div className="p-4 border-b border-cream-200 bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-burgundy-100 text-burgundy-700 text-xs font-bold rounded">
                          Q{item.questionNumber}
                        </span>
                        {item.castaway && (
                          <span className="text-xs text-neutral-500">{item.castaway}</span>
                        )}
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    </div>
                    <p className="mt-2 font-medium text-neutral-800">{item.question}</p>
                  </div>

                  {/* Options */}
                  <div className="p-4 space-y-2">
                    {item.options.map((option, optIndex) => {
                      const isCorrect = optIndex === item.correctIndex;
                      const wasSelected = optIndex === item.selectedIndex;

                      return (
                        <div
                          key={optIndex}
                          className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                            isCorrect
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : 'bg-white text-neutral-600 border border-cream-200'
                          }`}
                        >
                          <span className="font-medium w-6">
                            {String.fromCharCode(65 + optIndex)}.
                          </span>
                          <span className="flex-1">{option}</span>
                          {isCorrect && wasSelected && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Fun Fact */}
                  {item.funFact && (
                    <div className="px-4 pb-4">
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-xs font-semibold text-amber-700 mb-1">Fun Fact</p>
                        <p className="text-sm text-amber-900">{item.funFact}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-cream-200 bg-cream-50">
          <button
            onClick={onClose}
            className="w-full py-3 bg-burgundy-600 hover:bg-burgundy-700 text-white font-semibold rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
