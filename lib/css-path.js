// css-path.js - minimal unique selector generator (placeholder)

function getCssPath(el) {
  if (!(el instanceof Element)) {return '';}
  const parts = [];
  while (el && el.nodeType === Node.ELEMENT_NODE && el !== document.body) {
    let selector = el.nodeName.toLowerCase();
    if (el.id) {
      selector += `#${el.id}`;
      parts.unshift(selector);
      break;
    } else {
      // add nth-child for uniqueness among siblings
      let sib = el, nth = 1;
      while ((sib = sib.previousElementSibling)) {nth++;}
      selector += `:nth-child(${nth})`;
    }
    parts.unshift(selector);
    el = el.parentElement;
  }
  return parts.join(' > ');
}

// Export to window for global access
if (typeof window !== 'undefined') {
  window.getCssPath = getCssPath;
}