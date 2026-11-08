/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITEST?: string | boolean;
  readonly MODE?: string;
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_GROQ_API_KEY?: string;
  readonly VITE_OPENROUTER_API_KEY?: string;
  readonly [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env?: ImportMetaEnv;
}
