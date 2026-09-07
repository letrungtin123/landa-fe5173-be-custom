// ═══════════════════════════════════════════════════════════════
// Chat Widget — FE Learner version
// Draggable FAB + Drawer with full chat experience
// Uses learner auth store + learner chat API (target = 'learner')
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, X, Plus, ArrowLeft, Send, Trash2,
  Loader2, Bot, Sparkles, Clock, Maximize2, Minimize2, AlertTriangle,
  Mic, MicOff, PhoneOff, Play, Volume2, VolumeX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { storageUrl } from '@/utils/storageUrl';
import { useBranding } from '@/hooks/useBranding';
import { useAuthStore } from '@/stores/useAuthStore';
import { useAppStore } from '@/stores/useAppStore';
import {
  clearDemoIframeCompanionWidgetPending,
  DEMO_IFRAME_COMPANION_REVEAL_CLOSE_DELAY_MS,
  DEMO_IFRAME_COMPANION_WIDGET_DELAY_MS,
  DEMO_IFRAME_COMPANION_WIDGET_EVENT,
  DEMO_IFRAME_EXPLORE_COURSE_EVENT,
  DEMO_IFRAME_EXPLORE_COURSE_ID,
  DEMO_IFRAME_LESSON_QUIZ_ASSIST_ANSWER,
  DEMO_IFRAME_LESSON_QUIZ_ASSIST_EVENT,
  DEMO_IFRAME_LESSON_QUIZ_GUIDE_EVENT,
  DEMO_IFRAME_LESSON_QUIZ_GUIDE_WIDGET_CLOSE_DELAY_MS,
  DEMO_IFRAME_LESSON_QUIZ_QUESTION,
  demoIframeCompanionWidgetKey,
  demoIframeExploreCourseKey,
  type DemoIframeLessonQuizAssistDetail,
  isDemoIframeCompanionWidgetPending,
  markDemoIframeExploreCoursePending,
  setDemoIframeFlowLock,
} from '@/utils/demoIframeDashboardGuide';
import { lockDemoIframeUserScroll } from '@/utils/demoIframeGuideLock';
import {
  fetchActiveBot, fetchConversations, createConversation,
  deleteConversation, fetchMessages, sendMessageStream,
  type ActiveBot, type ChatConversation, type ChatMessage,
} from '@/api/chat';
import { fetchBotPersonas, fetchDemoIframeChatbotPreview, type BotPersona } from '@/api/chatbot';

// ── Types ──
type WidgetState = 'loading' | 'no-bot' | 'persona-picker' | 'conversations' | 'chat';
type DemoCompanionPhase = 'idle' | 'waiting' | 'focus';
type DemoQuizAssistPhase = 'idle' | 'typing' | 'thinking' | 'streaming' | 'done';
type DemoSurveyAnswerKey = 'A' | 'B' | 'C' | 'D';
type VoiceCaptureState = 'idle' | 'requesting' | 'listening';
type VoiceModePhase = 'idle' | 'requesting' | 'listening' | 'thinking' | 'preparing' | 'speaking' | 'play_blocked';
type SendSource = 'text' | 'voice';
type BrowserSpeechRecognitionResult = { isFinal: boolean; 0?: { transcript?: string } };
type BrowserSpeechRecognitionEvent = Event & {
  resultIndex: number;
  results: { length: number; [index: number]: BrowserSpeechRecognitionResult };
};
type BrowserSpeechRecognitionErrorEvent = Event & { error?: string; message?: string };
type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
};
type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;
type SpeechWindow = Window & {
  SpeechRecognition?: BrowserSpeechRecognitionConstructor;
  webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
};
type AudioContextWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};
const DEMO_IFRAME_FLOW_LOCK_COMPANION = 'companion-widget';
const DEMO_IFRAME_FLOW_LOCK_QUIZ_ASSIST = 'quiz-assist-widget';
const DEMO_QUIZ_ASSIST_TYPE_CHAR_MS = 30;
const DEMO_QUIZ_ASSIST_TYPE_PUNCTUATION_MS = 120;
const DEMO_QUIZ_ASSIST_STREAM_CHUNK_MS = 44;
const DEMO_QUIZ_ASSIST_STREAM_PUNCTUATION_MS = 150;
const DEMO_QUIZ_ASSIST_THINKING_MS = 2000;
const VOICE_MAX_LISTEN_MS = 15_000;
const SILENT_AUDIO_DATA_URI = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQQAAAAAAA==';

function getSpeechRecognitionCtor(): BrowserSpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const speechWindow = window as SpeechWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function getAudioContextCtor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  const audioWindow = window as AudioContextWindow;
  return audioWindow.AudioContext ?? audioWindow.webkitAudioContext ?? null;
}

function decodeChatAudioData(context: AudioContext, audioData: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    const promise = context.decodeAudioData(audioData.slice(0), resolve, reject);
    if (promise && typeof promise.then === 'function') {
      promise.then(resolve).catch(reject);
    }
  });
}


function getVoiceErrorMessage(error: string | undefined, t: TFunction): string {
  if (error === 'not-allowed' || error === 'service-not-allowed') return t('chat.voice.permissionDenied');
  if (error === 'no-speech') return t('chat.voice.notHeard');
  if (error === 'audio-capture') return t('chat.voice.noMicrophone');
  if (error === 'network') return t('chat.voice.networkInterrupted');
  return t('chat.voice.unsupported');
}
function formatCallDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}


function getDemoQuizAssistStepDelay(chars: string[], nextIndex: number, baseDelayMs: number, punctuationDelayMs: number) {
  const previousChar = chars[Math.max(0, nextIndex - 1)];
  return /[,.!?;:]/.test(previousChar) ? punctuationDelayMs : baseDelayMs;
}

function getDemoCompanionSurveyQuestions(t: TFunction): Array<{
  question: string;
  correct: DemoSurveyAnswerKey;
  answers: Array<{ key: DemoSurveyAnswerKey; text: string }>;
}> {
  return [
    {
      question: t('chat.survey.q1'),
      correct: 'B',
      answers: [
        { key: 'A', text: t('chat.survey.q1a') },
        { key: 'B', text: t('chat.survey.q1b') },
        { key: 'C', text: t('chat.survey.q1c') },
        { key: 'D', text: t('chat.survey.q1d') },
      ],
    },
    {
      question: t('chat.survey.q2'),
      correct: 'B',
      answers: [
        { key: 'A', text: t('chat.survey.q2a') },
        { key: 'B', text: t('chat.survey.q2b') },
        { key: 'C', text: t('chat.survey.q2c') },
        { key: 'D', text: t('chat.survey.q2d') },
      ],
    },
    {
      question: t('chat.survey.q3'),
      correct: 'D',
      answers: [
        { key: 'A', text: t('chat.survey.q3a') },
        { key: 'B', text: t('chat.survey.q3b') },
        { key: 'C', text: t('chat.survey.q3c') },
        { key: 'D', text: t('chat.survey.q3d') },
      ],
    },
  ];
}

function getPersonaDisplayName(persona?: BotPersona | null): string {
  return persona?.custom_name || persona?.template_name || '';
}

function findDemoInfluencePersona(personas: BotPersona[]): BotPersona | null {
  return personas.find(persona => getPersonaDisplayName(persona).trim().toLowerCase() === 'influence') || null;
}

// ── Simple toast replacement (no sonner dependency) ──
function showToast(message: string, type: 'success' | 'error' = 'error') {
  const el = document.createElement('div');
  el.className = `fixed bottom-20 left-1/2 -translate-x-1/2 z-[10001] px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium transition-all duration-300 ${type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
    }`;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3000);
}

