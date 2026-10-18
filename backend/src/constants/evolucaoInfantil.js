// Catálogo do módulo Evolução Infantil — transcrição das "Fichas de Evolução
// do Aluno — Karatê Infantil" (modulo-karate-infantil/*.pdf, 19 páginas).
// Fonte única: o frontend busca este catálogo em GET /api/evolucao-infantil/modelos,
// e as fichas salvas guardam só as chaves (item → nível), nunca o texto.
// Por isso NÃO renomeie chaves de itens/campos/áreas já usadas — só os rótulos.

// Escala de observação pedagógica (não é nota) — igual em todas as fichas.
const NIVEIS = [
  { valor: 1, sigla: 'PA', rotulo: 'Precisa de apoio' },
  { valor: 2, sigla: 'ED', rotulo: 'Em desenvolvimento' },
  { valor: 3, sigla: 'RS', rotulo: 'Realiza com segurança' },
  { valor: 4, sigla: 'DA', rotulo: 'Demonstra com autonomia' },
];

const campos = (...pares) => pares.map(([k, l]) => ({ k, l }));
const itens = (...rotulos) => rotulos.map((l, i) => ({ k: `i${i + 1}`, l }));

// As 13 fichas temáticas. `area` é a linha correspondente nas fichas de
// visão geral (Mensal, Trimestral, Resumo) — usada pra sugerir o nível da
// área a partir das fichas temáticas do período.
const TEMATICAS = [
  {
    slug: 'atencao_escuta', area: 'atencao_escuta', titulo: 'Atenção e Escuta',
    subtitulo: 'Acompanhe como o aluno observa, escuta e responde aos comandos durante as aulas.',
    itens: itens(
      'Olha para o sensei durante a explicação', 'Escuta o comando até o fim', 'Aguarda o momento de agir',
      'Identifica sinais visuais', 'Responde a comandos simples', 'Mantém o foco em atividades curtas',
      'Retoma a atenção após distrações', 'Acompanha mudanças de comando', 'Observa demonstrações',
      'Precisa de menos lembretes ao longo do tempo',
    ),
    campos: campos(['facilidades', 'Situações em que demonstra mais atenção'], ['estrategias', 'Estratégias que ajudam'],
      ['proximo_foco', 'Próximo foco'], ['observacoes', 'Observações']),
  },
  {
    slug: 'participacao', area: 'participacao', titulo: 'Participação nas Aulas',
    subtitulo: 'Observe o envolvimento do aluno nas diferentes propostas da aula.',
    itens: itens(
      'Entra nas atividades propostas', 'Aceita experimentar novas tarefas', 'Participa dos aquecimentos',
      'Participa das atividades técnicas', 'Participa dos jogos e desafios', 'Mantém envolvimento até o final',
      'Retorna à atividade após pausas', 'Demonstra iniciativa quando se sente seguro', 'Aceita orientações do sensei',
      'Contribui positivamente com a turma',
    ),
    campos: campos(['facilidades', 'Atividades em que mais se envolve'], ['apoio', 'Momentos em que precisa de mais estímulo'],
      ['estrategias', 'O que ajuda na participação'], ['proximo_foco', 'Próximo foco'], ['observacoes', 'Observações']),
  },
  {
    slug: 'disciplina_organizacao', area: 'disciplina_organizacao', titulo: 'Disciplina e Organização',
    subtitulo: 'Acompanhe hábitos de organização, respeito e autocontrole durante as aulas.',
    itens: itens(
      'Organiza-se para iniciar a aula', 'Escuta as orientações', 'Aguarda sua vez', 'Respeita o espaço dos colegas',
      'Cuida dos materiais', 'Segue combinados da turma', 'Consegue parar quando solicitado',
      'Retoma a organização após momentos de agitação', 'Participa da organização do espaço',
      'Precisa de menos lembretes ao longo do tempo',
    ),
    campos: campos(['facilidades', 'Combinados que já realiza com mais autonomia'], ['apoio', 'Situações em que precisa de mais apoio'],
      ['estrategias', 'Estratégias que funcionam bem'], ['proximo_foco', 'Próximo foco'], ['observacoes', 'Observações']),
  },
  {
    slug: 'cooperacao', area: 'cooperacao', titulo: 'Cooperação',
    subtitulo: 'Acompanhe como o aluno participa, compartilha tarefas e interage com os colegas durante as aulas.',
    itens: itens(
      'Participa de atividades em dupla', 'Colabora em tarefas coletivas', 'Aguarda sua vez',
      'Compartilha materiais quando necessário', 'Escuta o parceiro', 'Ajuda sem fazer a tarefa pelo outro',
      'Aceita diferentes parceiros', 'Respeita o espaço dos colegas', 'Contribui para objetivos do grupo',
      'Resolve pequenos desacordos com orientação',
    ),
    campos: campos(['facilidades', 'Situações em que coopera com mais facilidade'], ['apoio', 'Situações em que precisa de mais apoio'],
      ['estrategias', 'Estratégias que ajudam'], ['proximo_foco', 'Próximo foco'], ['observacoes', 'Observações']),
  },
  {
    slug: 'coordenacao_motora', area: 'coordenacao_motora', titulo: 'Coordenação Motora',
    subtitulo: 'Observe como o aluno organiza movimentos de braços, pernas e corpo durante as atividades.',
    itens: itens(
      'Coordena braços e pernas', 'Alterna lados do corpo', 'Realiza movimentos cruzados', 'Acompanha ritmos simples',
      'Reproduz sequências curtas', 'Muda de direção com organização', 'Combina passos e movimentos de braço',
      'Controla movimentos em diferentes velocidades', 'Ajusta o corpo a marcações no chão',
      'Precisa de menos demonstrações ao longo do tempo',
    ),
    campos: campos(['facilidades', 'Movimentos que realiza com mais facilidade'], ['apoio', 'Movimentos que ainda precisam de apoio'],
      ['estrategias', 'Atividades que ajudam'], ['proximo_foco', 'Próximo foco'], ['observacoes', 'Observações']),
  },
  {
    slug: 'equilibrio', area: 'equilibrio', titulo: 'Equilíbrio',
    subtitulo: 'Acompanhe estabilidade e controle postural durante movimentos e posições simples.',
    itens: itens(
      'Mantém postura estável em parada', 'Caminha sobre linha com controle', 'Muda o peso entre os lados',
      'Realiza paradas sem perder a estabilidade', 'Mantém equilíbrio em um apoio por curto tempo',
      'Retorna à posição estável após movimento', 'Ajusta a postura quando necessário', 'Mantém base organizada',
      'Controla o corpo em movimentos lentos', 'Precisa de menos apoio visual ao longo do tempo',
    ),
    campos: campos(['facilidades', 'Situações em que demonstra mais estabilidade'], ['apoio', 'Situações em que precisa de mais apoio'],
      ['estrategias', 'Atividades que ajudam'], ['proximo_foco', 'Próximo foco'], ['observacoes', 'Observações']),
  },
  {
    slug: 'controle_corporal', area: 'controle_corporal', titulo: 'Controle Corporal',
    subtitulo: 'Observe como o aluno organiza, ajusta e interrompe os movimentos durante as atividades.',
    itens: itens(
      'Inicia o movimento após o sinal', 'Para quando solicitado', 'Controla a velocidade',
      'Ajusta a força em atividades com alvos', 'Mantém o movimento dentro do espaço proposto',
      'Realiza movimentos lentos com organização', 'Retorna à posição inicial com controle',
      'Evita movimentos bruscos desnecessários', 'Ajusta o alcance do movimento',
      'Mantém controle mesmo quando a atividade muda',
    ),
    campos: campos(['facilidades', 'Situações em que demonstra mais controle'], ['apoio', 'Situações em que precisa de mais apoio'],
      ['estrategias', 'Estratégias que funcionam bem'], ['proximo_foco', 'Próximo foco'], ['observacoes', 'Observações']),
  },
  {
    slug: 'deslocamento', area: 'deslocamento', titulo: 'Deslocamento e Percepção Espacial',
    subtitulo: 'Acompanhe como o aluno se movimenta e organiza seu espaço durante as atividades.',
    itens: itens(
      'Desloca-se para frente com controle', 'Recua com organização', 'Realiza deslocamento lateral',
      'Identifica direita e esquerda nas atividades', 'Muda de direção ao sinal', 'Contorna obstáculos com segurança',
      'Mantém distância adequada dos colegas', 'Encontra espaços livres na turma', 'Segue rotas e marcações no chão',
      'Ajusta o deslocamento ao tamanho do espaço',
    ),
    campos: campos(['facilidades', 'Deslocamentos que realiza com mais facilidade'], ['apoio', 'Situações em que precisa de mais apoio'],
      ['estrategias', 'Estratégias que ajudam'], ['proximo_foco', 'Próximo foco'], ['observacoes', 'Observações']),
  },
  {
    slug: 'agilidade_reacao', area: 'agilidade_reacao', titulo: 'Agilidade e Reação',
    subtitulo: 'Acompanhe como o aluno percebe estímulos e ajusta seus movimentos durante as atividades.',
    itens: itens(
      'Responde a sinais visuais', 'Responde a sinais sonoros', 'Inicia o movimento após o comando',
      'Muda de direção quando solicitado', 'Para o movimento ao sinal', 'Alterna entre ações diferentes',
      'Adapta-se a comandos surpresa', 'Realiza deslocamentos curtos com organização',
      'Mantém o controle ao aumentar o ritmo', 'Precisa de menos repetições do comando ao longo do tempo',
    ),
    campos: campos(['facilidades', 'Estímulos aos quais responde melhor'], ['apoio', 'Situações em que precisa de mais apoio'],
      ['estrategias', 'Atividades que ajudam'], ['proximo_foco', 'Próximo foco'], ['observacoes', 'Observações']),
  },
  {
    slug: 'fundamentos', area: 'fundamentos', titulo: 'Fundamentos do Karatê',
    subtitulo: 'Acompanhe a organização dos fundamentos trabalhados nas aulas, sem caráter de graduação.',
    itens: itens(
      'Organiza a base natural', 'Organiza a base aberta', 'Mantém postura estável', 'Posiciona as mãos em guarda',
      'Combina passo e guarda', 'Realiza bloqueios simples no ar', 'Retorna à posição inicial',
      'Controla o alcance dos movimentos', 'Executa sequências curtas de fundamentos', 'Ajusta a posição após orientação',
    ),
    campos: campos(['facilidades', 'Fundamentos que realiza com mais segurança'], ['apoio', 'Fundamentos que precisam ser retomados'],
      ['estrategias', 'Orientações que ajudam'], ['proximo_foco', 'Próximo foco'], ['observacoes', 'Observações']),
  },
  {
    slug: 'precisao', area: 'precisao', titulo: 'Precisão e Controle',
    subtitulo: 'Observe como o aluno direciona e controla seus movimentos em atividades com alvos e limites.',
    itens: itens(
      'Direciona o movimento ao alvo indicado', 'Controla a força em toques leves', 'Ajusta o alcance do movimento',
      'Respeita linhas e limites', 'Para o movimento no ponto proposto', 'Rola objetos com direção',
      'Ajusta a distância antes de agir', 'Mantém a postura durante a execução',
      'Realiza sequências de alvos na ordem correta', 'Mantém precisão mesmo em atividades novas',
    ),
    campos: campos(['facilidades', 'Atividades em que demonstra mais precisão'], ['apoio', 'Situações em que precisa de mais apoio'],
      ['estrategias', 'Ajustes que ajudam'], ['proximo_foco', 'Próximo foco'], ['observacoes', 'Observações']),
  },
  {
    slug: 'memoria_motora', area: 'memoria_motora', titulo: 'Memória Motora',
    subtitulo: 'Acompanhe como o aluno observa, lembra e reproduz pequenas sequências trabalhadas em aula.',
    itens: itens(
      'Reproduz uma ação após demonstração', 'Reproduz duas ações em sequência', 'Reproduz três ou mais ações',
      'Lembra a ordem de movimentos simples', 'Associa cartões a movimentos', 'Retoma uma sequência após pequena pausa',
      'Reproduz sequência em ordem inversa com apoio', 'Identifica qual movimento está faltando',
      'Precisa de menos repetições da demonstração', 'Cria e repete uma sequência simples',
    ),
    campos: campos(['facilidades', 'Sequências que realiza com mais facilidade'], ['estrategias', 'Formas de apresentação que ajudam'],
      ['apoio', 'Situações em que precisa de mais apoio'], ['proximo_foco', 'Próximo foco'], ['observacoes', 'Observações']),
  },
  {
    slug: 'autonomia', area: 'autonomia', titulo: 'Autonomia nas Atividades',
    subtitulo: 'Acompanhe como o aluno compreende e realiza tarefas com menos ajuda ao longo do tempo.',
    itens: itens(
      'Inicia tarefas após a explicação', 'Lembra o que deve fazer', 'Busca o material correto',
      'Organiza-se no espaço indicado', 'Realiza tarefas simples sem lembretes constantes',
      'Percebe quando precisa de ajuda', 'Solicita ajuda quando necessário', 'Retoma a atividade após orientação',
      'Cuida dos materiais utilizados', 'Conclui tarefas conhecidas com menos apoio',
    ),
    campos: campos(['facilidades', 'Tarefas em que já demonstra mais autonomia'], ['apoio', 'Situações em que ainda precisa de apoio'],
      ['estrategias', 'Estratégias que ajudam'], ['proximo_foco', 'Próximo foco'], ['observacoes', 'Observações']),
  },
];

