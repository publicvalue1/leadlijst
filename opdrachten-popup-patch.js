/* ================================================================
   Opdrachten Maand Detail Popup v2
   ================================================================
   Werkt met de card-based Opdrachten layout.
   Maakt de maandpillen klikbaar en opent een popup met:
   - Medewerkers, hun aandeel, uurtarief, berekende uren
   - Live preview als je het bedrag aanpast
   
   Laad via: <script src="opdrachten-popup-patch.js"></script>
   Plaats direct voor </body> in je dashboard.html
   
   Bevat ook SharePoint auth fix (Vernieuwen/Opslaan checkt login)
   ================================================================ */

(function(){
  'use strict';

  // ============================================================
  // 1. INJECT CSS
  // ============================================================
  var css = document.createElement('style');
  css.textContent = [
    '.opdMonthOverlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:200;display:none;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px);}',
    '.opdMonthOverlay.active{display:flex;}',
    '.opdMonthPopup{background:linear-gradient(180deg,#12363a,#0f2a2e);border:1px solid rgba(127,202,178,.25);border-radius:22px;padding:24px;max-width:620px;width:100%;box-shadow:0 32px 80px rgba(0,0,0,.6);max-height:85vh;overflow-y:auto;}',
    '.opdMonthPopup h4{font-size:17px;font-weight:900;color:#9fd6c3;margin-bottom:4px;}',
    '.opdMonthPopup .popupSub{font-size:12px;color:#cfe6de;margin-bottom:16px;}',
    '.opdMonthSummary{display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap;}',
    '.opdMonthStat{text-align:center;min-width:80px;}',
    '.opdMonthStat .val{font-size:20px;font-weight:950;font-variant-numeric:tabular-nums;}',
    '.opdMonthStat .lbl{font-size:10px;color:#cfe6de;letter-spacing:.06em;text-transform:uppercase;font-weight:700;margin-top:2px;}',
    '.opdMonthMwTable{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px;}',
    '.opdMonthMwTable th{padding:7px 10px;text-align:left;font-weight:700;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#9fd6c3;border-bottom:1px solid rgba(127,202,178,.2);}',
    '.opdMonthMwTable td{padding:7px 10px;border-bottom:1px solid rgba(255,255,255,.04);font-variant-numeric:tabular-nums;}',
    '.opdMonthMwTable .mwName{font-weight:700;}',
    '.opdMonthMwTable .mwMuted{color:#cfe6de;}',
    '.opdMonthMwTable tfoot td{border-top:2px solid rgba(127,202,178,.2);font-weight:900;color:#9fd6c3;}',
    '.opdMonthOverrideRow{display:flex;align-items:center;gap:12px;padding:14px 16px;background:rgba(15,42,46,.4);border:1px solid rgba(255,255,255,.08);border-radius:14px;margin-bottom:14px;flex-wrap:wrap;}',
    '.opdMonthOverrideRow label{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#cfe6de;white-space:nowrap;}',
    '.opdMonthOverrideRow input[type="number"]{max-width:140px;padding:8px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(15,42,46,.5);color:#fff;font-size:14px;font-weight:700;font-variant-numeric:tabular-nums;outline:none;text-align:right;transition:border-color .2s;}',
    '.opdMonthOverrideRow input[type="number"]:focus{border-color:rgba(127,202,178,.5);}',
    '.opdMonthOverrideRow .overrideHint{font-size:11px;color:#cfe6de;flex:1;min-width:160px;}',
    '.opdMonthRedist{font-size:11px;color:#cfe6de;padding:8px 0;line-height:1.6;}',
    '.opdMonthRedist strong{color:#fff;}',
    '.opdMonthActions{display:flex;gap:8px;justify-content:flex-end;margin-top:8px;}',
    '[data-opd-month]{cursor:pointer;transition:all .15s;user-select:none;}',
    '[data-opd-month]:hover{filter:brightness(1.2);transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.3);}',
  ].join('\n');
  document.head.appendChild(css);

  // ============================================================
  // 2. INJECT POPUP HTML
  // ============================================================
  var html = [
    '<div class="opdMonthOverlay" id="opdMonthOverlay" onclick="if(event.target===this)closeOpdMonthPopup();">',
    '<div class="opdMonthPopup">',
    '<h4 id="opdMonthPopupTitle">\u2014</h4>',
    '<div class="popupSub" id="opdMonthPopupSub">\u2014</div>',
    '<div class="opdMonthSummary" id="opdMonthPopupSummary"></div>',
    '<div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#9fd6c3;margin-bottom:6px;">\ud83d\udc65 Medewerkers deze maand</div>',
    '<table class="opdMonthMwTable"><thead><tr><th>Medewerker</th><th>Aandeel</th><th>Uurtarief</th><th style="text-align:right;">Uren</th><th style="text-align:right;">Omzet</th></tr></thead>',
    '<tbody id="opdMonthMwBody"></tbody><tfoot id="opdMonthMwFoot"></tfoot></table>',
    '<div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#9fd6c3;margin-bottom:6px;">\ud83d\udcb0 Maandbedrag (simulatie)</div>',
    '<div class="opdMonthOverrideRow"><label>Bedrag:</label><span style="font-size:16px;font-weight:900;color:#cfe6de;">\u20ac</span>',
    '<input type="number" id="opdMonthAmountInput" min="0" step="500" />',
    '<div class="overrideHint" id="opdMonthHint">Pro-rata op werkdagen</div></div>',
    '<div class="opdMonthRedist" id="opdMonthRedist"></div>',
    '<div class="opdMonthActions">',
    '<button onclick="closeOpdMonthPopup()">Sluiten</button>',
    '</div></div></div>'
  ].join('');

  var toastEl = document.getElementById('toast');
  if (toastEl) toastEl.insertAdjacentHTML('beforebegin', html);
  else document.body.insertAdjacentHTML('beforeend', html);

  // ============================================================
  // 3. HOOK INTO renderOpdrachtenPage - make pills clickable
  // ============================================================
  var _origRender = window.renderOpdrachtenPage;

  window.renderOpdrachtenPage = function() {
    _origRender.apply(this, arguments);
    requestAnimationFrame(hookMonthPills);
  };

  function hookMonthPills() {
    var list = document.getElementById('opdrachtenList');
    if (!list) return;

    // Find all "Maandverdeling:" labels
    var allSpans = list.querySelectorAll('span');
    for (var i = 0; i < allSpans.length; i++) {
      var lbl = allSpans[i];
      if (lbl.textContent.trim() !== 'Maandverdeling:') continue;
      var container = lbl.parentElement;
      if (!container || container._pillsHooked) continue;
      container._pillsHooked = true;

      // Find the lead index from the card's openDetail onclick
      var card = container.parentElement;
      while (card && !card.querySelector('[onclick*="openDetail("]')) {
        card = card.parentElement;
        if (!card || card.id === 'opdrachtenList') { card = null; break; }
      }
      if (!card) continue;
      var detailBtn = card.querySelector('[onclick*="openDetail("]');
      if (!detailBtn) continue;
      var m = detailBtn.getAttribute('onclick').match(/openDetail\((\d+)\)/);
      if (!m) continue;
      var leadIdx = parseInt(m[1]);

      // Find month pill divs within the container
      var pills = container.querySelectorAll('div');
      for (var j = 0; j < pills.length; j++) {
        var pill = pills[j];
        // Only select pills that have border-radius:8px in their style (the month boxes)
        if (!pill.style.cssText || pill.style.cssText.indexOf('border-radius') < 0) continue;
        if (!pill.style.cssText.match(/border-radius:\s*8px/)) continue;

        // Extract month name from first child div
        var firstDiv = pill.querySelector('div');
        if (!firstDiv) continue;
        var text = firstDiv.textContent.trim();
        var textParts = text.split(/\s+/);
        var monthName = textParts[0];
        var yr = textParts[1] ? parseInt(textParts[1]) : new Date().getFullYear();
        var mi = window.MONTH_NAMES ? MONTH_NAMES.indexOf(monthName) : -1;
        if (mi < 0) continue;

        var ym = yr + '-' + String(mi + 1).padStart(2, '0');
        pill.setAttribute('data-opd-month', ym);
        pill.setAttribute('data-opd-idx', leadIdx);
        pill.title = 'Klik voor detail ' + monthName + ' ' + yr;

        // Attach click handler (use closure for correct values)
        (function(li, y) {
          pill.addEventListener('click', function(e) {
            e.stopPropagation();
            window.openOpdMonthPopup(li, y);
          });
        })(leadIdx, ym);
      }
    }
  }

  // ============================================================
  // 4. POPUP FUNCTIONS
  // ============================================================
  window.openOpdMonthPopup = function(idx, ym) {
    var l = leads[idx];
    var parts = ym.split('-');
    var year = parseInt(parts[0]), month = parseInt(parts[1]) - 1;

    document.getElementById('opdMonthPopupTitle').textContent = l.klant + (l.omschrijving ? ' \u2014 ' + l.omschrijving : '');
    document.getElementById('opdMonthPopupSub').textContent = MONTH_NAMES[month] + ' ' + year + ' \u00b7 ' + (l.partner || '');

    var budget = getTotalBudget(idx);
    var remaining = getRemainingBudget(idx);
    var start = l.startdatum ? new Date(l.startdatum) : null;
    var end = l.einddatum ? new Date(l.einddatum) : null;
    var opEnd = end || start || new Date();
    var now = new Date(); now.setHours(0, 0, 0, 0);

    // Calculate this month's share of remaining budget
    var remainDays = getRemainingWorkDays(idx);
    var moFirst = new Date(year, month, 1), moLast = new Date(year, month + 1, 0);
    var effFirst = start && moFirst < start ? start : (moFirst < now ? now : moFirst);
    var effLast = moLast > opEnd ? opEnd : moLast;
    var holidays = getDutchHolidays ? getDutchHolidays(year) : [];
    var monthWd = effFirst <= effLast && typeof getWorkingDaysInRange === 'function' ? getWorkingDaysInRange(effFirst, effLast, holidays) : 0;
    var monthBudget = remainDays > 0 ? Math.round(remaining * (monthWd / remainDays)) : 0;

    // Summary
    document.getElementById('opdMonthPopupSummary').innerHTML = [
      '<div class="opdMonthStat"><div class="val">' + fmtEuro(budget) + '</div><div class="lbl">Totaal budget</div></div>',
      '<div class="opdMonthStat"><div class="val" style="color:' + (remaining < 0 ? 'var(--pv-red)' : 'var(--pv-green)') + ';">' + fmtEuro(remaining) + '</div><div class="lbl">Resterend</div></div>',
      '<div class="opdMonthStat"><div class="val">' + fmtEuro(monthBudget) + '</div><div class="lbl">Deze maand</div></div>',
      '<div class="opdMonthStat"><div class="val">' + monthWd + '</div><div class="lbl">Werkdagen</div></div>',
    ].join('');

    // Medewerkers table
    renderPopupMw(idx, year, month, monthBudget);

    // Amount input
    var input = document.getElementById('opdMonthAmountInput');
    input.value = Math.round(monthBudget);
    document.getElementById('opdMonthHint').textContent = 'Pro-rata: ' + monthWd + ' van ' + remainDays + ' resterende werkdagen';

    // Redistribution info
    updateRedistInfo(idx, remaining, remainDays, monthWd);

    // Live update
    input.oninput = function() {
      var v = parseFloat(this.value) || 0;
      renderPopupMw(idx, year, month, v);
    };

    document.getElementById('opdMonthOverlay').classList.add('active');
  };

  function renderPopupMw(idx, year, month, monthAmount) {
    var l = leads[idx];
    var leadAllocs = allocations.filter(function(a) { return a.leadIdx === idx; });
    var totalPct = leadAllocs.reduce(function(s, a) { return s + a.percentage; }, 0);
    var body = document.getElementById('opdMonthMwBody');
    var foot = document.getElementById('opdMonthMwFoot');

    if (!leadAllocs.length) {
      body.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#cfe6de;padding:14px;font-size:12px;">Geen medewerkers toegewezen.<br>Wijs toe via opdrachtdetails.</td></tr>';
      foot.innerHTML = '';
      return;
    }

    var totalUren = 0, totalOmzet = 0, rows = [];
    leadAllocs.forEach(function(a) {
      var aStart = a.startOverride ? new Date(a.startOverride) : (l.startdatum ? new Date(l.startdatum) : null);
      var aEnd = a.endOverride ? new Date(a.endOverride) : (l.einddatum ? new Date(l.einddatum) : null);
      var moF = new Date(year, month, 1), moL = new Date(year, month + 1, 0);
      if (aStart && aStart > moL) return;
      if (aEnd && aEnd < moF) return;

      var share = totalPct > 0 ? a.percentage / totalPct : 0;
      var bedrag = monthAmount * share;
      var uren = a.uurtarief > 0 ? bedrag / a.uurtarief : 0;
      totalUren += uren;
      totalOmzet += bedrag;

      var ovLabel = (a.startOverride || a.endOverride) ?
        '<div style="font-size:9px;color:#e7b65c;">' +
        (a.startOverride ? fmtDateNL(a.startOverride) : '') + '\u2013' +
        (a.endOverride ? fmtDateNL(a.endOverride) : '') + '</div>' : '';

      rows.push('<tr><td class="mwName">' + esc(a.medewerker) + ovLabel + '</td><td class="mwMuted">' + a.percentage + '%</td><td class="mwMuted">' + fmtEuro(a.uurtarief) + '/u</td><td style="text-align:right;font-weight:700;">' + (uren > 0 ? (Math.round(uren * 10) / 10) + ' u' : '0 u') + '</td><td style="text-align:right;font-weight:700;">' + fmtEuro(Math.round(bedrag)) + '</td></tr>');
    });

    body.innerHTML = rows.join('');
    foot.innerHTML = rows.length ? '<tr><td colspan="3">Totaal</td><td style="text-align:right;">' + (Math.round(totalUren * 10) / 10) + ' u</td><td style="text-align:right;">' + fmtEuro(Math.round(totalOmzet)) + '</td></tr>' : '';
  }

  function updateRedistInfo(idx, remaining, remainDays, monthWd) {
    var el = document.getElementById('opdMonthRedist');
    if (remainDays > 0) {
      var dailyRate = Math.round(remaining / remainDays);
      el.innerHTML = 'Resterend: <strong>' + fmtEuro(remaining) + '</strong> over <strong>' + remainDays + '</strong> werkdagen (\u00b1 ' + fmtEuro(dailyRate) + '/werkdag). Deze maand ' + monthWd + ' werkdagen.';
    } else {
      el.innerHTML = 'Geen resterende werkdagen.';
    }
  }

  window.closeOpdMonthPopup = function() {
    document.getElementById('opdMonthOverlay').classList.remove('active');
  };

  // ============================================================
  // 5. SHAREPOINT AUTH FIX
  // ============================================================
  var _origLoadSP = window.loadFromSharePoint;
  window.loadFromSharePoint = function() {
    if (!graphToken) {
      toast('\u26a0\ufe0f Niet ingelogd. Je wordt doorgestuurd naar Microsoft login...');
      setTimeout(doLogin, 800);
      return Promise.resolve();
    }
    return _origLoadSP.apply(this, arguments);
  };

  var _origSyncSP = window.syncToSharePoint;
  window.syncToSharePoint = function() {
    if (!graphToken) {
      toast('\u26a0\ufe0f Niet ingelogd. Log eerst in via Microsoft.');
      return Promise.resolve();
    }
    return _origSyncSP.apply(this, arguments);
  };

  console.log('[PV Dashboard] Popup patch v2 + SharePoint auth fix geladen');
})();
