// Catálogos do módulo Incentivo ao Esporte (Resolução CIE 004/2026 —
// Programa Municipal de Incentivo ao Esporte de Curitiba). Documentado em
// detalhe no README, seção "Incentivo ao Esporte".

// Checklist padrão de documentos por tipo de participante. `condicao`
// decide se o item entra no checklist auto-semeado ao criar o participante:
// 'sempre' | 'menor_18' | 'atua_com_menores' | 'nao_atua_com_menores' |
// 'requer_declaracao_residencia'. Esse último (Art. 17 da Resolução): quem
// NÃO é proprietário do imóvel E não se enquadra na exceção do §4 (menor
// nascido a partir de 2009 que mora com o responsável) precisa, além da
// conta, de Declaração de Residência (Anexo IX) assinada por quem é
// proprietário/locador/locatário + comprovação de vínculo com Curitiba —
// ver `resolverCaminhoResidencia` em participantesIncentivoController.js.
// `multiplo`+`max`: item aceita mais de um arquivo independente (ex: até 3
// comprovantes de resultado, anexados separados no sistema da prefeitura) —
// sem isso, um upload novo substitui o anterior. `multiplo` sem `max` = sem
// limite. `rotulo_instancia` nomeia cada arquivo na tela ("Declaração 1"...).
// `tipo: 'credencial'`: não é upload — é o login/senha do participante no
// Sistema Incentivo online (e-Cidadão), guardado cifrado em
// CredencialIncentivo; o status do item vira 'recebido' ao salvar e volta a
// 'pendente' ao apagar (credenciaisIncentivoController.js).
const ITEM_CREDENCIAL = { key: 'credencial_sistema_prefeitura', nome: 'Login e senha do Sistema Incentivo online (e-Cidadão)', condicao: 'sempre', tipo: 'credencial' };

const CHECKLIST_ATLETA = [
  ITEM_CREDENCIAL,
  { key: 'rg_cpf_proponente', nome: 'RG e CPF do atleta', condicao: 'sempre' },
  { key: 'rg_cpf_responsavel', nome: 'RG e CPF do responsável legal', condicao: 'menor_18' },
  { key: 'comprovante_residencia', nome: 'Comprovante de residência (água/luz/telefone fixo/internet fixa/TV assinatura/gás — 2º semestre/2026)', condicao: 'sempre' },
  { key: 'declaracao_residencia_anexo_ix', nome: 'Declaração de Residência assinada pelo proprietário/locador/locatário (Anexo IX, com RG dele em anexo)', condicao: 'requer_declaracao_residencia' },
  { key: 'vinculo_curitiba', nome: 'Comprovação de vínculo com Curitiba (nascimento em Curitiba, título de eleitor, federação por equipe sediada em Curitiba, vínculo trabalhista ou matrícula escolar em Curitiba)', condicao: 'requer_declaracao_residencia' },
  { key: 'certidao_federal', nome: 'Certidão negativa de débitos federais', condicao: 'sempre' },
  { key: 'certidao_estadual', nome: 'Certidão negativa de débitos estaduais', condicao: 'sempre' },
  { key: 'certidao_municipal', nome: 'Certidão negativa de débitos municipais', condicao: 'sempre' },
  { key: 'vinculo_federativo', nome: 'Declaração de vínculo federativo (Anexo XVII) ou de não-enquadramento (Anexo XVIII)', condicao: 'sempre' },
  // Antecedentes criminais NÃO é exigido de atleta/paratleta — Resolução
  // CIE 004/2026, §17 e §20, obriga só Técnico (Pessoa Física) e Pessoa
  // Jurídica que atuam com menores de 18. Item existe só em
  // CHECKLIST_TECNICO.
  { key: 'comprovantes_resultado', nome: 'Comprovantes de resultado (até 3, 2025/2026)', condicao: 'sempre', multiplo: true, max: 3, rotulo_instancia: 'Comprovante' },
];

