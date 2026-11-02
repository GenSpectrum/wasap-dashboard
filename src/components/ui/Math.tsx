import 'katex/dist/katex.min.css';
import katex from 'katex';
import { useMemo } from 'react';

/**
 * Renders a TeX expression with KaTeX. Only for static, developer-written TeX: the HTML is injected as-is.
 */
export function InlineMath({ math }: { math: string }) {
    const html = useMemo(() => katex.renderToString(math, { displayMode: false }), [math]);
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export function BlockMath({ math }: { math: string }) {
    const html = useMemo(() => katex.renderToString(math, { displayMode: true }), [math]);
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
