/**
 * Neon database adapter for agri_plast.
 * Pattern from mytplus/lib/db/neon.ts - do not modify mytplus.
 */

import { neon } from '@neondatabase/serverless';
import type { DatabaseAdapter, AuthorizedUser, AppUser, UserSettingsRow, ProjectRow, ChatMessageRow, LlmUsageRow, ProjectVersionInfo } from './interface';

let sqlClient: ReturnType<typeof neon> | null = null;

function getSql() {
  if (!sqlClient) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set. Set it in .env.local.');
    }
    sqlClient = neon(connectionString);
  }
  return sqlClient;
}

export class NeonDatabaseAdapter implements DatabaseAdapter {
  async isUserAuthorized(email: string): Promise<boolean> {
    const result = await getSql()`
      SELECT 1 FROM authorized_users WHERE LOWER(email) = LOWER(${email}) LIMIT 1
    ` as { length: number }[];
    return Array.isArray(result) && result.length > 0;
  }

  async getAuthorizedUserByEmail(email: string): Promise<AuthorizedUser | null> {
    const result = await getSql()`
      SELECT id, email, name FROM authorized_users WHERE LOWER(email) = LOWER(${email}) LIMIT 1
    ` as { id: string; email: string; name: string | null }[];
    if (!result?.length) return null;
    const row = result[0];
    return { id: row.id, email: row.email, name: row.name ?? row.email.split('@')[0] };
  }

  async getOrCreateAppUser(email: string, name: string | null): Promise<AppUser | null> {
    const authorized = await this.isUserAuthorized(email);
    if (!authorized) return null;
    const existing = await getSql()`
      SELECT id, email, name FROM users WHERE LOWER(email) = LOWER(${email}) LIMIT 1
    ` as { id: string; email: string; name: string | null }[];
    if (existing?.length) {
      const row = existing[0];
      if (name != null && row.name !== name) {
        await getSql()`UPDATE users SET name = ${name}, updated_at = now() WHERE id = ${row.id}`;
      }
      return { id: row.id, email: row.email, name: row.name ?? name };
    }
    const inserted = await getSql()`
      INSERT INTO users (email, name) VALUES (${email}, ${name})
      ON CONFLICT (email) DO UPDATE SET name = COALESCE(EXCLUDED.name, users.name), updated_at = now()
      RETURNING id, email, name
    ` as { id: string; email: string; name: string | null }[];
    if (!inserted?.length) return null;
    const row = inserted[0];
    await getSql()`
      INSERT INTO user_settings (user_id) VALUES (${row.id})
      ON CONFLICT (user_id) DO NOTHING
    `;
    return { id: row.id, email: row.email, name: row.name ?? name };
  }

  async getUserIdByEmail(email: string): Promise<string | null> {
    const result = await getSql()`
      SELECT id FROM users WHERE LOWER(email) = LOWER(${email}) LIMIT 1
    ` as { id: string }[];
    return result?.length ? result[0].id : null;
  }

  async getUserSettings(userId: string): Promise<UserSettingsRow | null> {
    const result = await getSql()`
      SELECT * FROM user_settings WHERE user_id = ${userId} LIMIT 1
    ` as UserSettingsRow[];
    return result?.length ? result[0] : null;
  }

