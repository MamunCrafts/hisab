import { sql, type SQL } from "drizzle-orm";
import { ACCOUNT_DIRECTION, LEDGER_SIGN } from "@/lib/finance/rules";

/**
 * SQL mirrors of lib/finance/rules.ts. Generated from the same constant tables
 * so the database aggregates and the TypeScript rules cannot drift apart.
 */

/** `CASE` expression: signed effect on the transaction's source account. */
export function sourceAccountDeltaSql(alias = "t"): SQL {
  const branches = Object.entries(ACCOUNT_DIRECTION)
    .map(([type, dir]) => `when '${type}' then ${dir === 1 ? "" : "-"}${alias}.amount`)
    .join(" ");
  return sql.raw(`(case ${alias}.type ${branches} else 0 end)`);
}

/** `CASE` expression: signed ledger value (positive = they owe me). */
export function ledgerDeltaSql(alias = "t"): SQL {
  const branches = Object.entries(LEDGER_SIGN)
    .map(([type, sign]) => `when '${type}' then ${sign === 1 ? "" : "-"}${alias}.amount`)
    .join(" ");
  return sql.raw(`(case ${alias}.type ${branches} else 0 end)`);
}

/**
 * Per-account balance deltas for one user: every source-side movement plus the
 * incoming side of transfers. Only rows with affects_account count.
 */
export function accountDeltasSubquery(userId: string): SQL {
  return sql`
    select t.account_id as account_id, ${sourceAccountDeltaSql("t")} as delta
      from transactions t
     where t.user_id = ${userId} and t.affects_account and t.account_id is not null
    union all
    select t.destination_account_id as account_id, t.amount as delta
      from transactions t
     where t.user_id = ${userId} and t.type = 'TRANSFER' and t.destination_account_id is not null`;
}
