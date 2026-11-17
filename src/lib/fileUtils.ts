/**
 * Converte um objeto File em uma Data URL (Base64) para armazenamento direto.
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo para upload.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Dispara o download de um arquivo a partir de sua URL (Data URL ou URL externa).
 * Caso a URL seja um placeholder antigo (storage.antigravity.io), gera um arquivo
 * de texto com os metadados como fallback para evitar erro de navegação.
 */
export function downloadFile(
  url: string,
  filename: string,
  fallbackInfo?: { titulo?: string; autor?: string; departamento?: string; ano?: number }
): void {
  const isPlaceholder = !url || url.includes('storage.antigravity.io');

  if (isPlaceholder) {
    const lines = [
      `Documento: ${fallbackInfo?.titulo || filename}`,
      `Arquivo original: ${filename}`,
      fallbackInfo?.autor ? `Autor: ${fallbackInfo.autor}` : null,
      fallbackInfo?.departamento ? `Departamento: ${fallbackInfo.departamento}` : null,
      fallbackInfo?.ano ? `Ano: ${fallbackInfo.ano}` : null,
      '',
      'Aviso: Este registro foi criado antes da habilitação do armazenamento de conteúdo.',
      'Para baixar o arquivo real, envie uma nova versão ou faça um novo upload.'
    ].filter((line): line is string => line !== null);

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    triggerAnchorDownload(blobUrl, `${filename}.txt`);
    URL.revokeObjectURL(blobUrl);
    return;
  }

  triggerAnchorDownload(url, filename);
}

function triggerAnchorDownload(href: string, downloadName: string): void {
  const link = document.createElement('a');
  link.href = href;
  link.download = downloadName;
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

