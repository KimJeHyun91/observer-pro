import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';
import { HiBarsArrowUp ,HiBarsArrowDown } from "react-icons/hi2";
import { RiLock2Line } from "react-icons/ri";
import { FaParking } from "react-icons/fa";
import { IoMdRefresh } from "react-icons/io";
import { TbPlugConnectedX } from "react-icons/tb";
import { useFullScreenStore } from '@/store/common/useFullScreenStore';
import { 
    CrossingGateType, 
    parkingFeeOutsideInfo,
    lprInfo,
    GateStateInfo
} from "@/@types/parkingFee";
import dayjs from "dayjs";

type BarrierArmProps = {
    gate?: CrossingGateType | null;
    selectedParking?: parkingFeeOutsideInfo | null;
    type?: 'in' | 'out';
    direction?: 'left' | 'right';
    status?: 'normal' | 'error';
    selected?: boolean;
    snapshotData?: lprInfo | null;
    gateState?: GateStateInfo | null;
    lineId? : string
    setSelectedCar?: (snapshot: lprInfo | null) => void;
    setSnapshot?: (data: lprInfo | null) => void;
    onOutCompleted?: () => void;
}

const BarrierArm = ({
    // selectedParking,
    type = 'in' ,
    direction = 'right',
    status = 'normal',
    selected,
    snapshotData,
    gateState,
    setSelectedCar,
    setSnapshot,
    onOutCompleted
}: BarrierArmProps) => {
    const [barrierState, setBarrierState] = useState<'closed' | 'opening' | 'open' | 'holding' | 'closing'>('closed');
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const isInProgressRef = useRef<{ in: boolean; out: boolean }>({ in: false, out: false });  // test 코드
    // const inTimeoutRef = useRef<number | null>(null);   // test 코드
    // const outTimeoutRef = useRef<number | null>(null);  // test 코드
    // const barrierArmTimeRef = useRef<boolean>(false);   // test 코드
    const { isFullscreen } = useFullScreenStore();
    const snapshotRef = useRef<lprInfo | null>(null);

    const animationRotation = {
        closed: 0,
        opening: direction === 'right' ? -90 : 90,
        open: direction === 'right' ? -90 : 90,
        holding: direction === 'right' ? -90 : 90,
        closing: 0,
    };

    useEffect(() => {
        const menuOutsideClick = (e: MouseEvent) => {
            if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', menuOutsideClick);

        return () => {
            document.removeEventListener('mousedown', menuOutsideClick);
        };
    }, [menuOpen]);

    useEffect(() => {
        const carOutsideClick = (e: MouseEvent) => {
            const wrapper = document.querySelector('.barrier-wrapper');
    
            if (snapshotData && wrapper?.contains(e.target as Node) && snapshotPopupRef.current && !snapshotPopupRef.current.contains(e.target as Node)) {
                setSelectedCar?.(null);
            }
        };
        document.addEventListener('mousedown', carOutsideClick);

        return () => {
            document.removeEventListener('mousedown', carOutsideClick);
        };
    }, [snapshotData, setSelectedCar]);
    
    useEffect(() => {
        if (snapshotData === undefined) return;
        snapshotRef.current = snapshotData;
    }, [snapshotData]);

    useEffect(() => {
        if (!gateState) return;

        if (gateState.state === "up") {
            setBarrierState("opening");
            return;
        }

        if (gateState.state === "down") {
            if (snapshotRef.current){
                console.log("snapshotRef :", snapshotRef.current);
                console.log("gateState :", gateState);
            }

            setBarrierState("closed");
            setSnapshot?.(null);
            setSelectedCar?.(null);

            if (type === 'out') {
                onOutCompleted?.();
            }
        }

    }, [gateState, setSnapshot, setSelectedCar, type, onOutCompleted]);

    // test 코드
    useEffect(() => {
        if (!snapshotData || barrierState === 'holding') return;
        
        // // 출차
        // if (type === 'out') {
        //     if (outTimeoutRef.current) clearTimeout(outTimeoutRef.current);
    
        //     outTimeoutRef.current = window.setTimeout(() => {
        //         if (!barrierArmTimeRef.current && !isInProgressRef.current.out) {
        //             test('out');
        //         }
        //     }, 5000);
        // }
    
        // // 입차
        // if (type === 'in') {
        //     if (inTimeoutRef.current) clearTimeout(inTimeoutRef.current);
    
        //     const isBlacklisted = snapshotData.carNum === '99가9999';
        //     if (!isBlacklisted && !isInProgressRef.current.in) {
        //         inTimeoutRef.current = window.setTimeout(() => {
        //             test('in');
        //         }, 5000);
        //     }
        // }
    
        // return () => {
        //     if (type === 'in' && inTimeoutRef.current) {
        //         clearTimeout(inTimeoutRef.current);
        //         inTimeoutRef.current = null;
        //     }
    
        //     if (type === 'out' && outTimeoutRef.current) {
        //         clearTimeout(outTimeoutRef.current);
        //         outTimeoutRef.current = null;
        //     }
        // };

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [snapshotData, type]);
    
    const menuClick = (action: 'open' | 'close' | 'hold') => {
        if (action === 'open') setBarrierState('opening');
        if (action === 'close') setBarrierState('closing');
        if (action === 'hold') setBarrierState('holding');
        setMenuOpen(false);
    };

    // test 코드
    // const test = (eventType: 'in' | 'out') => {
    //     if (isInProgressRef.current[type]) return;
    //     isInProgressRef.current[type] = true;

    //     if (eventType === 'in' && inTimeoutRef.current) {
    //         clearTimeout(inTimeoutRef.current);
    //         inTimeoutRef.current = null;
    //     }
    
    //     if (eventType === 'out' && outTimeoutRef.current) {
    //         clearTimeout(outTimeoutRef.current);
    //         outTimeoutRef.current = null;
    //     }
    
    //     setBarrierState('opening');
    
    //     const closeTimeout = setTimeout(() => {
    //         setBarrierState('closing');
    //         setSnapshot?.(null)
    //         setSelectedCar?.(null)

    //         setTimeout(() => {
    //             if (eventType === 'out') barrierArmTimeRef.current = false;
    //             isInProgressRef.current[eventType] = false;
    //         }, 1000);
    //     }, 5000);
    
    //     if (eventType === 'in') {
    //         inTimeoutRef.current = closeTimeout;
    //     } else {
    //         outTimeoutRef.current = closeTimeout;
    //     }
    // };
    
    const isBusy = barrierState === 'opening' || barrierState === 'closing';
    const isOpenDisabled = status === 'error' || ['opening', 'open', 'holding'].includes(barrierState);
    const isCloseDisabled = status === 'error' || isBusy || barrierState === 'closed';
    const isHoldDisabled = status === 'error' || isBusy || barrierState === 'holding';

    const snapshotPopupRef = useRef<HTMLDivElement>(null);
    const shouldShowSnapshot = snapshotData != null; 
    const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});

    useLayoutEffect(() => {
        const popupPosition = () => {
            if (!snapshotPopupRef.current) return;
        
            const baseScreenWidth = 1920;
            const baseScreenHeight = 1080;
            const baseX = type === 'in' ? -255 : 280;
            const baseY = type === 'in' ? !isFullscreen ? -363 : -440 : !isFullscreen ? 420 : 490;
            const scaleX = 1 + (1 - window.innerWidth / baseScreenWidth) * -2;
            const scaleY = 1 + (1 - window.innerHeight / baseScreenHeight) * (type === 'in' ? 0.1 : -0.1);
        
            const x = baseX * scaleX;
            const y = baseY * scaleY;
    
            setPopupStyle({
                transform: `translate(${x}px, ${y}px)`
            });
        };
    
        popupPosition();
        window.addEventListener('resize', popupPosition);
        return () => window.removeEventListener('resize', popupPosition);
    }, [snapshotData, type, isFullscreen]);

    const selectCar = () => {
        if (!snapshotData || !setSelectedCar) return;
        setSelectedCar(snapshotData);
    };

    return (
        <>
            <div>
                <div className="relative flex items-center gap-2">
                    <div 
                        className={`w-8 h-40 rounded-md relative flex flex-col items-center justify-center text-white text-sm bg-zinc-800 cursor-pointer
                        ${status === 'error' ? 'ring-2 ring-red-400 animate-pulse' : ''}`}
                        onClick={() => setMenuOpen(!menuOpen)}
                    >
                        {status === 'error' && (
                            <div className="absolute border -top-3 -left-3 bg-gray-400 rounded-full p-[2px] shadow-md z-30">
                                <TbPlugConnectedX className="w-5 h-5" />
                            </div>
                        )}
                        <motion.div
                            className="absolute top-6 w-[140px] h-3 bg-gradient-to-r from-red-600 via-white to-red-600 bg-[length:20px_3px] bg-repeat-x rounded"
                            style={{
                                left: direction === 'right' ? '20.5px' : undefined,
                                right: direction === 'left' ? '20.5px' : undefined,
                                transformOrigin: direction === 'right' ? 'left' : 'right',
                                backgroundImage: 'repeating-linear-gradient(90deg, red, red 10px, white 10px, white 20px)'
                            }}
                            animate={{ rotate: animationRotation[barrierState] }}
                            transition={{ duration: 1, ease: "easeInOut" }}
                            onAnimationComplete={() => {
                                if (barrierState === 'opening') setBarrierState('open');
                                if (barrierState === 'closing') setBarrierState('closed');
                            }}
                        />
                        <div className="absolute top-5 left-[22px] w-3 h-3 bg-gray-200 rounded-full -translate-x-full"></div>
                        <div className="mt-8 mb-5 text-lg" onClick={(e : React.MouseEvent) => e.stopPropagation()}><IoMdRefresh /></div>
                        <div className="text-[#8BC53F] text-xl"><FaParking /></div>
                        <div className={`absolute bottom-[-6px] w-10 h-[10px] bg-[#2f2f2f] rounded-sm shadow-inner
                            ${status === 'error' ? 'ring-2 ring-red-400' : ''}
                        `}></div>
                        
                        {menuOpen && (
                            <div
                                ref={menuRef}
                                className="absolute z-10 space-y-2"
                                style={{
                                    top: '60%',
                                    transform: 'translateY(-50%)',
                                    left: direction === 'right' ? 'calc(100% + 8px)' : undefined,
                                    right: direction === 'left' ? 'calc(100% + 8px)' : undefined,
                                }}
                            >
                                <button
                                    className={`w-28 flex items-center gap-2 px-3 py-2 rounded text-sm font-semibold
                                        ${isOpenDisabled ? 'bg-gray-300 text-gray-500 dark:bg-gray-400' : 'bg-blue-900 text-white hover:bg-blue-800'}
                                    `}
                                    disabled={isOpenDisabled}
                                    onClick={() => menuClick('open')}
                                >
                                    <HiBarsArrowUp className='h-5 w-5'/> 열기
                                </button>

                                <button
                                    className={`w-28 flex items-center gap-2 px-3 py-2 rounded text-sm font-semibold
                                        ${isCloseDisabled ? 'bg-gray-300 text-gray-500 dark:bg-gray-400' : 'bg-blue-900 text-white hover:bg-blue-800'}
                                    `}
                                    disabled={isCloseDisabled}
                                    onClick={() => {
                                        isInProgressRef.current[type] = false;
                                        setSnapshot?.(null);
                                        menuClick('close');
                                        setSelectedCar?.(null);

                                        if (type === 'out') {
                                            onOutCompleted?.();
                                        }
                                    }}
                                >
                                    <HiBarsArrowDown className='h-5 w-5'/> 닫기
                                </button>

                                <button
                                    className={`w-28 flex items-center gap-2 px-3 py-2 rounded text-sm font-semibold
                                        ${isHoldDisabled ? 'bg-gray-300 text-gray-500 dark:bg-gray-400' : 'bg-blue-900 text-white hover:bg-blue-800'}
                                    `}
                                    disabled={isHoldDisabled}
                                    onClick={() => menuClick('hold')}
                                >
                                    <RiLock2Line className='h-[19px] w-[19px]'/>열림 고정
                                </button>
                            </div>
                        )}
                    </div>

                    {shouldShowSnapshot && (
                        <div
                            ref={snapshotPopupRef}
                            className={`absolute w-[16.5rem] h-[22.7rem] rounded-md dark:border-gray-200 dark:bg-gray-200 border-gray-300 border-[4px] border-solid bg-gray-300 z-1 shadow-xl cursor-pointer
                                ${selected ? 'ring-4 ring-yellow-400' : ''}
                            `}
                            style={{
                                ...popupStyle,
                                top: type === 'in' ? '0' : undefined,
                                left: type === 'in' ? '0' : undefined,
                                bottom: type === 'out' ? '0' : undefined,
                                right: type === 'out' ? '0' : undefined,
                            }}
                            onClick={selectCar}
                        >
                            <div className="flex items-center justify-between text-black font-semibold text-sm px-2 py-2">
                                <span>{type === 'in' ? '입차 차량' : '출차 차량'}</span>

                                {/* {!snapshotData ||  type === 'out' && (
                                    <button
                                        className={` text-white text-xs px-3 py-1 rounded  transition ${
                                            isOpenDisabled ? 'text-gray-500 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
                                        }`}
                                        disabled={isOpenDisabled}
                                        onClick={() => {
                                            isInProgressRef.current[type] = false;
                                            barrierArmTimeRef.current = true;
                                            setSelectedCar?.(null);
                                            test('out');
                                        }}
                                    >
                                        요금 결제
                                    </button>
                                )} */}
                            </div>
                            
                            <div>
                                <div className="h-[63px] rounded-md bg-gray-400 p-1.5 flex flex-col justify-evenly text-[0.8rem]">
                                    <div className="flex h-[12px] items-center gap-1">
                                        <span className="w-[110px] pl-1 text-[#060606] font-semibold truncate">주차장 위치</span>
                                        <p className="w-[225px] bg-[#F7F7F7] rounded-sm pl-1 text-[#060606] font-semibold truncate py-[2px]">{snapshotData?.parking_location ? snapshotData?.parking_location : '\u00A0'}</p>
                                    </div>
                                    <div className="flex h-[12px] items-center gap-1 mt-2">
                                        <span className="w-[110px] pl-1 text-[#060606] font-semibold truncate">출입 시간</span>
                                        <p className="w-[225px] bg-[#F7F7F7] rounded-sm pl-1 text-[#060606] font-semibold truncate py-[2px]">{snapshotData.loop_event_time ? dayjs(snapshotData.loop_event_time).format("YYYY-MM-DD HH:mm:ss") : '\u00A0'}</p>
                                    </div>
                                </div>

                                <div className="h-[150px] rounded-md bg-gray-400 p-2 flex flex-col justify-evenly  mt-1">
                                    {
                                        snapshotData ? (
                                            <img src={snapshotData.image_url} alt="스냅샷" className="w-full h-full rounded" />
                                        ) : (
                                            <div className="flex justify-center items-center w-full h-full">
                                                <span className="text-gray-500 text-sm"></span>
                                            </div>
                                        )
                                    }
                                </div>

                                <div className="h-[60px] rounded-md bg-gray-400 p-1.5 flex flex-col justify-evenly text-[0.8rem] mt-1">
                                    <div className="flex h-[12px] items-center gap-1">
                                        <span className="w-[110px] pl-1 text-[#060606] font-semibold truncate">차량 번호</span>
                                        <p className="w-[225px] bg-[#F7F7F7] rounded-sm pl-1 text-[#060606] font-semibold truncate py-[2px]">{snapshotData?.lp ? snapshotData?.lp : '\u00A0'}</p>
                                    </div>
                                    <div className="flex h-[12px] items-center gap-1 mt-2">
                                        <span className="w-[110px] pl-1 text-[#060606] font-semibold truncate">등록 상태</span>
                                        <p className="w-[225px] bg-[#F7F7F7] rounded-sm pl-1 text-[#060606] font-semibold truncate py-[2px]">{snapshotData?.lp_type ? snapshotData?.lp_type : '\u00A0'}</p>
                                    </div>
                                </div>

                                <div className="flex justify-between pt-2">
                                    <button
                                        className={`w-[47%] py-1 font-semibold rounded bg-gray-400 ${
                                            isOpenDisabled ? 'text-gray-500 cursor-not-allowed' : 'text-green-700 hover:bg-green-50'
                                        }`}
                                        disabled={isOpenDisabled}
                                        onClick={(e : React.MouseEvent) => {
                                            e.stopPropagation()
                                            menuClick('open')
                                        }}
                                    >
                                        차단기 열림
                                    </button>
                                    <button
                                        className={`w-[47%] py-1 font-semibold rounded bg-gray-400 ${
                                        ['open', 'holding'].includes(barrierState)
                                            ? 'text-red-700 hover:bg-red-50'
                                            : 'text-gray-500 cursor-not-allowed'
                                        }`}
                                        disabled={!['open', 'holding'].includes(barrierState)}
                                        onClick={(e : React.MouseEvent) => {
                                            e.stopPropagation()
                                            isInProgressRef.current[type] = false;
                                            menuClick('close')
                                            setSnapshot?.(null);
                                            setSelectedCar?.(null);

                                            if (type === 'out') {
                                                onOutCompleted?.();
                                            }
                                        }}
                                    >
                                        차단기 닫힘
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default BarrierArm;