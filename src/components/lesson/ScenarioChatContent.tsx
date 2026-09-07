import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, CheckCircle2, Eye, Loader2, MessageSquareText, Play, RotateCcw } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { submitScenarioChatAnswer } from "@/api/blocks";
import { markBlockComplete } from "@/api/progress";
import { refetchProgressWithRetry } from "@/lib/progressRefetch";
import { buildScenarioChatFingerprint, normalizeScenarioChatData, type ScenarioChatData, type ScenarioChatRound } from "@/lib/scenarioChat";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import { useBlockSubmitStore } from "@/stores/useBlockSubmitStore";

interface ScenarioChatContentProps {
  usageKey: string;
  scenarioChatData: ScenarioChatData;
}

type ChatHistoryItem =
  | { id: string; kind: "status"; text: string }
  | { id: string; kind: "bubble"; side: "left" | "right"; name: string; description: string; text: string }
  | { id: string; kind: "explanation"; status: "correct" | "incorrect"; text: string };

type ScenarioChatSubmitResult = {
  status?: string;
  message?: string;
  completed?: boolean;
  next_round_id?: string | null;
  response_message?: string;
  response_description?: string;
  character_status?: string;
  explanation?: string;
};

type ScenarioChatRoundViewState = {
  correctChoiceId?: string;
  correctHistoryLength?: number;
  exploredChoiceIds: string[];
};

type ScenarioChatRoundViewStateMap = Record<string, ScenarioChatRoundViewState>;

const TYPING_DELAY_MS = 2000;

function wait(ms: number) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

function safeHistory(raw: unknown): ChatHistoryItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item: any): item is ChatHistoryItem => {
    if (!item || typeof item !== "object" || typeof item.id !== "string") return false;
    if (item.kind === "status") return typeof item.text === "string";
    if (item.kind === "explanation") return typeof item.text === "string" && (item.status === "correct" || item.status === "incorrect");
    if (item.kind === "bubble") {
      return (item.side === "left" || item.side === "right")
        && typeof item.name === "string"
        && typeof item.description === "string"
        && typeof item.text === "string";
    }
    return false;
  });
}

function trimHistoryForRetry(history: ChatHistoryItem[], cutoff: number | null): ChatHistoryItem[] {
  if (typeof cutoff === "number" && Number.isFinite(cutoff)) {
    return history.slice(0, Math.max(0, Math.min(cutoff, history.length)));
  }

  const lastLearnerBubbleIndex = [...history]
    .map((item, index) => ({ item, index }))
    .reverse()
    .find(({ item }) => item.kind === "bubble" && item.side === "right")?.index;

  return typeof lastLearnerBubbleIndex === "number"
    ? history.slice(0, lastLearnerBubbleIndex)
    : history;
}

function safeScenarioChatRoundState(raw: unknown): ScenarioChatRoundViewStateMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  return Object.entries(raw as Record<string, any>).reduce<ScenarioChatRoundViewStateMap>((acc, [roundId, value]) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return acc;
    const correctChoiceId = typeof value.correctChoiceId === "string" ? value.correctChoiceId : undefined;
    const correctHistoryLength = typeof value.correctHistoryLength === "number" && Number.isFinite(value.correctHistoryLength)
      ? Math.max(0, value.correctHistoryLength)
      : undefined;
    const exploredChoiceIds = Array.isArray(value.exploredChoiceIds)
      ? Array.from(new Set(value.exploredChoiceIds.filter((id: unknown): id is string => typeof id === "string" && id.trim().length > 0)))
      : [];

    acc[roundId] = {
      ...(correctChoiceId ? { correctChoiceId } : {}),
      ...(typeof correctHistoryLength === "number" ? { correctHistoryLength } : {}),
      exploredChoiceIds,
    };
    return acc;
  }, {});
}

function markScenarioChatCorrectChoice(state: ScenarioChatRoundViewStateMap, roundId: string, choiceId: string, correctHistoryLength: number): ScenarioChatRoundViewStateMap {
  const current = state[roundId] || { exploredChoiceIds: [] };
  return {
    ...state,
    [roundId]: {
      correctChoiceId: choiceId,
      correctHistoryLength,
      exploredChoiceIds: current.exploredChoiceIds.filter(id => id !== choiceId),
    },
  };
}

