import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  // Button,
  IconButton,
  InputBase,
  Stack,
  Typography,
} from "@mui/material";
import ArrowOutwardOutlinedIcon from "@mui/icons-material/ArrowOutwardOutlined";
// import ModelTrainingOutlinedIcon from "@mui/icons-material/ModelTrainingOutlined";
import NavBar from "../components/NavBar";
import { ChatOptionsButton } from "../components/ChatOptionsButton";
// Temporarily hidden — re-enable when EPCOT Agent returns to the landing page.
// import EpcotAgentDialog from "../components/EpcotAgentDialog";
import mainBackground from "../assets/main_background.svg";

// Example prompts
const examplePrompts = [
  "Can you show the expression of CLCA1?",
  "What is the role of enteroendocrine cells in homeostasis and nutrition?",
  "How many articles about multiomics analysis of fetal and adult gut are published in 2025?",
];

export default function AILanding() {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState("");
  // EPCOT wiring kept for easy re-enable; UI is temporarily hidden below.
  const [epcotOpen, setEpcotOpen] = useState(false);
  void epcotOpen;
  void setEpcotOpen;

  const handleSubmit = (prompt?: string) => {
    const query = prompt || inputValue.trim();
    if (query) {
      // Navigate to chat page with initial prompt
      navigate("/chat/conversation", { state: { chatInput: query } });
    } else {
      // Navigate to chat page without initial prompt
      navigate("/chat/conversation");
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundImage: `url(${mainBackground})`,
        backgroundSize: "130% auto",
        backgroundPosition: "30% 30%",
        backgroundRepeat: "no-repeat",
      }}
    >
      <NavBar />
      {/* Main content - centered, occupies middle 42% of screen */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          py: 6,
        }}
      >
        {/* Content container - exactly 42% of screen width */}
        <Box
          sx={{
            width: "42%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Title - semi bold, ~27% of screen width */}
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: "2.4vw",
              mb: "40px",
              textAlign: "center",
              whiteSpace: "nowrap",
            }}
          >
            <Box component="span" sx={{ color: "#000000" }}>Welcome to Gut</Box>
            <Box component="span" sx={{ color: "var(--accent)" }}>Omics</Box>
            <Box component="span" sx={{ color: "#000000" }}>Atlas </Box>
            <Box component="span" sx={{ color: "var(--accent)" }}>AI</Box>
          </Typography>

          {/* Chat input box - 19% screen height */}
          <Box
            sx={{
              width: "100%",
              height: "19vh",
              mb: 3,
              position: "relative",
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              boxShadow: "0 2px 12px rgba(0, 0, 0, 0.1)",
            }}
          >
            <InputBase
              placeholder="Ask me anything about your data ..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
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
              <ChatOptionsButton />
            </Box>
            <IconButton
              onClick={() => handleSubmit()}
              sx={{
                position: "absolute",
                bottom: 12,
                right: 12,
                backgroundColor: "var(--accent)",
                width: 36,
                height: 36,
                "&:hover": {
                  backgroundColor: "#a00d16",
                },
              }}
            >
              <ArrowOutwardOutlinedIcon sx={{ color: "#ffffff", fontSize: 20 }} />
            </IconButton>
          </Box>
        </Box>

        {/* Examples + EPCOT — wider strip for cards and EPCOT Agent */}
        <Box
          sx={{
            width: "min(920px, 92vw)",
          }}
        >
          <Typography
            sx={{
              color: "#000000",
              fontWeight: 600,
              fontSize: "0.9rem",
              mb: 0.8,
            }}
          >
            Examples:
          </Typography>

          {/* Example prompt boxes - side by side */}
          <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
            {examplePrompts.map((prompt) => (
              <Box
                key={prompt}
                onClick={() => handleSubmit(prompt)}
                sx={{
                  flex: 1,
                  height: "14.3vh",
                  backgroundColor: "#ffffff",
                  borderRadius: "8px",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                  p: 1.5,
                  position: "relative",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: "#fafafa",
                    boxShadow: "0 3px 12px rgba(0, 0, 0, 0.12)",
                  },
                }}
              >
                <Typography
                  sx={{
                    color: "#2C2C2B",
                    fontSize: "0.85rem",
                    fontWeight: 400,
                    lineHeight: 1.4,
                    pr: 3,
                  }}
                >
                  {prompt}
                </Typography>
                {/* Arrow icon - bottom right */}
                <ArrowOutwardOutlinedIcon
                  sx={{
                    position: "absolute",
                    bottom: 10,
                    right: 10,
                    color: "var(--accent)",
                    fontSize: 18,
                  }}
                />
              </Box>
            ))}
          </Stack>

          {/* EPCOT Agent — temporarily hidden; restore import, state, and block below to re-enable.
          <Typography
            sx={{
              color: "#000000",
              fontWeight: 600,
              fontSize: "0.9rem",
              mt: 4,
              mb: 0.8,
            }}
          >
            Additional Features:
          </Typography>
          <Button
            type="button"
            variant="outlined"
            fullWidth
            onClick={() => setEpcotOpen(true)}
            sx={{
              py: 2,
              px: 2.5,
              borderRadius: "10px",
              borderColor: "rgba(0,0,0,0.18)",
              color: "#1a1a1a",
              textTransform: "none",
              justifyContent: "flex-start",
              gap: 1.5,
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.06)",
              "&:hover": {
                borderColor: "var(--accent)",
                backgroundColor: "rgba(222, 51, 65, 0.04)",
              },
            }}
          >
            <ModelTrainingOutlinedIcon sx={{ color: "var(--accent)", fontSize: 28, flexShrink: 0 }} />
            <Box sx={{ textAlign: "left" }}>
              <Typography component="span" sx={{ fontWeight: 800, fontSize: "1.05rem", letterSpacing: "0.04em" }}>
                EPCOT
              </Typography>
              <Typography component="span" sx={{ fontWeight: 600, fontSize: "0.95rem" }}>
                {" "}
                Agent
              </Typography>
              <Typography variant="caption" sx={{ display: "block", color: "#5c5c5c", mt: 0.35, fontWeight: 400 }}>
                Chromatin-focused analysis on your region — optional BAM, then save outputs
              </Typography>
            </Box>
          </Button>
          */}
        </Box>
      </Box>

      {/* <EpcotAgentDialog open={epcotOpen} onClose={() => setEpcotOpen(false)} /> */}

      {/* Simplified footer */}
      <Box
        component="footer"
        sx={{
          py: 2,
          textAlign: "center",
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
