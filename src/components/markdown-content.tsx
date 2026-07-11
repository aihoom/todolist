"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { Schema } from "hast-util-sanitize";

/** 备注 Markdown 消毒：常用排版 + 图片，禁止脚本 */
const schema: Schema = {
  ...defaultSchema,
  tagNames: Array.from(
    new Set([...(defaultSchema.tagNames || []), "img", "input"])
  ),
  attributes: {
    ...defaultSchema.attributes,
    img: ["src", "alt", "title", "width", "height"],
    a: [...(defaultSchema.attributes?.a || []), "target", "rel"],
    code: [...(defaultSchema.attributes?.code || []), "className"],
    // GFM 任务列表
    input: [["type", "checkbox"], "checked", "disabled"],
  },
  protocols: {
    ...defaultSchema.protocols,
    // 允许 http(s)；站内 /uploads/... 无协议，sanitize 会放行相对路径
    src: ["http", "https"],
    href: ["http", "https", "mailto"],
  },
};

export function MarkdownContent({
  source,
  className = "",
}: {
  source: string;
  className?: string;
}) {
  if (!source.trim()) return null;

  return (
    <div className={`markdown-body ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[[rehypeSanitize, schema]]}
        components={{
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
          img: ({ src, alt, ...props }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={typeof src === "string" ? src : undefined}
              alt={alt || ""}
              loading="lazy"
              className="markdown-img"
              {...props}
            />
          ),
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
