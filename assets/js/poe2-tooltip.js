// POE2 inline tooltips — loads data from window.POE2_DATA_* globals
// @author 看雲起雲落
// Scripts in assets/js/data/*.js must be loaded before this file.

(function() {
  'use strict';

  var tooltipEl = null;
  var currentTarget = null;

  var GEM_COLORS = {
    gem_red:    { text: '#E08060', border: '#B05030' },
    gem_green:  { text: '#70C080', border: '#40A050' },
    gem_blue:   { text: '#70A8D0', border: '#4080B0' },
    gemitem:    { text: '#F0D060', border: '#8B6B2F' },
  };

  function getData(type, key) {
    var map;
    if (type === 'unique') {
      map = window.POE2_DATA_UNIQUE || [];
    } else if (type === 'support') {
      map = window.POE2_DATA_SUPPORT || [];
    } else if (type === 'spirit') {
      map = window.POE2_DATA_SPIRIT || [];
    } else if (type === 'lineage') {
      map = window.POE2_DATA_LINEAGE || [];
    } else {
      map = window.POE2_DATA_SKILL || [];
    }
    // Build a lookup by name_en (cache it)
    if (!map._lookup) {
      map._lookup = {};
      for (var i = 0; i < map.length; i++) {
        var item = map[i];
        if (item.name_en) {
          map._lookup[item.name_en] = item;
          if (item.slug && item.slug !== item.name_en) map._lookup[item.slug] = item;
        }
      }
    }
    var result = map._lookup[key] || null;
    // Fallback: if searching skill, also check support
    if (!result && type !== 'support' && type !== 'unique') {
      var supMap = window.POE2_DATA_SUPPORT || [];
      if (!supMap._lookup) {
        supMap._lookup = {};
        for (var j = 0; j < supMap.length; j++) {
          var sj = supMap[j];
          if (sj.name_en) supMap._lookup[sj.name_en] = sj;
        }
      }
      result = supMap._lookup[key] || null;
    }
    return result;
  }

  function escHtml(s) {
    if (!s) return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function highlightNums(s) {
    if (!s) return '';
    return s.replace(/(\d+[\d%().,—–-]*)/g, '<span class="pti-num">$1</span>');
  }

  function buildTooltipHTML(type, data) {
    var parts = [];
    var gc = data.gem_class || 'gemitem';
    var titleClass = 'ptt-gem-' + gc;

    parts.push('<div class="ptt-header">');
    var iconLocal = data.icon_local || '';
    if (iconLocal) {
      var iconSrc = iconLocal.indexOf('http') === 0 ? iconLocal : '../../assets/' + iconLocal;
      parts.push('<img class="ptt-icon" src="' + iconSrc + '" alt="" onerror="this.style.display=\'none\'">');
    }
    parts.push('<div class="ptt-title ' + titleClass + '">' + (data.name_cn || '') + ' <span class="ptt-en">' + data.name_en + '</span></div>');
    if (data.type_line) {
      parts.push('<div class="ptt-type">' + data.type_line + '</div>');
    }
    parts.push('</div>');

    if (data.tags && data.tags.length) {
      parts.push('<div class="ptt-tags">' + data.tags.join(' · ') + '</div>');
    }

    var desc = data.secDescrText || data.description || '';
    if (desc) {
      parts.push('<div class="ptt-desc">' + escHtml(desc) + '</div>');
    }

    var il = [];
    var explicitMods = data.explicitMod || data.explicit_mod || [];
    if (explicitMods.length) {
      il.push('<div class="ptt-subhead">技能词缀</div>');
      explicitMods.forEach(function(m) {
        if (m) il.push('<div class="pti-line">' + highlightNums(escHtml(m)) + '</div>');
      });
    }

    var uniqueExplicit = data.explicit_mods || [];
    if (type === 'unique' && uniqueExplicit.length) {
      if (!il.length) il.push('<div class="ptt-subhead">词缀</div>');
      uniqueExplicit.forEach(function(m) {
        if (m) il.push('<div class="ptt-mod ptt-explicit">' + highlightNums(escHtml(m)) + '</div>');
      });
    }
    if (il.length) {
      parts.push('<div class="ptt-info">' + il.join('') + '</div>');
    }

    var qualityMods = data.qualityMod || data.quality_mod || [];
    if (qualityMods.length) {
      var qp = ['<div class="ptt-quality">'];
      qp.push('<div class="ptt-subhead">品质额外效果</div>');
      qualityMods.forEach(function(q) {
        if (q) qp.push('<div class="pti-line">✦ ' + highlightNums(escHtml(q)) + '</div>');
      });
      qp.push('</div>');
      parts.push(qp.join(''));
    }

    var titleColor = GEM_COLORS[gc] ? GEM_COLORS[gc].text : '#F0D060';
    var sl = [];

    function addStat(label, val) {
      if (val) sl.push('<div class="pti-line-white"><span class="pti-label" style="color:' + titleColor + '">' + label + '</span> ' + val + '</div>');
    }

    addStat('攻击伤害', data.attack_damage);
    addStat('攻击速度', data.attack_speed);
    addStat('施放间隔', data.cast_time);
    if (data.cost) {
      addStat('消耗', data.cost);
    } else if (data.stats_text) {
      var rM = data.stats_text.match(/保留[：:]\s*([^\n\r]+)/);
      if (rM) addStat('保留', rM[1].trim());
    }
    addStat('冷却时间', data.cooldown_time);
    addStat('投射物速度', data.projectile_speed);

    if (sl.length) {
      parts.push('<div class="ptt-stats-block">' + sl.join('') + '</div>');
    }

    if (data.requirements) {
      parts.push('<div class="ptt-requirement">' + escHtml(data.requirements) + '</div>');
    }

    if (type === 'unique' && data.grants_skill) {
      parts.push('<div class="ptt-grants">' + data.grants_skill + '</div>');
    }

    var implicitMods = data.implicit_mods || [];
    if (type === 'unique' && implicitMods.length) {
      implicitMods.forEach(function(m) {
        if (m) parts.push('<div class="ptt-mod ptt-implicit">' + highlightNums(escHtml(m)) + '</div>');
      });
    }

    return parts.join('\n');
  }

  function showTooltip(e, type, key) {
    hideTooltip();
    var data = getData(type, key);
    if (!data) return;
    var el = e.currentTarget;
    currentTarget = el;
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'poe2-tt-popup';
    var gc = data.gem_class || 'gemitem';
    var gemColor = GEM_COLORS[gc] || GEM_COLORS.gemitem;
    tooltipEl.style.borderColor = gemColor.border;
    tooltipEl.innerHTML = buildTooltipHTML(type, data);
    document.body.appendChild(tooltipEl);
    positionTooltip(e, el);
  }

  function positionTooltip(e, el) {
    if (!tooltipEl) return;
    var rect = el.getBoundingClientRect();
    var tipRect = tooltipEl.getBoundingClientRect();
    var left = rect.left;
    var top = rect.bottom + 6;
    if (top + tipRect.height > window.innerHeight - 10) {
      top = rect.top - tipRect.height - 6;
    }
    if (left + tipRect.width > window.innerWidth - 10) {
      left = window.innerWidth - tipRect.width - 10;
    }
    if (left < 4) left = 4;
    tooltipEl.style.left = left + 'px';
    tooltipEl.style.top = top + 'px';
  }

  function hideTooltip() {
    if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; }
    currentTarget = null;
  }

  function init() {
    var elements = document.querySelectorAll('.poe2-tt');
    elements.forEach(function(el) {
      var type = el.getAttribute('data-tt-type');
      var key = el.getAttribute('data-tt-key');
      if (!type || !key) return;
      el.addEventListener('mouseenter', function(e) { showTooltip(e, type, key); });
      el.addEventListener('mouseleave', function() { hideTooltip(); });
      el.addEventListener('click', function(e) {
        e.stopPropagation();
        var d = getData(type, key);
        if (d && d.detail_url) {
          window.open(d.detail_url, '_blank');
        }
      });
      el.style.cursor = 'pointer';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();