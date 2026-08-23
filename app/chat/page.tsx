"use client";

import { useState, useEffect, useRef } from "react";
import {
  Send,
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
  X,
  Hospital,
  Calendar,
  FileText,
  ChevronRight,
  Plus,
  Menu,
  MessageSquare,
  FolderArchive,
  LayoutDashboard
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useNotification } from "@/context/NotificationContext";
import { getOfflineReply, createSession, ConversationSession } from "@/lib/offline/offlineChat";
import { saveOfflineChat, getOfflineChats, deleteOfflineConversation, archiveOfflineConversation } from "@/lib/offlineStorage";
import { checkAndSync } from "@/lib/syncManager";
import { useOnlineStatus } from "@/lib/useOnlineStatus";
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
  selectedSuggestionIndices?: number[];
  emergency?: boolean;
  isStreaming?: boolean;
  actions?: IntegrationAction[];
  uiCard?: {
    type: string;
    data: any;
  };
}

interface Conversation {
  id: string;
  title: string;
  lastMessageAt: Date;
  messages: Message[];
}

interface DBChat {
  message: string;
  reply: string;
  conversationId?: string;
  title?: string;
  createdAt?: string | Date;
}

/* ── Icon map for integration actions ──────────────────────────────────────── */
const ACTION_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
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

