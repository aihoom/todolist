/**
 * 从 multipart FormData 取出文件字段。
 * 兼容 File / Blob；部分运行时 instanceof File 会失败。
 */
export function getFormFile(
  form: FormData,
  field: string
): { file: Blob; name: string; type: string; size: number } | null {
  const raw = form.get(field);
  if (!raw || typeof raw === "string") return null;

  const blob = raw as Blob;
  if (typeof blob.arrayBuffer !== "function") return null;

  const name =
    "name" in raw && typeof (raw as File).name === "string"
      ? (raw as File).name
      : field;
  const type =
    typeof blob.type === "string" && blob.type
      ? blob.type
      : guessMimeFromName(name);

  return {
    file: blob,
    name,
    type,
    size: blob.size,
  };
}

function guessMimeFromName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".ico")) return "image/x-icon";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "";
}
