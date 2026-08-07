// Regras de nota do Módulo de Exame de Faixa (ver modulo-exame-faixa.txt):
// cada fase converge pra 100, distribuído igualmente entre seus critérios.
// Critério não aplicável à faixa pretendida do participante = nota cheia
// automática (regra 2.4). Nota final = média simples entre as fases.

const MULTIPLICADOR_CONCEITO = { '+': 1, '+-': 0.5, '-': 0 };

// criterios: [{ id, faixa_ids: [...] }]
// respostasPorCriterio: { [criterio_id]: '+' | '+-' | '-' }
// Retorna null se algum critério aplicável ainda não foi respondido.
function calcularNotaFase(criterios, respostasPorCriterio, faixaPretendidaId) {
  const total = criterios.length;
  if (total === 0) return 100;

  const pontosPorCriterio = 100 / total;
  let soma = 0;

  for (const criterio of criterios) {
    const aplicavel = criterio.faixa_ids.includes(faixaPretendidaId);
    if (!aplicavel) {
      soma += pontosPorCriterio;
      continue;
    }
    const conceito = respostasPorCriterio[criterio.id];
    if (!(conceito in MULTIPLICADOR_CONCEITO)) return null;
    soma += pontosPorCriterio * MULTIPLICADOR_CONCEITO[conceito];
  }

  return Math.round(soma * 100) / 100;
}

function calcularNotaFinal(notasDeFase) {
  if (notasDeFase.length === 0) return null;
  const soma = notasDeFase.reduce((acc, n) => acc + n, 0);
  return Math.round((soma / notasDeFase.length) * 100) / 100;
}

module.exports = { calcularNotaFase, calcularNotaFinal, MULTIPLICADOR_CONCEITO };
