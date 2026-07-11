"use client";

import { useRef, useState } from "react";
import { Button, Textarea } from "./ui";
import { MarkdownContent } from "./markdown-content";

type Mode = "write" | "preview";

/**
 * 待办备注：Markdown 编辑 + 插图上传
 */
export function MarkdownNoteField({
  value,
  onChange,
  placeholder,
  rows = 5,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<Mode>("write");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function insertAtCursor(snippet: string) {
    const el = taRef.current;
    if (!el) {
      const next =
        value && !value.endsWith("\n")
          ? `${value}\n${snippet}\n`
          : `${value}${snippet}\n`;
      onChange(next);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const needsLead = before.length > 0 && !before.endsWith("\n");
    const block = `${needsLead ? "\n" : ""}${snippet}\n`;
    const next = before + block + after;
    onChange(next);
    requestAnimationFrame(() => {
      const pos = before.length + block.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  async function onPickImage(file: File | null) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch("/api/todos/note-image", {
        method: "POST",
        body: form,
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : `上传失败（HTTP ${res.status}）`
        );
      }
      const md =
        typeof data.markdown === "string"
          ? data.markdown
          : `![截图](${data.url})`;
      insertAtCursor(md);
      setMode("write");
    } catch (err) {
      setError(err instanceof Error ? err.message : "图片上传失败");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-stone-50/80 px-2 py-1.5">
        <button
          type="button"
          className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
            mode === "write"
              ? "bg-white text-stone-900 shadow-sm"
              : "text-muted hover:text-stone-800"
          }`}
          onClick={() => setMode("write")}
          disabled={disabled}
        >
          编辑
        </button>
        <button
          type="button"
          className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
            mode === "preview"
              ? "bg-white text-stone-900 shadow-sm"
              : "text-muted hover:text-stone-800"
          }`}
          onClick={() => setMode("preview")}
          disabled={disabled}
        >
          预览
        </button>
        <span className="mx-1 h-3 w-px bg-border" aria-hidden />
        <Button
          type="button"
          variant="ghost"
          className="!px-2 !py-1 text-xs"
          disabled={disabled || uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? "上传中…" : "📷 插入图片"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => void onPickImage(e.target.files?.[0] ?? null)}
        />
        <span className="ml-auto hidden text-[11px] text-muted sm:inline">
          支持 Markdown · 截图最大 8MB
        </span>
      </div>

      {mode === "write" ? (
        <Textarea
          ref={taRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            placeholder ||
            "支持 Markdown：标题、列表、链接、代码…\n也可点「插入图片」上传截图"
          }
          rows={rows}
          disabled={disabled || uploading}
          className="!rounded-none !border-0 font-mono text-sm focus:!shadow-none"
        />
      ) : (
        <div className="min-h-[7.5rem] px-3 py-2">
          {value.trim() ? (
            <MarkdownContent source={value} />
          ) : (
            <p className="text-sm text-muted">暂无内容，切换到「编辑」书写</p>
          )}
        </div>
      )}

      {error ? (
        <div className="border-t border-red-100 bg-red-50 px-3 py-1.5 text-xs text-danger">
          {error}
        </div>
      ) : null}
    </div>
  );
}