// Linhas das fichas de visão geral. O PDF traz Agilidade e Reação só no
// Resumo — Mensal e Trimestral têm 12 linhas. Mantido igual ao PDF.
const AREAS = [
  { k: 'atencao_escuta', l: 'Atenção e escuta' },
  { k: 'participacao', l: 'Participação' },
  { k: 'disciplina_organizacao', l: 'Disciplina e organização' },
  { k: 'cooperacao', l: 'Cooperação' },
  { k: 'coordenacao_motora', l: 'Coordenação motora' },
  { k: 'equilibrio', l: 'Equilíbrio' },
  { k: 'controle_corporal', l: 'Controle corporal' },
  { k: 'deslocamento', l: 'Deslocamento' },
  { k: 'agilidade_reacao', l: 'Agilidade e reação' },
  { k: 'fundamentos', l: 'Fundamentos' },
  { k: 'precisao', l: 'Precisão' },
  { k: 'memoria_motora', l: 'Memória motora' },
  { k: 'autonomia', l: 'Autonomia' },
];
const AREAS_SEM_AGILIDADE = AREAS.filter((a) => a.k !== 'agilidade_reacao');

// `tipo` decide o formulário:
//   'escala'        → tabela de itens com os 4 níveis + campos de texto
//   'trimestral'    → níveis dos 3 meses lidos das fichas Mensais + observação por área
//   'metas'         → ponto de partida + até 3 metas com status
//   'registro_livre'→ lista de registros datados
// `periodo` decide o cabeçalho: 'data' (um dia), 'mes', 'trimestre' ou
// 'periodo' (início/fim). `grupo` só organiza o menu de "Nova ficha".
const MODELOS = [
  {
    slug: 'observacao_inicial', grupo: 'inicio', tipo: 'escala', periodo: 'data', mostra_idade: true,
    titulo: 'Observação Inicial do Aluno',
    subtitulo: 'Registre o ponto de partida para acompanhar a evolução com mais clareza.',
    itens: [
      { k: 'atencao_comandos', l: 'Atenção aos comandos' }, { k: 'participacao', l: 'Participação' },
      { k: 'organizacao_corporal', l: 'Organização corporal' }, { k: 'coordenacao_motora', l: 'Coordenação motora' },
      { k: 'equilibrio', l: 'Equilíbrio' }, { k: 'deslocamento', l: 'Deslocamento' },
      { k: 'controle_movimento', l: 'Controle do movimento' }, { k: 'interacao_colegas', l: 'Interação com colegas' },
      { k: 'compreensao_atividades', l: 'Compreensão das atividades' },
      { k: 'autonomia_tarefas', l: 'Autonomia para realizar tarefas' },
    ],
    campos: campos(['pontos_positivos', 'Primeiros pontos positivos'], ['apoio', 'Pontos que podem receber mais apoio'],
      ['proximo_foco', 'Foco inicial para as próximas aulas'], ['observacoes', 'Observações']),
  },
  ...TEMATICAS.map((t) => ({ ...t, grupo: 'tematica', tipo: 'escala', periodo: 'periodo' })),
  {
    slug: 'mensal', grupo: 'acompanhamento', tipo: 'escala', periodo: 'mes', usa_areas: true,
    titulo: 'Evolução Mensal', subtitulo: 'Registre os principais avanços observados durante o mês.',
    itens: AREAS_SEM_AGILIDADE,
    campos: campos(['avancos', 'Principais avanços do mês'], ['apoio', 'Pontos que ainda precisam de apoio'],
      ['estrategias', 'Atividades que funcionaram bem'], ['proximo_foco', 'Foco para o próximo mês'], ['observacoes', 'Observações']),
  },
  {
    slug: 'trimestral', grupo: 'acompanhamento', tipo: 'trimestral', periodo: 'trimestre', usa_areas: true,
    titulo: 'Evolução Trimestral', subtitulo: 'Observe mudanças e avanços ao longo de três meses de acompanhamento.',
    itens: AREAS_SEM_AGILIDADE,
    campos: campos(['avancos', 'Avanços mais percebidos'], ['apoio', 'Aspectos que precisam continuar sendo trabalhados'],
      ['estrategias', 'Estratégias que mais ajudaram'], ['proximo_foco', 'Próximo foco'], ['observacoes', 'Observações gerais']),
  },
  {
    slug: 'metas', grupo: 'acompanhamento', tipo: 'metas', periodo: 'periodo',
    titulo: 'Metas do Próximo Período', subtitulo: 'Escolha poucos focos e acompanhe o desenvolvimento com clareza.',
    campos: campos(['consolidado', 'O que já está mais consolidado?'], ['apoio', 'O que ainda precisa de apoio?'],
      ['observacoes', 'Observações']),
    campos_meta: campos(['desenvolver', 'O que queremos desenvolver?'], ['como', 'Como podemos trabalhar?'],
      ['atividades', 'Atividades que podem ajudar'], ['progresso', 'Como vamos perceber o progresso?']),
    status_meta: [
      { k: 'iniciar', l: 'Iniciar' }, { k: 'em_andamento', l: 'Em andamento' },
      { k: 'retomar', l: 'Retomar' }, { k: 'alcancada', l: 'Alcançada neste período' },
    ],
    max_metas: 3,
    tem_data_revisao: true,
  },
  {
    slug: 'registro_livre', grupo: 'acompanhamento', tipo: 'registro_livre', periodo: 'periodo',
    titulo: 'Registro Livre do Sensei',
    subtitulo: 'Anote observações pedagógicas que ajudem a acompanhar o aluno ao longo do tempo.',
    campos: campos(['observacoes', 'Observações gerais']),
    campos_registro: campos(['situacao', 'Situação / atividade observada'], ['percebido', 'O que foi percebido?'],
      ['positivo', 'Ponto positivo'], ['apoio', 'Ponto que pode receber mais apoio'], ['estrategia', 'Estratégia utilizada'],
      ['resultado', 'Resultado observado'], ['proximo_passo', 'Próximo passo']),
    aviso: 'Registre apenas informações relevantes para o acompanhamento pedagógico das aulas.',
  },
  {
    slug: 'resumo', grupo: 'acompanhamento', tipo: 'escala', periodo: 'periodo', usa_areas: true,
    titulo: 'Resumo de Evolução do Aluno', subtitulo: 'Reúna os principais avanços observados e organize os próximos passos.',
    itens: AREAS,
    campos: campos(['avancos', 'Principais avanços observados'], ['pontos_fortes', 'Pontos fortes do aluno'],
      ['apoio', 'Aspectos que devem continuar sendo trabalhados'], ['estrategias', 'Estratégias que mais funcionaram'],
      ['foco_1', 'Próximo foco 1'], ['foco_2', 'Próximo foco 2'], ['foco_3', 'Próximo foco 3'],
      ['observacoes', 'Observações do sensei']),
    tem_data_revisao: true,
    aviso: 'Registre apenas informações relevantes para o acompanhamento pedagógico das aulas.',
  },
];

const MODELO_POR_SLUG = Object.fromEntries(MODELOS.map((m) => [m.slug, m]));

module.exports = { NIVEIS, AREAS, MODELOS, MODELO_POR_SLUG, TEMATICAS };
