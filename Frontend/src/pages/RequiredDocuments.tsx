import {
  FileCheck2, Search, Pencil, Plus, X, Upload, Trash2, Download, CheckCircle2, Circle, ChevronDown,
} from "lucide-react";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import {
  useCaseTypeDocumentsList,
  useUpsertCaseTypeDocuments,
  useUploadDocumentTemplate,
  useRemoveDocumentTemplate,
} from "@/hooks/useApi";
import { usePermissions } from "@/stores/rbac";
import { resolveUploadUrl } from "@/lib/apiBase";

interface DocItem {
  label: string;
  text: string;
  isMandatory: boolean;
  sortOrder: number;
  templateUrl?: string;
  templateFileName?: string;
}

interface RowData extends Record<string, unknown> {
  caseTypeId: string;
  caseTypeName?: string;
  categoryName?: string;
  caseTypeSlug?: string;
  hasChecklist?: boolean;
  documentCount?: number;
  description?: string;
  checklist?: {
    documents?: DocItem[];
    questions?: string[];
    guidelines?: string[];
    note?: string;
    acceptedFormats?: string;
    maxFileSizeMb?: number;
    isActive?: boolean;
  };
}

const CATEGORY_ORDER = [
  "Identity & Personal",
  "Pension & Financial",
  "Family Details",
  "Requests & Tracking",
];

function categorySortIndex(name: string): number {
  const i = CATEGORY_ORDER.indexOf(name);
  return i === -1 ? CATEGORY_ORDER.length : i;
}

