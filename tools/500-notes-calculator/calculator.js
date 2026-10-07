/* ============================================================
   ₹500 Notes Calculator — /tools/500-notes-calculator/
   All calculations run locally in the browser. No data leaves
   the device.
   ============================================================ */
(function () {
  'use strict';

  var DS = [500, 200, 100, 50, 20, 10];
  var MAX = 1e13; // sanity cap: ₹10 lakh crore

  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Formatting ---------- */
  function ind(n) {
    n = Math.round(n);
    var neg = n < 0; n = Math.abs(n);
    var s = String(n);
    if (s.length <= 3) return (neg ? '-' : '') + s;
    var a = s.slice(-3), b = s.slice(0, -3);
    return (neg ? '-' : '') + b.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + a;
  }
  var rs = function (n) { return '\u20B9' + ind(n); };
  var cnt = function (n) { return ind(n); };
  var plural = function (n, w) { return n === 1 ? w : w + 's'; };

  /* ---------- Parsing ---------- */
  function num(v) {
    var s = String(v).trim().toLowerCase().replace(/[,\s\u20B9]/g, '');
    var mult = 1;
    if (/crore?s?$|cr$/.test(s)) { mult = 1e7; s = s.replace(/crore?s?$|cr$/, ''); }
    else if (/lakhs?$|lacs?$|l$/.test(s)) { mult = 1e5; s = s.replace(/lakhs?$|lacs?$|l$/, ''); }
    else if (/k$/.test(s)) { mult = 1e3; s = s.replace(/k$/, ''); }
    var n = Number(s) * mult;
    if (s === '' || !Number.isFinite(n) || n < 0) throw new Error('Enter a valid non-negative amount.');
    if (n > MAX) throw new Error('Amount too large. Enter up to \u20B910 lakh crore.');
    return Math.round(n);
  }

  function target() { return num($('target').value); }

  function announce(msg) {
    var live = $('calc-live-region');
    if (live) live.textContent = msg;
  }
  function setStatus(msg) { $('status').textContent = msg; }

  /* ---------- Main calculation ---------- */
  function calculate() {
    try {
      var t = target(), n = Math.floor(t / 500), covered = n * 500, rem = t - covered;
      $('answer').textContent = cnt(n) + ' \u20B9500 ' + plural(n, 'note');
      $('formula').textContent = rs(t) + ' \u00F7 \u20B9500 = ' + cnt(n) + (rem ? ' \u2014 remainder ' + rs(rem) : '');
      $('sTarget').textContent = rs(t);
      $('sCovered').textContent = rs(covered);
      $('sExact').textContent = rem === 0 ? 'Yes' : 'No';
      $('sRemain').textContent = rs(rem);
      renderNearby(t);
      renderTable(t);
      recon();
      noteCheck();
      bundles();
      setStatus('Calculated locally in your browser.');
      announce(rs(t) + ' needs ' + cnt(n) + ' five hundred rupee notes' + (rem ? ' with ' + rs(rem) + ' remaining' : ''));
    } catch (e) {
      setStatus(e.message);
    }
  }

  function setTarget(v) {
    $('target').value = ind(v);
    var exact = Math.floor(v / 500);
    $('c500').value = exact;
    ['200', '100', '50', '20', '10'].forEach(function (d) { $('c' + d).value = 0; });
    $('noteCount').value = exact;
    calculate();
  }

  /* ---------- Common amounts ---------- */
  function renderCommon() {
    var vals = [20000, 50000, 100000, 120000, 150000, 190000, 250000, 500000, 1000000, 10000000];
    $('commonGrid').innerHTML = vals.map(function (v) {
      return '<button type="button" class="tool-quick" data-amount="' + v + '" aria-label="Load ' + rs(v) + '">' +
        '<small>' + rs(v) + '</small><strong>' + cnt(v / 500) + ' notes</strong></button>';
    }).join('');
  }

  /* ---------- Nearby ---------- */
  function renderNearby(t) {
    var base = Math.floor(t / 500), arr = [];
    for (var i = -2; i <= 2; i++) arr.push(Math.max(0, base + i));
    $('nearbyGrid').innerHTML = arr.map(function (n) {
      var value = n * 500, delta = value - t;
      var label = delta === 0 ? 'Exact match' : delta > 0 ? '+' + rs(delta) + ' over' : rs(Math.abs(delta)) + ' short';
      return '<div class="tool-quick" style="cursor:default;transform:none;">' +
        '<small>' + cnt(n) + ' ' + plural(n, 'note') + '</small><strong>' + rs(value) + '</strong>' +
        '<div class="tool-quick-delta' + (delta === 0 ? ' is-exact' : '') + '">' + label + '</div></div>';
    }).join('');
  }

  /* ---------- Denomination table ---------- */
  function renderTable(t) {
    $('denomTable').innerHTML = DS.map(function (d) {
      var n = Math.floor(t / d), cov = n * d, r = t - cov, e = r === 0;
      return '<tr><td><strong>' + rs(d) + '</strong></td><td>' + cnt(n) + '</td><td>' + rs(cov) + '</td><td>' + rs(r) + '</td><td>' + (e ? '\u2713 Yes' : 'No') + '</td></tr>';
    }).join('');
  }

  /* ---------- Cash verification ---------- */
  function recon() {
    var total = 0;
    DS.forEach(function (d) { total += Math.max(0, Math.floor(Number($('c' + d).value) || 0)) * d; });
    $('counted').textContent = rs(total);
    var box = $('verifyResult'), t;
    try { t = target(); } catch (e) { return; }
    if (total === t) {
      box.className = 'tool-status-box is-good';
      box.innerHTML = '<h3>\u2713 Cash matches</h3><p>The counted notes total ' + rs(total) + ', which matches the selected target.</p>';
    } else if (total < t) {
      box.className = 'tool-status-box is-bad';
      box.innerHTML = '<h3>Short by ' + rs(t - total) + '</h3><p>Counted: ' + rs(total) + '<br>Target: ' + rs(t) + '<br>You need ' + rs(t - total) + ' more.</p>';
    } else {
      box.className = 'tool-status-box is-warn';
      box.innerHTML = '<h3>Excess of ' + rs(total - t) + '</h3><p>Counted: ' + rs(total) + '<br>Target: ' + rs(t) + '<br>Recheck ' + rs(total - t) + ' of the cash.</p>';
    }
  }

  /* ---------- Shortfall / excess ---------- */
  function noteCheck() {
    var t; try { t = target(); } catch (e) { return; }
    var exact = Math.floor(t / 500);
    var n = Math.max(0, Math.floor(Number($('noteCount').value) || 0)), value = n * 500;
    var pct = exact === 0 ? (n === 0 ? 100 : 100) : Math.min(100, (n / exact) * 100);
    $('noteBar').style.width = pct + '%';
    $('noteBar').parentElement.setAttribute('aria-valuenow', Math.round(pct));
    $('noteProgress').textContent = pct.toFixed(0) + '% of ' + cnt(exact) + ' exact-target ' + plural(exact, 'note');
    var b = $('noteResult');
    if (value === t) {
      b.className = 'tool-status-box is-good';
      b.innerHTML = '<div class="tool-kicker is-good">Exact</div><div class="tool-bigout">' + rs(value) + '</div><p>' + cnt(n) + ' \u20B9500 ' + plural(n, 'note') + ' reach the target exactly.</p>';
    } else if (value < t) {
      var need = Math.ceil((t - value) / 500);
      b.className = 'tool-status-box is-bad';
      b.innerHTML = '<div class="tool-kicker is-bad">Short</div><div class="tool-bigout">' + rs(value) + '</div><p>Short by ' + rs(t - value) + '. Add ' + cnt(need) + ' \u20B9500 ' + plural(need, 'note') + ' to reach or exceed the target.</p>';
    } else {
      var extra = Math.floor((value - t) / 500), over = value - t;
      b.className = 'tool-status-box is-warn';
      b.innerHTML = '<div class="tool-kicker is-warn">Excess</div><div class="tool-bigout">' + rs(value) + '</div><p>' + rs(over) + ' above the target' + (extra > 0 ? ' \u2014 ' + cnt(extra) + ' extra \u20B9500 ' + plural(extra, 'note') : '') + '.</p>';
    }
  }

  /* ---------- Bundles ---------- */
  function bundles() {
    var t; try { t = target(); } catch (e) { return; }
    var n = Math.floor(t / 500);
    var size = Math.max(1, Math.floor(Number($('bundleSize').value) || 1));
    var whole = Math.floor(n / size), loose = n - whole * size;
    var html = '<div class="tool-kicker" style="color:var(--color-text-muted)">Plan</div>' +
      '<div class="tool-bigout">' + cnt(whole) + ' full ' + plural(whole, 'bundle') + (loose ? ' + ' + cnt(loose) + ' loose' : '') + '</div>' +
      '<p>' + cnt(n) + ' \u20B9500 ' + plural(n, 'note') + ' at ' + cnt(size) + ' notes per bundle = ' + cnt(whole) + ' full ' + plural(whole, 'bundle') +
      (loose ? ' and ' + cnt(loose) + ' loose ' + plural(loose, 'note') : '') + '. Each bundle is worth ' + rs(size * 500) + '.</p>';
    $('bundleOut').innerHTML = html;
  }

  /* ---------- Clipboard ---------- */
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { setStatus('Copied to clipboard.'); },
        function () { setStatus('Copy unavailable in this browser.'); });
    } else {
      setStatus('Copy unavailable in this browser.');
    }
  }

  /* ---------- Events ---------- */
  function init() {
    $('calc').addEventListener('click', calculate);
    $('target').addEventListener('input', calculate);
    $('target').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); calculate(); } });
    $('target').addEventListener('blur', function () {
      try { $('target').value = ind(target()); } catch (e) { /* leave as-is */ }
    });

    $('copyAnswer').addEventListener('click', function () {
      try { var t = target(), n = Math.floor(t / 500); copy(rs(t) + ' = ' + cnt(n) + ' \u20B9500 notes' + (t % 500 ? ' + ' + rs(t % 500) : '')); } catch (e) { setStatus(e.message); }
    });
    $('copyFormula').addEventListener('click', function () {
      try { var t = target(), n = Math.floor(t / 500); copy(rs(t) + ' \u00F7 \u20B9500 = ' + cnt(n)); } catch (e) { setStatus(e.message); }
    });

    $('compareDenom').addEventListener('change', function () {
      try {
        var t = target(), d = Number($('compareDenom').value), n = Math.floor(t / d), r = t - n * d;
        setStatus('Comparison: ' + rs(t) + ' \u00F7 ' + rs(d) + ' = ' + cnt(n) + ' notes' + (r ? ' with ' + rs(r) + ' remaining.' : ' exactly.'));
      } catch (e) { setStatus(e.message); }
    });

    $('verifyBtn').addEventListener('click', recon);
    DS.forEach(function (d) { $('c' + d).addEventListener('input', recon); });
    $('noteCount').addEventListener('input', noteCheck);
    $('bundleBtn').addEventListener('click', bundles);
    $('bundleSize').addEventListener('input', bundles);

    // Quick chips + common grid (event delegation)
    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-amount]');
      if (a) { setTarget(Number(a.getAttribute('data-amount'))); $('calculator').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      var b = e.target.closest('[data-bundle]');
      if (b) { $('bundleSize').value = b.getAttribute('data-bundle'); bundles(); }
    });

    renderCommon();

    // Accept an incoming ?amount= link once, then strip the query string so
    // the address bar stays clean (keeps a single canonical URL).
    var preset = null;
    try {
      var q = new URLSearchParams(window.location.search).get('amount');
      if (q) preset = num(q);
    } catch (e) { /* ignore bad query */ }
    if (window.location.search) {
      try { history.replaceState(null, '', window.location.pathname + window.location.hash); } catch (e) { /* ignore */ }
    }

    if (preset !== null) setTarget(preset); else calculate();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
