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

module.exports = {
  Escola, Usuario, ArteMarcial, Faixa, CriterioGraduacao,
  GraduacaoAluno, Ocorrencia,
  Turma, Sala, HorarioTurma, Aula, Chamada, MatriculaAluno,
  PlanoMensalidade, AssinaturaAluno, Mensalidade, Pagamento,
};
