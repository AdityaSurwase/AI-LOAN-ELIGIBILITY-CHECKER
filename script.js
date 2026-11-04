const $ = id => document.getElementById(id), v = id => +$(id).value, inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
const tg = id => { const e = $(id); e.style.display = e.style.display === 'block' ? 'none' : 'block' };

/* ---------- config ---------- */
const DEF = { key: '', model: 'claude-sonnet-5-5', proxy: '', sheet: '' };
let cfg = Object.assign({}, DEF);
try { cfg = Object.assign(cfg, JSON.parse(localStorage.getItem('alc_cfg') || '{}')) } catch (e) { }
['key', 'model', 'proxy', 'sheet'].forEach(k => $(k).value = cfg[k] || '');

function saveCfg() {
    ['key', 'model', 'proxy', 'sheet'].forEach(k => cfg[k] = $(k).value.trim());
    cfg.model = cfg.model || DEF.model;
    try { localStorage.setItem('alc_cfg', JSON.stringify(cfg)) } catch (e) { }
    $('set').style.display = 'none';
}

/* ---------- tabs ---------- */
['Eligibility', 'Credit Score', 'EMI Calculator', 'AI Tips'].forEach((n, i) => {
    const b = document.createElement('button');
    b.textContent = n;
    b.className = i ? '' : 'on';
    b.onclick = () => {
        document.querySelectorAll('.tabs button').forEach((x, j) => x.classList.toggle('on', j == i));
        document.querySelectorAll('.p').forEach((x, j) => x.classList.toggle('on', j == i));
    };
    $('tabs').appendChild(b);
});

/* ---------- Claude API ---------- */
async function claude(prompt) {
    const body = { model: cfg.model || DEF.model, max_tokens: 700, system: 'You are a careful personal-finance assistant for Indian users. Be concise, practical and plain-spoken. Do not promise approval. Use short bullet points.', messages: [{ role: 'user', content: prompt }] };
    let url, h = { 'content-type': 'application/json' };
    if (cfg.proxy) { url = cfg.proxy }
    else if (cfg.key) { url = 'https://api.anthropic.com/v1/messages'; h['x-api-key'] = cfg.key; h['anthropic-version'] = '2023-06-01'; h['anthropic-dangerous-direct-browser-access'] = 'true' }
    else return null;
    const r = await fetch(url, { method: 'POST', headers: h, body: JSON.stringify(body) });
    if (!r.ok) throw new Error('API ' + r.status);
    const d = await r.json(); return (d.content || []).map(c => c.text || '').join('').trim() || null;
}

async function ai(el, prompt) {
    const d = document.createElement('div'); d.className = 'ai'; el.appendChild(d);
    if (!cfg.key && !cfg.proxy) { d.textContent = 'Add a Claude API key or proxy URL in Settings to get AI analysis.'; return }
    d.textContent = 'Analyzing with Claude…';
    try { d.textContent = await claude(prompt) || 'No response.' } catch (e) { d.textContent = 'AI analysis failed (' + e.message + '). Check your key, model name or proxy.' }
}

/* ---------- storage: Google Sheets + local history ---------- */
function save(type, data) {
    const rec = { time: new Date().toISOString(), type, ...data };
    try { const h = JSON.parse(localStorage.getItem('alc_hist') || '[]'); h.unshift(rec); localStorage.setItem('alc_hist', JSON.stringify(h.slice(0, 10))) } catch (e) { }
    renderHist();
    if (cfg.sheet) fetch(cfg.sheet, { method: 'POST', mode: 'no-cors', headers: { 'content-type': 'text/plain' }, body: JSON.stringify(rec) }).catch(() => { });
}

function renderHist() {
    let h = []; try { h = JSON.parse(localStorage.getItem('alc_hist') || '[]') } catch (e) { }
    if (!h.length) return;
    $('hist').innerHTML = '<table><tr><th>When</th><th>Tool</th><th>Result</th></tr>' + h.map(x => `<tr><td>${new Date(x.time).toLocaleString()}</td><td>${x.type}</td><td>${x.result || ''}</td></tr>`).join('') + '</table>';
}
renderHist();

/* ---------- calculators ---------- */
const emiOf = (P, r, n) => { r /= 1200; return r ? P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1) : P / n };
const show = (i, h) => { const e = $('r' + i); e.style.display = 'block'; e.innerHTML = h; return e };

