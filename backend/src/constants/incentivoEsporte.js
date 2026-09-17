// Catálogos do módulo Incentivo ao Esporte (Resolução CIE 004/2026 —
// Programa Municipal de Incentivo ao Esporte de Curitiba). Documentado em
// detalhe no README, seção "Incentivo ao Esporte".

// Checklist padrão de documentos por tipo de participante. `condicao`
// decide se o item entra no checklist auto-semeado ao criar o participante:
// 'sempre' | 'menor_18' | 'atua_com_menores' | 'nao_atua_com_menores'.
// `multiplo`+`max`: item aceita mais de um arquivo independente (ex: até 3
// comprovantes de resultado, anexados separados no sistema da prefeitura) —
// sem isso, um upload novo substitui o anterior.
const CHECKLIST_ATLETA = [
  { key: 'rg_cpf_proponente', nome: 'RG e CPF do atleta', condicao: 'sempre' },
  { key: 'rg_cpf_responsavel', nome: 'RG e CPF do responsável legal', condicao: 'menor_18' },
  { key: 'comprovante_residencia', nome: 'Comprovante de residência (água/luz/telefone fixo/internet fixa/TV assinatura/gás — 2º semestre)', condicao: 'sempre' },
  { key: 'certidao_federal', nome: 'Certidão negativa de débitos federais', condicao: 'sempre' },
  { key: 'certidao_estadual', nome: 'Certidão negativa de débitos estaduais', condicao: 'sempre' },
  { key: 'certidao_municipal', nome: 'Certidão negativa de débitos municipais', condicao: 'sempre' },
  { key: 'vinculo_federativo', nome: 'Declaração de vínculo federativo (Anexo XVII) ou de não-enquadramento (Anexo XVIII)', condicao: 'sempre' },
  { key: 'antecedentes_criminais', nome: 'Certidão negativa de antecedentes criminais', condicao: 'atua_com_menores' },
  { key: 'comprovantes_resultado', nome: 'Comprovantes de resultado (até 3, 2025/2026)', condicao: 'sempre', multiplo: true, max: 3 },
];

const CHECKLIST_TECNICO = [
  { key: 'cedula_confef_cref', nome: 'Cédula CONFEF/CREF válida', condicao: 'sempre' },
  { key: 'comprovante_residencia', nome: 'Comprovante de residência (água/luz/telefone fixo/internet fixa/TV assinatura/gás — 2º semestre)', condicao: 'sempre' },
  { key: 'certidao_federal', nome: 'Certidão negativa de débitos federais', condicao: 'sempre' },
  { key: 'certidao_estadual', nome: 'Certidão negativa de débitos estaduais', condicao: 'sempre' },
  { key: 'certidao_municipal', nome: 'Certidão negativa de débitos municipais', condicao: 'sempre' },
  { key: 'relacao_atletas', nome: 'Relação de atletas sob responsabilidade (Anexo XI)', condicao: 'sempre' },
  { key: 'vinculo_federativo', nome: 'Declaração de vínculo federativo (Anexo XVII) ou de não-enquadramento (Anexo XVIII)', condicao: 'sempre' },
  { key: 'antecedentes_criminais', nome: 'Certidão negativa de antecedentes criminais', condicao: 'atua_com_menores' },
  { key: 'declaracao_nao_enquadramento_antecedentes', nome: 'Declaração de não-enquadramento — antecedentes criminais (Anexo XIX)', condicao: 'nao_atua_com_menores' },
  { key: 'responsavel_tecnico', nome: 'Declaração de responsável técnico pelo planejamento (Anexo XXI)', condicao: 'sempre' },
];

