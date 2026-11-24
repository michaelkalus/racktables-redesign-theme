// RackTables Redesign Theme - enhanced layer (optional, no dependencies).
// Everything here is a convenience on top of the CSS-only core; without JS
// RackTables keeps its original behaviour.
//  - search field moved into the header, "/" focuses it
//  - active header link, "/" breadcrumb separators, version in the footer
//  - table density switch (Compact / Default / Comfortable), remembered
//  - copy button next to IP and MAC addresses
//  - legend under the rack diagram
(function () {
	'use strict';

	var DENSITY_KEY = 'rt-redesign-density';

	function store (key, value) {
		try {
			if (value === undefined) return window.localStorage.getItem (key);
			window.localStorage.setItem (key, value);
		} catch (e) { return null; }
		return null;
	}

	// page class on <html> as early as possible (used by page specific CSS)
	(function () {
		var m = /[?&]page=([a-z0-9_]+)/i.exec (location.search);
		document.documentElement.className += ' rt-page-' + (m ? m[1] : 'index');
	}) ();

	// apply density as early as possible to avoid a jump
	var savedDensity = store (DENSITY_KEY);
	if (savedDensity === 'default' || savedDensity === 'comfortable')
		document.documentElement.className += ' rt-density-' + savedDensity;

	function qs (sel, root) { return (root || document).querySelector (sel); }
	function qsa (sel, root) { return Array.prototype.slice.call ((root || document).querySelectorAll (sel)); }
	function el (tag, attrs, text) {
		var e = document.createElement (tag);
		if (attrs) for (var k in attrs) e.setAttribute (k, attrs[k]);
		if (text !== undefined) e.textContent = text;
		return e;
	}
	function param (url, name) {
		var m = new RegExp ('[?&]' + name + '=([^&#]*)').exec (url);
		return m ? decodeURIComponent (m[1]) : null;
	}

	function moveSearch () {
		var header = qs ('.mainheader');
		var box = qs ('.menubar .searchbox');
		if (!header || !box) return;
		var input = qs ('input[name=q]', box);
		var form = qs ('form', box);
		if (!input || !form) return;
		var slot = el ('div', { 'class': 'rt-search' });
		input.setAttribute ('placeholder', 'Search');
		input.setAttribute ('aria-label', 'Search');
		// keep the hidden fields, drop the "Search:" label text
		var label = input.parentNode;
		form.appendChild (input);
		if (label && label.tagName === 'LABEL') label.parentNode.removeChild (label);
		slot.appendChild (form);
		form.appendChild (el ('kbd', { 'aria-hidden': 'true' }, '/'));
		var greeting = qs ('.greeting', header);
		header.insertBefore (slot, greeting || null);
		box.parentNode.removeChild (box);

		document.addEventListener ('keydown', function (ev) {
			if (ev.key !== '/' || ev.ctrlKey || ev.metaKey || ev.altKey) return;
			var t = ev.target;
			var tag = t && t.tagName;
			if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
			ev.preventDefault ();
			input.focus ();
			input.select ();
		});
	}

	function markActiveLink () {
		var page = param (location.search, 'page');
		if (!page) return;
		// breadcrumb second item tells which section we are in
		var crumbs = qsa ('.menubar > a');
		var section = crumbs.length > 1 ? param (crumbs[1].getAttribute ('href') || '', 'page') : page;
		qsa ('ul.qlinks a').forEach (function (a) {
			var p = param (a.getAttribute ('href') || '', 'page');
			if (p && (p === page || p === section)) a.className += ' rt-active';
		});
	}

	function crumbSeparators () {
		var bar = qs ('.menubar');
		if (!bar) return;
		Array.prototype.slice.call (bar.childNodes).forEach (function (n) {
			if (n.nodeType === 3 && /^\s*:\s*$/.test (n.nodeValue)) {
				var s = el ('span', { 'class': 'rt-crumb-sep', 'aria-hidden': 'true' }, '/');
				bar.replaceChild (s, n);
			}
		});
	}

	function footer () {
		var v = qs ('.mainheader > a[href*="racktables.org"]');
		var main = qs ('.maintable');
		if (!v || !main) return;
		var f = el ('div', { 'class': 'rt-footer' });
		f.appendChild (document.createTextNode ('RackTables '));
		v.parentNode.removeChild (v);
		f.appendChild (v);
		main.appendChild (f);
	}

	function densitySwitch () {
		// only on pages with a long list
		var tables = qsa ('.pagebar table.widetable, .pagebar table.cooltable, .pagebar table.zebra');
		var big = null;
		tables.forEach (function (t) { if (!big && t.rows && t.rows.length > 15) big = t; });
		if (!big) return;
		var current = savedDensity === 'default' || savedDensity === 'comfortable' ? savedDensity : 'compact';
		var tools = el ('div', { 'class': 'rt-tools' });
		var seg = el ('div', { 'class': 'rt-seg', role: 'group', 'aria-label': 'Table density' });
		[['compact', 'Compact'], ['default', 'Default'], ['comfortable', 'Comfortable']].forEach (function (o) {
			var b = el ('button', { type: 'button', 'aria-pressed': String (o[0] === current) }, o[1]);
			b.addEventListener ('click', function () {
				var root = document.documentElement;
				root.className = root.className.replace (/\s*rt-density-\w+/g, '');
				if (o[0] !== 'compact') root.className += ' rt-density-' + o[0];
				store (DENSITY_KEY, o[0]);
				qsa ('button', seg).forEach (function (x) { x.setAttribute ('aria-pressed', String (x === b)); });
			});
			seg.appendChild (b);
		});
		tools.appendChild (seg);
		var host = big.parentNode;
		host.insertBefore (tools, big);
	}

	var IP_RE = /^\s*(\d{1,3}(\.\d{1,3}){3}|[0-9a-f]{0,4}(:[0-9a-f]{0,4}){2,7})(\/\d{1,3})?\s*$/i;
	var MAC_RE = /^\s*([0-9a-f]{2}[:-]){5}[0-9a-f]{2}\s*$/i;

	function copyText (text, btn) {
		function done () {
			btn.className += ' rt-done';
			setTimeout (function () { btn.className = btn.className.replace (/\s*rt-done/g, ''); }, 1200);
		}
		if (navigator.clipboard && window.isSecureContext) {
			navigator.clipboard.writeText (text).then (done, function () {});
			return;
		}
		var ta = el ('textarea');
		ta.value = text;
		ta.style.position = 'fixed';
		ta.style.opacity = '0';
		document.body.appendChild (ta);
		ta.select ();
		try { document.execCommand ('copy'); done (); } catch (e) {}
		document.body.removeChild (ta);
	}

	function copyButtons () {
		var cells = qsa ('.pagebar td');
		var n = 0;
		cells.forEach (function (td) {
			if (n > 600) return;
			var target = null;
			if (td.children.length === 1 && td.children[0].tagName === 'A' && IP_RE.test (td.children[0].textContent))
				target = td.children[0];
			else if (td.children.length === 0 && (MAC_RE.test (td.textContent) || (td.className.indexOf ('l2address') >= 0 && td.textContent.trim ())))
				target = td;
			if (!target) return;
			var text = target.textContent.trim ();
			if (!text) return;
			var b = el ('button', { type: 'button', 'class': 'rt-copy', title: 'Copy ' + text, 'aria-label': 'Copy ' + text });
			b.addEventListener ('click', function (ev) { ev.preventDefault (); ev.stopPropagation (); copyText (text, b); });
			td.appendChild (b);
			n++;
		});
	}

	function rackLegend () {
		var rack = qs ('.pagebar table.rack');
		if (!rack || qs ('.rt-legend')) return;
		var items = [
			['Free', '#fff', '#CBD2DB'],
			['Absent (reserved)', 'repeating-linear-gradient(135deg,#fff 0 3px,#94A3B8 3px 4px)', '#94A3B8'],
			['Unusable', 'repeating-linear-gradient(45deg,#FEE2E2 0 3px,#B91C1C 3px 4px)', '#B91C1C'],
			['Passive (panels)', '#F1F5F9', '#CBD5E1'],
			['Network (switch, router)', '#DBEAFE', '#93C5FD'],
			['Optical (ODF)', '#EDE9FE', '#C4B5FD'],
			['Server', '#DCFCE7', '#86EFAC'],
			['Firewall', '#FEF9C3', '#FACC15'],
			['Power (UPS, PDU)', '#FFEDD5', '#FDBA74'],
			['Selected object', '#2563EB', '#1D4ED8']
		];
		var box = el ('div', { 'class': 'rt-legend', 'aria-label': 'Rack legend' });
		items.forEach (function (it) {
			var s = el ('span');
			var i = el ('i');
			i.style.background = it[1];
			i.style.borderColor = it[2];
			s.appendChild (i);
			s.appendChild (document.createTextNode (it[0]));
			box.appendChild (s);
		});
		var portlet = rack.parentNode;
		while (portlet && portlet.className !== 'portlet' && portlet !== document.body) portlet = portlet.parentNode;
		var host = portlet && portlet.className === 'portlet' ? portlet : rack.parentNode;
		host.appendChild (box);
	}

	// RackTables draws "% used" as a bitmap (module=progressbar&done=N); draw a token colored bar instead
	function progressBars () {
		qsa ('img[src*="module=progressbar"]').forEach (function (img) {
			var src = img.getAttribute ('src') || '';
			// progressbar: done=N; progressbar4 (networks): px1 used, px2 free, px3 reserved
			var parts = [];
			if (src.indexOf ('module=progressbar4') >= 0)
				parts = [[parseInt (param (src, 'px1'), 10), ''], [parseInt (param (src, 'px3'), 10), 'rt-bar-rsv']];
			else
				parts = [[parseInt (param (src, 'done'), 10), '']];
			if (isNaN (parts[0][0])) return;
			var title = img.getAttribute ('title') || (parts[0][0] + '%');
			var bar = el ('span', { 'class': 'rt-bar', role: 'img', 'aria-label': title, title: title });
			parts.forEach (function (p) {
				if (isNaN (p[0]) || p[0] <= 0) return;
				var fill = el ('i', p[1] ? { 'class': p[1] } : null);
				fill.style.width = Math.min (100, p[0]) + '%';
				bar.appendChild (fill);
			});
			img.parentNode.replaceChild (bar, img);
		});
	}

	function init () {
		[progressBars, moveSearch, markActiveLink, crumbSeparators, footer, densitySwitch, copyButtons, rackLegend].forEach (function (f) {
			try { f (); } catch (e) { if (window.console) console.warn ('redesigntheme:', f.name, e); }
		});
	}

	if (document.readyState === 'loading')
		document.addEventListener ('DOMContentLoaded', init);
	else
		init ();
}) ();
