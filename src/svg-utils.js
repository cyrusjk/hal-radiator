// ═══════════════════════════════════════════════════════════════════════
//  SVG Utilities
//  — DOM element creation helper
//  — Pop all elements on/off
//  — Find min/max extrema in a series
// ═══════════════════════════════════════════════════════════════════════

window.HAL = window.HAL || {};

window.HAL.svg = {

  ns: 'http://www.w3.org/2000/svg',

  // Create an SVG element with attributes
  el: function(tag, attrs) {
    const e = document.createElementNS(window.HAL.svg.ns, tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      e.setAttribute(k, String(v));
    }
    return e;
  },

  // Set opacity on every element in a list (instant pop-in or pop-out)
  popAll: function(elements, show) {
    elements.forEach(function(el) {
      el.style.opacity = show ? '1' : '0';
    });
  },

  // Find the min and max values (and their x/y positions) in a series
  findExtrema: function(values, scaleX, scaleY) {
    var minIdx = 0, maxIdx = 0;
    for (var i = 1; i < values.length; i++) {
      if (values[i] < values[minIdx]) minIdx = i;
      if (values[i] > values[maxIdx]) maxIdx = i;
    }
    return {
      min: { value: values[minIdx], x: scaleX(minIdx), y: scaleY(values[minIdx]) },
      max: { value: values[maxIdx], x: scaleX(maxIdx), y: scaleY(values[maxIdx]) },
    };
  },

};
