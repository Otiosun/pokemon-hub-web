export type ControlCenterEnvironment = 'development' | 'staging' | 'production';

export interface ControlCenterConfig {
  environment: ControlCenterEnvironment;
  apiBaseUrl: string;
  buildLabel: string;
}

const ENVIRONMENTS = new Set<ControlCenterEnvironment>(['development', 'staging', 'production']);

function readEnvironment(value: string | undefined): ControlCenterEnvironment {
  const resolved = value ?? 'development';
  if (!ENVIRONMENTS.has(resolved as ControlCenterEnvironment)) {
    throw new Error(`Invalid VITE_CONTROL_CENTER_ENV: ${resolved}`);
  }
  return resolved as ControlCenterEnvironment;
}

function readApiBaseUrl(value: string | undefined, environment: ControlCenterEnvironment): string {
  if (value) return value.replace(/\/$/, '');
  if (environment === 'development') return 'http://localhost:8787';
  throw new Error('VITE_CONTROL_CENTER_API_BASE_URL is required outside development.');
}

export function loadControlCenterConfig(): ControlCenterConfig {
  const environment = readEnvironment(import.meta.env.VITE_CONTROL_CENTER_ENV);
  return {
    environment,
    apiBaseUrl: readApiBaseUrl(import.meta.env.VITE_CONTROL_CENTER_API_BASE_URL, environment),
    buildLabel: import.meta.env.VITE_CONTROL_CENTER_BUILD_LABEL ?? 'local',
  };
}
