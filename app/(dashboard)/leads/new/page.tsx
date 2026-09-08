import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { Card } from "@/components/ui/card";
import { LeadCreateForm } from "@/components/leads/lead-create-form";

export default async function NewLeadPage() {
  const dict = getDictionary(await getLocale());

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{dict.leads.newLead}</h1>
      <Card>
        <LeadCreateForm />
      </Card>
    </div>
  );
}
