import { useState, useRef, useEffect } from 'react';
import BarrierArm from '../components/BarrierArm';
import { 
    parkingFeeOutsideInfo,
    Floor,
    lprInfo,
    GateStateInfo,
    ReductionPolicy,
    FeeCalculationResult,
    ReFeeCalculationRequest,
 } from "@/@types/parkingFee";
import AddFeeFloor from '../modals/AddFeeFloor'
import AddFeeLine from '../modals/AddFeeLine'
import Modal from '../modals/Modal'
import { ModalType } from '@/@types/modal'
import { 
    getFloorLineList,
    getReductionPolicyList,
    getLineLPRInfo,
    reFeeCalculation,
} from '@/services/ParkingFeeService';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { Select } from '@/components/ui'
import dayjs from "dayjs";

type Props = {
    parkings : parkingFeeOutsideInfo[];
    selectedParking : parkingFeeOutsideInfo;
    setSelectedParking: (parking: parkingFeeOutsideInfo) => void;
};

const ParkingFeeDetail = ({ parkings, selectedParking, setSelectedParking }: Props) => {    
    const { socketService } = useSocketConnection();
    const [floors, setFloors] = useState<Floor[]>([]);
    const [modalWidth, setModalWidth] = useState(520);
    const [leftStatus, setLeftStatus] = useState<'normal' | 'error'>('normal');
    const [rightStatus, setRightStatus] = useState<'normal' | 'error'>('normal');

    const [entrySnapshot, setEntrySnapshot] = useState<lprInfo | null>(null);
    const [entryGateState, setEntryGateState] = useState<GateStateInfo | null>(null);
    const [exitSnapshot, setExitSnapshot] = useState<lprInfo | null>(null);
    const [exitGateState, setExitGateState] = useState<GateStateInfo | null>(null);
    const [selectedCar, setSelectedCar] = useState<lprInfo | null>(null);

    const [selectedLine, setSelectedLine] = useState<{ floorId: string, lineId: string } | null>(null);
    const selectedLineObj = selectedLine
        ? floors
            .find(f => f.idx.toString() === selectedLine.floorId)
            ?.lines.find(l => l.idx.toString() === selectedLine.lineId)
        : null;
    
    const selectedInGate  = selectedLineObj?.types.find(t => t.direction === 'in') ?? null;
    const selectedOutGate = selectedLineObj?.types.find(t => t.direction === 'out') ?? null;

    const selectedInGateRef = useRef<typeof selectedInGate>(null);
    const selectedOutGateRef = useRef<typeof selectedOutGate>(null);
    const selectedLineRef = useRef<typeof selectedLineObj>(null);

    const selectedLineHasIn  = !!selectedInGate;
    const selectedLineHasOut = !!selectedOutGate;

    const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null);
    const [toggleState, setToggleState] = useState<Record<string, boolean>>({});

    const modalChildRef = useRef<HTMLDivElement>(null)
    const [modal, setModal] = useState<ModalType>({
        show: false,
        type: '',
        title: '',
    })

    const selectedParkingRef = useRef(selectedParking);
    const [reductionPolicies, setReductionPolicies] = useState<ReductionPolicy[]>([]);
    const [selectedReductions, setSelectedReductions] = useState<ReductionPolicy[]>([]);
    const [feeResult, setFeeResult] = useState<FeeCalculationResult | null>(null);
    const [exitCarInfo, setExitCarInfo] = useState<{
        lp: string;
        image_url?: string;
        in_time?: number;
        out_time?: number;
        in_time_person?: string;
        out_time_person?: string;
        lp_type?: string;
    } | null>(null);
    const isDiscountEnabled = !!selectedLineObj && !!feeResult && (!!selectedCar || !!exitCarInfo);
    const displayCar = selectedCar ?? exitCarInfo;

    const displayTime = (() => {
        if (selectedCar?.loop_event_time) {
            return selectedCar.loop_event_time;
        }

        if (exitCarInfo?.in_time) {
            return exitCarInfo.in_time;
        }

        return null;
    })();
    
    useEffect(() => {
        selectedParkingRef.current = selectedParking;
    }, [selectedParking]);

    useEffect(() => {
        selectedInGateRef.current = selectedLineObj?.types.find(t => t.direction === 'in') ?? null;
        selectedOutGateRef.current = selectedLineObj?.types.find(t => t.direction === 'out') ?? null;
        selectedLineRef.current = selectedLineObj;
    }, [selectedLineObj]);

    useEffect(() => {
        if (!socketService) {
            return;
        }
  
        const parkingFeeSocket = socketService.subscribe('pf_parkings-update', (received) => {
            if (received) {
                getTreeList();
            }
        })
        
        // 차량 정보 소켓 데이터
        const parkingFeeLprSocket = socketService.subscribe('pf_lpr-update', (received) => {
            if (
                received &&
                typeof received === 'object' &&
                'lpr' in received
            ) {
                
                const data = received as { lpr?: { update?: lprInfo } };
                const carInfo = data.lpr?.update;
                
                if (!carInfo) return;

                const { direction, outside_ip, ip, port } = carInfo;

                // 선택 된 주차장만 소켓 데이터 연결
                if(selectedParkingRef.current.outside_ip !== outside_ip) return;
                const targetGate = direction === 'in' ? selectedInGateRef.current : selectedOutGateRef.current;

                // 선택 된 차단기만 소켓 데이터 연결
                if (
                    !targetGate ||
                    targetGate.crossing_gate_ip !== ip ||
                    Number(targetGate.crossing_gate_port) !== port
                ) return;

                if (direction === 'in') {
                    setEntrySnapshot(null);
                    setEntrySnapshot(carInfo);
                } else if (direction === 'out') {
                    setExitSnapshot(null);
                    setExitSnapshot(carInfo);
                }
            }
        })

        // 차단기 정보 소켓 데이터 (차량 정보 들어온 후 바로 들어옴)
        const parkingFeeGateSocket = socketService.subscribe('pf_gate_state-update', (received) => {
            if (
                received &&
                typeof received === 'object' &&
                'gate_state' in received
            ) {
                const data = received as { gate_state?: { update?: GateStateInfo } };
                const gateState = data.gate_state?.update
                
                if (!gateState) return;

                const { direction, outside_ip } = gateState;

                if(selectedParkingRef.current.outside_ip !== outside_ip) return;

                const targetGate = direction === 'in' ? selectedInGateRef.current : selectedOutGateRef.current;

                if (
                    !targetGate ||
                    targetGate.crossing_gate_ip !== gateState.crossing_gate_ip ||
                    targetGate.crossing_gate_port !== gateState.crossing_gate_port
                ) return;

                if (direction === 'in') {
                    setEntryGateState(null);
                    setEntryGateState(gateState);
                } else if (direction === 'out') {
                    setExitGateState(null);
                    setExitGateState(gateState);
                }
            }
        })

        const parkingFeeCalculationResultSocket = socketService.subscribe('pf_fee_calculation_result-update', (received) => {
            if (
                received &&
                typeof received === 'object' &&
                'lpr' in received
            ) {
                const data = received as { lpr?: { update?: FeeCalculationResult } };
                const feeInfo = data.lpr?.update;
                
                if (!feeInfo) return;
                
                const line = selectedLineRef.current;
                
                // 선택된 라인이 없으면 처리 안 함
                if (!line) return;

                const isSameParking = feeInfo.outside_idx === selectedParkingRef.current.idx;
                //  const isSameFloor = feeInfo.inside_idx === line.inside_idx;
                const isSameLine = feeInfo.line_idx === line.idx;

                if (!isSameParking || !isSameLine) return;
                setFeeResult(feeInfo);

                const autoReductions = mapReductionNamesToPolicies(
                    feeInfo.reduction_name,
                    reductionPolicies
                );
                setSelectedReductions(autoReductions);
                
                setExitCarInfo({
                    lp: feeInfo.lp,
                    image_url: feeInfo.image_url,
                    out_time: feeInfo.out_time,
                    out_time_person: feeInfo.out_time_person,
                    in_time: feeInfo.in_time,
                    in_time_person: feeInfo.in_time_person,
                    lp_type: feeInfo.reduction_name,
                });
            }
        })

        return () => {
            parkingFeeSocket();
            parkingFeeLprSocket();
            parkingFeeGateSocket();
            parkingFeeCalculationResultSocket();
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socketService])

    useEffect(() => {
        if (!feeResult || reductionPolicies.length === 0) return;

        const autoReductions = mapReductionNamesToPolicies(
            feeResult.reduction_name,
            reductionPolicies
        );

        setSelectedReductions(autoReductions);
    }, [feeResult, reductionPolicies]);

    useEffect(() => {
        if (!selectedParking) return;
        getTreeList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedParking]);

    const getTreeList = async () => {
        const payload ={
            outside_idx : selectedParkingRef.current.idx
        }

        try {
            const res = await getFloorLineList(payload);
            
            if(res.message === 'fail'){
                alert(res.result);
                return;
            }

            if (!res || !res.result) {
                setFloors([]);
                return;
            }
            
            setFloors(res.result as Floor[]);
        } catch (error) {
            console.error('주차장 Tree API 에러: ', error);
            setFloors([]);
            return;
        }
    }
    
    const toggleModal = ({ show, title, type }: ModalType) => {
        setModal({
            show,
            title,
            type,
        })

        if (!show) {
            setModalWidth(520);
        }
    }
    
    const reset = (type : string) => {
        if(type === 'select'){
            setSelectedLine(null);
            setToggleState({});
        }

        setEntrySnapshot(null);
        setExitSnapshot(null);
        setSelectedCar(null);  
        setExitCarInfo(null);
        setFeeResult(null);  
        setSelectedReductions([]);
        setLeftStatus('normal');
        setRightStatus('normal');
    }

    const setModalChild = (type: string) => {
        switch (type) {
            case 'addFeeFloor':
                return (
                    <AddFeeFloor
                        selectedParking={selectedParking}
                    />
                )
            case 'addFeeLine':
                return (
                    selectedFloor && (
                        <AddFeeLine
                            selectedParking={selectedParking}
                            selectedFloor={selectedFloor}
                        />
                    )
                )
            default:
                break
        }
    }
    
    const toggleList = (floorId: string) => {
        setToggleState(prev => ({
            ...prev,
            [floorId]: !prev[floorId],
        }));
    };

    const getPolicyList = async () => {
        try {
            const res = await getReductionPolicyList();
            
            if(res.message === 'fail'){
                alert(res.result);
                return;
            }

            if (!res?.result) return;

            setReductionPolicies(res.result as ReductionPolicy[]);
        } catch (error) {
            console.error('주차장 감면정책 조회 에러: ', error);
            return;
        }
    }

    useEffect(()=> {
        getPolicyList()
    }, [])

    const mapReductionNamesToPolicies = (
        reductionName: string | null | undefined,
        policies: ReductionPolicy[]
    ): ReductionPolicy[] => {
        if (!reductionName || reductionName.trim() === '') return [];

        const names = reductionName
            .split(',')
            .map(n => n.trim())
            .filter(Boolean);

        return policies.filter(p =>
            names.includes(p.reduction_name)
        );
    };

    const recalculateFee = async (nextReductions: ReductionPolicy[]) => {
        if (!exitCarInfo || !selectedOutGate) return;

        const reduction_name = nextReductions.map(r => r.reduction_name).join(',');

        const payload: ReFeeCalculationRequest = {
            outside_ip: selectedParking.outside_ip,
            port: selectedParking.outside_port,
            crossing_gate_ip: selectedOutGate.crossing_gate_ip,
            crossing_gate_port: selectedOutGate.crossing_gate_port,
            lp: exitCarInfo.lp,
            reduction_name,
        };

        try {
            const res = await reFeeCalculation(payload);

            if (res.message !== 'ok') return;

            const result = res.result as unknown as FeeCalculationResult;;

            // 요금 갱신
            setFeeResult(result);

            // 차량 정보 갱신
            setExitCarInfo(prev => ({
                ...prev!,
                in_time: result.in_time,
                in_time_person: result.in_time_person,
                out_time: result.out_time,
                out_time_person: result.out_time_person,
                lp_type: result.reduction_name,
            }));

            // 서버 기준으로 할인 목록 재동기화
            const autoReductions = mapReductionNamesToPolicies(
                result.reduction_name,
                reductionPolicies
            );
            setSelectedReductions(autoReductions);

        } catch (err) {
            console.error('재정산 api 실패', err);
        }
    };

    const loadLineLPRInfo = async (lineIdx: number) => {
        try {
            const res = await getLineLPRInfo({ line_idx: lineIdx });

            if (res.message !== 'ok' || !res.result) return;

            // 초기화 (라인 변경 시 기존 값 제거)
            setEntrySnapshot(null);
            setExitSnapshot(null);

            for (const lpr of res.result) {
                if (lpr.direction === 'in') {
                    setEntrySnapshot(lpr as lprInfo);
                }

                if (lpr.direction === 'out') {
                    setExitSnapshot(lpr as lprInfo);
                }
            }
        } catch (err) {
            console.error('라인 LPR 조회 실패', err);
        }
    };
 
    // const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // const isProcessing = useRef({
    //     in: false,
    //     out: false,
    // });

    // const runTestIn = async () => {
    //     if (!socketService) return;

    //     const direction = "in";

    //     if (isProcessing.current[direction]) {
    //         return;
    //     }

    //     isProcessing.current[direction] = true;

    //     try {
    //         const testLpr = {
    //             lpr: {
    //                 update: {
    //                     direction,
    //                     fname: "1766965402863_1766965402863_1766965402865_loop1_00_0_33001_232구4894.jpg",
    //                     folder_name: "2025_12_29",
    //                     image_url: "http://192.168.3.201:3120/images/2025_12_29/1766965402863_1766965402863_1766965402865_loop1_00_0_33001_232구4894.jpg",
    //                     image_url_header: "/images/",
    //                     inside_idx: 1,
    //                     ip: "192.168.3.201",
    //                     kind: "lpr",
    //                     ledd_index: "0",
    //                     ledd_ip: "192.168.3.201",
    //                     ledd_port: "5000",
    //                     line_idx: 1,
    //                     location: "입차1",
    //                     loop_event_time: Date.now(),
    //                     loop_event_time_person: "2025-12-29 08:43:22",
    //                     lp: "232구4894",
    //                     lp_type: "경차",
    //                     outside_idx: 1,
    //                     outside_ip: "192.168.3.201",
    //                     outside_port: "3120",
    //                     parking_location: "1층 1라인",
    //                     port: 33001,
    //                     pt_ip: "",
    //                     pt_port: "",
    //                 }
    //             }
    //         };

    //         socketService.emit("pf_lpr-update", testLpr);

    //         await delay(1000);

    //         const gateUp = {
    //             gate_state: {
    //                 update: {
    //                     crossing_gate_idx: 1,
    //                     crossing_gate_ip: "192.168.3.201",
    //                     crossing_gate_port: "33001",
    //                     direction: "in",
    //                     inside_idx: 1,
    //                     line_idx: 1,
    //                     location: "입차1",
    //                     outside_idx: 1,
    //                     outside_ip: "192.168.3.201",
    //                     state: "up"
    //                 },
    //             },
    //         };

    //         socketService.emit("pf_gate_state-update", gateUp);

    //         await delay(3000);

    //         const gateDown = {
    //             gate_state: {
    //                 update: {
    //                     crossing_gate_idx: 1,
    //                     crossing_gate_ip: "192.168.3.201",
    //                     crossing_gate_port: "33001",
    //                     direction: "in",
    //                     inside_idx: 1,
    //                     line_idx: 1,
    //                     location: "입차1",
    //                     outside_idx: 1,
    //                     outside_ip: "192.168.3.201",
    //                     state: "down"
    //                 },
    //             },
    //         };

    //         socketService.emit("pf_gate_state-update", gateDown);

    //     } finally {
    //         isProcessing.current[direction] = false;
    //     }
    // };
        
    // const runTestOut = async () => {
    //     if (!socketService || isProcessing.current.out) return;
    //     isProcessing.current.out = true;

    //     try {
    //         socketService.emit("pf_lpr-update", {
    //             lpr: {
    //                 update: {
    //                     direction: "out",
    //                     fname: "1766966096761_1766966096761_1766966096763_loop3_00_0_33001_232구4894.jpg",
    //                     folder_name: "2025_12_29",
    //                     image_url: "http://192.168.3.201:3120/images/2025_12_29/1766966096761_1766966096761_1766966096763_loop3_00_0_33001_232구4894.jpg",
    //                     image_url_header: "/images/",
    //                     inside_idx: 1,
    //                     ip: "192.168.3.201",
    //                     kind: "fee_calculation_result",
    //                     ledd_index: "1",
    //                     ledd_ip: "192.168.3.201",
    //                     ledd_port: "5000",
    //                     line_idx: 1,
    //                     location: "출차1",
    //                     loop_event_time: 1766966096761,
    //                     loop_event_time_person: "2025-12-29 08:54:56",
    //                     lp: "232구4894",
    //                     lp_type: "경차",
    //                     outside_idx: 1,
    //                     outside_ip: "192.168.3.201",
    //                     outside_port: "3120",
    //                     parking_location: "1층 1라인",
    //                     port: 33001,
    //                     pt_ip: "localhost",
    //                     pt_port: "9104"
    //                 },
    //             },
    //         });

    //         await delay(50);

    //         socketService.emit("pf_fee_calculation_result-update", {
    //             lpr: {
    //                 update: {
    //                     discountfee: 30,
    //                     feetype: 1,
    //                     image_url: "http://192.168.3.201:3120/images/2025_12_29/1766966096761_1766966096761_1766966096763_loop3_00_0_33001_232구4894.jpg",
    //                     in_time: 1766966094262,
    //                     in_time_person: "2025-12-29 08:54:54",
    //                     inside_idx: 1,
    //                     ledd_index: "1",
    //                     ledd_ip: "192.168.3.201",
    //                     ledd_port: "5000",
    //                     line_idx: 1,
    //                     location: "출차1",
    //                     lp: "232구4894",
    //                     out_time: 1766966096761,
    //                     out_time_person: "2025-12-29 08:54:56",
    //                     outside_idx: 1,
    //                     outside_ip: "192.168.3.201",
    //                     outside_port: "3120",
    //                     parkingfee: 150,
    //                     prepayment: 0,
    //                     pt_ip: "localhost",
    //                     pt_port: "9104",
    //                     reduction_name: "경차"
    //                 },
    //             },
    //         });
    //     } finally {
    //         isProcessing.current.out = false;
    //     }
    // };

    // useEffect(() => {
    //     const test = (e: KeyboardEvent) => {
    //         if (!e.ctrlKey) return;

    //         switch (e.key.toLowerCase()) {
    //             case 'c':
    //                 e.preventDefault();
    //                 runTestIn();
    //                 break;

    //             case 'v':
    //                 e.preventDefault();
    //                 runTestOut();
    //                 break;

    //         }
    //     };

    //     window.addEventListener('keydown', test);
    //     return () => window.removeEventListener('keydown', test);
    // }, []);

    return (
        <div className="w-full h-full mb-2 bg-white dark:bg-gray-800 shadow-md rounded-lg p-4">
            <div className="flex h-full gap-4">
                {/* 왼쪽 - 트리 영역 */}
                <div className="flex flex-col h-full w-[250px] font-semibold text-sm rounded-md  ">
                    {/* 셀렉트 드롭다운 */}
                    <div className="relative w-full border-b border-gray-200 pb-1">
                        <Select
                            className="w-full mb-1 cursor-pointer"
                            size="xxs"
                            isSearchable={false}
                            styles={{
                                control: () => ({
                                    backgroundColor: '#fff',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '5px',
                                }),
                            }}
                            value={{
                                value: selectedParking.idx,
                                label: selectedParking.outside_name,
                            }}
                            options={parkings.map(p => ({
                                value: p.idx,
                                label: p.outside_name,
                            }))}
                            onChange={(option) => {
                                const newSelected = parkings.find(p => p.idx === option?.value);
                                if (newSelected) {
                                    setSelectedParking(newSelected);
                                    reset('select');
                                }
                            }}
                        />
                    </div>

                    {/* 트리 */}
                    <div className='flex-1 basis-0 max-h-[90%] overflow-y-auto scroll-container mb-2 dark:text-black mt-2'>
                        {floors.map(floor => {
                            const isToggle = toggleState[floor.idx];
                            
                            return (
                                <div key={floor.idx} className="mb-1 border rounded bg-white shadow-sm">
                                    <div className={`flex justify-between items-center px-2 py-1 cursor-pointer
                                        ${isToggle ? '' : 'border-b'}
                                    `}
                                        onClick={() => toggleList(floor.idx.toString())}
                                    >
                                        <span className="font-bold">{floor.inside_name}</span>
                                        <button
                                            className="text-xs text-gray-600 hover:text-gray-900 px-1"
                                        >
                                            {isToggle ? '▲' : '▼'}
                                        </button>
                                    </div>

                                    {!isToggle && (
                                        <div className="p-1 space-y-1">
                                            {floor.lines.map(line => {
                                                const isSelected = selectedLine?.floorId === floor.idx.toString() && selectedLine?.lineId === line.idx.toString();
                                                const hasIn = line.types.some(t => t.direction === 'in');
                                                const hasOut = line.types.some(t => t.direction === 'out');

                                                return (
                                                    <div
                                                        key={line.idx}
                                                        className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer h-[32px]
                                                            ${isSelected ? 'bg-blue-200' : 'bg-[#EBECEF] hover:bg-blue-100'}`}
                                                        onClick={async () => {
                                                            const lineId = line.idx;

                                                            setSelectedLine({
                                                                floorId: floor.idx.toString(),
                                                                lineId: lineId.toString(),
                                                            });

                                                            reset('line');

                                                            await loadLineLPRInfo(lineId);
                                                        }}
                                                    >
                                                        <span className="font-medium text-[13px]">{line.line_name}</span>
                                                        <div className="flex space-x-1">
                                                            {hasIn ? (
                                                                <span className="text-[10px] w-[30px] text-center px-1 py-0.5 bg-white text-black rounded">IN</span>
                                                            ) : <span className="w-[30px]" />}
                                                            {hasOut ? (
                                                                <span className="text-[10px] w-[30px] text-center px-1 py-0.5 bg-white text-black rounded">OUT</span>
                                                            ) : <span className="w-[30px]" />}
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            <button
                                                className="w-full mt-1 bg-[#DEE4EE] hover:bg-[#8c9fb8] text-black text-xs rounded px-2 py-1"
                                                onClick={() => {
                                                    setModalWidth(800)
                                                    setSelectedFloor(floor);
                                                    toggleModal({ show: true, title: '라인 추가', type: 'addFeeLine' });
                                                }}
                                            >
                                                라인 추가
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="border-t border-gray-200">
                        <button 
                            className="w-full mt-3.5 bg-white border hover:bg-gray-100 text-xs py-1 rounded shadow dark:text-black"
                            onClick={() => {
                                toggleModal({ show: true, title: '층 추가', type: 'addFeeFloor' });
                            }}
                        >
                            층 설정
                        </button>
                    </div>
                </div>

                {/* 중앙 - 차단기 영역 */}
                <div className="relative basis-[70%] bg-gray-100 dark:bg-gray-300 rounded overflow-hidden flex justify-center items-center barrier-wrapper">
                    {selectedLine && (
                        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-10 bg-black/80 text-white text-sm px-4 py-1 rounded-full shadow-md">
                            {
                                (() => {
                                const floor = floors.find(f => f.idx.toString() === selectedLine.floorId);
                                const line = floor?.lines.find(l => l.idx.toString() === selectedLine.lineId);
                                
                                return floor && line
                                    ? `${floor.inside_name} · ${line.line_name}`
                                    : '';
                                })()
                            }
                        </div>
                    )}
                    
                    <div className="relative w-[800px] h-[600px] mr-16">
                        <img
                            src="/src/assets/styles/images/BarrierArm.png"
                            alt="parking"
                            className="object-cover -mt-10 w-full h-full select-none"
                            draggable={false}
                        />

                        <div className="absolute top-[330px] left-[180px] z-2">
                            {selectedLineHasIn && (
                                <BarrierArm 
                                    key={selectedLine?.lineId + "-in"}
                                    type="in" 
                                    direction="left" 
                                    gate={selectedInGate}
                                    gateState={entryGateState}
                                    snapshotData={entrySnapshot}
                                    selectedParking={selectedParking}
                                    status={leftStatus} 
                                    selected={
                                        selectedCar === entrySnapshot 
                                    }
                                    setSelectedCar={setSelectedCar} 
                                    setSnapshot={setEntrySnapshot}
                                />
                            )}
                        </div>

                        <div className="absolute top-[65px] left-[630px] z-2">
                            {selectedLineHasOut && (
                                <BarrierArm 
                                    key={selectedLine?.lineId + "-out"}
                                    type="out" 
                                    direction="right" 
                                    gate={selectedOutGate}
                                    gateState={exitGateState}
                                    snapshotData={exitSnapshot} 
                                    selectedParking={selectedParking}
                                    status={rightStatus} 
                                    selected={
                                        selectedCar === exitSnapshot
                                    }
                                    setSelectedCar={setSelectedCar}
                                    setSnapshot={setExitSnapshot}
                                    onOutCompleted={() => {
                                        setSelectedCar(null);
                                        setExitCarInfo(null);
                                        setFeeResult(null);
                                        setSelectedReductions([]);
                                        setExitSnapshot(null);
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* 오른쪽 - 차량 정보 및 결제 영역 */}
                <div className="h-full basis-[33%] bg-gray-50 dark:bg-gray-600 rounded-lg p-2 flex flex-col border shadow-sm">
                    {/* 차량 정보 영역 */}
                    <div className="h-[178px] border p-2 rounded-md bg-white shadow-sm">
                        <div className="flex flex-col p-2 rounded-md">
                            <>
                                {/* 차량 번호 */}
                                <div
                                    className={`dark:text-black w-[140px] h-8 font-semibold mb-1 border rounded-md bg-gray-50 flex items-center justify-center px-2 ${
                                        displayCar ? 'text-[20px]' : 'text-[12px]'
                                    }`}
                                >
                                    {displayCar?.lp ?? '차량을 선택해 주세요.'}
                                </div>

                                <div className="flex gap-2">
                                    {/* 차량 이미지 */}
                                    <div className="w-[140px] h-[110px] bg-white rounded-md overflow-hidden border flex items-center justify-center">
                                        {displayCar?.image_url ? (
                                            <img
                                                src={displayCar.image_url}
                                                alt="차량 이미지"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-xs text-gray-400">이미지 없음</span>
                                        )}
                                    </div>

                                    {/* 차량 정보 */}
                                    <div className="flex flex-col justify-evenly flex-1 text-sm border rounded-md px-2 py-2 dark:border-gray-400">
                                        <div className="flex gap-1 items-center">
                                            <span className="dark:text-black w-[70px] text-gray-800">출입 시간</span>
                                            <p className="flex items-center px-2 flex-1 rounded-md bg-gray-50 text-gray-800 text-xs border h-7 dark:text-black">
                                                {displayTime
                                                ? dayjs(displayTime).format('YYYY-MM-DD HH:mm:ss')
                                                : '-'}
                                            </p>
                                        </div>
                                        <div className="flex gap-1 items-center">
                                            <span className="dark:text-black w-[70px] text-gray-800">등록 상태</span>
                                            <p className="flex items-center px-2 flex-1 rounded-md bg-gray-50 text-gray-800 text-xs border h-7 dark:text-black">
                                                {displayCar?.lp_type ?? '-'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        </div>
                    </div>

                    {/* 할인 버튼 영역 */}
                    <div
                        className={`
                            h-[102px] max-h-[102px] overflow-y-auto scroll-container
                            border rounded-md p-2 my-2
                            ${isDiscountEnabled ? 'bg-gray-50' : 'bg-gray-100 opacity-50 pointer-events-none'}
                        `}
                    >
                        {reductionPolicies.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-xs text-gray-400">
                                할인정보가 없습니다
                            </div>
                        ) : (
                            <div className="grid grid-cols-4 gap-2 text-xs">
                                {reductionPolicies.map(policy => {
                                    const isSelected = selectedReductions.some(r => r.idx === policy.idx);

                                    return (
                                        <button
                                            key={policy.idx}
                                            disabled={isSelected}
                                            className={`
                                                h-[38px] rounded-md border shadow-sm
                                                text-xs font-medium transition dark:text-black
                                                ${
                                                    isSelected
                                                        ? 'bg-blue-100 text-blue-500 border-blue-300 cursor-not-allowed'
                                                        : 'bg-white hover:bg-blue-50 hover:border-blue-400'
                                                }
                                            `}

                                            onClick={async () => {
                                                const next = selectedReductions.some(r => r.idx === policy.idx)
                                                    ? selectedReductions
                                                    : [...selectedReductions, policy];

                                                await recalculateFee(next);
                                            }}
                                        >
                                            {policy.reduction_name}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* 할인 코드 영역 */}
                    <div className="border rounded-md text-xs bg-white shadow-sm h-[98px] mb-2">
                        <div className="grid grid-cols-[80px_90px_1fr_50px_40px] bg-gray-200 px-2 py-1 font-semibold rounded-t-md dark:text-black">
                            <span>코드</span>
                            <span>할인종류</span>
                            <span>사유</span>
                            <span className="text-right">수량</span>
                            <span className="text-right">삭제</span>
                        </div>

                        {selectedReductions.length === 0 ? (
                            <div className="h-[72px] flex items-center justify-center text-gray-400 dark:text-black">
                                적용된 할인 내역이 없습니다
                            </div>
                        ) : (
                            <div className="max-h-[72px] overflow-y-auto">
                                {selectedReductions.map(policy => (
                                    <div
                                        key={policy.idx}
                                        className="grid grid-cols-[80px_90px_1fr_50px_40px] dark:text-black
                                                px-2 py-1 border-b items-center"
                                    >
                                        <span>{`POLICY_${policy.idx}`}</span>
                                        <span>{policy.reduction_name}</span>

                                        <span
                                            className="truncate whitespace-nowrap overflow-hidden"
                                            title={policy.contents ?? '-'}
                                        >
                                            {policy.contents ?? '-'}
                                        </span>

                                        <span className="text-right">1</span>

                                        <button
                                            className="text-right text-gray-400 hover:text-red-500"
                                            onClick={async () => {
                                                const next = selectedReductions.filter(
                                                    p => p.idx !== policy.idx
                                                );

                                                await recalculateFee(next);
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    {/* 결제 정산 영역 */}
                     <div className="bg-white border rounded-md p-4 shadow-sm text-sm space-y-2 mb-3 h-[calc(100vh-700px)] flex flex-col justify-between">
                        <div className="space-y-2">
                            {[
                                ['주차 요금', feeResult?.parkingfee ?? 0],
                                ['사전 정산', feeResult?.prepayment ?? 0],
                                ['할인 금액', feeResult?.discountfee ?? 0],
                            ].map(([label, value]) => (
                                <div
                                    key={label}
                                    className="flex justify-between items-center py-1"
                                >
                                    <span className="text-gray-700 dark:text-black">
                                        {label}
                                    </span>
                                    <span className="text-gray-900 dark:text-black font-medium">
                                        {(value as number).toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="border-t dark:border-gray-400 pt-3 mt-2 flex justify-between items-center font-bold text-lg text-orange-400">
                            <span>결제 금액</span>
                            <span>
                                {Math.max(feeResult?.parkingfee ?? 0).toLocaleString()}
                            </span>
                        </div>
                    </div>
 
                    {/* 결제 버튼 */}
                    <div className="border-t pt-3 flex justify-end">
                        <button
                            disabled={!exitCarInfo || !feeResult || feeResult.feetype !== 1}
                            className={`
                                px-6 py-2 rounded-md text-sm font-semibold transition
                                ${
                                    exitCarInfo && feeResult?.feetype === 1 && selectedCar?.direction === 'out'
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow'
                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }
                            `}
                        >
                            결제하기
                        </button>
                    </div>
                </div>
            </div>

            <Modal
                modal={modal}
                toggle={toggleModal}
                modalChildRef={modalChildRef}
                width={modalWidth}
            >
                <div ref={modalChildRef}>
                    {setModalChild(modal.type)}
                </div>
            </Modal>
        </div>
    );
};

export default ParkingFeeDetail;
