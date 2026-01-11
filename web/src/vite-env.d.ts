/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// react-quill type declarations
declare module 'react-quill' {
  import { Component } from 'react';

  interface QuillOptions {
    debug?: string | boolean;
    modules?: Record<string, unknown>;
    placeholder?: string;
    readOnly?: boolean;
    theme?: string;
    formats?: string[];
    bounds?: string | HTMLElement;
    scrollingContainer?: string | HTMLElement | null;
    strict?: boolean;
  }

  interface ReactQuillProps {
    bounds?: string | HTMLElement;
    children?: React.ReactNode;
    className?: string;
    defaultValue?: string;
    formats?: string[];
    id?: string;
    modules?: Record<string, unknown>;
    onChange?: (
      value: string,
      delta: unknown,
      source: string,
      editor: unknown
    ) => void;
    onChangeSelection?: (range: unknown, source: string, editor: unknown) => void;
    onFocus?: (range: unknown, source: string, editor: unknown) => void;
    onBlur?: (previousRange: unknown, source: string, editor: unknown) => void;
    onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
    onKeyPress?: React.KeyboardEventHandler<HTMLDivElement>;
    onKeyUp?: React.KeyboardEventHandler<HTMLDivElement>;
    placeholder?: string;
    preserveWhitespace?: boolean;
    readOnly?: boolean;
    scrollingContainer?: string | HTMLElement | null;
    style?: React.CSSProperties;
    tabIndex?: number;
    theme?: string;
    value?: string;
  }

  export default class ReactQuill extends Component<ReactQuillProps> {
    focus(): void;
    blur(): void;
    getEditor(): unknown;
  }
}

declare module 'react-quill/dist/quill.snow.css';
