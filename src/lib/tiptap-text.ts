type TiptapNode = {
  type?: string;
  text?: string;
  content?: TiptapNode[];
};

export function tiptapToPlainText(doc: unknown): string {
  if (!doc || typeof doc !== "object") return "";

  const parts: string[] = [];

  function walk(node: TiptapNode) {
    if (node.text) parts.push(node.text);
    if (node.content) {
      node.content.forEach(walk);
      if (node.type === "paragraph") parts.push("\n\n");
    }
  }

  walk(doc as TiptapNode);
  return parts.join("").trim();
}

export function plainTextToTiptap(text: string): Record<string, unknown> {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return { type: "doc", content: [{ type: "paragraph" }] };
  }

  return {
    type: "doc",
    content: paragraphs.map((p) => ({ type: "paragraph", content: [{ type: "text", text: p }] })),
  };
}
