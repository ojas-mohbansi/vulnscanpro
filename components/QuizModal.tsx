import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, HelpCircle, Trophy, ArrowRight, Loader2 } from 'lucide-react';
import { QuizQuestion } from '../types';
import { QuizService } from '../lib/services/quizService';
import { GamificationService } from '../lib/services/gamification';

interface QuizModalProps {
  onClose: () => void;
}

const QuizModal: React.FC<QuizModalProps> = ({ onClose }) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    loadQuiz();
  }, []);

  const loadQuiz = async () => {
    setLoading(true);
    const qs = await QuizService.getQuestions(3);
    setQuestions(qs);
    setLoading(false);
  };

  const handleOptionClick = (option: string) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);
    
    if (option === questions[currentIndex].correctAnswer) {
      setScore(s => s + 1);
      GamificationService.awardXp(10); // 10 XP per correct answer
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(c => c + 1);
      setIsAnswered(false);
      setSelectedOption(null);
    } else {
      setFinished(true);
      if (score > 0) {
        GamificationService.unlockBadge('quiz_whiz');
      }
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-slate-900 border border-slate-700 p-8 rounded-xl flex flex-col items-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-slate-300">Generating Quiz...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 w-full max-w-lg rounded-xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-white">Security Knowledge Check</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {!finished ? (
            <div className="space-y-6">
              <div className="flex justify-between text-xs text-slate-500 font-mono mb-2">
                <span>Question {currentIndex + 1} of {questions.length}</span>
                <span>Score: {score}</span>
              </div>
              
              <h3 className="text-lg font-medium text-white leading-relaxed">
                {questions[currentIndex].question}
              </h3>

              <div className="space-y-3">
                {questions[currentIndex].options.map((opt, idx) => {
                  let btnClass = "w-full p-4 text-left rounded-lg border transition-all relative ";
                  if (isAnswered) {
                    if (opt === questions[currentIndex].correctAnswer) {
                      btnClass += "bg-green-500/10 border-green-500 text-green-400";
                    } else if (opt === selectedOption) {
                      btnClass += "bg-red-500/10 border-red-500 text-red-400 opacity-60";
                    } else {
                      btnClass += "bg-slate-800 border-slate-700 text-slate-500 opacity-50";
                    }
                  } else {
                    btnClass += "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750 hover:border-slate-600 hover:shadow-md";
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleOptionClick(opt)}
                      disabled={isAnswered}
                      className={btnClass}
                    >
                      <span className="pr-8 block">{opt}</span>
                      {isAnswered && opt === questions[currentIndex].correctAnswer && (
                        <CheckCircle className="w-5 h-5 absolute right-4 top-4 text-green-500" />
                      )}
                      {isAnswered && opt === selectedOption && opt !== questions[currentIndex].correctAnswer && (
                        <XCircle className="w-5 h-5 absolute right-4 top-4 text-red-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              {isAnswered && (
                <div className="animate-in fade-in slide-in-from-bottom-4">
                  <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg mb-4">
                    <p className="text-sm text-blue-300">
                      <span className="font-bold">Explanation:</span> {questions[currentIndex].explanation}
                    </p>
                  </div>
                  <button 
                    onClick={handleNext}
                    className="w-full py-3 bg-primary hover:bg-primary.hover text-slate-900 font-bold rounded-lg flex items-center justify-center gap-2"
                  >
                    {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 space-y-6">
              <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-yellow-500/50">
                <Trophy className="w-10 h-10 text-yellow-500" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Quiz Completed!</h3>
                <p className="text-slate-400">You scored <span className="text-white font-bold">{score} / {questions.length}</span></p>
              </div>
              
              <div className="bg-slate-800 p-4 rounded-lg inline-block">
                 <p className="text-sm text-slate-300">XP Earned</p>
                 <p className="text-2xl font-mono text-primary">+{score * 10} XP</p>
              </div>

              <button onClick={onClose} className="block w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium">
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizModal;