// Rubricas de despesa permitidas pelo edital (Anexos VI/VII/VIII — o
// percentual-teto por categoria não é validado automaticamente pelo
// sistema, só o lançamento).
const CATEGORIAS_DESPESA = [
  { valor: 'transporte_hospedagem_fora_curitiba', label: 'Transporte, hospedagem e alimentação fora de Curitiba' },
  { valor: 'inscricoes_competicoes', label: 'Inscrições/taxas em competições e despesas federativas' },
  { valor: 'servicos_multidisciplinares', label: 'Serviços multidisciplinares (técnico, preparador físico, fisiologista, fisioterapeuta, nutricionista, psicólogo)' },
  { valor: 'transporte_alimentacao_dentro_curitiba', label: 'Transporte e alimentação dentro de Curitiba (competições)' },
  { valor: 'equipamentos_material_esportivo', label: 'Equipamentos e materiais esportivos (consumo/permanente)' },
  { valor: 'academia_condicionamento', label: 'Academia de condicionamento físico' },
  { valor: 'suplementacao_alimentar', label: 'Suplementação alimentar (com prescrição)' },
  { valor: 'inscricoes_cursos_treinamentos', label: 'Inscrições/taxas de cursos e treinamentos do projeto' },
  { valor: 'equipamentos_reabilitacao', label: 'Equipamentos de reabilitação física (com prescrição)' },
  { valor: 'capacitacao_educacao_fisica', label: 'Capacitação em educação física/esporte' },
  { valor: 'bolsa_auxilio_estagiario', label: 'Bolsa-auxílio estagiário' },
  { valor: 'outras', label: 'Outras despesas previstas no edital' },
];

const TIPOS_CONTRAPARTIDA = [
  { valor: 'campanha_doacao', label: 'Campanha de doação (alimentos, brinquedos, roupas)' },
  { valor: 'divulgacao_rede_social', label: 'Divulgação em rede social (@smeljpmc, #curitiba #incentivoesportecuritiba #incentivo)' },
  { valor: 'exposicao_banner', label: 'Exposição de bandeira/banner/adesivo/patch em competições e uniforme' },
];

