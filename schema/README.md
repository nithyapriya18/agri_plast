# Database schema (Neon)

Run each SQL file in **order** in your Neon project’s SQL editor to create tables and objects.

1. `neon/00_authorized_users.sql` – Allowlist: only these emails can sign in  
2. `neon/01_users.sql` – Users (FK target for `user_id`)  
3. `neon/02_user_settings.sql` – User settings  
4. `neon/03_projects.sql` – Projects  
5. `neon/04_chat_messages.sql` – Chat messages  
6. `neon/05_project_snapshots.sql` – Project snapshots  
7. `neon/06_quotations.sql` – Quotations  
8. `neon/07_llm_usage.sql` – LLM usage + view  
9. `neon/08_planning_result_cache.sql` – Planning result cache  

Set `DATABASE_URL` in your app env to the Neon connection string.
