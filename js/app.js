/* Kartierung Baumschulenweg – map, filter legend and charts */
(function () {
    'use strict';

    // Two layers, each with its own colour AND shape, so identity never relies on colour alone.
    // Colours: validated categorical slots 1 (blue) and 2 (orange), safe for colour-vision deficiency.
    var GROUPS = [
        {
            id: 'sticker',
            label: 'Sticker & Graffiti',
            data: json_StickerundGraffiti_1,
            categoryField: 'Zweck',
            titleField: 'Bezeichnung',
            color: '#2a78d6',
            shape: 'circle'
        },
        {
            id: 'aushang',
            label: 'Aushänge',
            data: json_Aushnge_2,
            categoryField: 'Thematik',
            titleField: null,
            color: '#eb6834',
            shape: 'triangle'
        }
    ];

    var EXPLANATIONS = {
        'Kommerziell': 'Werbung für Produkte, Dienstleistungen oder Marken.',
        'Kunst': 'Künstlerischer Ausdruck, z. B. Street Art.',
        'Politisch': 'Politische Meinung, Protest oder Aktivismus.',
        'Tag': 'Persönliche Signatur von Sprayer:innen (Pseudonym).',
        'Verein/Verband': 'Sticker von Sportvereinen oder Organisationen.',
        'Ankauf/Verkauf': 'Private oder gewerbliche Kauf- und Verkaufsangebote.',
        'Dienstleistung': 'Angebote wie Nachhilfe, Handwerk oder Veranstaltungen.',
        'Sonstige': 'Aushänge, die in keine andere Kategorie passen.',
        'Wohnungssuche': 'Gesuche oder Angebote für Wohnraum.'
    };

    var CONDITION_ORDER = ['Gut', 'Lesbar', 'Schlecht'];

    // ---------- Map ----------
    var map = L.map('map', { zoomControl: false, minZoom: 12, maxZoom: 20 });
    L.control.zoom({ position: 'bottomright', zoomInTitle: 'Hineinzoomen', zoomOutTitle: 'Herauszoomen' }).addTo(map);
    map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');

    L.tileLayer('https://sgx.geodatenzentrum.de/wmts_basemapde/tile/1.0.0/de_basemapde_web_raster_grau/default/GLOBAL_WEBMERCATOR/{z}/{y}/{x}.png', {
        attribution: '<a href="https://basemap.de" target="_blank" rel="noopener">© basemap.de / BKG</a> | Datenquellen: © GeoBasis-DE',
        maxNativeZoom: 18,
        maxZoom: 20
    }).addTo(map);

    // Category visibility state: { groupId: { category: true|false } }
    var visible = {};
    var markers = []; // { group, category, marker }
    var allBounds = L.latLngBounds([]);

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function formatDate(iso) {
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
        return m ? m[3] + '.' + m[2] + '.' + m[1] : (iso || '');
    }

    function photoPath(props) {
        return props.Foto ? 'images/' + String(props.Foto).replace(/[\\/:]/g, '_').trim() : null;
    }

    function popupHtml(group, props) {
        var category = props[group.categoryField] || '–';
        var title = (group.titleField && props[group.titleField]) || category;
        var photo = photoPath(props);
        var html = '<article class="popup-card">';
        if (photo) {
            html += '<a class="popup-photo" href="' + escapeHtml(photo) + '" target="_blank" rel="noopener" title="Foto in voller Größe öffnen">' +
                '<img src="' + escapeHtml(photo) + '" alt="Foto: ' + escapeHtml(title) + '" loading="lazy"></a>';
        }
        html += '<div class="popup-body">';
        html += '<span class="popup-kicker"><span class="swatch swatch-' + group.shape + '" style="--c:' + group.color + '"></span>' + escapeHtml(group.label) + '</span>';
        html += '<h3>' + escapeHtml(title) + '</h3>';
        html += '<span class="popup-badge" title="' + escapeHtml(EXPLANATIONS[category] || '') + '">' + escapeHtml(category) + '</span>';
        if (EXPLANATIONS[category]) {
            html += '<p class="popup-explain">' + escapeHtml(EXPLANATIONS[category]) + '</p>';
        }
        html += '<dl class="popup-facts">';
        if (props.Zustand) html += '<div><dt>Zustand</dt><dd>' + escapeHtml(props.Zustand) + '</dd></div>';
        if (props.Nutzung) html += '<div><dt>Nutzung</dt><dd>' + escapeHtml(props.Nutzung) + '</dd></div>';
        if (props.Datum) html += '<div><dt>Erfasst</dt><dd>' + escapeHtml(formatDate(props.Datum)) + '</dd></div>';
        html += '</dl>';
        if (props.Bemerkung) html += '<p class="popup-note">' + escapeHtml(String(props.Bemerkung).trim()) + '</p>';
        html += '</div></article>';
        return html;
    }

    GROUPS.forEach(function (group) {
        visible[group.id] = {};
        group.layer = L.layerGroup().addTo(map);
        group.data.features.forEach(function (feature) {
            var props = feature.properties || {};
            var category = props[group.categoryField] || 'Ohne Kategorie';
            visible[group.id][category] = true;
            var c = feature.geometry.coordinates;
            var latlng = L.latLng(c[1], c[0]);
            allBounds.extend(latlng);
            var marker = L.shapeMarker(latlng, {
                shape: group.shape,
                radius: group.shape === 'triangle' ? 9 : 7,
                color: '#ffffff',
                weight: 2,
                fillColor: group.color,
                fillOpacity: 1
            });
            marker.bindPopup(popupHtml(group, props), { maxWidth: 300, minWidth: 260, autoPanPadding: [24, 24] });
            marker.bindTooltip(escapeHtml((group.titleField && props[group.titleField]) || category), { direction: 'top', offset: [0, -8] });
            marker.addTo(group.layer);
            markers.push({ group: group, category: category, marker: marker });
        });
    });

    var hash = new L.Hash(map);
    if (!window.location.hash || window.location.hash.length < 4) {
        map.fitBounds(allBounds, { padding: [40, 40] });
    }

    function applyFilters() {
        markers.forEach(function (m) {
            var show = visible[m.group.id][m.category];
            var onMap = m.group.layer.hasLayer(m.marker);
            if (show && !onMap) m.group.layer.addLayer(m.marker);
            if (!show && onMap) m.group.layer.removeLayer(m.marker);
        });
        renderLegend();
        renderStats();
    }

    // ---------- Aggregation ----------
    function countBy(group, field) {
        var counts = {};
        group.data.features.forEach(function (f) {
            var key = (f.properties || {})[field] || 'Ohne Angabe';
            counts[key] = (counts[key] || 0) + 1;
        });
        return counts;
    }

    function sortedEntries(counts) {
        return Object.keys(counts)
            .map(function (k) { return [k, counts[k]]; })
            .sort(function (a, b) { return b[1] - a[1] || a[0].localeCompare(b[0], 'de'); });
    }

    var total = markers.length;
    document.getElementById('total-count').textContent = total;

    // ---------- Legend & filter ----------
    function renderLegend() {
        var el = document.getElementById('tab-legend');
        var html = '';
        GROUPS.forEach(function (group) {
            var counts = sortedEntries(countBy(group, group.categoryField));
            var groupVisible = counts.filter(function (e) { return visible[group.id][e[0]]; }).length;
            var allOn = groupVisible === counts.length;
            html += '<div class="legend-group">';
            html += '<label class="legend-head">' +
                '<input type="checkbox" data-group="' + group.id + '"' + (allOn ? ' checked' : '') + (groupVisible && !allOn ? ' data-mixed="1"' : '') + '>' +
                '<span class="swatch swatch-' + group.shape + '" style="--c:' + group.color + '"></span>' +
                '<span class="legend-title">' + escapeHtml(group.label) + '</span>' +
                '<span class="legend-total">' + group.data.features.length + '</span></label>';
            html += '<ul class="chips">';
            counts.forEach(function (e) {
                var on = visible[group.id][e[0]];
                html += '<li><button type="button" class="chip' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-group="' + group.id + '" data-cat="' + escapeHtml(e[0]) + '" title="' + escapeHtml(EXPLANATIONS[e[0]] || '') + '">' +
                    escapeHtml(e[0]) + ' <span class="chip-count">' + e[1] + '</span></button></li>';
            });
            html += '</ul></div>';
        });
        html += '<p class="hint">Kategorien antippen, um sie ein- oder auszublenden. Punkte öffnen Foto und Beschreibung.</p>';
        el.innerHTML = html;
        el.querySelectorAll('input[data-mixed]').forEach(function (input) { input.indeterminate = true; });
    }

    document.getElementById('tab-legend').addEventListener('click', function (event) {
        var chip = event.target.closest('.chip');
        if (chip) {
            var g = chip.getAttribute('data-group');
            var cat = chip.getAttribute('data-cat');
            visible[g][cat] = !visible[g][cat];
            applyFilters();
        }
    });

    document.getElementById('tab-legend').addEventListener('change', function (event) {
        var input = event.target;
        if (input.matches('input[data-group]')) {
            var g = input.getAttribute('data-group');
            Object.keys(visible[g]).forEach(function (cat) { visible[g][cat] = input.checked; });
            applyFilters();
        }
    });

    // ---------- Charts ----------
    function barChart(title, entries, color, groupId, note) {
        var max = Math.max.apply(null, entries.map(function (e) { return e[1]; }));
        var sum = entries.reduce(function (s, e) { return s + e[1]; }, 0);
        var html = '<figure class="chart">';
        html += '<figcaption><span class="chart-title">' + escapeHtml(title) + '</span>' + (note ? '<span class="chart-note">' + escapeHtml(note) + '</span>' : '') + '</figcaption>';
        html += '<ul class="bars">';
        entries.forEach(function (e) {
            var pct = Math.round((e[1] / sum) * 100);
            var dim = groupId && !visible[groupId][e[0]];
            var tag = groupId ? 'button' : 'div';
            html += '<li><' + tag + (groupId ? ' type="button" data-group="' + groupId + '" data-cat="' + escapeHtml(e[0]) + '"' : '') +
                ' class="bar-row' + (dim ? ' dim' : '') + '" data-tip="' + escapeHtml(e[0] + ': ' + e[1] + ' von ' + sum + ' (' + pct + ' %)') + '">' +
                '<span class="bar-label">' + escapeHtml(e[0]) + '</span>' +
                '<span class="bar-track"><span class="bar" style="width:' + (e[1] / max * 100) + '%;--c:' + color + '"></span></span>' +
                '<span class="bar-value">' + e[1] + '</span></' + tag + '></li>';
        });
        html += '</ul></figure>';
        return html;
    }

    function renderStats() {
        var sticker = GROUPS[0], aushang = GROUPS[1];
        var stickerCounts = sortedEntries(countBy(sticker, 'Zweck'));
        var aushangCounts = sortedEntries(countBy(aushang, 'Thematik'));

        // Condition across both layers, in fixed ordinal order
        var cond = {};
        GROUPS.forEach(function (g) {
            var c = countBy(g, 'Zustand');
            Object.keys(c).forEach(function (k) { cond[k] = (cond[k] || 0) + c[k]; });
        });
        var condEntries = CONDITION_ORDER.filter(function (k) { return cond[k]; }).map(function (k) { return [k, cond[k]]; });

        var top = stickerCounts[0];
        var html = '<div class="stat-tiles">' +
            '<div class="stat"><span class="stat-value">' + total + '</span><span class="stat-label">Funde gesamt</span></div>' +
            '<div class="stat"><span class="stat-value">' + sticker.data.features.length + '</span><span class="stat-label">Sticker &amp; Graffiti</span></div>' +
            '<div class="stat"><span class="stat-value">' + aushang.data.features.length + '</span><span class="stat-label">Aushänge</span></div>' +
            '</div>';
        html += '<p class="insight">Größte Gruppe sind <strong>' + escapeHtml(top[0].toLowerCase() === 'politisch' ? 'politische Sticker' : top[0]) +
            '</strong> mit ' + top[1] + ' von ' + sticker.data.features.length + ' Funden.</p>';
        html += barChart('Sticker & Graffiti nach Zweck', stickerCounts, sticker.color, 'sticker');
        html += barChart('Aushänge nach Thema', aushangCounts, aushang.color, 'aushang');
        html += barChart('Zustand aller Funde', condEntries, '#6b6b74', null, 'ordinal: gut → schlecht');
        html += '<p class="hint">Balken antippen, um die Kategorie auf der Karte ein- oder auszublenden.</p>';
        document.getElementById('tab-stats').innerHTML = html;
    }

    document.getElementById('tab-stats').addEventListener('click', function (event) {
        var row = event.target.closest('button.bar-row');
        if (row) {
            var g = row.getAttribute('data-group');
            var cat = row.getAttribute('data-cat');
            visible[g][cat] = !visible[g][cat];
            applyFilters();
        }
    });

    // Hover tooltip for bars (hit target = whole row)
    var tooltip = document.getElementById('chart-tooltip');
    document.getElementById('tab-stats').addEventListener('pointermove', function (event) {
        var row = event.target.closest('.bar-row');
        if (!row) { tooltip.hidden = true; return; }
        tooltip.textContent = row.getAttribute('data-tip');
        tooltip.hidden = false;
        tooltip.style.left = (event.clientX + 14) + 'px';
        tooltip.style.top = (event.clientY + 14) + 'px';
    });
    document.getElementById('tab-stats').addEventListener('pointerleave', function () { tooltip.hidden = true; });

    // ---------- Tabs & panel ----------
    document.querySelector('.tabs').addEventListener('click', function (event) {
        var tab = event.target.closest('.tab');
        if (!tab) return;
        document.querySelectorAll('.tab').forEach(function (t) {
            var active = t === tab;
            t.classList.toggle('active', active);
            t.setAttribute('aria-selected', active);
            document.getElementById('tab-' + t.getAttribute('data-tab')).hidden = !active;
        });
    });

    var panel = document.getElementById('panel');
    var toggle = document.getElementById('panel-toggle');
    function setCollapsed(collapsed) {
        panel.classList.toggle('collapsed', collapsed);
        toggle.setAttribute('aria-expanded', String(!collapsed));
        toggle.querySelector('.panel-toggle-icon').textContent = collapsed ? '+' : '−';
    }
    toggle.addEventListener('click', function () { setCollapsed(!panel.classList.contains('collapsed')); });
    // Start collapsed on small screens and small embeds
    if (window.innerWidth < 700 || window.innerHeight < 560) setCollapsed(true);

    renderLegend();
    renderStats();
})();
