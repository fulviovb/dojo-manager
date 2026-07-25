// Data local (YYYY-MM-DD) do servidor — nunca use toISOString() para "hoje":
// toISOString() converte para UTC, então entre 21h e 23h59 (horário de Brasília,
// UTC-3) ela já retorna o dia seguinte.
const dataLocalISO = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

module.exports = { dataLocalISO };
