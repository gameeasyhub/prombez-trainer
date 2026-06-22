import { useState, useEffect, useMemo, useRef } from "react";
import { CheckCircle2, XCircle, RefreshCw, Shuffle, Trophy, ArrowRight, BookOpen, Filter } from "lucide-react";

type Question = {
  id: number;
  q: string;
  options: string[];
  correct: number[];
};

const PAGE_BG = "#0f172a";
const CARD_BG = "#1e293b";
const CARD_BORDER = "#334155";
const TEXT_MAIN = "#f1f5f9";
const TEXT_MUTED = "#94a3b8";
const GREEN = "#10b981";
const RED = "#ef4444";
const ACCENT = "#3b82f6";

type FilterMode = "all" | "single" | "multi";

export default function PrombezTrainer() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [shuffleOrder, setShuffleOrder] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const [finished, setFinished] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [wrongIds, setWrongIds] = useState<number[]>([]);
  const startedAt = useRef<number>(Date.now());

  useEffect(() => {
    const base = import.meta.env.BASE_URL || "./";
    fetch(`${base}questions.json`)
      .then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then((data: Question[]) => {
        setQuestions(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e));
        setLoading(false);
      });
  }, []);

  const filteredQuestions = useMemo(() => {
    if (filter === "all") return questions;
    if (filter === "single") return questions.filter((q) => q.correct.length === 1);
    if (filter === "multi") return questions.filter((q) => q.correct.length > 1);
    return questions;
  }, [questions, filter]);

  useEffect(() => {
    if (filteredQuestions.length === 0) return;
    const order = filteredQuestions.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    setShuffleOrder(order);
    setCurrentIndex(0);
    setSelected(new Set());
    setRevealed(false);
    setStats({ correct: 0, wrong: 0 });
    setFinished(false);
    setReviewMode(false);
    setWrongIds([]);
    startedAt.current = Date.now();
  }, [filteredQuestions]);

  if (loading) {
    return (
      <main
        style={{ background: PAGE_BG, color: TEXT_MAIN, minHeight: "100vh" }}
        className="flex items-center justify-center"
      >
        <div className="text-center">
          <RefreshCw className="w-10 h-10 animate-spin mx-auto mb-4" style={{ color: ACCENT }} />
          <p style={{ color: TEXT_MUTED }}>Загружаю вопросы…</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main
        style={{ background: PAGE_BG, color: TEXT_MAIN, minHeight: "100vh" }}
        className="flex items-center justify-center p-6"
      >
        <div
          className="max-w-md p-6 rounded-xl"
          style={{ background: CARD_BG, border: `1px solid ${RED}` }}
        >
          <XCircle className="w-10 h-10 mb-3" style={{ color: RED }} />
          <h2 className="text-xl font-semibold mb-2">Не удалось загрузить вопросы</h2>
          <p style={{ color: TEXT_MUTED }} className="text-sm">
            {error}
          </p>
        </div>
      </main>
    );
  }

  if (shuffleOrder.length === 0) {
    return (
      <main
        style={{ background: PAGE_BG, color: TEXT_MAIN, minHeight: "100vh" }}
        className="flex items-center justify-center"
      >
        <p style={{ color: TEXT_MUTED }}>Нет вопросов для отображения.</p>
      </main>
    );
  }

  const total = shuffleOrder.length;
  const currentPos = Math.min(currentIndex + 1, total);
  const currentQ = filteredQuestions[shuffleOrder[currentIndex]];
  const isMulti = currentQ.correct.length > 1;

  const isAnswerCorrect = () => {
    if (selected.size !== currentQ.correct.length) return false;
    for (const c of currentQ.correct) if (!selected.has(c)) return false;
    return true;
  };

  const handleCheck = () => {
    if (selected.size === 0) return;
    const ok = isAnswerCorrect();
    setRevealed(true);
    setStats((s) => ({
      correct: s.correct + (ok ? 1 : 0),
      wrong: s.wrong + (ok ? 0 : 1),
    }));
    if (!ok) setWrongIds((w) => (w.includes(currentQ.id) ? w : [...w, currentQ.id]));
  };

  const handleNext = () => {
    if (currentIndex + 1 >= total) {
      setFinished(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelected(new Set());
      setRevealed(false);
    }
  };

  const handleShuffle = () => {
    const order = filteredQuestions.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    setShuffleOrder(order);
    setCurrentIndex(0);
    setSelected(new Set());
    setRevealed(false);
    setStats({ correct: 0, wrong: 0 });
    setFinished(false);
    setReviewMode(false);
    setWrongIds([]);
    startedAt.current = Date.now();
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelected(new Set());
    setRevealed(false);
    setStats({ correct: 0, wrong: 0 });
    setFinished(false);
    setReviewMode(false);
    setWrongIds([]);
    startedAt.current = Date.now();
  };

  const startReviewWrong = () => {
    const wrong = filteredQuestions
      .map((q, i) => (wrongIds.includes(q.id) ? i : -1))
      .filter((i) => i >= 0);
    if (wrong.length === 0) return;
    const order = [...wrong];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    setShuffleOrder(order);
    setCurrentIndex(0);
    setSelected(new Set());
    setRevealed(false);
    setStats({ correct: 0, wrong: 0 });
    setFinished(false);
    setReviewMode(true);
    startedAt.current = Date.now();
  };

  const toggleOption = (idx: number) => {
    if (revealed) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (isMulti) {
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
      } else {
        next.clear();
        next.add(idx);
      }
      return next;
    });
  };

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, "0")}`;
  };

  if (finished) {
    const total_ = stats.correct + stats.wrong;
    const pct = total_ > 0 ? Math.round((stats.correct / total_) * 100) : 0;
    const elapsed = Date.now() - startedAt.current;
    const grade = pct >= 90 ? "Отлично" : pct >= 75 ? "Хорошо" : pct >= 60 ? "Удовлетворительно" : "Нужно повторить";
    const gradeColor = pct >= 75 ? GREEN : pct >= 60 ? "#f59e0b" : RED;

    return (
      <main style={{ background: PAGE_BG, color: TEXT_MAIN, minHeight: "100vh" }} className="p-4 sm:p-8">
        <div className="max-w-2xl mx-auto">
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
          >
            <Trophy className="w-16 h-16 mx-auto mb-4" style={{ color: gradeColor }} />
            <h1 className="text-3xl font-bold mb-2">Тест завершён!</h1>
            <p className="text-lg mb-6" style={{ color: gradeColor }}>
              {grade}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <Stat label="Правильно" value={stats.correct} color={GREEN} />
              <Stat label="Ошибок" value={stats.wrong} color={RED} />
              <Stat label="Процент" value={`${pct}%`} color={gradeColor} />
              <Stat label="Время" value={formatTime(elapsed)} color={ACCENT} />
            </div>

            <div className="text-sm mb-6" style={{ color: TEXT_MUTED }}>
              Вопросов в тесте: {total_}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleRestart}
                className="px-5 py-3 rounded-xl font-medium flex items-center justify-center gap-2"
                style={{ background: ACCENT, color: "white" }}
              >
                <RefreshCw className="w-4 h-4" /> Пройти заново
              </button>
              {wrongIds.length > 0 && (
                <button
                  onClick={startReviewWrong}
                  className="px-5 py-3 rounded-xl font-medium flex items-center justify-center gap-2"
                  style={{ background: CARD_BG, color: TEXT_MAIN, border: `1px solid ${CARD_BORDER}` }}
                >
                  <BookOpen className="w-4 h-4" /> Разобрать ошибки ({wrongIds.length})
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ background: PAGE_BG, color: TEXT_MAIN, minHeight: "100vh" }} className="p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Тренажёр: Промышленная безопасность</h1>
          <p style={{ color: TEXT_MUTED }} className="text-sm">
            {reviewMode ? "🔁 Режим разбора ошибок" : "Случайный порядок · мгновенная проверка"} · {total} вопросов
          </p>
        </header>

        <div
          className="rounded-2xl p-3 sm:p-4 mb-4 flex flex-wrap items-center gap-2"
          style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
        >
          <Filter className="w-4 h-4 ml-1" style={{ color: TEXT_MUTED }} />
          <span className="text-sm mr-2" style={{ color: TEXT_MUTED }}>
            Фильтр:
          </span>
          {[
            { v: "all" as FilterMode, label: "Все" },
            { v: "single" as FilterMode, label: "1 ответ" },
            { v: "multi" as FilterMode, label: "Несколько" },
          ].map((b) => (
            <button
              key={b.v}
              onClick={() => setFilter(b.v)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: filter === b.v ? ACCENT : "transparent",
                color: filter === b.v ? "white" : TEXT_MUTED,
                border: `1px solid ${filter === b.v ? ACCENT : CARD_BORDER}`,
              }}
            >
              {b.label}
            </button>
          ))}
          <button
            onClick={handleShuffle}
            className="ml-auto px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5"
            style={{ background: "transparent", color: TEXT_MUTED, border: `1px solid ${CARD_BORDER}` }}
            title="Перемешать"
          >
            <Shuffle className="w-3.5 h-3.5" /> Перемешать
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <div
            className="flex-1 h-2 rounded-full overflow-hidden"
            style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
          >
            <div
              className="h-full transition-all"
              style={{ background: ACCENT, width: `${(currentPos / total) * 100}%` }}
            />
          </div>
          <span className="text-sm tabular-nums" style={{ color: TEXT_MUTED }}>
            {currentPos} / {total}
          </span>
        </div>

        <div className="flex gap-2 mb-4 text-sm">
          <span className="px-2.5 py-1 rounded-md" style={{ background: `${GREEN}22`, color: GREEN }}>
            ✓ {stats.correct}
          </span>
          <span className="px-2.5 py-1 rounded-md" style={{ background: `${RED}22`, color: RED }}>
            ✗ {stats.wrong}
          </span>
          {isMulti && (
            <span
              className="px-2.5 py-1 rounded-md"
              style={{ background: `${ACCENT}22`, color: ACCENT }}
            >
              Несколько ответов
            </span>
          )}
        </div>

        <div
          className="rounded-2xl p-5 sm:p-7 mb-4"
          style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
        >
          <div className="text-xs mb-3" style={{ color: TEXT_MUTED }}>
            Вопрос #{currentQ.id}
            {isMulti && (
              <span className="ml-2" style={{ color: ACCENT }}>
                · выберите {currentQ.correct.length} вариант(а)
              </span>
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-medium mb-5 leading-relaxed">{currentQ.q}</h2>

          <div className="space-y-2.5">
            {currentQ.options.map((opt, idx) => {
              const isSelected = selected.has(idx);
              const isCorrect = currentQ.correct.includes(idx);
              let bg = CARD_BG;
              let border = CARD_BORDER;
              let text = TEXT_MAIN;
              let icon = null;
              if (revealed) {
                if (isCorrect) {
                  bg = `${GREEN}22`;
                  border = GREEN;
                  icon = <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: GREEN }} />;
                } else if (isSelected) {
                  bg = `${RED}22`;
                  border = RED;
                  icon = <XCircle className="w-5 h-5 shrink-0" style={{ color: RED }} />;
                } else {
                  text = TEXT_MUTED;
                }
              } else if (isSelected) {
                bg = `${ACCENT}22`;
                border = ACCENT;
              }
              return (
                <button
                  key={idx}
                  onClick={() => toggleOption(idx)}
                  disabled={revealed}
                  className="w-full text-left p-3.5 rounded-xl flex items-start gap-3 transition-colors"
                  style={{ background: bg, border: `1px solid ${border}`, color: text }}
                >
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 mt-0.5"
                    style={{
                      background: revealed && isCorrect ? GREEN : revealed && isSelected && !isCorrect ? RED : isSelected ? ACCENT : CARD_BG,
                      color: isSelected || (revealed && isCorrect) || (revealed && isSelected) ? "white" : TEXT_MUTED,
                      border: `1px solid ${revealed && isCorrect ? GREEN : revealed && isSelected && !isCorrect ? RED : isSelected ? ACCENT : CARD_BORDER}`,
                    }}
                  >
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1 text-sm sm:text-base leading-relaxed">{opt}</span>
                  {icon}
                </button>
              );
            })}
          </div>

          {revealed && (
            <div
              className="mt-5 p-4 rounded-xl text-sm"
              style={{
                background: isAnswerCorrect() ? `${GREEN}15` : `${RED}15`,
                border: `1px solid ${isAnswerCorrect() ? GREEN : RED}`,
                color: TEXT_MAIN,
              }}
            >
              <div className="font-semibold mb-1" style={{ color: isAnswerCorrect() ? GREEN : RED }}>
                {isAnswerCorrect() ? "✓ Верно!" : "✗ Неверно"}
              </div>
              {!isAnswerCorrect() && (
                <div style={{ color: TEXT_MUTED }}>
                  Правильный ответ:{" "}
                  <span style={{ color: GREEN }}>
                    {currentQ.correct.map((c) => `${String.fromCharCode(65 + c)}). ${currentQ.options[c]}`).join("  ·  ")}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          {!revealed ? (
            <button
              onClick={handleCheck}
              disabled={selected.size === 0}
              className="flex-1 py-3.5 rounded-xl font-semibold transition-opacity"
              style={{
                background: selected.size === 0 ? CARD_BG : ACCENT,
                color: selected.size === 0 ? TEXT_MUTED : "white",
                border: `1px solid ${selected.size === 0 ? CARD_BORDER : ACCENT}`,
                opacity: selected.size === 0 ? 0.6 : 1,
              }}
            >
              Проверить
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex-1 py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2"
              style={{ background: ACCENT, color: "white" }}
            >
              {currentIndex + 1 >= total ? "Завершить" : "Дальше"} <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: TEXT_MUTED }}>
          Источник: тест по ФЗ-116 «О промышленной безопасности ОПО» · {questions.length} вопросов загружено
        </p>
      </div>
    </main>
  );
}

function Stat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="p-3 rounded-xl" style={{ background: PAGE_BG }}>
      <div className="text-2xl font-bold tabular-nums" style={{ color }}>
        {value}
      </div>
      <div className="text-xs mt-0.5" style={{ color: TEXT_MUTED }}>
        {label}
      </div>
    </div>
  );
}
