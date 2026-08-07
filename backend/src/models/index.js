const Escola = require('./Escola');
const Usuario = require('./Usuario');
const ArteMarcial = require('./ArteMarcial');
const Faixa = require('./Faixa');
const CriterioGraduacao = require('./CriterioGraduacao');
const GraduacaoAluno = require('./GraduacaoAluno');
const Ocorrencia = require('./Ocorrencia');
const Turma = require('./Turma');
const Sala = require('./Sala');
const HorarioTurma = require('./HorarioTurma');
const Aula = require('./Aula');
const Chamada = require('./Chamada');
const MatriculaAluno = require('./MatriculaAluno');
const PlanoMensalidade = require('./PlanoMensalidade');
const AssinaturaAluno = require('./AssinaturaAluno');
const Mensalidade = require('./Mensalidade');
const Pagamento = require('./Pagamento');
const Exame = require('./Exame');
const FaseExame = require('./FaseExame');
const CriterioExame = require('./CriterioExame');
const CriterioExameFaixa = require('./CriterioExameFaixa');
const ExameParticipante = require('./ExameParticipante');
const AvaliadorExame = require('./AvaliadorExame');
const AvaliacaoAluno = require('./AvaliacaoAluno');
const RespostaCriterio = require('./RespostaCriterio');

// Escola
Escola.hasMany(Usuario, { foreignKey: 'escola_id' });
Usuario.belongsTo(Escola, { foreignKey: 'escola_id' });

Escola.hasMany(ArteMarcial, { foreignKey: 'escola_id' });
ArteMarcial.belongsTo(Escola, { foreignKey: 'escola_id' });

Escola.hasMany(Sala, { foreignKey: 'escola_id' });
Sala.belongsTo(Escola, { foreignKey: 'escola_id' });

Escola.hasMany(PlanoMensalidade, { foreignKey: 'escola_id' });
PlanoMensalidade.belongsTo(Escola, { foreignKey: 'escola_id' });

Escola.hasMany(CriterioGraduacao, { foreignKey: 'escola_id' });
CriterioGraduacao.belongsTo(Escola, { foreignKey: 'escola_id' });

// Arte Marcial
ArteMarcial.hasMany(Faixa, { foreignKey: 'arte_marcial_id' });
Faixa.belongsTo(ArteMarcial, { foreignKey: 'arte_marcial_id' });

ArteMarcial.hasMany(CriterioGraduacao, { foreignKey: 'arte_marcial_id' });
CriterioGraduacao.belongsTo(ArteMarcial, { foreignKey: 'arte_marcial_id' });

// Faixa
Faixa.hasMany(CriterioGraduacao, { foreignKey: 'faixa_id' });
CriterioGraduacao.belongsTo(Faixa, { foreignKey: 'faixa_id' });

// Graduação do Aluno
Usuario.hasMany(GraduacaoAluno, { foreignKey: 'aluno_id' });
GraduacaoAluno.belongsTo(Usuario, { foreignKey: 'aluno_id', as: 'Aluno' });
ArteMarcial.hasMany(GraduacaoAluno, { foreignKey: 'arte_marcial_id' });
GraduacaoAluno.belongsTo(ArteMarcial, { foreignKey: 'arte_marcial_id' });
Faixa.hasMany(GraduacaoAluno, { foreignKey: 'faixa_id' });
GraduacaoAluno.belongsTo(Faixa, { foreignKey: 'faixa_id' });

// Ocorrências
Usuario.hasMany(Ocorrencia, { foreignKey: 'aluno_id' });
Ocorrencia.belongsTo(Usuario, { foreignKey: 'aluno_id', as: 'Aluno' });
Usuario.hasMany(Ocorrencia, { foreignKey: 'professor_id', as: 'OcorrenciasProfessor' });
Ocorrencia.belongsTo(Usuario, { foreignKey: 'professor_id', as: 'Professor' });

// Turma
Escola.hasMany(Turma, { foreignKey: 'escola_id' });
Turma.belongsTo(Escola, { foreignKey: 'escola_id' });

