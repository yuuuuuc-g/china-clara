/**
 * 判断当前设备是否适合加载 3D 星系门户。
 * 铁律 #4：3D 是增强而非依赖 —— 移动端 / 低配 / 不支持 WebGL 一律降级为普通导航。
 */

let webglCache: boolean | null = null;

function hasWebgl(): boolean {
  if (webglCache !== null) return webglCache;
  try {
    const canvas = document.createElement("canvas");
    webglCache = Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    webglCache = false;
  }
  return webglCache;
}

/** 供 useSyncExternalStore 订阅视口变化。 */
export function subscribeViewport(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

/** 只能在浏览器端调用（依赖 window / navigator）。 */
export function detect3DCapable(): boolean {
  if (typeof window === "undefined") return false;

  // 桌面视口才默认开启 3D。
  if (window.innerWidth < 1024) return false;

  // 已知低内存设备（<= 4GB）降级。
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof memory === "number" && memory > 0 && memory <= 4) return false;

  return hasWebgl();
}
