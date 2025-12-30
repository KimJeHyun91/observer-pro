export const toggleFullscreen = (imgElement: HTMLImageElement, fullScreenStyle: string) => {
  // 현재 fullscreen 요소가 imgElement인 경우
  if (document.fullscreenElement === imgElement) {
    document.exitFullscreen().then(() => {
      imgElement.classList.remove(fullScreenStyle);
    }).catch((err) => {
      console.error("Exit fullscreen error:", err);
    });
  }
  // 현재 fullscreen 요소가 없거나 다른 요소인 경우
  else {
    imgElement.requestFullscreen().then(() => {
      imgElement.classList.add(fullScreenStyle);
    }).catch((err) => {
      console.error("Request fullscreen error:", err);
    });
  }
};