ArteMarcial.hasMany(Turma, { foreignKey: 'arte_marcial_id' });
Turma.belongsTo(ArteMarcial, { foreignKey: 'arte_marcial_id' });

Usuario.hasMany(Turma, { foreignKey: 'professor_id', as: 'TurmasProfessor' });
Turma.belongsTo(Usuario, { foreignKey: 'professor_id', as: 'Professor' });

// Horário
Turma.hasMany(HorarioTurma, { foreignKey: 'turma_id' });
HorarioTurma.belongsTo(Turma, { foreignKey: 'turma_id' });

Sala.hasMany(HorarioTurma, { foreignKey: 'sala_id' });
HorarioTurma.belongsTo(Sala, { foreignKey: 'sala_id' });

// Aula
Turma.hasMany(Aula, { foreignKey: 'turma_id' });
Aula.belongsTo(Turma, { foreignKey: 'turma_id' });

Sala.hasMany(Aula, { foreignKey: 'sala_id' });
Aula.belongsTo(Sala, { foreignKey: 'sala_id' });

// Chamada
Aula.hasMany(Chamada, { foreignKey: 'aula_id' });
Chamada.belongsTo(Aula, { foreignKey: 'aula_id' });

Usuario.hasMany(Chamada, { foreignKey: 'aluno_id', as: 'ChamadasAluno' });
Chamada.belongsTo(Usuario, { foreignKey: 'aluno_id', as: 'Aluno' });

// Matrícula
Usuario.hasMany(MatriculaAluno, { foreignKey: 'aluno_id' });
MatriculaAluno.belongsTo(Usuario, { foreignKey: 'aluno_id', as: 'Aluno' });

Turma.hasMany(MatriculaAluno, { foreignKey: 'turma_id' });
MatriculaAluno.belongsTo(Turma, { foreignKey: 'turma_id' });

Faixa.hasMany(MatriculaAluno, { foreignKey: 'graduacao_atual_faixa_id', as: 'MatriculasFaixa' });
MatriculaAluno.belongsTo(Faixa, { foreignKey: 'graduacao_atual_faixa_id', as: 'FaixaAtual' });

// Financeiro
Usuario.hasMany(Mensalidade, { foreignKey: 'aluno_id' });
Mensalidade.belongsTo(Usuario, { foreignKey: 'aluno_id', as: 'Aluno' });

PlanoMensalidade.hasMany(Mensalidade, { foreignKey: 'plano_id' });
Mensalidade.belongsTo(PlanoMensalidade, { foreignKey: 'plano_id', as: 'Plano' });

Mensalidade.hasMany(Pagamento, { foreignKey: 'mensalidade_id' });
Pagamento.belongsTo(Mensalidade, { foreignKey: 'mensalidade_id' });

Escola.hasMany(AssinaturaAluno, { foreignKey: 'escola_id' });
AssinaturaAluno.belongsTo(Escola, { foreignKey: 'escola_id' });

Usuario.hasMany(AssinaturaAluno, { foreignKey: 'aluno_id' });
AssinaturaAluno.belongsTo(Usuario, { foreignKey: 'aluno_id', as: 'Aluno' });

PlanoMensalidade.hasMany(AssinaturaAluno, { foreignKey: 'plano_id' });
AssinaturaAluno.belongsTo(PlanoMensalidade, { foreignKey: 'plano_id', as: 'Plano' });

AssinaturaAluno.hasMany(Mensalidade, { foreignKey: 'assinatura_id' });
Mensalidade.belongsTo(AssinaturaAluno, { foreignKey: 'assinatura_id', as: 'Assinatura' });

// Módulo de Exame de Faixa — o roteiro (fases/critérios) é editado direto
// na tela do Exame enquanto ele está em "planejamento"; ao criar um exame
// novo, copia o roteiro do exame mais recente da mesma arte marcial (se
// existir) como ponto de partida — sem tabela de template separada.
Escola.hasMany(Exame, { foreignKey: 'escola_id' });
Exame.belongsTo(Escola, { foreignKey: 'escola_id' });
ArteMarcial.hasMany(Exame, { foreignKey: 'arte_marcial_id' });
Exame.belongsTo(ArteMarcial, { foreignKey: 'arte_marcial_id' });

