import { Image } from "react-native";
import Svg, {
  Path,
  Circle,
  Line,
  Rect,
  Polyline,
  G,
} from "react-native-svg";
import { colors } from "@/theme/colors";

export type IconName =
  | "search"
  | "bell"
  | "plus"
  | "sliders"
  | "check"
  | "close"
  | "arrow-up-right"
  | "arrow-right"
  | "user"
  | "users"
  | "trend-down"
  | "trend-up"
  | "spark"
  | "chevron-right"
  | "chevron-left"
  | "chevron-down"
  | "pencil"
  | "dots"
  | "send"
  | "home"
  | "wallet"
  | "tag"
  | "chart";

/**
 * Hand-drawn stroke icon set for paylika.
 * All paths live on a 24x24 grid, 1.75 stroke, round joins — no emoji,
 * no icon-font dependency, so the visual language stays fully ours.
 */
export function Icon({
  name,
  size = 22,
  color = colors.ink,
  strokeWidth = 1.75,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const stroke = {
    stroke: color,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === "search" && (
        <G {...stroke}>
          <Circle cx={11} cy={11} r={7} />
          <Line x1={21} y1={21} x2={16.5} y2={16.5} />
        </G>
      )}
      {name === "bell" && (
        <G {...stroke}>
          <Path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
          <Path d="M10.5 20a1.8 1.8 0 0 0 3 0" />
        </G>
      )}
      {name === "plus" && (
        <G {...stroke}>
          <Line x1={12} y1={5} x2={12} y2={19} />
          <Line x1={5} y1={12} x2={19} y2={12} />
        </G>
      )}
      {name === "sliders" && (
        <G {...stroke}>
          <Line x1={4} y1={8} x2={20} y2={8} />
          <Line x1={4} y1={16} x2={20} y2={16} />
          <Circle cx={9} cy={8} r={2.4} fill={color} stroke="none" />
          <Circle cx={16} cy={16} r={2.4} fill={color} stroke="none" />
        </G>
      )}
      {name === "check" && (
        <Polyline points="20 6 9 17 4 12" {...stroke} />
      )}
      {name === "close" && (
        <G {...stroke}>
          <Line x1={6} y1={6} x2={18} y2={18} />
          <Line x1={18} y1={6} x2={6} y2={18} />
        </G>
      )}
      {name === "arrow-up-right" && (
        <G {...stroke}>
          <Line x1={7} y1={17} x2={17} y2={7} />
          <Polyline points="8 7 17 7 17 16" />
        </G>
      )}
      {name === "arrow-right" && (
        <G {...stroke}>
          <Line x1={4} y1={12} x2={19} y2={12} />
          <Polyline points="13 6 19 12 13 18" />
        </G>
      )}
      {name === "user" && (
        <G {...stroke}>
          <Circle cx={12} cy={8} r={3.4} />
          <Path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
        </G>
      )}
      {name === "users" && (
        <G {...stroke}>
          <Circle cx={9} cy={8} r={3} />
          <Path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
          <Path d="M16 5.5a3 3 0 0 1 0 5.6" />
          <Path d="M17 14.2A5.5 5.5 0 0 1 20.5 19" />
        </G>
      )}
      {name === "trend-down" && (
        <G {...stroke}>
          <Polyline points="4 7 10 13 13 10 20 17" />
          <Polyline points="20 12 20 17 15 17" />
        </G>
      )}
      {name === "trend-up" && (
        <G {...stroke}>
          <Polyline points="4 17 10 11 13 14 20 7" />
          <Polyline points="15 7 20 7 20 12" />
        </G>
      )}
      {name === "spark" && (
        <Path
          d="M12 3v6M12 15v6M3 12h6M15 12h6"
          {...stroke}
        />
      )}
      {name === "chevron-right" && (
        <Polyline points="9 5 16 12 9 19" {...stroke} />
      )}
      {name === "chevron-left" && (
        <Polyline points="15 5 8 12 15 19" {...stroke} />
      )}
      {name === "chevron-down" && (
        <Polyline points="5 9 12 16 19 9" {...stroke} />
      )}
      {name === "pencil" && (
        <G {...stroke}>
          <Path d="M4 20h4L19 9a2 2 0 0 0-3-3L5 17v3Z" />
          <Line x1={14.5} y1={7.5} x2={17.5} y2={10.5} />
        </G>
      )}
      {name === "dots" && (
        <G fill={color}>
          <Circle cx={6} cy={12} r={1.7} />
          <Circle cx={12} cy={12} r={1.7} />
          <Circle cx={18} cy={12} r={1.7} />
        </G>
      )}
      {name === "send" && (
        <G {...stroke}>
          <Path d="M21 4 3 11l6 2 2 6 10-15Z" />
          <Line x1={9} y1={13} x2={13} y2={9} />
        </G>
      )}
      {name === "home" && (
        <G {...stroke}>
          <Path d="M4 11 12 4l8 7" />
          <Path d="M6 10v9h12v-9" />
        </G>
      )}
      {name === "wallet" && (
        <G {...stroke}>
          <Rect x={3} y={6} width={18} height={13} rx={3.5} />
          <Line x1={3} y1={10.5} x2={21} y2={10.5} />
          <Circle cx={16.5} cy={14.5} r={1.3} fill={color} stroke="none" />
        </G>
      )}
      {name === "tag" && (
        <G {...stroke}>
          <Path d="M4 4h7l9 9-7 7-9-9V4z" />
          <Circle cx={8} cy={8} r={1.4} fill={color} stroke="none" />
        </G>
      )}
      {name === "chart" && (
        <G fill={color}>
          <Rect x={4} y={11} width={3.6} height={9} rx={1.2} />
          <Rect x={10.2} y={6} width={3.6} height={14} rx={1.2} />
          <Rect x={16.4} y={14} width={3.6} height={6} rx={1.2} />
        </G>
      )}
    </Svg>
  );
}

/**
 * Paylika brand mark — a faithful SVG trace of the official logo:
 * a bordeaux "P" ribbon (stem + bowl, with a folded curl at the bottom-left)
 * and a white arrow that sweeps up from the lower-left and points right.
 *
 * Geometry lives in a 120x140 space. Fills flip for the favicon `tile`:
 *  - standalone: bordeaux body + white arrow (transparent background)
 *  - tile:       bordeaux rounded tile + white body + bordeaux arrow
 */
// Official Paylika mark — the real logo asset (transparent PNG), not a trace.
const MARK = require("../../assets/mark-square.png");

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <Image
      source={MARK}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityLabel="Paylika"
    />
  );
}
