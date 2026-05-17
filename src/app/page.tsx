"use client";

import { useState, useRef, useEffect } from "react";
import {
  Brain,
  UploadCloud,
  Loader2,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Send,
  Moon,
  Sun,
  Menu,
  X,
} from "lucide-react";

export default function Home() {
  // Theme & Layout State
  const [mounted, setMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Upload State
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");

  // Chat State
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);

  // Auto-scroll reference
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isChatting]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadStatus("");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setUploadStatus("Processing document and generating vectors...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setUploadStatus(`Success! ${data.message}`);
        // Auto-close mobile menu on successful upload
        setTimeout(() => setIsMobileMenuOpen(false), 1500);
      } else {
        setUploadStatus(`Error: ${data.error}`);
      }
    } catch (error) {
      setUploadStatus("Failed to upload document.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isChatting) return;

    const userMessage = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsChatting(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.answer },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${data.error}` },
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Failed to connect to the server." },
      ]);
    } finally {
      setIsChatting(false);
    }
  };

  if (!mounted) {
    return null; // Prevents the server and client from mismatching
  }

  return (
    // Outer Theme Wrapper
    <div className={isDarkMode ? "dark" : ""}>
      <div className="min-h-[100dvh] bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 font-sans selection:bg-indigo-200 dark:selection:bg-indigo-900 transition-colors duration-300 md:p-8 flex items-center justify-center">
        {/* Main Application Container */}
        <div className="w-full h-[100dvh] md:h-[85vh] md:min-h-[600px] max-w-6xl bg-white dark:bg-zinc-900 md:shadow-2xl shadow-slate-200/50 dark:shadow-none md:rounded-3xl overflow-hidden flex relative border-0 md:border border-slate-100 dark:border-zinc-800 transition-colors duration-300">
          {/* Mobile Menu Backdrop */}
          {isMobileMenuOpen && (
            <div
              className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}

          {/* LEFT PANEL: Sidebar & Upload (Responsive Drawer) */}
          <div
            className={`
            absolute inset-y-0 left-0 z-50 w-80 bg-slate-50 dark:bg-zinc-900/50 border-r border-slate-200 dark:border-zinc-800 flex flex-col transform transition-transform duration-300 ease-in-out
            md:relative md:translate-x-0
            ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
          `}
          >
            {/* Brand Header */}
            <div className="p-6 border-b border-slate-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 dark:bg-indigo-500 p-2 rounded-xl shadow-sm shadow-indigo-200 dark:shadow-none">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    DocuMind
                  </h1>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium uppercase tracking-wider">
                    Enterprise RAG
                  </p>
                </div>
              </div>
              {/* Close button for mobile */}
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="md:hidden p-2 text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Upload Section */}
            <div className="p-6 flex-1 flex flex-col overflow-y-auto">
              <h2 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-4">
                Knowledge Base
              </h2>

              <div className="relative group mb-4">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div
                  className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all duration-200
                  ${
                    file
                      ? "border-indigo-400 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-500/10"
                      : "border-slate-300 bg-white group-hover:border-indigo-300 dark:border-zinc-700 dark:bg-zinc-900 dark:group-hover:border-zinc-500"
                  }`}
                >
                  <UploadCloud
                    className={`w-8 h-8 mb-3 transition-colors ${file ? "text-indigo-500 dark:text-indigo-400" : "text-slate-400 dark:text-zinc-500"}`}
                  />
                  <p className="text-sm font-semibold text-slate-700 dark:text-zinc-300">
                    {file ? file.name : "Select PDF Document"}
                  </p>
                  {!file && (
                    <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">
                      Drag & drop or tap to browse
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className=" cursor-pointer w-full bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold py-3 px-4 rounded-xl hover:bg-slate-800 dark:hover:bg-white active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600 disabled:scale-100 transition-all flex justify-center items-center gap-2 shadow-sm"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4" />
                    Indexing...
                  </>
                ) : (
                  "Upload & Process"
                )}
              </button>

              {uploadStatus && (
                <div
                  className={`p-4 text-sm rounded-xl mt-4 flex items-start gap-3 transition-all ${
                    uploadStatus.includes("Success")
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400"
                      : uploadStatus.includes("Error") ||
                          uploadStatus.includes("Failed")
                        ? "bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400"
                        : "bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400"
                  }`}
                >
                  {uploadStatus.includes("Success") && (
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                  )}
                  {(uploadStatus.includes("Error") ||
                    uploadStatus.includes("Failed")) && (
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-relaxed">{uploadStatus}</span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: Chat Interface */}
          <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950 min-w-0 relative">
            {/* Chat Header */}
            <div className="h-16 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between px-4 md:px-6 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm z-10 shrink-0">
              <div className="flex items-center gap-3">
                {/* Mobile Menu Toggle */}
                <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
                >
                  <Menu className="w-5 h-5" />
                </button>

                {/* Database Status Indicator */}
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${uploadStatus.includes("Success") ? "bg-emerald-400" : "bg-amber-400"}`}
                    ></span>
                    <span
                      className={`relative inline-flex rounded-full h-2.5 w-2.5 ${uploadStatus.includes("Success") ? "bg-emerald-500" : "bg-amber-500"}`}
                    ></span>
                  </span>
                  <span className="text-sm font-medium text-slate-600 dark:text-zinc-400 hidden sm:inline-block">
                    {uploadStatus.includes("Success")
                      ? "Database Ready"
                      : "Awaiting Document"}
                  </span>
                </div>
              </div>

              {/* Theme Toggle Button */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className=" cursor-pointer p-2.5 rounded-full bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors"
                aria-label="Toggle Dark Mode"
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-6">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-4 px-4">
                  <div className="bg-slate-50 dark:bg-zinc-900 p-4 rounded-full">
                    <MessageSquare className="w-8 h-8 text-slate-400 dark:text-zinc-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-zinc-200">
                    How can I help?
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-zinc-400">
                    Upload a document to the knowledge base, and I'll answer
                    questions using strictly the provided context.
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[90%] md:max-w-[75%] rounded-2xl p-4 text-[15px] leading-relaxed shadow-sm ${
                        msg.role === "user"
                          ? "bg-indigo-600 text-white rounded-tr-sm"
                          : "bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 rounded-tl-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))
              )}

              {/* Loading Indicator */}
              {isChatting && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl rounded-tl-sm p-4 shadow-sm flex gap-1.5 items-center h-12">
                    <span
                      className="w-2 h-2 bg-slate-400 dark:bg-zinc-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    ></span>
                    <span
                      className="w-2 h-2 bg-slate-400 dark:bg-zinc-500 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    ></span>
                    <span
                      className="w-2 h-2 bg-slate-400 dark:bg-zinc-500 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    ></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-1 shrink-0" />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-zinc-950 border-t border-slate-100 dark:border-zinc-800 shrink-0">
              <form
                onSubmit={handleChatSubmit}
                className="max-w-4xl mx-auto relative group flex items-center gap-2 md:gap-3"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything..."
                  disabled={isChatting || !uploadStatus.includes("Success")}
                  className="flex-1 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 rounded-xl pl-4 pr-4 py-3 md:py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed text-[15px]"
                />
                <button
                  type="submit"
                  disabled={
                    !input.trim() ||
                    isChatting ||
                    !uploadStatus.includes("Success")
                  }
                  className="cursor-pointer h-[48px] md:h-[54px] px-4 md:px-6 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600 disabled:scale-100 transition-all flex items-center justify-center gap-2 shadow-sm shrink-0"
                >
                  <span className="hidden sm:inline">Send</span>
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