Exame.hasMany(FaseExame, { foreignKey: 'exame_id' });
FaseExame.belongsTo(Exame, { foreignKey: 'exame_id' });

FaseExame.hasMany(CriterioExame, { foreignKey: 'fase_exame_id' });
CriterioExame.belongsTo(FaseExame, { foreignKey: 'fase_exame_id' });

CriterioExame.hasMany(CriterioExameFaixa, { foreignKey: 'criterio_exame_id' });
CriterioExameFaixa.belongsTo(CriterioExame, { foreignKey: 'criterio_exame_id' });

Faixa.hasMany(CriterioExameFaixa, { foreignKey: 'faixa_id' });
CriterioExameFaixa.belongsTo(Faixa, { foreignKey: 'faixa_id' });

Exame.hasMany(ExameParticipante, { foreignKey: 'exame_id' });
ExameParticipante.belongsTo(Exame, { foreignKey: 'exame_id' });
Usuario.hasMany(ExameParticipante, { foreignKey: 'aluno_id' });
ExameParticipante.belongsTo(Usuario, { foreignKey: 'aluno_id', as: 'Aluno' });
Faixa.hasMany(ExameParticipante, { foreignKey: 'faixa_atual_id', as: 'ParticipantesFaixaAtual' });
ExameParticipante.belongsTo(Faixa, { foreignKey: 'faixa_atual_id', as: 'FaixaAtual' });
Faixa.hasMany(ExameParticipante, { foreignKey: 'faixa_pretendida_id', as: 'ParticipantesFaixaPretendida' });
ExameParticipante.belongsTo(Faixa, { foreignKey: 'faixa_pretendida_id', as: 'FaixaPretendida' });

Exame.hasMany(AvaliadorExame, { foreignKey: 'exame_id' });
AvaliadorExame.belongsTo(Exame, { foreignKey: 'exame_id' });

Exame.hasMany(AvaliacaoAluno, { foreignKey: 'exame_id' });
AvaliacaoAluno.belongsTo(Exame, { foreignKey: 'exame_id' });
FaseExame.hasMany(AvaliacaoAluno, { foreignKey: 'fase_exame_id' });
AvaliacaoAluno.belongsTo(FaseExame, { foreignKey: 'fase_exame_id' });
ExameParticipante.hasMany(AvaliacaoAluno, { foreignKey: 'exame_participante_id' });
AvaliacaoAluno.belongsTo(ExameParticipante, { foreignKey: 'exame_participante_id' });
AvaliadorExame.hasMany(AvaliacaoAluno, { foreignKey: 'avaliador_id' });
AvaliacaoAluno.belongsTo(AvaliadorExame, { foreignKey: 'avaliador_id', as: 'Avaliador' });

AvaliacaoAluno.hasMany(RespostaCriterio, { foreignKey: 'avaliacao_id' });
RespostaCriterio.belongsTo(AvaliacaoAluno, { foreignKey: 'avaliacao_id' });
CriterioExame.hasMany(RespostaCriterio, { foreignKey: 'criterio_exame_id' });
RespostaCriterio.belongsTo(CriterioExame, { foreignKey: 'criterio_exame_id' });

// Exame → Graduação (rastreabilidade da nota quando a graduação é confirmada)
ExameParticipante.hasOne(GraduacaoAluno, { foreignKey: 'exame_participante_id' });
GraduacaoAluno.belongsTo(ExameParticipante, { foreignKey: 'exame_participante_id' });

module.exports = {
  Escola, Usuario, ArteMarcial, Faixa, CriterioGraduacao,
  GraduacaoAluno, Ocorrencia,
  Turma, Sala, HorarioTurma, Aula, Chamada, MatriculaAluno,
  PlanoMensalidade, AssinaturaAluno, Mensalidade, Pagamento,
  Exame, FaseExame, CriterioExame, CriterioExameFaixa,
  ExameParticipante, AvaliadorExame, AvaliacaoAluno, RespostaCriterio,
};
