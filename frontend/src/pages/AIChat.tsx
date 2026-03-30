import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Box,
  Button,
  IconButton,
  InputBase,
  Typography,
} from "@mui/material";
import ArrowOutwardOutlinedIcon from "@mui/icons-material/ArrowOutwardOutlined";
import { ButtonBase, Stack } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CircularProgress from "@mui/material/CircularProgress";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import NavBar from "../components/NavBar";
import { LightboxZoomImage } from "../components/LightboxZoomImage";

// ----------------------
// Types
// ----------------------
type DisplayMessage =
  | { type: "user"; content: string }
  | { type: "text"; content: string }
  | { type: "image"; content: string };

type HistoryItem = { role: "user" | "assistant"; content: string };

type BackendResponse = {
  messages?: Array<{ type: "text" | "image"; content: string }>;
  history?: HistoryItem[];
};



// ----------------------
// Config
// ----------------------
const TEST_MODE = false;

// API base from root .env (VITE_API_BASE). Empty = same origin (nginx → :8000). Set e.g. http://localhost:8000 for local server.
const BASEURL = "";
const AI_CHAT_URL = `${BASEURL}/chat`;

const LS_OPENAI = "openai-history";
const LS_DISPLAY = "display-history";

const THINK_GRAY = "#9A9A9A";     // lighter than your current
const THINK_GRAY_2 = "#B5B5B5";   // even lighter for subtext
const SPINNER_COLOR = "#A8A8A8";

const dashedSpinnerSx = {
  color: SPINNER_COLOR,
  "& .MuiCircularProgress-circle": {
    strokeDasharray: "2 4",
    strokeLinecap: "butt",
  },
};