  async upsertUserSettings(userId: string, data: Partial<UserSettingsRow>): Promise<void> {
    const current = await this.getUserSettings(userId);
    const defaults: Partial<UserSettingsRow> = {
      polyhouse_gap: 2, max_side_length: 120, min_side_length: 8, min_corner_distance: 4, gutter_width: 2, block_width: 8, block_height: 4,
      safety_buffer: 1, max_land_area: 10000, placement_strategy: 'balanced', solar_orientation_enabled: true, avoid_water: true, consider_slope: false, max_slope: 15, land_leveling_override: false,
      pricing_tier: 'standard', service_charge_percentage: 12, profit_margin_percentage: 22, gst_percentage: 18, transportation_cost_per_km: 18, installation_labor_rate: 75,
    };
    const merged = { ...defaults, ...current, ...data, user_id: userId } as UserSettingsRow;
    await getSql()`
      INSERT INTO user_settings (user_id, polyhouse_gap, max_side_length, min_side_length, min_corner_distance, gutter_width, block_width, block_height, safety_buffer, max_land_area, placement_strategy, solar_orientation_enabled, avoid_water, consider_slope, max_slope, land_leveling_override, company_name, phone, pricing_tier, custom_pricing, service_charge_percentage, profit_margin_percentage, gst_percentage, transportation_cost_per_km, installation_labor_rate)
      VALUES (${userId}, ${merged.polyhouse_gap ?? 2}, ${merged.max_side_length ?? 120}, ${merged.min_side_length ?? 8}, ${merged.min_corner_distance ?? 4}, ${merged.gutter_width ?? 2}, ${merged.block_width ?? 8}, ${merged.block_height ?? 4}, ${merged.safety_buffer ?? 1}, ${merged.max_land_area ?? 10000}, ${merged.placement_strategy ?? 'balanced'}, ${merged.solar_orientation_enabled ?? true}, ${merged.avoid_water ?? true}, ${merged.consider_slope ?? false}, ${merged.max_slope ?? 15}, ${merged.land_leveling_override ?? false}, ${merged.company_name ?? null}, ${merged.phone ?? null}, ${merged.pricing_tier ?? 'standard'}, ${merged.custom_pricing != null ? JSON.stringify(merged.custom_pricing) : null}, ${merged.service_charge_percentage ?? 12}, ${merged.profit_margin_percentage ?? 22}, ${merged.gst_percentage ?? 18}, ${merged.transportation_cost_per_km ?? 18}, ${merged.installation_labor_rate ?? 75})
      ON CONFLICT (user_id) DO UPDATE SET
        polyhouse_gap = EXCLUDED.polyhouse_gap, max_side_length = EXCLUDED.max_side_length, min_side_length = EXCLUDED.min_side_length, min_corner_distance = EXCLUDED.min_corner_distance, gutter_width = EXCLUDED.gutter_width, block_width = EXCLUDED.block_width, block_height = EXCLUDED.block_height, safety_buffer = EXCLUDED.safety_buffer, max_land_area = EXCLUDED.max_land_area, placement_strategy = EXCLUDED.placement_strategy, solar_orientation_enabled = EXCLUDED.solar_orientation_enabled, avoid_water = EXCLUDED.avoid_water, consider_slope = EXCLUDED.consider_slope, max_slope = EXCLUDED.max_slope, land_leveling_override = EXCLUDED.land_leveling_override, company_name = EXCLUDED.company_name, phone = EXCLUDED.phone, pricing_tier = EXCLUDED.pricing_tier, custom_pricing = EXCLUDED.custom_pricing, service_charge_percentage = EXCLUDED.service_charge_percentage, profit_margin_percentage = EXCLUDED.profit_margin_percentage, gst_percentage = EXCLUDED.gst_percentage, transportation_cost_per_km = EXCLUDED.transportation_cost_per_km, installation_labor_rate = EXCLUDED.installation_labor_rate, updated_at = now()
    `;
  }

  async getProjectsByUserId(userId: string): Promise<ProjectRow[]> {
    const result = await getSql()`
      SELECT * FROM projects WHERE user_id = ${userId} ORDER BY created_at DESC
    ` as ProjectRow[];
    return result ?? [];
  }

  async getProjectsByUserIdLatest(userId: string): Promise<ProjectRow[]> {
    try {
      const result = await getSql()`
        SELECT * FROM projects WHERE user_id = ${userId} AND (is_latest IS NULL OR is_latest = true) ORDER BY created_at DESC
      ` as ProjectRow[];
      return result ?? [];
    } catch {
      return this.getProjectsByUserId(userId);
    }
  }

  async getProjectById(projectId: string): Promise<ProjectRow | null> {
    const result = await getSql()`
      SELECT * FROM projects WHERE id = ${projectId} LIMIT 1
    ` as ProjectRow[];
    return result?.length ? result[0] : null;
  }

