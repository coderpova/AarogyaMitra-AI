"use client";

import { useState, useEffect, useRef } from "react";
import {
  Send,
  Bot,
  User,
  ArrowLeft,
  Mic,
  Volume2,
  Square,
  Trash2,
  Stethoscope,
  WifiOff,
  Wifi,
  RefreshCw,
  Copy,
  Check,
  Activity,
  HeartPulse,
  Brain,
  Pill,
  Baby,
  Apple,
  Shield,
  Syringe,
  Eye,
  Sparkles,
  History,
  X,
  Hospital,
  Calendar,
  FileText,
  ChevronRight,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useNotification } from "@/context/NotificationContext";
import { getOfflineReply, createSession, ConversationSession } from "@/lib/offline/offlineChat";
import { saveOfflineChat, getOfflineChats } from "@/lib/offlineStorage";
import { checkAndSync } from "@/lib/syncManager";
import {
  parseSuggestedReplies,
  getIntegrationActions,
  IntegrationAction,
} from "@/lib/healthAssistant";

interface Message {
  role: "user" | "ai";
  text: string;
  timestamp?: string;
  suggestions?: string[];
  emergency?: boolean;
  isStreaming?: boolean;
  actions?: IntegrationAction[];
}

/* ── Icon map for integration actions ──────────────────────────────────────── */
const ACTION_ICONS: Record<string, any> = {
  hospital: Hospital,
  calendar: Calendar,
  pill: Pill,
  file: FileText,
  shield: Shield,
  apple: Apple,
};

/* ── Simple Markdown Renderer ─────────────────────────────────────────────── */
function renderMarkdown(text: string) {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
  html = html.replace(/`(.*?)`/g, '<code class="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>');
  html = html.replace(/^━+$/gm, '<hr class="my-2 border-gray-300 dark:border-gray-600" />');
  html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<div class="flex gap-2 ml-2 my-0.5"><span class="text-blue-600 dark:text-blue-400 font-bold shrink-0">$1.</span><span>$2</span></div>');
  html = html.replace(/^[•\-]\s+(.+)$/gm, '<div class="flex gap-2 ml-2 my-0.5"><span class="text-blue-600 dark:text-blue-400">•</span><span>$1</span></div>');
  html = html.replace(/\n/g, "<br />");

  return html;
}

/* ── Quick Health Actions ─────────────────────────────────────────────────── */

