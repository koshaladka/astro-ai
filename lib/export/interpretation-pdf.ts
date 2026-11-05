import { jsPDF } from "jspdf";
import { unified } from "unified";
import remarkParse from "remark-parse";
import type { RootContent } from "mdast";

type TextNode = { type: string; value?: string; children?: TextNode[] };
function plain(node: TextNode): string {
  if (node.type === "break") return "\n";
  if (node.type === "image") return "";
  return node.value ?? node.children?.map(plain).join("") ?? "";
}

export async function createInterpretationPdf(markdown: string, fonts: { regular: string; bold: string }) {
  const pdf = new jsPDF({ unit: "mm", format: "a4", putOnlyUsedFonts: true });
  pdf.addFileToVFS("DejaVuSans.ttf", fonts.regular);
  pdf.addFont("DejaVuSans.ttf", "DejaVu", "normal");
  pdf.addFileToVFS("DejaVuSans-Bold.ttf", fonts.bold);
  pdf.addFont("DejaVuSans-Bold.ttf", "DejaVu", "bold");
  const margin = 18, width = 174, bottom = 278;
  let y = margin;
  function write(text: string, size = 11, bold = false, indent = 0) {
    pdf.setFont("DejaVu", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    const lineHeight = size * .48;
    const lines: string[] = pdf.splitTextToSize(text, width - indent);
    for (const line of lines) {
      if (y + lineHeight > bottom) { pdf.addPage(); y = margin; }
      pdf.text(line, margin + indent, y + lineHeight);
      y += lineHeight;
    }
    y += 2;
  }
  function render(nodes: RootContent[], indent = 0) {
    for (const node of nodes) {
      if (node.type === "heading") {
        if (y + 22 > bottom) { pdf.addPage(); y = margin; }
        write(plain(node), node.depth === 1 ? 18 : node.depth === 2 ? 14 : 12, true, indent);
      } else if (node.type === "list") {
        node.children.forEach((item, i) => {
          const marker = node.ordered ? `${(node.start ?? 1) + i}. ` : "• ";
          const [first, ...rest] = item.children;
          if (first?.type === "paragraph") {
            write(marker + plain(first), 11, false, indent + 3);
            render(rest, indent + 6);
          } else render(item.children, indent + 3);
        });
      } else if (node.type === "blockquote") render(node.children, indent + 5);
      else if (node.type === "thematicBreak") y += 3;
      else if (node.type === "paragraph") write(plain(node), 11, node.children.every(child => child.type === "strong"), indent);
      else if (node.type !== "html" && node.type !== "definition") write(plain(node), 11, false, indent);
    }
  }
  render(unified().use(remarkParse).parse(markdown).children);
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page);
    pdf.setFont("DejaVu", "normal"); pdf.setFontSize(9); pdf.setTextColor(100);
    pdf.text(`${page} / ${pages}`, 105, 289, { align: "center" });
  }
  return pdf;
}

async function loadFont(path: string) {
  const response = await fetch(path);
  if (!response.ok) throw new Error("Не удалось загрузить шрифт для PDF. Повторите скачивание.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}

export async function downloadInterpretationPdf(markdown: string, filename: string) {
  const [regular, bold] = await Promise.all([
    loadFont("/fonts/DejaVuSans.ttf"), loadFont("/fonts/DejaVuSans-Bold.ttf"),
  ]);
  const pdf = await createInterpretationPdf(markdown, { regular, bold });
  pdf.save(filename);
}
