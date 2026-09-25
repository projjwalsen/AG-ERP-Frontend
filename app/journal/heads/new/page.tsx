"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Layers, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataSelect, type DataSelectOption } from "@/components/ui/data-select";
import { useToast, ToastContainer } from "@/components/ui/toast";
import { PageHeader } from "@/components/layout";
import {
  CreateJournalHeadPayload,
  journalHeadApi,
} from "@/app/services/journal.service";
import {
  getJournalHeadPath,
  JournalHead,
  JournalHeadType,
  JournalHeadLevel,
} from "@/app/types/journal";

export default function NewJournalHeadPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [heads, setHeads] = React.useState<JournalHead[]>([]);
  const [loadingHeads, setLoadingHeads] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState<CreateJournalHeadPayload>({
    name: "",
    type: "INWARD",
    headType: "PARENT",
    parentId: null,
  });

  React.useEffect(() => {
    const loadHeads = async () => {
      try {
        const response = await journalHeadApi.list();
        if (response.success) {
          setHeads(response.data?.journalHeads ?? []);
        } else {
          addToast(response.message || "Failed to load parent heads", "error");
        }
      } catch (error: any) {
        addToast(error?.message || "Failed to load parent heads", "error");
      } finally {
        setLoadingHeads(false);
      }
    };

    loadHeads();
  }, [addToast]);

  const parentOptions: DataSelectOption[] = heads
    .filter((head) => head.headType === "PARENT" && (head.isActive ?? true))
    .map((head) => ({
      value: head.id,
      label: getJournalHeadPath(head, heads),
      badge: head.type ?? undefined,
    }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      addToast("Name is required", "error");
      return;
    }
    if (form.headType === "SUBHEAD" && !form.parentId) {
      addToast("Parent head is required for a subhead", "error");
      return;
    }

    setLoading(true);
    try {
      const response = await journalHeadApi.create({
        name,
        type: form.type,
        headType: form.headType,
        parentId: form.parentId || null,
      });

      if (!response.success) {
        addToast(response.message || "Failed to create journal head", "error");
        return;
      }

      addToast("Journal head created successfully", "success");
      router.push("/journal");
    } catch (error: any) {
      addToast(error?.message || "Failed to create journal head", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="p-6">
        <PageHeader
          title="Create Journal Head"
          description="Create a top-level head or place it under an existing head"
          breadcrumbs={[
            { label: "Journals", href: "/journal" },
            { label: "Create Journal Head" },
          ]}
          actions={
            <Link href="/journal">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Journals
              </Button>
            </Link>
          }
        />

        <form onSubmit={handleSubmit} className="max-w-full space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <BookOpen className="h-4 w-4 text-indigo-600" />
                Head Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="journal-head-name">Name *</Label>
                <Input
                  id="journal-head-name"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="e.g. Gold or Ornaments"
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label>Head Level *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["PARENT", "SUBHEAD"] as JournalHeadLevel[]).map((headType) => {
                    const active = form.headType === headType;
                    return (
                      <button
                        key={headType}
                        type="button"
                        onClick={() => setForm({ ...form, headType, parentId: headType === "PARENT" ? null : form.parentId })}
                        className={
                          "h-10 rounded-lg border text-sm font-medium transition-colors " +
                          (active
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50")
                        }
                        disabled={loading}
                      >
                        {headType === "PARENT" ? "Parent head" : "Subhead"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* <div className="space-y-2">
                <Label>Direction</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["INWARD", "OUTWARD", "BOTH"] as JournalHeadType[]).map((type) => (
                    <button key={type} type="button" disabled={loading} onClick={() => setForm({ ...form, type })}
                      className={`h-10 rounded-lg border text-sm font-medium transition-colors ${form.type === type ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}>
                      {type}
                    </button>
                  ))}
                </div>
              </div> */}

              <div className="space-y-2">
                <Label htmlFor="journal-head-parent">Parent Head</Label>
                <DataSelect
                  id="journal-head-parent"
                  value={form.parentId ?? ""}
                  onChange={(value) => setForm({ ...form, parentId: value || null })}
                  placeholder={loadingHeads ? "Loading heads..." : "Select parent head"}
                  searchable
                  clearable
                  disablePortal
                  panelClassName="w-full"
                  options={parentOptions}
                  disabled={loading || loadingHeads || form.headType === "PARENT"}
                />
                <p className="text-xs text-gray-500">
                  Parent heads do not need a parent. Select one when creating a subhead.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col-reverse gap-3 pt-5 sm:flex-row sm:justify-end">
              <Link href="/journal">
                <Button type="button" variant="outline" disabled={loading}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" className="gap-2" loading={loading}>
                <Save className="h-4 w-4" />
                Create Journal Head
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
      <ToastContainer />
    </div>
  );
}
