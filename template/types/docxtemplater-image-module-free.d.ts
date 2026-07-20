/**
 * No @types package exists for this library (checked npm — 404). Minimal
 * shape covering only what this project actually calls.
 */
declare module 'docxtemplater-image-module-free' {
  interface ImageModuleOptions {
    getImage: (tagValue: unknown, tagName: string) => unknown;
    getSize: (img: unknown, tagValue: unknown, tagName: string) => [number, number];
  }

  export default class ImageModule {
    constructor(options: ImageModuleOptions);
  }
}
