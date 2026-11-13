import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import type { AIMetadataResult } from '@/types/ai';

export async function indexarDocumentoComIA(
  nomeArquivo: string,
  conteudoTexto: string
): Promise<AIMetadataResult> {
  // 1. Tentar primeiro via Serverless Function /api/indexar-documento (Backend Seguro)
  try {
    const response = await fetch('/api/indexar-documento', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nome_arquivo: nomeArquivo,
        conteudo_documento: conteudoTexto,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return normalizarRespostaIA(data);
    }
  } catch (backendError) {
    console.info('Backend /api/indexar-documento indisponível no ambiente de dev vite puro, avaliando fallback direto...', backendError);
  }

  // 2. Se executando no front (ou em preview Vite local com VITE_GEMINI_API_KEY)
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;

  if (!apiKey || apiKey === 'sua_gemini_api_key_aqui') {
    return simularIndexacaoHeuristica(nomeArquivo, conteudoTexto);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);

    const responseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        resumo: {
          type: SchemaType.STRING,
          description: 'Resumo conciso de no máximo 3 a 4 frases destacando o objetivo principal do arquivo.',
        },
        departamento_sugerido: {
          type: SchemaType.STRING,
          description: 'Departamento provável do documento.',
        },
        tags_sugeridas: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: 'De 3 a 8 tags pertinentes em português.',
        },
        ano_publicacao_estimado: {
          type: SchemaType.INTEGER,
          description: 'Ano de publicação estimado.',
        },
        status_sugerido: {
          type: SchemaType.STRING,
          description: 'Status: Rascunho, Aprovado ou Arquivado.',
        },
        confidencial_provavel: {
          type: SchemaType.BOOLEAN,
          description: 'Se parece conter informações confidenciais.',
        },
      },
      required: [
        'resumo',
        'departamento_sugerido',
        'tags_sugeridas',
        'ano_publicacao_estimado',
        'status_sugerido',
        'confidencial_provavel',
      ],
    };

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema as any,
        temperature: 0.2,
      },
    });

    const prompt = `
Você é um curador e arquivista especialista em governança e classificação de dados corporativos da Antigravity.
Analise o conteúdo do documento abaixo e extraia seus metadados essenciais, resumo estruturado e palavras-chave.

Nome do arquivo: ${nomeArquivo}
Conteúdo/Texto extraído do documento:
${conteudoTexto || 'Nome do documento: ' + nomeArquivo}

Regras Críticas de Execução:
- Responda APENAS e estritamente o objeto JSON solicitado, sem blocos markdown adicionais.
- O resumo deve ser conciso (máximo 3 a 4 frases) destacando o objetivo principal do arquivo.
- Gere de 3 a 8 tags pertinentes em português.
- Infira o departamento provável (ex.: Engenharia, Jurídico, Financeiro, Recursos Humanos, Operações, P&D, Missões & Pastoral, Coordenação RNSMM).
- Sugira o status apropriado (Rascunho, Aprovado, Arquivado).

O formato do JSON retornado deve seguir exatamente esta estrutura:
{
  "resumo": "Texto resumido sobre o conteúdo do documento...",
  "departamento_sugerido": "Engenharia",
  "tags_sugeridas": ["relatório", "planejamento", "segurança", "arquitetura"],
  "ano_publicacao_estimado": 2026,
  "status_sugerido": "Aprovado",
  "confidencial_provavel": false
}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);

    return normalizarRespostaIA(parsed);
  } catch (error) {
    console.warn('Fallback da API Gemini ativado:', error);
    return simularIndexacaoHeuristica(nomeArquivo, conteudoTexto);
  }
}

function normalizarRespostaIA(parsed: any): AIMetadataResult {
  const statusRaw = String(parsed?.status_sugerido || '').toLowerCase();
  let statusFinal: 'rascunho' | 'aprovado' | 'arquivado' = 'aprovado';
  if (statusRaw.includes('rascunho')) statusFinal = 'rascunho';
  else if (statusRaw.includes('arquiv')) statusFinal = 'arquivado';

  return {
    resumo: parsed.resumo || 'Documento indexado pelo acervo digital corporativo.',
    departamento_sugerido: parsed.departamento_sugerido || 'Coordenação Geral',
    tags_sugeridas: Array.isArray(parsed.tags_sugeridas) && parsed.tags_sugeridas.length > 0
      ? parsed.tags_sugeridas
      : ['documento', 'institucional'],
    ano_publicacao_estimado: Number(parsed.ano_publicacao_estimado) || new Date().getFullYear(),
    status_sugerido: statusFinal,
    confidencial_provavel: Boolean(parsed.confidencial_provavel),
  };
}

function simularIndexacaoHeuristica(nomeArquivo: string, conteudoTexto: string): AIMetadataResult {
  const nomeLower = (nomeArquivo + ' ' + conteudoTexto).toLowerCase();

  let departamento = 'Coordenação RNSMM';
  let tags: string[] = ['antigravity', 'acervo'];
  let confidencial = false;
  let status: 'aprovado' | 'rascunho' | 'arquivado' = 'aprovado';

  if (nomeLower.includes('ata') || nomeLower.includes('diretoria') || nomeLower.includes('reuniao')) {
    departamento = 'Coordenação RNSMM';
    tags.push('governança', 'atas', 'diretoria');
  } else if (nomeLower.includes('contrato') || nomeLower.includes('lgpd') || nomeLower.includes('juridico')) {
    departamento = 'Jurídico & Compliance';
    tags.push('jurídico', 'compliance', 'termos');
    confidencial = true;
  } else if (nomeLower.includes('financeiro') || nomeLower.includes('balanco') || nomeLower.includes('orcamento')) {
    departamento = 'Financeiro & Prestação de Contas';
    tags.push('finanças', 'orçamento', 'prestação de contas');
    confidencial = true;
  } else if (nomeLower.includes('migrante') || nomeLower.includes('refugiado') || nomeLower.includes('acolhida')) {
    departamento = 'Missões & Pastoral';
    tags.push('migração', 'acolhimento', 'direitos humanos', 'pastoral');
  } else if (nomeLower.includes('engenharia') || nomeLower.includes('tecnologia') || nomeLower.includes('sistema')) {
    departamento = 'Engenharia';
    tags.push('tecnologia', 'arquitetura', 'sistemas');
  } else if (nomeLower.includes('manual') || nomeLower.includes('colaborador') || nomeLower.includes('rh')) {
    departamento = 'Recursos Humanos & Cultura';
    tags.push('onboarding', 'recursos humanos', 'cultura');
  } else {
    tags.push('documento', 'institucional');
  }

  if (nomeLower.includes('rascunho') || nomeLower.includes('draft') || nomeLower.includes('minuta')) {
    status = 'rascunho';
  }

  return {
    resumo: `Documento "${nomeArquivo}" indexado para a governança de conhecimento e memória da Antigravity / RNSMM.`,
    departamento_sugerido: departamento,
    tags_sugeridas: Array.from(new Set(tags)),
    ano_publicacao_estimado: new Date().getFullYear(),
    status_sugerido: status,
    confidencial_provavel: confidencial,
  };
}