export default function AIChat() {
  const location = useLocation();
  const initialInput = useMemo(() => {
    const s = (location.state as { chatInput?: unknown } | null)?.chatInput;
    return typeof s === "string" ? s : "";
  }, [location.state]);

  const [messages, setMessages] = useState<DisplayMessage[]>(() => {
    const stored = localStorage.getItem(LS_DISPLAY);
    if (stored) {
      try {
        return JSON.parse(stored) as DisplayMessage[];
      } catch {
        return [];
      }
    }
    return initialInput ? [{ type: "user", content: initialInput }] : [];
  });

  const [input, setInput] = useState<string>("");
  const [waiting, setWaiting] = useState<boolean>(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const clearHistory = () => {
    if (waiting) return;
    localStorage.setItem(LS_OPENAI, JSON.stringify([]));
    localStorage.setItem(LS_DISPLAY, JSON.stringify([]));
    setMessages([]);
  };

  const simulateBackendResponse = async (content: string): Promise<BackendResponse> => {
    await new Promise((r) => setTimeout(r, 700));
    if (content.toLowerCase().includes("image") || content.toLowerCase().includes("png")) {
      return {
        messages: [
          { type: "text", content: "Here is the image you requested:" },
          { type: "image", content: "https://via.placeholder.com/512.png?text=Example" },
        ],
        history: JSON.parse(localStorage.getItem(LS_OPENAI) || "[]"),
      };
    }
    return {
      messages: [{ type: "text", content: `Test response: "${content}"` }],
      history: JSON.parse(localStorage.getItem(LS_OPENAI) || "[]"),
    };
  };

  const sendMessage = async (content: string) => {
    if (waiting) return;

    const trimmed = content.trim();
    if (!trimmed) return;

    setWaiting(true);

    const userMsg: DisplayMessage = { type: "user", content: trimmed };

    const openaiHistory: HistoryItem[] = [
      ...(JSON.parse(localStorage.getItem(LS_OPENAI) || "[]") as HistoryItem[]),
      { role: "user", content: trimmed },
    ];

    const nextDisplay: DisplayMessage[] = [...messages, userMsg];
    setMessages(nextDisplay);
    localStorage.setItem(LS_OPENAI, JSON.stringify(openaiHistory));
    localStorage.setItem(LS_DISPLAY, JSON.stringify(nextDisplay));

    try {
      let data: BackendResponse;

      if (TEST_MODE) {
        data = await simulateBackendResponse(trimmed);
      } else {
        const res = await fetch(AI_CHAT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(openaiHistory),
        });

        if (!res.ok) {
          const body = await res.text().catch(() => "");
          const suffix = body ? `: ${body}` : "";
          throw new Error(`HTTP ${res.status}${suffix}`);
        }

        data = (await res.json()) as BackendResponse;
      }

      const processed: DisplayMessage[] = (data.messages || []).map((m): DisplayMessage => {
        if (m.type === "image") return { type: "image", content: m.content };
        return { type: "text", content: m.content };
      });

      const finalMessages: DisplayMessage[] = [...messages, userMsg, ...processed];
      setMessages(finalMessages);
      localStorage.setItem(LS_DISPLAY, JSON.stringify(finalMessages));

      if (data.history) {
        localStorage.setItem(LS_OPENAI, JSON.stringify(data.history));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      const errMsg: DisplayMessage = { type: "text", content: `Error: ${msg}` };
      const finalMessages: DisplayMessage[] = [...messages, userMsg, errMsg];
      setMessages(finalMessages);
      localStorage.setItem(LS_DISPLAY, JSON.stringify(finalMessages));
    } finally {
      setWaiting(false);
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const current = input;
    setInput("");
    void sendMessage(current);
  };

  useEffect(() => {
    if (!initialInput) return;
    void sendMessage(initialInput);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [whatToAskOpen, setWhatToAskOpen] = useState(false);
  const [whatToAskMounted, setWhatToAskMounted] = useState(false);

  const openWhatToAsk = () => {
    setWhatToAskMounted(true);
    // let it mount first, then animate in
    requestAnimationFrame(() => setWhatToAskOpen(true));
  };
  
  const closeWhatToAsk = () => {
    setWhatToAskOpen(false);
    // wait for transition to finish, then unmount
    window.setTimeout(() => setWhatToAskMounted(false), 180);
  };
  

  const whatToAskSections = [
    {
      key: "gene",
      title: "Website Q&A",
      emoji: "🧬",
      questions: [
        "What is ACSL5?",
        "Please tell me the role of LGR5 in intestinal stem cells.",
        "Can you show the expression of CHGA?",
      ],
    },
    {
      key: "spatial",
      title: "Metabolomics",
      emoji: "🧭",
      questions: [
        "Please show me the differential metabolite expression of GABA in duodenum versus colon tissues.",
      ],
    },
    {
      key: "hyp",
      title: "GLKB (Literature)",
      emoji: "💡",
      questions: [
        "GLKB: What is the role of BRCA1 in breast cancer?",
        "GLKB: How many articles about Alzheimer's disease are published in 2020?",
      ],
    },
  ] as const;
  
  const handleAskSample = (q: string) => {
    setInput(q);          // just fill the chat box
    closeWhatToAsk();
  };
  
  const [thinkingStep, setThinkingStep] = useState<0 | 1 | 2 | 3>(0);
  
  useEffect(() => {
    if (!waiting) {
      setThinkingStep(0);
      return;
    }
  
    setThinkingStep(1);
  
    const t1 = window.setTimeout(() => setThinkingStep(2), 650);
    const t2 = window.setTimeout(() => setThinkingStep(3), 1400);
  
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [waiting]);
  

  const [imgStatus, setImgStatus] = useState<Record<number, "loading" | "loaded" | "error">>({});

  const getImgStatus = (idx: number) => imgStatus[idx] ?? "loading";

  useEffect(() => {
    setImgStatus((prev) => {
      const next = { ...prev };
      messages.forEach((m, idx) => {
        if (m.type === "image" && !(idx in next)) {
          next[idx] = "loading";
        }
      });
      return next;
    });
    // intentionally depends on messages
  }, [messages]);

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#ffffff",
        overflow: "hidden",
      }}
    >
      <NavBar />
      {/* Main content area - scrollable messages */}
      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          overflowY: "auto",
          pt: messages.length > 0 ? 6 : 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          
        }}
      >
        {/* Welcome message when no messages */}
        {messages.length === 0 && (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pb: "5%", // Move up 5%
            }}
          >
            <Typography
              sx={{
                fontWeight: 600,
                fontSize: "2rem",
                textAlign: "center",
              }}
            >
              <Box component="span" sx={{ color: "#000000" }}>Welcome to Gut</Box>
              <Box component="span" sx={{ color: "var(--accent)" }}>Omics</Box>
              <Box component="span" sx={{ color: "#000000" }}>Atlas </Box>
              <Box component="span" sx={{ color: "var(--accent)" }}>AI</Box>
            </Typography>
          </Box>
        )}

        {/* Messages container - same width as input (42.75%) */}
        {messages.length > 0 && (
        <Box
          sx={{
            width: "42.75%",
            display: "flex",
            flexDirection: "column",
            gap: 3,
            pb: 3,
          }}
        >
          {messages.map((msg, idx) => {
            const isUser = msg.type === "user";
            const isImage = msg.type === "image";

            if (isUser) {
              // User message - right aligned, pink bubble
              return (
                <Box
                  key={idx}
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <Box
                    sx={{
                      maxWidth: "70%",
                      px: 1.5,
                      py: 1,
                      borderRadius: "12px",
                      backgroundColor: "var(--accent-light)",
                      color: "#000000",
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.85rem",
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {msg.content}
                    </Typography>
                  </Box>
                </Box>
              );
            } else {
              // AI response - left aligned, no bubble, heart icon
              return (
                <Box
                  key={idx}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                  }}
                >
                {/* AI icon */}
                  <AutoAwesomeIcon sx={{ color: "var(--accent)", fontSize: 24, mb: 1 }} />
                  {/* Response content below the icon */}
                  <Box sx={{ maxWidth: "85%" }}>
                    {isImage ? (
                      <Box sx={{ width: "100%", maxWidth: "100%" }}>
                        {/* Overlay while image is loading */}
                        {getImgStatus(idx) === "loading" && (
                          <Box
                            sx={{
                              width: "100%",
                              maxWidth: 420,
                              aspectRatio: "1 / 1",
                              minHeight: 220,
                              borderRadius: "10px",
                              backgroundColor: "#FAFAFA",
                              border: "1px solid #F0F0F0",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 1.2,
                            }}
                          >
                            <CircularProgress size={22} thickness={4} sx={dashedSpinnerSx} />
                            <Typography sx={{ fontSize: "0.9rem", color: THINK_GRAY }}>
                              Generating
                            </Typography>
                          </Box>
                        )}

                        {/* Error state */}
                        {getImgStatus(idx) === "error" && (
                          <Box
                            sx={{
                              width: "100%",
                              maxWidth: 420,
                              aspectRatio: "1 / 1",
                              minHeight: 220,
                              borderRadius: "10px",
                              backgroundColor: "#FAFAFA",
                              border: "1px solid #F0F0F0",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 1.2,
                            }}
                          >
                            <Typography sx={{ fontSize: "0.85rem", color: THINK_GRAY }}>
                              Failed to load image
                            </Typography>
                          </Box>
                        )}

                        {/* The actual image (hidden until loaded) */}
                        <LightboxZoomImage
                          src={msg.content}
                          alt="Assistant response image"
                          style={{
                            maxWidth: "100%",
                            maxHeight: 400,
                            display: getImgStatus(idx) === "loaded" ? "block" : "none",
                            borderRadius: "8px",
                          }}
                          onLoad={() => setImgStatus((prev) => ({ ...prev, [idx]: "loaded" }))}
                          onError={() => setImgStatus((prev) => ({ ...prev, [idx]: "error" }))}
                        />
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          fontSize: "0.85rem",
                          lineHeight: 1.6,
                          color: "#000000",
                          wordBreak: "break-word",
                        }}
                      >
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: (props) => (
                              <a {...props} target="_blank" rel="noopener noreferrer" className="ai-link" />
                            ),
                            p: (props) => (
                              <Typography component="p" sx={{ fontSize: "0.85rem", lineHeight: 1.6, mb: 1 }} {...props} />
                            ),
                            li: (props) => (
                              <li style={{ marginBottom: "0.25rem" }} {...props} />
                            ),
                            h1: (props) => (
                              <Typography component="h1" sx={{ fontSize: "1.15rem", fontWeight: 700, mt: 1.2, mb: 0.8 }} {...props} />
                            ),
                            h2: (props) => (
                              <Typography component="h2" sx={{ fontSize: "1.05rem", fontWeight: 700, mt: 1.1, mb: 0.7 }} {...props} />
                            ),
                            h3: (props) => (
                              <Typography component="h3" sx={{ fontSize: "0.98rem", fontWeight: 700, mt: 1.0, mb: 0.6 }} {...props} />
                            ),
                            pre: ({ children }) => (
                            <Box
                              component="pre"
                              sx={{
                                backgroundColor: "#f5f5f5",
                                p: 1,
                                borderRadius: "10px",
                                overflowX: "auto",
                                mt: 0.5,
                                mb: 0.75,
                              }}
                            >
                              {children}
                            </Box>
                          ),

                          code: ({ className, children, ...props }) => {
                            const isBlock =
                              typeof className === "string" && className.includes("language-");

                            // block code (```js etc)
                            if (isBlock) {
                              return (
                                <Box
                                  component="code"
                                  className={className}
                                  sx={{ fontSize: "0.82rem" }}
                                  {...props}
                                >
                                  {children}
                                </Box>
                              );
                            }

                            // inline code
                            return (
                              <Box
                                component="code"
                                sx={{
                                  backgroundColor: "#f5f5f5",
                                  px: 0.4,
                                  py: 0.1,
                                  borderRadius: "6px",
                                  fontSize: "0.82rem",
                                }}
                                {...props}
                              >
                                {children}
                              </Box>
                            );
                          },

                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </Box>

                    )}
                  </Box>
                </Box>
              );
            }
          })}

          {/* Loading indicator */}
          {waiting && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 1,
              }}
            >
              <AutoAwesomeIcon sx={{ color: "var(--accent)", fontSize: 24, mb: 0.5 }} />

              <Typography sx={{ fontSize: "0.9rem", color: THINK_GRAY, mb: 0.5 }}>
                Thinking...
              </Typography>


              <Stack spacing={0.8} sx={{ pl: 0.2 }}>
                {/* STEP 1 */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {thinkingStep === 1 && (
                    <CircularProgress size={18} thickness={4} sx={dashedSpinnerSx} />
                  )}
                  {thinkingStep >= 2 && (
                    <CheckIcon sx={{ fontSize: 18, color: THINK_GRAY }} />
                  )}
                  {thinkingStep === 0 && <Box sx={{ width: 18, height: 18 }} />}

                  <Typography sx={{ fontSize: "0.85rem", color: THINK_GRAY_2 }}>
                    Message received and being processed
                  </Typography>
                </Box>

                {/* STEP 2 */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {thinkingStep === 2 && (
                    <CircularProgress size={18} thickness={4} sx={dashedSpinnerSx} />
                  )}
                  {thinkingStep >= 3 && (
                    <CheckIcon sx={{ fontSize: 18, color: THINK_GRAY }} />
                  )}
                  {thinkingStep < 2 && <Box sx={{ width: 18, height: 18 }} />}

                  <Typography sx={{ fontSize: "0.85rem", color: THINK_GRAY_2 }}>
                    Processing
                  </Typography>
                </Box>

                {/* STEP 3 */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {thinkingStep === 3 ? (
                    <CircularProgress size={18} thickness={4} sx={dashedSpinnerSx} />
                  ) : (
                    <Box sx={{ width: 18, height: 18 }} />
                  )}

                  <Typography sx={{ fontSize: "0.85rem", color: THINK_GRAY_2 }}>
                    Formulating response
                  </Typography>
                </Box>
              </Stack>
            </Box>
          )}
        </Box>
        )}
      </Box>

      {/* Chat input - fixed at bottom, centered */}
      <Box
        sx={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          pb: 0,
          pt: 2,
          backgroundColor: "transparent",
        }}
      >
        {/* Clear History button - above left side of input, only show when there are messages */}
        {messages.length > 0 && (
          <Box
            sx={{
              width: "42.75%",
              display: "flex",
              justifyContent: "flex-start",
              mb: 1,
              pl: 1, // Slight offset to the right
            }}
          >
            <Button
              variant="outlined"
              onClick={clearHistory}
              disabled={waiting}
              sx={{
                color: "var(--accent)",
                borderColor: "var(--accent)",
                backgroundColor: "#ffffff",
                borderRadius: "50px",
                textTransform: "none",
                fontWeight: 500,
                px: 2,
                py: 0.5,
                fontSize: "0.85rem",
                "&:hover": {
                  borderColor: "var(--accent)",
                  backgroundColor: "var(--accent-light)",
                },
                "&:focus": {
                  outline: "none",
                },
                "&:focus-visible": {
                  outline: "none",
                },
                "&:disabled": {
                  color: "#cccccc",
                  borderColor: "#cccccc",
                },
              }}
            >
              Clear History
            </Button>
          </Box>
        )}

        <Box
          sx={{
            width: "42.75%",
            height: "16.8vh",
            position: "relative",
            backgroundColor: "transparent",
            borderRadius: "12px",
            boxShadow: "0 2px 12px rgba(0, 0, 0, 0.1)",
          }}
        >
          <InputBase
            placeholder="Ask me anything about your data ..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={waiting}
            multiline
            sx={{
              width: "100%",
              height: "100%",
              px: 2.5,
              py: 2,
              fontSize: "1rem",
              alignItems: "flex-start",
              "& .MuiInputBase-input": {
                height: "100% !important",
                overflow: "auto !important",
              },
            }}
          />
          {/* Send button */}
          <IconButton
            onClick={handleSend}
            disabled={waiting}
            disableRipple
            disableFocusRipple
            sx={{
              position: "absolute",
              bottom: 12,
              right: 12,
              backgroundColor: "var(--accent)",
              width: 36,
              height: 36,

              // remove focus ring / persistent outline
              outline: "none",
              boxShadow: "none",
              "&:focus": { outline: "none", boxShadow: "none" },
              "&:focus-visible": { outline: "none", boxShadow: "none" },
              "&.Mui-focusVisible": { outline: "none", boxShadow: "none" },

              "&:hover": { backgroundColor: "#a00d16" },
              "&:disabled": { backgroundColor: "#cccccc" },
            }}
          >
            <ArrowOutwardOutlinedIcon sx={{ color: "#ffffff", fontSize: 20 }} />
          </IconButton>

        </Box>

        {/* "What to ask" button - pill shaped, in right margin, aligned with send button */}
        <Button
          variant="contained"
          onClick={() => {
            if (whatToAskMounted) closeWhatToAsk();
            else openWhatToAsk();
          }}
          disableRipple
          disableFocusRipple
          sx={{
            position: "absolute",
            left: "calc(50% + 42.75%/2 + 16px)",
            bottom: 12,
            height: 32,
            backgroundColor: "var(--accent)",
            color: "#fff",
            borderRadius: "50px",
            textTransform: "none",
            fontWeight: 600,
            px: 2.2,
            boxShadow: "none",
            "&:hover": { backgroundColor: "#a00d16", boxShadow: "none" },

            outline: "none",
            "&:focus": { outline: "none" },
            "&:focus-visible": { outline: "none" },
            "&.Mui-focusVisible": { outline: "none" },
          }}
        >
          What to Ask
        </Button>

        {whatToAskMounted && (
            <Box
            sx={{
              position: "absolute",
              left: "calc(50% + 42.75%/2 + 16px)",
              bottom: 60,
              width: 280,
              maxHeight: "72vh",
              overflowY: "auto",
              backgroundColor: "transparent",
              zIndex: 20,
              pr: 0.5,
        
              // animation
              opacity: whatToAskOpen ? 1 : 0,
              transform: whatToAskOpen ? "translateY(0px)" : "translateY(14px)",
              transition: "opacity 180ms ease, transform 180ms ease",
              pointerEvents: whatToAskOpen ? "auto" : "none",
            }}
          >
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: "0.95rem",
              textAlign: "center",
              mb: 1.5,
              color: "#111",
            }}
          >
            What to Ask
          </Typography>

          <Stack spacing={2}>
            {whatToAskSections.map((sec) => (
              <Box key={sec.key}>
                {/* Section header */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <Box
                    sx={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      backgroundColor: "var(--accent-light)",
                      color: "var(--accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {sec.emoji}
                  </Box>
                  <Typography sx={{ fontWeight: 700, fontSize: "0.8rem", color: "#222" }}>
                    {sec.title}
                  </Typography>
                </Box>

                {/* Question bubbles */}
                <Stack spacing={1.1}>
                  {sec.questions.map((q) => (
                    <ButtonBase
                      key={q}
                      onClick={() => handleAskSample(q)}
                      sx={{
                        width: "100%",
                        borderRadius: "10px",
                        backgroundColor: "#FAF8FD",
                        boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                        px: 1.25,
                        py: 1.1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1.25,
                        textAlign: "left",
                        "&:hover": { backgroundColor: "#F2EEF9" },

                        outline: "none",
                        "&:focus": { outline: "none" },
                        "&:focus-visible": { outline: "none" },
                        "&.Mui-focusVisible": { outline: "none" },
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.72rem",
                          lineHeight: 1.25,
                          color: "#666",
                          pr: 0.5,
                        }}
                      >
                        {q}
                      </Typography>

                      {/* Red circular send icon (matches screenshot) */}
                      <ArrowOutwardOutlinedIcon
                        sx={{
                          color: "var(--accent)",
                          fontSize: 16,
                          flex: "0 0 auto",
                          opacity: 0.85,
                          transition: "opacity 0.15s ease",
                          ".MuiButtonBase-root:hover &": {
                            opacity: 1,
                          },
                        }}
                      />
                    </ButtonBase>
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>
      )}


        
      </Box>

      {/* Simple footer */}
      <Box
        component="footer"
        sx={{
          py: 2,
          textAlign: "center",
          backgroundColor: "#ffffff",
        }}
      >
        <Typography
          sx={{
            fontSize: "0.85rem",
            color: "#888888",
          }}
        >
          Copyright © 2026 - 2030 Chen Lab @ Weil Cornell Medicine. All rights reserved.
        </Typography>
      </Box>

    </Box>
  );
}
