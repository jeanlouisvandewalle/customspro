(function () {
  'use strict';

  var ROUTES = ['home', 'services', 'about', 'news', 'contact'];

  /* ---------------------------------------------------------------- *
   * Header & mobile menu
   * ---------------------------------------------------------------- */
  var header = document.querySelector('.site-header');
  var floatBtn = document.querySelector('.float-linkedin');

  function onScroll() {
    var y = window.scrollY;
    if (header) header.classList.toggle('scrolled', y > 40);
    if (floatBtn) floatBtn.classList.toggle('visible', y > 500);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var toggle = document.querySelector('.menu-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var open = document.body.classList.toggle('menu-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  document.querySelectorAll('.nav a').forEach(function (a) {
    a.addEventListener('click', function () {
      document.body.classList.remove('menu-open');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    });
  });

  /* ---------------------------------------------------------------- *
   * Router  (#/home, #/services, #/services#audits, …)
   * ---------------------------------------------------------------- */
  function parseHash() {
    var raw = (location.hash || '').replace(/^#/, '');
    var parts = raw.split('#');
    var route = (parts[0] || '').replace(/^\//, '');
    if (ROUTES.indexOf(route) === -1) route = 'home';
    return { route: route, anchor: parts[1] || '' };
  }

  function reveal(scope) {
    var els = scope.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight) el.classList.add('in');
      else io.observe(el);
    });
  }

  function render() {
    var state = parseHash();
    ROUTES.forEach(function (r) {
      var el = document.getElementById('route-' + r);
      if (el) el.classList.toggle('is-active', r === state.route);
    });
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      if (a.getAttribute('data-nav') === state.route) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    var active = document.getElementById('route-' + state.route);
    if (!active) return;

    if (state.anchor) {
      var target = active.querySelector('#' + CSS.escape(state.anchor));
      if (target) {
        reveal(active);
        window.requestAnimationFrame(function () {
          var top = target.getBoundingClientRect().top + window.scrollY - 90;
          window.scrollTo({ top: top, behavior: 'smooth' });
        });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
    reveal(active);
  }

  window.addEventListener('hashchange', render);
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href^="#/"]');
    if (a && a.getAttribute('href') === location.hash) render();
  });
  render();

  /* Sub-navigation highlighting on the services page */
  var subLinks = document.querySelectorAll('.service-nav a');
  if (subLinks.length && 'IntersectionObserver' in window) {
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        subLinks.forEach(function (l) {
          var href = l.getAttribute('href') || '';
          l.classList.toggle('active', href.split('#')[2] === e.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('.service-detail[id]').forEach(function (s) { sio.observe(s); });
  }

  /* ---------------------------------------------------------------- *
   * Contact form -> opens an email to info@customspro.be
   * ---------------------------------------------------------------- */
  var form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var f = form.elements;
      var subject = 'Website enquiry – ' + (f.onderwerp.value || 'General');
      var body =
        'Name: ' + f.naam.value + '\n' +
        'Company: ' + f.bedrijf.value + '\n' +
        'Email: ' + f.email.value + '\n' +
        'Telephone: ' + f.telefoon.value + '\n\n' +
        f.bericht.value;
      window.location.href = 'mailto:info@customspro.be?subject=' +
        encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    });
  }

  var yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---------------------------------------------------------------- *
  /* ---------------------------------------------------------------- *
   * News — stored in the artifact database
   * ---------------------------------------------------------------- */
  var listEl = document.getElementById('news-list');
  var typesEl = document.getElementById('news-types');
  var topicsEl = document.getElementById('news-topics');
  var adminEl = document.getElementById('news-admin');
  var statusEl = document.getElementById('news-status');
  var newsForm = document.getElementById('news-form');
  var LINKEDIN = 'https://www.linkedin.com/in/jo-vandewalle-5059613/recent-activity/all/';
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
  var TYPE_ORDER = ['Regulatory update', 'Case law', 'Practice insight', 'Firm news'];
  var TOPIC_LABELS = {
    'classification': 'Classification', 'origin': 'Origin', 'valuation': 'Valuation',
    'excise': 'Excise', 'export-controls': 'Export controls', 'sanctions': 'Sanctions',
    'cbam': 'CBAM', 'eudr': 'EUDR', 'aeo': 'AEO', 'vat': 'VAT',
    'ecommerce': 'E-commerce & UCC', 'chemicals': 'Chemicals',
    'authorisations': 'Authorisations', 'data': 'Customs data'
  };

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function safeUrl(v) {
    var s = String(v || '').trim();
    return /^https?:\/\//i.test(s) ? s : '';
  }
  function topicLabel(slug) {
    return TOPIC_LABELS[slug] || slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
  }
  function shownDate(d) {
    if (d.displayDate) return esc(d.displayDate);
    var m = String(d.date || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return esc(d.date);
    return Number(m[3]) + ' ' + MONTHS[Number(m[2]) - 1] + ' ' + m[1];
  }
  function emptyState(title, text) {
    return '<div class="news-empty"><h2>' + title + '</h2><p>' + text + '</p>' +
      '<a class="btn btn-accent" href="' + LINKEDIN + '" target="_blank" rel="noopener">Read our posts on LinkedIn →</a></div>';
  }

  var news = { docs: [], canEdit: false, db: null, type: '', topic: '' };

  function matches(d) {
    if (news.type && d.category !== news.type) return false;
    if (news.topic && (d.topics || []).indexOf(news.topic) === -1) return false;
    return true;
  }

  function button(label, value, active, kind, count) {
    return '<button type="button" class="filter-btn" data-kind="' + kind + '" data-value="' +
      esc(value) + '" aria-pressed="' + (active ? 'true' : 'false') + '">' + esc(label) +
      (count == null ? '' : '<span class="count">' + count + '</span>') + '</button>';
  }

  function renderFilters(all) {
    if (!typesEl || !topicsEl) return;
    var types = [], topics = {};
    all.forEach(function (d) {
      if (d.category && types.indexOf(d.category) === -1) types.push(d.category);
      (d.topics || []).forEach(function (t) { topics[t] = (topics[t] || 0) + 1; });
    });
    types.sort(function (a, b) {
      var ia = TYPE_ORDER.indexOf(a), ib = TYPE_ORDER.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });

    typesEl.innerHTML = button('All updates', '', !news.type, 'type', all.length) +
      types.map(function (t) {
        var n = all.filter(function (d) { return d.category === t; }).length;
        return button(t, t, news.type === t, 'type', n);
      }).join('');

    var slugs = Object.keys(topics).sort(function (a, b) {
      return topicLabel(a).localeCompare(topicLabel(b));
    });
    topicsEl.innerHTML = button('All topics', '', !news.topic, 'topic', null) +
      slugs.map(function (s) {
        return button(topicLabel(s), s, news.topic === s, 'topic', topics[s]);
      }).join('');
  }

  function renderCards() {
    var shown = news.docs.filter(matches);
    if (!news.docs.length) {
      listEl.innerHTML = emptyState('No updates published yet.',
        'Our latest analyses are available on LinkedIn in the meantime.');
      return;
    }
    if (!shown.length) {
      listEl.innerHTML = '<div class="news-none">No updates match this combination yet.</div>';
      return;
    }
    listEl.innerHTML = shown.map(function (d) {
      var url = safeUrl(d.url);
      return '<article class="news-card">' +
        '<div class="news-meta">' +
          (d.category ? '<span class="news-cat">' + esc(d.category) + '</span>' : '') +
          '<span class="news-date">' + shownDate(d) + '</span>' +
        '</div>' +
        '<h3>' + esc(d.title) + '</h3>' +
        '<p>' + esc(d.summary) + '</p>' +
        '<div class="news-actions">' +
          (url ? '<a class="link-arrow" href="' + esc(url) + '" target="_blank" rel="noopener">Read the full post on LinkedIn <span>→</span></a>' : '') +
          (news.canEdit ? '<button class="news-delete" data-del="' + esc(d.id) + '" type="button">Remove</button>' : '') +
        '</div>' +
      '</article>';
    }).join('');
  }

  function renderNews() {
    renderFilters(news.docs);
    renderCards();
  }

  function initNews() {
    if (!listEl) return;

    if (typesEl) {
      [typesEl, topicsEl].forEach(function (row) {
        row.addEventListener('click', function (ev) {
          var btn = ev.target.closest && ev.target.closest('.filter-btn');
          if (!btn) return;
          var kind = btn.getAttribute('data-kind'), value = btn.getAttribute('data-value');
          news[kind] = (news[kind] === value) ? '' : value;
          renderNews();
        });
      });
    }

    // Outside claude.ai (e.g. GitHub Pages) the news items come from data/news.json
    if (!window.claude || typeof window.claude.use !== 'function') {
      fetch('data/news.json', { cache: 'no-cache' })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (items) {
          news.docs = (Array.isArray(items) ? items : []).map(function (d, i) {
            return {
              id: d.id || 'n' + i, title: d.title, summary: d.summary, category: d.category,
              date: d.date, displayDate: d.displayDate, url: d.url,
              topics: Array.isArray(d.topics) ? d.topics : []
            };
          }).sort(function (x, y) { return String(y.date || '').localeCompare(String(x.date || '')); });
          renderNews();
        })
        .catch(function () {
          listEl.innerHTML = emptyState('Our updates live on LinkedIn.',
            'Our latest analyses are available on LinkedIn.');
        });
      return;
    }

    window.claude.use('db').then(function (db) {
      if (!db) {
        listEl.innerHTML = emptyState('Our updates live on LinkedIn.',
          'The news overview could not be loaded in this view.');
        return;
      }
      news.db = db;
      db.collection('news').orderBy('date', 'desc').limit(60).onSnapshot(
        function (snap) {
          news.docs = snap.docs.map(function (doc) {
            var d = doc.data() || {};
            return {
              id: doc.id, title: d.title, summary: d.summary, category: d.category,
              date: d.date, displayDate: d.displayDate, url: d.url,
              topics: Array.isArray(d.topics) ? d.topics : []
            };
          });
          renderNews();
        },
        function () {
          listEl.innerHTML = emptyState('Our updates live on LinkedIn.',
            'The news overview is temporarily unavailable.');
        }
      );
    });

    window.claude.use('user').then(function (user) {
      if (!user || !user.canEdit) return;
      return Promise.resolve(user.canEdit()).then(function (can) {
        news.canEdit = !!can;
        if (news.canEdit) {
          if (adminEl) adminEl.hidden = false;
          renderNews();
        }
      });
    }).catch(function () { /* stays read-only */ });

    listEl.addEventListener('click', function (ev) {
      var btn = ev.target.closest && ev.target.closest('[data-del]');
      if (!btn || !news.db) return;
      if (!window.confirm('Remove this item from the news page?')) return;
      news.db.collection('news').doc(btn.getAttribute('data-del')).delete();
    });

    if (newsForm) {
      newsForm.addEventListener('submit', function (ev) {
        ev.preventDefault();
        if (!news.db) return;
        var url = safeUrl(document.getElementById('np-url').value);
        var idMatch = url.match(/(\d{15,25})/);
        var id = idMatch ? 'li-' + idMatch[1] : 'post-' + Date.now();
        var topics = (document.getElementById('np-topics').value || '')
          .split(',').map(function (s) { return s.trim().toLowerCase(); })
          .filter(Boolean);
        if (statusEl) statusEl.textContent = 'Saving…';
        news.db.collection('news').doc(id).set({
          title: document.getElementById('np-title').value.trim(),
          summary: document.getElementById('np-summary').value.trim(),
          category: document.getElementById('np-category').value,
          date: document.getElementById('np-date').value,
          topics: topics,
          url: url
        }).then(function () {
          newsForm.reset();
          if (statusEl) statusEl.textContent = 'Published on the news page.';
        }).catch(function (e) {
          if (statusEl) statusEl.textContent = 'Could not save (' + (e && e.code ? e.code : 'error') + ').';
        });
      });
    }
  }

  initNews();
})();
