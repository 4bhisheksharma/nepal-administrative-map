import type { Region } from '../core/models/region.js';

export interface RegionStyle {
  fill: string;
  outline?: string;
  outlineWidth?: number;
}

export interface RegionState {
  isSelected: boolean;
  isHovered: boolean;
  isHighlighted: boolean;
  isFocused: boolean;
  value?: unknown;
}

export type RegionStyleBuilder = (
  region: Region,
  state: RegionState,
) => RegionStyle;

/** Colours and line widths for the map. */
export interface NepalMapTheme {
  regionFill: string;
  hoverFill: string;
  selectedFill: string;
  selectedOutline: string;
  highlightOutline: string;
  focusOutline: string;
  borderColor: string;
  parentBorderColor: string;
  outlineColor: string;
  protectedAreaFill: string;
  noDataFill: string;
  protectedAreaOverlay: string;
  labelColor: string;
  labelHaloColor: string;
  borderWidth: number;
  parentBorderWidth: number;
  outlineWidth: number;
  background: string;
}

export function lightTheme(): NepalMapTheme {
  return {
    regionFill: '#e8eaf0',
    hoverFill: '#d4dcf5',
    selectedFill: '#c5cae9',
    selectedOutline: '#3949ab',
    highlightOutline: '#00897b',
    focusOutline: '#212121',
    borderColor: '#ffffff',
    parentBorderColor: '#78909c',
    outlineColor: '#546e7a',
    protectedAreaFill: '#f5f5f5',
    noDataFill: '#eceff1',
    protectedAreaOverlay: '#00897b',
    labelColor: '#212121',
    labelHaloColor: '#e8eaf0',
    borderWidth: 0.5,
    parentBorderWidth: 1.2,
    outlineWidth: 1.2,
    background: '#fafafa',
  };
}

export function darkTheme(): NepalMapTheme {
  return {
    regionFill: '#37474f',
    hoverFill: '#455a64',
    selectedFill: '#1a237e',
    selectedOutline: '#7986cb',
    highlightOutline: '#4db6ac',
    focusOutline: '#eceff1',
    borderColor: '#263238',
    parentBorderColor: '#90a4ae',
    outlineColor: '#b0bec5',
    protectedAreaFill: '#263238',
    noDataFill: '#455a64',
    protectedAreaOverlay: '#4db6ac',
    labelColor: '#eceff1',
    labelHaloColor: '#37474f',
    borderWidth: 0.5,
    parentBorderWidth: 1.2,
    outlineWidth: 1.2,
    background: '#121212',
  };
}

export function defaultStyle(
  theme: NepalMapTheme,
  _region: Region,
  state: RegionState,
): RegionStyle {
  let fill = theme.regionFill;
  if (state.isSelected) fill = theme.selectedFill;
  else if (state.isHovered) fill = theme.hoverFill;

  let outline: string | undefined;
  let outlineWidth = 2;
  if (state.isFocused) {
    outline = theme.focusOutline;
    outlineWidth = 2.5;
  } else if (state.isHighlighted) {
    outline = theme.highlightOutline;
    outlineWidth = 2.5;
  } else if (state.isSelected) {
    outline = theme.selectedOutline;
    outlineWidth = 2;
  }

  return { fill, outline, outlineWidth };
}