export default memo(function RequiredDocuments() {
  const { data: rows = [], isLoading } = useCaseTypeDocumentsList();
  const permissions = usePermissions();
  const canManage = permissions.manageRequiredDocuments;

  const upsert = useUpsertCaseTypeDocuments();
  const uploadTemplate = useUploadDocumentTemplate();
  const removeTemplate = useRemoveDocumentTemplate();

  const [search, setSearch] = useState("");
  /** null = use default (all collapsed except first category); Set = user toggled */
  const [manualCollapse, setManualCollapse] = useState<Set<string> | null>(null);
  const questionInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [editRow, setEditRow] = useState<RowData | null>(null);
  const [form, setForm] = useState<{
    documents: DocItem[];
    customFields: string[];
    guidelines: string;
    note: string;
    acceptedFormats: string;
    maxFileSizeMb: number;
    isActive: boolean;
  } | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r: Record<string, unknown> & { caseTypeName?: string; categoryName?: string; caseTypeSlug?: string }) =>
        r.caseTypeName?.toLowerCase().includes(q) ||
        r.categoryName?.toLowerCase().includes(q) ||
        r.caseTypeSlug?.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, (Record<string, unknown> & { categoryName?: string })[]>();
    for (const row of filtered) {
      const cat = row.categoryName || "Other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(row);
    }
    return Array.from(map.entries()).sort(
      ([a], [b]) => categorySortIndex(a) - categorySortIndex(b) || a.localeCompare(b)
    );
  }, [filtered]);

  /** Default: every category collapsed except the first in the list */
  const defaultCollapsed = useMemo(() => {
    if (grouped.length === 0) return new Set<string>();
    const names = grouped.map(([cat]) => cat);
    return new Set(names.slice(1));
  }, [grouped]);

  const collapsedCategories = manualCollapse ?? defaultCollapsed;

  const toggleCategory = (category: string) => {
    setManualCollapse((prev) => {
      const base = prev ?? defaultCollapsed;
      const next = new Set(base);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const configuredCount = rows.filter((r: RowData) => r.hasChecklist).length;

  const openEdit = useCallback((row: RowData) => {
    const checklist = row.checklist;
    setEditRow(row);
    setForm({
      documents: checklist?.documents?.length
        ? checklist.documents.map((d: DocItem, i: number) => ({ ...d, sortOrder: i }))
        : [{ label: "(a)", text: "", isMandatory: true, sortOrder: 0 }],
      customFields: checklist?.questions?.length ? [...checklist.questions] : [],
      guidelines: (checklist?.guidelines || []).join("\n"),
      note: checklist?.note || "",
      acceptedFormats: checklist?.acceptedFormats || "PDF, JPG, JPEG, PNG",
      maxFileSizeMb: checklist?.maxFileSizeMb ?? 5,
      isActive: checklist?.isActive !== false,
    });
  }, []);

  const closeEdit = useCallback(() => {
    setEditRow(null);
    setForm(null);
  }, []);

  const addDocumentItem = () => {
    if (!form) return;
    const nextLabel = String.fromCharCode(65 + form.documents.length);
    setForm({
      ...form,
      documents: [
        ...form.documents,
        { label: nextLabel, text: "", isMandatory: true, sortOrder: form.documents.length },
      ],
    });
  };

  const removeDocumentItem = (index: number) => {
    if (!form || form.documents.length <= 1) return;
    const next = form.documents.filter((_, i) => i !== index).map((d, i) => ({
      ...d,
      sortOrder: i,
      label: d.label || String.fromCharCode(65 + i),
    }));
    setForm({ ...form, documents: next });
  };

  const updateDocField = (index: number, field: keyof DocItem, value: string | boolean) => {
    if (!form) return;
    const documents = form.documents.map((d, i) =>
      i === index ? { ...d, [field]: value } : d
    );
    setForm({ ...form, documents });
  };

  const addAdditionalQuestion = (afterIndex?: number) => {
    if (!form) return;
    const insertAt = afterIndex === undefined ? form.customFields.length : afterIndex + 1;
    const next = [...form.customFields];
    next.splice(insertAt, 0, "");
    setForm({ ...form, customFields: next });
    requestAnimationFrame(() => {
      questionInputRefs.current[insertAt]?.focus();
    });
  };

  const removeAdditionalQuestion = (index: number) => {
    if (!form) return;
    setForm({
      ...form,
      customFields: form.customFields.filter((_, i) => i !== index),
    });
  };

  const updateAdditionalQuestion = (index: number, value: string) => {
    if (!form) return;
    setForm({
      ...form,
      customFields: form.customFields.map((f, i) => (i === index ? value : f)),
    });
  };

  const handleQuestionKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!canManage || e.key !== "Enter") return;
    e.preventDefault();
    addAdditionalQuestion(index);
  };

  const handleSave = async () => {
    if (!editRow || !form) return;
    const guidelines = form.guidelines
      .split("\n")
      .map((g) => g.trim())
      .filter(Boolean);
    const questions = form.customFields.map((q) => q.trim()).filter(Boolean);

    await upsert.mutateAsync({
      caseTypeId: editRow.caseTypeId,
      documents: form.documents.map((d, i) => ({
        ...d,
        sortOrder: i,
        text: d.text.trim(),
      })).filter((d) => d.text),
      questions,
      guidelines,
      note: form.note.trim(),
      acceptedFormats: form.acceptedFormats.trim(),
      maxFileSizeMb: form.maxFileSizeMb,
      isActive: form.isActive,
    });
    closeEdit();
  };

  const handleTemplateUpload = async (index: number, file: File) => {
    if (!editRow) return;
    const result = await uploadTemplate.mutateAsync({
      caseTypeId: editRow.caseTypeId,
      itemIndex: index,
      file,
    });
    if (result?.checklist?.documents && form) {
      setForm({
        ...form,
        documents: result.checklist.documents,
      });
    }
  };

  const handleTemplateRemove = async (index: number) => {
    if (!editRow) return;
    const result = await removeTemplate.mutateAsync({
      caseTypeId: editRow.caseTypeId,
      itemIndex: index,
    });
    if (result?.documents && form) {
      setForm({ ...form, documents: result.documents });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileCheck2 className="w-7 h-7 text-primary" />
            Required Documents
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Document checklists per case type · {configuredCount} of {rows.length} configured
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search case type or category..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-card text-foreground"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/50 p-4 text-sm text-muted-foreground">
        Common checklist per case type — shown to veterans when they select a service. Super Admin, Area and HQ can add or edit.
        Station HQ can view only. Upload PDF annexure templates for veteran download.
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([category, items]) => {
            const collapsed = collapsedCategories.has(category);
            return (
            <section key={category} className="rounded-xl border border-border bg-card/30 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-secondary/40 transition-colors"
              >
                <div>
                  <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    {category}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {items.length} case type{items.length !== 1 ? "s" : ""} ·{" "}
                    {items.filter((r: RowData) => r.hasChecklist).length} configured
                  </p>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-200 ${
                    collapsed ? "" : "rotate-180"
                  }`}
                />
              </button>
              {!collapsed && (
              <div className="flex flex-wrap gap-3 p-4 pt-3 border-t border-border/60">
                {items.map((row: RowData) => (
                  <article
                    key={row.caseTypeId}
                    className="flex flex-col justify-between gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors w-full sm:w-[calc((100%-0.75rem)/2)] lg:w-[calc((100%-1.5rem)/3)] flex-none"
                  >
                    <div className="min-w-0 space-y-2">
                      <h3 className="font-semibold text-foreground leading-snug">{row.caseTypeName}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {row.caseTypeSlug}
                        </span>
                        {row.hasChecklist ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-success/15 text-success flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {row.documentCount} doc{row.documentCount !== 1 ? "s" : ""}
                            {row.checklist?.questions?.length
                              ? ` · ${row.checklist.questions.length} Q`
                              : ""}
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
                            <Circle className="w-3 h-3" />
                            Not configured
                          </span>
                        )}
                      </div>
                      {row.description && (
                        <p className="text-sm text-muted-foreground line-clamp-3">{row.description as string}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => openEdit(row)}
                      disabled={!canManage && !row.hasChecklist}
                      className={`w-full px-4 py-2 text-sm rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                        canManage
                          ? "border-primary/40 text-primary hover:bg-primary/10"
                          : row.hasChecklist
                            ? "border-border text-foreground hover:bg-secondary"
                            : "border-border text-muted-foreground opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <Pencil className="w-4 h-4" />
                      {canManage ? (row.hasChecklist ? "Edit" : "Configure") : "View"}
                    </button>
                  </article>
                ))}
              </div>
              )}
            </section>
            );
          })}
        </div>
      )}

      {editRow && form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h3 className="text-lg font-bold text-foreground">{editRow.caseTypeName}</h3>
                <p className="text-xs text-muted-foreground">{editRow.categoryName} · {editRow.caseTypeSlug}</p>
              </div>
              <button type="button" onClick={closeEdit} className="p-2 rounded-lg hover:bg-secondary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">Documents required</h4>
                  {canManage && (
                    <button
                      type="button"
                      onClick={addDocumentItem}
                      className="text-xs flex items-center gap-1 text-primary hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add item
                    </button>
                  )}
                </div>

                {form.documents.map((doc, index) => (
                  <div key={index} className="p-4 rounded-xl border border-border bg-background/50 space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="w-8 h-8 rounded-full bg-primary/15 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                        {doc.label || String.fromCharCode(65 + index)}
                      </span>
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex gap-2 flex-wrap">
                          <input
                            value={doc.label}
                            onChange={(e) => updateDocField(index, "label", e.target.value.toUpperCase())}
                            disabled={!canManage}
                            className="w-14 px-2 py-1 text-sm rounded border border-border bg-card"
                            placeholder="A"
                          />
                          <label className="flex items-center gap-2 text-sm text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={doc.isMandatory}
                              onChange={(e) => updateDocField(index, "isMandatory", e.target.checked)}
                              disabled={!canManage}
                            />
                            Mandatory
                          </label>
                        </div>
                        <textarea
                          value={doc.text}
                          onChange={(e) => updateDocField(index, "text", e.target.value)}
                          disabled={!canManage}
                          rows={3}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card resize-y"
                          placeholder="Document requirement description..."
                        />

                        {doc.templateUrl && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <a
                              href={resolveUploadUrl(doc.templateUrl) ?? "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-primary hover:underline"
                            >
                              <Download className="w-3.5 h-3.5" />
                              {doc.templateFileName || "Download template"}
                            </a>
                            {canManage && (
                              <button
                                type="button"
                                onClick={() => handleTemplateRemove(index)}
                                className="text-destructive hover:underline flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Remove
                              </button>
                            )}
                          </div>
                        )}

                        {canManage && (
                          <label className="inline-flex items-center gap-2 px-3 py-2 text-xs rounded-lg border border-dashed border-border cursor-pointer hover:bg-secondary/50">
                            <Upload className="w-4 h-4 text-primary" />
                            Upload PDF template (annexure)
                            <input
                              type="file"
                              accept="application/pdf"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleTemplateUpload(index, file);
                                e.target.value = "";
                              }}
                            />
                          </label>
                        )}
                      </div>
                      {canManage && form.documents.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDocumentItem(index)}
                          className="p-2 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-foreground">Additional questions</label>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => addAdditionalQuestion()}
                      className="text-xs flex items-center gap-1 text-primary hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add question
                    </button>
                  )}
                </div>
                {form.customFields.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">
                    No additional questions yet.{canManage ? " Click + Add question or press Enter in a field." : ""}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {form.customFields.map((field, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          ref={(el) => { questionInputRefs.current[index] = el; }}
                          value={field}
                          onChange={(e) => updateAdditionalQuestion(index, e.target.value)}
                          onKeyDown={(e) => handleQuestionKeyDown(index, e)}
                          disabled={!canManage}
                          className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-card"
                          placeholder="Enter question... (Press Enter for next)"
                        />
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => removeAdditionalQuestion(index)}
                            className="p-2 text-muted-foreground hover:text-destructive shrink-0"
                            title="Remove question"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">Guidelines (one per line)</label>
                <textarea
                  value={form.guidelines}
                  onChange={(e) => setForm({ ...form, guidelines: e.target.value })}
                  disabled={!canManage}
                  rows={5}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card"
                  placeholder="Ensure all details match supporting documents..."
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">Note</label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  disabled={!canManage}
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">Accepted formats</label>
                  <input
                    value={form.acceptedFormats}
                    onChange={(e) => setForm({ ...form, acceptedFormats: e.target.value })}
                    disabled={!canManage}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">Max file size (MB)</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={form.maxFileSizeMb}
                    onChange={(e) => setForm({ ...form, maxFileSizeMb: Number(e.target.value) || 5 })}
                    disabled={!canManage}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card"
                  />
                </div>
              </div>

              {canManage && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  />
                  Checklist active (visible to veterans)
                </label>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <button
                type="button"
                onClick={closeEdit}
                className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-secondary"
              >
                {canManage ? "Cancel" : "Close"}
              </button>
              {canManage && (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={upsert.isPending}
                  className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {upsert.isPending ? "Saving..." : "Save checklist"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