  async insertProject(data: Omit<ProjectRow, 'id' | 'created_at' | 'updated_at'>): Promise<ProjectRow> {
    const lb = typeof data.land_boundary === 'object' ? JSON.stringify(data.land_boundary) : String(data.land_boundary);
    const ph = typeof data.polyhouses === 'object' ? JSON.stringify(data.polyhouses) : String(data.polyhouses);
    const qt = typeof data.quotation === 'object' ? JSON.stringify(data.quotation) : String(data.quotation);
    const cf = typeof data.configuration === 'object' ? JSON.stringify(data.configuration) : String(data.configuration);
    const result = await getSql()`
      INSERT INTO projects (user_id, name, description, land_area_sqm, land_boundary, polyhouse_count, total_coverage_sqm, utilization_percentage, estimated_cost, polyhouses, quotation, configuration, status)
      VALUES (${data.user_id}, ${data.name}, ${data.description ?? null}, ${data.land_area_sqm}, ${lb}, ${data.polyhouse_count}, ${data.total_coverage_sqm}, ${data.utilization_percentage}, ${data.estimated_cost}, ${ph}, ${qt}, ${cf}, ${data.status ?? 'draft'})
      RETURNING *
    ` as ProjectRow[];
    if (!result?.length) throw new Error('Insert project failed');
    return result[0];
  }

  async updateProject(projectId: string, data: Partial<ProjectRow>): Promise<void> {
    const current = await this.getProjectById(projectId);
    if (!current) return;
    const merged = { ...current, ...data };
    await getSql()`
      UPDATE projects SET
        name = ${merged.name},
        description = ${merged.description ?? null},
        land_area_sqm = ${merged.land_area_sqm},
        land_boundary = ${typeof merged.land_boundary === 'object' ? JSON.stringify(merged.land_boundary) : merged.land_boundary},
        polyhouse_count = ${merged.polyhouse_count},
        total_coverage_sqm = ${merged.total_coverage_sqm},
        utilization_percentage = ${merged.utilization_percentage},
        estimated_cost = ${merged.estimated_cost},
        polyhouses = ${typeof merged.polyhouses === 'object' ? JSON.stringify(merged.polyhouses) : merged.polyhouses},
        quotation = ${typeof merged.quotation === 'object' ? JSON.stringify(merged.quotation) : merged.quotation},
        configuration = ${typeof merged.configuration === 'object' ? JSON.stringify(merged.configuration) : merged.configuration},
        status = ${merged.status ?? 'draft'},
        updated_at = now()
      WHERE id = ${projectId}
    `;
  }

  async deleteProject(projectId: string): Promise<void> {
    await getSql()`DELETE FROM projects WHERE id = ${projectId}`;
  }

  async insertChatMessage(projectId: string, userId: string, role: string, content: string): Promise<ChatMessageRow> {
    const result = await getSql()`
      INSERT INTO chat_messages (project_id, user_id, role, content) VALUES (${projectId}, ${userId}, ${role}, ${content})
      RETURNING *
    ` as ChatMessageRow[];
    if (!result?.length) throw new Error('Insert chat message failed');
    return result[0];
  }

  async getChatMessagesByProjectId(projectId: string): Promise<ChatMessageRow[]> {
    const result = await getSql()`
      SELECT * FROM chat_messages WHERE project_id = ${projectId} ORDER BY created_at ASC
    ` as ChatMessageRow[];
    return result ?? [];
  }

  async insertLlmUsage(row: Omit<LlmUsageRow, 'id' | 'created_at'>): Promise<void> {
    await getSql()`
      INSERT INTO llm_usage (user_id, project_id, operation_type, model_id, input_tokens, output_tokens, input_cost, output_cost, request_duration_ms, success, error_message)
      VALUES (${row.user_id}, ${row.project_id ?? null}, ${row.operation_type}, ${row.model_id}, ${row.input_tokens}, ${row.output_tokens}, ${row.input_cost}, ${row.output_cost}, ${row.request_duration_ms ?? null}, ${row.success ?? true}, ${row.error_message ?? null})
    `;
  }

