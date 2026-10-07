import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

/** All monetary values are NUMERIC(18,2) and travel through the app as strings. */
const money = (name: string) => numeric(name, { precision: 18, scale: 2 });
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
const ownerId = () =>
  text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" });

export const accountTypeEnum = pgEnum("account_type", [
  "CASH",
  "BANK",
  "MOBILE_WALLET",
  "CARD",
  "SAVINGS",
  "OTHER",
]);

export const categoryKindEnum = pgEnum("category_kind", ["EXPENSE", "INCOME"]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "EXPENSE",
  "INCOME",
  "TRANSFER",
  "LEND",
  "BORROW",
  "DEBT_RECEIVED",
  "DEBT_PAID",
  "ADJUSTMENT",
]);

export const recurringFrequencyEnum = pgEnum("recurring_frequency", [
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "YEARLY",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "DEBT_DUE_TODAY",
  "DEBT_OVERDUE",
  "BUDGET_NEAR_LIMIT",
  "BUDGET_EXCEEDED",
  "RECURRING_UPCOMING",
]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: ownerId().unique(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  preferredCurrency: text("preferred_currency").notNull().default("BDT"),
  locale: text("locale").notNull().default("en"),
  timezone: text("timezone").notNull().default("Asia/Dhaka"),
  /** 0 = Sunday … 6 = Saturday. Bangladesh calendars commonly start on Saturday. */
  startOfWeek: smallint("start_of_week").notNull().default(6),
  theme: text("theme").notNull().default("system"),
  lastUsedAccountId: uuid("last_used_account_id"),
  onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: ownerId(),
    name: text("name").notNull(),
    type: accountTypeEnum("type").notNull(),
    currency: text("currency").notNull().default("BDT"),
    openingBalance: money("opening_balance").notNull().default("0"),
    icon: text("icon"),
    isArchived: boolean("is_archived").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("accounts_user_id_idx").on(t.userId),
    // Allows composite FKs that guarantee referenced accounts share the owner.
    unique("accounts_user_id_id_unique").on(t.userId, t.id),
  ],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: ownerId(),
    kind: categoryKindEnum("kind").notNull(),
    /** Stable key for starter categories so they can be translated. */
    systemKey: text("system_key"),
    /** Custom name. When null the translated name of `systemKey` is shown. */
    name: text("name"),
    icon: text("icon"),
    color: text("color"),
    isArchived: boolean("is_archived").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("categories_user_id_idx").on(t.userId),
    unique("categories_user_id_id_unique").on(t.userId, t.id),
    unique("categories_user_system_key_unique").on(t.userId, t.kind, t.systemKey),
    check("categories_name_present", sql`${t.name} is not null or ${t.systemKey} is not null`),
  ],
);

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: ownerId(),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    note: text("note"),
    avatarInitial: text("avatar_initial").notNull(),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("contacts_user_id_idx").on(t.userId),
    unique("contacts_user_id_id_unique").on(t.userId, t.id),
  ],
);

