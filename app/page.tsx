"use client";

import { useState, useEffect } from "react";
import { BookOpen, Sparkles, Calendar, RotateCcw, Save, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { analyzeDiary, saveToSheet, getDiaryList } from "./actions";

const sentiments = [
  { id: "happy", emoji: "😊", label: "행복함", color: "text-yellow-500", bgColor: "bg-yellow-100" },
  { id: "sad", emoji: "😢", label: "슬픔", color: "text-blue-500", bgColor: "bg-blue-100" },
  { id: "angry", emoji: "😠", label: "화남", color: "text-red-500", bgColor: "bg-red-100" },
  { id: "surprised", emoji: "😲", label: "놀람", color: "text-purple-500", bgColor: "bg-purple-100" },
  { id: "calm", emoji: "😌", label: "평온함", color: "text-green-500", bgColor: "bg-green-100" },
];

export default function Home() {
  const [diaryText, setDiaryText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    title: string;
    sentimentId: string | null;
    text: string;
  } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // 일기 목록 관련 상태
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [diaries, setDiaries] = useState<{ datetime: string; diary: string }[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [loadedDiaryDate, setLoadedDiaryDate] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAnalyze = async () => {
    if (!diaryText.trim()) return;

    setIsAnalyzing(true);
    setAnalysisResult(null); // Clear previous result
    
    try {
      const result = await analyzeDiary(diaryText);
      setAnalysisResult(result);
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "분석 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRestart = () => {
    if (confirm("일기를 초기화하시겠습니까? 작성 중인 내용이 사라집니다.")) {
      setDiaryText("");
      setAnalysisResult(null);
      setLoadedDiaryDate(null);
    }
  };

  const resetUI = () => {
    setDiaryText("");
    setAnalysisResult(null);
    setLoadedDiaryDate(null);
  };

  const handleSave = async () => {
    if (!diaryText.trim()) return;

    setIsSaving(true);
    try {
      await saveToSheet(diaryText);
      alert("일기가 구글 시트에 성공적으로 저장되었습니다!");
      resetUI();
    } catch (error: any) {
      console.error("Save Error:", error);
      alert(error?.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenList = async () => {
    setIsListModalOpen(true);
    setIsLoadingList(true);
    try {
      const list = await getDiaryList();
      setDiaries(list);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsLoadingList(false);
    }
  };

  const handleSelectDiary = (diaryEntry: { datetime: string; diary: string }) => {
    setDiaryText(diaryEntry.diary);
    setLoadedDiaryDate(diaryEntry.datetime);
    setAnalysisResult(null); // 분석 결과는 초기화 (필요시 새로 분석 가능)
    setIsListModalOpen(false);
  };

  const formatDate = (date: Date) => {
    const days = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayName = days[date.getDay()];
    return {
      main: `${month}월 ${day}일`,
      sub: `${dayName} • ${date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: true })}`
    };
  };

  const formatLoadedDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return { main: dateStr, sub: "저장된 일기" };
      return formatDate(date);
    } catch {
      return { main: dateStr, sub: "저장된 일기" };
    }
  };

  const dateInfo = loadedDiaryDate ? formatLoadedDate(loadedDiaryDate) : formatDate(currentTime);

  return (
    <div className="min-h-screen bg-[#f0f4f9] text-[#1e293b] font-sans p-6 md:p-12 pb-32">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex justify-between items-start">
          <div className="space-y-1">
            <h1 className="text-5xl font-extrabold tracking-tight text-[#2d3a54]">
              {mounted ? dateInfo.main : "--월 --일"}
            </h1>
            <p className="text-zinc-500 font-medium text-lg min-h-[1.75rem]">
              {mounted ? dateInfo.sub : ""}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button 
              onClick={handleOpenList}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl shadow-sm border border-zinc-100 text-zinc-600 font-semibold hover:bg-zinc-50 transition-all"
            >
              <BookOpen size={18} className="text-indigo-500" />
              일기 목록
            </button>
            <h2 className="text-2xl font-bold mt-4 text-[#2d3a54]">오늘의 일기 회고</h2>
          </div>
        </header>

        {/* Diary Input Section */}
        <div className="relative group">
          <textarea
            value={diaryText}
            onChange={(e) => setDiaryText(e.target.value)}
            placeholder="오늘 하루는 어떠셨나요? 당신의 마음을 들려주세요."
            className="w-full h-96 p-10 bg-white rounded-[40px] shadow-sm border-none focus:ring-4 focus:ring-indigo-100 transition-all text-xl resize-none placeholder-zinc-300 placeholder:font-medium leading-relaxed"
          />
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !diaryText.trim()}
            className={`absolute bottom-8 right-8 flex items-center gap-2 px-6 py-4 rounded-3xl font-bold text-white shadow-lg transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 ${
              isAnalyzing ? 'bg-indigo-400' : 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600'
            }`}
          >
            {isAnalyzing ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                <Sparkles size={20} />
              </motion.div>
            ) : (
              <Sparkles size={20} />
            )}
            {isAnalyzing ? "분석 중..." : "AI 분석하기"}
          </button>
        </div>

        {/* AI Analysis Title Section */}
        <AnimatePresence>
          {analysisResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center"
            >
              <div className="bg-indigo-50 px-6 py-2 rounded-full border border-indigo-100">
                <span className="text-indigo-600 font-bold text-lg">
                  ✨ {analysisResult.title}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sentiment Emojis Area */}
        <div className="bg-white p-6 md:p-8 px-8 md:px-14 rounded-[35px] shadow-sm flex justify-between items-center transition-all border border-zinc-100/50">
          {sentiments.map((s) => {
            const isActive = analysisResult?.sentimentId === s.id;
            return (
              <div key={s.id} className="flex flex-col items-center gap-3">
                <motion.div 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-3xl md:text-4xl transition-all duration-500 relative cursor-pointer ${
                    isActive 
                      ? `${s.bgColor} ring-4 ring-white shadow-lg` 
                      : 'bg-[#f1f5f9] grayscale opacity-40 hover:grayscale-0 hover:opacity-100'
                  }`}
                  onClick={() => {
                    if (!isAnalyzing) {
                      setAnalysisResult({
                        title: "감정 선택",
                        sentimentId: s.id,
                        text: `수동으로 '${s.label}' 감정을 선택하셨습니다.`,
                      });
                    }
                  }}
                >
                  {s.emoji}
                </motion.div>
                <AnimatePresence>
                  {isActive && (
                    <motion.span 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`font-bold text-sm md:text-base ${s.color}`}
                    >
                      {s.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* AI Analysis Result Text */}
        <AnimatePresence>
          {analysisResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white/60 backdrop-blur-md p-10 rounded-[40px] border border-white/40 shadow-xl"
            >
              <h3 className="text-indigo-600 font-bold mb-4 flex items-center gap-2 text-lg">
                <Sparkles size={18} />
                AI 일기 감성 분석 결과
              </h3>
              <p className="text-zinc-700 text-xl leading-relaxed font-medium">
                {analysisResult.text}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons (Restart & Save) */}
        <div className="flex justify-center gap-4 py-4">
          <button
            onClick={handleRestart}
            className="flex items-center gap-2 px-8 py-4 bg-zinc-200 text-zinc-600 rounded-3xl font-bold hover:bg-zinc-300 transition-all"
          >
            <RotateCcw size={20} />
            재시작
          </button>
          <button
            onClick={handleSave}
            disabled={!diaryText.trim() || isSaving}
            className="flex items-center gap-2 px-12 py-4 bg-[#2d3a54] text-white rounded-3xl font-bold hover:bg-[#1e293b] transition-all shadow-lg disabled:opacity-50"
          >
            <Save size={20} className={isSaving ? "animate-spin" : ""} />
            {isSaving ? "저장 중..." : "일기 저장"}
          </button>
        </div>
      </div>

      {/* Diary List Modal */}
      <AnimatePresence>
        {isListModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsListModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-8 border-b border-zinc-100 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-[#2d3a54] flex items-center gap-2">
                  <BookOpen className="text-indigo-500" />
                  과거 일기 목록
                </h2>
                <button 
                  onClick={() => setIsListModalOpen(false)}
                  className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
                >
                  <X size={24} className="text-zinc-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {isLoadingList ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="text-indigo-500"
                    >
                      <RotateCcw size={40} />
                    </motion.div>
                    <p className="text-zinc-500 font-medium text-lg">기록을 불러오는 중입니다...</p>
                  </div>
                ) : diaries.length === 0 ? (
                  <div className="text-center py-20 text-zinc-400">
                    <p>작성된 일기가 없습니다.</p>
                  </div>
                ) : (
                  diaries.map((entry, idx) => (
                    <motion.div
                      key={idx}
                      whileHover={{ x: 5 }}
                      onClick={() => handleSelectDiary(entry)}
                      className="p-6 bg-zinc-50 rounded-3xl cursor-pointer hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-indigo-400 background-indigo-100 px-3 py-1 bg-indigo-100/50 rounded-full">
                          {(() => {
                            const d = new Date(entry.datetime);
                            return isNaN(d.getTime()) 
                              ? entry.datetime.split(" ")[0] 
                              : `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
                          })()}
                        </span>
                        <span className="text-xs text-zinc-400 font-medium">
                          {(() => {
                            const d = new Date(entry.datetime);
                            return isNaN(d.getTime()) 
                              ? entry.datetime.split(" ").slice(1).join(" ") 
                              : d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: true });
                          })()}
                        </span>
                      </div>
                      <p className="text-zinc-600 line-clamp-2 leading-relaxed font-medium">
                        {entry.diary}
                      </p>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