  async getLlmUsageSummary(userId: string, startDate?: Date, endDate?: Date): Promise<{ totalTokens: number; totalCost: number; requestCount: number }> {
    const result = startDate && endDate
      ? await getSql()`
          SELECT COALESCE(SUM(total_tokens),0)::bigint as total_tokens, COALESCE(SUM(total_cost),0) as total_cost, COUNT(*)::int as request_count
          FROM llm_usage WHERE user_id = ${userId} AND success = true AND created_at >= ${startDate.toISOString()} AND created_at <= ${endDate.toISOString()}
        `
      : startDate
        ? await getSql()`
            SELECT COALESCE(SUM(total_tokens),0)::bigint as total_tokens, COALESCE(SUM(total_cost),0) as total_cost, COUNT(*)::int as request_count
            FROM llm_usage WHERE user_id = ${userId} AND success = true AND created_at >= ${startDate.toISOString()}
          `
        : endDate
          ? await getSql()`
              SELECT COALESCE(SUM(total_tokens),0)::bigint as total_tokens, COALESCE(SUM(total_cost),0) as total_cost, COUNT(*)::int as request_count
              FROM llm_usage WHERE user_id = ${userId} AND success = true AND created_at <= ${endDate.toISOString()}
            `
          : await getSql()`
              SELECT COALESCE(SUM(total_tokens),0)::bigint as total_tokens, COALESCE(SUM(total_cost),0) as total_cost, COUNT(*)::int as request_count
              FROM llm_usage WHERE user_id = ${userId} AND success = true
            `;
    const rows = result as { total_tokens: string | number; total_cost: string | number; request_count: string | number }[];
    const row = rows?.[0];
    if (!row) return { totalTokens: 0, totalCost: 0, requestCount: 0 };
    return {
      totalTokens: Number(row.total_tokens ?? 0),
      totalCost: Number(row.total_cost ?? 0),
      requestCount: Number(row.request_count ?? 0),
    };
  }

  async getLlmUsageLogs(
    userId: string,
    options?: { startDate?: Date; endDate?: Date; projectId?: string; operationType?: string }
  ): Promise<LlmUsageRow[]> {
    const sql = getSql();
    let result: LlmUsageRow[];
    if (options?.startDate && options?.endDate && options?.projectId && options?.operationType) {
      result = await sql`SELECT * FROM llm_usage WHERE user_id = ${userId} AND success = true AND created_at >= ${options.startDate.toISOString()} AND created_at <= ${options.endDate.toISOString()} AND project_id = ${options.projectId} AND operation_type = ${options.operationType} ORDER BY created_at DESC LIMIT 1000` as LlmUsageRow[];
    } else if (options?.startDate && options?.endDate) {
      result = await sql`SELECT * FROM llm_usage WHERE user_id = ${userId} AND success = true AND created_at >= ${options.startDate.toISOString()} AND created_at <= ${options.endDate.toISOString()} ORDER BY created_at DESC LIMIT 1000` as LlmUsageRow[];
    } else if (options?.projectId) {
      result = await sql`SELECT * FROM llm_usage WHERE user_id = ${userId} AND success = true AND project_id = ${options.projectId} ORDER BY created_at DESC LIMIT 1000` as LlmUsageRow[];
    } else if (options?.operationType) {
      result = await sql`SELECT * FROM llm_usage WHERE user_id = ${userId} AND success = true AND operation_type = ${options.operationType} ORDER BY created_at DESC LIMIT 1000` as LlmUsageRow[];
    } else {
      result = await sql`SELECT * FROM llm_usage WHERE user_id = ${userId} AND success = true ORDER BY created_at DESC LIMIT 1000` as LlmUsageRow[];
    }
    if (options?.startDate && !options?.endDate && result) {
      result = result.filter((r) => new Date(r.created_at) >= (options.startDate as Date));
    }
    if (options?.endDate && !options?.startDate && result) {
      result = result.filter((r) => new Date(r.created_at) <= (options.endDate as Date));
    }
    return result ?? [];
  }

  async getLlmUsageStats(userId: string, startDate?: Date, endDate?: Date): Promise<unknown[]> {
    const sql = getSql();
    let result: unknown[];
    if (startDate && endDate) {
      result = await sql`SELECT * FROM llm_usage_stats WHERE user_id = ${userId} AND usage_date >= ${startDate.toISOString().split('T')[0]} AND usage_date <= ${endDate.toISOString().split('T')[0]}` as unknown[];
    } else if (startDate) {
      result = await sql`SELECT * FROM llm_usage_stats WHERE user_id = ${userId} AND usage_date >= ${startDate.toISOString().split('T')[0]}` as unknown[];
    } else if (endDate) {
      result = await sql`SELECT * FROM llm_usage_stats WHERE user_id = ${userId} AND usage_date <= ${endDate.toISOString().split('T')[0]}` as unknown[];
    } else {
      result = await sql`SELECT * FROM llm_usage_stats WHERE user_id = ${userId}` as unknown[];
    }
    return result ?? [];
  }