function markScenarioChatExploredChoice(state: ScenarioChatRoundViewStateMap, roundId: string, choiceId: string): ScenarioChatRoundViewStateMap {
  const current = state[roundId] || { exploredChoiceIds: [] };
  if (current.correctChoiceId === choiceId || current.exploredChoiceIds.includes(choiceId)) return state;
  return {
    ...state,
    [roundId]: {
      ...current,
      exploredChoiceIds: [...current.exploredChoiceIds, choiceId],
    },
  };
}

function scenarioChatCorrectBranchStart(history: ChatHistoryItem[], round: ScenarioChatRound, state: ScenarioChatRoundViewState | undefined): number {
  if (typeof state?.correctHistoryLength === "number" && Number.isFinite(state.correctHistoryLength)) {
    return Math.max(0, Math.min(state.correctHistoryLength, history.length));
  }

  const correctChoice = round.choices.find(choice => choice.id === state?.correctChoiceId);
  if (!correctChoice) return history.length;

  for (let index = history.length - 1; index >= 0; index -= 1) {
    const item = history[index];
    if (item.kind === "bubble" && item.side === "right" && item.text === correctChoice.text) return index;
  }

  return history.length;
}

function buildScenarioIntroItems(round: ScenarioChatRound, scenario: ScenarioChatData, includeContext: boolean): ChatHistoryItem[] {
  const items: ChatHistoryItem[] = [];
  if (includeContext && scenario.context_description.trim()) {
    items.push({ id: `scenario-context-${items.length}`, kind: "status", text: scenario.context_description });
  }
  items.push({
    id: `${round.id}-scenario-${items.length}`,
    kind: "bubble",
    side: "left",
    name: scenario.participant.name,
    description: round.scenario_message.description || scenario.participant.description,
    text: round.scenario_message.text,
  });
  return items;
}

function TypingIndicator({ name }: { name: string }) {
  const { t } = useTranslation();
  return (
    <div className="max-w-[90%] sm:max-w-[72%]">
      <div className="inline-flex max-w-full items-center gap-2 rounded-2xl rounded-bl-md bg-white px-3 py-2 shadow-sm ring-1 ring-border dark:bg-slate-900">
        <span className="min-w-0 truncate text-xs font-semibold text-muted-foreground">{t("scenario.typing", { name })}</span>
        <span className="flex shrink-0 items-center gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.2s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70 [animation-delay:-0.1s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70" />
        </span>
      </div>
    </div>
  );
}