// Metadados dos anexos com preenchimento automático. `campos` define o
// formulário exibido na geração; `fonte` (quando presente) é o campo do
// ParticipanteIncentivo usado pra pré-preencher — o resto é digitado a mão.
// `gerar_para` restringe de qual tipo de participante o anexo pode ser
// gerado ('atleta' | 'tecnico' | 'ambos').
const ANEXOS = {
  IX: {
    nome: 'Declaração de Residência',
    gerar_para: 'ambos',
    template: 'anexo-ix.docx',
    campos: [
      { key: 'declarante_nome', label: 'Nome do declarante (dono do comprovante)' },
      { key: 'declarante_rg', label: 'RG do declarante' },
      { key: 'declarante_cpf', label: 'CPF do declarante' },
      { key: 'morador_nome', label: 'Nome do morador', fonte: 'nome' },
      { key: 'morador_rg', label: 'RG do morador', fonte: 'rg' },
      { key: 'morador_cpf', label: 'CPF do morador', fonte: 'cpf' },
      { key: 'endereco', label: 'Endereço completo', fonte: 'endereco' },
      { key: 'dia', label: 'Dia (assinatura)' },
      { key: 'mes_extenso', label: 'Mês por extenso (assinatura)' },
    ],
  },
  XI: {
    nome: 'Relação de Atletas sob Responsabilidade do Técnico',
    gerar_para: 'tecnico',
    template: 'anexo-xi.docx',
    campos: [
      { key: 'tecnico_nome', label: 'Nome do técnico', fonte: 'nome' },
      { key: 'tecnico_cpf', label: 'CPF do técnico', fonte: 'cpf' },
      { key: 'modalidade', label: 'Modalidade' },
      { key: 'confef_cref', label: 'CONFEF/CREF', fonte: 'confef_cref' },
      { key: 'dia', label: 'Dia (assinatura)' },
      { key: 'mes_extenso', label: 'Mês por extenso (assinatura)' },
    ],
    // linhas[] (numero/nome/documento) é montado pelo backend a partir dos
    // atletas com tecnico_responsavel_id apontando pra esse técnico.
  },
  XII: {
    nome: 'Declaração de Vínculo Atleta / Técnico',
    gerar_para: 'atleta',
    template: 'anexo-xii.docx',
    campos: [
      { key: 'atleta_nome', label: 'Nome do atleta', fonte: 'nome' },
      { key: 'atleta_rg', label: 'RG do atleta', fonte: 'rg' },
      { key: 'atleta_cpf', label: 'CPF do atleta', fonte: 'cpf' },
      { key: 'tecnico_nome', label: 'Nome do técnico', fonte: 'tecnico.nome' },
      { key: 'tecnico_rg', label: 'RG do técnico', fonte: 'tecnico.rg' },
      { key: 'tecnico_cpf', label: 'CPF do técnico', fonte: 'tecnico.cpf' },
      { key: 'dia', label: 'Dia (assinatura)' },
      { key: 'mes_extenso', label: 'Mês por extenso (assinatura)' },
    ],
  },
  XVII: {
    nome: 'Declaração de Vínculo Federativo (possui vínculo)',
    gerar_para: 'ambos',
    template: 'anexo-xvii.docx',
    campos: [
      { key: 'declarante_nome', label: 'Nome do declarante', fonte: 'nome' },
      { key: 'declarante_rg', label: 'RG do declarante', fonte: 'rg' },
      { key: 'declarante_cpf', label: 'CPF do declarante', fonte: 'cpf' },
      { key: 'papel', label: 'Atleta/paratleta/técnico(a)' },
      { key: 'entidade', label: 'Entidade federativa', fonte: 'vinculo_federativo_entidade' },
      { key: 'cidade', label: 'Cidade sede da entidade', fonte: 'vinculo_federativo_cidade' },
      { key: 'dia', label: 'Dia (assinatura)' },
      { key: 'mes_extenso', label: 'Mês por extenso (assinatura)' },
    ],
  },
  XVIII: {
    nome: 'Vínculo Federativo — Declaração de Não-Enquadramento',
    gerar_para: 'ambos',
    template: 'anexo-xviii.docx',
    campos: [
      { key: 'declarante_nome', label: 'Nome do declarante', fonte: 'nome' },
      { key: 'declarante_rg', label: 'RG do declarante', fonte: 'rg' },
      { key: 'declarante_cpf', label: 'CPF do declarante', fonte: 'cpf' },
      { key: 'dia', label: 'Dia (assinatura)' },
      { key: 'mes_extenso', label: 'Mês por extenso (assinatura)' },
    ],
  },
  XIX: {
    nome: 'Antecedentes Criminais — Declaração de Não-Enquadramento (Técnico)',
    gerar_para: 'tecnico',
    template: 'anexo-xix.docx',
    campos: [
      { key: 'declarante_nome', label: 'Nome do declarante', fonte: 'nome' },
      { key: 'declarante_rg', label: 'RG do declarante', fonte: 'rg' },
      { key: 'declarante_cpf', label: 'CPF do declarante', fonte: 'cpf' },
      { key: 'projeto_nome', label: 'Nome do projeto' },
      { key: 'projeto_numero', label: 'Número do projeto' },
      { key: 'dia', label: 'Dia (assinatura)' },
      { key: 'mes_extenso', label: 'Mês por extenso (assinatura)' },
    ],
  },
  XXI: {
    nome: 'Declaração de Responsável Técnico pelo Planejamento',
    gerar_para: 'tecnico',
    template: 'anexo-xxi.docx',
    campos: [
      { key: 'declarante_nome', label: 'Nome do declarante', fonte: 'nome' },
      { key: 'declarante_rg', label: 'RG do declarante', fonte: 'rg' },
      { key: 'declarante_cpf', label: 'CPF do declarante', fonte: 'cpf' },
      { key: 'confef_cref', label: 'CONFEF/CREF', fonte: 'confef_cref' },
      { key: 'projeto_nome', label: 'Nome do projeto' },
      { key: 'dia', label: 'Dia (assinatura)' },
      { key: 'mes_extenso', label: 'Mês por extenso (assinatura)' },
    ],
  },
};

// Busca um item do checklist canônico (por tipo_pessoa + key), com a
// posição real no array embutida em `ordemCanonica` — usado tanto pro seed
// quanto pra validar/enriquecer uploads avulsos que "completam" um item já
// previsto no checklist (ex: mais um comprovante de resultado).
function buscarItemChecklist(tipoPessoa, tipoDocumento) {
  const checklist = tipoPessoa === 'tecnico' ? CHECKLIST_TECNICO : CHECKLIST_ATLETA;
  const ordemCanonica = checklist.findIndex(item => item.key === tipoDocumento);
  if (ordemCanonica === -1) return null;
  return { ...checklist[ordemCanonica], ordemCanonica };
}

module.exports = { CHECKLIST_ATLETA, CHECKLIST_TECNICO, CATEGORIAS_DESPESA, TIPOS_CONTRAPARTIDA, ANEXOS, buscarItemChecklist };
