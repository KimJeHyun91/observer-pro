import { useEffect, useRef } from "react";

const LicensePlate = ({ carNumber }: { carNumber: string }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const image = new Image();
        image.src = `http://${window.location.hostname}:4200/images/vehicle/car_number.png`;

        image.onload = () => {
            // Canvas 크기 설정
            canvas.width = image.width;
            canvas.height = image.height;

            // 이미지 그리기
            ctx.drawImage(image, 0, 0, image.width, image.height);

            // 텍스트 스타일 설정
            ctx.font = "bold 50px Segoe UI"; // 폰트 설정
            ctx.fillStyle = "black"; // 글자 색상
            ctx.textAlign = "center"; // 가로 중앙 정렬
            ctx.textBaseline = "alphabetic"; // 기본 텍스트 베이스라인 설정

            // 텍스트 위치 계산
            const x = canvas.width / 1.9;
            const y = canvas.height / 2;

            // 텍스트 높이 계산
            const textMetrics = ctx.measureText(carNumber || "N/A");
            const textHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;

            // 텍스트 위치 보정
            const correctedY = y + textHeight / 2;
            
            ctx.fillText(carNumber || "N/A", x, correctedY);
        };
    }, [carNumber]);

    return (
        <canvas
            ref={canvasRef}
            className="w-full h-auto rounded-md p-2"
        />
    );
};

export default LicensePlate;
