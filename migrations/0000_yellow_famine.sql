CREATE TABLE "apple_calendar_credentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"apple_id" varchar NOT NULL,
	"app_password" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "asana_user_credentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"asana_user_id" varchar NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"expires_at" timestamp,
	"scope" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "asana_user_credentials_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar,
	"user_id" varchar,
	"action" varchar NOT NULL,
	"resource_type" varchar,
	"resource_id" varchar,
	"metadata" jsonb,
	"ip_address" varchar,
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "changelog_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"commit_hash" varchar(40),
	"author" varchar,
	"summary" text NOT NULL,
	"description" text,
	"entry_type" varchar DEFAULT 'other',
	"entry_date" timestamp NOT NULL,
	"is_manual" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "changelog_sync_state" (
	"id" serial PRIMARY KEY NOT NULL,
	"last_commit_hash" varchar(40),
	"last_sync_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conversation_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"joined_at" timestamp DEFAULT now(),
	"last_read_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar,
	"name" varchar,
	"is_group" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_hub_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" varchar(10) NOT NULL,
	"section" varchar NOT NULL,
	"content" text NOT NULL,
	"author_id" varchar,
	"author_initials" varchar(10),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_hub_pinned_announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"section" varchar NOT NULL,
	"content" text NOT NULL,
	"start_date" varchar(10) NOT NULL,
	"end_date" varchar(10),
	"author_id" varchar,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_layouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"description" varchar,
	"blocks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"preview_html" text,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_signatures" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"gmail_account_id" integer,
	"name" varchar NOT NULL,
	"html_content" text NOT NULL,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_type" varchar NOT NULL,
	"subject" varchar NOT NULL,
	"html_content" text NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "email_templates_template_type_unique" UNIQUE("template_type")
);
--> statement-breakpoint
CREATE TABLE "email_verification_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"token" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "email_verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "event_outbox" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(64) NOT NULL,
	"event_type" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "extension_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"token" varchar NOT NULL,
	"device_label" varchar,
	"last_used_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "extension_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "feed_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"time" text NOT NULL,
	"sender" text,
	"avatar" text,
	"urgent" boolean DEFAULT false NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"type" varchar NOT NULL,
	"title" varchar NOT NULL,
	"description" text NOT NULL,
	"status" varchar DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "integration_api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar,
	"user_id" varchar NOT NULL,
	"integration_name" varchar NOT NULL,
	"api_key" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar NOT NULL,
	"ip_address" varchar,
	"user_agent" varchar,
	"success" boolean DEFAULT false,
	"failure_reason" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"sender_id" varchar NOT NULL,
	"parent_id" integer,
	"content" text NOT NULL,
	"file_url" varchar,
	"file_name" varchar,
	"file_type" varchar,
	"created_at" timestamp DEFAULT now(),
	"edited_at" timestamp,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "notification_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"type" varchar NOT NULL,
	"title" varchar NOT NULL,
	"message" text,
	"metadata" jsonb,
	"sent_via" varchar NOT NULL,
	"sent_at" timestamp DEFAULT now(),
	"read_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"email_task_assigned" boolean DEFAULT true,
	"email_task_due" boolean DEFAULT true,
	"email_calendar_conflict" boolean DEFAULT true,
	"email_important_emails" boolean DEFAULT false,
	"email_daily_digest" boolean DEFAULT false,
	"push_enabled" boolean DEFAULT false,
	"push_subscription" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "notification_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "oauth_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"provider" varchar NOT NULL,
	"provider_account_id" varchar NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"expires_at" timestamp,
	"label" varchar,
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"token" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "project_columns" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"name" varchar NOT NULL,
	"color" varchar DEFAULT '#6b7280',
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_labels" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"name" varchar NOT NULL,
	"color" varchar DEFAULT '#6b7280'
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"role" varchar DEFAULT 'member',
	"added_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar,
	"name" varchar NOT NULL,
	"description" text,
	"color" varchar DEFAULT '#3b82f6',
	"owner_id" varchar NOT NULL,
	"is_archived" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "qr_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"qr_code_id" varchar NOT NULL,
	"qr_name" varchar NOT NULL,
	"qr_type" varchar DEFAULT 'dynamic' NOT NULL,
	"destination_url" text NOT NULL,
	"short_url" text,
	"qr_image_url" text,
	"category" varchar DEFAULT 'general',
	"scans" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"icon" text NOT NULL,
	"color_class" text NOT NULL,
	"connected" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shared_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar NOT NULL,
	"shared_by_user_id" varchar NOT NULL,
	"item_type" varchar NOT NULL,
	"item_id" varchar NOT NULL,
	"title" varchar,
	"preview" text,
	"note" text,
	"metadata" jsonb,
	"shared_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "site_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "slack_channel_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"channel_id" varchar NOT NULL,
	"channel_name" varchar NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "slack_dm_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"conversation_id" varchar NOT NULL,
	"conversation_name" varchar NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "slack_user_credentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"slack_user_id" varchar NOT NULL,
	"slack_team_id" varchar NOT NULL,
	"access_token" text NOT NULL,
	"scope" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "slack_user_credentials_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "task_collaborators" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"role" varchar DEFAULT 'viewer',
	"added_at" timestamp DEFAULT now(),
	"added_by_id" varchar
);
--> statement-breakpoint
CREATE TABLE "task_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"author_id" varchar NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"edited_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "task_dependencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"depends_on_task_id" integer NOT NULL,
	"dependency_type" varchar DEFAULT 'finish_to_start',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_projects" (
	"tenant_id" varchar(64) NOT NULL,
	"task_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"column_id" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"order_key" text,
	"added_by" varchar(128) NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_projects_task_id_project_id_pk" PRIMARY KEY("task_id","project_id")
);
--> statement-breakpoint
CREATE TABLE "task_stories" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar(64) NOT NULL,
	"task_id" integer NOT NULL,
	"story_type" text NOT NULL,
	"author_id" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"body" text,
	"activity_type" text,
	"activity_payload" jsonb,
	"is_edited" boolean DEFAULT false NOT NULL,
	"edited_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "task_subtasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"title" varchar NOT NULL,
	"is_completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "task_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar,
	"creator_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"default_title" varchar,
	"default_description" text,
	"default_priority" varchar DEFAULT 'medium',
	"default_labels" text[],
	"subtasks" text[],
	"is_shared" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar,
	"project_id" integer NOT NULL,
	"column_id" integer,
	"title" varchar NOT NULL,
	"description" text,
	"priority" varchar DEFAULT 'medium',
	"start_date" timestamp,
	"due_date" timestamp,
	"progress" integer DEFAULT 0,
	"is_milestone" boolean DEFAULT false,
	"assignee_id" varchar,
	"creator_id" varchar NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"is_archived" boolean DEFAULT false,
	"archived_at" timestamp,
	"is_recurring" boolean DEFAULT false,
	"recurrence_pattern" varchar,
	"recurrence_interval" integer DEFAULT 1,
	"recurrence_end_date" timestamp,
	"parent_task_id" integer,
	"labels" text[],
	"asana_task_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tenant_invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar NOT NULL,
	"email" varchar NOT NULL,
	"role" varchar DEFAULT 'member' NOT NULL,
	"token" varchar NOT NULL,
	"invited_by" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "tenant_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "tenant_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"role" varchar DEFAULT 'member' NOT NULL,
	"invited_by" varchar,
	"invited_at" timestamp,
	"joined_at" timestamp DEFAULT now(),
	"last_active_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"slug" varchar NOT NULL,
	"logo_url" varchar,
	"sso_enabled" boolean DEFAULT false,
	"sso_provider" varchar,
	"sso_config" jsonb,
	"plan" varchar DEFAULT 'free',
	"max_users" integer DEFAULT 5,
	"settings" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "time_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer,
	"project_id" integer,
	"user_id" varchar NOT NULL,
	"description" text,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"duration" integer,
	"is_billable" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "two_factor_secrets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"secret" varchar NOT NULL,
	"enabled" boolean DEFAULT false,
	"backup_codes" text[],
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "two_factor_secrets_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_disabled_integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"integration_name" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar,
	"user_id" varchar NOT NULL,
	"google_calendar_color" varchar DEFAULT '#3b82f6',
	"apple_calendar_color" varchar DEFAULT '#22c55e',
	"zoom_color" varchar DEFAULT '#a855f7',
	"theme" varchar DEFAULT 'light',
	"notify_gmail" boolean DEFAULT true,
	"notify_slack" boolean DEFAULT true,
	"notify_calendar" boolean DEFAULT true,
	"notify_zoom" boolean DEFAULT true,
	"notify_asana" boolean DEFAULT true,
	"notify_chat" boolean DEFAULT true,
	"notify_in_app" boolean DEFAULT true,
	"notify_email" boolean DEFAULT false,
	"notify_sound" boolean DEFAULT true,
	"notification_sound_type" varchar DEFAULT 'chime',
	"quiet_hours_enabled" boolean DEFAULT false,
	"quiet_hours_start" varchar DEFAULT '22:00',
	"quiet_hours_end" varchar DEFAULT '08:00',
	"show_online_status" boolean DEFAULT true,
	"timezone" varchar DEFAULT 'America/New_York',
	"date_format" varchar DEFAULT 'MM/DD/YYYY',
	"first_day_of_week" varchar DEFAULT 'sunday',
	"dashboard_widgets" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"password_hash" varchar,
	"email_verified" boolean DEFAULT false,
	"is_admin" boolean DEFAULT false,
	"approval_status" varchar DEFAULT 'pending',
	"approval_date" timestamp,
	"approved_by" varchar,
	"first_login_at" timestamp,
	"last_login_at" timestamp,
	"yhctime_employee_id" varchar,
	"yhctime_employee_name" varchar,
	"has_completed_tour" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"webhook_id" integer NOT NULL,
	"event" varchar NOT NULL,
	"payload" jsonb NOT NULL,
	"response_status" integer,
	"response_body" text,
	"success" boolean DEFAULT false,
	"attempts" integer DEFAULT 1,
	"delivered_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" varchar,
	"name" varchar NOT NULL,
	"url" varchar NOT NULL,
	"secret" varchar,
	"events" text[] NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "apple_calendar_credentials" ADD CONSTRAINT "apple_calendar_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asana_user_credentials" ADD CONSTRAINT "asana_user_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_hub_entries" ADD CONSTRAINT "daily_hub_entries_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_hub_pinned_announcements" ADD CONSTRAINT "daily_hub_pinned_announcements_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_signatures" ADD CONSTRAINT "email_signatures_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_signatures" ADD CONSTRAINT "email_signatures_gmail_account_id_oauth_accounts_id_fk" FOREIGN KEY ("gmail_account_id") REFERENCES "public"."oauth_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extension_tokens" ADD CONSTRAINT "extension_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_items" ADD CONSTRAINT "feed_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_entries" ADD CONSTRAINT "feedback_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_entries" ADD CONSTRAINT "feedback_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_api_keys" ADD CONSTRAINT "integration_api_keys_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_api_keys" ADD CONSTRAINT "integration_api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_columns" ADD CONSTRAINT "project_columns_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_labels" ADD CONSTRAINT "project_labels_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_items" ADD CONSTRAINT "shared_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_items" ADD CONSTRAINT "shared_items_shared_by_user_id_users_id_fk" FOREIGN KEY ("shared_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slack_channel_preferences" ADD CONSTRAINT "slack_channel_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slack_dm_preferences" ADD CONSTRAINT "slack_dm_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slack_user_credentials" ADD CONSTRAINT "slack_user_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_collaborators" ADD CONSTRAINT "task_collaborators_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_collaborators" ADD CONSTRAINT "task_collaborators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_collaborators" ADD CONSTRAINT "task_collaborators_added_by_id_users_id_fk" FOREIGN KEY ("added_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_depends_on_task_id_tasks_id_fk" FOREIGN KEY ("depends_on_task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_projects" ADD CONSTRAINT "task_projects_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_projects" ADD CONSTRAINT "task_projects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_projects" ADD CONSTRAINT "task_projects_column_id_project_columns_id_fk" FOREIGN KEY ("column_id") REFERENCES "public"."project_columns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_stories" ADD CONSTRAINT "task_stories_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_subtasks" ADD CONSTRAINT "task_subtasks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_column_id_project_columns_id_fk" FOREIGN KEY ("column_id") REFERENCES "public"."project_columns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_invitations" ADD CONSTRAINT "tenant_invitations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_invitations" ADD CONSTRAINT "tenant_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "two_factor_secrets" ADD CONSTRAINT "two_factor_secrets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_disabled_integrations" ADD CONSTRAINT "user_disabled_integrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhook_id_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_tenant" ON "audit_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_audit_user" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_action" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_audit_created" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "changelog_by_date" ON "changelog_entries" USING btree ("entry_date");--> statement-breakpoint
CREATE INDEX "changelog_by_hash" ON "changelog_entries" USING btree ("commit_hash");--> statement-breakpoint
CREATE INDEX "daily_hub_by_date" ON "daily_hub_entries" USING btree ("date");--> statement-breakpoint
CREATE INDEX "daily_hub_by_section" ON "daily_hub_entries" USING btree ("section");--> statement-breakpoint
CREATE INDEX "pinned_by_section" ON "daily_hub_pinned_announcements" USING btree ("section");--> statement-breakpoint
CREATE INDEX "pinned_by_dates" ON "daily_hub_pinned_announcements" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "idx_email_signatures_user" ON "email_signatures" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_email_signatures_account" ON "email_signatures" USING btree ("gmail_account_id");--> statement-breakpoint
CREATE INDEX "idx_email_verification_user" ON "email_verification_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_email_verification_token" ON "email_verification_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "event_outbox_pending" ON "event_outbox" USING btree ("published_at","created_at");--> statement-breakpoint
CREATE INDEX "event_outbox_tenant_type" ON "event_outbox" USING btree ("tenant_id","event_type");--> statement-breakpoint
CREATE INDEX "idx_extension_token_user" ON "extension_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_extension_token_token" ON "extension_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_feedback_tenant" ON "feedback_entries" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_feedback_status" ON "feedback_entries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_login_attempts_email" ON "login_attempts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_login_attempts_ip" ON "login_attempts" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX "idx_login_attempts_created" ON "login_attempts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_notif_log_user" ON "notification_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notif_log_type" ON "notification_log" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_notif_pref_user" ON "notification_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_column_project" ON "project_columns" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_label_project" ON "project_labels" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_pmember_project" ON "project_members" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_pmember_user" ON "project_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_project_tenant" ON "projects" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_project_owner" ON "projects" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "qr_codes_user" ON "qr_codes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "idx_shared_item_tenant" ON "shared_items" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_shared_item_type" ON "shared_items" USING btree ("item_type");--> statement-breakpoint
CREATE UNIQUE INDEX "site_settings_key" ON "site_settings" USING btree ("key");--> statement-breakpoint
CREATE INDEX "idx_collab_task" ON "task_collaborators" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_collab_user" ON "task_collaborators" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_collab_unique" ON "task_collaborators" USING btree ("task_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_comment_task" ON "task_comments" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_dep_task" ON "task_dependencies" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_dep_depends_on" ON "task_dependencies" USING btree ("depends_on_task_id");--> statement-breakpoint
CREATE INDEX "task_projects_by_project" ON "task_projects" USING btree ("tenant_id","project_id","column_id","sort_order");--> statement-breakpoint
CREATE INDEX "task_projects_by_task" ON "task_projects" USING btree ("tenant_id","task_id");--> statement-breakpoint
CREATE INDEX "task_stories_by_task" ON "task_stories" USING btree ("tenant_id","task_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_subtask_task" ON "task_subtasks" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_template_tenant" ON "task_templates" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_template_creator" ON "task_templates" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "idx_task_tenant" ON "tasks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_task_project" ON "tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_task_column" ON "tasks" USING btree ("column_id");--> statement-breakpoint
CREATE INDEX "idx_task_assignee" ON "tasks" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "idx_task_due" ON "tasks" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "idx_task_start" ON "tasks" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "idx_task_asana" ON "tasks" USING btree ("asana_task_id");--> statement-breakpoint
CREATE INDEX "idx_tenant_user_tenant" ON "tenant_users" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_tenant_user_user" ON "tenant_users" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_time_entry_task" ON "time_entries" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_time_entry_project" ON "time_entries" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_time_entry_user" ON "time_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_delivery_webhook" ON "webhook_deliveries" USING btree ("webhook_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_delivery_event" ON "webhook_deliveries" USING btree ("event");--> statement-breakpoint
CREATE INDEX "idx_webhook_tenant" ON "webhooks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_active" ON "webhooks" USING btree ("is_active");