import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  IconButton,
  InputBase,
  Stack,
  Typography,
} from "@mui/material";
import ArrowOutwardOutlinedIcon from "@mui/icons-material/ArrowOutwardOutlined";
import NavBar from "../components/NavBar";
import mainBackground from "../assets/main_background.svg";

// Example prompts
const examplePrompts = [
  "Can you show the expression of CHGA?",
  "What is the role of BRCA1 in breast cancer?",
  "How many articles about Alzheimer's disease are published in 2020?",
];

export default function AILanding() {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState("");

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
            {/* Send button - bottom right, red circle with white arrow */}
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

        {/* "For example:" section - 59% of screen width */}
        <Box
          sx={{
            width: "59%",
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
        </Box>
      </Box>

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
