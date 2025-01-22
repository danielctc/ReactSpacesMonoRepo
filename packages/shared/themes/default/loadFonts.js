export function loadFonts() {
    const style = document.createElement('style');
    const fontFace = `
        @font-face {
            font-family: 'Mona Sans';
            src: url('https://cdn.jsdelivr.net/npm/mona-sans@1.0.0/Mona-Sans.woff2') format('woff2'),
                 url('https://cdn.jsdelivr.net/npm/mona-sans@1.0.0/Mona-Sans.woff') format('woff');
            font-weight: 200 900;
            font-stretch: 75% 125%;
        }
    `;
    style.appendChild(document.createTextNode(fontFace));
    document.head.appendChild(style);
}