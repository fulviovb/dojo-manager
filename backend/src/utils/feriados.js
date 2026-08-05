// Feriados nacionais brasileiros — usado pelo "Semáforo de Graduação" pra
// não contar como aula disponível um dia que na prática não teria aula.
// Cobre só feriados NACIONAIS de verdade (data fixa + Sexta-feira Santa, que
// é móvel); não inclui feriados municipais/estaduais nem pontos facultativos
// (Carnaval, Corpus Christi) por variarem de cidade pra cidade — se a escola
// precisar disso, é um ajuste futuro.
const { dataLocalISO } = require('./data');

const FERIADOS_FIXOS = [
  [1, 1],   // Confraternização Universal
  [4, 21],  // Tiradentes
  [5, 1],   // Dia do Trabalho
  [9, 7],   // Independência
  [10, 12], // Nossa Senhora Aparecida
  [11, 2],  // Finados
  [11, 15], // Proclamação da República
  [11, 20], // Consciência Negra (nacional desde a Lei 14.759/2023)
  [12, 25], // Natal
];

// Domingo de Páscoa pelo algoritmo de Gauss/Anonymous Gregorian.
function pascoa(ano) {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

function feriadosDoAno(ano) {
  const datas = FERIADOS_FIXOS.map(([mes, dia]) => dataLocalISO(new Date(ano, mes - 1, dia)));
  const dataPascoa = pascoa(ano);
  const sextaSanta = new Date(dataPascoa);
  sextaSanta.setDate(dataPascoa.getDate() - 2);
  datas.push(dataLocalISO(sextaSanta));
  return datas;
}

// Set de feriados (YYYY-MM-DD) cobrindo todo ano entre as duas datas ISO.
function feriadosNoIntervalo(inicioISO, fimISO) {
  const anoInicio = parseInt(inicioISO.slice(0, 4), 10);
  const anoFim = parseInt(fimISO.slice(0, 4), 10);
  const set = new Set();
  for (let ano = anoInicio; ano <= anoFim; ano++) {
    feriadosDoAno(ano).forEach((d) => set.add(d));
  }
  return set;
}

module.exports = { feriadosNoIntervalo };