// ── Main Component ──
export default function ChatWidget() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [state, setState] = useState<WidgetState>('loading');
  const [activeBot, setActiveBot] = useState<ActiveBot | null>(null);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [personas, setPersonas] = useState<BotPersona[]>([]);
  const [currentConv, setCurrentConv] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [demoCompanionPhase, setDemoCompanionPhase] = useState<DemoCompanionPhase>('idle');
  const [demoQuizAssistPhase, setDemoQuizAssistPhase] = useState<DemoQuizAssistPhase>('idle');
  const [selectedDemoCompanionPersona, setSelectedDemoCompanionPersona] = useState<BotPersona | null>(null);
  const [voiceCaptureState, setVoiceCaptureState] = useState<VoiceCaptureState>('idle');
  const [botSpeaking, setBotSpeaking] = useState(false);
  const [botSpeechLoading, setBotSpeechLoading] = useState(false);
  const [botSpeechNeedsTap, setBotSpeechNeedsTap] = useState(false);
  const [botSpeechText, setBotSpeechText] = useState('');
  const [voiceModeActive, setVoiceModeActive] = useState(false);
  const [voiceModeTranscript, setVoiceModeTranscript] = useState('');
  const [voiceCallStartedAt, setVoiceCallStartedAt] = useState<number | null>(null);
  const [voiceCallMuted, setVoiceCallMuted] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const voiceTranscriptRef = useRef('');
  const voicePreviewRef = useRef('');
  const voiceDiscardRef = useRef(false);
  const voiceErrorRef = useRef(false);
  const voiceListenTimerRef = useRef<number | null>(null);
  const voiceCallActiveRef = useRef(false);
  const voiceCallMutedRef = useRef(false);
  const voiceAutoListenTimerRef = useRef<number | null>(null);
  const voiceAutoListenCallbackRef = useRef<(() => void) | null>(null);
  const botAudioPrimedRef = useRef(false);
  const botAudioRef = useRef<HTMLAudioElement | null>(null);
  const botAudioUrlRef = useRef<string | null>(null);
  const botAudioContextRef = useRef<AudioContext | null>(null);
  const botAudioGainRef = useRef<GainNode | null>(null);
  const botAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const botSpeechRequestIdRef = useRef(0);
  const demoCompanionTimerRef = useRef<number | null>(null);
  const demoCompanionCloseTimerRef = useRef<number | null>(null);
  const demoQuizAssistTimersRef = useRef<number[]>([]);
  const demoQuizAssistCaretFrameRef = useRef<number | null>(null);
  const demoCompanionStartedRef = useRef(false);
  const currentConvIdRef = useRef<string | null>(null);

  // Detect courseId from URL: /courses/:courseId/...
  const location = useLocation();
  const navigate = useNavigate();
  const courseId = useMemo(() => {
    const match = location.pathname.match(/\/courses\/([^/]+)/);
    return match?.[1] ? decodeURIComponent(match[1]) : undefined;
  }, [location.pathname]);
  const streamAccRef = useRef('');  // accumulate stream text without React state race
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollChatToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior });
      window.setTimeout(() => el.scrollTo({ top: el.scrollHeight, behavior }), 0);
    });
  }, []);

  useEffect(() => {
    currentConvIdRef.current = currentConv?.id ?? null;
  }, [currentConv?.id]);

  const clearVoiceListenTimer = useCallback(() => {
    if (voiceListenTimerRef.current) {
      window.clearTimeout(voiceListenTimerRef.current);
      voiceListenTimerRef.current = null;
    }
  }, []);

  const clearVoiceAutoListenTimer = useCallback(() => {
    if (voiceAutoListenTimerRef.current) {
      window.clearTimeout(voiceAutoListenTimerRef.current);
      voiceAutoListenTimerRef.current = null;
    }
  }, []);

  useEffect(() => { voiceCallActiveRef.current = voiceModeActive; }, [voiceModeActive]);
  useEffect(() => { voiceCallMutedRef.current = voiceCallMuted; }, [voiceCallMuted]);
  const ensureBotAudioElement = useCallback(() => {
    if (typeof Audio === 'undefined') return null;
    const audio = botAudioRef.current ?? new Audio();
    audio.preload = 'auto';
    audio.controls = false;
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true');
    if (typeof document !== 'undefined' && !audio.isConnected) {
      audio.style.display = 'none';
      document.body.appendChild(audio);
    }
    botAudioRef.current = audio;
    return audio;
  }, []);

  const ensureBotAudioContext = useCallback(() => {
    const AudioContextCtor = getAudioContextCtor();
    if (!AudioContextCtor) return null;
    const context = botAudioContextRef.current ?? new AudioContextCtor();
    botAudioContextRef.current = context;

    if (!botAudioGainRef.current) {
      const gain = context.createGain();
      gain.gain.value = 1;
      gain.connect(context.destination);
      botAudioGainRef.current = gain;
    }

    return context;
  }, []);

  const stopBotAudioSource = useCallback(() => {
    const source = botAudioSourceRef.current;
    if (!source) return;
    source.onended = null;
    try { source.stop(); } catch {}
    try { source.disconnect(); } catch {}
    botAudioSourceRef.current = null;
  }, []);

  const primeBotAudioPlayback = useCallback(() => {
    if (botAudioPrimedRef.current) return;

    const context = ensureBotAudioContext();
    if (context) {
      void (async () => {
        try {
          if (context.state === 'suspended') await context.resume();
          const source = context.createBufferSource();
          source.buffer = context.createBuffer(1, 1, 22050);
          source.connect(botAudioGainRef.current ?? context.destination);
          source.start(0);
          botAudioPrimedRef.current = true;
        } catch {}
      })();
    }

    const audio = ensureBotAudioElement();
    if (!audio) return;

    try {
      audio.pause();
      audio.src = SILENT_AUDIO_DATA_URI;
      audio.muted = true;
      audio.volume = 0;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.then === 'function') {
        void playPromise
          .then(() => {
            audio.pause();
            try { audio.currentTime = 0; } catch {}
            audio.muted = false;
            audio.volume = 1;
            botAudioPrimedRef.current = true;
          })
          .catch(() => {
            audio.muted = false;
            audio.volume = 1;
          });
      } else {
        audio.pause();
        audio.muted = false;
        audio.volume = 1;
        botAudioPrimedRef.current = true;
      }
    } catch {
      audio.muted = false;
      audio.volume = 1;
    }
  }, [ensureBotAudioContext, ensureBotAudioElement]);

  const scheduleVoiceAutoListen = useCallback((delayMs = 450) => {
    clearVoiceAutoListenTimer();
    if (!voiceCallActiveRef.current || voiceCallMutedRef.current) return;

    voiceAutoListenTimerRef.current = window.setTimeout(() => {
      voiceAutoListenTimerRef.current = null;
      if (!voiceCallActiveRef.current || voiceCallMutedRef.current) return;
      voiceAutoListenCallbackRef.current?.();
    }, delayMs);
  }, [clearVoiceAutoListenTimer]);

  const cancelBotSpeech = useCallback(() => {
    botSpeechRequestIdRef.current += 1;
    stopBotAudioSource();
    const audio = botAudioRef.current;
    if (audio) {
      audio.onplay = null;
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.removeAttribute('src');
      try { audio.load(); } catch {}
    }
    if (botAudioUrlRef.current) {
      URL.revokeObjectURL(botAudioUrlRef.current);
      botAudioUrlRef.current = null;
    }
    setBotSpeechLoading(false);
    setBotSpeechNeedsTap(false);
    setBotSpeaking(false);
    setBotSpeechText('');
  }, [stopBotAudioSource]);

  const playBotSpeech = useCallback(async () => {
    cancelBotSpeech();
  }, [cancelBotSpeech]);

  const handleResumeBotSpeech = useCallback(async () => {
    const context = ensureBotAudioContext();
    if (context?.state === 'suspended') {
      try { await context.resume(); } catch {}
    }

    const audio = botAudioRef.current;
    if (!audio || !audio.src) {
      setBotSpeechNeedsTap(false);
      showToast(t('chat.botAudioUnavailable'));
      return;
    }

    try {
      setBotSpeechNeedsTap(false);
      await audio.play();
      setBotSpeechLoading(false);
      setBotSpeaking(true);
    } catch {
      setBotSpeechNeedsTap(true);
      setBotSpeaking(false);
      showToast(t('chat.audioPlaybackBlocked'));
    }
  }, [ensureBotAudioContext, t]);
  const stopVoiceCapture = useCallback((discard = false) => {
    if (discard) voiceDiscardRef.current = true;
    clearVoiceListenTimer();
    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        if (discard && recognition.abort) recognition.abort();
        else recognition.stop();
      } catch {
        // Browser may throw if recognition has already stopped.
      }
    }
    setVoiceCaptureState('idle');
  }, [clearVoiceListenTimer]);

  useEffect(() => () => {
    clearVoiceAutoListenTimer();
    stopVoiceCapture(true);
    cancelBotSpeech();
    stopBotAudioSource();
    const audio = botAudioRef.current;
    if (audio?.isConnected) audio.remove();
    botAudioRef.current = null;
    botAudioGainRef.current = null;
    const context = botAudioContextRef.current;
    if (context && context.state !== 'closed') void context.close().catch(() => {});
    botAudioContextRef.current = null;
  }, [cancelBotSpeech, clearVoiceAutoListenTimer, stopBotAudioSource, stopVoiceCapture]);

  useEffect(() => {
    if (!open) {
      setFullscreen(false);
      clearVoiceAutoListenTimer();
      voiceCallActiveRef.current = false;
      voiceCallMutedRef.current = false;
      setVoiceModeActive(false);
      setVoiceModeTranscript('');
      setVoiceCallStartedAt(null);
      setVoiceCallMuted(false);
      stopVoiceCapture(true);
      cancelBotSpeech();
    }
  }, [cancelBotSpeech, clearVoiceAutoListenTimer, open, stopVoiceCapture]);
  // ── FAB drag ref ──
  const fabRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ sx: 0, sy: 0, sl: 0, st: 0, active: false, moved: false });

  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const userId = useAuthStore(s => s.user?.id);
  const loginSessionId = useAuthStore(s => s.loginSessionId);
  const sessionMode = useAuthStore(s => s.sessionMode);
  const isCourseModalActive = useAppStore(s => s.isCourseModalActive);
  const { branding } = useBranding();
  const isDemoIframe = sessionMode === 'demo_iframe';
  const demoCompanionKey = useMemo(
    () => demoIframeCompanionWidgetKey(userId, loginSessionId),
    [loginSessionId, userId],
  );
  const demoExploreCourseKey = useMemo(
    () => demoIframeExploreCourseKey(userId, loginSessionId),
    [loginSessionId, userId],
  );
  const isDemoCompanionFocus = demoCompanionPhase === 'focus';
  const isDemoCompanionWaiting = demoCompanionPhase === 'waiting';
  const isDemoQuizAssistActive = demoQuizAssistPhase !== 'idle';
  const isDemoWidgetLocked = isDemoCompanionFocus || isDemoQuizAssistActive;

  const startDemoCompanionFlow = useCallback(() => {
    if (!isDemoIframe || !demoCompanionKey || demoCompanionStartedRef.current) return;

    demoCompanionStartedRef.current = true;
    if (demoCompanionTimerRef.current) {
      window.clearTimeout(demoCompanionTimerRef.current);
      demoCompanionTimerRef.current = null;
    }
    if (demoCompanionCloseTimerRef.current) {
      window.clearTimeout(demoCompanionCloseTimerRef.current);
      demoCompanionCloseTimerRef.current = null;
    }

    setOpen(false);
    setFullscreen(false);
    setConfirmDeleteId(null);
    setSelectedDemoCompanionPersona(null);
    setDemoCompanionPhase('waiting');

    demoCompanionTimerRef.current = window.setTimeout(() => {
      clearDemoIframeCompanionWidgetPending(demoCompanionKey);
      setFullscreen(false);
      setOpen(true);
      setDemoCompanionPhase('focus');
      demoCompanionTimerRef.current = null;
    }, DEMO_IFRAME_COMPANION_WIDGET_DELAY_MS);
  }, [demoCompanionKey, isDemoIframe]);

  useEffect(() => {
    if (!isDemoIframe || !demoCompanionKey) {
      if (demoCompanionTimerRef.current) {
        window.clearTimeout(demoCompanionTimerRef.current);
        demoCompanionTimerRef.current = null;
      }
      if (demoCompanionCloseTimerRef.current) {
        window.clearTimeout(demoCompanionCloseTimerRef.current);
        demoCompanionCloseTimerRef.current = null;
      }
      setDemoCompanionPhase('idle');
      setSelectedDemoCompanionPersona(null);
      demoCompanionStartedRef.current = false;
      return;
    }

    if (isDemoIframeCompanionWidgetPending(demoCompanionKey)) {
      startDemoCompanionFlow();
    }

    const handleDemoCompanionStart = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string }>).detail;
      if (detail?.key && detail.key !== demoCompanionKey) return;
      startDemoCompanionFlow();
    };

    window.addEventListener(DEMO_IFRAME_COMPANION_WIDGET_EVENT, handleDemoCompanionStart);
    return () => {
      window.removeEventListener(DEMO_IFRAME_COMPANION_WIDGET_EVENT, handleDemoCompanionStart);
    };
  }, [demoCompanionKey, isDemoIframe, startDemoCompanionFlow]);

  useEffect(() => {
    return () => {
      if (demoCompanionTimerRef.current) {
        window.clearTimeout(demoCompanionTimerRef.current);
        demoCompanionTimerRef.current = null;
      }
      if (demoCompanionCloseTimerRef.current) {
        window.clearTimeout(demoCompanionCloseTimerRef.current);
        demoCompanionCloseTimerRef.current = null;
      }
    };
  }, []);

  const handleDemoCompanionSurveyComplete = useCallback((persona: BotPersona | null) => {
    if (!isDemoIframe) return;

    setSelectedDemoCompanionPersona(persona);
    if (demoCompanionCloseTimerRef.current) {
      window.clearTimeout(demoCompanionCloseTimerRef.current);
      demoCompanionCloseTimerRef.current = null;
    }

    demoCompanionCloseTimerRef.current = window.setTimeout(() => {
      if (demoExploreCourseKey) {
        markDemoIframeExploreCoursePending(demoExploreCourseKey);
      }

      setOpen(false);
      setFullscreen(false);
      setConfirmDeleteId(null);
      setDemoCompanionPhase('idle');
      demoCompanionCloseTimerRef.current = null;

      navigate(`/explore?focus_course=${encodeURIComponent(DEMO_IFRAME_EXPLORE_COURSE_ID)}`);
      window.setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent(DEMO_IFRAME_EXPLORE_COURSE_EVENT, {
            detail: { key: demoExploreCourseKey, courseId: DEMO_IFRAME_EXPLORE_COURSE_ID },
          }),
        );
      }, 0);
    }, DEMO_IFRAME_COMPANION_REVEAL_CLOSE_DELAY_MS);
  }, [demoExploreCourseKey, isDemoIframe, navigate]);

  useEffect(() => {
    if (demoCompanionPhase === 'idle') return;
    setDemoIframeFlowLock(DEMO_IFRAME_FLOW_LOCK_COMPANION, true);
    const unlockScroll = lockDemoIframeUserScroll();

    return () => {
      setDemoIframeFlowLock(DEMO_IFRAME_FLOW_LOCK_COMPANION, false);
      unlockScroll();
    };
  }, [demoCompanionPhase]);

  const clearDemoQuizAssistTimers = useCallback(() => {
    demoQuizAssistTimersRef.current.forEach(timer => window.clearTimeout(timer));
    demoQuizAssistTimersRef.current = [];
    if (demoQuizAssistCaretFrameRef.current !== null) {
      window.cancelAnimationFrame(demoQuizAssistCaretFrameRef.current);
      demoQuizAssistCaretFrameRef.current = null;
    }
  }, []);

  const scheduleDemoQuizAssistTimer = useCallback((callback: () => void, delayMs: number) => {
    const timer = window.setTimeout(() => {
      demoQuizAssistTimersRef.current = demoQuizAssistTimersRef.current.filter(item => item !== timer);
      callback();
    }, delayMs);
    demoQuizAssistTimersRef.current.push(timer);
    return timer;
  }, []);

  const focusDemoQuizAssistInputAtEnd = useCallback((valueLength: number) => {
    if (demoQuizAssistCaretFrameRef.current !== null) {
      window.cancelAnimationFrame(demoQuizAssistCaretFrameRef.current);
    }

    demoQuizAssistCaretFrameRef.current = window.requestAnimationFrame(() => {
      demoQuizAssistCaretFrameRef.current = null;
      const input = inputRef.current;
      if (!input) return;
      input.focus({ preventScroll: true });
      input.setSelectionRange(valueLength, valueLength);
      input.scrollTop = input.scrollHeight;
      window.setTimeout(() => {
        input.scrollTop = input.scrollHeight;
      }, 0);
    });
  }, []);

  const startDemoQuizAssistFlow = useCallback((questionText: string, answerText: string) => {
    if (!isDemoIframe) return;

    clearDemoQuizAssistTimers();
    abortRef.current?.abort();
    abortRef.current = null;

    const influencePersona = selectedDemoCompanionPersona || findDemoInfluencePersona(personas);
    if (influencePersona) {
      setSelectedDemoCompanionPersona(influencePersona);
    } else {
      fetchDemoIframeChatbotPreview()
        .then(preview => {
          setActiveBot(preview.bot);
          setPersonas(preview.personas);
          const influence = findDemoInfluencePersona(preview.personas);
          if (influence) setSelectedDemoCompanionPersona(influence);
        })
        .catch(() => {});
    }

    const nowIso = new Date().toISOString();
    const conversationId = `demo-quiz-assist-${Date.now()}`;
    setCurrentConv({
      id: conversationId,
      tenant_id: activeBot?.tenant_id || 'demo',
      bot_id: activeBot?.bot_id || activeBot?.id || 'demo-bot',
      persona_id: influencePersona?.id || 'demo-influence',
      user_id: userId || 'demo-user',
      title: 'Demo quiz assist',
      created_at: nowIso,
      updated_at: nowIso,
      persona_name: 'Influence',
      persona_avatar_url: influencePersona?.template_avatar_url || null,
      last_message: null,
      last_message_at: null,
    });
    setMessages([]);
    setStreamText('');
    setStreaming(false);
    setInputValue('');
    setHasMore(false);
    setNextCursor(null);
    setLoadingMessages(false);
    setLoadingConvs(false);
    setFullscreen(false);
    setConfirmDeleteId(null);
    setDemoCompanionPhase('idle');
    setDemoQuizAssistPhase('typing');
    setState('chat');
    setOpen(true);

    const questionChars = Array.from(questionText);
    let typedCount = 0;
    const typeNext = () => {
      typedCount = Math.min(questionChars.length, typedCount + 1);
      const nextInputValue = questionChars.slice(0, typedCount).join('');
      setInputValue(nextInputValue);
      focusDemoQuizAssistInputAtEnd(nextInputValue.length);

      if (typedCount < questionChars.length) {
        scheduleDemoQuizAssistTimer(
          typeNext,
          getDemoQuizAssistStepDelay(
            questionChars,
            typedCount,
            DEMO_QUIZ_ASSIST_TYPE_CHAR_MS,
            DEMO_QUIZ_ASSIST_TYPE_PUNCTUATION_MS,
          ),
        );
        return;
      }

      scheduleDemoQuizAssistTimer(() => {
        const sentAt = new Date().toISOString();
        const userMessage: ChatMessage = {
          id: `demo-user-question-${Date.now()}`,
          conversation_id: conversationId,
          role: 'user',
          content: questionText,
          metadata: { demo_iframe: true, simulated: true },
          created_at: sentAt,
        };
        setMessages([userMessage]);
        setInputValue('');
        setStreamText('');
        setStreaming(true);
        setDemoQuizAssistPhase('thinking');
        scrollChatToBottom('smooth');

        scheduleDemoQuizAssistTimer(() => {
          setDemoQuizAssistPhase('streaming');
          const answerChars = Array.from(answerText);
          let streamedCount = 0;
          const streamNext = () => {
            streamedCount = Math.min(answerChars.length, streamedCount + 2);
            setStreamText(answerChars.slice(0, streamedCount).join(''));

            if (streamedCount < answerChars.length) {
              scheduleDemoQuizAssistTimer(
                streamNext,
                getDemoQuizAssistStepDelay(
                  answerChars,
                  streamedCount,
                  DEMO_QUIZ_ASSIST_STREAM_CHUNK_MS,
                  DEMO_QUIZ_ASSIST_STREAM_PUNCTUATION_MS,
                ),
              );
              return;
            }

            scheduleDemoQuizAssistTimer(() => {
              const assistantMessage: ChatMessage = {
                id: `demo-influence-answer-${Date.now()}`,
                conversation_id: conversationId,
                role: 'assistant',
                content: answerText,
                metadata: { demo_iframe: true, simulated: true, persona: 'Influence' },
                created_at: new Date().toISOString(),
              };
              setMessages(current => [...current, assistantMessage]);
              setStreamText('');
              setStreaming(false);
              setDemoQuizAssistPhase('done');
              scrollChatToBottom('smooth');

              scheduleDemoQuizAssistTimer(() => {
                setOpen(false);
                setFullscreen(false);
                setConfirmDeleteId(null);
                setDemoQuizAssistPhase('idle');
                window.dispatchEvent(new CustomEvent(DEMO_IFRAME_LESSON_QUIZ_GUIDE_EVENT));
              }, DEMO_IFRAME_LESSON_QUIZ_GUIDE_WIDGET_CLOSE_DELAY_MS);
            }, 260);
          };

          streamNext();
        }, DEMO_QUIZ_ASSIST_THINKING_MS);
      }, 260);
    };

    scheduleDemoQuizAssistTimer(typeNext, 420);
  }, [
    activeBot?.bot_id,
    activeBot?.id,
    activeBot?.tenant_id,
    clearDemoQuizAssistTimers,
    focusDemoQuizAssistInputAtEnd,
    isDemoIframe,
    personas,
    scheduleDemoQuizAssistTimer,
    scrollChatToBottom,
    selectedDemoCompanionPersona,
    userId,
  ]);

  useEffect(() => {
    if (!isDemoIframe) {
      clearDemoQuizAssistTimers();
      setDemoQuizAssistPhase('idle');
      return;
    }

    const handleDemoQuizAssistStart = (event: Event) => {
      const detail = (event as CustomEvent<DemoIframeLessonQuizAssistDetail>).detail;
      const question = detail?.question?.trim() || DEMO_IFRAME_LESSON_QUIZ_QUESTION;
      const answer = detail?.answer?.trim() || DEMO_IFRAME_LESSON_QUIZ_ASSIST_ANSWER;
      startDemoQuizAssistFlow(question, answer);
    };

    window.addEventListener(DEMO_IFRAME_LESSON_QUIZ_ASSIST_EVENT, handleDemoQuizAssistStart);
    return () => {
      window.removeEventListener(DEMO_IFRAME_LESSON_QUIZ_ASSIST_EVENT, handleDemoQuizAssistStart);
    };
  }, [clearDemoQuizAssistTimers, isDemoIframe, startDemoQuizAssistFlow]);

  useEffect(() => {
    return () => clearDemoQuizAssistTimers();
  }, [clearDemoQuizAssistTimers]);

  useEffect(() => {
    if (!isDemoQuizAssistActive) return;

    setDemoIframeFlowLock(DEMO_IFRAME_FLOW_LOCK_QUIZ_ASSIST, true);
    const unlockScroll = lockDemoIframeUserScroll();
    return () => {
      setDemoIframeFlowLock(DEMO_IFRAME_FLOW_LOCK_QUIZ_ASSIST, false);
      unlockScroll();
    };
  }, [isDemoQuizAssistActive]);

  // ── Pre-load bot avatar on mount (for FAB) ──
  useEffect(() => {
    if (!isAuthenticated) return;
    const loadBot = isDemoIframe
      ? fetchDemoIframeChatbotPreview().then(preview => preview.bot)
      : fetchActiveBot();
    loadBot
      .then(bot => { if (bot) setActiveBot(bot); })
      .catch(() => { });
  }, [isAuthenticated, isDemoIframe]);

  // ── Load full data when widget opens ──
  const loadActiveBot = useCallback(async () => {
    setState('loading');
    try {
      if (isDemoIframe) {
        const preview = await fetchDemoIframeChatbotPreview();
        setActiveBot(preview.bot);
        if (!preview.bot) { setState('no-bot'); return; }
        setLoadingConvs(false);
        setConversations([]);
        setCurrentConv(null);
        setMessages([]);
        setPersonas(preview.personas);
        setState('persona-picker');
        return;
      }

      const bot = await fetchActiveBot();
      setActiveBot(bot);
      if (!bot) { setState('no-bot'); return; }

      setLoadingConvs(true);
      const convs = await fetchConversations();
      setConversations(convs);
      setLoadingConvs(false);

      if (convs.length === 0) {
        const p = await fetchBotPersonas(bot.bot_id);
        setPersonas(p);
        setState('persona-picker');
      } else {
        setState('conversations');
      }
    } catch {
      setLoadingConvs(false);
      setState('no-bot');
    }
  }, [isDemoIframe]);

  useEffect(() => {
    if (open && !isDemoQuizAssistActive) loadActiveBot();
  }, [isDemoQuizAssistActive, open, loadActiveBot]);

  // ── FAB pointer drag ──
  const onFabPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const fab = fabRef.current;
    if (!fab) return;
    fab.setPointerCapture(e.pointerId);
    const r = fab.getBoundingClientRect();
    dragRef.current = { sx: e.clientX, sy: e.clientY, sl: r.left, st: r.top, active: true, moved: false };
  }, []);

  const onFabPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d.active) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true;
    if (!d.moved) return;
    const fab = fabRef.current;
    if (!fab) return;
    const nl = Math.max(8, Math.min(window.innerWidth - 64, d.sl + dx));
    const nt = Math.max(8, Math.min(window.innerHeight - 64, d.st + dy));
    fab.style.left = nl + 'px';
    fab.style.top = nt + 'px';
    fab.style.right = 'auto';
    fab.style.bottom = 'auto';
  }, []);

  const onFabPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    d.active = false;
    const fab = fabRef.current;
    if (!fab) return;
    try { fab.releasePointerCapture(e.pointerId); } catch { }

    if (!d.moved) {
      setOpen(true);
      return;
    }
    // Snap to nearest edge
    const r = fab.getBoundingClientRect();
    const mid = window.innerWidth / 2;
    if (r.left + 28 > mid) {
      fab.style.left = 'auto';
      fab.style.right = '24px';
    } else {
      fab.style.left = '24px';
      fab.style.right = 'auto';
    }
    const isMobile = window.innerWidth < 768;
    const maxTop = window.innerHeight - (isMobile ? 145 : 80);
    const clampedTop = Math.max(24, Math.min(maxTop, r.top));
    fab.style.top = clampedTop + 'px';
    fab.style.bottom = 'auto';
  }, []);

  // ── Create conversation ──
  const handleCreateConversation = async (personaId: string) => {
    if (isDemoIframe) return;
    try {
      const conv = await createConversation(personaId);
      setConversations(prev => [conv, ...prev]);
      setCurrentConv(conv);
      setMessages([]);
      setState('chat');
    } catch (err: any) {
      showToast(err?.response?.data?.message || err.message);
    }
  };

  // ── Open existing conversation ──
  const handleOpenConversation = async (conv: ChatConversation) => {
    if (isDemoIframe) return;
    setCurrentConv(conv);
    setLoadingMessages(true);
    setState('chat');
    try {
      const result = await fetchMessages(conv.id);
      setMessages(result.messages);
      setHasMore(result.has_more);
      setNextCursor(result.next_cursor);
    } catch { showToast(t('chat.messagesLoadFailed')); }
    setLoadingMessages(false);
    scrollChatToBottom('auto');
  };

  // ── Load more messages ──
  const handleLoadMore = async () => {
    if (isDemoIframe) return;
    if (!currentConv || !hasMore || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await fetchMessages(currentConv.id, nextCursor);
      setMessages(prev => [...result.messages, ...prev]);
      setHasMore(result.has_more);
      setNextCursor(result.next_cursor);
    } catch { showToast(t('chat.moreMessagesLoadFailed')); }
    setLoadingMore(false);
  };

  // ── Delete conversation ──
  const handleDeleteConversation = (convId: string) => {
    if (isDemoIframe) return;
    setConfirmDeleteId(convId);
  };

  const openPersonaPickerAfterLastDelete = async () => {
    if (!activeBot) {
      setState('conversations');
      return;
    }
    try {
      const p = await fetchBotPersonas(activeBot.bot_id);
      setPersonas(p);
      setState('persona-picker');
    } catch {
      setState('conversations');
      showToast(t('chat.personasLoadFailed'));
    }
  };

  const confirmDelete = async () => {
    if (isDemoIframe) {
      setConfirmDeleteId(null);
      return;
    }
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      await deleteConversation(confirmDeleteId);
      const nextConversations = conversations.filter(c => c.id !== confirmDeleteId);
      setConversations(nextConversations);
      if (currentConv?.id === confirmDeleteId) setCurrentConv(null);
      if (nextConversations.length === 0) {
        await openPersonaPickerAfterLastDelete();
      } else if (currentConv?.id === confirmDeleteId) {
        setState('conversations');
      }
      showToast(t('chat.deleted'), 'success');
    } catch { showToast(t('chat.deleteFailed')); }
    finally { setDeleting(false); setConfirmDeleteId(null); }
  };

  // ── New conversation ──
  const handleNewConvFromList = async () => {
    if (!activeBot) return;
    if (isDemoIframe) {
      try {
        const preview = await fetchDemoIframeChatbotPreview();
        setActiveBot(preview.bot);
        setPersonas(preview.personas);
        setState('persona-picker');
      } catch { showToast(t('chat.personasLoadFailed')); }
      return;
    }
    if (conversations.length >= 10) { showToast(t('chat.maxConversations')); return; }
    try {
      const p = await fetchBotPersonas(activeBot.bot_id);
      setPersonas(p);
      setState('persona-picker');
    } catch { showToast(t('chat.personasLoadFailed')); }
  };

  // ── Send message ──
  const sendUserMessage = useCallback((rawContent: string, source: SendSource = 'text') => {
    if (isDemoIframe) return;
    if (!currentConv || !rawContent.trim() || streaming) return;
    const conversationId = currentConv.id;
    const content = rawContent.trim();
    const isVoiceTurn = source === 'voice' || voiceModeActive;
    const inputMode = isVoiceTurn ? 'voice' : 'text';
    if (isVoiceTurn) {
      voiceCallActiveRef.current = false;
      voiceCallMutedRef.current = false;
      setVoiceModeActive(false);
      setVoiceModeTranscript('');
      setVoiceCallStartedAt(null);
      setVoiceCallMuted(false);
    }

    stopVoiceCapture(true);
    cancelBotSpeech();
    setInputValue('');

    const userMsg: ChatMessage = {
      id: 'temp-' + Date.now(),
      conversation_id: conversationId,
      role: 'user',
      content,
      metadata: inputMode === 'voice' ? { input_mode: 'voice' } : {},
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setStreaming(true);
    setStreamText('');
    streamAccRef.current = '';
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 50);

    const refreshConversations = async () => {
      try {
        const convs = await fetchConversations();
        setConversations(convs);
      } catch {
        // Conversation list freshness is non-blocking for the active chat UI.
      }
    };

    const finishStream = async (fallbackText: string, toastMessage?: string) => {
      try {
        const result = await fetchMessages(conversationId);
        if (currentConvIdRef.current === conversationId) {
          const normalizedFallback = fallbackText.trim();
          const hasFallbackInServer = normalizedFallback
            ? result.messages.some(message => message.role === 'assistant' && message.content.trim() === normalizedFallback)
            : true;
          const nextMessages = normalizedFallback && !hasFallbackInServer
            ? [
                ...result.messages,
                {
                  id: 'resp-' + Date.now(),
                  conversation_id: conversationId,
                  role: 'assistant' as const,
                  content: normalizedFallback,
                  metadata: {},
                  created_at: new Date().toISOString(),
                },
              ]
            : result.messages;
          setMessages(nextMessages);
          setHasMore(result.has_more);
          setNextCursor(result.next_cursor);
          scrollChatToBottom('smooth');
        }
      } catch {
        if (fallbackText.trim() && currentConvIdRef.current === conversationId) {
          const fallbackContent = fallbackText.trim();
          setMessages(msgs => {
            const alreadyRendered = msgs.some(message => message.role === 'assistant' && message.content.trim() === fallbackContent);
            if (alreadyRendered) return msgs;
            return [
              ...msgs,
              {
                id: 'resp-' + Date.now(),
                conversation_id: conversationId,
                role: 'assistant' as const,
                content: fallbackContent,
                metadata: {},
                created_at: new Date().toISOString(),
              },
            ];
          });
        } else if (!toastMessage) {
          showToast(t('chat.latestMessagesSyncFailed'));
        }
      } finally {
        if (currentConvIdRef.current === conversationId) {
          setStreamText('');
          setStreaming(false);
        }
        streamAccRef.current = '';
        abortRef.current = null;
        if (toastMessage) showToast(toastMessage);
        await refreshConversations();
      }
    };

    abortRef.current = sendMessageStream(
      conversationId,
      content,
      courseId,
      inputMode,
      (text) => {
        streamAccRef.current += text;
        setStreamText(streamAccRef.current);
        setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 10);
      },
      () => {
        void finishStream(streamAccRef.current);
      },
      (message) => {
        cancelBotSpeech();
        void finishStream(streamAccRef.current, message);
      },
    );
  }, [cancelBotSpeech, courseId, currentConv, isDemoIframe, scrollChatToBottom, stopVoiceCapture, streaming, t, voiceModeActive]);

  const handleSend = () => {
    sendUserMessage(inputValue, 'text');
  };

  const handleVoiceToggle = useCallback(async () => {
    clearVoiceAutoListenTimer();
    if (voiceCaptureState === 'listening') {
      stopVoiceCapture(false);
      return;
    }
    if (voiceCaptureState === 'requesting' || streaming) return;
    primeBotAudioPlayback();
    if (isDemoIframe) return;
    if (!currentConv) {
      showToast(t('chat.createConversationBeforeVoice'));
      return;
    }

    const SpeechRecognition = getSpeechRecognitionCtor();
    if (!SpeechRecognition) {
      showToast(t('chat.voice.unsupported'));
      return;
    }

    voiceCallActiveRef.current = true;
    voiceCallMutedRef.current = false;
    setVoiceModeActive(true);
    setVoiceCallStartedAt(prev => prev ?? Date.now());
    setVoiceCallMuted(false);
    setVoiceCaptureState('requesting');
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
      }
    } catch {
      setVoiceCaptureState('idle');
      voiceCallActiveRef.current = false;
      voiceCallMutedRef.current = false;
      setVoiceModeActive(false);
      setVoiceModeTranscript('');
      setVoiceCallStartedAt(null);
      setVoiceCallMuted(false);
      showToast(t('chat.voice.permissionDenied'));
      return;
    }

    cancelBotSpeech();
    voiceTranscriptRef.current = '';
    voicePreviewRef.current = '';
    voiceDiscardRef.current = false;
    voiceErrorRef.current = false;

    const recognition = new SpeechRecognition();
    recognition.lang = i18n.language === 'en' ? 'en-US' : 'vi-VN';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result?.[0]?.transcript?.trim() ?? '';
        if (!transcript) continue;
        if (result.isFinal) finalText = `${finalText} ${transcript}`.trim();
        else interimText = `${interimText} ${transcript}`.trim();
      }
      if (finalText) voiceTranscriptRef.current = `${voiceTranscriptRef.current} ${finalText}`.trim();
      const preview = `${voiceTranscriptRef.current} ${interimText}`.trim();
      voicePreviewRef.current = preview;
      if (preview) {
        setInputValue(preview);
        setVoiceModeTranscript(preview);
      }
    };
    recognition.onerror = (event) => {
      clearVoiceListenTimer();
      setVoiceCaptureState('idle');
      if (voiceDiscardRef.current || !voiceCallActiveRef.current) {
        recognitionRef.current = null;
        return;
      }
      voiceErrorRef.current = true;
      const shouldEndCall = event.error === 'not-allowed' || event.error === 'service-not-allowed' || event.error === 'audio-capture';
      if (shouldEndCall) {
        voiceCallActiveRef.current = false;
        voiceCallMutedRef.current = false;
        setVoiceModeActive(false);
        setVoiceCallStartedAt(null);
        setVoiceCallMuted(false);
      } else {
        voiceCallMutedRef.current = true;
        setVoiceCallMuted(true);
      }
      setVoiceModeTranscript('');
      showToast(getVoiceErrorMessage(event.error, t));
    };
    recognition.onend = () => {
      clearVoiceListenTimer();
      setVoiceCaptureState('idle');
      recognitionRef.current = null;
      if (voiceDiscardRef.current) {
        voiceDiscardRef.current = false;
        return;
      }
      const transcript = (voiceTranscriptRef.current || voicePreviewRef.current).trim();
      if (!transcript) {
        voiceCallMutedRef.current = true;
        setVoiceCallMuted(true);
        setVoiceModeTranscript('');
        if (!voiceErrorRef.current) showToast(t('chat.voice.notHeard'));
        return;
      }
      setInputValue(transcript);
      setVoiceModeTranscript(transcript);
      window.setTimeout(() => sendUserMessage(transcript, 'voice'), 0);
    };

    try {
      recognitionRef.current = recognition;
      recognition.start();
      setVoiceCaptureState('listening');
      voiceListenTimerRef.current = window.setTimeout(() => {
        try { recognition.stop(); } catch {}
      }, VOICE_MAX_LISTEN_MS);
    } catch {
      recognitionRef.current = null;
      setVoiceCaptureState('idle');
      voiceCallActiveRef.current = false;
      voiceCallMutedRef.current = false;
      setVoiceModeActive(false);
      setVoiceModeTranscript('');
      setVoiceCallStartedAt(null);
      setVoiceCallMuted(false);
      showToast(t('chat.microphoneUnavailable'));
    }
  }, [cancelBotSpeech, clearVoiceAutoListenTimer, clearVoiceListenTimer, currentConv, i18n.language, isDemoIframe, primeBotAudioPlayback, sendUserMessage, stopVoiceCapture, streaming, t, voiceCaptureState]);

  useEffect(() => {
    voiceAutoListenCallbackRef.current = () => { void handleVoiceToggle(); };
  }, [handleVoiceToggle]);

  const handleCloseVoiceMode = useCallback(() => {
    clearVoiceAutoListenTimer();
    voiceCallActiveRef.current = false;
    voiceCallMutedRef.current = false;
    setVoiceModeActive(false);
    setVoiceModeTranscript('');
    setVoiceCallStartedAt(null);
    setVoiceCallMuted(false);
    stopVoiceCapture(true);
    cancelBotSpeech();
  }, [cancelBotSpeech, clearVoiceAutoListenTimer, stopVoiceCapture]);

  const handleToggleVoiceMute = useCallback(() => {
    if (!voiceModeActive) return;

    if (voiceCallMutedRef.current) {
      voiceCallMutedRef.current = false;
      setVoiceCallMuted(false);
      window.setTimeout(() => {
        if (voiceCallActiveRef.current) void handleVoiceToggle();
      }, 120);
      return;
    }

    voiceCallMutedRef.current = true;
    setVoiceCallMuted(true);
    clearVoiceAutoListenTimer();
    stopVoiceCapture(true);
    setVoiceCaptureState('idle');
  }, [clearVoiceAutoListenTimer, handleVoiceToggle, stopVoiceCapture, voiceModeActive]);

  useEffect(() => {
    if (!voiceModeActive || voiceCallMuted || voiceCaptureState !== 'idle' || streaming || botSpeechLoading || botSpeaking || botSpeechNeedsTap || !currentConv) {
      clearVoiceAutoListenTimer();
      return;
    }

    scheduleVoiceAutoListen(450);

    return clearVoiceAutoListenTimer;
  }, [botSpeaking, botSpeechLoading, botSpeechNeedsTap, clearVoiceAutoListenTimer, currentConv, scheduleVoiceAutoListen, streaming, voiceCallMuted, voiceCaptureState, voiceModeActive]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleBack = () => {
    stopVoiceCapture(true);
    cancelBotSpeech();
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setStreaming(false);
    setStreamText('');
    setCurrentConv(null);
    setMessages([]);
    setHasMore(false);
    setNextCursor(null);
    if (isDemoIframe) {
      setState('persona-picker');
      return;
    }
    setState('conversations');
    fetchConversations().then(setConversations).catch(() => { });
  };

  useEffect(() => {
    if (!isCourseModalActive) return;
    if (demoCompanionPhase !== 'idle') return;
    setOpen(false);
    setFullscreen(false);
    setConfirmDeleteId(null);
  }, [demoCompanionPhase, isCourseModalActive]);

  if (!isAuthenticated || isCourseModalActive) return null;

  const widgetZClass = isDemoQuizAssistActive ? 'z-[100020]' : isDemoCompanionFocus ? 'z-[10020]' : 'z-[9998]';
  const widgetClass = fullscreen
    ? `fixed inset-3 md:inset-4 ${widgetZClass} rounded-2xl`
    : `fixed left-3 right-3 bottom-[82px] ${widgetZClass} h-[calc(100dvh-110px)] min-h-[360px] max-h-[620px] w-auto rounded-2xl md:left-auto md:right-6 md:bottom-6 md:h-[600px] md:min-h-0 md:w-[420px]`;

  const demoHeaderPersona = isDemoIframe ? selectedDemoCompanionPersona : null;
  const demoHeaderPersonaName = getPersonaDisplayName(demoHeaderPersona);
  const demoHeaderPersonaAvatarSrc = demoHeaderPersona?.template_avatar_url
    ? storageUrl(demoHeaderPersona.template_avatar_url)
    : null;
  const botAvatarSrc = demoHeaderPersonaAvatarSrc || (activeBot?.bot_avatar_url ? storageUrl(activeBot.bot_avatar_url) : null);
  const widgetHeaderTitle = demoHeaderPersonaName || activeBot?.bot_name || t('chat.assistantFallback');
  const widgetHeaderSubtitle = demoHeaderPersonaName
    ? t('chat.companionOf', { name: demoHeaderPersonaName })
    : streaming ? t('chat.streaming') : t('chat.online');

  return (
    <>
      <AnimatePresence>
        {isDemoCompanionWaiting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="demo-iframe-dark-lock-overlay fixed inset-0 z-[10030] cursor-default"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDemoCompanionFocus && open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="demo-iframe-dark-lock-overlay fixed inset-0 z-[10000]"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* ═══════ Draggable FAB ═══════ */}
      {!open && (
        <div
          ref={fabRef}
          onPointerDown={onFabPointerDown}
          onPointerMove={onFabPointerMove}
          onPointerUp={onFabPointerUp}
          style={{ position: 'fixed', zIndex: isDemoIframe ? 9997 : 40, touchAction: 'none' }}
          className="bottom-[85px] md:bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25 flex items-center justify-center hover:shadow-xl hover:shadow-primary/30 cursor-grab active:cursor-grabbing select-none"
          title={t('chat.chatWithAi')}
        >
          {botAvatarSrc ? (
            <img src={botAvatarSrc} alt="" className="h-9 w-9 rounded-full object-cover pointer-events-none" draggable={false} />
          ) : (
            <MessageCircle className="h-6 w-6 text-primary-foreground pointer-events-none" />
          )}
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-background animate-pulse pointer-events-none" />
        </div>
      )}

      {/* ═══════ Widget Panel ═══════ */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className={`${widgetClass} border bg-background/95 backdrop-blur-xl shadow-2xl shadow-black/20 flex flex-col overflow-hidden`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center gap-2.5">
                {state === 'chat' && !isDemoWidgetLocked && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden">
                  {botAvatarSrc ? (
                    <img src={botAvatarSrc} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Bot className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{widgetHeaderTitle}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {widgetHeaderSubtitle}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!isDemoWidgetLocked && (
                  <>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFullscreen(f => !f)} title={fullscreen ? t('chat.minimize') : t('chat.maximize')}>
                      {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setOpen(false); setFullscreen(false); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 flex flex-col">
              {state === 'loading' && <LoadingState />}
              {state === 'no-bot' && <NoBotState />}
              {state === 'persona-picker' && (
                <PersonaPicker
                  personas={personas}
                  onSelect={isDemoIframe ? undefined : handleCreateConversation}
                  onBack={!isDemoIframe && conversations.length > 0 ? () => setState('conversations') : undefined}
                  readOnly={isDemoIframe}
                  showSurveyCta={isDemoCompanionFocus}
                  demoContactLogoSrc={isDemoIframe ? branding.squareIcon : undefined}
                  onDemoCompanionSurveyComplete={isDemoIframe ? handleDemoCompanionSurveyComplete : undefined}
                />
              )}
              {state === 'conversations' && (
                <ConversationList
                  conversations={conversations}
                  loading={loadingConvs}
                  onOpen={handleOpenConversation}
                  onDelete={handleDeleteConversation}
                  onNew={handleNewConvFromList}
                />
              )}
              {state === 'chat' && (
                <ChatView
                  messages={messages}
                  streamText={streamText}
                  streaming={streaming}
                  loading={loadingMessages}
                  hasMore={hasMore}
                  loadingMore={loadingMore}
                  onLoadMore={handleLoadMore}
                  inputValue={inputValue}
                  onInputChange={setInputValue}
                  onSend={handleSend}
                  onKeyDown={handleKeyDown}
                  voiceCaptureState={voiceCaptureState}
                  botSpeaking={botSpeaking}
                  botSpeechLoading={botSpeechLoading}
                  botSpeechNeedsTap={botSpeechNeedsTap}
                  botSpeechText={botSpeechText}
                  voiceModeActive={voiceModeActive}
                  voiceModeTranscript={voiceModeTranscript}
                  voiceCallStartedAt={voiceCallStartedAt}
                  voiceCallMuted={voiceCallMuted}
                  botName={widgetHeaderTitle}
                  botAvatarSrc={botAvatarSrc}
                  onVoiceToggle={handleVoiceToggle}
                  onToggleVoiceMute={handleToggleVoiceMute}
                  onResumeBotSpeech={handleResumeBotSpeech}
                  onStopBotSpeech={cancelBotSpeech}
                  onCloseVoiceMode={handleCloseVoiceMode}
                  scrollRef={scrollRef}
                  inputRef={inputRef}
                  inputReadOnly={isDemoQuizAssistActive}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ Delete Confirmation Modal ═══════ */}
      <AnimatePresence>
        {confirmDeleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => { if (!deleting) setConfirmDeleteId(null); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="bg-background border rounded-xl shadow-2xl p-6 w-[340px] space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{t('chat.deleteConversation')}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('chat.deleteConversationDescription')}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setConfirmDeleteId(null)} disabled={deleting}>{t('chat.cancel')}</Button>
                <Button variant="destructive" size="sm" onClick={confirmDelete} disabled={deleting} className="gap-1.5">
                  {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  {t('chat.delete')}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════

function LoadingState() {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6">
      <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
      <p className="text-sm text-muted-foreground">{t('chat.connecting')}</p>
    </div>
  );
}

function NoBotState() {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center">
        <Bot className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <p className="text-sm text-muted-foreground">{t('chat.noAssistant')}</p>
      <p className="text-xs text-muted-foreground/60">{t('chat.contactAdministrator')}</p>
    </div>
  );
}

function PersonaPicker({ personas, onSelect, onBack, readOnly = false, showSurveyCta = false, demoContactLogoSrc, onDemoCompanionSurveyComplete }: {
  personas: BotPersona[];
  onSelect?: (id: string) => void;
  onBack?: () => void;
  readOnly?: boolean;
  showSurveyCta?: boolean;
  demoContactLogoSrc?: string;
  onDemoCompanionSurveyComplete?: (persona: BotPersona | null) => void;
}) {
  const { t } = useTranslation();
  const [selecting, setSelecting] = useState<string | null>(null);
  const [surveyStarted, setSurveyStarted] = useState(false);
  const [currentSurveyQuestion, setCurrentSurveyQuestion] = useState(0);
  const influencePersona = useMemo(() => findDemoInfluencePersona(personas), [personas]);
  const surveyQuestions = useMemo(() => getDemoCompanionSurveyQuestions(t), [t]);

  const handleSelect = async (id: string) => {
    if (readOnly || !onSelect) return;
    setSelecting(id);
    await onSelect(id);
    setSelecting(null);
  };

  useEffect(() => {
    if (!showSurveyCta) {
      setSurveyStarted(false);
      setCurrentSurveyQuestion(0);
    }
  }, [showSurveyCta]);

  const handleSurveyCorrect = () => {
    const isLastQuestion = currentSurveyQuestion >= surveyQuestions.length - 1;
    if (isLastQuestion) {
      onDemoCompanionSurveyComplete?.(influencePersona);
      setCurrentSurveyQuestion(surveyQuestions.length);
      return;
    }

    setCurrentSurveyQuestion(index => Math.min(index + 1, surveyQuestions.length));
  };

  if (showSurveyCta && surveyStarted) {
    return (
      <DemoCompanionSurvey
        currentQuestionIndex={currentSurveyQuestion}
        companionPersona={influencePersona}
        onCorrectAnswer={handleSurveyCorrect}
        questions={surveyQuestions}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {onBack && (
        <div className="px-4 pt-4 pb-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onBack}><ArrowLeft className="h-3.5 w-3.5" /></Button>
        </div>
      )}
      <ScrollArea className="flex-1 px-4 pb-4">
        <div className="grid grid-cols-2 gap-3 pt-2">
          {personas.map((p, i) => {
            const name = p.custom_name || p.template_name;
            const desc = p.custom_description || p.template_description || '';
            const fullbody = p.template_fullbody_url;
            const avatar = p.template_avatar_url;

            return (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={readOnly ? undefined : () => handleSelect(p.id)}
                disabled={!readOnly && selecting !== null}
                aria-disabled={readOnly}
                tabIndex={readOnly ? -1 : 0}
                className={`group relative rounded-xl border bg-card transition-all duration-200 overflow-hidden text-left disabled:opacity-50 ${readOnly
                    ? 'cursor-default'
                    : 'hover:border-primary/50 hover:shadow-md'
                  }`}
              >
                <div className="h-28 bg-gradient-to-br from-muted/40 to-muted/10 flex items-end justify-center overflow-hidden">
                  {fullbody ? (
                    <img src={storageUrl(fullbody)} alt="" className={`h-[90%] w-auto object-contain drop-shadow-md transition-transform ${readOnly ? '' : 'group-hover:scale-105'}`} />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <Bot className="h-6 w-6 text-primary/40" />
                    </div>
                  )}
                </div>
                <div className="p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    {avatar ? (
                      <img src={storageUrl(avatar)} alt="" className="h-6 w-6 rounded-full object-cover" />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-primary">{name.charAt(0)}</span>
                      </div>
                    )}
                    <p className="text-xs font-semibold truncate flex-1">{name}</p>
                  </div>
                  {desc && <p className="text-[10px] text-muted-foreground line-clamp-2">{desc}</p>}
                </div>
                {selecting === p.id && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </ScrollArea>
      {showSurveyCta && (
        <div className="px-4 pb-5 pt-2">
          <button
            type="button"
            className="demo-iframe-hero-cta-guide-wave-only demo-iframe-hero-cta-guide-blue relative mx-auto flex h-11 w-full max-w-[340px] items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold leading-none text-white shadow-lg shadow-primary/25 outline-none transition hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            onClick={() => setSurveyStarted(true)}
          >
            <span className="demo-iframe-hero-cta-echo" aria-hidden="true" />
            <Sparkles className="relative z-10 h-4 w-4" />
            <span className="relative z-10">{t('chat.selectCompanion')}</span>
          </button>
        </div>
      )}
      {readOnly && !showSurveyCta && (
        <div className="border-t bg-gradient-to-r from-primary/5 via-background to-primary/5 px-4 py-4">
          <div className="mx-auto flex w-full max-w-[340px] items-center justify-center gap-3 rounded-2xl border border-primary/15 bg-background/90 px-4 py-3 shadow-sm">
            {demoContactLogoSrc ? (
              <img
                src={demoContactLogoSrc}
                alt=""
                className="h-9 w-9 shrink-0 rounded-xl border border-primary/10 object-cover shadow-sm"
                draggable={false}
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
            )}
            <p className="text-[13px] font-semibold leading-[18px] text-foreground">
              {t('chat.contactNesso')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function DemoCompanionSurvey({
  currentQuestionIndex,
  companionPersona,
  onCorrectAnswer,
  questions,
}: {
  currentQuestionIndex: number;
  companionPersona: BotPersona | null;
  onCorrectAnswer: () => void;
  questions: ReturnType<typeof getDemoCompanionSurveyQuestions>;
}) {
  const { t } = useTranslation();
  const question = questions[currentQuestionIndex];
  const isComplete = currentQuestionIndex >= questions.length;
  const companionName = getPersonaDisplayName(companionPersona) || 'Influence';
  const companionAvatarSrc = companionPersona?.template_avatar_url ? storageUrl(companionPersona.template_avatar_url) : null;
  const companionFullbodySrc = companionPersona?.template_fullbody_url ? storageUrl(companionPersona.template_fullbody_url) : null;
  const companionDescription = t('chat.companionDescription');

  return (
    <div className="flex-1 min-h-0 overflow-hidden px-5 py-5 bg-gradient-to-b from-sky-50/40 via-white to-white">
      <AnimatePresence mode="wait">
        {isComplete ? (
          <motion.div
            key="survey-complete"
            initial={{ opacity: 0, y: 22, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="flex h-full flex-col items-center justify-center text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.08, type: 'spring', stiffness: 280, damping: 20 }}
              className="relative w-full max-w-[330px] overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-[0_24px_70px_rgba(14,116,144,0.18)]"
            >
              <div className="relative bg-gradient-to-br from-sky-50 via-white to-cyan-50 px-5 pt-5">
                <div className="mx-auto flex h-9 w-fit items-center gap-2 rounded-full border border-sky-100 bg-white/90 px-3 text-xs font-semibold text-sky-700 shadow-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t('chat.companionReady')}
                </div>

                <motion.div
                  initial={{ y: 18, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.18, duration: 0.32, ease: 'easeOut' }}
                  className="relative mx-auto mt-5 flex h-40 w-full items-end justify-center"
                >
                  {companionFullbodySrc ? (
                    <img
                      src={companionFullbodySrc}
                      alt={companionName}
                      className="relative z-10 h-full w-auto object-contain drop-shadow-[0_18px_24px_rgba(15,23,42,0.18)]"
                      draggable={false}
                    />
                  ) : companionAvatarSrc ? (
                    <img
                      src={companionAvatarSrc}
                      alt={companionName}
                      className="relative z-10 h-28 w-28 rounded-full border-4 border-white object-cover shadow-xl"
                      draggable={false}
                    />
                  ) : (
                    <div className="relative z-10 flex h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-sky-100 text-sky-600 shadow-xl">
                      <Bot className="h-12 w-12" />
                    </div>
                  )}
                </motion.div>
              </div>

              <div className="px-5 pb-6 pt-4">
                <motion.h3
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.26, duration: 0.24 }}
                  className="text-xl font-extrabold tracking-normal text-slate-950"
                >
                  {companionName}
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.32, duration: 0.24 }}
                  className="mt-2 text-base font-bold text-sky-700"
                >
                  {t('chat.companionOf', { name: companionName })}
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.38, duration: 0.24 }}
                  className="mx-auto mt-3 max-w-[260px] text-sm leading-6 text-slate-500"
                >
                  {companionDescription}
                </motion.p>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 36 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="flex h-full min-h-0 flex-col"
          >
            <div className="mb-4">
              <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.12em] text-sky-600">
                <span>{t('chat.questionNumber', { current: currentQuestionIndex + 1 })}</span>
                <span>{currentQuestionIndex + 1}/{questions.length}</span>
              </div>
              <h3 className="text-base font-bold leading-6 text-slate-950">
                {question.question}
              </h3>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1">
              {question.answers.map((answer, index) => {
                const isCorrect = answer.key === question.correct;
                return (
                  <motion.button
                    key={answer.key}
                    type="button"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.22 }}
                    onClick={isCorrect ? onCorrectAnswer : undefined}
                    disabled={!isCorrect}
                    aria-disabled={!isCorrect}
                    className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all ${isCorrect
                        ? 'border-sky-300 bg-sky-50 text-sky-950 shadow-[0_10px_24px_rgba(14,165,233,0.16)] hover:border-sky-400 hover:bg-sky-100'
                        : 'cursor-not-allowed border-slate-200 bg-slate-50/60 text-slate-400 opacity-55'
                      }`}
                  >
                    <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isCorrect
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'bg-slate-200 text-slate-400'
                      }`}>
                      {answer.key}
                    </span>
                    <span className="text-sm font-medium leading-6">{answer.text}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ConversationList({ conversations, loading, onOpen, onDelete, onNew }: {
  conversations: ChatConversation[];
  loading: boolean;
  onOpen: (conv: ChatConversation) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}) {
  const { t, i18n } = useTranslation();
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">{t('chat.conversations')}</h3>
          <p className="text-[11px] text-muted-foreground">{conversations.length}/10</p>
        </div>
        <Button size="sm" variant="outline" onClick={onNew} disabled={conversations.length >= 10} className="h-7 gap-1 text-xs">
          <Plus className="h-3 w-3" /> {t('chat.newConversation')}
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2">
        {loading ? (
          <div className="space-y-2 px-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-3 rounded-lg border"><Skeleton className="h-4 w-2/3 mb-2" /><Skeleton className="h-3 w-full" /></div>
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {conversations.map((conv, i) => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="group flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors overflow-hidden"
                onClick={() => onOpen(conv)}
              >
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shrink-0 overflow-hidden">
                  {conv.persona_avatar_url ? (
                    <img src={storageUrl(conv.persona_avatar_url)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Bot className="h-4 w-4 text-primary/50" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{conv.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{conv.last_message || t('chat.noMessages')}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock className="h-2.5 w-2.5 text-muted-foreground/50" />
                    <span className="text-[9px] text-muted-foreground/50">
                      {new Date(conv.updated_at).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {conv.persona_name && <Badge variant="outline" className="text-[8px] h-4 px-1 ml-1">{conv.persona_name}</Badge>}
                  </div>
                </div>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}



function VoiceModeView({ active, phase, transcript, botText, botName, botAvatarSrc, startedAt, muted, onMic, onToggleMute, onResumeBotSpeech, onStopBotSpeech, onClose }: {
  active: boolean;
  phase: VoiceModePhase;
  transcript: string;
  botText: string;
  botName: string;
  botAvatarSrc: string | null;
  startedAt: number | null;
  muted: boolean;
  onMic: () => void;
  onToggleMute: () => void;
  onResumeBotSpeech: () => void;
  onStopBotSpeech: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  void botText;

  useEffect(() => {
    if (!active || !startedAt) {
      setElapsedSeconds(0);
      return;
    }

    const updateElapsed = () => setElapsedSeconds((Date.now() - startedAt) / 1000);
    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(timer);
  }, [active, startedAt]);

  const isUserTurn = phase === 'requesting' || phase === 'listening';
  const isBotTurn = phase === 'thinking' || phase === 'preparing' || phase === 'speaking' || phase === 'play_blocked';
  const userVoiceActive = phase === 'listening' && transcript.trim().length > 0;
  const botVoiceActive = phase === 'speaking';
  const waveActive = !muted && (userVoiceActive || botVoiceActive);
  const caption = (isBotTurn ? '' : transcript).trim();
  const title = muted && phase === 'idle'
    ? t('chat.voice.muted')
    : phase === 'requesting'
      ? t('chat.voice.connecting')
      : phase === 'listening'
        ? t('chat.voice.listening')
        : phase === 'thinking'
          ? t('chat.voice.thinking')
          : phase === 'preparing'
            ? t('chat.voice.preparing')
            : phase === 'speaking'
              ? t('chat.voice.botSpeaking')
              : phase === 'play_blocked'
                ? t('chat.voice.tapToPlay')
                : t('chat.voice.inCall');
  const hint = muted && phase === 'idle'
    ? t('chat.voice.turnOnMicrophoneHint')
    : phase === 'idle'
      ? t('chat.voice.readyForNextTurn')
      : phase === 'play_blocked'
        ? t('chat.voice.safariTapToPlay')
        : caption || title;
  const statusDotClass = muted
    ? 'bg-amber-300'
    : isUserTurn
      ? 'bg-rose-500 dark:bg-rose-300'
      : isBotTurn
        ? 'bg-sky-500 dark:bg-sky-300'
        : 'bg-emerald-500 dark:bg-emerald-300';
  const avatarTone = isBotTurn
    ? 'border-sky-500/25 bg-sky-500/10 text-sky-700 shadow-sky-500/10 dark:border-sky-300/25 dark:bg-sky-400/15 dark:text-sky-100 dark:shadow-sky-950/40'
    : muted
      ? 'border-amber-500/25 bg-amber-500/10 text-amber-700 shadow-amber-500/10 dark:border-amber-300/25 dark:bg-amber-400/15 dark:text-amber-100 dark:shadow-amber-950/35'
      : 'border-rose-500/25 bg-rose-500/10 text-rose-700 shadow-rose-500/10 dark:border-rose-300/25 dark:bg-rose-400/15 dark:text-rose-100 dark:shadow-rose-950/40';
  const ringTone = isBotTurn ? 'border-sky-500/20 bg-sky-500/10 dark:border-sky-300/20 dark:bg-sky-300/10' : muted ? 'border-amber-500/20 bg-amber-500/10 dark:border-amber-300/20 dark:bg-amber-300/10' : 'border-rose-500/20 bg-rose-500/10 dark:border-rose-300/20 dark:bg-rose-300/10';
  const barTone = isBotTurn ? 'bg-sky-500/70 dark:bg-sky-300/80' : muted ? 'bg-muted-foreground/25 dark:bg-white/25' : 'bg-rose-500/70 dark:bg-rose-300/80';
  const rightAction = phase === 'play_blocked'
    ? onResumeBotSpeech
    : phase === 'speaking' || phase === 'preparing'
      ? onStopBotSpeech
      : onMic;
  const rightDisabled = muted || phase === 'requesting' || phase === 'thinking';
  const rightTitle = phase === 'play_blocked'
    ? t('chat.voice.resumeBotSpeech')
    : phase === 'speaking' || phase === 'preparing'
      ? t('chat.voice.stopBotSpeech')
      : t('chat.voice.speakNow');
  const rightLabel = phase === 'play_blocked' ? t('chat.voice.play') : phase === 'speaking' || phase === 'preparing' ? t('chat.voice.stopBot') : t('chat.voice.speak');
  const bars = [12, 18, 14, 26, 20, 34, 24, 42, 28, 38, 22, 30, 18, 24, 14];

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="voice-call-mode"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 z-50 flex flex-col overflow-hidden bg-background text-foreground dark:bg-zinc-950 dark:text-white"
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted))_52%,hsl(var(--background))_100%)] dark:bg-[linear-gradient(180deg,#0b1220_0%,#111827_52%,#09090b_100%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(14,165,233,0.10)_0%,transparent_34%,rgba(244,63,94,0.08)_72%,rgba(16,185,129,0.08)_100%)] dark:bg-[linear-gradient(135deg,rgba(14,165,233,0.16)_0%,transparent_34%,rgba(244,63,94,0.12)_72%,rgba(16,185,129,0.10)_100%)]" />

          <div className="relative z-10 flex items-center justify-between px-4 pt-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground dark:text-white">{botName}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground dark:text-white/55">
                <span className={`h-2 w-2 rounded-full ${statusDotClass}`} />
                <span className="truncate">{title}</span>
              </div>
            </div>
            <div className="rounded-lg border border-border/70 bg-card/80 px-3 py-1.5 text-xs font-semibold tabular-nums text-foreground shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/10 dark:text-white/85">
              {formatCallDuration(elapsedSeconds)}
            </div>
          </div>

          <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center px-5 py-4 text-center">
            <motion.div layout className="mb-5 inline-flex max-w-full items-center gap-2 rounded-lg border border-border/70 bg-card/80 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/10 dark:text-white/75">
              <span className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass}`} />
              <span className="truncate">{title}</span>
            </motion.div>

            <div className="relative flex h-56 w-56 items-center justify-center">
              <motion.span
                className={`absolute h-48 w-48 rounded-full border ${ringTone}`}
                animate={waveActive ? { scale: [0.86, 1.12, 0.86], opacity: [0.72, 0.22, 0.72] } : { scale: 0.95, opacity: 0.28 }}
                transition={{ duration: waveActive ? 1.18 : 0.2, repeat: waveActive ? Infinity : 0, ease: 'easeInOut' }}
              />
              <motion.span
                className={`absolute h-40 w-40 rounded-full ${ringTone}`}
                animate={waveActive ? { scale: [0.9, 1.24, 0.9], opacity: [0.52, 0.12, 0.52] } : { scale: 0.96, opacity: 0.16 }}
                transition={{ duration: waveActive ? 0.86 : 0.2, repeat: waveActive ? Infinity : 0, ease: 'easeInOut' }}
              />
              <motion.button
                type="button"
                onClick={phase === 'play_blocked' ? onResumeBotSpeech : phase === 'speaking' ? onStopBotSpeech : undefined}
                disabled={phase !== 'play_blocked' && phase !== 'speaking'}
                className={`relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border backdrop-blur-xl shadow-2xl disabled:cursor-default ${avatarTone}`}
                animate={{ scale: waveActive ? [1, 1.035, 1] : 1 }}
                transition={{ duration: 0.78, repeat: waveActive ? Infinity : 0, ease: 'easeInOut' }}
                title={phase === 'speaking' ? t('chat.voice.stopBotSpeech') : phase === 'play_blocked' ? t('chat.voice.resumeBotSpeech') : botName}
              >
                {botAvatarSrc ? (
                  <img src={botAvatarSrc} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Bot className="h-12 w-12" />
                )}
                {phase === 'play_blocked' && (
                  <span className="absolute inset-0 flex items-center justify-center bg-background/75 text-foreground backdrop-blur-sm dark:bg-black/45 dark:text-white">
                    <Play className="h-10 w-10" />
                  </span>
                )}
              </motion.button>
            </div>

            <div className="mt-4 flex h-12 items-center justify-center gap-1.5">
              {bars.map((idleHeight, index) => {
                const offset = Math.abs(index - 7);
                return (
                  <motion.span
                    key={index}
                    className={`w-1.5 rounded-full ${barTone}`}
                    animate={{ height: waveActive ? [14 + offset, Math.max(18, 44 - offset * 2), 12 + offset] : idleHeight }}
                    transition={{ duration: 0.5 + (index % 4) * 0.06, repeat: waveActive ? Infinity : 0, ease: 'easeInOut', delay: waveActive ? index * 0.025 : 0 }}
                  />
                );
              })}
            </div>

            <div className="mt-5 min-h-[76px] w-full max-w-[19rem]">
              <p className="text-base font-semibold tracking-normal text-foreground dark:text-white">{hint}</p>
              {caption ? (
                <motion.p
                  key={caption}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 max-h-24 overflow-hidden rounded-lg border border-border/70 bg-card/80 px-4 py-3 text-sm leading-6 text-muted-foreground backdrop-blur-md line-clamp-3 dark:border-white/10 dark:bg-white/10 dark:text-white/70"
                >
                  {caption}
                </motion.p>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground dark:text-white/45">{isBotTurn ? t('chat.voice.keepCallOpen') : t('chat.voice.speakNaturally')}</p>
              )}
            </div>
          </div>

          <div className="relative z-10 px-5 pb-5">
            <div className="mx-auto grid max-w-xs grid-cols-3 items-end gap-4 rounded-lg border border-border/70 bg-card/85 px-4 py-4 shadow-2xl shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:shadow-black/25">
              <div className="flex flex-col items-center">
                <Button type="button" variant="ghost" size="icon" className={`h-12 w-12 rounded-full border border-border bg-background/70 text-foreground hover:bg-muted dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15 ${muted ? 'border-amber-500/40 text-amber-700 dark:border-amber-300/35 dark:text-amber-100' : ''}`} onClick={onToggleMute} title={muted ? t('chat.voice.turnOnMicrophoneTitle') : t('chat.voice.turnOffMicrophoneTitle')}>
                  {muted ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </Button>
                <span className="mt-2 text-[11px] font-medium text-muted-foreground dark:text-white/55">{muted ? t('chat.voice.turnOnMicrophone') : t('chat.voice.turnOffMicrophone')}</span>
              </div>
              <div className="flex flex-col items-center">
                <Button type="button" size="icon" className="h-14 w-14 rounded-full bg-red-500 text-white shadow-lg shadow-red-950/35 hover:bg-red-600" onClick={onClose} title={t('chat.voice.endCall')}>
                  <PhoneOff className="h-6 w-6" />
                </Button>
                <span className="mt-2 text-[11px] font-medium text-muted-foreground dark:text-white/55">{t('chat.voice.end')}</span>
              </div>
              <div className="flex flex-col items-center">
                <Button type="button" variant="ghost" size="icon" className="h-12 w-12 rounded-full border border-border bg-background/70 text-foreground hover:bg-muted disabled:opacity-35 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15" onClick={rightAction} disabled={rightDisabled} title={rightTitle}>
                  {phase === 'play_blocked'
                    ? <Play className="h-5 w-5" />
                    : phase === 'speaking' || phase === 'preparing'
                      ? <VolumeX className="h-5 w-5" />
                      : <Mic className="h-5 w-5" />}
                </Button>
                <span className="mt-2 text-[11px] font-medium text-muted-foreground dark:text-white/55">{rightLabel}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ChatView({ messages, streamText, streaming, loading, hasMore, loadingMore, onLoadMore, inputValue, onInputChange, onSend, onKeyDown, voiceCaptureState, botSpeaking, botSpeechLoading, botSpeechNeedsTap, botSpeechText, voiceModeActive, voiceModeTranscript, voiceCallStartedAt, voiceCallMuted, botName, botAvatarSrc, onVoiceToggle, onToggleVoiceMute, onResumeBotSpeech, onStopBotSpeech, onCloseVoiceMode, scrollRef, inputRef, inputReadOnly = false }: {
  messages: ChatMessage[];
  streamText: string;
  streaming: boolean;
  loading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  inputValue: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  voiceCaptureState: VoiceCaptureState;
  botSpeaking: boolean;
  botSpeechLoading: boolean;
  botSpeechNeedsTap: boolean;
  botSpeechText: string;
  voiceModeActive: boolean;
  voiceModeTranscript: string;
  voiceCallStartedAt: number | null;
  voiceCallMuted: boolean;
  botName: string;
  botAvatarSrc: string | null;
  onVoiceToggle: () => void;
  onToggleVoiceMute: () => void;
  onResumeBotSpeech: () => void;
  onStopBotSpeech: () => void;
  onCloseVoiceMode: () => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  inputReadOnly?: boolean;
}) {
  const { t } = useTranslation();
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (isNearBottom) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages.length, streamText, scrollRef]);

  useEffect(() => { if (!loading) inputRef.current?.focus(); }, [loading, inputRef]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const minHeight = 40;
    const maxHeight = 128;
    input.style.height = `${minHeight}px`;
    const nextHeight = Math.min(maxHeight, Math.max(minHeight, input.scrollHeight));
    input.style.height = `${nextHeight}px`;
    input.style.overflowY = input.scrollHeight > maxHeight ? 'auto' : 'hidden';
    input.scrollTop = input.scrollHeight;
  }, [inputRef, inputValue]);

  const isVoiceListening = voiceCaptureState === 'listening';
  const isVoiceRequesting = voiceCaptureState === 'requesting';
  const isBotVoiceActive = voiceModeActive && (streaming || botSpeechLoading || botSpeaking || botSpeechNeedsTap);
  const voiceModePhase: VoiceModePhase = isVoiceRequesting
    ? 'requesting'
    : isVoiceListening
      ? 'listening'
      : streaming
        ? 'thinking'
        : botSpeechLoading
          ? 'preparing'
          : botSpeaking
            ? 'speaking'
            : botSpeechNeedsTap
              ? 'play_blocked'
              : 'idle';
  const voiceButtonTitle = isVoiceListening
    ? t('chat.voice.stopListening')
    : isVoiceRequesting
      ? t('chat.voice.requestingPermission')
      : isBotVoiceActive
        ? t('chat.voice.botSpeaking')
        : t('chat.voice.speakWithMicrophone');
  return (
    <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
      <VoiceModeView
        active={voiceModeActive}
        phase={voiceModePhase}
        transcript={voiceModeTranscript || inputValue}
        botText=''
        botName={botName}
        botAvatarSrc={botAvatarSrc}
        startedAt={voiceCallStartedAt}
        muted={voiceCallMuted}
        onMic={onVoiceToggle}
        onToggleMute={onToggleVoiceMute}
        onResumeBotSpeech={onResumeBotSpeech}
        onStopBotSpeech={onStopBotSpeech}
        onClose={onCloseVoiceMode}
      />
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <Skeleton className={`h-10 rounded-2xl ${i % 2 === 0 ? 'w-2/3' : 'w-3/4'}`} />
              </div>
            ))}
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="flex justify-center py-1">
                <Button variant="ghost" size="sm" onClick={onLoadMore} disabled={loadingMore} className="gap-1.5 text-xs h-7">
                  {loadingMore ? <Loader2 className="h-3 w-3 animate-spin" /> : <Clock className="h-3 w-3" />}
                  {loadingMore ? t('chat.loading') : t('chat.loadMore')}
                </Button>
              </div>
            )}
            {messages.length === 0 && !streaming && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-2">
                <Sparkles className="h-8 w-8 text-primary/30" />
                <p className="text-xs text-muted-foreground">{t('chat.startConversation')}</p>
              </div>
            )}
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {streaming && streamText && (
              <div className="flex justify-start">
                <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-muted/50 text-sm whitespace-pre-wrap break-words">
                  {streamText}
                  <span className="inline-block w-1.5 h-4 bg-primary/60 ml-0.5 animate-pulse rounded-sm" />
                  {isBotVoiceActive && <Volume2 className="ml-1 inline-block h-3.5 w-3.5 animate-pulse text-primary" />}
                </div>
              </div>
            )}
            {streaming && !streamText && (
              <div className="flex justify-start">
                <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-muted/50">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="border-t px-3 py-2.5 bg-background/50">
        <div className="flex items-center gap-2">
          <div className="flex min-h-11 flex-1 items-center gap-1 rounded-xl border bg-muted/30 px-2.5 py-1.5 transition-[background-color,border-color,box-shadow,opacity] focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/20">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={e => onInputChange(e.target.value)}
              onKeyDown={inputReadOnly ? undefined : onKeyDown}
              placeholder={t('chat.messagePlaceholder')}
              readOnly={inputReadOnly}
              disabled={streaming}
              rows={1}
              className="min-h-8 flex-1 resize-none border-0 bg-transparent px-1 py-1 text-sm leading-5 placeholder:text-muted-foreground/50 focus:outline-none disabled:opacity-50"
              style={{ minHeight: '32px', maxHeight: '128px', overflowY: 'hidden' }}
            />
            <Button
              type="button"
              variant={isVoiceListening ? 'default' : 'ghost'}
              size="icon"
              className={`h-8 w-8 shrink-0 self-center rounded-lg ${isVoiceListening ? 'bg-red-500 text-white hover:bg-red-600' : isBotVoiceActive ? 'text-primary' : 'text-muted-foreground'}`}
              disabled={inputReadOnly || streaming || isVoiceRequesting}
              onClick={onVoiceToggle}
              title={voiceButtonTitle}
            >
              {isVoiceRequesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isVoiceListening ? <MicOff className="h-3.5 w-3.5" /> : isBotVoiceActive ? <Volume2 className="h-3.5 w-3.5 animate-pulse" /> : <Mic className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <Button
            size="icon"
            className="h-11 w-11 shrink-0 self-center rounded-xl"
            disabled={!inputValue.trim() || streaming || inputReadOnly}
            onClick={onSend}
          >
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words ${isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted/50 rounded-bl-md'
          }`}
      >
        {message.content}
      </div>
    </motion.div>
  );
}
