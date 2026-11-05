declare module 'prismjs/components/prism-*.js';
declare module 'prismjs/prism';
declare module 'katex' {
  type KatexOptions = {
    displayMode?: boolean
    throwOnError?: boolean
    strict?: boolean | string
    [key: string]: unknown
  }
  const katex: { renderToString(tex: string, options?: KatexOptions): string }
  export default katex
}
