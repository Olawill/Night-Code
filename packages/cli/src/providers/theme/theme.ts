export type ThemeColors = {
  primary: string;
  planMode: string;
  selection: string;
  thinking: string;
  success: string;
  error: string;
  info: string;
  background: string;
  surface: string;
  dialogSurface: string;
  thinkingBorder: string;
  dimSeparator: string;
};

export type Theme = {
  name: string;
  colors: ThemeColors;
};

export const THEMES: Theme[] = [
  {
    name: "Nightfox",
    colors: {
      primary: "#56D6C2",
      planMode: "#CF8EF4",
      selection: "#89B4FA",
      thinking: "#CF8EF4",
      success: "#82E0AA",
      error: "#E74C5E",
      info: "#56D6C2",
      background: "#0D0D12",
      surface: "#1A1A24",
      dialogSurface: "#0A0A10",
      thinkingBorder: "#34344A",
      dimSeparator: "#4E4E66",
    },
  },

  {
    // Primary hue: TEAL — deep black bg
    name: "Foxxy",
    colors: {
      primary: "#3DDCB8",
      planMode: "#B975F0",
      selection: "#5E9FF5",
      thinking: "#B975F0",
      success: "#6FD98A",
      error: "#E8395A",
      info: "#3DDCB8",
      background: "#07070D",
      surface: "#111120",
      dialogSurface: "#040408",
      thinkingBorder: "#28284A",
      dimSeparator: "#3E3E60",
    },
  },

  {
    // Primary hue: PINK — warm mauve bg
    name: "Catppuccin Mocha",
    colors: {
      primary: "#F5A8D4",
      planMode: "#B48EF5",
      selection: "#74C9C0",
      thinking: "#F0C97A",
      success: "#93D07F",
      error: "#F07080",
      info: "#84D0E3",
      background: "#1E1D2E",
      surface: "#2D2C42",
      dialogSurface: "#17162A",
      thinkingBorder: "#413F5E",
      dimSeparator: "#565475",
    },
  },

  {
    // Primary hue: PURPLE — mid blue-grey bg (iconic Dracula, unchanged)
    name: "Dracula",
    colors: {
      primary: "#BD93F9",
      planMode: "#FF79C6",
      selection: "#6272A4",
      thinking: "#FFB86C",
      success: "#50FA7B",
      error: "#FF5555",
      info: "#8BE9FD",
      background: "#282A36",
      surface: "#343746",
      dialogSurface: "#21222C",
      thinkingBorder: "#44475A",
      dimSeparator: "#6272A4",
    },
  },

  {
    // Primary hue: BLUE — near-black indigo bg (iconic Tokyo Night, unchanged)
    name: "Tokyo Night",
    colors: {
      primary: "#6A9FFF",
      planMode: "#A07DE0",
      selection: "#1FBDD5",
      thinking: "#D4A040",
      success: "#80C244",
      error: "#F2607A",
      info: "#5BBDF5",
      background: "#12131C",
      surface: "#1C2032",
      dialogSurface: "#0C0D16",
      thinkingBorder: "#313560",
      dimSeparator: "#464B78",
    },
  },

  {
    // Primary hue: AMBER/ORANGE — warm brown bg (classic Gruvbox feel)
    name: "Gruvbox Dark",
    colors: {
      primary: "#D4844A",
      planMode: "#C077AE",
      selection: "#689058",
      thinking: "#F5B820",
      success: "#A8B018",
      error: "#F73810",
      info: "#78B88C",
      background: "#1D1B18",
      surface: "#2A2723",
      dialogSurface: "#131210",
      thinkingBorder: "#443E38",
      dimSeparator: "#5A5248",
    },
  },

  {
    // Primary hue: ICY BLUE — blue-grey bg (iconic Nord, unchanged)
    name: "Nord",
    colors: {
      primary: "#80D0E8",
      planMode: "#C0A0D0",
      selection: "#6E98C8",
      thinking: "#F0D890",
      success: "#90C880",
      error: "#D85060",
      info: "#4A70A0",
      background: "#242C38",
      surface: "#303C50",
      dialogSurface: "#1A2230",
      thinkingBorder: "#384558",
      dimSeparator: "#465870",
    },
  },

  {
    // Primary hue: TEAL — charcoal bg
    name: "One Dark Pro",
    colors: {
      primary: "#2DC8B0",
      planMode: "#C060D8",
      selection: "#40B8A8",
      thinking: "#DDB050",
      success: "#7EBE58",
      error: "#D85060",
      info: "#2DC8B0",
      background: "#1E2128",
      surface: "#282D38",
      dialogSurface: "#171A20",
      thinkingBorder: "#343A48",
      dimSeparator: "#424A5A",
    },
  },

  {
    // Primary hue: GOLD/WARM YELLOW — dark ink bg
    name: "Kanagawa",
    colors: {
      primary: "#C8A840",
      planMode: "#957FB8",
      selection: "#508880",
      thinking: "#E07830",
      success: "#7CAA50",
      error: "#D05870",
      info: "#6898C8",
      background: "#14141E",
      surface: "#1E1E2C",
      dialogSurface: "#0C0C14",
      thinkingBorder: "#2A2A40",
      dimSeparator: "#404060",
    },
  },

  {
    // Primary hue: OCEAN BLUE — deep teal bg (iconic Solarized, unchanged)
    name: "Solarized Dark",
    colors: {
      primary: "#1E8AC8",
      planMode: "#CC2878",
      selection: "#1E9888",
      thinking: "#A87800",
      success: "#709800",
      error: "#D82820",
      info: "#1E8AC8",
      background: "#00222C",
      surface: "#063038",
      dialogSurface: "#001820",
      thinkingBorder: "#406068",
      dimSeparator: "#507580",
    },
  },

  {
    // Primary hue: ROSE/DUSTY RED — deep purple bg
    name: "Rose Pine",
    colors: {
      primary: "#E8829A",
      planMode: "#C4A7E7",
      selection: "#31748F",
      thinking: "#F6C177",
      success: "#9CCFD8",
      error: "#EB6F92",
      info: "#C4A7E7",
      background: "#130F20",
      surface: "#201A30",
      dialogSurface: "#0E0A18",
      thinkingBorder: "#342C50",
      dimSeparator: "#483C68",
    },
  },

  {
    // Primary hue: ELECTRIC CYAN — slate-teal bg
    name: "Ayu Mirage",
    colors: {
      primary: "#55C8FF",
      planMode: "#C0AAFF",
      selection: "#40C0D8",
      thinking: "#F8C840",
      success: "#98D030",
      error: "#F07060",
      info: "#80E0C0",
      background: "#171D2A",
      surface: "#202A3E",
      dialogSurface: "#10151E",
      thinkingBorder: "#303E58",
      dimSeparator: "#405070",
    },
  },

  {
    // Primary hue: JADE GREEN — cool purple-navy bg
    name: "Palenight",
    colors: {
      primary: "#52D68A",
      planMode: "#C792EA",
      selection: "#60C8E8",
      thinking: "#F0B840",
      success: "#A8D870",
      error: "#F06070",
      info: "#60C8E8",
      background: "#1E2030",
      surface: "#282A42",
      dialogSurface: "#14162A",
      thinkingBorder: "#383A60",
      dimSeparator: "#504E78",
    },
  },

  {
    // Primary hue: COBALT BLUE — near-black bg (darker than all other blues)
    name: "Material Ocean",
    colors: {
      primary: "#5898FF",
      planMode: "#C080E8",
      selection: "#55B8B0",
      thinking: "#FFB840",
      success: "#A8D870",
      error: "#F06070",
      info: "#70C8FF",
      background: "#080A12",
      surface: "#10141E",
      dialogSurface: "#050709",
      thinkingBorder: "#1A2230",
      dimSeparator: "#283048",
    },
  },

  {
    // Primary hue: NEON ORANGE — dark purple bg
    name: "Synthwave '84",
    colors: {
      primary: "#FF8C00",
      planMode: "#FF50D8",
      selection: "#40F0A8",
      thinking: "#F8F040",
      success: "#40F0A8",
      error: "#FF3070",
      info: "#36F9F6",
      background: "#180E22",
      surface: "#221636",
      dialogSurface: "#100A1A",
      thinkingBorder: "#382858",
      dimSeparator: "#503A78",
    },
  },

  {
    // Primary hue: VERMILLION RED — warm charcoal bg
    name: "Monokai Pro",
    colors: {
      primary: "#FF5C48",
      planMode: "#AB9DF2",
      selection: "#A9DC76",
      thinking: "#FFD866",
      success: "#A9DC76",
      error: "#FF6188",
      info: "#78DCE8",
      background: "#201E20",
      surface: "#2C2830",
      dialogSurface: "#161416",
      thinkingBorder: "#403840",
      dimSeparator: "#585060",
    },
  },

  {
    // Primary hue: BRIGHT BLUE — jet black bg (iconic GitHub Dark, unchanged)
    name: "GitHub Dark",
    colors: {
      primary: "#4898FF",
      planMode: "#A870FF",
      selection: "#60B8FF",
      thinking: "#D8A830",
      success: "#28B040",
      error: "#F83830",
      info: "#60B8FF",
      background: "#080C10",
      surface: "#0E1418",
      dialogSurface: "#020406",
      thinkingBorder: "#1E2830",
      dimSeparator: "#384050",
    },
  },

  {
    // Primary hue: MUTED TEAL/SAGE — earthy green bg
    name: "Everforest Dark",
    colors: {
      primary: "#60B0A8",
      planMode: "#D699B6",
      selection: "#68A878",
      thinking: "#C8A848",
      success: "#88AA60",
      error: "#D05858",
      info: "#60B0A8",
      background: "#1C2420",
      surface: "#252E2A",
      dialogSurface: "#141C18",
      thinkingBorder: "#384840",
      dimSeparator: "#485C54",
    },
  },

  {
    // Primary hue: CORAL/ORANGE-RED — dark near-black bg
    name: "Horizon",
    colors: {
      primary: "#FF6B4A",
      planMode: "#EE64AE",
      selection: "#29D398",
      thinking: "#FAB795",
      success: "#29D398",
      error: "#E95678",
      info: "#26BBD9",
      background: "#101018",
      surface: "#181820",
      dialogSurface: "#080810",
      thinkingBorder: "#282838",
      dimSeparator: "#383848",
    },
  },

  {
    // Primary hue: HOT MAGENTA — very dark blue-black bg
    name: "Cyberpunk",
    colors: {
      primary: "#FF2D9B",
      planMode: "#00F5D4",
      selection: "#00BBF9",
      thinking: "#FEE440",
      success: "#70E000",
      error: "#FF006E",
      info: "#00F5D4",
      background: "#040810",
      surface: "#080E18",
      dialogSurface: "#020508",
      thinkingBorder: "#102038",
      dimSeparator: "#203050",
    },
  },

  {
    // Primary hue: RUST/COPPER — lighter navy bg
    name: "Tokyo Storm",
    colors: {
      primary: "#D4724A",
      planMode: "#BB9AF7",
      selection: "#2AC3DE",
      thinking: "#E0AF68",
      success: "#9ECE6A",
      error: "#F7768E",
      info: "#7AA2F7",
      background: "#1A1E30",
      surface: "#24283E",
      dialogSurface: "#141828",
      thinkingBorder: "#363A60",
      dimSeparator: "#4A5080",
    },
  },

  {
    // Primary hue: MINT GREEN — pure black bg
    name: "Vesper",
    colors: {
      primary: "#70FFDC",
      planMode: "#FFB0D8",
      selection: "#80F0C0",
      thinking: "#FFB870",
      success: "#80F0C0",
      error: "#FF6868",
      info: "#70FFDC",
      background: "#080808",
      surface: "#101010",
      dialogSurface: "#040404",
      thinkingBorder: "#282828",
      dimSeparator: "#383838",
    },
  },

  {
    // Primary hue: VIOLET — medium-dark purple bg
    name: "Moonlight",
    colors: {
      primary: "#9B6DFF",
      planMode: "#FF9AC1",
      selection: "#70D8F8",
      thinking: "#FFC777",
      success: "#C3E88D",
      error: "#FF5868",
      info: "#65BCFF",
      background: "#1A1C30",
      surface: "#242840",
      dialogSurface: "#121420",
      thinkingBorder: "#363A60",
      dimSeparator: "#505888",
    },
  },
];

// export const DEFAULT_THEME = THEMES.find((t) => t.name === "Vitesse Dark")!;
export const DEFAULT_THEME = THEMES.find((t) => t.name === "Nightfox")!;
