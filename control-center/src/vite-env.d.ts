/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONTROL_CENTER_ENV?: 'development' | 'staging' | 'production';
  readonly VITE_CONTROL_CENTER_API_BASE_URL?: string;
  readonly VITE_CONTROL_CENTER_BUILD_LABEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
