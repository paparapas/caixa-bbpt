/**
 * Caixa BBPT — ligação entre a app e o ficheiro de Finanças.
 *
 * Instalar (uma vez por ficheiro):
 *  1. No ficheiro do Google Sheets: Extensões › Apps Script.
 *  2. Apaga o que lá estiver, cola este ficheiro inteiro e muda as chaves abaixo
 *     (uma por organizador + uma de leitura). Usa só letras e números.
 *  3. Guardar › Implementar › Nova implementação › Tipo: Aplicação Web
 *       Executar como: Eu · Quem tem acesso: Qualquer pessoa
 *  4. Autoriza e copia o URL que termina em /exec. Esse URL vai para a app (Mais › Google Sheets).
 *
 * O script só escreve:
 *  - caixas de seleção (semana da competição e mês em Users/Estadios);
 *  - a coluna "Contribuição adicional";
 *  - linhas novas na tabela Despesas;
 *  - nomes novos nas linhas vazias da USER LIST;
 *  - a aba "App Caixa", onde a app guarda torneios e pagamentos.
 * Nunca escreve por cima de uma fórmula.
 */

// ⚠️ Uma chave por organizador. O nome tem de ser igual ao da USER LIST.
//    A chave é pessoal: é assim que a app sabe quem fez cada alteração.
//    Para tirar o acesso a alguém, apaga a linha e publica uma versão nova.
const ORGANIZADORES = {
  'paparapas': 'MUDA-ESTA-CHAVE',
  'Hyero': 'MUDA-ESTA-CHAVE',
};
// Chave de leitura (ex.: jogadores): vê tudo, não altera nada.
const READ_KEY = 'MUDA-ESTA-CHAVE-LEITURA';

const TAB_USERS = 'Users/Estadios';      // início do nome da aba
const TAB_BUDGET = 'Budget Geral';
const TAB_APP = 'App Caixa';
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const FIRST_ROW = 5;    // primeira linha de jogadores
const LAST_ROW = 105;   // última linha de jogadores

/* ---------------- Entrada ---------------- */
function doGet(e) {
  return handle_(e && e.parameter ? e.parameter : {});
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents || '{}'); } catch (err) { return out_({ ok: false, error: 'Pedido inválido.' }); }
  return handle_(body);
}

function handle_(req) {
  try {
    const key = String(req.key || '').trim();
    const names = Object.keys(ORGANIZADORES);
    const who = names.filter(function (n) { return ORGANIZADORES[n] === key; })[0] || '';
    if (key.indexOf('MUDA-ESTA') === 0) return out_({ ok: false, error: 'Essa chave ainda é a de exemplo. Muda as chaves no topo do script e publica uma versão nova (Implementar › Gerir implementações › lápis › Versão: Nova versão).' });
    const dup = names.some(function (a, i) { return names.some(function (b, j) { return j > i && ORGANIZADORES[a] === ORGANIZADORES[b]; }); });
    if (dup) return out_({ ok: false, error: 'Há dois organizadores com a mesma chave no script. Cada um tem de ter a sua.' });
    const role = who ? 'org' : key && key === READ_KEY ? 'read' : null;
    if (!role) return out_({ ok: false, error: 'Chave errada. Confirma maiúsculas e minúsculas, e que a versão publicada do script tem esta chave.' });
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const action = req.action || 'sync';
    if (action === 'ping') return out_({ ok: true, role: role, who: who, organizers: names, file: ss.getName() });
    if (action === 'sync') {
      const res = { ok: true, role: role, who: who, organizers: names, file: ss.getName() };
      res.records = sync_(ss, role === 'org' ? (req.push || []) : [], Number(req.since || 0), res, who);
      if (req.sheet) res.sheet = readSheet_(ss);
      return out_(res);
    }
    if (action === 'apply') {
      if (role !== 'org') return out_({ ok: false, error: 'Só organizadores podem escrever no ficheiro.' });
      const rep = apply_(ss, req);
      rep.who = who;
      return out_(rep);
    }
    return out_({ ok: false, error: 'Ação desconhecida: ' + action });
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message || err) });
  }
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------------- Utilitários ---------------- */
function norm_(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
function tab_(ss, prefix) {
  const want = norm_(prefix);
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) if (norm_(sheets[i].getName()) === want) return sheets[i];
  for (let i = 0; i < sheets.length; i++) if (norm_(sheets[i].getName()).indexOf(want) === 0) return sheets[i];
  return null;
}
function weekKey_(label) {
  // "Semana  7 (12/09/26)" -> "semana 7"; "Evento Teams (21/06/26)" -> "evento teams"
  return norm_(String(label).split('(')[0]);
}
function rowsByName_(sheet) {
  const vals = sheet.getRange(FIRST_ROW, 1, LAST_ROW - FIRST_ROW + 1, 1).getDisplayValues();
  const map = {};
  vals.forEach(function (r, i) { const k = norm_(r[0]); if (k && !map[k]) map[k] = FIRST_ROW + i; });
  return map;
}
function isFormula_(range) {
  return !!range.getFormula();
}

