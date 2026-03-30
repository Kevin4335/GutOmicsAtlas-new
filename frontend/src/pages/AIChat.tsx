import { useEffect, useMemo, useRef, useState, type AnchorHTMLAttributes } from "react";
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
import { ChatOptionsButton } from "../components/ChatOptionsButton";
import { enabledToolLabels, readAIChatOptions } from "../aiChatOptions";

// ----------------------
// Types
// ----------------------
type DisplayMessage =
  | { type: "user"; content: string; enabledTools?: string[] }
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

/** Assistant markdown: base size + line height (readable body text). */
const AI_CHAT_BODY = {
  fontSize: "0.9375rem",
  lineHeight: 1.72,
  color: "#1a1a1a",
  letterSpacing: "0.01em",
} as const;

function AiMarkdownLink({ href = "", children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const h = href.toLowerCase();
  const pubmed =
    h.includes("pubmed.ncbi.nlm.nih.gov") ||
    h.includes("ncbi.nlm.nih.gov/pubmed") ||
    /\/pubmed\/\d+/i.test(href);
  const doi = h.includes("doi.org");

  const palette = pubmed
    ? {
        color: "#0d9488",
        border: "rgba(13, 148, 136, 0.38)",
        hoverColor: "#0f766e",
        hoverBorder: "rgba(15, 118, 110, 0.55)",
      }
    : doi
      ? {
          color: "#2563eb",
          border: "rgba(37, 99, 235, 0.32)",
          hoverColor: "#1d4ed8",
          hoverBorder: "rgba(29, 78, 216, 0.5)",
        }
      : {
          color: "var(--accent)",
          border: "rgba(222, 51, 65, 0.3)",
          hoverColor: "#c41f2d",
          hoverBorder: "rgba(196, 31, 45, 0.45)",
        };

  return (
    <Box
      component="a"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      {...rest}
      sx={{
        color: palette.color,
        textDecoration: "none",
        fontWeight: 600,
        fontSize: "0.96em",
        borderBottom: `1px solid ${palette.border}`,
        transition: "color 0.15s ease, border-color 0.15s ease",
        "&:hover": {
          color: palette.hoverColor,
          borderBottomColor: palette.hoverBorder,
        },
      }}
    >
      {children}
    </Box>
  );
}

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
    return initialInput
      ? [
          {
            type: "user",
            content: initialInput,
            enabledTools: enabledToolLabels(readAIChatOptions()),
          },
        ]
      : [];
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

    const userMsg: DisplayMessage = {
      type: "user",
      content: trimmed,
      enabledTools: enabledToolLabels(readAIChatOptions()),
    };

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
          body: JSON.stringify({
            history: openaiHistory,
            options: readAIChatOptions(),
          }),
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
              const toolsLine =
                msg.enabledTools !== undefined
                  ? msg.enabledTools.length > 0
                    ? msg.enabledTools.join(", ")
                    : "none"
                  : null;
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
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 0.35,
                    }}
                  >
                    <Box
                      sx={{
                        maxWidth: "100%",
                        px: 1.5,
                        py: 1,
                        borderRadius: "12px",
                        backgroundColor: "var(--accent-light)",
                        color: "#000000",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.9rem",
                          lineHeight: 1.65,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                          letterSpacing: "0.01em",
                        }}
                      >
                        {msg.content}
                      </Typography>
                    </Box>
                    {toolsLine !== null && (
                      <Typography
                        component="div"
                        sx={{
                          fontSize: "0.6875rem",
                          lineHeight: 1.35,
                          color: THINK_GRAY_2,
                          letterSpacing: "0.02em",
                          px: 0.25,
                          textAlign: "right",
                        }}
                      >
                        Enabled tools: {toolsLine}
                      </Typography>
                    )}
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
                        className="ai-chat-prose"
                        sx={{
                          ...AI_CHAT_BODY,
                          wordBreak: "break-word",
                          maxWidth: "100%",
                          "& p": { margin: 0 },
                          "& p + p": { mt: 1.1 },
                          "& ul, & ol": {
                            my: 1.15,
                            pl: 2.75,
                            listStylePosition: "outside",
                          },
                          "& ul": { listStyleType: "disc" },
                          "& ol": { listStyleType: "decimal" },
                          "& li": {
                            display: "list-item",
                            mb: 0.45,
                            pl: 0.35,
                          },
                          "& li::marker": { color: "#7a7a7a", fontWeight: 500 },
                          "& li > p": { mb: 0.35 },
                          "& ul ul, & ol ol, & ul ol, & ol ul": { my: 0.5 },
                        }}
                      >
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: (props) => <AiMarkdownLink {...props} />,
                            p: ({ node: _n, ...props }) => (
                              <Typography
                                component="p"
                                sx={{
                                  fontSize: AI_CHAT_BODY.fontSize,
                                  lineHeight: AI_CHAT_BODY.lineHeight,
                                  color: AI_CHAT_BODY.color,
                                  mb: 1.1,
                                  letterSpacing: AI_CHAT_BODY.letterSpacing,
                                }}
                                {...props}
                              />
                            ),
                            ul: ({ node: _n, ...props }) => (
                              <Box component="ul" sx={{ m: 0 }} {...props} />
                            ),
                            ol: ({ node: _n, ...props }) => (
                              <Box component="ol" sx={{ m: 0 }} {...props} />
                            ),
                            li: ({ node: _n, ...props }) => (
                              <Box
                                component="li"
                                sx={{
                                  fontSize: AI_CHAT_BODY.fontSize,
                                  lineHeight: AI_CHAT_BODY.lineHeight,
                                  color: AI_CHAT_BODY.color,
                                }}
                                {...props}
                              />
                            ),
                            h1: ({ node: _n, ...props }) => (
                              <Typography
                                component="h1"
                                sx={{
                                  fontSize: "1.2rem",
                                  fontWeight: 700,
                                  lineHeight: 1.35,
                                  mt: 1.75,
                                  mb: 0.85,
                                  color: "#111",
                                }}
                                {...props}
                              />
                            ),
                            h2: ({ node: _n, ...props }) => (
                              <Typography
                                component="h2"
                                sx={{
                                  fontSize: "1.08rem",
                                  fontWeight: 700,
                                  lineHeight: 1.4,
                                  mt: 1.5,
                                  mb: 0.75,
                                  color: "#151515",
                                }}
                                {...props}
                              />
                            ),
                            h3: ({ node: _n, ...props }) => (
                              <Typography
                                component="h3"
                                sx={{
                                  fontSize: "1rem",
                                  fontWeight: 700,
                                  lineHeight: 1.45,
                                  mt: 1.25,
                                  mb: 0.65,
                                  color: "#1a1a1a",
                                }}
                                {...props}
                              />
                            ),
                            strong: ({ node: _n, ...props }) => (
                              <Box component="strong" sx={{ fontWeight: 700, color: "#111" }} {...props} />
                            ),
                            em: ({ node: _n, ...props }) => (
                              <Box component="em" sx={{ fontStyle: "italic", color: "#333" }} {...props} />
                            ),
                            blockquote: ({ node: _n, children }) => (
                              <Box
                                component="blockquote"
                                sx={{
                                  borderLeft: "3px solid rgba(222, 51, 65, 0.28)",
                                  pl: 2,
                                  pr: 1,
                                  py: 0.75,
                                  my: 1.35,
                                  bgcolor: "rgba(0,0,0,0.025)",
                                  borderRadius: "0 8px 8px 0",
                                  color: "#444",
                                  fontSize: "0.9rem",
                                  lineHeight: 1.65,
                                }}
                              >
                                {children}
                              </Box>
                            ),
                            hr: () => (
                              <Box
                                component="hr"
                                sx={{
                                  border: "none",
                                  borderTop: "1px solid #e6e6e6",
                                  my: 2,
                                }}
                              />
                            ),
                            table: ({ node: _n, children }) => (
                              <Box sx={{ overflowX: "auto", my: 1.25 }}>
                                <Box
                                  component="table"
                                  sx={{
                                    borderCollapse: "collapse",
                                    width: "100%",
                                    fontSize: "0.875rem",
                                    lineHeight: 1.5,
                                  }}
                                >
                                  {children}
                                </Box>
                              </Box>
                            ),
                            thead: ({ node: _n, ...props }) => <Box component="thead" {...props} />,
                            tbody: ({ node: _n, ...props }) => <Box component="tbody" {...props} />,
                            tr: ({ node: _n, ...props }) => <Box component="tr" {...props} />,
                            th: ({ node: _n, ...props }) => (
                              <Box
                                component="th"
                                sx={{
                                  border: "1px solid #e0e0e0",
                                  px: 1,
                                  py: 0.65,
                                  textAlign: "left",
                                  fontWeight: 700,
                                  bgcolor: "#f7f7f7",
                                }}
                                {...props}
                              />
                            ),
                            td: ({ node: _n, ...props }) => (
                              <Box
                                component="td"
                                sx={{
                                  border: "1px solid #e8e8e8",
                                  px: 1,
                                  py: 0.55,
                                  verticalAlign: "top",
                                }}
                                {...props}
                              />
                            ),
                            pre: ({ children }) => (
                              <Box
                                component="pre"
                                sx={{
                                  backgroundColor: "#f4f4f5",
                                  p: 1.25,
                                  borderRadius: "10px",
                                  overflowX: "auto",
                                  mt: 0.75,
                                  mb: 1,
                                  fontSize: "0.8125rem",
                                  lineHeight: 1.55,
                                  border: "1px solid #eaeaea",
                                }}
                              >
                                {children}
                              </Box>
                            ),
                            code: ({ className, children, node: _n, ...props }) => {
                              const isBlock =
                                typeof className === "string" && className.includes("language-");
                              if (isBlock) {
                                return (
                                  <Box
                                    component="code"
                                    className={className}
                                    sx={{ fontSize: "0.8125rem", fontFamily: "ui-monospace, monospace" }}
                                    {...props}
                                  >
                                    {children}
                                  </Box>
                                );
                              }
                              return (
                                <Box
                                  component="code"
                                  sx={{
                                    backgroundColor: "#f0f0f1",
                                    px: 0.45,
                                    py: 0.15,
                                    borderRadius: "5px",
                                    fontSize: "0.84em",
                                    fontFamily: "ui-monospace, monospace",
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
          pt: 0,
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
          <Box sx={{ position: "absolute", bottom: 12, left: 12 }}>
            <ChatOptionsButton disabled={waiting} />
          </Box>
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
