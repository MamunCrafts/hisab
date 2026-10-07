import { notFound } from "next/navigation";
import { transactionExists } from "@/db/queries/transactions";
import { requireUser } from "@/lib/auth/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ownership check outside the page's loading boundary, so missing records return a real 404. */
export default async function TransactionLayout({ children, params }: LayoutProps<"/transactions/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  if (!UUID.test(id) || !(await transactionExists(user.id, id))) notFound();
  return children;
}
