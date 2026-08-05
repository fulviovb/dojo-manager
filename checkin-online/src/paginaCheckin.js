// Página de check-in servida direto pelo Express, sem build step (o módulo
// checkin-online/ é propositalmente minimalista — sem React/bundler). O
// próprio HTML busca os dados via fetch em GET/POST na mesma rota que o
// gerou, só que pedindo JSON explicitamente (Accept: application/json).
function paginaCheckin() {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Check-in</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: flex; justify-content: center; align-items: flex-start;
         background: #f5f5f5; padding: 24px; font-family: -apple-system, Segoe UI, Roboto, sans-serif; }
  .card { background: #fff; border-radius: 12px; padding: 24px; width: 100%; max-width: 480px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.1); margin-top: 32px; }
  h2 { text-align: center; margin: 0 0 8px; }
  .sub { text-align: center; color: #888; margin-bottom: 24px; font-size: 14px; }
  .msg { color: #888; font-size: 18px; text-align: center; }
  .erro { color: #c62828; text-align: center; }
  button.aluno { display: block; width: 100%; padding: 14px 16px; margin-bottom: 10px; font-size: 16px;
                 text-align: left; border-radius: 8px; border: 2px solid #ddd; background: #fff; color: #333; cursor: pointer; }
  button.aluno[disabled] { background: #e8f5e9; border-color: #4caf50; color: #2e7d32; cursor: default; }
  .ok { text-align: center; }
  .ok .check { font-size: 64px; }
  .ok h2 { color: #2e7d32; }
  .confirma { text-align: center; }
  .confirma .icone { font-size: 48px; }
  .confirma .nome { font-size: 20px; font-weight: bold; color: #1e2a38; margin: 4px 0 24px; }
  .confirma .botoes { display: flex; gap: 10px; justify-content: center; }
  .confirma button { padding: 12px 20px; border-radius: 8px; font-size: 15px; cursor: pointer; }
  .btn-cancelar { border: 2px solid #ddd; background: #fff; color: #555; }
  .btn-confirmar { border: none; background: #2e7d32; color: #fff; font-weight: bold; }
</style>
</head>
<body>
  <div class="card" id="app"><p class="msg">Carregando...</p></div>
  <script>
    const app = document.getElementById('app');
    const qrToken = window.location.pathname.split('/').filter(Boolean).pop();

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }

    function renderErro(texto) {
      app.innerHTML = '<p class="erro">' + escapeHtml(texto) + '</p>';
    }

    function renderMensagem(texto) {
      app.innerHTML = '<p class="msg">' + escapeHtml(texto) + '</p>';
    }

    function renderConfirmado(nome, turma) {
      app.innerHTML = '<div class="ok"><div class="check">✅</div><h2>Check-in confirmado!</h2>' +
        '<p style="color:#555">' + escapeHtml(nome) + '</p>' +
        '<p style="color:#888;font-size:14px">Aula: ' + escapeHtml(turma) + '</p></div>';
    }

    function renderConfirmacao(aluno, dados) {
      app.innerHTML = '<div class="confirma"><div class="icone">🥋</div><h2>Confirma o check-in de</h2>' +
        '<p class="nome">' + escapeHtml(aluno.nome) + '?</p>' +
        '<div class="botoes">' +
        '<button class="btn-cancelar" id="btnCancelar">Cancelar</button>' +
        '<button class="btn-confirmar" id="btnConfirmar">Sim, confirmar</button>' +
        '</div></div>';
      document.getElementById('btnCancelar').onclick = () => renderLista(dados);
      document.getElementById('btnConfirmar').onclick = () => fazerCheckin(aluno.id, aluno.nome, dados.turma_nome);
    }

    function renderLista(dados) {
      const pendentes = dados.alunos.filter(a => !a.checkin_feito);
      let html = '<h2 style="text-align:center">🥋 ' + escapeHtml(dados.turma_nome) + '</h2>' +
        '<p class="sub">' + escapeHtml(dados.hora_inicio) + ' – ' + escapeHtml(dados.hora_fim) + ' · Toque seu nome</p><div id="lista"></div>';
      app.innerHTML = html;
      const lista = document.getElementById('lista');
      if (pendentes.length === 0) {
        lista.innerHTML = '<p class="msg">✅ Todos os alunos já fizeram check-in.</p>';
        return;
      }
      pendentes.forEach(aluno => {
        const btn = document.createElement('button');
        btn.className = 'aluno';
        btn.textContent = aluno.nome;
        btn.onclick = () => renderConfirmacao(aluno, dados);
        lista.appendChild(btn);
      });
    }

    async function carregar() {
      try {
        const r = await fetch(window.location.pathname, { headers: { Accept: 'application/json' } });
        const dados = await r.json();
        if (!r.ok) return renderErro(dados.erro || 'QR Code inválido.');
        if (!dados.aula_ativa) return renderMensagem('⏰ ' + (dados.mensagem || 'Nenhuma aula em andamento no momento.'));
        renderLista(dados);
      } catch (e) {
        renderErro('Erro de conexão. Tente novamente.');
      }
    }

    async function fazerCheckin(alunoId, nomeAluno, turmaNome) {
      try {
        const r = await fetch(window.location.pathname, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ aluno_id: alunoId }),
        });
        const dados = await r.json();
        if (!r.ok) return renderErro(dados.erro || 'Erro ao registrar check-in.');
        renderConfirmado(nomeAluno, turmaNome);
      } catch (e) {
        renderErro('Erro ao registrar check-in. Tente novamente.');
      }
    }

    carregar();
  </script>
</body>
</html>`;
}

module.exports = { paginaCheckin };
