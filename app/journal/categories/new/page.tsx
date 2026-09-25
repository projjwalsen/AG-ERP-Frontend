"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FolderPlus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataSelect, type DataSelectOption } from "@/components/ui/data-select";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { PageHeader } from "@/components/layout";
import { journalCategoryApi, journalHeadApi } from "@/app/services/journal.service";
import { getJournalHeadPath, JournalHead } from "@/app/types/journal";

export default function NewJournalCategoryPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [name, setName] = React.useState("");
  const [journalHeadId, setJournalHeadId] = React.useState("");
  const [heads, setHeads] = React.useState<JournalHead[]>([]);
  const [loadingHeads, setLoadingHeads] = React.useState(true);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    journalHeadApi.list({ headType: "SUBHEAD", isActive: true })
      .then((response) => {
        if (response.success) setHeads(response.data?.journalHeads ?? []);
        else addToast(response.message || "Failed to load subheads", "error");
      })
      .catch((error: any) => addToast(error?.message || "Failed to load subheads", "error"))
      .finally(() => setLoadingHeads(false));
  }, [addToast]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      addToast("Category name is required", "error");
      return;
    }

    setLoading(true);
    try {
      const response = await journalCategoryApi.create({
        name: trimmedName,
        journalHeadId: journalHeadId || null,
      });
      if (!response.success) {
        addToast(response.message || "Failed to create category", "error");
        return;
      }
      addToast("Journal category created successfully", "success");
      router.push("/journal");
    } catch (error: any) {
      addToast(error?.message || "Failed to create category", "error");
    } finally {
      setLoading(false);
    }
  };

  const headOptions: DataSelectOption[] = heads.map((head) => ({
    value: head.id,
    label: getJournalHeadPath(head, heads),
    badge: head.type ?? undefined,
  }));

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="p-6">
        <PageHeader
          title="Create Journal Category"
          description="Add a category and optionally link it to a journal subhead"
          breadcrumbs={[{ label: "Journals", href: "/journal" }, { label: "Create Category" }]}
          actions={<Link href="/journal"><Button variant="outline" className="gap-2"><ArrowLeft className="h-4 w-4" />Back to Journals</Button></Link>}
        />

        <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <FolderPlus className="h-4 w-4 text-indigo-600" />
                Category Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="journal-category-name">Category Name *</Label>
                <Input id="journal-category-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Staff Dress" required disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="journal-category-head">Journal Subhead</Label>
                <DataSelect
                  id="journal-category-head"
                  value={journalHeadId}
                  onChange={(value) => setJournalHeadId(value)}
                  placeholder={loadingHeads ? "Loading subheads..." : "Select subhead (optional)"}
                  options={headOptions}
                  searchable
                  clearable
                  disablePortal
                  panelClassName="w-full"
                  disabled={loading || loadingHeads}
                />
                <p className="text-xs text-gray-500">Categories may only be linked to SUBHEAD journal heads.</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex justify-end gap-3 pt-5">
              <Link href="/journal"><Button type="button" variant="outline" disabled={loading}>Cancel</Button></Link>
              <Button type="submit" className="gap-2" loading={loading}><Save className="h-4 w-4" />Create Category</Button>
            </CardContent>
          </Card>
        </form>
      </div>
      <ToastContainer />
    </div>
  );
}
