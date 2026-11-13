import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

// Definição do formato do retorno conforme as regras do prompt 6
export interface IndexacaoResponse {
  resumo: string;
  departamento_sugerido: string;
  tags_sugeridas: string[];
  ano_publicacao_estimado: number;
  status_sugerido: 'Rascunho' | 'Aprovado' | 'Arquivado' | 'rascunho' | 'aprovado' | 'arquivado';
  confidencial_provavel: boolean;
}

// Interface compatível com o modelo do runtime Vercel / Node Serverless Request/Response
interface VercelRequest {
  method?: string;
  body?: any;
}

interface VercelResponse {
  status: (statusCode: number) => VercelResponse;
  json: (data: any) => void;
  setHeader?: (key: string, value: string) => void;
}

/**
 * Serverless Function: /api/indexar-documento
 *
 * Responsável por:
 * 1. Consumir estritamente GEMINI_API_KEY do backend (process.env).
 * 2. Usar o Google Gen AI SDK (@google/generative-ai) com modelo gemini-2.5-flash / gemini-1.5-flash.
 * 3. Garantir Structured Output estrito via responseMimeType e responseSchema.
 * 4. Tratar exceções resilientes para que falhas de IA nunca travem a aplicação.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS & verificação de método
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Método não permitido. Utilize POST com o payload contendo conteudo_documento e/ou nome_arquivo.',
    });
  }

  const { conteudo_documento, nome_arquivo } = req.body || {};

  const textoFinal = (conteudo_documento || nome_arquivo || '').trim();
  if (!textoFinal) {
    return res.status(400).json({
      error: 'Parâmetro obrigatório ausente: forneça conteudo_documento ou nome_arquivo.',
    });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('[Serverless /api/indexar-documento] GEMINI_API_KEY não configurada no servidor. Retornando inferência estruturada de contingência.');
    const fallback = gerarFallbackHeuristico(nome_arquivo || '', textoFinal);
    return res.status(200).json(fallback);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);

    // Schema estrito (Structured Outputs) garantindo 100% de conformidade
    const responseSchema = {
      type: SchemaType.OBJECT,
      properties: {
        resumo: {
          type: SchemaType.STRING,
          description: 'Resumo conciso de no máximo 3 a 4 frases destacando o objetivo principal do arquivo.',
        },
        departamento_sugerido: {
          type: SchemaType.STRING,
          description: 'Departamento corporativo sugerido (ex.: Missões & Pastoral, Jurídico, Financeiro, Coordenação, RH).',
        },
        tags_sugeridas: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.STRING,
          },
          description: 'De 3 a 8 tags pertinentes em português.',
        },
        ano_publicacao_estimado: {
          type: SchemaType.INTEGER,
          description: 'Ano de publicação estimado com base nas datas e contexto do documento.',
        },
        status_sugerido: {
          type: SchemaType.STRING,
          description: 'Status sugerido: Aprovado, Rascunho ou Arquivado.',
        },
        confidencial_provavel: {
          type: SchemaType.BOOLEAN,
          description: 'Indicação se o documento parece conter dados sensíveis ou confidenciais.',
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

    const promptInterno = `
Você é um curador e arquivista especialista em governança e classificação de dados corporativos da Antigravity.
Analise o conteúdo do documento abaixo e extraia seus metadados essenciais, resumo estruturado e palavras-chave.

Nome do arquivo (referência): ${nome_arquivo || 'Não especificado'}

Conteúdo/Texto extraído do documento:
${textoFinal}

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

    const result = await model.generateContent(promptInterno);
    const responseText = result.response.text();

    let parsedResult: IndexacaoResponse;
    try {
      parsedResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[Serverless /api/indexar-documento] Falha ao parsear JSON da IA:', parseError, responseText);
      parsedResult = gerarFallbackHeuristico(nome_arquivo || '', textoFinal);
    }

    return res.status(200).json(parsedResult);
  } catch (error: any) {
    console.error('[Serverless /api/indexar-documento] Erro na chamada Gemini:', error?.message || error);
    // Em caso de falha da API externa, provê resposta resiliente para o usuário continuar trabalhando
    const fallback = gerarFallbackHeuristico(nome_arquivo || '', textoFinal);
    return res.status(200).json(fallback);
  }
}

/**
 * Fallback heurístico resiliente em caso de instabilidade na conexão com Gemini
 */
function gerarFallbackHeuristico(nomeArquivo: string, conteudo: string): IndexacaoResponse {
  const texto = (nomeArquivo + ' ' + conteudo).toLowerCase();

  let departamento = 'Coordenação RNSMM';
  let tags: string[] = ['acervo', 'antigravity'];
  let status: 'Aprovado' | 'Rascunho' | 'Arquivado' = 'Aprovado';
  let confidencial = false;

  if (texto.includes('ata') || texto.includes('reuniao') || texto.includes('diretoria')) {
    departamento = 'Coordenação RNSMM';
    tags.push('governança', 'atas', 'diretoria');
  } else if (texto.includes('contrato') || texto.includes('juridico') || texto.includes('lgpd') || texto.includes('compliance')) {
    departamento = 'Jurídico';
    tags.push('jurídico', 'compliance', 'termos');
    confidencial = true;
  } else if (texto.includes('financeiro') || texto.includes('orcamento') || texto.includes('balanco')) {
    departamento = 'Financeiro';
    tags.push('finanças', 'orçamento', 'relatório');
    confidencial = true;
  } else if (texto.includes('migrante') || texto.includes('acolhida') || texto.includes('pastoral') || texto.includes('missao')) {
    departamento = 'Missões & Pastoral';
    tags.push('migração', 'acolhimento', 'pastoral', 'direitos');
  } else if (texto.includes('engenharia') || texto.includes('tecnologia') || texto.includes('software')) {
    departamento = 'Engenharia';
    tags.push('tecnologia', 'arquitetura', 'sistemas');
  } else {
    tags.push('documento', 'institucional');
  }

  if (texto.includes('minuta') || texto.includes('rascunho') || texto.includes('draft')) {
    status = 'Rascunho';
  }

  return {
    resumo: `Documento "${nomeArquivo || 'Anexo'}" indexado e estruturado para o repositório digital corporativo da Antigravity.`,
    departamento_sugerido: departamento,
    tags_sugeridas: Array.from(new Set(tags)),
    ano_publicacao_estimado: new Date().getFullYear(),
    status_sugerido: status,
    confidencial_provavel: confidencial,
  };
}

