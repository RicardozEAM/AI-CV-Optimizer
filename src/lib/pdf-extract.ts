import * as pdfjsLib from "pdfjs-dist";
// @ts-expect-error - Vite ?url import for bundled worker
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import JSZip from "jszip";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  let pdf: Awaited<ReturnType<typeof pdfjsLib.getDocument>["promise"]>;
  try {
    pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message.toLowerCase() : "";
    if (msg.includes("password") || msg.includes("encrypted")) {
      throw new Error("El PDF está protegido con contraseña. Súbelo sin protección e intenta de nuevo.");
    }
    throw err;
  }
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: any) => item.str)
      .join(" ");
    pages.push(text);
  }

  return pages.join("\n\n");
}

export async function extractTextFromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const documentFile = zip.file("word/document.xml");

    if (!documentFile) {
      throw new Error("missing-document");
    }

    const xml = await documentFile.async("text");
    const documentXml = new DOMParser().parseFromString(xml, "application/xml");

    if (documentXml.getElementsByTagName("parsererror").length > 0) {
      throw new Error("invalid-xml");
    }

    const body = Array.from(documentXml.getElementsByTagName("*")).find(
      (element) => element.localName === "body"
    );
    const paragraphs = Array.from((body ?? documentXml.documentElement).getElementsByTagName("*")).filter(
      (element) => element.localName === "p"
    );

    const text = paragraphs
      .map(extractParagraphText)
      .filter(Boolean)
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!text) {
      throw new Error("empty-document");
    }

    return text;
  } catch (error) {
    if (error instanceof Error && error.message === "empty-document") {
      throw new Error("El archivo Word no contiene texto legible. Sube un CV con texto seleccionable en formato DOCX o PDF.");
    }
    throw new Error("No se pudo leer el archivo Word. Asegúrate de que sea un .docx válido (no .doc antiguo) y vuelve a intentarlo.");
  }
}

function extractParagraphText(paragraph: Element): string {
  const chunks: string[] = [];

  function walk(node: Node) {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType !== Node.ELEMENT_NODE) {
        return;
      }

      const element = child as Element;
      const localName = element.localName;

      if (localName === "t" || localName === "delText") {
        chunks.push(element.textContent ?? "");
        return;
      }

      if (localName === "tab") {
        chunks.push("\t");
        return;
      }

      if (localName === "br" || localName === "cr") {
        chunks.push("\n");
        return;
      }

      walk(element);
    });
  }

  walk(paragraph);

  return chunks
    .join("")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .trim();
}

export async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) {
    return extractTextFromPdf(file);
  } else if (name.endsWith(".docx")) {
    return extractTextFromDocx(file);
  } else if (name.endsWith(".doc")) {
    throw new Error("El formato .doc antiguo no es compatible. Guarda el CV como .docx o .pdf y vuelve a subirlo.");
  }
  throw new Error("Formato no soportado. Sube un archivo PDF o DOCX.");
}
