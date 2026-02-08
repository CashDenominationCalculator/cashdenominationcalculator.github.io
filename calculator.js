/**
 * Cash Denomination Calculator — Indian Cash Denomination Calculator
 * Full-featured calculator with real-time computation, Indian number formatting,
 * number-to-words, statistics, history, PDF/print export, and dark mode.
 * 
 * Zero dependencies — pure vanilla JavaScript.
 */

(function () {
  'use strict';

  /* ==========================================================
     CONFIGURATION
     ========================================================== */
  const DENOMINATIONS = [
    { value: 500, id: 'denom-500', type: 'Note',  icon: '\uD83D\uDCB5' },
    { value: 200, id: 'denom-200', type: 'Note',  icon: '\uD83D\uDCB5' },
    { value: 100, id: 'denom-100', type: 'Note',  icon: '\uD83D\uDCB5' },
    { value: 50,  id: 'denom-50',  type: 'Note',  icon: '\uD83D\uDCB5' },
    { value: 20,  id: 'denom-20',  type: 'Note',  icon: '\uD83D\uDCB5' },
    { value: 10,  id: 'denom-10',  type: 'Note/Coin', icon: '\uD83D\uDCB5' },
    { value: 5,   id: 'denom-5',   type: 'Coin',  icon: '\uD83E\uDE99' },
    { value: 2,   id: 'denom-2',   type: 'Coin',  icon: '\uD83E\uDE99' },
    { value: 1,   id: 'denom-1',   type: 'Coin',  icon: '\uD83E\uDE99' }
  ];

  const HISTORY_KEY = 'cashcalc_history';
  const THEME_KEY   = 'cashcalc_theme';
  const MAX_HISTORY = 5;

  /* ==========================================================
     DOM CACHE
     ========================================================== */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];

  let grandTotalEl, totalWordsEl, totalNotesEl, totalCoinsEl;
  let statsToggleEl, statsContentEl, statsBarContainer, statHighest, statUnique;
  let historyToggleEl, historyContentEl, historyListEl;
  let toastEl;

  /* ==========================================================
     INITIALISATION
     ========================================================== */
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    cacheDOM();
    initTheme();
    initNavigation();
    bindInputs();
    bindActions();
    bindFAQ();
    calculate(); // initial render
  }

  function cacheDOM() {
    grandTotalEl     = $('#grand-total-amount');
    totalWordsEl     = $('#grand-total-words');
    totalNotesEl     = $('#total-notes-count');
    totalCoinsEl     = $('#total-coins-count');
    statsToggleEl    = $('#stats-toggle');
    statsContentEl   = $('#stats-content');
    statsBarContainer = $('#stats-bars');
    statHighest      = $('#stat-highest');
    statUnique       = $('#stat-unique');
    historyToggleEl  = $('#history-toggle');
    historyContentEl = $('#history-content');
    historyListEl    = $('#history-list');
    toastEl          = $('#toast');
  }

  /* ==========================================================
     THEME (Dark Mode)
     ========================================================== */
  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }

    // Listen for system changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(THEME_KEY)) {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      }
    });
  }

  window.toggleTheme = function () {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
  };

  /* ==========================================================
     NAVIGATION (Mobile)
     ========================================================== */
  function initNavigation() {
    const hamburger = $('#hamburger-btn');
    const mobileNav = $('#mobile-nav');
    if (!hamburger || !mobileNav) return;

    hamburger.addEventListener('click', () => {
      const isOpen = mobileNav.classList.toggle('is-open');
      hamburger.classList.toggle('is-active');
      hamburger.setAttribute('aria-expanded', isOpen);
      document.body.classList.toggle('nav-open', isOpen);
    });

    // Close on link click
    $$('.mobile-nav-link', mobileNav).forEach(link => {
      link.addEventListener('click', () => {
        mobileNav.classList.remove('is-open');
        hamburger.classList.remove('is-active');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('nav-open');
      });
    });
  }

  /* ==========================================================
     INPUT BINDING & CALCULATION
     ========================================================== */
  function bindInputs() {
    DENOMINATIONS.forEach(d => {
      const input = $(`#${d.id}`);
      if (!input) return;

      input.addEventListener('input', () => {
        sanitiseInput(input);
        calculate();
      });

      input.addEventListener('focus', () => {
        const row = input.closest('.denom-row');
        if (row) row.classList.add('is-active');
        if (input.value === '0') input.value = '';
      });

      input.addEventListener('blur', () => {
        const row = input.closest('.denom-row');
        if (row) row.classList.remove('is-active');
      });
    });
  }

  function sanitiseInput(input) {
    // Allow only positive integers
    let val = input.value.replace(/[^0-9]/g, '');
    if (val.length > 10) val = val.slice(0, 10); // cap at 10 digits
    input.value = val;
  }

  function calculate() {
    let grandTotal = 0;
    let totalNotes = 0;
    let totalCoins = 0;
    const breakdown = [];

    DENOMINATIONS.forEach(d => {
      const input = $(`#${d.id}`);
      const subtotalEl = $(`#sub-${d.id}`);
      if (!input || !subtotalEl) return;

      const qty = parseInt(input.value, 10) || 0;
      const subtotal = qty * d.value;
      subtotalEl.textContent = '\u20B9' + formatIndian(subtotal);
      grandTotal += subtotal;

      if (d.type === 'Coin') {
        totalCoins += qty;
      } else if (d.type === 'Note') {
        totalNotes += qty;
      } else {
        // Note/Coin — count as notes for ₹10
        totalNotes += qty;
      }

      breakdown.push({ denom: d.value, type: d.type, qty, subtotal });
    });

    // Update grand total with count-up effect
    animateTotal(grandTotal);

    // Update words
    if (totalWordsEl) {
      totalWordsEl.textContent = grandTotal > 0
        ? numberToWordsINR(grandTotal) + ' Only'
        : 'Zero Rupees';
    }

    // Update note/coin counts
    if (totalNotesEl) totalNotesEl.textContent = totalNotes;
    if (totalCoinsEl) totalCoinsEl.textContent = totalCoins;

    // Update ARIA live region
    const liveRegion = $('#calc-live-region');
    if (liveRegion) {
      liveRegion.textContent = `Grand Total: ${formatIndian(grandTotal)} Rupees. ${totalNotes} notes and ${totalCoins} coins.`;
    }

    // Update statistics
    updateStats(breakdown, grandTotal);
  }

  /* ==========================================================
     ANIMATE TOTAL (Count-up)
     ========================================================== */
  let animFrame = null;
  let currentDisplayTotal = 0;

  function animateTotal(target) {
    if (animFrame) cancelAnimationFrame(animFrame);

    const start = currentDisplayTotal;
    const diff = target - start;
    if (diff === 0) {
      renderTotal(target);
      return;
    }

    const duration = 300; // ms
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = Math.round(start + diff * eased);
      renderTotal(current);

      if (progress < 1) {
        animFrame = requestAnimationFrame(step);
      } else {
        currentDisplayTotal = target;
      }
    }

    animFrame = requestAnimationFrame(step);
  }

  function renderTotal(value) {
    currentDisplayTotal = value;
    if (grandTotalEl) {
      grandTotalEl.textContent = '\u20B9' + formatIndian(value);
    }
  }

  /* ==========================================================
     STATISTICS
     ========================================================== */
  function updateStats(breakdown, total) {
    if (!statsBarContainer) return;

    let html = '';
    let highest = { denom: 0, subtotal: 0 };
    let uniqueCount = 0;

    breakdown.forEach(b => {
      const pct = total > 0 ? ((b.subtotal / total) * 100).toFixed(1) : 0;
      if (b.qty > 0) {
        uniqueCount++;
        if (b.subtotal > highest.subtotal) {
          highest = { denom: b.denom, subtotal: b.subtotal };
        }
      }

      html += `
        <div class="stat-bar-row">
          <span class="stat-bar-label">\u20B9${b.denom}</span>
          <div class="stat-bar-track">
            <div class="stat-bar-fill" style="width:${pct}%"></div>
          </div>
          <span class="stat-bar-pct">${pct}%</span>
        </div>`;
    });

    statsBarContainer.innerHTML = html;
    if (statHighest) {
      statHighest.textContent = highest.subtotal > 0 ? '\u20B9' + highest.denom : '\u2014';
    }
    if (statUnique) {
      statUnique.textContent = uniqueCount;
    }
  }

  /* ==========================================================
     ACTION BUTTONS
     ========================================================== */
  function bindActions() {
    // Reset
    const resetBtn = $('#btn-reset');
    if (resetBtn) resetBtn.addEventListener('click', showResetDialog);

    // Print
    const printBtn = $('#btn-print');
    if (printBtn) printBtn.addEventListener('click', () => window.print());

    // PDF
    const pdfBtn = $('#btn-pdf');
    if (pdfBtn) pdfBtn.addEventListener('click', downloadPDF);

    // Copy
    const copyBtn = $('#btn-copy');
    if (copyBtn) copyBtn.addEventListener('click', copySummary);

    // Share
    const shareBtn = $('#btn-share');
    if (shareBtn) shareBtn.addEventListener('click', shareSummary);

    // Stats toggle
    if (statsToggleEl) {
      statsToggleEl.addEventListener('click', () => {
        statsToggleEl.classList.toggle('is-open');
        statsContentEl.classList.toggle('is-open');
      });
    }

    // History toggle
    if (historyToggleEl) {
      historyToggleEl.addEventListener('click', () => {
        historyToggleEl.classList.toggle('is-open');
        historyContentEl.classList.toggle('is-open');
        if (historyContentEl.classList.contains('is-open')) renderHistory();
      });
    }

    // Save to history (on any input change with debounce)
    let saveTimer = null;
    DENOMINATIONS.forEach(d => {
      const input = $(`#${d.id}`);
      if (input) {
        input.addEventListener('input', () => {
          clearTimeout(saveTimer);
          saveTimer = setTimeout(saveToHistory, 2000);
        });
      }
    });

    // History clear
    const clearHistBtn = $('#btn-clear-history');
    if (clearHistBtn) clearHistBtn.addEventListener('click', clearHistory);
  }

  /* ---------- Reset Dialog ---------- */
  function showResetDialog() {
    const overlay = $('#dialog-overlay');
    if (!overlay) { resetAll(); return; }
    overlay.classList.add('is-visible');

    const confirmBtn = $('#dialog-confirm');
    const cancelBtn = $('#dialog-cancel');

    function close() {
      overlay.classList.remove('is-visible');
      confirmBtn.removeEventListener('click', onConfirm);
      cancelBtn.removeEventListener('click', close);
      overlay.removeEventListener('click', onOverlay);
    }

    function onConfirm() { close(); resetAll(); }
    function onOverlay(e) { if (e.target === overlay) close(); }

    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', close);
    overlay.addEventListener('click', onOverlay);
  }

  function resetAll() {
    DENOMINATIONS.forEach(d => {
      const input = $(`#${d.id}`);
      if (input) input.value = '';
    });
    calculate();
    showToast('Calculator reset');
  }

  /* ---------- Copy Summary ---------- */
  function copySummary() {
    const text = buildSummaryText();
    navigator.clipboard.writeText(text).then(() => {
      showToast('Summary copied to clipboard');
    }).catch(() => {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('Summary copied to clipboard');
    });
  }

  /* ---------- Share ---------- */
  function shareSummary() {
    const text = buildSummaryText();
    if (navigator.share) {
      navigator.share({
        title: 'Cash Denomination Summary — Cash Denomination Calculator',
        text: text,
        url: window.location.href
      }).catch(() => {});
    } else {
      // Fallback to copy
      navigator.clipboard.writeText(window.location.href).then(() => {
        showToast('Link copied to clipboard');
      });
    }
  }

  /* ---------- PDF Download ---------- */
  function downloadPDF() {
    // Use the print stylesheet approach — opens a new window with formatted content
    const content = buildPrintContent();
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) {
      showToast('Please allow pop-ups to download PDF');
      return;
    }
    win.document.write(content);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      // win.close(); // Let user close after printing/saving as PDF
    }, 500);
    showToast('Print dialog opened — save as PDF');
  }

  function buildPrintContent() {
    const now = new Date();
    const date = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    let rows = '';
    let grandTotal = 0;
    let totalNotes = 0;
    let totalCoins = 0;

    DENOMINATIONS.forEach(d => {
      const input = $(`#${d.id}`);
      const qty = input ? parseInt(input.value, 10) || 0 : 0;
      const subtotal = qty * d.value;
      grandTotal += subtotal;
      if (d.type === 'Coin') totalCoins += qty;
      else totalNotes += qty;

      if (qty > 0) {
        rows += `<tr>
          <td style="padding:8px 12px;border:1px solid #ddd;text-align:center;">\u20B9${d.value} (${d.type})</td>
          <td style="padding:8px 12px;border:1px solid #ddd;text-align:center;">${qty}</td>
          <td style="padding:8px 12px;border:1px solid #ddd;text-align:right;">\u20B9${formatIndian(subtotal)}</td>
        </tr>`;
      }
    });

    if (!rows) {
      rows = '<tr><td colspan="3" style="padding:20px;text-align:center;color:#888;">No denominations entered</td></tr>';
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Denomination Sheet — Cash Denomination Calculator</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    h1 { font-size: 20px; text-align: center; margin-bottom: 4px; }
    .subtitle { text-align: center; color: #666; margin-bottom: 20px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #1a73e8; color: #fff; padding: 10px 12px; border: 1px solid #1a73e8; font-size: 14px; }
    .total-row td { font-weight: bold; background: #f0f7ff; font-size: 15px; }
    .words { text-align: center; font-style: italic; color: #555; margin: 10px 0; font-size: 13px; }
    .meta { text-align: center; color: #888; font-size: 12px; margin-top: 20px; }
    .counts { text-align: center; margin: 10px 0; font-size: 13px; color: #555; }
    .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #aaa; border-top: 1px solid #eee; padding-top: 10px; }
    @media print {
      body { margin: 20px; }
      @page { margin: 1cm; }
    }
  </style>
</head>
<body>
  <h1>Cash Denomination Sheet</h1>
  <p class="subtitle">Generated on ${date} at ${time} | Cash Denomination Calculator</p>
  <table>
    <thead>
      <tr>
        <th style="text-align:center;">Denomination</th>
        <th style="text-align:center;">Count</th>
        <th style="text-align:right;">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td style="padding:10px 12px;border:1px solid #ddd;text-align:center;" colspan="2">Grand Total</td>
        <td style="padding:10px 12px;border:1px solid #ddd;text-align:right;">\u20B9${formatIndian(grandTotal)}</td>
      </tr>
    </tbody>
  </table>
  <p class="words">${grandTotal > 0 ? numberToWordsINR(grandTotal) + ' Only' : 'Zero Rupees'}</p>
  <p class="counts">Total Notes: ${totalNotes} | Total Coins: ${totalCoins}</p>
  <div class="footer">
    <p>Generated by Cash Denomination Calculator — Indian Cash Denomination Calculator</p>
    <p>https://cashdenominationcalculator.github.io/</p>
  </div>
</body>
</html>`;
  }

  /* ---------- Build Summary Text ---------- */
  function buildSummaryText() {
    const lines = ['=== Cash Denomination Summary ===\n'];
    let grandTotal = 0;
    let totalNotes = 0;
    let totalCoins = 0;

    DENOMINATIONS.forEach(d => {
      const input = $(`#${d.id}`);
      const qty = input ? parseInt(input.value, 10) || 0 : 0;
      const subtotal = qty * d.value;
      grandTotal += subtotal;
      if (d.type === 'Coin') totalCoins += qty;
      else totalNotes += qty;

      if (qty > 0) {
        lines.push(`\u20B9${d.value} (${d.type}) x ${qty} = \u20B9${formatIndian(subtotal)}`);
      }
    });

    lines.push('\n---');
    lines.push(`Grand Total: \u20B9${formatIndian(grandTotal)}`);
    lines.push(`(${grandTotal > 0 ? numberToWordsINR(grandTotal) + ' Only' : 'Zero Rupees'})`);
    lines.push(`Notes: ${totalNotes} | Coins: ${totalCoins}`);
    lines.push('\nGenerated by Cash Denomination Calculator — cashdenominationcalculator.github.io');

    return lines.join('\n');
  }

  /* ==========================================================
     HISTORY (localStorage)
     ========================================================== */
  function saveToHistory() {
    let grandTotal = 0;
    const data = {};
    let hasValue = false;

    DENOMINATIONS.forEach(d => {
      const input = $(`#${d.id}`);
      const qty = input ? parseInt(input.value, 10) || 0 : 0;
      if (qty > 0) {
        data[d.value] = qty;
        hasValue = true;
      }
      grandTotal += qty * d.value;
    });

    if (!hasValue) return;

    const history = getHistory();

    // Don't save duplicate of last entry
    if (history.length > 0 && history[0].total === grandTotal) return;

    const entry = {
      timestamp: Date.now(),
      total: grandTotal,
      data: data,
      summary: buildQuickSummary(data)
    };

    history.unshift(entry);
    if (history.length > MAX_HISTORY) history.pop();

    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistory();
  }

  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch {
      return [];
    }
  }

  function renderHistory() {
    if (!historyListEl) return;
    const history = getHistory();

    if (history.length === 0) {
      historyListEl.innerHTML = '<p class="history-empty">No recent calculations saved yet.</p>';
      return;
    }

    let html = '';
    history.forEach(entry => {
      const date = new Date(entry.timestamp);
      const timeStr = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) +
                      ' ' + date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

      html += `
        <div class="history-item">
          <div>
            <div class="history-item-time">${timeStr}</div>
            <div class="history-item-summary">${entry.summary || ''}</div>
          </div>
          <div class="history-item-total">\u20B9${formatIndian(entry.total)}</div>
        </div>`;
    });

    historyListEl.innerHTML = html;
  }

  function buildQuickSummary(data) {
    const parts = [];
    Object.keys(data).sort((a, b) => b - a).forEach(denom => {
      parts.push(`\u20B9${denom}\u00D7${data[denom]}`);
    });
    return parts.slice(0, 4).join(', ') + (parts.length > 4 ? '...' : '');
  }

  function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
    showToast('History cleared');
  }

  /* ==========================================================
     FAQ ACCORDION
     ========================================================== */
  function bindFAQ() {
    $$('.faq-question').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item');
        const isOpen = item.classList.contains('is-open');
        // Close all
        $$('.faq-item').forEach(fi => fi.classList.remove('is-open'));
        // Toggle current
        if (!isOpen) item.classList.add('is-open');
      });
    });
  }

  /* ==========================================================
     TOAST NOTIFICATION
     ========================================================== */
  let toastTimer = null;

  function showToast(message) {
    if (!toastEl) return;
    clearTimeout(toastTimer);
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('is-visible');
    }, 2500);
  }

  /* ==========================================================
     INDIAN NUMBER FORMATTING
     Uses the Indian numbering system: 1,23,45,678
     ========================================================== */
  function formatIndian(num) {
    if (num === 0) return '0';
    const str = Math.abs(num).toString();
    const sign = num < 0 ? '-' : '';

    if (str.length <= 3) return sign + str;

    const last3 = str.slice(-3);
    let remaining = str.slice(0, -3);
    let result = '';

    while (remaining.length > 2) {
      result = ',' + remaining.slice(-2) + result;
      remaining = remaining.slice(0, -2);
    }

    result = remaining + result + ',' + last3;
    return sign + result;
  }

  /* ==========================================================
     NUMBER TO WORDS (Indian Rupees)
     Supports up to 99,99,99,99,999 (99 Arab+)
     ========================================================== */
  function numberToWordsINR(num) {
    if (num === 0) return 'Zero Rupees';
    if (num < 0) return 'Minus ' + numberToWordsINR(-num);

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
      'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function twoDigit(n) {
      if (n < 20) return ones[n];
      return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    }

    function threeDigit(n) {
      if (n === 0) return '';
      if (n < 100) return twoDigit(n);
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + twoDigit(n % 100) : '');
    }

    // Indian system: Crore (10^7), Lakh (10^5), Thousand (10^3), Hundred (10^2)
    const parts = [];
    let n = num;

    // Arab (10^9) — only if very large
    if (n >= 1000000000) {
      const arab = Math.floor(n / 1000000000);
      parts.push(twoDigit(arab) + ' Arab');
      n %= 1000000000;
    }

    // Crore (10^7)
    if (n >= 10000000) {
      const crore = Math.floor(n / 10000000);
      parts.push(twoDigit(crore) + ' Crore');
      n %= 10000000;
    }

    // Lakh (10^5)
    if (n >= 100000) {
      const lakh = Math.floor(n / 100000);
      parts.push(twoDigit(lakh) + ' Lakh');
      n %= 100000;
    }

    // Thousand (10^3)
    if (n >= 1000) {
      const thousand = Math.floor(n / 1000);
      parts.push(twoDigit(thousand) + ' Thousand');
      n %= 1000;
    }

    // Hundreds and remainder
    if (n > 0) {
      parts.push(threeDigit(n));
    }

    return parts.join(' ') + ' Rupees';
  }

  /* ==========================================================
     EXPOSE GLOBALS (for inline onclick handlers as fallback)
     ========================================================== */
  window.toggleTheme = window.toggleTheme || function () {};

})();
