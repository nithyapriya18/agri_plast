/**
 * Database adapter interface for Neon (agri_plast).
 * Pattern from mytplus/lib/db/interface.ts - do not modify mytplus.
 */

export interface AuthorizedUser {
  id: string;
  email: string;
  name: string;
}

export interface AppUser {
  id: string;
  email: string;
  name: string | null;
}

export interface UserSettingsRow {
  user_id: string;
  polyhouse_gap: number;
  max_side_length: number;
  min_side_length: number;
  min_corner_distance: number;
  gutter_width: number;
  block_width: number;
  block_height: number;
  safety_buffer: number;
  max_land_area: number;
  placement_strategy: string;
  solar_orientation_enabled: boolean;
  avoid_water: boolean;
  consider_slope: boolean;
  max_slope: number;
  land_leveling_override: boolean;
  company_name?: string | null;
  phone?: string | null;
  pricing_tier?: string | null;
  custom_pricing?: unknown;
  service_charge_percentage?: number | null;
  profit_margin_percentage?: number | null;
  gst_percentage?: number | null;
  transportation_cost_per_km?: number | null;
  installation_labor_rate?: number | null;
  [key: string]: unknown;
}

export interface ProjectRow {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  land_area_sqm: number;
  land_boundary: unknown;
  polyhouse_count: number;
  total_coverage_sqm: number;
  utilization_percentage: number;
  estimated_cost: number;
  polyhouses: unknown;
  quotation: unknown;
  configuration: unknown;
  status: string;
  created_at: string;
  updated_at: string;
  parent_project_id?: string | null;
  version?: number;
  version_name?: string | null;
  is_latest?: boolean;
  [key: string]: unknown;
}

export interface ProjectVersionInfo {
  id: string;
  version: number;
  version_name: string | null;
  created_at: string;
  is_latest: boolean;
}

export interface ChatMessageRow {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  content: string;
  created_at: string;
}

export interface LlmUsageRow {
  id: string;
  user_id: string;
  project_id?: string | null;
  operation_type: string;
  model_id: string;
  input_tokens: number;
  output_tokens: number;
  input_cost: number;
  output_cost: number;
  request_duration_ms?: number | null;
  success: boolean;
  error_message?: string | null;
  created_at: string;
}

export interface DatabaseAdapter {
  isUserAuthorized(email: string): Promise<boolean>;
  getAuthorizedUserByEmail(email: string): Promise<AuthorizedUser | null>;
  getOrCreateAppUser(email: string, name: string | null): Promise<AppUser | null>;
  getUserIdByEmail(email: string): Promise<string | null>;
  getUserSettings(userId: string): Promise<UserSettingsRow | null>;
  upsertUserSettings(userId: string, data: Partial<UserSettingsRow>): Promise<void>;
  getProjectsByUserId(userId: string): Promise<ProjectRow[]>;
  getProjectsByUserIdLatest(userId: string): Promise<ProjectRow[]>;
  getProjectById(projectId: string): Promise<ProjectRow | null>;
  insertProject(data: Omit<ProjectRow, 'id' | 'created_at' | 'updated_at'>): Promise<ProjectRow>;
  updateProject(projectId: string, data: Partial<ProjectRow>): Promise<void>;
  deleteProject(projectId: string): Promise<void>;
  insertChatMessage(projectId: string, userId: string, role: string, content: string): Promise<ChatMessageRow>;
  getChatMessagesByProjectId(projectId: string): Promise<ChatMessageRow[]>;
  insertLlmUsage(row: Omit<LlmUsageRow, 'id' | 'created_at'>): Promise<void>;
  getLlmUsageSummary(userId: string, startDate?: Date, endDate?: Date): Promise<{ totalTokens: number; totalCost: number; requestCount: number }>;
  getLlmUsageLogs(userId: string, options?: { startDate?: Date; endDate?: Date; projectId?: string; operationType?: string }): Promise<LlmUsageRow[]>;
  getLlmUsageStats(userId: string, startDate?: Date, endDate?: Date): Promise<unknown[]>;
  getPlanningResult(id: string): Promise<unknown | null>;
  setPlanningResult(id: string, result: unknown): Promise<void>;
  getProjectVersions(projectId: string): Promise<ProjectVersionInfo[]>;
  createProjectVersion(projectId: string, payload: { planningResult?: unknown; quotation?: unknown; versionName?: string }): Promise<ProjectRow>;
  getProjectByVersion(projectId: string, versionNumber: number): Promise<ProjectRow | null>;
}
