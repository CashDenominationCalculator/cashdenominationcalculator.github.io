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
    initConversionTable();

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


  /* ---------- ₹500 conversion table (₹500 – ₹10,00,000) ---------- */
  var CONV_MAX = 1000000, CONV_STEP = 500, CONV_PAGE = 100;
  var convStart = 500, convEnd = 20000; // currently rendered band
  var convTimer = null;

  var W_ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  var W_TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function w2(n) { return n < 20 ? W_ONES[n] : W_TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + W_ONES[n % 10] : ''); }
  function w3(n) { if (!n) return ''; if (n < 100) return w2(n); return W_ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + w2(n % 100) : ''); }
  function rupeesInWords(n) {
    var p = [];
    if (n >= 10000000) { p.push(w2(Math.floor(n / 10000000)) + ' Crore'); n %= 10000000; }
    if (n >= 100000) { p.push(w2(Math.floor(n / 100000)) + ' Lakh'); n %= 100000; }
    if (n >= 1000) { p.push(w2(Math.floor(n / 1000)) + ' Thousand'); n %= 1000; }
    if (n) p.push(w3(n));
    return 'Rupees ' + p.join(' ') + ' Only';
  }

  function convRow(amount, hl) {
    var notes = amount / CONV_STEP;
    return '<tr' + (hl ? ' class="conv-highlight" id="convTarget"' : '') + '><td>' + rs(amount) + '</td><td>' + rupeesInWords(amount) +
      '</td><td><strong>' + cnt(notes) + '</strong> ' + plural(notes, 'note') + '</td></tr>';
  }

  function convRender(start, end, highlight) {
    start = Math.max(CONV_STEP, start); end = Math.min(CONV_MAX, end);
    var html = [];
    for (var a = start; a <= end; a += CONV_STEP) html.push(convRow(a, a === highlight));
    $('convBody').innerHTML = html.join('');
    convStart = start; convEnd = end;
    var r1 = start / CONV_STEP, r2 = end / CONV_STEP;
    $('convStatus').textContent = 'Showing ' + rs(start) + ' \u2013 ' + rs(end) + ' (rows ' + cnt(r1) + '\u2013' + cnt(r2) + ' of ' + cnt(CONV_MAX / CONV_STEP) + ')';
    $('convMore').style.display = end >= CONV_MAX ? 'none' : '';
    document.querySelectorAll('[data-range]').forEach(function (b) {
      var p = b.getAttribute('data-range').split('-');
      b.classList.toggle('is-active', start >= Number(p[0]) && end <= Number(p[1]));
    });
  }

  function convJumpTo(value) {
    if (!value) return;
    var v = Math.floor(value / CONV_STEP) * CONV_STEP;
    if (v < CONV_STEP) { $('convStatus').textContent = 'Amounts below \u20B9500 need less than one \u20B9500 note.'; return; }
    if (v > CONV_MAX) { $('convStatus').textContent = rs(value) + ' is above \u20B910 lakh \u2014 use the calculator at the top of the page.'; return; }
    var start = Math.max(CONV_STEP, v - 10 * CONV_STEP), end = Math.min(CONV_MAX, v + 10 * CONV_STEP);
    convRender(start, end, v);
    var rem = value - v;
    $('convStatus').textContent = rs(v) + ' = ' + cnt(v / CONV_STEP) + ' \u20B9500 notes' + (rem ? ' (your amount ' + rs(value) + ' leaves ' + rs(rem) + ' in smaller notes)' : '') +
      ' \u2014 showing rows ' + cnt(start / CONV_STEP) + '\u2013' + cnt(end / CONV_STEP) + ' of ' + cnt(CONV_MAX / CONV_STEP);
    var row = $('convTarget');
    if (row) {
      var wrap = $('convTableWrap');
      wrap.scrollTop = Math.max(0, row.offsetTop - wrap.clientHeight / 2);
      if (!/^#?conversion/.test(window.location.hash)) wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function initConversionTable() {
    if (!$('convBody')) return;
    $('convMore').addEventListener('click', function () {
      var end = Math.min(CONV_MAX, convEnd + CONV_PAGE * CONV_STEP);
      // append rather than re-render so the user keeps their place
      var html = [];
      for (var a = convEnd + CONV_STEP; a <= end; a += CONV_STEP) html.push(convRow(a, false));
      $('convBody').insertAdjacentHTML('beforeend', html.join(''));
      convEnd = end;
      $('convStatus').textContent = 'Showing ' + rs(convStart) + ' \u2013 ' + rs(convEnd) + ' (rows ' + cnt(convStart / CONV_STEP) + '\u2013' + cnt(convEnd / CONV_STEP) + ' of ' + cnt(CONV_MAX / CONV_STEP) + ')';
      $('convMore').style.display = convEnd >= CONV_MAX ? 'none' : '';
    });
    document.querySelectorAll('[data-range]').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = b.getAttribute('data-range').split('-');
        convRender(Number(p[0]), Number(p[1]), null);
        $('convTableWrap').scrollTop = 0;
      });
    });
    $('convJump').addEventListener('input', function () {
      clearTimeout(convTimer);
      convTimer = setTimeout(function () {
        try { convJumpTo(num($('convJump').value)); } catch (e) { $('convStatus').textContent = e.message; }
      }, 250);
    });
    $('convJump').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(convTimer); try { convJumpTo(num($('convJump').value)); } catch (err) { $('convStatus').textContent = err.message; } } });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
