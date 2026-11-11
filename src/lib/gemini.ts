import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIMetadataResult } from '@/types/ai';

export async function indexarDocumentoComIA(
  nomeArquivo: string,
  conteudoTexto: string
): Promise<AIMetadataResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  // Se a chave não estiver configurada ou a chamada externa falhar, utilizamos uma heurística contextual
  // alinhada às regras do Scalasystem / RNSMM para não interromper a usabilidade do usuário
  if (!apiKey || apiKey === 'sua_gemini_api_key_aqui') {
    return simularIndexacaoHeuristica(nomeArquivo, conteudoTexto);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const prompt = `
Você é um curador e arquivista especialista em governança e classificação de dados corporativos e do acervo da congregação Scalabriniana (RNSMM - Rede Scalabriniana de Missões com Migrantes).
Analise o conteúdo do documento abaixo e extraia seus metadados essenciais, resumo estruturado e palavras-chave.

Nome do arquivo: ${nomeArquivo}
Conteúdo/Texto extraído do documento:
${conteudoTexto || 'Nome do documento: ' + nomeArquivo}

Regras Críticas de Execução:
- Responda APENAS e estritamente o objeto JSON solicitado, sem blocos markdown adicionais.
- O resumo deve ser conciso (máximo 3 a 4 frases) destacando o objetivo principal do arquivo.
- Gere de 3 a 8 tags pertinentes em português relacionadas ao tema (ex: migração, pastoral, governança, jurídico, missões).
- Infira o departamento provável (ex.: Missões & Pastoral, Coordenação RNSMM, Jurídico & Direitos Humanos, Recursos Humanos, Comunicação, Financeiro).
- Sugira o status apropriado (aprovado, rascunho, arquivado).
- Indique se parece ser confidencial (true/false).

O formato do JSON retornado deve seguir exatamente esta estrutura:
{
  "resumo": "Texto resumido sobre o conteúdo do documento...",
  "departamento_sugerido": "Missões & Pastoral",
  "tags_sugeridas": ["migração", "relatório", "rnsmm", "direitos humanos"],
  "ano_publicacao_estimado": 2026,
  "status_sugerido": "aprovado",
  "confidencial_provavel": false
}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);

    return {
      resumo: parsed.resumo || 'Documento indexado pelo acervo digital RNSMM.',
      departamento_sugerido: parsed.departamento_sugerido || 'Missões & Pastoral',
      tags_sugeridas: Array.isArray(parsed.tags_sugeridas) ? parsed.tags_sugeridas : ['rnsmm', 'migrantes'],
      ano_publicacao_estimado: parsed.ano_publicacao_estimado || new Date().getFullYear(),
      status_sugerido: parsed.status_sugerido || 'aprovado',
      confidencial_provavel: !!parsed.confidencial_provavel,
    };
  } catch (error) {
    console.warn('Fallback da API Gemini ativado:', error);
    return simularIndexacaoHeuristica(nomeArquivo, conteudoTexto);
  }
}

function simularIndexacaoHeuristica(nomeArquivo: string, conteudoTexto: string): AIMetadataResult {
  const nomeLower = (nomeArquivo + ' ' + conteudoTexto).toLowerCase();

  let departamento = 'Missões & Pastoral';
  let tags: string[] = ['scalabrinianos', 'rnsmm'];
  let confidencial = false;

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
  } else if (nomeLower.includes('manual') || nomeLower.includes('colaborador') || nomeLower.includes('rh')) {
    departamento = 'Recursos Humanos & Cultura';
    tags.push('onboarding', 'recursos humanos', 'cultura');
  } else {
    tags.push('documento', 'institucional');
  }

  return {
    resumo: `Documento oficial "${nomeArquivo}" indexado para a governança de conhecimento e memória da Rede Scalabriniana de Missões com Migrantes (RNSMM).`,
    departamento_sugerido: departamento,
    tags_sugeridas: tags,
    ano_publicacao_estimado: new Date().getFullYear(),
    status_sugerido: 'aprovado',
    confidencial_provavel: confidencial,
  };
}

