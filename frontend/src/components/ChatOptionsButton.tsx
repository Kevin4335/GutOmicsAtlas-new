import { useCallback, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import {
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Switch,
  Typography,
} from "@mui/material";
import {
  readAIChatOptions,
  writeAIChatOptions,
  type AIChatRequestOptions,
} from "../aiChatOptions";

type Props = {
  disabled?: boolean;
};

/**
 * Outlined + control: opens menu to toggle agent options (e.g. GLKB).
 * Same 36×36 footprint as the send button; uses localStorage for persistence.
 */
export function ChatOptionsButton({ disabled }: Props) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [opts, setOpts] = useState<AIChatRequestOptions>(() => readAIChatOptions());

  const open = Boolean(anchor);

  const handleGlkb = useCallback((_: unknown, checked: boolean) => {
    const next = { glkb: checked };
    setOpts(next);
    writeAIChatOptions(next);
  }, []);

  return (
    <>
      <IconButton
        aria-label="Chat options"
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
        disabled={disabled}
        onClick={(e) => setAnchor(e.currentTarget)}
        disableRipple
        sx={{
          width: 36,
          height: 36,
          flexShrink: 0,
          border: "2px solid var(--accent)",
          color: "var(--accent)",
          backgroundColor: "#ffffff",
          outline: "none",
          boxShadow: "none",
          "&:hover": {
            backgroundColor: "var(--accent-light)",
            borderColor: "var(--accent)",
          },
          "&:focus": { outline: "none", boxShadow: "none" },
          "&:focus-visible": { outline: "none", boxShadow: "none" },
          "&.Mui-focusVisible": { outline: "none", boxShadow: "none" },
          "&:disabled": {
            borderColor: "#cccccc",
            color: "#cccccc",
            backgroundColor: "#f5f5f5",
          },
        }}
      >
        <AddIcon sx={{ fontSize: 22 }} />
      </IconButton>

      <Menu
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              mt: -1,
              borderRadius: 2,
              minWidth: 280,
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            },
          },
        }}
      >
        <MenuItem
          disableRipple
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          sx={{
            cursor: "default",
            alignItems: "center",
            py: 1.5,
            px: 2,
            gap: 1.25,
            whiteSpace: "normal",
          }}
        >
          <ListItemIcon sx={{ minWidth: 40, alignSelf: "flex-start", mt: 0.25 }}>
            <MenuBookOutlinedIcon sx={{ color: "var(--accent)", fontSize: 26 }} />
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography component="span" variant="body2" fontWeight={600} color="#1a1a1a">
                GLKB literature
              </Typography>
            }
            secondary={
              <Typography component="span" variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                Use the biomedical literature assistant when helpful
              </Typography>
            }
            sx={{ my: 0, flex: 1 }}
          />
          <Switch
            size="small"
            checked={opts.glkb}
            onChange={handleGlkb}
            onClick={(e) => e.stopPropagation()}
            sx={{
              "& .MuiSwitch-switchBase.Mui-checked": { color: "var(--accent)" },
              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                backgroundColor: "var(--accent)",
                opacity: 0.5,
              },
            }}
          />
        </MenuItem>
      </Menu>
    </>
  );
}