export default function ChatPage() {
  


  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { t, speechLang, language } = useLanguage();
  const { addNotification } = useNotification();

  const QUICK_ACTIONS = [
    { icon: Stethoscope, label: t("chatExt.actSymptom"), prompt: t("chatExt.promptSymptom") },
    { icon: Pill, label: t("chatExt.actMed"), prompt: t("chatExt.promptMed") },
    { icon: Activity, label: t("chatExt.actBmi"), prompt: t("chatExt.promptBmi") },
    { icon: HeartPulse, label: t("chatExt.actFirstAid"), prompt: t("chatExt.promptFirstAid") },
    { icon: Apple, label: t("chatExt.actDiet"), prompt: t("chatExt.promptDiet") },
    { icon: Brain, label: t("chatExt.actMental"), prompt: t("chatExt.promptMental") },
    { icon: Baby, label: t("chatExt.actChild"), prompt: t("chatExt.promptChild") },
    { icon: Syringe, label: t("chatExt.actVac"), prompt: t("chatExt.promptVac") },
  ];
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<any[]>([]);

  // ── Offline State ──────────────────────────────────────────────────────────
  const [isOnline, setIsOnline] = useState(typeof window !== "undefined" ? navigator.onLine : true);
  const [syncing, setSyncing] = useState(false);
  const [syncBanner, setSyncBanner] = useState<string | null>(null);

  const offlineSessionRef = useRef<ConversationSession>(createSession());
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  // ── Network Detection ──────────────────────────────────────────────────────
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setSyncBanner(t("offline.syncSuccess"));
      setSyncing(true);
      try {
        await checkAndSync(user?.email || undefined);
      } finally {
        setSyncing(false);
        setTimeout(() => setSyncBanner(null), 5000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncBanner(null);
    };

    const handleSyncComplete = (e: Event) => {
      const result = (e as CustomEvent).detail;
      if (result?.synced > 0) {
        console.log(`[Chat] Synced ${result.synced} offline messages`);
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("offline-sync-complete", handleSyncComplete);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("offline-sync-complete", handleSyncComplete);
    };
  }, [user, t]);

  // Initialize greeting
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages((prev) => {
      if (prev.length === 0) {
        return [
          {
            role: "ai",
            text: t("chat.greeting"),
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ];
      }
      return prev;
    });
  }, [t]);

  // Check for report context from report-analyzer page
  useEffect(() => {
    const reportFlag = searchParams.get("report");
    if (reportFlag === "1") {
      try {
        const reportData = sessionStorage.getItem("reportContext");
        if (reportData) {
          const parsed = JSON.parse(reportData);
          const reportMsg = `I just got my medical report analyzed. Title: ${parsed.title}. Summary: ${parsed.summary}. Specialist recommended: ${parsed.specialistToConsult}. Can you explain these results?`;
          const reportCtx = JSON.stringify(parsed);
          setTimeout(() => sendMessage(reportMsg, reportCtx), 500);
          sessionStorage.removeItem("reportContext");
        }
      } catch (err) {
        console.log("Report context error:", err);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // AI VOICE REPLY (TTS)
  const speakReply = (text: string) => {
    if (typeof window === "undefined") return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const cleanText = text
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/━+/g, "")
      .replace(/[🚨✅⚠️🔴🩺📋📞💊🏥🩸🦋❤️🧠💡📝🫁🦷👶🤰🩹🧬]/g, "")
      .replace(/_[^_]+_/g, "")
      .replace(/\n+/g, ". ");

    const speech = new SpeechSynthesisUtterance(cleanText);
    speech.rate = 0.9;
    speech.pitch = 1;
    speech.lang = speechLang;

    speech.onend = () => setIsSpeaking(false);
    speech.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.cancel();
    setIsSpeaking(true);
    window.speechSynthesis.speak(speech);
  };

  // AUTO SCROLL
  useEffect(() => {
    const chatContainer = chatEndRef.current?.parentElement;
    if (!chatContainer) return;

    // Check if user is close to the bottom (within 200px)
    const isAtBottom =
      chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 200;

    const lastMessage = messages[messages.length - 1];
    const userJustSent = lastMessage?.role === "user";

    if (isAtBottom || userJustSent) {
      chatEndRef.current?.scrollIntoView({ behavior: userJustSent ? "smooth" : "auto" });
    }
  }, [messages]);

  // LOAD OLD CHAT HISTORY
  useEffect(() => {
    const loadHistory = async () => {
      if (!user?.email) return;

      if (navigator.onLine) {
        try {
          const res = await fetch("/api/chat/history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user.email }),
          });

          const data = await res.json();

          if (res.ok && data.chats?.length) {
            setChatHistory(data.chats);
            const oldMessages: Message[] = [];
            data.chats.reverse().forEach((chat: any) => {
              oldMessages.push({
                role: "user",
                text: chat.message,
                timestamp: chat.createdAt
                  ? new Date(chat.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "",
              });
              const { cleanText, suggestions } = parseSuggestedReplies(chat.reply);
              oldMessages.push({
                role: "ai",
                text: cleanText,
                timestamp: chat.createdAt
                  ? new Date(chat.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "",
                suggestions,
                actions: getIntegrationActions(cleanText),
              });
            });

            setMessages([
              {
                role: "ai",
                text: t("chat.greeting"),
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              },
              ...oldMessages,
            ]);
            return;
          }
        } catch (error) {
          console.log("History error:", error);
        }
      }

      // Offline fallback
      try {
        const offlineChats = getOfflineChats(user.email);
        if (offlineChats.length) {
          const oldMessages: Message[] = [];
          offlineChats.slice(-30).forEach((chat) => {
            oldMessages.push({ role: "user", text: chat.message });
            oldMessages.push({ role: "ai", text: chat.reply });
          });

          setMessages([
            { role: "ai", text: t("chat.greeting"), timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
            ...oldMessages,
          ]);
        }
      } catch (err) {
        console.log("Offline history error:", err);
      }
    };

    loadHistory();
  }, [user, t]);

  // FETCH HISTORY FOR DRAWER
  const fetchHistoryForDrawer = async () => {
    if (!user?.email) return;
    try {
      const res = await fetch("/api/chat/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.email }),
      });
      const data = await res.json();
      if (res.ok && data.chats) {
        setChatHistory(data.chats);
      }
    } catch (err) {
      console.log("History fetch error:", err);
    }
  };

  // VOICE INPUT (STT)
  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(t("chatExt.speechNotSupp"));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = speechLang;
    recognition.continuous = false;
    recognition.interimResults = false;

    setVoiceOpen(true);
    setListening(true);

    try {
      recognition.start();
    } catch (error) {
      console.log("Mic start error", error);
    }

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setMessage(text);
    };

    recognition.onerror = () => {
      setListening(false);
      setVoiceOpen(false);
    };

    recognition.onend = () => {
      setListening(false);
      setVoiceOpen(false);
    };
  };

  // COPY MESSAGE
  const copyMessage = (text: string, index: number) => {
    const cleanText = text.replace(/\*\*/g, "").replace(/\*/g, "");
    navigator.clipboard.writeText(cleanText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // SEND MESSAGE — streaming support
  async function sendMessage(textOverride?: string, reportCtx?: string) {
    const userText = textOverride || message;
    if (!userText.trim() || loading) return;

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    setMessages((prev) => [
      ...prev,
      { role: "user", text: userText, timestamp: now },
    ]);

    setMessage("");
    setLoading(true);
    setStreaming(true);

    // Add a placeholder AI message for streaming
    const aiMessageIndex = messages.length + 1;
    setMessages((prev) => [
      ...prev,
      {
        role: "ai",
        text: "",
        timestamp: now,
        isStreaming: true,
      },
    ]);

    try {
      if (isOnline) {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userText,
            userId: user?.email || "guest",
            language: language,
            history: messages.slice(-10),
            reportContext: reportCtx,
          }),
        });

        // Check if response is JSON (emergency) or stream
        const contentType = res.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
          // Emergency response — non-streaming
          const data = await res.json();
          if (!res.ok) throw new Error(data.message);

          const { cleanText, suggestions } = parseSuggestedReplies(data.reply);
          setMessages((prev) => {
            const updated = [...prev];
            updated[aiMessageIndex] = {
              role: "ai",
              text: cleanText,
              timestamp: now,
              suggestions,
              emergency: true,
              actions: getIntegrationActions(cleanText),
              isStreaming: false,
            };
            return updated;
          });
          addNotification(
            "emergency",
            "Emergency Symptom Alert",
            "Urgent symptoms detected. Review emergency care details immediately."
          );
        } else {
          // Streaming response
          const reader = res.body!.getReader();
          const decoder = new TextDecoder();
          let accumulated = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            accumulated += chunk;

            // Update the streaming message in real-time
            setMessages((prev) => {
              const updated = [...prev];
              if (updated[aiMessageIndex]) {
                updated[aiMessageIndex] = {
                  ...updated[aiMessageIndex],
                  text: accumulated,
                  isStreaming: true,
                };
              }
              return updated;
            });
          }

          // Streaming done — parse suggestions and actions
          const { cleanText, suggestions } = parseSuggestedReplies(accumulated);
          setMessages((prev) => {
            const updated = [...prev];
            updated[aiMessageIndex] = {
              role: "ai",
              text: cleanText,
              timestamp: now,
              suggestions,
              actions: getIntegrationActions(cleanText),
              isStreaming: false,
            };
            return updated;
          });
          if (typeof document !== "undefined" && (document.hidden || window.location.pathname !== "/chat")) {
            addNotification(
              "message",
              "Analysis Response Complete",
              "AarogyaMitra has finished generating your healthcare advice."
            );
          }
        }
      } else {
        // ── OFFLINE PATH ──────────────────────────────────────────────────────
        const { reply, session: updatedSession } = await getOfflineReply(
          userText,
          language,
          offlineSessionRef.current
        );
        offlineSessionRef.current = updatedSession;

        const { cleanText, suggestions } = parseSuggestedReplies(reply);
        setMessages((prev) => {
          const updated = [...prev];
          updated[aiMessageIndex] = {
            role: "ai",
            text: cleanText,
            timestamp: now,
            suggestions,
            actions: getIntegrationActions(cleanText),
            isStreaming: false,
          };
          return updated;
        });

        if (user?.email) {
          saveOfflineChat(user.email, userText, cleanText);
        }
      }
    } catch (error) {
      console.log(error);

      // Remove the streaming placeholder on error
      setMessages((prev) => prev.slice(0, -1));

      if (isOnline) {
        try {
          const { reply, session: updatedSession } = await getOfflineReply(
            userText,
            language,
            offlineSessionRef.current
          );
          offlineSessionRef.current = updatedSession;

          const { cleanText, suggestions } = parseSuggestedReplies(reply);
          setMessages((prev) => [
            ...prev,
            {
              role: "ai",
              text: cleanText,
              timestamp: now,
              suggestions,
              actions: getIntegrationActions(cleanText),
              isStreaming: false,
            },
          ]);

          if (user?.email) {
            saveOfflineChat(user.email, userText, cleanText);
          }
          return;
        } catch {
          // Both failed
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: t("chat.emergencyWarning"),
          timestamp: now,
          isStreaming: false,
        },
      ]);
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  }

  // CLEAR CHAT
  const clearChat = () => {
    offlineSessionRef.current = createSession();
    setMessages([
      {
        role: "ai",
        text: t("chat.greeting"),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  // LOAD A PAST CONVERSATION FROM HISTORY DRAWER
  const loadPastConversation = (chat: any) => {
    const { cleanText, suggestions } = parseSuggestedReplies(chat.reply);
    setMessages([
      {
        role: "ai",
        text: t("chat.greeting"),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
      {
        role: "user",
        text: chat.message,
        timestamp: chat.createdAt
          ? new Date(chat.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "",
      },
      {
        role: "ai",
        text: cleanText,
        timestamp: chat.createdAt
          ? new Date(chat.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "",
        suggestions,
        actions: getIntegrationActions(cleanText),
      },
    ]);
    setHistoryOpen(false);
  };

  const showQuickActions = messages.length <= 1 && !loading;

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* VOICE POPUP */}
      {voiceOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-10 text-center shadow-2xl fade-in-up">
            <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center pulse-ring">
              <Mic size={55} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold mt-6 dark:text-white">
              {t("chat.listening")}
            </h2>
            <p className="text-gray-500 mt-2">{t("chat.micHint")}</p>
            <button
              onClick={() => { setVoiceOpen(false); setListening(false); }}
              className="mt-6 bg-red-500 text-white px-6 py-3 rounded-xl hover:bg-red-600 transition font-medium"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}

      {/* CHAT HISTORY DRAWER */}
      {historyOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setHistoryOpen(false)}
          />
          <div className="fixed top-0 right-0 z-50 h-full w-80 sm:w-96 bg-white dark:bg-gray-900 shadow-2xl chat-history-drawer flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-bold dark:text-white flex items-center gap-2">
                <History size={20} className="text-blue-600" />
                Chat History
              </h2>
              <button
                onClick={() => setHistoryOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatHistory.length > 0 ? (
                chatHistory.map((chat, idx) => (
                  <button
                    key={idx}
                    onClick={() => loadPastConversation(chat)}
                    className="w-full text-left bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 hover:bg-blue-50 dark:hover:bg-gray-700 transition border border-gray-100 dark:border-gray-700"
                  >
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2">
                      {chat.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {chat.createdAt
                        ? new Date(chat.createdAt).toLocaleDateString() + " " + new Date(chat.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : ""}
                    </p>
                  </button>
                ))
              ) : (
                <div className="text-center py-10">
                  <History className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={40} />
                  <p className="text-sm text-gray-400">{t("chatExt.noHistory")}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* OFFLINE BANNER */}
      {!isOnline && (
        <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-sm font-medium">
          <div className="flex items-center gap-2">
            <WifiOff size={16} />
            <span>{t("offline.banner")}</span>
          </div>
          <span className="text-amber-100 text-xs bg-amber-600 px-2 py-0.5 rounded-full">
            {t("offline.offlineLabel")}
          </span>
        </div>
      )}

      {/* SYNC BANNER */}
      {syncBanner && (
        <div className="bg-green-600 text-white px-4 py-2 flex items-center gap-2 text-sm font-medium">
          {syncing ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <Wifi size={16} />
          )}
          <span>{syncBanner}</span>
        </div>
      )}

      {/* HEADER */}
      <div
        className={`text-white px-4 sm:px-5 py-4 flex items-center justify-between shadow-lg ${
          isOnline
            ? "bg-gradient-to-r from-blue-700 via-blue-600 to-teal-600"
            : "bg-gradient-to-r from-gray-700 to-gray-600"
        }`}
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => router.back()}
            className="bg-white/20 p-2 rounded-xl hover:bg-white/30 transition"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="bg-white/20 p-2.5 rounded-xl">
            <Stethoscope size={26} />
          </div>

          <div>
            <h1 className="text-lg sm:text-2xl font-bold">{t("chat.title")}</h1>
            <div className="flex items-center gap-2">
              <p className="text-blue-100 text-xs sm:text-sm">{t("chat.subtitle")}</p>
              {!isOnline && (
                <span className="flex items-center gap-1 text-amber-300 text-xs bg-amber-900/40 px-2 py-0.5 rounded-full">
                  <WifiOff size={10} />
                  {t("offline.mode")}
                </span>
              )}
              {isOnline && (
                <span className="flex items-center gap-1 text-green-200 text-xs bg-green-900/40 px-2 py-0.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  AI Doctor Online
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchHistoryForDrawer();
              setHistoryOpen(true);
            }}
            className="bg-white/20 p-2.5 rounded-xl hover:bg-white/30 transition"
            title="Chat History"
          >
            <History size={18} />
          </button>
          <button
            onClick={clearChat}
            className="bg-white/20 p-2.5 rounded-xl hover:bg-white/30 transition"
            title={t("chat.clearHistory")}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
        {messages.map((msg, index) => {
          const isLast = index === messages.length - 1;
          return (
            <div
              key={index}
              className={`flex gap-3 items-start ${
                msg.role === "user" ? "justify-end" : "justify-start"
              } ${msg.role === "user" ? "chat-msg-user" : "chat-msg-ai"}`}
            >
              {msg.role === "ai" && (
                <div className={`mt-1 shrink-0 p-2 rounded-full ${
                  msg.isStreaming && isLast
                    ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 animate-pulse"
                    : msg.emergency
                    ? "bg-red-100 dark:bg-red-950/50 text-red-600"
                    : isOnline
                    ? "bg-gradient-to-br from-blue-100 to-teal-100 dark:from-blue-900/50 dark:to-teal-900/50 text-blue-600"
                    : "bg-amber-100 dark:bg-amber-900/50 text-amber-600"
                }`}>
                  <Bot size={22} />
                </div>
              )}

              <div className="flex flex-col max-w-[85%] sm:max-w-xl">
                <div
                  className={`p-4 rounded-2xl ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-md"
                      : msg.emergency
                      ? "bg-red-50 dark:bg-red-950/30 dark:text-white shadow-sm border border-red-200 dark:border-red-800 rounded-bl-md emergency-pulse"
                      : "bg-white dark:bg-gray-800 dark:text-white shadow-sm border border-gray-100 dark:border-gray-700 rounded-bl-md"
                  } ${msg.isStreaming && isLast ? "streaming-cursor" : ""}`}
                >
                  {msg.role === "ai" ? (
                    msg.text ? (
                      <div
                        className="prose-sm leading-relaxed text-sm sm:text-base"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }}
                      />
                    ) : (
                      <div className="flex items-center gap-1.5 py-1">
                        <span className="typing-dot"></span>
                        <span className="typing-dot"></span>
                        <span className="typing-dot"></span>
                      </div>
                    )
                  ) : (
                    <p className="whitespace-pre-wrap text-sm sm:text-base">{msg.text}</p>
                  )}
                </div>

                {/* Timestamp + Actions */}
                <div className={`flex items-center gap-2 mt-1 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}>
                  {msg.timestamp && (
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                      {msg.timestamp}
                    </span>
                  )}
                  {msg.role === "ai" && !msg.isStreaming && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => copyMessage(msg.text, index)}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                        title="Copy"
                      >
                        {copiedIndex === index ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                      </button>
                      <button
                        onClick={() => speakReply(msg.text)}
                        className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition ${
                          isSpeaking ? "text-red-500 hover:text-red-700" : (isOnline ? "text-blue-500 hover:text-blue-700" : "text-amber-500 hover:text-amber-700")
                        }`}
                        title={isSpeaking ? "Stop Speaking" : t("chat.speakReply")}
                      >
                        {isSpeaking ? <Square fill="currentColor" size={14} /> : <Volume2 size={14} />}
                      </button>
                    </div>
                  )}
                </div>

                {/* SUGGESTED REPLIES */}
                {msg.role === "ai" && msg.suggestions && msg.suggestions.length > 0 && !msg.isStreaming && (
                  <div className="flex flex-wrap gap-2 mt-2 chat-extra-fade">
                    {msg.suggestions.map((suggestion, sIdx) => (
                      <button
                        key={sIdx}
                        onClick={() => sendMessage(suggestion)}
                        className="suggestion-chip bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-full text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}

                {/* INTEGRATION ACTION BUTTONS */}
                {msg.role === "ai" && msg.actions && msg.actions.length > 0 && !msg.isStreaming && (
                  <div className="flex flex-wrap gap-2 mt-2 chat-extra-fade">
                    {msg.actions.map((action, aIdx) => {
                      const Icon = ACTION_ICONS[action.icon] || Activity;
                      return (
                        <button
                          key={aIdx}
                          onClick={() => router.push(action.link)}
                          className="integration-btn flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg text-xs font-medium hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                        >
                          <Icon size={13} className="text-blue-600" />
                          {action.label}
                          <ChevronRight size={12} className="text-gray-400" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {msg.role === "user" && (
                <div className="mt-1 shrink-0 p-2 rounded-full bg-blue-600 text-white">
                  <User size={20} />
                </div>
              )}
            </div>
          );
        })}

        {/* Typing indicator when loading but not yet streaming */}
        {loading && !streaming && (
          <div className="flex gap-3 items-start chat-msg-ai">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 animate-pulse">
              <Bot size={22} />
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-bl-md px-5 py-4 shadow-sm">
              <div className="flex items-center gap-1.5">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* QUICK ACTION CHIPS */}
      {showQuickActions && (
        <div className="px-4 sm:px-6 pb-3 fade-in-up">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
            <Sparkles size={14} />
            Quick Health Actions
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action, idx) => {
              const Icon = action.icon;
              return (
                <button
                  key={idx}
                  onClick={() => sendMessage(action.prompt)}
                  className="suggestion-chip flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-xl text-xs font-medium text-gray-700 dark:text-gray-300 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition shadow-sm"
                >
                  <Icon size={14} className="text-blue-600" />
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* INPUT AREA */}
      <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3 bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-2 shadow-inner">
          <input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
            placeholder={listening ? t("chat.listening") : t("chat.placeholder")}
            className="flex-1 bg-transparent outline-none px-2 py-2.5 dark:text-white text-sm sm:text-base"
          />

          <button
            onClick={startListening}
            disabled={loading}
            className="text-green-600 hover:scale-110 transition p-2 rounded-xl hover:bg-green-50 dark:hover:bg-green-950/40"
            title={t("chat.micTitle")}
          >
            <Mic size={22} />
          </button>

          <button
            onClick={() => sendMessage()}
            disabled={loading || !message.trim()}
            className={`text-white p-2.5 rounded-xl transition ${
              isOnline
                ? "bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400"
                : "bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400"
            }`}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