const CHECKLIST_TECNICO = [
  ITEM_CREDENCIAL,
  { key: 'cedula_confef_cref', nome: 'Cédula CONFEF/CREF válida', condicao: 'sempre' },
  { key: 'comprovante_residencia', nome: 'Comprovante de residência (água/luz/telefone fixo/internet fixa/TV assinatura/gás — 2º semestre/2026)', condicao: 'sempre' },
  { key: 'declaracao_residencia_anexo_ix', nome: 'Declaração de Residência assinada pelo proprietário/locador/locatário (Anexo IX, com RG dele em anexo)', condicao: 'requer_declaracao_residencia' },
  { key: 'vinculo_curitiba', nome: 'Comprovação de vínculo com Curitiba (nascimento em Curitiba, título de eleitor, federação por equipe sediada em Curitiba ou vínculo trabalhista em Curitiba)', condicao: 'requer_declaracao_residencia' },
  { key: 'certidao_federal', nome: 'Certidão negativa de débitos federais', condicao: 'sempre' },
  { key: 'certidao_estadual', nome: 'Certidão negativa de débitos estaduais', condicao: 'sempre' },
  { key: 'certidao_municipal', nome: 'Certidão negativa de débitos municipais', condicao: 'sempre' },
  { key: 'relacao_atletas', nome: 'Relação de atletas sob responsabilidade (Anexo XI)', condicao: 'sempre' },
  // Art. 8º §1º II: uma declaração por atleta listado no Anexo XI, assinada
  // pelo atleta (e responsável legal, se menor) — sem `max`, sem limite.
  { key: 'vinculo_atleta_tecnico', nome: 'Declarações de vínculo atleta/técnico (Anexo XII — uma por atleta)', condicao: 'sempre', multiplo: true, rotulo_instancia: 'Declaração' },
  { key: 'vinculo_federativo', nome: 'Declaração de vínculo federativo (Anexo XVII) ou de não-enquadramento (Anexo XVIII)', condicao: 'sempre' },
  { key: 'antecedentes_criminais', nome: 'Certidão negativa de antecedentes criminais', condicao: 'atua_com_menores' },
  { key: 'declaracao_nao_enquadramento_antecedentes', nome: 'Declaração de não-enquadramento — antecedentes criminais (Anexo XIX)', condicao: 'nao_atua_com_menores' },
  // Anexo XXI (responsável técnico pelo planejamento) NÃO entra: no Quadro
  // de Normas da Resolução ele só é exigido de Pessoa Jurídica (item 13).
];

// Pessoa Jurídica (Decreto 1985/2025 Art. 23 §3º + Quadro de Normas e
// Art. 14 §9º/§13/§16 da Resolução). Antecedentes: atua com menores →
// certidões de TODOS os colaboradores (§17 II/§18 — múltiplo, sem limite);
// senão Anexo XX. Login do sistema é o CPF do representante legal (Art. 13).
const CHECKLIST_PESSOA_JURIDICA = [
  ITEM_CREDENCIAL,
  { key: 'cartao_cnpj', nome: 'Comprovante de inscrição no CNPJ (ativo há pelo menos 12 meses)', condicao: 'sempre' },
  { key: 'alvara_funcionamento', nome: 'Alvará de funcionamento válido (Prefeitura de Curitiba)', condicao: 'sempre' },
  { key: 'estatuto_social', nome: 'Estatuto social', condicao: 'sempre' },
  { key: 'ata_eleicao_diretoria', nome: 'Ata de eleição da atual diretoria (registrada em cartório)', condicao: 'sempre' },
  { key: 'rg_cpf_representante_legal', nome: 'RG e CPF do presidente/representante legal (frente e verso)', condicao: 'sempre' },
  { key: 'rg_cpf_responsavel_financeiro', nome: 'RG e CPF do responsável financeiro (frente e verso — função prevista no estatuto ou em ata)', condicao: 'sempre' },
  { key: 'certidao_federal', nome: 'Certidão negativa de débitos federais', condicao: 'sempre' },
  { key: 'certidao_estadual', nome: 'Certidão negativa de débitos estaduais (Paraná)', condicao: 'sempre' },
  { key: 'certidao_municipal', nome: 'Certidão negativa de débitos municipais (Curitiba)', condicao: 'sempre' },
  { key: 'certidao_trabalhista', nome: 'Certidão negativa de débitos trabalhistas', condicao: 'sempre' },
  { key: 'certidao_tce_pr', nome: 'Certidão liberatória do Tribunal de Contas do Estado do Paraná', condicao: 'sempre' },
  { key: 'certificado_fgts', nome: 'Certificado de regularidade do FGTS', condicao: 'sempre' },
  { key: 'responsavel_tecnico', nome: 'Declaração do responsável técnico pelo planejamento (Anexo XXI) + registro CONFEF/CREF do RT', condicao: 'sempre' },
  { key: 'termo_fomento', nome: 'Declaração de Termo de Fomento FMEL 2026 (Anexo XV) ou de não-enquadramento (Anexo XVI)', condicao: 'sempre' },
  { key: 'lista_participantes', nome: 'Lista nominal de participantes do projeto (Anexo X)', condicao: 'sempre' },
  { key: 'permissao_uso_local', nome: 'Permissão de uso do local de execução (cessão de uso, contrato de aluguel, certidão de propriedade...)', condicao: 'sempre' },
  { key: 'antecedentes_colaboradores', nome: 'Certidões negativas de antecedentes criminais dos colaboradores (ePol SINIC — uma por pessoa)', condicao: 'atua_com_menores', multiplo: true, rotulo_instancia: 'Certidão' },
  { key: 'declaracao_nao_enquadramento_antecedentes', nome: 'Declaração de não-enquadramento — antecedentes criminais (Anexo XX)', condicao: 'nao_atua_com_menores' },
];

