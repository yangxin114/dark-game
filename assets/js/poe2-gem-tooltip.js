/**
 * POE2 宝石详情气泡提示 — 技能/辅助/光环/血统，三语言 support
 * @author 看雲起雲落
 *
 * 通过 <script> 加载 assets/js/data/*.js 数据文件（兼容 file:// 协议）
 *
 * 用法：
 *   <span class="p2tt" data-type="skill" data-key="Charged_Staff">充能长杖</span>
 *   <span class="p2tt" data-type="support" data-key="Culmination_II">登峰造极 II</span>
 *
 * data-type: skill | support | spirit | lineage | unique
 * data-key:  宝石 slug 或 name_en
 * data-lang: cn | en | tw（默认 cn）
 */

(function() {
  'use strict';

  var JS_PATH = '../../assets/js/data/';
  var JS_FILES = {
    skill:   { cn: 'skill_gems_zh-cn.js',   en: 'skill_gems_en.js',    tw: 'skill_gems_zh-tw.js' },
    support: { cn: 'support_gems_zh-cn.js', en: 'support_gems_en.js',  tw: 'support_gems_zh-tw.js' },
    spirit:  { cn: 'spirit_gems_zh-cn.js',  en: 'spirit_gems_en.js',   tw: 'spirit_gems_zh-tw.js' },
    lineage: { cn: 'lineage_supports_zh-cn.js', en: 'lineage_supports_en.js', tw: 'lineage_supports_zh-tw.js' },
    unique:  { cn: 'unique_items_zh-cn.js', en: 'unique_items_en.js',  tw: 'unique_items_zh-tw.js' },
  };

  // Global → cache key mapping
  var GLOBAL_NAMES = {
    skill:   'POE2_DATA_SKILL',
    support: 'POE2_DATA_SUPPORT',
    spirit:  'POE2_DATA_SPIRIT',
    lineage: 'POE2_DATA_LINEAGE',
    unique:  'POE2_DATA_UNIQUE',
  };

  var cache = {};       // cache[type][lang] = array
  var lookupCache = {};
  var loading = {};     // loading[type_lang] = Promise

  var GEM_COLORS = {
    gem_red:   { text: '#E08060', border: '#B05030' },
    gem_green: { text: '#70C080', border: '#40A050' },
    gem_blue:  { text: '#70A8D0', border: '#4080B0' },
    gemitem:   { text: '#F0D060', border: '#8B6B2F' },
  };

  function getColor(gc) { return GEM_COLORS[gc] || GEM_COLORS.gemitem; }

  function escHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function highlightNums(s) {
    if (!s) return '';
    return String(s).replace(/(\d+[\d%().,—–\-]*)/g, '<span class="pti-num">$1</span>');
  }

  function loadByScript(type, lang) {
    var key = type + '_' + lang;
    if (loading[key]) return loading[key];
    loading[key] = new Promise(function(resolve, reject) {
      var filename = JS_FILES[type];
      if (!filename) { reject('Unknown type: ' + type); return; }
      var url = JS_PATH + (filename[lang] || filename.cn);
      var globalName = GLOBAL_NAMES[type];

      var script = document.createElement('script');
      script.src = url;
      script.onload = function() {
        var data = window[globalName];
        if (data) {
          if (!cache[type]) cache[type] = {};
          cache[type][lang] = data;
          resolve(data);
        } else {
          reject('Global ' + globalName + ' not found after loading ' + url);
        }
      };
      script.onerror = function() { reject('Failed to load: ' + url); };
      document.head.appendChild(script);
    });
    return loading[key];
  }

  function findGem(type, lang, key) {
    var clKey = type + '_' + lang;
    if (!lookupCache[clKey]) lookupCache[clKey] = {};
    var map = lookupCache[clKey];
    if (map[key]) return map[key];
    var data = cache[type] && cache[type][lang];
    if (!data) return null;
    for (var i = 0; i < data.length; i++) {
      var item = data[i];
      map[item.slug] = item;
      if (item.name_en) map[item.name_en] = item;
    }
    return map[key] || null;
  }

  function getNameField(data, lang) {
    if (lang === 'en') return data.name_en || '';
    if (lang === 'tw') return data.name_tw || data.name_cn || '';
    return data.name_cn || data.name_en || '';
  }

  function buildTooltipHTML(data, lang) {
    lang = lang || 'cn';
    var parts = [];
    var gc = data.gem_class || 'gemitem';
    var colors = getColor(gc);
    var titleColor = colors.text;
    var name = escHtml(getNameField(data, lang));
    var enName = escHtml(data.name_en || '');
    var iconLocal = data.icon_local || '';

    parts.push('<div class="ptt-header">');
    if (iconLocal) {
      var iconSrc = iconLocal.indexOf('http') === 0 ? iconLocal : '../../assets/' + iconLocal;
      parts.push('<img class="ptt-icon" src="' + iconSrc + '" alt="" onerror="this.style.display=\'none\'">');
    }
    parts.push('<div class="ptt-title ptt-gem-' + gc + '">' + name);
    if (enName && lang !== 'en') parts.push(' <span class="ptt-en">' + enName + '</span>');
    parts.push('</div>');
    if (data.tier) parts.push('<span style="font-size:12px;color:#888;margin-left:auto;">T' + escHtml(data.tier) + '</span>');
    parts.push('</div>');

    if (data.tags && data.tags.length) {
      parts.push('<div class="ptt-tags">' + data.tags.join(' · ') + '</div>');
    }

    var desc = data.secDescrText || data.description || '';
    if (desc) {
      parts.push('<div class="ptt-desc">' + escHtml(desc) + '</div>');
    }

    var il = [];
    var mods = data.explicitMod || data.explicit_mod || [];
    if (mods.length) {
      il.push('<div class="ptt-subhead">词缀效果</div>');
      mods.forEach(function(m) { if (m) il.push('<div class="pti-line">' + highlightNums(escHtml(m)) + '</div>'); });
    }

    var sl = [];
    function addStat(label, val) {
      if (val) sl.push('<div class="pti-line-white"><span class="pti-label" style="color:' + titleColor + '">' + label + '</span> ' + escHtml(val) + '</div>');
    }
    addStat('攻击伤害', data.attack_damage);
    addStat('攻击速度', data.attack_speed);
    addStat('施放间隔', data.cast_time);
    if (data.cost) addStat('消耗', data.cost);
    else if (data.stats_text) {
      var rM = data.stats_text.match(/保留[：:]\s*([^\n\r]+)/);
      if (rM) addStat('保留', rM[1].trim());
    }
    addStat('冷却时间', data.cooldown_time);
    addStat('投射物速度', data.projectile_speed);

    var qMods = data.qualityMod || data.quality_mod || [];
    if (qMods.length) {
      sl.push('<div style="margin-top:8px;border-top:1px solid rgba(255,255,255,0.06);padding-top:6px;"><div class="ptt-subhead">品质额外效果</div>');
      qMods.forEach(function(q) { if (q) sl.push('<div class="pti-line">' + highlightNums(escHtml(q)) + '</div>'); });
      sl.push('</div>');
    }

    if (sl.length) {
      il.push('<div class="ptt-stats-block">' + sl.join('') + '</div>');
    }
    if (il.length) {
      parts.push('<div class="ptt-info">' + il.join('') + '</div>');
    }

    if (data.requirements) {
      parts.push('<div class="ptt-requirement">' + escHtml(data.requirements) + '</div>');
    }

    return parts.join('\n');
  }

  // ── Tooltip DOM ──
  var tooltipEl = null;

  function position(e, el) {
    if (!tooltipEl) return;
    var rect = el.getBoundingClientRect();
    var tipRect = tooltipEl.getBoundingClientRect();
    var left = rect.left;
    var top = rect.bottom + 8;
    if (top + tipRect.height > window.innerHeight - 10) {
      top = rect.top - tipRect.height - 8;
    }
    if (left + tipRect.width > window.innerWidth - 10) {
      left = window.innerWidth - tipRect.width - 10;
    }
    if (left < 4) left = 4;
    tooltipEl.style.left = left + 'px';
    tooltipEl.style.top = top + 'px';
  }

  function show(e, el, type, key, lang) {
    hide();
    var found = findGem(type, lang, key);
    if (!found) return;
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'poe2-tt-popup';
    var gc = found.gem_class || 'gemitem';
    tooltipEl.style.borderColor = getColor(gc).border;
    tooltipEl.innerHTML = buildTooltipHTML(found, lang);
    document.body.appendChild(tooltipEl);
    position(e, el);
  }

  function hide() {
    if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; }
  }

  function addInlineIcon(el, iconLocal) {
    if (!iconLocal) return;
    var iconSrc = iconLocal.indexOf('http') === 0 ? iconLocal : '../../assets/' + iconLocal;
    var img = document.createElement('img');
    img.src = iconSrc;
    img.alt = '';
    img.style.cssText = 'display:inline-block;width:18px;height:18px;border-radius:3px;margin-right:3px;vertical-align:-3px;object-fit:cover;';
    img.onerror = function() { this.style.display='none'; };
    el.insertBefore(img, el.firstChild);
  }

  function loadIcon(type, lang, key, el) {
    // Try from cache first, then load script
    var found = findGem(type, lang, key);
    if (found && found.icon_local) {
      addInlineIcon(el, found.icon_local);
      return;
    }
    loadByScript(type, lang).then(function() {
      var d = findGem(type, lang, key);
      if (d && d.icon_local) addInlineIcon(el, d.icon_local);
    }).catch(function() {});
  }

  function init() {
    document.querySelectorAll('.p2tt').forEach(function(el) {
      var type = el.getAttribute('data-type');
      var key = el.getAttribute('data-key');
      var lang = el.getAttribute('data-lang') || 'cn';
      if (!type || !key) return;

      // Load icon on first hover (or preload immediately)
      loadIcon(type, lang, key, el);
      var type = el.getAttribute('data-type');
      var key = el.getAttribute('data-key');
      var lang = el.getAttribute('data-lang') || 'cn';
      if (!type || !key) return;

      el.addEventListener('mouseenter', function(e) {
        if (cache[type] && cache[type][lang]) {
          show(e, el, type, key, lang);
        } else {
          loadByScript(type, lang).then(function() {
            show(e, el, type, key, lang);
          }).catch(function(err) { console.warn('[p2tt]', err); });
        }
      });
      el.addEventListener('mousemove', function(e) { position(e, el); });
      el.addEventListener('mouseleave', function() { hide(); });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();