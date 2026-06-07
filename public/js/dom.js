export function clearChildren(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

export function appendText(parent, text) {
  parent.appendChild(document.createTextNode(String(text ?? '')));
  return parent;
}

export function createElement(tagName, options = {}, children = []) {
  const element = document.createElement(tagName);

  if (options.id) {
    element.id = options.id;
  }

  if (options.className) {
    element.className = options.className;
  }

  if (options.text !== undefined) {
    element.textContent = String(options.text);
  }

  if (options.title) {
    element.title = options.title;
  }

  if (options.type) {
    element.type = options.type;
  }

  if (options.style) {
    element.setAttribute('style', options.style);
  }

  if (options.attributes) {
    Object.entries(options.attributes).forEach(([name, value]) => {
      if (value !== undefined && value !== null) {
        element.setAttribute(name, String(value));
      }
    });
  }

  if (options.dataset) {
    Object.entries(options.dataset).forEach(([name, value]) => {
      if (value !== undefined && value !== null) {
        element.dataset[name] = String(value);
      }
    });
  }

  children.forEach((child) => {
    if (child === undefined || child === null) {
      return;
    }

    if (typeof child === 'string' || typeof child === 'number') {
      appendText(element, child);
      return;
    }

    element.appendChild(child);
  });

  return element;
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return entities[char];
  });
}

export function getSafeHttpUrl(value) {
  if (!value) {
    return '';
  }

  try {
    const url = new URL(String(value));
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.href;
    }
  } catch {
    return '';
  }

  return '';
}
