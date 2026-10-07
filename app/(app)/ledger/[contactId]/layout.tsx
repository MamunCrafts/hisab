import { notFound } from "next/navigation";
import { getContact } from "@/db/queries/ledger";
import { requireUser } from "@/lib/auth/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ownership check outside the loading boundary, so other users' ids return a real 404. */
export default async function ContactLayout({ children, params }: LayoutProps<"/ledger/[contactId]">) {
  const user = await requireUser();
  const { contactId } = await params;
  if (!UUID.test(contactId) || !(await getContact(user.id, contactId))) notFound();
  return children;
}