export const recurringRules = pgTable(
  "recurring_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: ownerId(),
    type: transactionTypeEnum("type").notNull(),
    amount: money("amount").notNull(),
    categoryId: uuid("category_id").notNull(),
    accountId: uuid("account_id").notNull(),
    title: text("title").notNull(),
    note: text("note"),
    frequency: recurringFrequencyEnum("frequency").notNull(),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }),
    nextOccurrence: date("next_occurrence", { mode: "string" }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("recurring_rules_user_id_idx").on(t.userId),
    index("recurring_rules_user_next_idx").on(t.userId, t.nextOccurrence),
    unique("recurring_rules_user_id_id_unique").on(t.userId, t.id),
    foreignKey({
      name: "recurring_rules_account_fk",
      columns: [t.userId, t.accountId],
      foreignColumns: [accounts.userId, accounts.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "recurring_rules_category_fk",
      columns: [t.userId, t.categoryId],
      foreignColumns: [categories.userId, categories.id],
    }).onDelete("cascade"),
    check("recurring_rules_amount_positive", sql`${t.amount} > 0`),
    check("recurring_rules_type", sql`${t.type} in ('EXPENSE', 'INCOME')`),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: ownerId(),
    type: transactionTypeEnum("type").notNull(),
    /** Always positive, except ADJUSTMENT which carries its sign. */
    amount: money("amount").notNull(),
    accountId: uuid("account_id"),
    destinationAccountId: uuid("destination_account_id"),
    categoryId: uuid("category_id"),
    contactId: uuid("contact_id"),
    recurringRuleId: uuid("recurring_rule_id"),
    transactionDate: date("transaction_date", { mode: "string" }).notNull(),
    dueDate: date("due_date", { mode: "string" }),
    title: text("title"),
    note: text("note"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    affectsAccount: boolean("affects_account").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("transactions_user_date_idx").on(t.userId, t.transactionDate),
    index("transactions_user_contact_idx").on(t.userId, t.contactId),
    index("transactions_account_idx").on(t.accountId),
    index("transactions_destination_account_idx").on(t.destinationAccountId),
    index("transactions_category_idx").on(t.categoryId),
    index("transactions_contact_idx").on(t.contactId),
    unique("transactions_user_id_id_unique").on(t.userId, t.id),
    // Composite FKs: a transaction can only reference rows owned by the same user.
    foreignKey({
      name: "transactions_account_fk",
      columns: [t.userId, t.accountId],
      foreignColumns: [accounts.userId, accounts.id],
    }),
    foreignKey({
      name: "transactions_destination_account_fk",
      columns: [t.userId, t.destinationAccountId],
      foreignColumns: [accounts.userId, accounts.id],
    }),
    foreignKey({
      name: "transactions_category_fk",
      columns: [t.userId, t.categoryId],
      foreignColumns: [categories.userId, categories.id],
    }),
    foreignKey({
      name: "transactions_contact_fk",
      columns: [t.userId, t.contactId],
      foreignColumns: [contacts.userId, contacts.id],
    }),
    foreignKey({
      name: "transactions_recurring_rule_fk",
      columns: [t.recurringRuleId],
      foreignColumns: [recurringRules.id],
    }).onDelete("set null"),
    check(
      "transactions_amount_sign",
      sql`${t.amount} <> 0 and (${t.type} = 'ADJUSTMENT' or ${t.amount} > 0)`,
    ),
    check(
      "transactions_shape",
      sql`case
        when ${t.type} in ('EXPENSE', 'INCOME') then ${t.accountId} is not null and ${t.categoryId} is not null and ${t.contactId} is null and ${t.destinationAccountId} is null and ${t.affectsAccount}
        when ${t.type} = 'TRANSFER' then ${t.accountId} is not null and ${t.destinationAccountId} is not null and ${t.accountId} <> ${t.destinationAccountId} and ${t.contactId} is null and ${t.affectsAccount}
        when ${t.type} = 'ADJUSTMENT' then ${t.accountId} is not null and ${t.destinationAccountId} is null and ${t.affectsAccount}
        else ${t.contactId} is not null and ${t.destinationAccountId} is null and (not ${t.affectsAccount} or ${t.accountId} is not null)
      end`,
    ),
  ],
);

export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: ownerId(),
    transactionId: uuid("transaction_id").notNull(),
    /** Storage key (private blob pathname or local dev path). Never a public URL. */
    storageKey: text("storage_key").notNull(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    originalName: text("original_name").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("attachments_user_id_idx").on(t.userId),
    unique("attachments_transaction_unique").on(t.transactionId),
    foreignKey({
      name: "attachments_transaction_fk",
      columns: [t.userId, t.transactionId],
      foreignColumns: [transactions.userId, transactions.id],
    }).onDelete("cascade"),
  ],
);

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: ownerId(),
    categoryId: uuid("category_id").notNull(),
    /** Monthly limit. */
    amount: money("amount").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("budgets_user_id_idx").on(t.userId),
    unique("budgets_user_category_unique").on(t.userId, t.categoryId),
    foreignKey({
      name: "budgets_category_fk",
      columns: [t.userId, t.categoryId],
      foreignColumns: [categories.userId, categories.id],
    }).onDelete("cascade"),
    check("budgets_amount_positive", sql`${t.amount} > 0`),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: ownerId(),
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    relatedEntityId: text("related_entity_id"),
    /** Parameters used to re-render the message in the viewer's language. */
    data: jsonb("data").$type<Record<string, string | number>>(),
    /** Prevents the scheduler from creating the same reminder twice. */
    dedupeKey: text("dedupe_key").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index("notifications_user_id_idx").on(t.userId, t.createdAt),
    unique("notifications_user_dedupe_unique").on(t.userId, t.dedupeKey),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Not a FK: audit rows describe deletions, including of the user. */
    userId: text("user_id").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [index("audit_logs_user_id_idx").on(t.userId, t.createdAt)],
);