function ChatItemView({ item }: { item: ChatHistoryItem }) {
  const { t } = useTranslation();
  if (item.kind === "status") {
    return (
      <div className="flex justify-center px-2 py-1">
        <div className="inline-flex max-w-full rounded-2xl border border-amber-300 bg-amber-100 px-3 py-1.5 text-center text-xs font-semibold leading-relaxed text-amber-800 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200">
          <span className="whitespace-pre-wrap break-words">{item.text}</span>
        </div>
      </div>
    );
  }

  if (item.kind === "explanation") {
    return (
      <div className={cn(
        "rounded-xl border px-3 py-2.5 text-sm leading-relaxed shadow-sm",
        item.status === "correct"
          ? "border-green-500/25 bg-green-500/10 text-green-700 dark:text-green-300"
          : "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      )}>
        <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase">
          {item.status === "correct" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <RotateCcw className="h-4 w-4 shrink-0" />}
          <span>{t("scenario.explanation")}</span>
        </div>
        <div className="whitespace-pre-wrap break-words">{item.text}</div>
      </div>
    );
  }

  const isRight = item.side === "right";
  return (
    <div className={cn("flex", isRight ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[90%] sm:max-w-[72%]", isRight && "text-right")}>
        <div className={cn(
          "inline-block max-w-full rounded-2xl px-3.5 py-2.5 text-left text-sm font-medium leading-relaxed shadow-sm whitespace-pre-wrap break-words",
          isRight
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md bg-white text-foreground ring-1 ring-border dark:bg-slate-900"
        )}>
          {item.text}
        </div>
        <div className="mt-1 px-1 text-xs text-muted-foreground">
          {item.name}{item.description ? ` - ${item.description}` : ""}
        </div>
      </div>
    </div>
  );
}

export function ScenarioChatContent({ usageKey, scenarioChatData }: ScenarioChatContentProps) {
  const { t } = useTranslation();
  const { courseId } = useParams();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const scenario = useMemo(() => normalizeScenarioChatData(scenarioChatData), [scenarioChatData]);
  const contentFingerprint = useMemo(() => buildScenarioChatFingerprint(scenario), [scenario]);
  const [started, setStarted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);
  const [visibleChoices, setVisibleChoices] = useState(false);
  const [pendingTyping, setPendingTyping] = useState<"scenario" | "response" | "status" | null>(null);
  const [awaitingRetry, setAwaitingRetry] = useState(false);
  const [awaitingNextRound, setAwaitingNextRound] = useState(false);
  const [retryHistoryLength, setRetryHistoryLength] = useState<number | null>(null);
  const [blockCompleted, setBlockCompleted] = useState(false);
  const [roundState, setRoundState] = useState<ScenarioChatRoundViewStateMap>({});
  const [transientHistory, setTransientHistory] = useState<ChatHistoryItem[] | null>(null);
  const [showExplorationChoices, setShowExplorationChoices] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const requestSeqRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const cached = useBlockSubmitStore.getState().getResult(usageKey);
    if (cached && cached.contentFingerprint === contentFingerprint) {
      const safeIndex = Math.max(0, Math.min(cached.activeIndex ?? 0, Math.max(scenario.rounds.length - 1, 0)));
      setStarted(cached.started === true);
      setActiveIndex(safeIndex);
      setHistory(safeHistory(cached.scenarioChatHistory));
      setVisibleChoices(cached.visibleChoices === true);
      setAwaitingRetry(cached.awaitingRetry === true);
      setAwaitingNextRound(cached.awaitingNextRound === true);
      setRetryHistoryLength(typeof cached.scenarioChatRetryHistoryLength === "number" ? cached.scenarioChatRetryHistoryLength : null);
      setBlockCompleted(cached.blockCompleted === true);
      setRoundState(safeScenarioChatRoundState(cached.scenarioChatRoundState));
      setShowExplorationChoices(cached.scenarioChatShowExplorationChoices === true);
      const cachedTransientHistory = safeHistory(cached.scenarioChatTransientHistory);
      setTransientHistory(cachedTransientHistory.length > 0 ? cachedTransientHistory : null);
      setPendingTyping(null);
      return;
    }

    if (cached) useBlockSubmitStore.getState().setResult(usageKey, undefined as any);
    setStarted(false);
    setActiveIndex(0);
    setHistory([]);
    setVisibleChoices(false);
    setPendingTyping(null);
    setAwaitingRetry(false);
    setAwaitingNextRound(false);
    setRetryHistoryLength(null);
    setBlockCompleted(false);
    setRoundState({});
    setTransientHistory(null);
    setShowExplorationChoices(false);
  }, [usageKey, contentFingerprint, scenario.rounds.length]);

  useEffect(() => {
    if (!started) return;
    useBlockSubmitStore.getState().setResult(usageKey, {
      resultMessage: blockCompleted ? t("scenario.completed") : "",
      isCorrect: blockCompleted || awaitingNextRound,
      contentFingerprint,
      activeIndex,
      blockCompleted,
      scenarioChatHistory: history,
      started,
      visibleChoices,
      awaitingRetry,
      awaitingNextRound,
      scenarioChatRetryHistoryLength: retryHistoryLength,
      scenarioChatRoundState: roundState,
      scenarioChatTransientHistory: transientHistory || undefined,
      scenarioChatShowExplorationChoices: showExplorationChoices,
    });
  }, [activeIndex, awaitingNextRound, awaitingRetry, blockCompleted, contentFingerprint, history, retryHistoryLength, roundState, showExplorationChoices, started, t, transientHistory, usageKey, visibleChoices]);

  const displayedHistory = transientHistory || history;

  useEffect(() => {
    if (!started) return;

    function scrollToBottom() {
      const node = chatScrollRef.current;
      if (!node) return;
      node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
    }

    const frame = window.requestAnimationFrame(scrollToBottom);
    const timeout = window.setTimeout(scrollToBottom, 80);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [awaitingNextRound, awaitingRetry, blockCompleted, displayedHistory.length, pendingTyping, showExplorationChoices, started, transientHistory, visibleChoices]);

  const currentRound = scenario.rounds[activeIndex];
  const currentRoundState = currentRound ? roundState[currentRound.id] : undefined;
  const currentCorrectChoiceId = currentRoundState?.correctChoiceId || "";
  const currentExploredChoiceIds = currentRoundState?.exploredChoiceIds || [];
  const hasCorrectChoiceForRound = currentCorrectChoiceId.length > 0;
  const explorationChoices = currentRound && hasCorrectChoiceForRound
    ? currentRound.choices.filter(choice => choice.id !== currentCorrectChoiceId && !currentExploredChoiceIds.includes(choice.id))
    : [];

  const submitMutation = useMutation({
    mutationFn: ({ roundId, choiceId }: { roundId: string; choiceId: string }) =>
      submitScenarioChatAnswer(usageKey, roundId, choiceId),
  });

  const revealScenarioRound = async (roundIndex: number) => {
    const round = scenario.rounds[roundIndex];
    if (!round) return;
    const seq = requestSeqRef.current + 1;
    requestSeqRef.current = seq;
    setActiveIndex(roundIndex);
    setVisibleChoices(false);
    setAwaitingRetry(false);
    setAwaitingNextRound(false);
    setRetryHistoryLength(null);
    setTransientHistory(null);
    setShowExplorationChoices(false);
    setPendingTyping("scenario");

    await wait(TYPING_DELAY_MS);
    if (!mountedRef.current || requestSeqRef.current !== seq) return;

    setHistory(prev => [...prev, ...buildScenarioIntroItems(round, scenario, roundIndex === 0)]);
    setPendingTyping(null);
    setVisibleChoices(true);
  };

  useEffect(() => {
    if (!started || history.length > 0 || visibleChoices || pendingTyping || blockCompleted) return;
    void revealScenarioRound(activeIndex);
  }, [activeIndex, blockCompleted, history.length, pendingTyping, started, visibleChoices]);

  const handleStart = () => {
    setStarted(true);
    setHistory([]);
    setRetryHistoryLength(null);
    setBlockCompleted(false);
    setRoundState({});
    setTransientHistory(null);
    setShowExplorationChoices(false);
    void revealScenarioRound(0);
  };

  const appendResponse = async (choiceId: string) => {
    if (!currentRound || pendingTyping || submitMutation.isPending || awaitingRetry) return;
    const choice = currentRound.choices.find(item => item.id === choiceId);
    if (!choice) return;

    const roundProgress = roundState[currentRound.id] || { exploredChoiceIds: [] };
    const correctChoiceId = roundProgress.correctChoiceId || "";
    const isExploration = Boolean(correctChoiceId) && choice.id !== correctChoiceId;
    const alreadyViewed = choice.id === correctChoiceId || roundProgress.exploredChoiceIds.includes(choice.id);
    if (alreadyViewed) return;
    if ((awaitingNextRound || blockCompleted) && !isExploration) return;

    const canonicalCutoff = history.length;
    const explorationBase = isExploration
      ? history.slice(0, scenarioChatCorrectBranchStart(history, currentRound, roundProgress))
      : null;
    const appendTransientItem = (item: ChatHistoryItem) => {
      setTransientHistory(prev => [...(prev || explorationBase || []), item]);
    };
    const appendCanonicalItem = (item: ChatHistoryItem) => {
      setHistory(prev => [...prev, item]);
    };
    const appendChatItem = isExploration ? appendTransientItem : appendCanonicalItem;
    const seq = requestSeqRef.current + 1;
    requestSeqRef.current = seq;
    setVisibleChoices(false);
    setAwaitingRetry(false);
    if (!isExploration) {
      setAwaitingNextRound(false);
      setTransientHistory(null);
      setShowExplorationChoices(false);
    } else {
      setTransientHistory(explorationBase || []);
      setShowExplorationChoices(true);
    }
    setRetryHistoryLength(null);
    appendChatItem({
      id: `${currentRound.id}-${choice.id}-learner-${Date.now()}`,
      kind: "bubble",
      side: "right",
      name: scenario.learner.name,
      description: scenario.learner.description,
      text: choice.text,
    });
    setPendingTyping("response");

    try {
      const [data] = await Promise.all([
        submitMutation.mutateAsync({ roundId: currentRound.id, choiceId: choice.id }) as Promise<ScenarioChatSubmitResult>,
        wait(TYPING_DELAY_MS),
      ]);
      if (!mountedRef.current || requestSeqRef.current !== seq) return;

      const correct = data.status === "correct";
      const characterStatus = (data.character_status || "").trim();
      appendChatItem({
        id: `${currentRound.id}-${choice.id}-response-${Date.now()}`,
        kind: "bubble",
        side: "left",
        name: scenario.participant.name,
        description: data.response_description || scenario.participant.description,
        text: data.response_message || data.message || (correct ? t("scenario.correct") : t("scenario.incorrect")),
      });

      if (characterStatus) {
        setPendingTyping("status");
        await wait(TYPING_DELAY_MS);
        if (!mountedRef.current || requestSeqRef.current !== seq) return;
        appendChatItem({
          id: `${currentRound.id}-${choice.id}-character-status-${Date.now()}`,
          kind: "status",
          text: characterStatus,
        });
      }

      appendChatItem({
        id: `${currentRound.id}-${choice.id}-explain-${Date.now()}`,
        kind: "explanation",
        status: correct ? "correct" : "incorrect",
        text: data.explanation || (correct ? t("scenario.suitableAnswer") : t("scenario.unsuitableAnswer")),
      });
      setPendingTyping(null);

      if (isExploration) {
        setRoundState(prev => markScenarioChatExploredChoice(prev, currentRound.id, choice.id));
        setRetryHistoryLength(null);
        setAwaitingRetry(false);
        return;
      }

      if (!correct) {
        setRetryHistoryLength(canonicalCutoff);
        setAwaitingRetry(true);
        return;
      }

      setRoundState(prev => markScenarioChatCorrectChoice(prev, currentRound.id, choice.id, canonicalCutoff));
      setRetryHistoryLength(null);

      if (data.completed === true || activeIndex >= scenario.rounds.length - 1) {
        setBlockCompleted(true);
        if (courseId && user?.username) {
          try {
            await markBlockComplete(courseId, usageKey);
            refetchProgressWithRetry(qc, courseId);
          } catch (error) {
            console.error("Failed to mark scenario chat complete:", error);
          }
        }
        return;
      }

      setAwaitingNextRound(true);
    } catch (error) {
      if (!mountedRef.current || requestSeqRef.current !== seq) return;
      setPendingTyping(null);
      appendChatItem({
        id: `${currentRound.id}-${choice.id}-error-${Date.now()}`,
        kind: "explanation",
        status: "incorrect",
        text: t("scenario.submitUnavailable"),
      });

      if (isExploration) {
        setRetryHistoryLength(null);
        setAwaitingRetry(false);
        return;
      }

      setRetryHistoryLength(canonicalCutoff);
      setAwaitingRetry(true);
    }
  };
  const handleRetry = () => {
    setHistory(prev => trimHistoryForRetry(prev, retryHistoryLength));
    setRetryHistoryLength(null);
    setAwaitingRetry(false);
    setAwaitingNextRound(false);
    setPendingTyping(null);
    setShowExplorationChoices(false);
    setVisibleChoices(true);
  };

  const handleNextRound = () => {
    const nextIndex = Math.min(activeIndex + 1, scenario.rounds.length - 1);
    setTransientHistory(null);
    setShowExplorationChoices(false);
    void revealScenarioRound(nextIndex);
  };

  const handleShowCorrectBranch = () => {
    setTransientHistory(null);
  };

  const handleShowExplorationChoices = () => {
    setShowExplorationChoices(true);
  };

  if (!currentRound) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <h2 className="text-lg font-bold text-foreground">{t("scenario.unavailableTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("scenario.unavailableDescription")}</p>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="relative overflow-hidden rounded-3xl border-2 border-primary/10 bg-[#F4F9FF] p-6 shadow-sm dark:bg-slate-900/50 sm:p-8">
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-widest" style={{ backgroundColor: "#43FDD7", color: "#000" }}>
            Chat
          </span>
        </div>
        <h2 className="mb-6 break-words text-[26px] font-semibold leading-[34px] text-foreground 2xl:text-[32px] 2xl:leading-[40px]">
          {scenario.display_name || t("scenario.fallbackTitle")}
        </h2>

        <div className="mb-7 border-l-4 border-primary pl-4">
          <h3 className="mb-3 text-lg font-bold">{t("scenario.guideTitle")}</h3>
          <ul className="space-y-2 text-[14px] leading-relaxed text-foreground">
            <li>{t("scenario.guideOne")}</li>
            <li>{t("scenario.guideTwo")}</li>
            <li>{t("scenario.guideThree")}</li>
          </ul>
        </div>

        <button
          type="button"
          onClick={handleStart}
          className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-[15px] font-bold text-primary-foreground shadow-lg transition-transform hover:scale-105 hover:bg-primary/90 active:scale-[0.98]"
        >
          {t("scenario.start")} <Play className="ml-2 h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border-2 border-primary/10 bg-[#F4F9FF] p-2 shadow-sm dark:bg-slate-900/50 sm:p-3">
      <div className="overflow-hidden rounded-2xl border border-primary/10 bg-white/80 dark:bg-slate-950/60">
        <div className="border-b border-primary/10 bg-white/90 px-3 py-3 backdrop-blur dark:bg-slate-950/70 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <MessageSquareText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-foreground">{scenario.participant.name}</div>
                <div className="truncate text-xs text-muted-foreground">{scenario.participant.description || t("scenario.fallbackDescription")}</div>
              </div>
            </div>
            <div className="shrink-0 rounded-full bg-[#43FDD7] px-3 py-1 text-xs font-bold text-black">
              {t("scenario.round", { current: activeIndex + 1, total: scenario.rounds.length })}
            </div>
          </div>
        </div>

        <div ref={chatScrollRef} className="max-h-[62vh] min-h-[320px] overflow-y-auto px-3 py-4 sm:min-h-[380px] sm:px-5">
          <div className="mx-auto flex max-w-3xl flex-col gap-3">
            {displayedHistory.map(item => <ChatItemView key={item.id} item={item} />)}
            {(pendingTyping === "scenario" || pendingTyping === "response") && (
              <TypingIndicator name={scenario.participant.name} />
            )}
          </div>
        </div>

        <div className="border-t border-primary/10 bg-white/95 px-3 py-3 dark:bg-slate-950/80 sm:px-5">
          <div className="mx-auto max-w-3xl">
            {visibleChoices && !pendingTyping && !blockCompleted && !awaitingRetry && !awaitingNextRound && !hasCorrectChoiceForRound && (
              <div className="grid gap-2 md:grid-cols-3">
                {currentRound.choices.map((choice, index) => (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => void appendResponse(choice.id)}
                    disabled={submitMutation.isPending}
                    className="group flex min-h-[64px] w-full items-start gap-2.5 rounded-xl border border-border bg-background px-3 py-2.5 text-left shadow-sm transition-all hover:border-primary/50 hover:bg-primary/5 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm font-semibold leading-relaxed text-foreground">
                      {choice.text}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {hasCorrectChoiceForRound && showExplorationChoices && !pendingTyping && !awaitingRetry && (
              <div className="mb-3 rounded-2xl border border-red-200 bg-red-50/80 p-3 shadow-sm dark:border-red-500/25 dark:bg-red-500/10">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-bold text-red-700 dark:text-red-300">
                    {t("scenario.viewAlternatives")}
                  </div>
                  <div className="text-xs font-semibold text-red-700 dark:text-red-300">
                    {explorationChoices.length > 0 ? t("scenario.alternativesRemaining", { count: explorationChoices.length }) : t("scenario.alternativesViewed")}
                  </div>
                </div>

                {explorationChoices.length > 0 ? (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {explorationChoices.map((choice) => {
                      const optionIndex = currentRound.choices.findIndex(item => item.id === choice.id);
                      return (
                        <button
                          key={choice.id}
                          type="button"
                          onClick={() => void appendResponse(choice.id)}
                          disabled={submitMutation.isPending}
                          className="group flex min-h-[56px] w-full items-start gap-2.5 rounded-xl border border-red-200 bg-white px-3 py-2.5 text-left shadow-sm transition-all hover:border-red-400 hover:bg-red-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/25 dark:bg-slate-950 dark:hover:bg-red-500/10"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-100 text-xs font-bold text-red-700 group-hover:bg-red-500 group-hover:text-white dark:bg-red-500/20 dark:text-red-200">
                            {String.fromCharCode(65 + Math.max(optionIndex, 0))}
                          </span>
                          <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm font-semibold leading-relaxed text-foreground">
                            {choice.text}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-red-200 bg-white/70 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-500/25 dark:bg-slate-950/70 dark:text-red-300">
                    {t("scenario.allAlternativesViewed")}
                  </div>
                )}
              </div>
            )}
            {pendingTyping && (
              <div className="flex items-center justify-center gap-2 py-3 text-sm font-semibold text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {pendingTyping === "status" ? t("scenario.updatingStatus") : t("scenario.waitingResponse")}
              </div>
            )}

            {awaitingRetry && !pendingTyping && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-secondary px-6 text-sm font-bold text-secondary-foreground shadow-sm transition-all hover:bg-secondary/80 active:scale-[0.97]"
                >
                  <RotateCcw className="h-4 w-4" />
                  {t("scenario.retry")}
                </button>
              </div>
            )}

            {awaitingNextRound && !pendingTyping && (
              <div className="flex flex-wrap items-center justify-end gap-2">
                {explorationChoices.length > 0 && !showExplorationChoices && (
                  <button
                    type="button"
                    onClick={handleShowExplorationChoices}
                    className="inline-flex h-11 items-center gap-2 rounded-full border border-red-200 bg-red-50 px-5 text-sm font-bold text-red-700 shadow-sm transition-all hover:bg-red-100 active:scale-[0.97] dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/15"
                  >
                    <Eye className="h-4 w-4" />
                    {t("scenario.viewAlternatives")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNextRound}
                  className="h-11 rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.97]"
                >
                  {t("scenario.continue")}
                </button>
              </div>
            )}

            {blockCompleted && (
              <div className="flex flex-wrap items-center justify-end gap-2 py-2 text-green-600 dark:text-green-400">
                {transientHistory && (
                  <button
                    type="button"
                    onClick={handleShowCorrectBranch}
                    className="h-10 rounded-full border border-green-200 bg-white px-4 text-sm font-bold text-green-700 shadow-sm transition-all hover:bg-green-50 active:scale-[0.97] dark:border-green-500/25 dark:bg-slate-950 dark:text-green-300 dark:hover:bg-green-500/10"
                  >
                    {t("scenario.viewCorrectAnswer")}
                  </button>
                )}
                {explorationChoices.length > 0 && !showExplorationChoices && (
                  <button
                    type="button"
                    onClick={handleShowExplorationChoices}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-700 shadow-sm transition-all hover:bg-red-100 active:scale-[0.97] dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/15"
                  >
                    <Eye className="h-4 w-4" />
                    {t("scenario.viewAlternatives")}
                  </button>
                )}
                <Check className="h-5 w-5 stroke-[3]" />
                <span className="text-sm font-bold">{t("scenario.completed")}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
