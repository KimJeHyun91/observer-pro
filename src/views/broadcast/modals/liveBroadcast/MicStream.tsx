import React, { useEffect, useRef, useState } from 'react'

const MicStream = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationRef = useRef<number | null>(null);

    const [volume, setVolume] = useState(55); 

    const handleVolumeChange = (event) => {
      setVolume(event.target.value); 
    };
    

    useEffect(() => {
        const setupAudio = async () => {
        // 마이크 입력 가져오기
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
    
        // 오디오 스트림 처리
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
    
        analyser.fftSize = 256; // Fast Fourier Transform 크기
        analyserRef.current = analyser;
        audioContextRef.current = audioContext;
    
        drawVisualizer();
        };
    
        const drawVisualizer = () => {
        const canvas = canvasRef.current;
        const analyser = analyserRef.current;
        if (!canvas || !analyser) return;
    
        const ctx = canvas.getContext("2d");
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
    
        const draw = () => {
            analyser.getByteFrequencyData(dataArray);
    
            if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
    
            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;
    
            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i];
                ctx.fillStyle = `rgb(${barHeight + 100}, 50, 150)`;
                ctx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);
    
                x += barWidth + 1;
            }
            }
    
            animationRef.current = requestAnimationFrame(draw);
        };
    
        draw();
        };
    
        setupAudio();
    
        return () => {
        if (audioContextRef.current) {
            audioContextRef.current.close();
        }
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
        };
    }, []);
        
  return (
    <div className='flex p-2 gap-1'>
        <div className='flex flex-col w-[80%]'>
            {/* <canvas ref={canvasRef} className='w-[100%] h-[200px] border border-gray-300'  ></canvas> */}
            
        </div>
        <div className='flex flex-col gap-2 text-xs tracking-[-.15em] w-[100px]' >
            <div className='flex flex-col justify-center items-center mb-3'>
                <span className=''>마이크연결상태</span>
                  <p className='flex justify-center items-center w-[30px] bg-gray-300 font-bold'>연결</p>
            </div>

 
            <input
                id="volume"
                className="-rotate-90 my-10" 
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={handleVolumeChange}
            />
   

            <div className='w-[30px] mx-auto mt-3 text-center'>{volume}</div>
            <div className='w-[30px] mx-auto text-center'>음량</div>

        </div>

       
    </div>
  )
}

export default MicStream