function checklistPorTipo(tipoPessoa) {
  if (tipoPessoa === 'tecnico') return CHECKLIST_TECNICO;
  if (tipoPessoa === 'pessoa_juridica') return CHECKLIST_PESSOA_JURIDICA;
  return CHECKLIST_ATLETA;
}

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
// `item_checklist`: chave do item do checklist que esse anexo atende (o
// documento gerado sai SEM assinatura, então nunca conta como entregue —
// só é baixado; o usuário assina e envia pelo item). Sem chave, ou item
// ausente no checklist do participante: vira item pendente `anexo_<código>`.
// `gerar_para`: tipos de participante que podem gerar o anexo (validado no
// backend). `fonte` com ponto é resolvido em documentosIncentivoController
// (resolverFonte): 'tecnico.x', 'entidade.x', 'pj.nome_cnpj',
// 'arte_marcial.nome'.
// Declarações assinadas pelo responsável legal da PJ (Anexos XV/XVI/XX).
const CAMPOS_DECLARACAO_PJ = [
  { key: 'declarante_nome', label: 'Nome do responsável legal', fonte: 'responsavel_legal_nome' },
  { key: 'declarante_rg', label: 'RG do responsável legal', fonte: 'responsavel_legal_rg' },
  { key: 'declarante_cpf', label: 'CPF do responsável legal', fonte: 'responsavel_legal_cpf' },
  { key: 'instituicao', label: 'Instituição', fonte: 'pj.nome_cnpj' },
  { key: 'projeto_nome', label: 'Nome do projeto', fonte: 'projeto_nome' },
  { key: 'dia', label: 'Dia (assinatura)' },
  { key: 'mes_extenso', label: 'Mês por extenso (assinatura)' },
];

