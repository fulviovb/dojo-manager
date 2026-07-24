# CLAUDE.md — escola-artes-marciais

## Sobre
Sistema de gestão de escola de artes marciais substituindo o iDojo. Prioridade #1: chamada com QR Code (aluno faz auto check-in, professor valida). Multi-escola, isolamento total por escola_id.

## Repos neste workspace
- `backend/` — Node.js + Express + MySQL + Sequelize + JWT (porta 5000)
- `frontend/` — React 18 CRA + axios (porta 3000)

## Documentos
- `PRD.md` — Requisitos, user stories (US-01 a US-06) e tarefas (T-01 a T-15)
- `Progress.txt` — Tracker de progresso

## Docker Compose
```bash
docker compose up              # sobe tudo (mysql + backend + frontend)
docker compose up mysql        # só banco
docker compose ps              # status dos serviços
docker compose logs -f backend # logs do backend
docker compose exec backend sh # shell no backend
```

## Mapa de portas
| Serviço  | Porta |
|----------|-------|
| mysql    | :3307 |
| backend  | :5000 |
| frontend | :3000 |

## Referência de padrões
- Stack idêntica ao `~/competicao-manager/` — use como referência para dúvidas de padrão
- Scripts de geração: `~/competicao-manager/scripts/criar-recurso.sh` e `criar-pagina-frontend.sh`

## Boundaries (NUNCA faça)
- NUNCA compartilhar dados entre escola_id diferentes — todo query deve filtrar por escola_id
- NUNCA usar raw SQL — sempre Sequelize ORM
- NUNCA expor endpoints admin/professor sem verificar JWT + role
- NUNCA armazenar senhas em texto plano — sempre bcrypt
- NÃO pular a validação da janela ±20 min no check-in

## Roles e acesso
- `admin` → acesso total
- `professor` → lê/escreve apenas turmas onde é professor_id
- `aluno` → apenas endpoint público `/api/checkin/:qr_token` (sem JWT)

## Regras críticas de check-in
- Janela válida: `hora_inicio - 20min` até `hora_fim + 20min`
- Check-in duplicado: idempotente (findOrCreate)
- QR Code = `qr_token` da Sala → busca Aula ativa pelo horário da data atual
- Página frontend `/checkin/:qr_token` é pública (sem AuthGuard)

## Semáforo de ausência
- 🟡 AMARELO: 3 aulas consecutivas sem presença
- 🟠 LARANJA: 2 semanas corridas sem presença
- 🔴 VERMELHO: % faltas >= `escola.threshold_falta_vermelho` (default 40%)

## Graduação
- Elegível SE `chamadas_confirmadas_desde_ultima_graduacao >= CriterioGraduacao.min_aulas`
- Critério configurável por escola + arte_marcial + faixa (model CriterioGraduacao)

## Fluxo de trabalho
1. Leia `PRD.md` e `Progress.txt`
2. Encontre a próxima task `[ ]` — comece por T-01 → T-02 → T-04 → T-05 (prioridade check-in)
3. Implemente no repo correto (campo **Repo** na task)
4. Rode verificação: `docker compose exec backend node -e "require('./src/models/index')" 2>&1`
5. Commite com Conventional Commits: `feat:`, `fix:`, `test:`, `refactor:`
6. Atualize `Progress.txt` marcando `[x]`

## Comandos úteis
```bash
# Backend
docker compose exec backend npm run dev
docker compose exec backend node -e "const db = require('./src/config/database'); db.authenticate().then(() => console.log('OK'))"

# Verificar health
curl http://localhost:5000/api/health

# Frontend
docker compose logs -f frontend
```

## Quando estiver preso
Se após 3 tentativas não resolver:
1. Marque a task como `[-]` no Progress.txt
2. Documente o motivo
3. Passe para a próxima task
