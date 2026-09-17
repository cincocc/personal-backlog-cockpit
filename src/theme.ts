import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#0b57d0", dark: "#0842a0", contrastText: "#fff" },
    secondary: { main: "#5f6368" },
    error: { main: "#b3261e" },
    warning: { main: "#e37400" },
    background: { default: "#f0f4f9", paper: "#ffffff" },
    text: { primary: "#1f1f1f", secondary: "#444746" },
    divider: "rgba(31, 31, 31, 0.08)",
  },
  typography: {
    fontFamily: "Roboto, 'Noto Sans SC', Helvetica, Arial, sans-serif",
    h5: { fontWeight: 500, fontSize: 28, letterSpacing: "-0.02em" },
    h6: { fontWeight: 500, fontSize: 20 },
    subtitle2: { fontWeight: 500 },
    button: { textTransform: "none", fontWeight: 500, letterSpacing: 0.15 },
  },
  shape: { borderRadius: 12 },
  spacing: 8,
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiAppBar: {
      defaultProps: { color: "inherit", elevation: 0 },
      styleOverrides: {
        root: {
          backgroundColor: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(31,31,31,0.08)",
        },
      },
    },
    MuiPaper: { defaultProps: { elevation: 0 } },
    MuiTooltip: {
      styleOverrides: { tooltip: { fontSize: 12, maxWidth: 420 } },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 500, color: "#444746", backgroundColor: "#f8fafc" },
        root: { borderColor: "rgba(31, 31, 31, 0.05)", padding: "6px 8px" },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        input: { paddingTop: 6, paddingBottom: 6 },
      },
    },
  },
});
