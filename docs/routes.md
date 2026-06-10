# Rotas — DojoManager

Todas as rotas (exceto `/login`) requerem autenticação via sessão.

## Autenticação

| Método | Rota | Descrição |
|---|---|---|
| GET | `/login` | Exibe formulário de login |
| POST | `/login` | Autentica usuário |
| GET | `/logout` | Encerra sessão |

---

## Dashboard

| Método | Rota | Descrição |
|---|---|---|
| GET | `/dashboard` | Painel principal com KPIs e resumo |

---

## Alunos `/alunos`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/alunos` | Listagem com filtros e busca |
| GET | `/alunos/novo` | Formulário de cadastro |
| POST | `/alunos` | Cria novo aluno |
| GET | `/alunos/:id` | Perfil completo do aluno |
| GET | `/alunos/:id/editar` | Formulário de edição |
| PUT | `/alunos/:id` | Atualiza dados do aluno |
| DELETE | `/alunos/:id` | Remove aluno |
| POST | `/alunos/:id/foto` | Upload de foto |
| GET | `/alunos/:id/graduacoes` | Histórico de graduações |
| POST | `/alunos/:id/graduacoes` | Registra nova graduação |

---

## Modalidades `/modalidades`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/modalidades` | Listagem |
| GET | `/modalidades/nova` | Formulário de cadastro |
| POST | `/modalidades` | Cria modalidade |
| GET | `/modalidades/:id/editar` | Formulário de edição |
| PUT | `/modalidades/:id` | Atualiza |
| DELETE | `/modalidades/:id` | Remove |

---

## Graduações `/graduacoes`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/graduacoes` | Listagem por modalidade |
| GET | `/graduacoes/nova` | Formulário de cadastro |
| POST | `/graduacoes` | Cria graduação |
| GET | `/graduacoes/:id/editar` | Formulário de edição |
| PUT | `/graduacoes/:id` | Atualiza |
| DELETE | `/graduacoes/:id` | Remove |

---

## Locais de Treino `/locais`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/locais` | Listagem |
| GET | `/locais/novo` | Formulário de cadastro |
| POST | `/locais` | Cria local |
| GET | `/locais/:id/editar` | Formulário de edição |
| PUT | `/locais/:id` | Atualiza |
| DELETE | `/locais/:id` | Remove |

---

## Turmas `/turmas`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/turmas` | Listagem |
| GET | `/turmas/nova` | Formulário de cadastro |
| POST | `/turmas` | Cria turma |
| GET | `/turmas/:id` | Detalhes da turma + alunos |
| GET | `/turmas/:id/editar` | Formulário de edição |
| PUT | `/turmas/:id` | Atualiza |
| DELETE | `/turmas/:id` | Remove |
| POST | `/turmas/:id/alunos` | Matricula aluno na turma |
| DELETE | `/turmas/:id/alunos/:alunoId` | Remove aluno da turma |

---

## Aulas `/aulas`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/aulas` | Listagem com filtros |
| GET | `/aulas/nova` | Formulário de agendamento |
| POST | `/aulas` | Agenda aula |
| GET | `/aulas/:id` | Detalhes da aula |
| GET | `/aulas/:id/editar` | Formulário de edição |
| PUT | `/aulas/:id` | Atualiza |
| DELETE | `/aulas/:id` | Remove |

---

## Frequência `/frequencia`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/frequencia` | Listagem de registros |
| GET | `/frequencia/aula/:aulaId` | Chamada de uma aula específica |
| POST | `/frequencia/aula/:aulaId` | Salva chamada |
| GET | `/frequencia/aluno/:alunoId` | Frequência de um aluno |

---

## Planos `/planos`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/planos` | Listagem |
| GET | `/planos/novo` | Formulário de cadastro |
| POST | `/planos` | Cria plano |
| GET | `/planos/:id/editar` | Formulário de edição |
| PUT | `/planos/:id` | Atualiza |
| DELETE | `/planos/:id` | Remove |

---

## Faturas `/faturas`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/faturas` | Listagem com filtros (status, mês, aluno) |
| GET | `/faturas/nova` | Formulário de geração manual |
| POST | `/faturas` | Gera fatura |
| GET | `/faturas/:id` | Detalhes |
| PUT | `/faturas/:id/pagar` | Registra pagamento |
| PUT | `/faturas/:id/cancelar` | Cancela fatura |
| GET | `/faturas/:id/pdf` | Gera PDF do boleto/recibo |

---

## Contas a Pagar `/contas-pagar`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/contas-pagar` | Listagem com filtros |
| GET | `/contas-pagar/nova` | Formulário de cadastro |
| POST | `/contas-pagar` | Cria conta |
| GET | `/contas-pagar/:id/editar` | Formulário de edição |
| PUT | `/contas-pagar/:id` | Atualiza |
| PUT | `/contas-pagar/:id/pagar` | Registra pagamento |
| DELETE | `/contas-pagar/:id` | Remove |

---

## Contas a Receber `/contas-receber`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/contas-receber` | Listagem com filtros |
| GET | `/contas-receber/nova` | Formulário de cadastro |
| POST | `/contas-receber` | Cria conta |
| GET | `/contas-receber/:id/editar` | Formulário de edição |
| PUT | `/contas-receber/:id` | Atualiza |
| PUT | `/contas-receber/:id/receber` | Registra recebimento |
| DELETE | `/contas-receber/:id` | Remove |

---

## Exames de Faixa `/exames`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/exames` | Listagem |
| GET | `/exames/novo` | Formulário de agendamento |
| POST | `/exames` | Agenda exame |
| GET | `/exames/:id` | Detalhes + candidatos |
| GET | `/exames/:id/editar` | Formulário de edição |
| PUT | `/exames/:id` | Atualiza |
| POST | `/exames/:id/candidatos` | Inscreve candidato |
| PUT | `/exames/:id/candidatos/:candidatoId` | Registra resultado |
| DELETE | `/exames/:id` | Remove |

---

## Campeonatos `/campeonatos`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/campeonatos` | Listagem |
| GET | `/campeonatos/novo` | Formulário de cadastro |
| POST | `/campeonatos` | Cria campeonato |
| GET | `/campeonatos/:id` | Detalhes + participantes |
| GET | `/campeonatos/:id/editar` | Formulário de edição |
| PUT | `/campeonatos/:id` | Atualiza |
| POST | `/campeonatos/:id/participantes` | Inscreve participante |
| PUT | `/campeonatos/:id/participantes/:pid` | Registra resultado |
| DELETE | `/campeonatos/:id` | Remove |

---

## Relatórios `/relatorios`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/relatorios` | Página de relatórios disponíveis |
| GET | `/relatorios/financeiro` | Fluxo de caixa, receitas x despesas |
| GET | `/relatorios/frequencia` | Taxa de presença por turma/aluno |
| GET | `/relatorios/alunos` | Aniversariantes, inadimplentes, novos |
| GET | `/relatorios/graduacoes` | Alunos por faixa e modalidade |

---

## Configurações `/configuracoes`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/configuracoes` | Dados da academia + usuários |
| PUT | `/configuracoes/academia` | Atualiza dados da academia |
| POST | `/configuracoes/academia/logo` | Upload da logo |
| GET | `/configuracoes/usuarios` | Listagem de usuários |
| GET | `/configuracoes/usuarios/novo` | Formulário de cadastro |
| POST | `/configuracoes/usuarios` | Cria usuário |
| GET | `/configuracoes/usuarios/:id/editar` | Formulário de edição |
| PUT | `/configuracoes/usuarios/:id` | Atualiza usuário |
| DELETE | `/configuracoes/usuarios/:id` | Remove usuário |
