export const escape = (text: unknown) =>
    String(text).replace(
        /[&<>"']/g,
        (char) =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? '',
    );
export const label = (text: string, kind = 'p') => `<${kind} data-paint>${escape(text)}</${kind}>`;
export const button = (text: string, action: string, disabled = false) =>
    `<button data-paint data-online="${escape(action)}" data-tone="${/^(confirm|start|guest|create|join|discard|rematch)/.test(action) ? 'honey' : /^(cancel|reject|withdraw)/.test(action) ? 'coral' : 'turquoise'}" ${disabled ? 'disabled' : ''}>${escape(text)}</button>`;
export const input = (
    title: string,
    key: string,
    value: string | number,
    type = 'text',
    max = '80',
) =>
    `<label>${label(title, 'span')}<input data-paint aria-label="${escape(title)}" data-draft="${key}" autocomplete="${key === 'name' ? 'nickname' : 'off'}" ${key === 'code' ? 'inputmode="numeric" pattern="[0-9]{5}" enterkeyhint="go"' : ''} value="${escape(value)}" type="${type}" ${type === 'number' ? `min="0" max="${escape(max === '80' ? '999' : max)}" step="1"` : `maxlength="${max}"`}></label>`;
