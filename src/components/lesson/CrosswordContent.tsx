import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBlockDetail, submitCrosswordAnswer } from "@/api/blocks";
import { CheckCircle2, ChevronRight, Loader2, Play, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import { useBlockSubmitStore } from "@/stores/useBlockSubmitStore";

interface CrosswordWord {
  id: number;
  clue: string;
  row: number;
  col: number;
  direction: string;
  length: number;
}

interface CrosswordData {
  display_name: string;
  completed: boolean;
  score: number;
  words: CrosswordWord[];
  keyword_coordinates: { row: number; col: number }[];
}

export function CrosswordContent({ usageKey }: { usageKey: string }) {
  const qc = useQueryClient();
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [activeWordId, setActiveWordId] = useState<number | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [restoredFromCache, setRestoredFromCache] = useState(false);

  const username = useAuthStore((s) => s.user?.username);

  // Fetch block detail and its specific student_view_data
  const { data: blockData, isLoading } = useQuery({
    queryKey: ["block-detail", usageKey, username],
    queryFn: () => getBlockDetail(usageKey, username),
    staleTime: 0,
  });

  const svd = blockData?.student_view_data as unknown as CrosswordData | undefined;

  // Set active answer clue logic + khôi phục từ cache
  useEffect(() => {
    if (started) {
      if (svd) {
        if (svd.words.length > 0) {
          if (!activeWordId) {
            setActiveWordId(svd.words[0].id);
          }
        }
      }
    }
    // Khôi phục kết quả từ session store nếu đã submit trước đó
    if (!restoredFromCache && svd) {
      const cached = useBlockSubmitStore.getState().getResult(usageKey);
      if (cached) {
        setResultMessage(cached.resultMessage);
        setIsCorrect(cached.isCorrect);
        if (cached.answers) {
          const restoredAnswers: Record<string, string> = {};
          for (const [k, v] of Object.entries(cached.answers)) {
            if (typeof v === "string") restoredAnswers[k] = v;
          }
          setAnswers(restoredAnswers);
        }
        setStarted(true);
      }
      setRestoredFromCache(true);
    }
  }, [started, svd, activeWordId, restoredFromCache, usageKey]);

  // Submit Mutation
  const submitMutation = useMutation({
    mutationFn: (payload: Record<string, string>) =>
      submitCrosswordAnswer(usageKey, payload),
    onSuccess: (data) => {
      let msg = data.message;
      if (data.status === "correct") {
        setIsCorrect(true);
        setResultMessage(msg);
        // Lưu vào session store
        useBlockSubmitStore.getState().setResult(usageKey, {
          resultMessage: msg,
          isCorrect: true,
          answers: { ...answers },
        });
        // Invalidate block detail and course completion
        qc.invalidateQueries({ queryKey: ["block-detail", usageKey] });
        qc.invalidateQueries({ queryKey: ["course-blocks"] });
      } else if (data.status === "already_completed") {
        setIsCorrect(true);
        setResultMessage("🎉 Chính xác! Tuyệt vời!");
        // Lưu vào session store
        useBlockSubmitStore.getState().setResult(usageKey, {
          resultMessage: "🎉 Chính xác! Tuyệt vời!",
          isCorrect: true,
          answers: { ...answers },
        });
      } else {
        setIsCorrect(false);
        setResultMessage(msg);
      }
    },
    onError: () => {
      setIsCorrect(false);
      setResultMessage("Không thể kết nối đến máy chủ.");
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!svd) {
    return (
      <div className="text-center p-10 mt-6 rounded-2xl border border-muted bg-muted/20">
        <p className="text-muted-foreground">Không tải được dữ liệu ô chữ.</p>
      </div>
    );
  }

  const words = svd.words;
  const keyword_coordinates = svd.keyword_coordinates;

  let keywordCol = 0;
  if (keyword_coordinates.length > 0) {
    if (keyword_coordinates[0].col !== undefined) {
      keywordCol = keyword_coordinates[0].col;
    }
  }

  // Xử lý gom đáp án
  const handleCellChange = (wordId: number, charIndex: number, value: string) => {
    const char = value.toUpperCase().replace(/[^A-ZĐ]/g, "");
    setAnswers((prev) => {
      let len = 0;
      const foundWord = words.find(w => w.id === wordId);
      if (foundWord) {
        len = foundWord.length;
      }

      let currentAnswer = prev[wordId];
      if (!currentAnswer) {
        let pad = "";
        for (let i = 0; i < len; i++) {
          pad += " ";
        }
        currentAnswer = pad;
      }
      const chars = currentAnswer.split("");
      chars[charIndex] = char;
      if (!char) {
        chars[charIndex] = " ";
      }

      return { ...prev, [wordId]: chars.join("") };
    });
  };

  let currentClue = "";
  const foundActiveWord = words.find((w) => w.id === activeWordId);
  if (foundActiveWord) {
    currentClue = foundActiveWord.clue;
  }

  const handleSubmit = () => {
    let isComplete = true;
    for (let w = 0; w < words.length; w++) {
      const word = words[w];
      const currentAns = answers[word.id];
      if (!currentAns) {
        isComplete = false;
      } else {
        if (currentAns.length < word.length) {
          isComplete = false;
        }
        if (currentAns.includes(" ")) {
          isComplete = false;
        }
      }
    }

    if (!isComplete) {
      setIsCorrect(false);
      setResultMessage("Bạn vui lòng lấp đầy tất cả các ô trống trước khi nộp bài nhé!");
      return;
    }

    // Gỡ thông báo cũ
    setResultMessage(null);
    setIsCorrect(null);

    // Trim spaces before submit
    const sanitizedAnswers: Record<string, string> = {};
    for (const key of Object.keys(answers)) {
      sanitizedAnswers[key] = answers[key].replace(/\s+/g, "");
    }
    submitMutation.mutate(sanitizedAnswers);
  };

  // --- Màn hình Hướng dẫn (Chưa bắt đầu) ---
  if (!started) {
    return (
      <div className="mt-8 rounded-[32px] border-2 border-primary/10 bg-[#F4F9FF] dark:bg-slate-900/50 p-8 shadow-sm relative overflow-hidden">
        {/* Trang trí góc phải */}
        <div className="absolute right-0 top-0 -mr-16 -mt-16 w-64 h-64 opacity-20 pointer-events-none">
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path fill="#0247A6" d="M44.7,-76.4C58.9,-69.2,71.8,-59.1,81.3,-46.3C90.8,-33.5,96.8,-18,97.7,-2.1C98.6,13.8,94.2,30.3,85.6,44.8C77,59.3,64.2,71.9,49.2,80.3C34.2,88.7,17.1,92.9,0.5,92.1C-16.1,91.3,-32.2,85.4,-46.8,76.5C-61.4,67.6,-74.6,55.7,-83.5,41.1C-92.4,26.5,-97.1,9.2,-95.7,-7.4C-94.3,-24,-86.7,-39.9,-75.6,-51.9C-64.5,-63.9,-49.9,-71.9,-35.5,-78.9C-21.1,-85.9,-10.5,-91.9,2.8,-96.5C16.1,-101.1,30.5,-83.6,44.7,-76.4Z" transform="translate(100 100)" />
          </svg>
        </div>

        <div className="mb-2 flex items-center gap-2">
          <span 
            className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider"
            style={{ backgroundColor: "#43FDD7", color: "#000" }}
          >
            Game
          </span>
        </div>
        <h2 className="mb-8 text-4xl font-black text-foreground">
          {svd.display_name || "Đố vui ô chữ"}
        </h2>

        <div className="mb-8 pl-4 border-l-4 border-primary">
          <h3 className="text-xl font-bold mb-4">Luật chơi cực đơn giản</h3>
          <ul className="space-y-3 text-[14px]">
            <li>
              <b>1. Giải đố:</b> Trả lời các câu hỏi hàng ngang để lấp đầy ô chữ.
            </li>
            <li>
              <b>2. Tìm từ khóa:</b> Từ khóa cuối cùng nằm ở hàng dọc (Cột màu xanh) và là một từ tiếng Việt / Tiếng Anh có ý nghĩa.
            </li>
            <li>
              <b>3. Quy tắc nhập:</b> Viết chữ không dấu và không khoảng trắng (Ví dụ: "Học tập" {">"} HOCTAP).
            </li>
          </ul>
        </div>

        <Button
          onClick={() => setStarted(true)}
          className="h-12 rounded-full px-8 font-bold text-[15px] shadow-lg transition-transform hover:scale-105"
        >
          Bắt đầu <Play className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Khối kết nối logic UI (Remove ternaries)
  let clueBoxTitle = "Nhấn vào ô chữ để xem câu hỏi...";
  if (currentClue) {
    clueBoxTitle = currentClue;
  }

  let spinner = null;
  if (submitMutation.isPending) {
    spinner = <Loader2 className="mr-2 h-5 w-5 animate-spin" />;
  }
  let actionArea = (
    <Button
      onClick={handleSubmit}
      disabled={submitMutation.isPending}
      className="h-12 w-full max-w-sm rounded-full font-bold text-[15px] shadow-lg"
    >
      {spinner}
      Nộp bài chấm điểm
    </Button>
  );

  let resultBlock = null;
  if (resultMessage) {
    let wrapperClass = "mb-4 w-full max-w-sm flex items-center gap-3 rounded-xl p-4 ";
    let textClass = "font-medium ";
    let icon = null;

    if (isCorrect) {
      wrapperClass += "bg-success/10 border border-success/20";
      textClass += "text-foreground text-[14px]";
      icon = <CheckCircle2 className="h-6 w-6 text-success shrink-0" />;
    } else {
      wrapperClass += "bg-destructive/10 border border-destructive/20";
      textClass += "text-foreground text-[14px]";
      icon = <XCircle className="h-6 w-6 text-destructive shrink-0" />;
    }

    resultBlock = (
      <div className={wrapperClass}>
        {icon}
        <p className={textClass}>{resultMessage}</p>
      </div>
    );
  }

  // --- Màn hình Chơi Game ---
  return (
    <div className="mt-8 rounded-[32px] border-2 border-primary/20 bg-[#F4F9FF] dark:bg-slate-900/50 p-6 md:p-10 shadow-sm relative overflow-hidden">

      {/* Khung gợi ý câu hỏi nổi bật */}
      <div className="mb-10 rounded-2xl border-2 border-primary/30 bg-white dark:bg-slate-800 p-6 shadow-sm text-center relative z-10 transition-all duration-300 transform">
        <h4 className="text-lg md:text-xl font-bold text-foreground">
          {clueBoxTitle}
        </h4>
      </div>

      {/* Lưới ô chữ */}
      <div className="w-full relative z-10 mb-8 overflow-x-auto pt-2 pb-4 px-2">
        <div className="flex flex-col items-start gap-3 w-max mx-auto">
          {words.map((word) => {
            const isActiveRow = (activeWordId === word.id);

            let rowClass = "flex cursor-pointer transition-all ";
            if (isActiveRow) {
              rowClass += "scale-[1.02]";
            } else {
              rowClass += "opacity-90";
            }

            let currentAns = "";
            if (answers[word.id]) {
              currentAns = answers[word.id];
            }

            return (
              <div
                key={word.id}
                className={rowClass}
                onClick={() => setActiveWordId(word.id)}
              >
                <div className="flex items-center gap-2">
                  {/* Số thứ tự câu hỏi */}
                  <div className="w-8 shrink-0 text-right font-bold text-muted-foreground mr-2 select-none">
                    {word.id}.
                  </div>

                  {/* Khoảng trống căn lề */}
                  {Array.from({ length: word.col }).map((_, i) => (
                    <div key={`space-${i}`} className="w-[36px] md:w-[46px] h-[36px] md:h-[46px] shrink-0 border-2 border-transparent" />
                  ))}

                  {/* Các ô ký tự */}
                  {Array.from({ length: word.length }).map((_, c) => {
                    const isKeywordCell = (word.col + c === keywordCol);

                    let charVal = "";
                    if (currentAns[c]) {
                      if (currentAns[c] !== " ") {
                        charVal = currentAns[c];
                      }
                    }

                    let cellClass = "w-[36px] h-[36px] md:w-[46px] md:h-[46px] shrink-0 rounded-lg border-2 text-center text-lg md:text-xl font-black uppercase shadow-sm transition-all outline-none focus:ring-4 focus:ring-primary/20 ";

                    if (isKeywordCell) {
                      cellClass += "bg-[#0957D0] border-[#0957D0] text-white focus:bg-[#003EA1] ";
                    } else {
                      cellClass += "bg-white dark:bg-slate-900 border-primary/30 text-foreground focus:border-primary ";
                    }

                    return (
                      <input
                        key={`cell-${c}`}
                        type="text"
                        maxLength={1}
                        value={charVal}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleCellChange(word.id, c, val);
                          if (val) {
                            if (e.target.nextElementSibling) {
                              if (e.target.nextElementSibling.tagName === "INPUT") {
                                (e.target.nextElementSibling as HTMLInputElement).focus();
                              }
                            }
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace") {
                            if (!charVal) {
                              if (e.currentTarget.previousElementSibling) {
                                if (e.currentTarget.previousElementSibling.tagName === "INPUT") {
                                  (e.currentTarget.previousElementSibling as HTMLInputElement).focus();
                                }
                              }
                            }
                          }
                        }}
                        className={cellClass}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Danh sách toàn bộ câu hỏi báo cáo trực quan */}
      <div className="w-full max-w-3xl mx-auto mb-8 bg-white/60 dark:bg-slate-900/60 p-6 md:p-8 rounded-2xl border border-primary/20 relative z-10 text-left shadow-sm">
        <h3 className="font-extrabold text-foreground mb-4 text-lg border-b pb-3">Danh sách câu hỏi</h3>
        <ul className="space-y-2">
          {words.map(w => (
            <li
              key={`clue-${w.id}`}
              className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${activeWordId === w.id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-primary/5 border border-transparent'}`}
              onClick={() => setActiveWordId(w.id)}
            >
              <span className="font-black text-primary text-base min-w-[28px] mt-0.5">{w.id}.</span>
              <span className={`text-[15px] leading-relaxed ${activeWordId === w.id ? 'font-bold text-foreground' : 'text-foreground/80 font-medium'}`}>{w.clue}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Trạng thái / Nút Submit */}
      <div className="flex flex-col items-center justify-center relative z-10 border-t border-primary/10 pt-6 mt-4">
        {resultBlock}
        {actionArea}
      </div>

      {/* End game section */}
    </div>
  );
}
