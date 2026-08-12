import '@babylonjs/core/Engines/ICanvas';

declare module '@babylonjs/core/Engines/ICanvas' {
  interface ICanvasRenderingContext {
    textAlign: CanvasTextAlign;
    textBaseline: CanvasTextBaseline;
  }
}
