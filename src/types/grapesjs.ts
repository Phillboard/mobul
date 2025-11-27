/**
 * GrapesJS Type Definitions
 * 
 * Type definitions for GrapesJS data structures
 */

export interface GrapesJSComponent {
  type: string;
  tagName?: string;
  attributes?: Record<string, any>;
  classes?: string[];
  content?: string;
  components?: GrapesJSComponent[];
  style?: Record<string, string>;
}

export interface GrapesJSPage {
  frames: GrapesJSFrame[];
  styles?: GrapesJSStyle[];
  assets?: GrapesJSAsset[];
}

export interface GrapesJSFrame {
  id: string;
  component: GrapesJSComponent;
  head?: { type: string; content: string }[];
}

export interface GrapesJSStyle {
  selectors: string[];
  style: Record<string, string>;
}

export interface GrapesJSAsset {
  type: 'image' | 'video' | 'font';
  src: string;
  name?: string;
}

export interface GrapesJSProjectData {
  assets?: GrapesJSAsset[];
  styles?: GrapesJSStyle[];
  pages?: GrapesJSPage[];
  symbols?: any[];
  dataSources?: any[];
}

export type GrapesJSData = GrapesJSProjectData | Record<string, unknown>;

