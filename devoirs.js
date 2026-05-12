/*******************************
 * GAPS PREMIUM – DEVOIRS (v3)
 *******************************/
(function () {

  function load()   { return JSON.parse(localStorage.getItem('GP_DEVOIRS') || '[]'); }
  function save(l)  { localStorage.setItem('GP_DEVOIRS', JSON.stringify(l)); }
  function genId()  { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

  function getBranches() {
    try { return Object.keys(JSON.parse(localStorage.getItem('COEFS_CACHE') || '{}')).sort(); }
    catch { return []; }
  }

  const MONTHS = ['Janvier','Fevrier','Mars','Avril','Mai','Juin',
                  'Juillet','Aout','Septembre','Octobre','Novembre','Decembre'];
  const DAYS_SHORT = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

  function localYMD(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }
  function todayStr() { return localYMD(new Date()); }
  function ymd(d)     { return localYMD(d); }
  function fmt(s)     { if (!s) return '-'; const [y,m,d]=s.split('-'); return `${d}.${m}.${y}`; }
  function daysLeft(s){ if (!s) return null; return Math.ceil((new Date(s)-new Date(todayStr()))/86400000); }

  function urgColor(s, done) {
    if (done) return '#94A3B8';
    const d = daysLeft(s);
    if (d === null) return '#64748B';
    if (d < 0)  return '#DC2626';
    if (d <= 2) return '#D97706';
    if (d <= 7) return '#CA8A04';
    return '#059669';
  }

  function urgLabel(s, done) {
    if (done) return 'Rendu';
    const d = daysLeft(s);
    if (d === null) return '';
    if (d < 0)  return `${Math.abs(d)}j de retard`;
    if (d === 0) return "Aujourd'hui !";
    if (d === 1) return 'Demain';
    return `dans ${d}j`;
  }

  function typeColor(t) { return t === 'test' ? '#7C3AED' : '#4F6CD4'; }
  function typeLabel(t) { return t === 'test' ? 'Test' : 'Devoir'; }

  let VIEW  = 'agenda';
  let CUR_Y = new Date().getFullYear();
  let CUR_M = new Date().getMonth();

  function injectStyles() {
    if (document.getElementById('gp-style')) return;
    const s = document.createElement('style');
    s.id = 'gp-style';
    s.textContent = `
      #gp-panel {
        position: fixed; left: 0; right: 0; bottom: 0;
        background: #F1F5F9; z-index: 9000; box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px; color: #1E293B; border-top: 3px solid #4F6CD4;
      }
      #gp-toolbar {
        display: flex; align-items: center; gap: 8px;
        background: linear-gradient(135deg, #1E2A5E 0%, #4F6CD4 100%);
        padding: 11px 18px; color: white; flex-wrap: wrap;
        box-shadow: 0 2px 12px rgba(30,42,94,0.35);
      }
      #gp-toolbar h2 { margin: 0; font-size: 15px; font-weight: 800; flex: 1; letter-spacing: -.3px; }
      .gp-tb-btn {
        background: rgba(255,255,255,0.13); border: 1px solid rgba(255,255,255,0.28);
        color: white; border-radius: 20px; padding: 5px 14px; font-size: 12px;
        cursor: pointer; white-space: nowrap; font-weight: 500; transition: all .15s;
      }
      .gp-tb-btn:hover { background: rgba(255,255,255,0.26); }
      .gp-tb-btn.active { background: white; color: #4F6CD4; font-weight: 700; border-color: white; }
      .gp-tb-btn.add { background: rgba(5,150,105,0.22); border-color: rgba(5,150,105,0.55); }
      .gp-tb-btn.add:hover { background: rgba(5,150,105,0.4); }
      .gp-tb-btn.add-test { background: rgba(124,58,237,0.22); border-color: rgba(124,58,237,0.55); }
      .gp-tb-btn.add-test:hover { background: rgba(124,58,237,0.4); }
      .gp-tb-btn.close { background: rgba(220,38,38,0.18); border-color: rgba(220,38,38,0.4); }
      .gp-tb-btn.close:hover { background: rgba(220,38,38,0.38); }

      #gp-stats {
        display: flex; gap: 10px; padding: 12px 18px;
        background: #E8EDF5; border-bottom: 1px solid #CBD5E1; flex-wrap: wrap;
      }
      .gp-stat {
        background: white; border: 1px solid #E2E8F0; border-radius: 10px;
        padding: 10px 14px; font-size: 12px; display: flex; align-items: center;
        gap: 10px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); flex: 1; min-width: 70px;
        border-top: 3px solid #ccc; transition: transform .12s;
      }
      .gp-stat:hover { transform: translateY(-1px); }
      .gp-stat-info { display: flex; flex-direction: column; gap: 1px; }
      .gp-stat b { font-size: 24px; font-weight: 800; line-height: 1.1; }
      .gp-stat-label { color: #64748B; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; }
      .gp-stat.red    { border-top-color: #DC2626; } .gp-stat.red    b { color: #DC2626; }
      .gp-stat.orange { border-top-color: #D97706; } .gp-stat.orange b { color: #D97706; }
      .gp-stat.blue   { border-top-color: #4F6CD4; } .gp-stat.blue   b { color: #4F6CD4; }
      .gp-stat.purple { border-top-color: #7C3AED; } .gp-stat.purple b { color: #7C3AED; }
      .gp-stat.green  { border-top-color: #059669; } .gp-stat.green  b { color: #059669; }

      #gp-main { display: flex; gap: 0; min-height: 500px; max-height: 70vh; overflow: hidden; }

      #gp-calendar-wrap { flex: 1; padding: 16px 18px; min-width: 0; }
      #gp-cal-nav { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
      #gp-cal-nav span { font-size: 16px; font-weight: 800; color: #1E293B; flex: 1; text-align: center; letter-spacing: -.3px; }
      .gp-nav-btn {
        background: white; border: 1px solid #E2E8F0; border-radius: 8px;
        padding: 5px 14px; cursor: pointer; font-size: 15px; color: #4F6CD4;
        box-shadow: 0 1px 4px rgba(0,0,0,0.06); transition: all .12s;
      }
      .gp-nav-btn:hover { background: #4F6CD4; color: white; border-color: #4F6CD4; }
      #gp-today-btn {
        background: #4F6CD4; color: white; border: none; border-radius: 8px;
        padding: 5px 12px; font-size: 12px; cursor: pointer; font-weight: 700; transition: all .12s;
      }
      #gp-today-btn:hover { background: #3A50A8; }
      #gp-calendar {
        width: 100%; border-collapse: separate; border-spacing: 3px;
        background: transparent; table-layout: fixed;
      }
      #gp-calendar thead th {
        background: #4F6CD4; color: white; padding: 7px 4px; text-align: center;
        font-size: 10px; font-weight: 800; letter-spacing: .8px; border-radius: 6px; text-transform: uppercase;
      }
      #gp-calendar tbody td {
        background: white; border: 1px solid #E2E8F0; border-radius: 8px;
        vertical-align: top; padding: 6px; height: 85px; cursor: pointer;
        transition: all .12s; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      }
      #gp-calendar tbody td:hover { background: #EEF2FF; border-color: #4F6CD4; }
      #gp-calendar tbody td.other-month { background: #F8FAFC; opacity: .55; }
      #gp-calendar tbody td.today { background: #EEF2FF; border-color: #4F6CD4; box-shadow: 0 0 0 2px rgba(79,108,212,.25); }
      #gp-calendar tbody td.today .gp-day-num {
        background: #4F6CD4; color: white; border-radius: 50%;
        width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center;
      }
      .gp-day-num { font-size: 11px; font-weight: 700; color: #475569; display: block; margin-bottom: 3px; }
      .gp-event {
        display: block; border-radius: 4px; padding: 2px 6px; margin-bottom: 2px;
        font-size: 10px; color: white; white-space: nowrap; overflow: hidden;
        text-overflow: ellipsis; cursor: pointer; font-weight: 600;
      }
      .gp-event.done { opacity: .4; text-decoration: line-through; }
      .gp-more { font-size: 10px; color: #94A3B8; padding: 1px 2px; }

      #gp-agenda-wrap { flex: 1; padding: 16px 18px; min-width: 0; overflow-y: auto; }
      .gp-agenda-group { margin-bottom: 22px; }
      .gp-agenda-date {
        font-size: 10px; font-weight: 800; color: #64748B; text-transform: uppercase;
        letter-spacing: 1.2px; padding-bottom: 8px; margin-bottom: 10px;
        border-bottom: 1px solid #E2E8F0;
      }
      .gp-agenda-card {
        background: white; border: 1px solid #E2E8F0; border-radius: 10px;
        padding: 12px 14px; margin-bottom: 8px; display: flex; align-items: flex-start;
        gap: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); transition: all .15s;
        border-left: 4px solid #ccc;
      }
      .gp-agenda-card:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.1); transform: translateY(-1px); }
      .gp-agenda-card.done { opacity: .65; }
      .gp-agenda-card input[type=checkbox] {
        margin-top: 2px; cursor: pointer; accent-color: #059669; width: 15px; height: 15px; flex-shrink: 0;
      }
      .gp-agenda-body { flex: 1; min-width: 0; }
      .gp-agenda-title { font-weight: 700; font-size: 13px; color: #1E293B; line-height: 1.3; }
      .gp-agenda-card.done .gp-agenda-title { text-decoration: line-through; color: #94A3B8; }
      .gp-agenda-meta { font-size: 11px; color: #64748B; display: flex; gap: 6px; margin-top: 5px; flex-wrap: wrap; align-items: center; }
      .gp-tag { border-radius: 20px; padding: 2px 9px; font-size: 10px; color: white; font-weight: 700; letter-spacing: .2px; }
      .gp-tag.type-devoir { background: #4F6CD4; }
      .gp-tag.type-test   { background: #7C3AED; }
      .gp-tag.branch      { background: #475569; }
      .gp-tag.prio-high   { background: #DC2626; }
      .gp-tag.prio-medium { background: #D97706; }
      .gp-tag.prio-low    { background: #059669; }
      .gp-urgency { font-size: 11px; font-weight: 700; }
      .gp-agenda-desc { font-size: 12px; color: #64748B; margin-top: 5px; line-height: 1.4; }
      .gp-agenda-actions { display: flex; gap: 4px; flex-shrink: 0; }
      .gp-icon-btn {
        background: #F1F5F9; border: 1px solid #E2E8F0; border-radius: 6px;
        padding: 4px 10px; cursor: pointer; font-size: 11px; color: #64748B;
        font-weight: 600; transition: all .1s;
      }
      .gp-icon-btn:hover { background: #E2E8F0; color: #1E293B; }
      .gp-icon-btn.del:hover { border-color: #DC2626; color: #DC2626; background: #FEF2F2; }

      #gp-sidebar {
        width: 240px; flex-shrink: 0; background: white; border-left: 1px solid #E2E8F0;
        padding: 14px; overflow-y: auto; max-height: 600px;
      }
      #gp-sidebar h3 {
        font-size: 10px; color: #94A3B8; margin: 0 0 12px; font-weight: 800;
        text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #F1F5F9; padding-bottom: 8px;
      }
      .gp-side-item {
        border-left: 3px solid #ccc; padding: 8px 10px; margin-bottom: 6px;
        border-radius: 0 8px 8px 0; cursor: pointer; background: #F8FAFC;
        font-size: 12px; transition: all .1s;
      }
      .gp-side-item:hover { background: #EEF2FF; }
      .gp-side-type {
        display: inline-block; font-size: 9px; font-weight: 800; text-transform: uppercase;
        letter-spacing: .5px; padding: 1px 6px; border-radius: 20px; color: white; margin-bottom: 3px;
      }
      .gp-side-title { font-weight: 700; color: #1E293B; margin-bottom: 2px; }
      .gp-side-meta { color: #94A3B8; font-size: 10px; }

      #gp-modal-bg {
        position: fixed; inset: 0; z-index: 99999;
        background: rgba(15,23,42,.55); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
      }
      #gp-modal {
        background: white; border-radius: 14px; padding: 26px 30px;
        width: 460px; max-width: 95vw; box-shadow: 0 20px 60px rgba(0,0,0,.25);
        display: flex; flex-direction: column; gap: 14px;
        animation: gpIn .18s cubic-bezier(.2,.8,.4,1);
      }
      @keyframes gpIn { from { opacity:0; transform: scale(.95) translateY(-12px); } to { opacity:1; transform: none; } }
      #gp-modal h3 { margin: 0; font-size: 16px; font-weight: 800; color: #1E293B; }
      .gp-type-selector { display: flex; gap: 8px; }
      .gp-type-btn {
        flex: 1; padding: 10px 8px; border-radius: 8px; border: 2px solid #E2E8F0;
        cursor: pointer; background: white; font-weight: 700; font-size: 12px;
        text-align: center; transition: all .15s; color: #94A3B8;
      }
      .gp-type-btn:hover { border-color: #CBD5E1; color: #64748B; }
      .gp-type-btn.sel-devoir { border-color: #4F6CD4; background: #EEF2FF; color: #4F6CD4; }
      .gp-type-btn.sel-test   { border-color: #7C3AED; background: #F5F3FF; color: #7C3AED; }
      .gp-field { display: flex; flex-direction: column; gap: 5px; }
      .gp-field label { font-size: 10px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: .5px; }
      .gp-field input, .gp-field select, .gp-field textarea {
        border: 1.5px solid #E2E8F0; border-radius: 8px; padding: 9px 11px;
        font-size: 13px; font-family: inherit; color: #1E293B; background: #FAFAFA;
        resize: vertical; transition: border-color .15s, background .15s;
      }
      .gp-field input:focus, .gp-field select:focus, .gp-field textarea:focus {
        outline: none; border-color: #4F6CD4; background: white;
        box-shadow: 0 0 0 3px rgba(79,108,212,.12);
      }
      .gp-field textarea { min-height: 70px; }
      .gp-modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 2px; }
      .gp-btn-save {
        background: linear-gradient(135deg, #4F6CD4 0%, #3A50A8 100%);
        color: white; border: none; border-radius: 8px; padding: 10px 22px;
        font-size: 13px; font-weight: 700; cursor: pointer; transition: all .15s;
        box-shadow: 0 2px 8px rgba(79,108,212,.35);
      }
      .gp-btn-save:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(79,108,212,.45); }
      .gp-btn-save.is-test {
        background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%);
        box-shadow: 0 2px 8px rgba(124,58,237,.35);
      }
      .gp-btn-save.is-test:hover { box-shadow: 0 4px 14px rgba(124,58,237,.45); }
      .gp-btn-cancel-modal {
        background: white; border: 1.5px solid #E2E8F0; color: #64748B;
        border-radius: 8px; padding: 10px 18px; font-size: 13px;
        font-weight: 600; cursor: pointer; transition: all .15s;
      }
      .gp-btn-cancel-modal:hover { background: #F1F5F9; color: #1E293B; }
      .gp-empty { text-align: center; color: #94A3B8; padding: 40px 0; font-size: 14px; }
    `;
    document.head.appendChild(s);
  }

  function openPanel() {
    injectStyles();
    const nav = document.querySelector('.ulroot');
    const panel = document.createElement('div');
    panel.id = 'gp-panel';

    const toolbar = document.createElement('div');
    toolbar.id = 'gp-toolbar';

    const title = document.createElement('h2');
    title.textContent = 'Devoirs & Tests';

    const btnCal = document.createElement('button');
    btnCal.className = 'gp-tb-btn' + (VIEW === 'calendar' ? ' active' : '');
    btnCal.textContent = 'Calendrier';
    btnCal.onclick = () => { VIEW = 'calendar'; refreshView(panel); btnCal.classList.add('active'); btnAgenda.classList.remove('active'); };

    const btnAgenda = document.createElement('button');
    btnAgenda.className = 'gp-tb-btn' + (VIEW === 'agenda' ? ' active' : '');
    btnAgenda.textContent = 'Agenda';
    btnAgenda.onclick = () => { VIEW = 'agenda'; refreshView(panel); btnAgenda.classList.add('active'); btnCal.classList.remove('active'); };

    const btnAdd = document.createElement('button');
    btnAdd.className = 'gp-tb-btn add';
    btnAdd.textContent = '+ Devoir';
    btnAdd.onclick = () => openForm(null, null, panel, 'devoir');

    const btnAddTest = document.createElement('button');
    btnAddTest.className = 'gp-tb-btn add-test';
    btnAddTest.textContent = '+ Test';
    btnAddTest.onclick = () => openForm(null, null, panel, 'test');

    const btnClose = document.createElement('button');
    btnClose.className = 'gp-tb-btn close';
    btnClose.textContent = 'Fermer';
    btnClose.onclick = () => panel.remove();

    toolbar.appendChild(title);
    toolbar.appendChild(btnCal);
    toolbar.appendChild(btnAgenda);
    toolbar.appendChild(btnAdd);
    toolbar.appendChild(btnAddTest);
    toolbar.appendChild(btnClose);

    const stats = document.createElement('div');
    stats.id = 'gp-stats';

    const main = document.createElement('div');
    main.id = 'gp-main';

    panel.appendChild(toolbar);
    panel.appendChild(stats);
    panel.appendChild(main);
    document.body.appendChild(panel);
    refreshView(panel);
  }

  function refreshView(panel) {
    const main  = panel.querySelector('#gp-main');
    const stats = panel.querySelector('#gp-stats');
    main.innerHTML = '';
    renderStats(stats);
    if (VIEW === 'calendar') renderCalendarView(main, panel);
    else                     renderAgendaView(main, panel);
  }

  function renderStats(el) {
    const list  = load();
    const today = todayStr();
    const overdue = list.filter(d => !d.done && d.dueDate && d.dueDate < today).length;
    const urgent  = list.filter(d => !d.done && d.priority === 'high').length;
    const devoirs = list.filter(d => !d.done && d.type !== 'test').length;
    const tests   = list.filter(d => !d.done && d.type === 'test').length;
    const done    = list.filter(d => d.done).length;
    el.innerHTML = `
      <div class="gp-stat red">   <div class="gp-stat-info"><b>${overdue}</b><span class="gp-stat-label">En retard</span></div></div>
      <div class="gp-stat orange"><div class="gp-stat-info"><b>${urgent}</b><span class="gp-stat-label">Urgent</span></div></div>
      <div class="gp-stat blue">  <div class="gp-stat-info"><b>${devoirs}</b><span class="gp-stat-label">Devoirs</span></div></div>
      <div class="gp-stat purple"><div class="gp-stat-info"><b>${tests}</b><span class="gp-stat-label">Tests</span></div></div>
      <div class="gp-stat green"> <div class="gp-stat-info"><b>${done}</b><span class="gp-stat-label">Rendus</span></div></div>
    `;
  }

  function renderCalendarView(main, panel) {
    const wrap = document.createElement('div');
    wrap.id = 'gp-calendar-wrap';

    const nav = document.createElement('div');
    nav.id = 'gp-cal-nav';

    const btnPrev = document.createElement('button');
    btnPrev.className = 'gp-nav-btn';
    btnPrev.textContent = '‹';
    btnPrev.onclick = () => { CUR_M--; if (CUR_M < 0) { CUR_M = 11; CUR_Y--; } refreshView(panel); };

    const label = document.createElement('span');
    label.textContent = MONTHS[CUR_M] + ' ' + CUR_Y;

    const btnNext = document.createElement('button');
    btnNext.className = 'gp-nav-btn';
    btnNext.textContent = '›';
    btnNext.onclick = () => { CUR_M++; if (CUR_M > 11) { CUR_M = 0; CUR_Y++; } refreshView(panel); };

    const btnToday = document.createElement('button');
    btnToday.id = 'gp-today-btn';
    btnToday.textContent = "Aujourd'hui";
    btnToday.onclick = () => { CUR_Y = new Date().getFullYear(); CUR_M = new Date().getMonth(); refreshView(panel); };

    nav.appendChild(btnPrev);
    nav.appendChild(label);
    nav.appendChild(btnNext);
    nav.appendChild(btnToday);
    wrap.appendChild(nav);

    const items  = load();
    const today  = todayStr();

    const table = document.createElement('table');
    table.id = 'gp-calendar';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    DAYS_SHORT.forEach(d => { const th = document.createElement('th'); th.textContent = d; headRow.appendChild(th); });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    const firstDay = new Date(CUR_Y, CUR_M, 1);
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const daysInMonth = new Date(CUR_Y, CUR_M + 1, 0).getDate();
    const daysInPrev  = new Date(CUR_Y, CUR_M, 0).getDate();
    let dayCount = 1, nextCount = 1;
    const totalCells = Math.ceil((startDow + daysInMonth) / 7) * 7;

    for (let cell = 0; cell < totalCells; cell++) {
      if (cell % 7 === 0) tbody.appendChild(document.createElement('tr'));
      const row = tbody.lastChild;
      const td  = document.createElement('td');

      let dateStr, isOther = false;
      if (cell < startDow) {
        const d = daysInPrev - startDow + cell + 1;
        dateStr = ymd(new Date(CUR_Y, CUR_M - 1, d));
        isOther = true;
        td.className = 'other-month';
        const span = document.createElement('span'); span.className = 'gp-day-num'; span.textContent = d; td.appendChild(span);
      } else if (dayCount <= daysInMonth) {
        dateStr = ymd(new Date(CUR_Y, CUR_M, dayCount));
        if (dateStr === today) td.className = 'today';
        const span = document.createElement('span'); span.className = 'gp-day-num'; span.textContent = dayCount; td.appendChild(span);
        dayCount++;
      } else {
        dateStr = ymd(new Date(CUR_Y, CUR_M + 1, nextCount));
        isOther = true;
        td.className = 'other-month';
        const span = document.createElement('span'); span.className = 'gp-day-num'; span.textContent = nextCount; td.appendChild(span);
        nextCount++;
      }

      const dayItems = items.filter(d => d.dueDate === dateStr);
      dayItems.slice(0, 3).forEach(d => {
        const ev = document.createElement('span');
        ev.className = 'gp-event' + (d.done ? ' done' : '');
        ev.style.background = d.done ? '#94A3B8' : (d.type === 'test' ? '#7C3AED' : d.priority === 'high' && !d.done ? '#D97706' : urgColor(d.dueDate, d.done));
        ev.textContent = (d.branch ? d.branch + ' – ' : '') + d.title;
        ev.title = typeLabel(d.type) + ': ' + d.title + (d.branch ? ' (' + d.branch + ')' : '');
        ev.onclick = e => { e.stopPropagation(); openForm(d.id, null, panel); };
        td.appendChild(ev);
      });
      if (dayItems.length > 3) {
        const more = document.createElement('span');
        more.className = 'gp-more';
        more.textContent = '+' + (dayItems.length - 3) + ' autre(s)';
        td.appendChild(more);
      }

      td.addEventListener('click', () => { if (!isOther) openForm(null, dateStr, panel); });
      row.appendChild(td);
    }

    table.appendChild(tbody);
    wrap.appendChild(table);
    main.appendChild(wrap);
    main.appendChild(buildSidebar(panel));
  }

  function buildSidebar(panel) {
    const sidebar = document.createElement('div');
    sidebar.id = 'gp-sidebar';

    const h3 = document.createElement('h3');
    h3.textContent = 'A venir';
    sidebar.appendChild(h3);

    const today = todayStr();
    const overdue  = load().filter(d => !d.done && d.dueDate && d.dueDate < today).sort((a,b) => b.dueDate.localeCompare(a.dueDate));
    const upcoming = load().filter(d => !d.done && d.dueDate && d.dueDate >= today).sort((a,b) => a.dueDate.localeCompare(b.dueDate)).slice(0,8);

    if (overdue.length) {
      const h = document.createElement('h3'); h.textContent = 'En retard'; h.style.color = '#DC2626'; sidebar.appendChild(h);
      overdue.forEach(d => sidebar.appendChild(sideItem(d, panel)));
    }
    if (upcoming.length === 0 && overdue.length === 0) {
      const p = document.createElement('p'); p.className = 'gp-empty'; p.style.padding = '20px 0'; p.textContent = 'Rien a venir !'; sidebar.appendChild(p);
    } else {
      upcoming.forEach(d => sidebar.appendChild(sideItem(d, panel)));
    }
    return sidebar;
  }

  function sideItem(d, panel) {
    const el = document.createElement('div');
    el.className = 'gp-side-item';
    el.style.borderLeftColor = d.type === 'test' ? '#7C3AED' : d.priority === 'high' && !d.done ? '#D97706' : urgColor(d.dueDate, d.done);
    el.onclick = () => openForm(d.id, null, panel);

    const typeSpan = document.createElement('span');
    typeSpan.className = 'gp-side-type';
    typeSpan.style.background = typeColor(d.type);
    typeSpan.textContent = typeLabel(d.type);

    const title = document.createElement('div'); title.className = 'gp-side-title'; title.textContent = d.title;
    const meta  = document.createElement('div'); meta.className  = 'gp-side-meta';
    const parts = [];
    if (d.branch)  parts.push(d.branch);
    if (d.dueDate) parts.push(fmt(d.dueDate) + ' · ' + urgLabel(d.dueDate, d.done));
    meta.textContent = parts.join(' | ');

    el.appendChild(typeSpan);
    el.appendChild(title);
    el.appendChild(meta);
    return el;
  }

  function renderAgendaView(main, panel) {
    const wrap = document.createElement('div');
    wrap.id = 'gp-agenda-wrap';

    const today = todayStr();
    const list = load().sort((a,b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1; if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });

    if (list.length === 0) {
      const e = document.createElement('div'); e.className = 'gp-empty';
      e.textContent = 'Rien ici. Ajoute un devoir ou un test !';
      wrap.appendChild(e); main.appendChild(wrap); return;
    }

    const overdue = list.filter(d => !d.done && d.dueDate && d.dueDate < today);
    if (overdue.length) wrap.appendChild(buildAgendaGroup('En retard', overdue, '#DC2626', panel));

    const groups = {};
    list.forEach(d => {
      const k = d.dueDate || '_nodate';
      if (!groups[k]) groups[k] = [];
      groups[k].push(d);
    });

    Object.entries(groups).sort(([a],[b]) => a.localeCompare(b)).forEach(([dateKey, items]) => {
      const visible = items.filter(d => d.done || !d.dueDate || d.dueDate >= today);
      if (visible.length === 0) return;
      let label = dateKey === '_nodate' ? 'Sans date' : fmt(dateKey);
      const dl = daysLeft(dateKey);
      if (dl === 0) label += " — Aujourd'hui";
      else if (dl === 1) label += ' — Demain';
      else if (dl !== null && dl > 0) label += ' — dans ' + dl + 'j';
      wrap.appendChild(buildAgendaGroup(label, visible, '#64748B', panel));
    });

    main.appendChild(wrap);
    main.appendChild(buildSidebar(panel));
  }

  function buildAgendaGroup(label, items, color, panel) {
    const g = document.createElement('div'); g.className = 'gp-agenda-group';
    const dl = document.createElement('div'); dl.className = 'gp-agenda-date';
    dl.style.color = color; dl.style.borderBottomColor = color + '44'; dl.textContent = label;
    g.appendChild(dl);
    items.forEach(d => g.appendChild(buildAgendaCard(d, panel)));
    return g;
  }

  function buildAgendaCard(d, panel) {
    const card = document.createElement('div');
    card.className = 'gp-agenda-card' + (d.done ? ' done' : '');
    card.style.borderLeftColor = d.type === 'test' ? '#7C3AED' : d.priority === 'high' && !d.done ? '#D97706' : urgColor(d.dueDate, d.done);

    const chk = document.createElement('input'); chk.type = 'checkbox'; chk.checked = !!d.done;
    chk.onchange = () => { const l=load(); const i=l.find(x=>x.id===d.id); if(i){i.done=chk.checked;save(l);} const p=document.getElementById('gp-panel'); if(p)refreshView(p); };

    const body = document.createElement('div'); body.className = 'gp-agenda-body';
    const title = document.createElement('div'); title.className = 'gp-agenda-title'; title.textContent = d.title || '(sans titre)';
    const meta  = document.createElement('div'); meta.className = 'gp-agenda-meta';

    const typeTag = document.createElement('span');
    typeTag.className = 'gp-tag type-' + (d.type || 'devoir');
    typeTag.textContent = typeLabel(d.type);
    meta.appendChild(typeTag);

    if (d.branch) { const t=document.createElement('span'); t.className='gp-tag branch'; t.textContent=d.branch; meta.appendChild(t); }
    if (d.priority) {
      const pt=document.createElement('span'); pt.className='gp-tag prio-' + d.priority;
      pt.textContent = d.priority==='high' ? 'Urgent' : d.priority==='medium' ? 'Normal' : 'Faible';
      meta.appendChild(pt);
    }
    if (d.dueDate) {
      const u=document.createElement('span'); u.className='gp-urgency'; u.style.color=urgColor(d.dueDate,d.done); u.textContent=urgLabel(d.dueDate,d.done); meta.appendChild(u);
    }
    body.appendChild(title); body.appendChild(meta);
    if (d.description) { const desc=document.createElement('div'); desc.className='gp-agenda-desc'; desc.textContent=d.description; body.appendChild(desc); }

    const actions=document.createElement('div'); actions.className='gp-agenda-actions';
    const editBtn=document.createElement('button'); editBtn.className='gp-icon-btn'; editBtn.textContent='Modifier'; editBtn.onclick=()=>openForm(d.id,null,panel);
    const delBtn=document.createElement('button');  delBtn.className='gp-icon-btn del'; delBtn.textContent='Supprimer';
    delBtn.onclick=()=>{ save(load().filter(x=>x.id!==d.id)); const p=document.getElementById('gp-panel'); if(p)refreshView(p); };
    actions.appendChild(editBtn); actions.appendChild(delBtn);

    card.appendChild(chk); card.appendChild(body); card.appendChild(actions);
    return card;
  }

  function openForm(editId, prefillDate, panel, prefillType) {
    const existing = editId ? load().find(d => d.id === editId) : null;
    let selectedType = existing ? (existing.type || 'devoir') : (prefillType || 'devoir');

    const bg = document.createElement('div'); bg.id = 'gp-modal-bg';
    bg.onclick = e => { if (e.target === bg) bg.remove(); };

    const modal = document.createElement('div'); modal.id = 'gp-modal';
    const h3 = document.createElement('h3'); h3.textContent = existing ? 'Modifier' : 'Nouveau';

    const typeWrap = document.createElement('div'); typeWrap.className = 'gp-type-selector';
    const btnDevoir = document.createElement('button');
    btnDevoir.className = 'gp-type-btn' + (selectedType === 'devoir' ? ' sel-devoir' : '');
    btnDevoir.textContent = 'Devoir';
    const btnTest = document.createElement('button');
    btnTest.className = 'gp-type-btn' + (selectedType === 'test' ? ' sel-test' : '');
    btnTest.textContent = 'Test';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'gp-btn-save' + (selectedType === 'test' ? ' is-test' : '');
    saveBtn.textContent = existing ? 'Enregistrer' : 'Ajouter';

    btnDevoir.onclick = () => {
      selectedType = 'devoir';
      btnDevoir.className = 'gp-type-btn sel-devoir';
      btnTest.className = 'gp-type-btn';
      saveBtn.className = 'gp-btn-save';
    };
    btnTest.onclick = () => {
      selectedType = 'test';
      btnTest.className = 'gp-type-btn sel-test';
      btnDevoir.className = 'gp-type-btn';
      saveBtn.className = 'gp-btn-save is-test';
    };
    typeWrap.appendChild(btnDevoir);
    typeWrap.appendChild(btnTest);

    const fTitle  = mkField('Titre *', 'input', existing ? existing.title : '', 'Ex : Exercices serie 5');
    const fBranch = mkSelect('Branche', getBranches(), existing ? existing.branch : '');
    const fDate   = mkField('Date', 'date', existing ? existing.dueDate || '' : prefillDate || '');
    const fPrio   = mkSelect('Priorite', [
      {value:'high',label:'Urgent'},{value:'medium',label:'Normal'},{value:'low',label:'Faible'}
    ], existing ? existing.priority : 'medium');
    const fDesc   = mkField('Description', 'textarea', existing ? existing.description || '' : '');

    const actDiv = document.createElement('div'); actDiv.className = 'gp-modal-actions';
    const cancelBtn = document.createElement('button'); cancelBtn.className = 'gp-btn-cancel-modal'; cancelBtn.textContent = 'Annuler'; cancelBtn.onclick = () => bg.remove();

    saveBtn.onclick = () => {
      const title = fTitle.querySelector('input,textarea').value.trim();
      if (!title) { fTitle.querySelector('input,textarea').style.borderColor = '#DC2626'; return; }
      const l = load();
      const entry = {
        title, type: selectedType,
        branch: fBranch.querySelector('select').value,
        dueDate: fDate.querySelector('input').value || null,
        priority: fPrio.querySelector('select').value,
        description: fDesc.querySelector('textarea').value.trim(),
      };
      if (existing) { const item=l.find(d=>d.id===editId); if(item) Object.assign(item,entry); }
      else { l.push({ id:genId(), done:false, createdAt:Date.now(), ...entry }); }
      save(l); bg.remove();
      if (panel) refreshView(panel);
    };
    actDiv.appendChild(cancelBtn); actDiv.appendChild(saveBtn);
    [h3, typeWrap, fTitle, fBranch, fDate, fPrio, fDesc, actDiv].forEach(el => modal.appendChild(el));
    bg.appendChild(modal); document.body.appendChild(bg);
    modal.querySelector('input[type=text]')?.focus();
  }

  function mkField(label, type, value, placeholder) {
    const wrap=document.createElement('div'); wrap.className='gp-field';
    const lbl=document.createElement('label'); lbl.textContent=label; wrap.appendChild(lbl);
    if (type==='textarea') {
      const ta=document.createElement('textarea'); ta.value=value; if(placeholder)ta.placeholder=placeholder; wrap.appendChild(ta);
    } else {
      const inp=document.createElement('input'); inp.type=type; inp.value=value; if(placeholder)inp.placeholder=placeholder; wrap.appendChild(inp);
    }
    return wrap;
  }

  function mkSelect(label, options, selected) {
    const wrap=document.createElement('div'); wrap.className='gp-field';
    const lbl=document.createElement('label'); lbl.textContent=label;
    const sel=document.createElement('select');
    if (!options.length || typeof options[0]==='string') {
      const blank=document.createElement('option'); blank.value=''; blank.textContent='- Aucune -'; sel.appendChild(blank);
      options.forEach(o => { const opt=document.createElement('option'); opt.value=o; opt.textContent=o; if(o===selected)opt.selected=true; sel.appendChild(opt); });
    } else {
      options.forEach(o => { const opt=document.createElement('option'); opt.value=o.value; opt.textContent=o.label; if(o.value===selected)opt.selected=true; sel.appendChild(opt); });
    }
    wrap.appendChild(lbl); wrap.appendChild(sel);
    return wrap;
  }

  window.__gpOpenDevoirs = function () {
    const existing = document.getElementById('gp-panel');
    if (existing) { existing.remove(); return; }
    openPanel();
  };

})();
