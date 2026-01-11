/// <reference types="vite/client" />

// Allow importing .ans files as raw text
declare module '*.ans?raw' {
  const content: string;
  export default content;
}

declare module '*.ans' {
  const content: string;
  export default content;
}