/* ── Dynamic Medical Context Title Generator ──────────────────────────────── */
const generateConversationTitle = (messageText: string): string => {
  const text = messageText.toLowerCase();
  
  if (text.includes("headache")) {
    return "Headache Assessment";
  }
  if (text.includes("medicine") || text.includes("pill") || text.includes("tablet") || text.includes("capsule") || text.includes("dawa") || text.includes("syrup") || text.includes("dose") || text.includes("take")) {
    return "Medication Review";
  }
  if (text.includes("report") || text.includes("blood") || text.includes("urine")) {
    return "Blood Report Analysis";
  }
  if (text.includes("appointment") || text.includes("doctor") || text.includes("visit") || text.includes("hospital")) {
    return "Appointment Details";
  }
  if (text.includes("tired") || text.includes("fatigue") || text.includes("sleep") || text.includes("weak")) {
    return "Fatigue Discussion";
  }
  if (text.includes("pain") || text.includes("dard") || text.includes("hurt") || text.includes("ache")) {
    return "Pain Assessment";
  }
  if (text.includes("diet") || text.includes("food") || text.includes("eat") || text.includes("weight") || text.includes("nutrition")) {
    return "Diet & Nutrition";
  }
  if (text.includes("stress") || text.includes("anxiety") || text.includes("depress") || text.includes("mental")) {
    return "Mental Wellness";
  }
  if (text.includes("child") || text.includes("baby") || text.includes("kid")) {
    return "Pediatric Query";
  }
  if (text.includes("vaccine") || text.includes("teeka") || text.includes("shot")) {
    return "Vaccination Info";
  }
  
  // Default fallback: first 3-5 words capitalized
  const words = messageText.trim().split(/\s+/).filter(Boolean);
  if (words.length > 0) {
    const titleWords = words.slice(0, 4).map(w => w.charAt(0).toUpperCase() + w.slice(1));
    return titleWords.join(" ");
  }
  return "New Chat";
};

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

  // ── Conversation & Sidebar State ──────────────────────────────────────────
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archivedConversations, setArchivedConversations] = useState<Conversation[]>([]);
  const [loadingArchived, setLoadingArchived] = useState(false);

  // ── Offline State ──────────────────────────────────────────────────────────
  const isOnline = useOnlineStatus();
  const [syncing, setSyncing] = useState(false);
  const [syncBanner, setSyncBanner] = useState<string | null>(null);

  const offlineSessionRef = useRef<ConversationSession>(createSession());
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  // ── Auto-growing text composer ─────────────────────────────────────────────
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [message]);

  // ── Network Detection & Sync ───────────────────────────────────────────────
  useEffect(() => {
    const handleOnline = async () => {
      setSyncBanner(t("offline.syncSuccess"));
      setSyncing(true);
      try {
        await checkAndSync(user?.email || undefined);
      } finally {
        setSyncing(false);
        setTimeout(() => setSyncBanner(null), 5000);
      }
    };

    const handleSyncComplete = (e: Event) => {
      const result = (e as CustomEvent).detail;
      if (result?.synced > 0) {
        console.log(`[Chat] Synced ${result.synced} offline messages`);
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline-sync-complete", handleSyncComplete);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline-sync-complete", handleSyncComplete);
    };
  }, [user, t]);

  // ── Group chats by conversation ID helper ──────────────────────────────────
  const groupChats = (chats: DBChat[]): Conversation[] => {
    const map: Record<string, Conversation> = {};

    chats.forEach((chat) => {
      const convoId = chat.conversationId || "legacy";
      const convoTitle = chat.title || "Archived Chat";
      const chatDate = new Date(chat.createdAt || Date.now());

      if (!map[convoId]) {
        map[convoId] = {
          id: convoId,
          title: convoTitle,
          lastMessageAt: chatDate,
          messages: [],
        };
      }

      if (chatDate > map[convoId].lastMessageAt) {
        map[convoId].lastMessageAt = chatDate;
      }

      const { cleanText, suggestions } = parseSuggestedReplies(chat.reply);

      map[convoId].messages.push({
        role: "user",
        text: chat.message,
        timestamp: chat.createdAt
          ? new Date(chat.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "",
      });

      map[convoId].messages.push({
        role: "ai",
        text: cleanText,
        timestamp: chat.createdAt
          ? new Date(chat.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "",
        suggestions,
        actions: getIntegrationActions(cleanText),
        emergency: chat.reply.includes("🚨 EMERGENCY") || chat.reply.includes("आपातकाल"),
      });
    });

    return Object.values(map).sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
  };

  // ── Load Conversation History ──────────────────────────────────────────────
  const loadHistory = async (convoIdToActivate?: string) => {
    if (!user?.email) return;

    let loadedChats: DBChat[] = [];

    if (navigator.onLine) {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/chat/history", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({}),
        });

        const data = await res.json();
        if (res.ok && data.chats) {
          loadedChats = data.chats;
        }
      } catch (error) {
        console.error("History fetch error, falling back to local:", error);
      }
    }

    if (loadedChats.length === 0) {
      try {
        const offlineChats = getOfflineChats(user.email);
        loadedChats = offlineChats.map((c) => ({
          message: c.message,
          reply: c.reply,
          conversationId: c.conversationId,
          title: c.title,
          createdAt: new Date(c.timestamp),
        }));
      } catch (err) {
        console.error("Offline history fetch error:", err);
      }
    }

    if (loadedChats.length > 0) {
      const grouped = groupChats(loadedChats);
      setConversations(grouped);

      const targetId = convoIdToActivate || activeConversationId;
      if (targetId) {
        const targetConvo = grouped.find((c) => c.id === targetId);
        if (targetConvo) {
          setActiveConversationId(targetConvo.id);
          setMessages([
            {
              role: "ai",
              text: t("chat.greeting"),
              timestamp: targetConvo.messages[0]?.timestamp || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
            ...targetConvo.messages,
          ]);
        }
      } else {
        setActiveConversationId(null);
        setMessages([
          {
            role: "ai",
            text: t("chat.greeting"),
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } else {
      startNewChat();
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, t]);

  // ── New Chat Creation ──────────────────────────────────────────────────────
  const startNewChat = () => {
    setActiveConversationId(null);
    setMessages([
      {
        role: "ai",
        text: t("chat.greeting"),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  // ── Load A Past Conversation ───────────────────────────────────────────────
  const loadPastConversation = (convo: Conversation) => {
    setActiveConversationId(convo.id);
    setMessages([
      {
        role: "ai",
        text: t("chat.greeting"),
        timestamp: convo.messages[0]?.timestamp || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
      ...convo.messages,
    ]);
    setSidebarOpen(false);
  };

  const archiveConversation = async (conversationId: string, isArchived: boolean = true) => {
    if (isArchived && !confirm("Are you sure you want to archive this conversation?")) return;

    try {
      // Archive from local storage cache & sync queue
      if (user?.email) {
        archiveOfflineConversation(user.email, conversationId, isArchived);
      }

      if (navigator.onLine) {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/chat/history?conversationId=${conversationId}&archive=${isArchived}`, {
          method: "PUT",
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || "Failed to archive on server");
        }
      }

      if (isArchived) {
        // Remove from UI state
        setConversations((prev) => prev.filter((c) => c.id !== conversationId));

        // Reset to new chat if we archived the active one
        if (activeConversationId === conversationId) {
          startNewChat();
        }

        addNotification(
          "message",
          "Conversation Archived",
          "The conversation has been archived."
        );
      } else {
        // Restoring
        addNotification(
          "message",
          "Conversation Restored",
          "The conversation has been restored."
        );
        // Reload history so it comes back to the sidebar list
        loadHistory();
      }
    } catch (err: any) {
      console.error("Archive conversation error:", err);
      alert(`Error: ${err.message || "Failed to update archive status"}`);
      loadHistory();
    }
  };

  const deleteConversationPermanently = async (conversationId: string) => {
    if (!confirm("Are you sure you want to PERMANENTLY delete this conversation? This action cannot be undone.")) return;

    try {
      if (navigator.onLine) {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/chat/history?conversationId=${conversationId}`, {
          method: "DELETE",
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || "Failed to delete from server");
        }
      }

      // Deletion from local storage cache & sync queue
      if (user?.email) {
        deleteOfflineConversation(user.email, conversationId);
      }

      // Remove from archived state list
      setArchivedConversations((prev) => prev.filter((c) => c.id !== conversationId));

      // Remove from normal conversations list (just in case)
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));

      // Reset to new chat if we deleted the active one
      if (activeConversationId === conversationId) {
        startNewChat();
      }

      addNotification(
        "message",
        "Conversation Deleted",
        "The conversation was permanently deleted."
      );
    } catch (err: any) {
      console.error("Permanent delete error:", err);
      alert(`Error: ${err.message || "Failed to delete conversation"}`);
    }
  };

  const loadArchivedConversations = async () => {
    if (!user?.email) return;
    setLoadingArchived(true);
    try {
      let loadedChats: DBChat[] = [];
      if (navigator.onLine) {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/chat/history", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({ archived: true }),
        });
        const data = await res.json();
        if (res.ok && data.chats) {
          loadedChats = data.chats;
        }
      } else {
        const offlineChats = getOfflineChats(user.email);
        loadedChats = offlineChats
          .filter((c) => c.isArchived === true)
          .map((c) => ({
            message: c.message,
            reply: c.reply,
            conversationId: c.conversationId,
            title: c.title,
            createdAt: new Date(c.timestamp),
          }));
      }
      const grouped = groupChats(loadedChats);
      setArchivedConversations(grouped);
    } catch (err) {
      console.error("Failed to load archived conversations:", err);
    } finally {
      setLoadingArchived(false);
    }
  };

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
          
          // If current conversation already has history, start a new chat first
          if (messages.length > 1) {
            startNewChat();
          }
          
          setTimeout(() => sendMessage(reportMsg, reportCtx), 600);
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
      .replace(/[^\p{L}\p{N}\s.,!?-]/gu, "")
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

    const isAtBottom =
      chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 250;

    const lastMessage = messages[messages.length - 1];
    const userJustSent = lastMessage?.role === "user";

    if (isAtBottom || userJustSent) {
      chatEndRef.current?.scrollIntoView({ behavior: userJustSent ? "smooth" : "auto" });
    }
  }, [messages]);

  // VOICE INPUT (STT)
  const startListening = () => {
    const SpeechRecognition =
      (window as Window & { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as Window & { SpeechRecognition?: any; webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(t("chatExt.speechNotSupp"));
      return;
    }

    try {
      const recognition = new (SpeechRecognition as any)();
      recognition.lang = speechLang;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setListening(true);
      recognition.start();

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setListening(false);
      };

      recognition.onerror = () => {
        setListening(false);
      };

      recognition.onend = () => {
        setListening(false);
      };
    } catch {
      setListening(false);
    }
  };

// SEND MESSAGE — streaming support
  async function sendMessage(textOverride?: string, reportCtx?: string, suppressHistory: boolean = false) {
    const userText = textOverride || message;
    if (!userText.trim() || loading) return;

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Append user message
    const updatedMessages = [
      ...messages,
      { role: "user" as const, text: userText, timestamp: now },
    ];
    setMessages(updatedMessages);
    setMessage("");
    setLoading(true);
    setStreaming(true);

    // Add streaming AI message placeholder
    const aiMessageIndex = updatedMessages.length;
    setMessages((prev) => [
      ...prev,
      {
        role: "ai",
        text: "",
        timestamp: now,
        isStreaming: true,
      },
    ]);

    let targetConvoId = activeConversationId;
    let convoTitle = "";
    if (!targetConvoId) {
      targetConvoId = `convo_${Date.now()}`;
      setActiveConversationId(targetConvoId);
      convoTitle = generateConversationTitle(userText);
    } else {
      const activeConvo = conversations.find((c) => c.id === targetConvoId);
      convoTitle = activeConvo?.title || "Health Query";
    }

    try {
      if (isOnline) {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({
            message: userText,
            language: language,
            history: messages.slice(-10),
            reportContext: reportCtx,
            conversationId: targetConvoId,
            title: convoTitle,
          }),
        });

        if (res.status === 401) {
          setMessages((prev) => {
            const updated = [...prev];
            updated[aiMessageIndex] = {
              role: "ai",
              text: "Your session has expired. Please log in again to continue.",
              timestamp: now,
              isStreaming: false,
            };
            return updated;
          });
          return;
        }

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const errMsg = data.message || `Server error (${res.status}). Please try again shortly.`;
          throw new Error(errMsg);
        }

        const contentType = res.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
          const data = await res.json();

          const { cleanText, suggestions } = parseSuggestedReplies(data.reply || "");
          setMessages((prev) => {
            const updated = [...prev];
            updated[aiMessageIndex] = {
              role: "ai",
              text: cleanText,
              timestamp: now,
              suggestions: data.suggestions || suggestions,
              emergency: !!data.emergency,
              uiCard: data.uiCard,
              actions: getIntegrationActions(cleanText),
              isStreaming: false,
            };
            return updated;
          });
          if (data.emergency) {
            addNotification(
              "emergency",
              "Emergency Symptom Alert",
              "Urgent symptoms detected. Review emergency care details immediately."
            );
          }
          if (!suppressHistory) setTimeout(() => loadHistory(targetConvoId), 500);
        } else {
          const reader = res.body!.getReader();
          const decoder = new TextDecoder();
          let accumulated = "";

          // eslint-disable-next-line no-constant-condition
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            accumulated += chunk;
            
            const { cleanText, suggestions } = parseSuggestedReplies(accumulated);

            setMessages((prev) => {
              const updated = [...prev];
              if (updated[aiMessageIndex]) {
                updated[aiMessageIndex] = {
                  ...updated[aiMessageIndex],
                  text: cleanText,
                  suggestions: suggestions,
                  isStreaming: true,
                };
              }
              return updated;
            });
          }

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
          if (!suppressHistory) setTimeout(() => loadHistory(targetConvoId), 500);
        }
      } else {
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
          saveOfflineChat(user.email, userText, cleanText, targetConvoId, convoTitle);
        }
        if (!suppressHistory) setTimeout(() => loadHistory(targetConvoId), 500);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => prev.slice(0, -1));

      const isActuallyOnline = typeof navigator !== "undefined" ? navigator.onLine : isOnline;
      const errMsg = error instanceof Error ? error.message : "Server is temporarily unavailable. Please try again.";

      if (isActuallyOnline) {
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            text: errMsg,
            timestamp: now,
            isStreaming: false,
          },
        ]);
      } else {
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
            saveOfflineChat(user.email, userText, cleanText, targetConvoId, convoTitle);
          }
          if (!suppressHistory) setTimeout(() => loadHistory(targetConvoId), 500);
        } catch {
          setMessages((prev) => [
            ...prev,
            {
              role: "ai",
              text: t("chat.emergencyWarning"),
              timestamp: now,
              isStreaming: false,
            },
          ]);
        }
      }
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  }

  const copyMessage = (text: string, index: number) => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // HANDLE SUGGESTION CLICK — marks suggestion as selected and sends it without reloading history
  function handleSuggestionClick(msgIdx: number, sIdx: number, suggestion: string) {
    // Update message to record selected suggestion index
    setMessages((prev) => {
      const updated = [...prev];
      const msg = updated[msgIdx];
      if (!msg) return prev;
      const selected = msg.selectedSuggestionIndices ?? [];
      if (!selected.includes(sIdx)) {
        msg.selectedSuggestionIndices = [...selected, sIdx];
      }
      return updated;
    });
    // Send the suggestion as a user message; suppress automatic history reload to keep UI state
    sendMessage(suggestion, undefined, true);
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

  // Group conversations into Today, Yesterday, Last 7 Days, Older
  const getGroupedConversations = () => {
    const today: Conversation[] = [];
    const yesterday: Conversation[] = [];
    const last7Days: Conversation[] = [];
    const older: Conversation[] = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
    const startOf7DaysAgo = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);

    conversations.forEach((convo) => {
      const d = convo.lastMessageAt;
      if (d >= startOfToday) {
        today.push(convo);
      } else if (d >= startOfYesterday) {
        yesterday.push(convo);
      } else if (d >= startOf7DaysAgo) {
        last7Days.push(convo);
      } else {
        older.push(convo);
      }
    });

    return [
      { title: "Today", items: today },
      { title: "Yesterday", items: yesterday },
      { title: "Previous 7 Days", items: last7Days },
      { title: "Older", items: older },
    ].filter((group) => group.items.length > 0);
  };

  const showEmptyState = messages.length <= 1 && !loading;

  // ── Render Sidebar Items ───────────────────────────────────────────────────
  const renderSidebarContent = () => (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-150 dark:border-gray-800 shrink-0">
        <button
          onClick={startNewChat}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 px-4 text-sm font-semibold transition shadow-sm hover:shadow"
        >
          <Plus size={16} />
          New Chat
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {conversations.length > 0 ? (
          getGroupedConversations().map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              <h3 className="px-3 pt-2 pb-1 text-[11px] font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase">
                {group.title}
              </h3>
              {group.items.map((convo) => {
                const isActive = convo.id === activeConversationId;
                return (
                  <div
                    key={convo.id}
                    className={`group w-full flex items-center justify-between rounded-xl transition text-sm font-medium ${
                      isActive
                        ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-l-4 border-blue-600"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-850"
                    }`}
                  >
                    <button
                      onClick={() => loadPastConversation(convo)}
                      className="flex-1 text-left flex items-center gap-3 px-3 py-3 truncate min-w-0"
                    >
                      <MessageSquare size={16} className={isActive ? "text-blue-600" : "text-gray-400"} />
                      <span className="truncate">{convo.title}</span>
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        archiveConversation(convo.id, true);
                      }}
                      className="p-1.5 mr-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-400 hover:text-red-650 dark:hover:text-red-400 transition opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
                      title="Archive Conversation"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          ))
        ) : (
          <div className="text-center py-10">
            <MessageSquare className="mx-auto text-gray-300 dark:text-gray-700 mb-2" size={32} />
            <p className="text-xs text-gray-400 dark:text-gray-500">No chat history</p>
          </div>
        )}
      </div>

      {/* Navigation & Archived Chats Trigger Button */}
      <div className="p-3 border-t border-gray-150 dark:border-gray-800 shrink-0 space-y-2">
        <button
          onClick={() => router.push("/dashboard")}
          className="w-full flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 py-2.5 px-4 rounded-xl text-xs font-bold transition border border-blue-200 dark:border-blue-800"
        >
          <LayoutDashboard size={14} className="text-blue-600 dark:text-blue-400" />
          Go to Main Dashboard
        </button>

        <button
          onClick={() => {
            setIsArchiveModalOpen(true);
            loadArchivedConversations();
          }}
          className="w-full flex items-center justify-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-250 py-2.5 px-4 rounded-xl text-xs font-semibold transition border border-gray-150 dark:border-gray-800"
        >
          <FolderArchive size={14} className="text-gray-400" />
          Archived Conversations
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* VOICE POPUP */}
      {voiceOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-10 text-center shadow-2xl fade-in-up max-w-sm mx-4">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center pulse-ring">
              <Mic size={40} className="text-white" />
            </div>
            <h2 className="text-xl font-bold mt-6 dark:text-white">
              {t("chat.listening")}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">{t("chat.micHint")}</p>
            <button
              onClick={() => { setVoiceOpen(false); setListening(false); }}
              className="mt-6 bg-red-500 text-white px-6 py-2.5 rounded-xl hover:bg-red-600 transition font-medium text-sm w-full"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-72 border-r border-gray-150 dark:border-gray-800 bg-white dark:bg-gray-900 h-[100dvh] shrink-0">
        <div className="p-4 border-b border-gray-150 dark:border-gray-800 flex items-center gap-3 bg-white dark:bg-gray-900 shrink-0">
          <div className="bg-blue-600 text-white p-2 rounded-xl">
            <HeartPulse size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-800 dark:text-white leading-none">AarogyaMitra AI</h2>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">Conversations list</span>
          </div>
        </div>
        {renderSidebarContent()}
      </aside>

      {/* MOBILE DRAWER OVERLAY & SIDEBAR */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed top-0 left-0 bottom-0 z-50 w-72 bg-white dark:bg-gray-900 shadow-2xl flex flex-col transition-transform duration-300 transform translate-x-0 md:hidden">
            <div className="p-4 border-b border-gray-150 dark:border-gray-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="bg-blue-600 text-white p-2 rounded-xl">
                  <HeartPulse size={18} />
                </div>
                <h2 className="text-sm font-bold text-gray-800 dark:text-white">AarogyaMitra AI</h2>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-855 text-gray-500 transition"
              >
                <X size={18} />
              </button>
            </div>
            {renderSidebarContent()}
          </aside>
        </>
      )}

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col h-[100dvh] max-h-[100dvh] overflow-hidden min-w-0 bg-gray-50 dark:bg-gray-950">
        {/* OFFLINE BANNER */}
        {!isOnline && (
          <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-xs font-semibold shrink-0">
            <div className="flex items-center gap-1.5">
              <WifiOff size={14} />
              <span>{t("offline.banner")}</span>
            </div>
            <span className="text-amber-100 bg-amber-600 px-2 py-0.5 rounded-full text-[10px]">
              {t("offline.offlineLabel")}
            </span>
          </div>
        )}

        {/* SYNC BANNER */}
        {syncBanner && (
          <div className="bg-green-600 text-white px-4 py-2 flex items-center gap-1.5 text-xs font-semibold shrink-0">
            {syncing ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Wifi size={14} />
            )}
            <span>{syncBanner}</span>
          </div>
        )}

        {/* HEADER */}
        <div
          className={`px-4 py-3 flex items-center justify-between shadow-sm shrink-0 border-b border-gray-100 dark:border-gray-855 text-white ${
            isOnline
              ? "bg-gradient-to-r from-blue-700 via-blue-600 to-teal-600"
              : "bg-gradient-to-r from-gray-700 to-gray-600"
          }`}
        >
          <div className="flex items-center gap-2.5 font-sans">
            <button
              onClick={() => router.push("/dashboard")}
              className="bg-white/20 p-2 rounded-xl hover:bg-white/30 transition text-white"
              title="Go to Dashboard"
            >
              <ArrowLeft size={18} />
            </button>

            {/* Mobile Sidebar Toggle Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden bg-white/20 p-2 rounded-xl hover:bg-white/30 transition text-white"
              title="Open History"
            >
              <Menu size={18} />
            </button>

            <div className="bg-white/20 p-2 rounded-xl">
              <HeartPulse size={20} />
            </div>

            <div>
              <h1 className="text-base sm:text-lg font-bold leading-tight">{t("chat.title")}</h1>
              <div className="flex items-center gap-1.5">
                <p className="text-blue-100 text-[10px] sm:text-xs">{t("chat.subtitle")}</p>
                {!isOnline && (
                  <span className="flex items-center gap-0.5 text-amber-300 text-[9px] bg-amber-900/40 px-1.5 py-0.5 rounded-full">
                    <WifiOff size={8} />
                    {t("offline.mode")}
                  </span>
                )}
                {isOnline && (
                  <span className="flex items-center gap-1 text-green-200 text-[9px] bg-green-900/40 px-1.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    Doctor Online
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={clearChat}
              className="bg-white/20 p-2 rounded-xl hover:bg-white/30 transition text-white"
              title={t("chat.clearHistory")}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* CHAT MESSAGES SCROLL WRAPPER */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6 space-y-6">
          <div className="w-full max-w-3xl mx-auto flex flex-col gap-6">
            {messages.map((msg, index) => {
              const isLast = index === messages.length - 1;
              const isAi = msg.role === "ai";

              return (
                <div
                  key={index}
                  className={`flex gap-3 items-start w-full ${
                    isAi ? "justify-start" : "justify-end"
                  }`}
                >
                  {/* AI Logo Avatar */}
                  {isAi && (
                    <div className={`mt-0.5 shrink-0 p-2 rounded-xl shadow-sm border ${
                      msg.isStreaming && isLast
                        ? "bg-blue-50 dark:bg-blue-900/50 border-blue-150 dark:border-blue-900 text-blue-600 dark:text-blue-400 animate-pulse"
                        : msg.emergency
                        ? "bg-red-50 dark:bg-red-950/40 border-red-150 dark:border-red-900 text-red-600 dark:text-red-400"
                        : isOnline
                        ? "bg-gradient-to-br from-blue-50 to-teal-50 dark:from-blue-950/40 dark:to-teal-950/40 border-blue-100 dark:border-blue-900/30 text-blue-600 dark:text-blue-400"
                        : "bg-amber-50 dark:bg-amber-950/40 border-amber-150 dark:border-amber-900 text-amber-600 dark:text-amber-400"
                    }`}>
                      <HeartPulse size={18} />
                    </div>
                  )}

                  <div className={`flex flex-col min-w-0 max-w-[85%] sm:max-w-2xl ${
                    isAi ? "items-start" : "items-end"
                  }`}>
                    {/* Message Bubble */}
                    <div
                      className={`p-4 text-sm sm:text-base leading-relaxed ${
                        !isAi
                          ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl rounded-tr-sm shadow-sm"
                          : msg.emergency
                          ? "bg-red-50/70 dark:bg-red-950/20 text-gray-800 dark:text-gray-150 shadow-sm border border-red-200 dark:border-red-800/80 rounded-2xl rounded-tl-sm emergency-pulse"
                          : "bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 shadow-sm border border-gray-150 dark:border-gray-800 rounded-2xl rounded-tl-sm"
                      } ${msg.isStreaming && isLast ? "streaming-cursor" : ""}`}
                    >
                      {isAi ? (
                        msg.text ? (
                          <div
                            className="prose prose-sm dark:prose-invert max-w-none text-sm sm:text-base leading-relaxed"
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
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      )}
                    </div>

                    {/* Timestamp + Actions */}
                    <div className="flex items-center gap-2 mt-1.5">
                      {msg.timestamp && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                          {msg.timestamp}
                        </span>
                      )}
                      {isAi && !msg.isStreaming && msg.text && (
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => copyMessage(msg.text, index)}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
                            title="Copy"
                          >
                            {copiedIndex === index ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                          </button>
                          <button
                            onClick={() => speakReply(msg.text)}
                            className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition ${
                              isSpeaking ? "text-red-500 hover:text-red-700" : (isOnline ? "text-blue-500 hover:text-blue-700" : "text-amber-500 hover:text-amber-700")
                            }`}
                            title={isSpeaking ? "Stop Speaking" : t("chat.speakReply")}
                          >
                            {isSpeaking ? <Square fill="currentColor" size={12} /> : <Volume2 size={12} />}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* ACTION UI CARDS */}
                    {isAi && msg.uiCard && !msg.isStreaming && (
                      <div className="mt-3 w-full bg-white dark:bg-gray-900 border border-blue-100 dark:border-blue-900/50 rounded-2xl p-4 shadow-sm text-xs sm:text-sm">
                        {msg.uiCard.type === "bmi" && (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2 font-semibold text-blue-700 dark:text-blue-400">
                              <span>📊 BMI Metric Summary</span>
                              <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                                {msg.uiCard.data.category}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center pt-1">
                              <div className="bg-gray-50 dark:bg-gray-800 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                                <span className="text-[10px] text-gray-400 block font-medium">Height</span>
                                <span className="font-bold text-gray-800 dark:text-gray-200">{msg.uiCard.data.heightCm} cm</span>
                              </div>
                              <div className="bg-gray-50 dark:bg-gray-800 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                                <span className="text-[10px] text-gray-400 block font-medium">Weight</span>
                                <span className="font-bold text-gray-800 dark:text-gray-200">{msg.uiCard.data.weightKg} kg</span>
                              </div>
                              <div className="bg-blue-50/70 dark:bg-blue-950/50 p-2.5 rounded-xl border border-blue-200 dark:border-blue-900/60">
                                <span className="text-[10px] text-blue-600 dark:text-blue-400 block font-semibold">BMI Index</span>
                                <span className="font-extrabold text-blue-700 dark:text-blue-300">{msg.uiCard.data.bmi}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* SUGGESTED REPLIES */}
  {isAi && msg.suggestions && msg.suggestions.length > 0 && !msg.isStreaming && (
    <div className="flex flex-wrap gap-1.5 mt-3 chat-extra-fade">
      {msg.suggestions.map((suggestion, sIdx) => (
        <button
          key={sIdx}
          onClick={() => handleSuggestionClick(index, sIdx, suggestion)}
          disabled={msg.selectedSuggestionIndices?.includes(sIdx)}
          className={`suggestion-chip bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/30 border border-blue-100 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-full text-xs font-semibold transition ${msg.selectedSuggestionIndices?.includes(sIdx) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {suggestion}
        </button>
      ))}
    </div>
  )}

                    {/* INTEGRATION ACTION BUTTONS */}
                    {isAi && msg.actions && msg.actions.length > 0 && !msg.isStreaming && (
                      <div className="flex flex-wrap gap-1.5 mt-3 chat-extra-fade">
                        {msg.actions.map((action, aIdx) => {
                          const Icon = ACTION_ICONS[action.icon] || Activity;
                          return (
                            <button
                              key={aIdx}
                              onClick={() => router.push(action.link)}
                              className="integration-btn flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 px-3.5 py-1.5 rounded-xl text-xs font-semibold hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition shadow-sm"
                            >
                              <Icon size={12} className="text-blue-600" />
                              {action.label}
                              <ChevronRight size={10} className="text-gray-400" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing indicator when loading but not yet streaming */}
            {loading && !streaming && (
              <div className="flex gap-3 items-start w-full justify-start">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 animate-pulse shrink-0">
                  <HeartPulse size={18} />
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl rounded-tl-sm p-4 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                    <span className="typing-dot"></span>
                  </div>
                </div>
              </div>
            )}

            {/* EMPTY CHAT WELCOME STATE */}
            {showEmptyState && (
              <div className="flex flex-col items-center justify-center text-center px-4 max-w-lg mx-auto py-8 sm:py-16">
                <div className="bg-gradient-to-br from-blue-600 to-teal-500 text-white p-4.5 rounded-3xl shadow-lg mb-6 transform hover:scale-105 transition-all duration-300">
                  <HeartPulse size={36} className="text-white" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-800 dark:text-white leading-tight">
                  {t("chat.title")}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-3 text-xs sm:text-sm leading-relaxed max-w-md">
                  {t("chat.subtitle") || "Your personal AI Doctor. Ask me anything about symptoms, drugs, dosage, or general health tips."}
                </p>

                {/* Quick actions inside empty state */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 w-full">
                  {QUICK_ACTIONS.map((action, idx) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => sendMessage(action.prompt)}
                        className="flex items-center gap-3 bg-white dark:bg-gray-900 hover:bg-blue-50/50 dark:hover:bg-gray-850 border border-gray-200 dark:border-gray-800 p-3 rounded-2xl text-left text-xs font-semibold text-gray-700 dark:text-gray-300 transition shadow-sm hover:border-blue-400 dark:hover:border-blue-700"
                      >
                        <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
                          <Icon size={14} />
                        </div>
                        <span className="truncate">{action.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Spacer for bottom composer */}
            <div className="h-32 shrink-0" />
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* INPUT COMPOSER CONTAINER */}
        <div className="absolute bottom-0 left-0 right-0 md:left-auto md:right-0 md:w-[calc(100%-18rem)] p-3 sm:p-4 bg-gradient-to-t from-gray-50 via-gray-50/95 to-transparent dark:from-gray-950 dark:via-gray-950/95 dark:to-transparent shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2.5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-850 p-2 sm:p-3 shadow-md">
              <textarea
                ref={textareaRef}
                rows={1}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={listening ? t("chat.listening") : t("chat.placeholder")}
                className="flex-1 bg-transparent outline-none resize-none px-2 py-2 dark:text-white text-sm sm:text-base max-h-40 overflow-y-auto"
              />

              <div className="flex items-center gap-1.5 pb-1">
                <button
                  onClick={startListening}
                  disabled={loading}
                  className="text-green-600 hover:scale-110 transition p-2 rounded-xl hover:bg-green-50 dark:hover:bg-green-950/40 shrink-0"
                  title={t("chat.micTitle")}
                >
                  <Mic size={20} />
                </button>

                <button
                  onClick={() => sendMessage()}
                  disabled={loading || !message.trim()}
                  className={`p-2.5 rounded-xl transition shrink-0 text-white ${
                    isOnline
                      ? "bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400"
                      : "bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400"
                  }`}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ARCHIVED CHATS MODAL */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-2xl w-full max-w-md mx-4 border border-gray-150 dark:border-gray-800 flex flex-col max-h-[75vh]">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <div className="flex items-center gap-2">
                <FolderArchive size={20} className="text-blue-600" />
                <h2 className="text-base font-bold text-gray-800 dark:text-white">
                  Archived Conversations
                </h2>
              </div>
              <button
                onClick={() => setIsArchiveModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-855 text-gray-500 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {loadingArchived ? (
                <div className="flex items-center justify-center py-10 gap-2">
                  <RefreshCw size={16} className="animate-spin text-blue-600" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Loading archives...</span>
                </div>
              ) : archivedConversations.length > 0 ? (
                archivedConversations.map((convo) => (
                  <div
                    key={convo.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800/60"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-250 truncate">
                        {convo.title}
                      </h4>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                        {new Date(convo.lastMessageAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => archiveConversation(convo.id, false)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition"
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => deleteConversationPermanently(convo.id)}
                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-400 hover:text-red-650 dark:hover:text-red-400 transition"
                        title="Delete Permanently"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <FolderArchive size={28} className="mx-auto text-gray-300 dark:text-gray-700 mb-2" />
                  <p className="text-xs text-gray-400 dark:text-gray-500">No archived conversations</p>
                </div>
              )}
            </div>
            
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 shrink-0">
              <button
                onClick={() => setIsArchiveModalOpen(false)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
