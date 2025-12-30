// eslint-disable-next-line import/no-unresolved, import/named
import { Rect, Canvas, FabricImage, StaticCanvas } from 'fabric';
import { mapCanvas } from './CanvasFabric';

class MiniMapCanvasImpl implements mapCanvas {
  private canvas: StaticCanvas;
  private viewportRect?: Rect;

  constructor(
    private mainCanvas: Canvas,
    private imageURL: string,
    private width: number = 200,
    private height: number = 150
  ) {

    // 미니맵 캔버스 초기화
    this.canvas = new StaticCanvas('miniMapCanvas', {
      width,
      height
    });

    // 미니맵 업데이트
    this.updateMiniMap();
  }

  /**
@param mainCanvas: mainCanvas
@param imageURL: backgroundImageURL
@param width: canvas width size
@param height: canvas height size
*/
  static async createMiniCanvas(
    mainCanvas: Canvas,
    imageURL: string,
    width: number,
    height: number,
  ) {
    const canvas = new MiniMapCanvasImpl(mainCanvas, imageURL, width, height)
    await canvas.setBackgroundImage(canvas.canvas, imageURL);
    return canvas;
  }

  // 배경 이미지 설정
  // async setBackgroundImage(canvas: StaticCanvas, imageURL: string): Promise<void> {
  //   return new Promise((resolve, reject) => {
  //     FabricImage.fromURL(
  //       imageURL,
  //       { crossOrigin: 'use-credentials' }
  //     ).then((img) => {
  //       if (!img) {
  //         reject(new Error('이미지 로드에 실패했습니다.'));
  //         return;
  //       }

  //       const canvasWidth = canvas.getWidth();
  //       const canvasHeight = canvas.getHeight();
  //       const imgWidth = img.width || 0;
  //       const imgHeight = img.height || 0;

  //       const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight);

  //       img.set({
  //         originX: "center",
  //         originY: "center",
  //         left: canvasWidth / 2,
  //         top: canvasHeight / 2,
  //         selectable: false,
  //         evented: false,
  //       });

  //       img.scale(scale);


  //       // 배경 이미지 설정
  //       canvas.backgroundImage = img;

  //       // 배경 이미지를 캔버스 크기에 맞게 스케일 조정
  //       // img.scaleToWidth(canvas.getWidth());
  //       // img.scaleToHeight(canvas.getHeight());

  //       // 캔버스 다시 렌더링
  //       canvas.requestRenderAll();

  //       resolve();
  //     }).catch((error) => {
  //       reject(new Error('이미지 로드 중 오류가 발생했습니다: ' + error.message));
  //     });
  //   });
  // }

  async setBackgroundImage(canvas: Canvas, imageURL: string): Promise<void> {
    return new Promise((resolve, reject) => {
      FabricImage.fromURL(imageURL, { crossOrigin: 'use-credentials' })
        .then((img) => {
          if (!img) {
            reject(new Error('이미지 로드에 실패했습니다.'));
            return;
          }

          const imgWidth = img.width || 0;
          const imgHeight = img.height || 0;
          if (!imgWidth || !imgHeight) {
            reject(new Error('이미지 크기를 가져오지 못했습니다.'));
            return;
          }

          const parentEl = canvas.wrapperEl?.parentElement as HTMLElement | null;

          const availableWidth =
            (parentEl?.getBoundingClientRect().width || canvas.getWidth() || 0);

          const availableHeight =
            (parentEl?.getBoundingClientRect().height || canvas.getHeight() || 0);

          if (!availableWidth || !availableHeight) {
            reject(new Error('캔버스 가용 영역 크기를 계산하지 못했습니다.'));
            return;
          }

          const scale = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);

          const newCanvasWidth = Math.max(1, Math.round(imgWidth * scale));
          const newCanvasHeight = Math.max(1, Math.round(imgHeight * scale));

          // 캔버스 리사이즈 (이미지 영역만 사용)
          canvas.setWidth(newCanvasWidth);
          canvas.setHeight(newCanvasHeight);

          // 배경 이미지를 (0,0) 좌상단에 딱 맞춰서
          img.set({
            originX: 'left',
            originY: 'top',
            left: 0,
            top: 0,
            selectable: false,
            evented: false,
          });

          img.scale(scale);

          // backgroundImage 적용
          canvas.backgroundImage = img;

          // 혹시 기존 줌/패닝이 남아있으면 초기화
          canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
          canvas.setZoom(1);

          canvas.requestRenderAll();
          resolve();
        })
        .catch((error) => {
          reject(new Error('이미지 로드 중 오류가 발생했습니다: ' + error.message));
        });
    });
  }

  // 미니맵 업데이트
  updateMiniMap() {
    const zoom = this.mainCanvas.getZoom();
    const viewportTransform = this.mainCanvas.viewportTransform!;

    const mainWidth = this.mainCanvas.getWidth();
    const mainHeight = this.mainCanvas.getHeight();
    const miniWidth = this.canvas.getWidth();
    const miniHeight = this.canvas.getHeight();

    const scaledWidth = mainWidth / zoom;
    const scaledHeight = mainHeight / zoom;
    const viewportX = -viewportTransform[4] / zoom;
    const viewportY = -viewportTransform[5] / zoom;

    // 기존 뷰포트 사각형 제거
    if (this.viewportRect) {
      this.canvas.remove(this.viewportRect);
    }

    // 뷰포트 사각형 추가
    this.viewportRect = new Rect({
      left: (viewportX * miniWidth) / mainWidth,
      top: (viewportY * miniHeight) / mainHeight,
      width: (scaledWidth * miniWidth) / mainWidth,
      height: (scaledHeight * miniHeight) / mainHeight,
      fill: 'rgba(0, 0, 255, 0.3)',
      stroke: 'blue',
      strokeWidth: 1,
      selectable: false,
    });

    this.canvas.add(this.viewportRect);
    this.canvas.renderAll();
  }

  // 메인 캔버스 이벤트 등록
  registerMainCanvasEvents() {
    this.mainCanvas.on('mouse:wheel', () => this.updateMiniMap());
    this.mainCanvas.on('mouse:down', () => this.updateMiniMap());
    this.mainCanvas.on('mouse:move', () => this.updateMiniMap());
    this.mainCanvas.on('mouse:up', () => this.updateMiniMap());
  }

  // 미니맵 캔버스 반환
  getCanvas() {
    return this.canvas;
  }
}

export default MiniMapCanvasImpl;