function elig() {
    const inc = v('inc'), ex = v('ex'), c = v('cs'), r = v('r'), n = v('y') * 12, want = v('want');
    const room = Math.max(0, inc * .5 - ex), f = r / 1200, max = f ? room * (Math.pow(1 + f, n) - 1) / (f * Math.pow(1 + f, n)) : room * n;
    const need = emiOf(want, r, n), okS = c >= 650, okA = need <= room, ok = okS && okA, foir = (ex + need) / inc * 100;
    const el = show(0, `<div class="big ${ok ? 'ok' : 'bad'}">${ok ? 'Likely eligible' : 'Unlikely as requested'}</div>
 <p>Max affordable EMI: <b>${inr(room)}</b> → estimated max loan <b>${inr(max)}</b></p>
 <p>EMI for ${inr(want)}: <b>${inr(need)}</b> (${okA ? 'within' : 'above'} your limit) · Total obligations ${foir.toFixed(0)}% of income · Score ${c} (${okS ? 'meets' : 'below'} the usual 650 cut-off)</p>`);
    save('Eligibility', { name: $('nm').value, income: inc, existingEmi: ex, score: c, loan: want, rate: r, years: n / 12, emi: Math.round(need), result: ok ? 'Likely eligible' : 'Unlikely' });
    ai(el, `Eligibility analysis and risk assessment. Applicant: income ₹${inc}/month, existing EMIs ₹${ex}, credit score ${c}, requests ₹${want} over ${n / 12} years at ${r}%. Rule-based verdict: ${ok ? 'likely eligible' : 'unlikely'}; needed EMI ₹${Math.round(need)} vs affordable ₹${Math.round(room)}; obligations ${foir.toFixed(0)}% of income. Give: 1) a risk level (Low/Medium/High) with one-line reason, 2) 3 actions to improve approval odds, in under 150 words.`);
}

function score() {
    const pp = v('pp'), ut = v('ut'), ag = v('ag'), iq = v('iq'), mx = v('mx');
    const p = Math.min(pp, 100) / 100 * 35, u = Math.max(0, 1 - ut / 100) * 30, a = Math.min(ag, 10) / 10 * 15, i = Math.max(0, 1 - iq / 6) * 10, m = Math.min(mx, 4) / 4 * 10;
    const t = Math.round(300 + (p + u + a + i + m) / 100 * 600), lab = t >= 750 ? 'Excellent' : t >= 700 ? 'Good' : t >= 650 ? 'Fair' : 'Needs work', col = t >= 700 ? 'var(--ok)' : t >= 650 ? '#fbbf24' : 'var(--bad)';
    const el = show(1, `<div class="big" style="color:${col}">${t} · ${lab}</div><div class="bar"><i style="width:${(t - 300) / 6}%;background:${col}"></i></div>
 <small>Rough estimate on a 300–900 scale, not an official bureau score.</small>`);
    save('Credit Score', { payments: pp, utilisation: ut, historyYears: ag, enquiries: iq, mix: mx, result: t + ' ' + lab });
    ai(el, `Credit score analysis. Inputs: on-time payments ${pp}%, utilisation ${ut}%, history ${ag} years, ${iq} enquiries in 12 months, ${mx} credit types. Estimated score ${t} (${lab}). Name the weakest factors and give the top 3 actions to raise the score, in under 120 words.`);
}

function emi() {
    const P = v('ea'), r = v('er'), n = v('ey') * 12, inc = v('ei'), e = emiOf(P, r, n), tot = e * n, int = tot - P;
    const el = show(2, `<div class="big">${inr(e)} <small>/ month</small></div><div class="bar"><i style="width:${P / tot * 100}%;background:var(--b)"></i></div>
 <p>Principal ${inr(P)} · Interest ${inr(int)} · Total ${inr(tot)}</p>`);
    save('EMI', { loan: P, rate: r, years: n / 12, emi: Math.round(e), result: inr(e) + '/mo' });
    ai(el, `EMI suggestions and loan insights. Loan ₹${P}, ${r}% p.a., ${n / 12} years, EMI ₹${Math.round(e)}, total interest ₹${Math.round(int)}${inc ? `, monthly income ₹${inc}` : ''}. Suggest whether the tenure is sensible, how a shorter tenure or part-prepayment would change interest, and one caution, in under 120 words.`);
}

function tips() {
    const el = show(3, '');
    save('AI Tips', { result: $('q').value.slice(0, 60) });
    ai(el, `Answer this question with practical tips and insights in under 150 words: ${$('q').value}`);
}