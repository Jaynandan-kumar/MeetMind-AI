// Utility to calculate pixel coordinates of a caret / text position inside an input or textarea
export function getCaretCoordinates(element, position) {
    if (!element || typeof window === 'undefined') {
        return { top: 0, left: 0 };
    }

    const isInput = element.nodeName === 'INPUT';
    const div = document.createElement('div');
    const style = window.getComputedStyle(element);

    const properties = [
        'direction', 'boxSizing', 'width', 'height', 'overflowX', 'overflowY',
        'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
        'borderStyle',
        'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
        'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize',
        'fontSizeAdjust', 'lineHeight', 'fontFamily', 'textAlign', 'textTransform',
        'textIndent', 'textDecoration', 'letterSpacing', 'wordSpacing', 'tabSize'
    ];

    properties.forEach(prop => {
        div.style[prop] = style[prop];
    });

    const rect = element.getBoundingClientRect();
    div.style.position = 'fixed';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = isInput ? 'pre' : 'pre-wrap';
    div.style.wordWrap = 'break-word';
    div.style.width = `${rect.width}px`;
    div.style.top = '0px';
    div.style.left = '-9999px';

    document.body.appendChild(div);

    div.textContent = element.value.substring(0, position);

    const span = document.createElement('span');
    span.textContent = element.value.substring(position) || '.';
    div.appendChild(span);

    const spanOffsetTop = span.offsetTop;
    const spanOffsetLeft = span.offsetLeft;
    const spanHeight = span.offsetHeight || 20;

    document.body.removeChild(div);

    const rawTop = rect.top + spanOffsetTop - element.scrollTop + spanHeight + 4;
    const rawLeft = rect.left + spanOffsetLeft - element.scrollLeft;

    // Flip above if near bottom of screen
    const popoverHeight = 170;
    const popoverWidth = 230;
    const top = rawTop + popoverHeight > window.innerHeight
        ? Math.max(12, rect.top + spanOffsetTop - element.scrollTop - popoverHeight - 6)
        : rawTop;
    const left = Math.max(12, Math.min(window.innerWidth - popoverWidth - 16, rawLeft));

    return { top, left };
}