/* ---------------- Leitura do ficheiro ---------------- */
function readSheet_(ss) {
  const yr = String(ss.getName()).match(/\[(\d{4})\]/);
  const out = { players: [], months: [], budget: { lines: [], saldos: {} }, comps: [], year: yr ? Number(yr[1]) : new Date().getFullYear() };
  const users = tab_(ss, TAB_USERS);
  if (users) {
    const head = users.getRange(4, 1, 1, users.getLastColumn()).getDisplayValues()[0];
    const monthCols = {};
    let extraCol = -1;
    const nm = MONTHS.map(norm_);
    head.forEach(function (h, i) {
      const k = nm.indexOf(norm_(h));
      if (k >= 0) monthCols[k] = i;
      if (norm_(h).indexOf('contribuicao adicional') === 0) extraCol = i;
    });
    out.months = Object.keys(monthCols).map(Number).sort(function (a, b) { return a - b; });
    const n = LAST_ROW - FIRST_ROW + 1;
    const rows = users.getRange(FIRST_ROW, 1, n, users.getLastColumn()).getValues();
    rows.forEach(function (r, i) {
      const name = String(r[0] || '').trim();
      if (!name) return;
      const paid = {};
      out.months.forEach(function (m) { const v = r[monthCols[m]]; if (v === true || (typeof v === 'number' && v > 0)) paid[m + 1] = true; });
      out.players.push({ name: name, row: FIRST_ROW + i, paid: paid, extra: extraCol >= 0 ? Number(r[extraCol]) || 0 : 0 });
    });
    out.freeRows = rows.filter(function (r) { return !String(r[0] || '').trim(); }).length;
  }
  const b = tab_(ss, TAB_BUDGET);
  if (b) {
    const v = b.getRange(1, 1, 40, 11).getValues();
    let section = '';
    for (let i = 0; i < v.length; i++) {
      const a = String(v[i][0] || '').trim();
      if (/^income/i.test(a)) { section = a; continue; }
      if (a && section && !/^total(\s+est[aá]dios)?\s*$/i.test(a) && typeof v[i][1] === 'number') out.budget.lines.push({ section: section, name: a, value: v[i][1] });
      const j = String(v[i][9] || '').trim();
      if (/^saldo/i.test(j)) {
        for (let k = i + 1; k < Math.min(i + 4, v.length); k++) if (typeof v[k][9] === 'number') { out.budget.saldos[j] = v[k][9]; break; }
      }
    }
    const desp = b.getRange(3, 4, 28, 5).getValues();
    out.budget.despesas = desp.filter(function (r) { return String(r[0] || '').trim(); }).map(function (r) {
      return [String(r[0]), r[1] instanceof Date ? Utilities.formatDate(r[1], ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd') : String(r[1] || ''), String(r[2] || ''), String(r[3] || ''), Number(r[4]) || 0];
    });
    out.budget.freeDespesas = 28 - out.budget.despesas.length;
    try {
      const dv = b.getRange(3, 6).getDataValidation();
      const vals = dv && dv.getCriteriaValues ? dv.getCriteriaValues()[0] : null;
      if (Array.isArray(vals)) out.budget.cats = vals.map(String);
    } catch (err) { /* sem lista de categorias */ }
  }
  ss.getSheets().forEach(function (sh) {
    const lastCol = sh.getLastColumn();
    if (lastCol < 4 || sh.getMaxRows() < LAST_ROW) return;
    const h = sh.getRange(3, 1, 2, lastCol).getDisplayValues();
    if (!h[1].some(function (x) { return /pagamento loja/i.test(x); })) return;
    const ticks = sh.getRange(FIRST_ROW, 1, LAST_ROW - FIRST_ROW + 1, lastCol).getValues();
    const weeks = [];
    for (let c = 1; c < lastCol - 1; c++) {
      if (!h[0][c] || !/loja/i.test(h[1][c])) continue;
      let n = 0;
      ticks.forEach(function (r) { if (r[c] === true || r[c + 1] === true || Number(r[c]) > 0 || Number(r[c + 1]) > 0) n++; });
      weeks.push({ label: h[0][c], key: weekKey_(h[0][c]), col: c + 1, players: n });
    }
    out.comps.push({ tab: sh.getName(), hidden: !!(sh.isSheetHidden && sh.isSheetHidden()), weeks: weeks });
  });
  return out;
}

/* ---------------- Registos da app (aba App Caixa) ---------------- */
function appTab_(ss) {
  let sh = ss.getSheetByName(TAB_APP);
  if (!sh) {
    sh = ss.insertSheet(TAB_APP);
    sh.getRange(1, 1, 1, 6).setValues([['id', 'tipo', 'dados (não editar)', 'atualizado', 'por', 'apagado']]);
    sh.setFrozenRows(1);
    sh.hideSheet();
  }
  return sh;
}

function sync_(ss, push, since, res, who) {
  const lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    const sh = appTab_(ss);
    const last = sh.getLastRow();
    const data = last > 1 ? sh.getRange(2, 1, last - 1, 6).getValues() : [];
    const index = {};
    data.forEach(function (r, i) { index[r[0]] = i; });
    let now = Date.now();
    const maxSeen = data.reduce(function (m, r) { return Math.max(m, Number(r[3]) || 0); }, 0);
    if (now <= maxSeen) now = maxSeen + 1;
    const appended = [];
    push.forEach(function (p) {
      if (!p || !p.id) return;
      const row = [String(p.id), String(p.kind || ''), p.deleted ? '' : JSON.stringify(p.data), now, who || '', p.deleted ? true : false];
      if (index[p.id] != null) { data[index[p.id]] = row; sh.getRange(index[p.id] + 2, 1, 1, 6).setValues([row]); }
      else { index[p.id] = data.length; data.push(row); appended.push(row); }
    });
    if (appended.length) sh.getRange(sh.getLastRow() + 1, 1, appended.length, 6).setValues(appended);
    res.serverTime = Math.max(now, maxSeen);
    return data.filter(function (r) { return Number(r[3]) > since; }).map(function (r) {
      return { id: r[0], kind: r[1], data: r[5] === true || r[5] === 'TRUE' ? null : JSON.parse(r[2] || 'null'), updatedAt: Number(r[3]), by: r[4], deleted: r[5] === true || r[5] === 'TRUE' };
    });
  } finally {
    lock.releaseLock();
  }
}

/* ---------------- Escrever um torneio no ficheiro ---------------- */
/*
 req = {
   addPlayers: ['Nome'],
   comp: { tab: 'Liga Fénix Negra - Season 2', week: 'semana 6', dateLabel: '18/10/26',
           set: [{ name, loja: true|false|null, liga: true|false|null }] },
   month: { m: 10, set: [{ name, value: true|false }] },
   extras: [{ name, add: 1 }],
   lines: [{ name: 'Torneio Heimdall Geek Fest 2026', add: 5 }],
   despesas: [{ desc, date: '2026-10-18', cat, note, value }]
 }
*/
function apply_(ss, req) {
  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  const rep = { ok: true, checks: 0, months: 0, extras: 0, despesas: 0, players: 0, lines: 0, notFound: [], skipped: [], warnings: [] };
  try {
    const users = tab_(ss, TAB_USERS);
    if (!users) throw new Error('Não encontrei a aba Users/Estadios.');

    // 1. Jogadores novos nas linhas vazias da USER LIST
    if (req.addPlayers && req.addPlayers.length) {
      const names = users.getRange(FIRST_ROW, 1, LAST_ROW - FIRST_ROW + 1, 1).getValues();
      const existing = {};
      names.forEach(function (r) { if (String(r[0]).trim()) existing[norm_(r[0])] = true; });
      req.addPlayers.forEach(function (name) {
        if (existing[norm_(name)]) return;
        const i = names.findIndex(function (r) { return !String(r[0]).trim(); });
        if (i < 0) { rep.warnings.push('Não há linhas vazias na USER LIST para ' + name + '. Adiciona linhas e volta a tentar.'); return; }
        names[i][0] = name;
        users.getRange(FIRST_ROW + i, 1).setValue(name);
        existing[norm_(name)] = true;
        rep.players++;
      });
      SpreadsheetApp.flush();
    }

    // 2. Semana na aba da competição
    if (req.comp && req.comp.set && req.comp.set.length) {
      const sh = tab_(ss, req.comp.tab);
      if (!sh) throw new Error('Não encontrei a aba "' + req.comp.tab + '".');
      const head = sh.getRange(3, 1, 2, sh.getLastColumn()).getDisplayValues();
      let col = -1;
      for (let c = 0; c < head[0].length; c++) if (head[0][c] && weekKey_(head[0][c]) === norm_(req.comp.week)) { col = c + 1; break; }
      if (col < 0) throw new Error('Não encontrei "' + req.comp.week + '" na aba ' + sh.getName() + '.');
      if (!/loja/i.test(head[1][col - 1]) || !/liga/i.test(head[1][col])) throw new Error('As colunas de ' + req.comp.week + ' não são "Pagamento loja / Pagamento liga".');
      if (req.comp.dateLabel && String(head[0][col - 1]).indexOf('(') < 0) sh.getRange(3, col).setValue(String(head[0][col - 1]).trim() + ' (' + req.comp.dateLabel + ')');
      const rows = rowsByName_(sh);
      req.comp.set.forEach(function (s) {
        const r = rows[norm_(s.name)];
        if (!r) { rep.notFound.push(s.name); return; }
        [['loja', col], ['liga', col + 1]].forEach(function (p) {
          if (s[p[0]] === null || s[p[0]] === undefined) return;
          const cell = sh.getRange(r, p[1]);
          const cur = cell.getValue();
          if (isFormula_(cell) || (cur !== true && cur !== false && cur !== '')) { rep.skipped.push(s.name + ' (' + p[0] + ')'); return; }
          if (cur !== !!s[p[0]]) { cell.setValue(!!s[p[0]]); rep.checks++; }
        });
      });
    }

    // 3. Mês e contribuição adicional em Users/Estadios
    const uRows = rowsByName_(users);
    if (req.month && req.month.set && req.month.set.length) {
      const head = users.getRange(4, 1, 1, users.getLastColumn()).getDisplayValues()[0];
      const want = norm_(MONTHS[req.month.m - 1]);
      const ci = head.findIndex(function (h) { return norm_(h) === want; });
      if (ci < 0) throw new Error('Não encontrei a coluna do mês ' + MONTHS[req.month.m - 1] + '.');
      req.month.set.forEach(function (s) {
        const r = uRows[norm_(s.name)];
        if (!r) { rep.notFound.push(s.name); return; }
        const cell = users.getRange(r, ci + 1);
        const cur = cell.getValue();
        if (isFormula_(cell)) { rep.skipped.push(s.name + ' (mês)'); return; }
        if (typeof cur === 'number' && cur > 0 && s.value) return; // mês antigo em números: já pago
        if (cur !== !!s.value) { cell.setValue(!!s.value); rep.months++; }
      });
    }
    if (req.extras && req.extras.length) {
      const head = users.getRange(4, 1, 1, users.getLastColumn()).getDisplayValues()[0];
      const ci = head.findIndex(function (h) { return norm_(h).indexOf('contribuicao adicional') === 0; });
      if (ci < 0) throw new Error('Não encontrei a coluna "Contribuição adicional".');
      req.extras.forEach(function (x) {
        const r = uRows[norm_(x.name)];
        if (!r) { rep.notFound.push(x.name); return; }
        const cell = users.getRange(r, ci + 1);
        if (isFormula_(cell)) { rep.skipped.push(x.name + ' (adicional)'); return; }
        const cur = Number(cell.getValue()) || 0;
        cell.setValue(Math.round((cur + Number(x.add)) * 100) / 100);
        rep.extras++;
      });
    }

    // 4. Receitas em linhas do Budget Geral que não são fórmulas (ex.: Income Misc)
    //    Se a linha não existir e vier com "section", é criada na primeira linha vazia dessa tabela.
    if (req.lines && req.lines.length) {
      const b = tab_(ss, TAB_BUDGET);
      const v = b.getRange(1, 1, 40, 1).getValues();
      req.lines.forEach(function (x) {
        let i = v.findIndex(function (r) { return norm_(r[0]) === norm_(x.name); });
        if (i < 0 && x.section) {
          const h = v.findIndex(function (r) { return norm_(r[0]) === norm_(x.section); });
          if (h >= 0) {
            for (let k = h + 1; k < v.length; k++) {
              const a = String(v[k][0] || '').trim();
              if (/^total/i.test(a) || /^income/i.test(a)) break;
              if (!a && !isFormula_(b.getRange(k + 1, 2))) { b.getRange(k + 1, 1).setValue(x.name); v[k][0] = x.name; i = k; rep.newLines = (rep.newLines || 0) + 1; break; }
            }
            if (i < 0) { rep.warnings.push('Não há linhas vazias em ' + x.section + ' para "' + x.name + '". Acrescenta uma linha dentro da tabela (antes do Total) e volta a escrever.'); return; }
          }
        }
        if (i < 0) { rep.notFound.push(x.name); return; }
        const cell = b.getRange(i + 1, 2);
        if (isFormula_(cell)) { rep.skipped.push(x.name + ' (linha com fórmula: atualiza-se sozinha ou tem de ser feita à mão)'); return; }
        cell.setValue(Math.round(((Number(cell.getValue()) || 0) + Number(x.add)) * 100) / 100);
        rep.lines++;
      });
    }

    // 5. Despesas novas no Budget Geral
    if (req.despesas && req.despesas.length) {
      const b = tab_(ss, TAB_BUDGET);
      if (!b) throw new Error('Não encontrei a aba Budget Geral.');
      const area = b.getRange(3, 4, 28, 5).getValues();
      req.despesas.forEach(function (d) {
        const i = area.findIndex(function (r) { return !String(r[0]).trim() && r[4] === ''; });
        if (i < 0) { rep.warnings.push('A tabela Despesas está cheia. Não escrevi: ' + d.desc); return; }
        const p = String(d.date || '').split('-');
        const date = p.length === 3 ? new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])) : '';
        const row = [d.desc, date, d.cat, d.note || '', Number(d.value)];
        b.getRange(3 + i, 4, 1, 5).setValues([row]);
        area[i] = row;
        rep.despesas++;
      });
    }

    SpreadsheetApp.flush();
    rep.sheet = readSheet_(ss);
    return rep;
  } finally {
    lock.releaseLock();
  }
}

/* Para testar no editor: Executar › testarLeitura e ver o registo. */
function testarLeitura() {
  const s = readSheet_(SpreadsheetApp.getActiveSpreadsheet());
  Logger.log('Jogadores: %s · linhas livres: %s', s.players.length, s.freeRows);
  Logger.log('Linhas do Budget: %s', JSON.stringify(s.budget.lines));
  Logger.log('Saldos: %s', JSON.stringify(s.budget.saldos));
  s.comps.forEach(function (c) { Logger.log('%s: %s', c.tab, c.weeks.map(function (w) { return w.label + ' [' + w.players + ']'; }).join(', ')); });
}
