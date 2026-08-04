// Cor de exibição de uma faixa. `Faixa.cor` no banco costuma vir com o
// placeholder #808080 (faixa cadastrada sem cor definida) — nesse caso,
// deriva a cor a partir do nome. Mesma lógica já usada em TurmaDetalhe.js,
// centralizada aqui pra não duplicar num quarto lugar (RelatorioPage.js).
const COR_POR_NOME = {
  branca: '#f5f5f5', cinza: '#9e9e9e', azul: '#1565c0', amarela: '#fbc02d',
  vermelha: '#c62828', laranja: '#ef6c00', verde: '#2e7d32', roxa: '#6a1b9a',
  marrom: '#5d4037', preta: '#212121',
};

export function corDaFaixa(nome, cor) {
  if (cor && cor.toLowerCase() !== '#808080') return cor;
  const chave = Object.keys(COR_POR_NOME).find((k) => nome?.toLowerCase().includes(k));
  return chave ? COR_POR_NOME[chave] : '#808080';
}