  async getPlanningResult(id: string): Promise<unknown | null> {
    const result = await getSql()`
      SELECT result FROM planning_result_cache WHERE id = ${id} LIMIT 1
    ` as { result: unknown }[];
    return result?.length ? result[0].result : null;
  }

  async setPlanningResult(id: string, result: unknown): Promise<void> {
    const json = JSON.stringify(result);
    await getSql()`
      INSERT INTO planning_result_cache (id, result) VALUES (${id}, ${json})
      ON CONFLICT (id) DO UPDATE SET result = EXCLUDED.result, created_at = now()
    `;
  }

  async getProjectVersions(projectId: string): Promise<ProjectVersionInfo[]> {
    const project = await this.getProjectById(projectId);
    if (!project) return [];
    const rootId = (project as ProjectRow & { parent_project_id?: string }).parent_project_id ?? projectId;
    const result = await getSql()`
      SELECT id, version, version_name, created_at, is_latest
      FROM projects
      WHERE id = ${rootId} OR parent_project_id = ${rootId}
      ORDER BY version DESC
    ` as { id: string; version: number; version_name: string | null; created_at: string; is_latest: boolean }[];
    if (!result?.length) {
      return [{ id: project.id, version: (project as ProjectRow & { version?: number }).version ?? 1, version_name: (project as ProjectRow & { version_name?: string }).version_name ?? null, created_at: project.created_at, is_latest: (project as ProjectRow & { is_latest?: boolean }).is_latest ?? true }];
    }
    return result.map((r) => ({ id: r.id, version: r.version, version_name: r.version_name, created_at: r.created_at, is_latest: r.is_latest }));
  }

  async createProjectVersion(projectId: string, payload: { planningResult?: { landArea?: number; polyhouses?: unknown }; quotation?: unknown; versionName?: string }): Promise<ProjectRow> {
    const current = await this.getProjectById(projectId);
    if (!current) throw new Error('Project not found');
    const rootId = (current as ProjectRow & { parent_project_id?: string }).parent_project_id ?? projectId;
    const curVersion = (current as ProjectRow & { version?: number }).version ?? 1;
    const newVersion = curVersion + 1;
    await getSql()`
      UPDATE projects SET is_latest = false
      WHERE id = ${rootId} OR parent_project_id = ${rootId}
    `;
    const pr = payload.planningResult;
    const landArea = pr?.landArea ?? current.land_area_sqm;
    const polyhouses = pr?.polyhouses ?? current.polyhouses;
    const quotation = payload.quotation ?? current.quotation;
    const lb = typeof current.land_boundary === 'object' ? JSON.stringify(current.land_boundary) : String(current.land_boundary);
    const ph = typeof polyhouses === 'object' ? JSON.stringify(polyhouses) : String(polyhouses);
    const qt = typeof quotation === 'object' ? JSON.stringify(quotation) : String(quotation);
    const cf = typeof current.configuration === 'object' ? JSON.stringify(current.configuration) : String(current.configuration);
    const result = await getSql()`
      INSERT INTO projects (user_id, name, description, land_area_sqm, land_boundary, polyhouse_count, total_coverage_sqm, utilization_percentage, estimated_cost, polyhouses, quotation, configuration, status, parent_project_id, version, version_name, is_latest)
      VALUES (${current.user_id}, ${current.name}, ${current.description ?? null}, ${landArea}, ${lb}, ${current.polyhouse_count}, ${current.total_coverage_sqm}, ${current.utilization_percentage}, ${current.estimated_cost}, ${ph}, ${qt}, ${cf}, ${current.status ?? 'draft'}, ${rootId}, ${newVersion}, ${payload.versionName ?? null}, true)
      RETURNING *
    ` as ProjectRow[];
    if (!result?.length) throw new Error('Insert project version failed');
    return result[0];
  }

  async getProjectByVersion(projectId: string, versionNumber: number): Promise<ProjectRow | null> {
    const project = await this.getProjectById(projectId);
    if (!project) return null;
    const rootId = (project as ProjectRow & { parent_project_id?: string }).parent_project_id ?? projectId;
    const result = await getSql()`
      SELECT * FROM projects
      WHERE (id = ${rootId} OR parent_project_id = ${rootId}) AND version = ${versionNumber}
      LIMIT 1
    ` as ProjectRow[];
    return result?.length ? result[0] : null;
  }
}

export const dbAdapter = new NeonDatabaseAdapter();