const ANEXOS = {
  IX: {
    nome: 'Declaração de Residência',
    item_checklist: 'declaracao_residencia_anexo_ix',
    gerar_para: ['atleta', 'tecnico'],
    template: 'anexo-ix.docx',
    campos: [
      { key: 'declarante_nome', label: 'Nome do declarante (dono do comprovante)' },
      { key: 'declarante_rg', label: 'RG do declarante' },
      { key: 'declarante_cpf', label: 'CPF do declarante' },
      { key: 'morador_nome', label: 'Nome do morador', fonte: 'nome' },
      { key: 'morador_rg', label: 'RG do morador', fonte: 'rg' },
      { key: 'morador_cpf', label: 'CPF do morador', fonte: 'cpf' },
      // Rua/nº - bairro + CEP - cidade/UF, em 2 linhas (as 2 linhas do modelo).
      { key: 'endereco', label: 'Endereço completo', fonte: 'endereco_completo' },
      { key: 'dia', label: 'Dia (assinatura)' },
      { key: 'mes_extenso', label: 'Mês por extenso (assinatura)' },
    ],
  },
  XI: {
    nome: 'Relação de Atletas sob Responsabilidade do Técnico',
    item_checklist: 'relacao_atletas',
    gerar_para: ['tecnico'],
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
    // atletas que o usuário seleciona na geração (`atletas_ids`, entre os
    // participantes atleta ativos do módulo) — a tela pré-marca os que têm
    // tecnico_responsavel_id apontando pra esse técnico.
  },
  XII: {
    nome: 'Declaração de Vínculo Atleta / Técnico',
    item_checklist: null,
    gerar_para: ['atleta'],
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
    item_checklist: 'vinculo_federativo',
    gerar_para: ['atleta', 'tecnico'],
    template: 'anexo-xvii.docx',
    campos: [
      { key: 'declarante_nome', label: 'Nome do declarante', fonte: 'nome' },
      { key: 'declarante_rg', label: 'RG do declarante', fonte: 'rg' },
      { key: 'declarante_cpf', label: 'CPF do declarante', fonte: 'cpf' },
      // Escolha única; `padrao_por_tipo` pré-marca conforme tipo_pessoa.
      { key: 'papel', label: 'Declara vínculo como', opcoes: ['atleta', 'paratleta', 'técnico(a)'], padrao_por_tipo: { atleta: 'atleta', tecnico: 'técnico(a)' } },
      // "NOME - CNPJ ..." do cadastro de entidades (fallback: texto legado).
      { key: 'entidade', label: 'Entidade federativa', fonte: 'entidade.nome_cnpj' },
      { key: 'cidade', label: 'Cidade sede da entidade', fonte: 'entidade.cidade' },
      { key: 'dia', label: 'Dia (assinatura)' },
      { key: 'mes_extenso', label: 'Mês por extenso (assinatura)' },
    ],
  },
  XVIII: {
    nome: 'Vínculo Federativo — Declaração de Não-Enquadramento',
    item_checklist: 'vinculo_federativo',
    gerar_para: ['atleta', 'tecnico'],
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
    item_checklist: 'declaracao_nao_enquadramento_antecedentes',
    gerar_para: ['tecnico'],
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
    item_checklist: 'responsavel_tecnico',
    // Só Pessoa Jurídica (Quadro de Normas, item 13). Declarante é o RT
    // (profissional CONFEF/CREF), não a entidade — dados digitados.
    gerar_para: ['pessoa_juridica'],
    template: 'anexo-xxi.docx',
    campos: [
      { key: 'declarante_nome', label: 'Nome do responsável técnico' },
      { key: 'declarante_rg', label: 'RG do responsável técnico' },
      { key: 'declarante_cpf', label: 'CPF do responsável técnico' },
      { key: 'confef_cref', label: 'Registro CONFEF/CREF do responsável técnico' },
      { key: 'projeto_nome', label: 'Nome do projeto', fonte: 'projeto_nome' },
      { key: 'dia', label: 'Dia (assinatura)' },
      { key: 'mes_extenso', label: 'Mês por extenso (assinatura)' },
    ],
  },
  X: {
    nome: 'Listagem de Participantes (Pessoa Jurídica)',
    item_checklist: 'lista_participantes',
    gerar_para: ['pessoa_juridica'],
    template: 'anexo-x.docx',
    campos: [
      { key: 'pj_nome', label: 'PJ proponente', fonte: 'pj.nome_cnpj' },
      { key: 'modalidade', label: 'Modalidade', fonte: 'arte_marcial.nome' },
      { key: 'local', label: 'Local/endereço de execução', fonte: 'local_execucao' },
      { key: 'dia', label: 'Dia (assinatura)' },
      { key: 'mes_extenso', label: 'Mês por extenso (assinatura)' },
    ],
    // linhas[] (numero/nome/nascimento/documento) vem dos alunos que o
    // usuário seleciona na geração (`alunos_ids`).
  },
  XV: {
    nome: 'Declaração de Termo de Fomento Aprovado (FMEL 2026)',
    item_checklist: 'termo_fomento',
    gerar_para: ['pessoa_juridica'],
    template: 'anexo-xv.docx',
    campos: CAMPOS_DECLARACAO_PJ,
  },
  XVI: {
    nome: 'Termo de Fomento — Declaração de Não-Enquadramento',
    item_checklist: 'termo_fomento',
    gerar_para: ['pessoa_juridica'],
    template: 'anexo-xvi.docx',
    campos: CAMPOS_DECLARACAO_PJ,
  },
  XX: {
    nome: 'Antecedentes Criminais — Declaração de Não-Enquadramento (Pessoa Jurídica)',
    item_checklist: 'declaracao_nao_enquadramento_antecedentes',
    gerar_para: ['pessoa_juridica'],
    template: 'anexo-xx.docx',
    campos: [
      ...CAMPOS_DECLARACAO_PJ.filter(c => !['dia', 'mes_extenso'].includes(c.key)),
      { key: 'projeto_numero', label: 'Número do projeto (se já tiver — senão deixe em branco)' },
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
  const checklist = checklistPorTipo(tipoPessoa);
  const ordemCanonica = checklist.findIndex(item => item.key === tipoDocumento);
  if (ordemCanonica === -1) return null;
  return { ...checklist[ordemCanonica], ordemCanonica };
}

module.exports = { ITEM_CREDENCIAL, CHECKLIST_ATLETA, CHECKLIST_TECNICO, CHECKLIST_PESSOA_JURIDICA, checklistPorTipo, CATEGORIAS_DESPESA, TIPOS_CONTRAPARTIDA, ANEXOS, buscarItemChecklist };
