declare module 'pdf-parse' {
  interface PDFInfo {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: unknown;
    version: string;
  }

  interface PDFData {
    text: string;
    numpages: number;
    info: PDFInfo;
    metadata: unknown;
  }

  function pdf(dataBuffer: Buffer): Promise<PDFData>;

  export = pdf;
}
