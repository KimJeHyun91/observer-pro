import { useState, useEffect, useRef } from "react";
import {
    parkingFeeOutsideInfo,
    LineInfo,
    Floor,
    CrossingGateType
} from "@/@types/parkingFee";
import {
    setLineInfo,
    getLineList,
    deleteLineInfo,
    updateLineInfo,
    crossingGateDirectionList
} from '@/services/ParkingFeeService';
import parkingIcon from '@/configs/parking-icon.config';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { ModalType } from '@/@types/modal';
import Modal from '../modals/Modal';
import RemoveData from '../modals/RemoveData';
import { Select } from '@/components/ui'

type Props = {
    selectedParking: parkingFeeOutsideInfo;
    selectedFloor: Floor;
};

const AddFeeLine = ({ selectedParking, selectedFloor }: Props) => {
    const listRef = useRef<HTMLUListElement>(null);
    const [hasScroll, setHasScroll] = useState(false);
    const [editingLineId, setEditingLineId] = useState<number | null>(null);
    const [editingTitle, setEditingTitle] = useState("");
    const [lines, setLines] = useState<LineInfo[]>([]);
    const [editStatus, setEditStatus] = useState(false);
    const [lineName, setLineName] = useState("");
    const { socketService } = useSocketConnection();
    const [targetLine, setTargetLine] = useState<LineInfo | null>(null);
    const modalChildRef = useRef<HTMLDivElement>(null);
    const [inOptions, setInOptions] = useState<CrossingGateType[]>([]);
    const [outOptions, setOutOptions] = useState<CrossingGateType[]>([]);
    const [selectedInGate, setSelectedInGate] = useState<CrossingGateType | null>(null);
    const [selectedOutGate, setSelectedOutGate] = useState<CrossingGateType | null>(null);
    const [editingInGate, setEditingInGate] = useState<CrossingGateType | null>(null);
    const [editingOutGate, setEditingOutGate] = useState<CrossingGateType | null>(null);
    const [modal, setModal] = useState<ModalType>({
        show: false,
        type: '',
        title: ''
    });

    const addLine = async () => {
        if (!lineName.trim()) return;

        const payload = {
            inside_idx: selectedFloor.idx,
            line_name: lineName,
            in_gate: selectedInGate,
            out_gate: selectedOutGate,
        }

        try {
            const res = await setLineInfo(payload);

            if(res.message === 'fail'){
                alert(res.result);
                return;
            }

            if (!res || !res.result) {
                return;
            }

            setLineName("");
            setEditStatus(false);
            setSelectedInGate(null);
            setSelectedOutGate(null);
        } catch (error) {
            console.error('주차장 라인 Add API 에러: ', error);
            return;
        }
    };

    useEffect(() => {
        if (!socketService) {
            return;
        }

        const parkingFeeLineSocket = socketService.subscribe('pf_parkings-update', (received) => {
            if (
                received &&
                typeof received === 'object' &&
                'lineList' in received
            ) {
                getInLineList();
                getGateOptions();
            }
        })

        return () => {
            parkingFeeLineSocket();
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socketService])

    useEffect(() => {
        const checkScroll = () => {
            if (listRef.current) {
                const { scrollHeight, clientHeight } = listRef.current;
                setHasScroll(scrollHeight > clientHeight);
            }
        };

        checkScroll();
        window.addEventListener("resize", checkScroll);
        return () => window.removeEventListener("resize", checkScroll);
    }, [lines, editStatus]);

    useEffect(() => {
        getInLineList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedParking])

    const getInLineList = async () => {
        const payload = {
            inside_idx: selectedFloor.idx
        }

        try {
            const res = await getLineList(payload);

            if (res.message === 'fail') {
                alert(res.result);
                return;
            }

            if (!res || !res.result) {
                setLines([]);
                return;
            }

            setLines(res.result as LineInfo[]);
        } catch (error) {
            console.error('주차장 라인 List API 에러: ', error);
            setLines([]);
            return;
        }
    }

    const remove = async () => {
        const payload = {
            line_idx: targetLine?.idx
        }

        try {
            const res = await deleteLineInfo(payload);

            if (res.message === 'fail') {
                alert(res.result);
                return;
            }

            if (!res || !res.result) {
                return;
            }

            closeModal();
        } catch (error) {
            console.error('주차장 라인 Delete API 에러: ', error);
            return;
        }
    };

    const modifyLineName = async (line: LineInfo, newName: string) => {
        const isChanged = lineChangeCheck(line) || newName.trim() !== line.line_name;

        if (!isChanged) {
            return false;
        }

        const payload = {
            line_idx: line.idx,
            line_name: newName,
            in_gate: editingInGate,
            out_gate: editingOutGate
        }

        try {
            const res = await updateLineInfo(payload);

            if (res.message === 'fail') {
                alert(res.result);
                return;
            }

            if (!res || !res.result) {
                return;
            }

            setEditingLineId(null);
            setEditingTitle("");
            setEditingInGate(null);
            setEditingOutGate(null);
        } catch (error) {
            console.error('주차장 라인 Update API 에러: ', error);
            return;
        }
    };

    const toggleModal = ({ show, title, type }: ModalType) => {
        setModal({
            show,
            title,
            type
        })
    }

    const closeModal = () => {
        toggleModal({ show: false, type: '', title: '' });
    }

    const setModalChild = (type: string) => {
        switch (type) {
            case 'removeLine':
                return (
                    targetLine && (
                        <RemoveData
                            remove={remove}
                            closeModal={closeModal}
                            type="parkingFeeLine"
                            deleteTarget={{
                                id: (targetLine.idx).toString(),
                                title: targetLine.line_name
                            }}
                        />
                    )
                )
            default:
                break
        }
    }

    const getGateOptions = async () => {
        const payload = {
            direction: 'in,out',
            is_used: [false],
        }

        try {
            const res = await crossingGateDirectionList({ data: payload });

            if (res.message === 'fail') {
                alert(res.result);
                return;
            }

            if (!res || !res.result) {
                return;
            }

            const result = res.result as CrossingGateType[];

            const inList = result.filter((item) => item.direction === 'in')
            const outList = result.filter((item) => item.direction === 'out')

            setInOptions(inList);
            setOutOptions(outList);
        } catch (error) {
            console.error('주차장 라인 차단기 List API 에러: ', error);
            return;
        }
    }

    const getGateOptionsLine = (line: LineInfo, type: 'in' | 'out') => {
        const useGates = (type === 'in' ? inOptions : outOptions).slice();
    
        if (!Array.isArray(line.types) || line.types.length === 0) {
            return [
                { value: null, label: '라인 해제' },
                ...useGates.map(g => ({
                    value: g.idx,
                    label: `${g.crossing_gate_ip}:${g.crossing_gate_port}`,
                }))
            ];
        }
    
        const selectedGate = line.types.find(g => g.direction === type);

        if (selectedGate) {
            useGates.push(selectedGate);
        }
        
        return [
            { value: null, label: '라인 해제' },
            ...useGates.map(g => ({
                value: g.idx,
                label: `${g.crossing_gate_ip}:${g.crossing_gate_port}`,
            }))
        ];
    };

    const getSelectedGateOption = (line: LineInfo, type: 'in' | 'out') => {
        const gate = type === 'in' ? editingInGate : editingOutGate;
        
        if (gate === null) {
            return { value: null, label: '라인 해제' };
        }

        if (gate) {
            return selectedValue(gate);
        }
    
        if (!Array.isArray(line.types) || line.types.length === 0) {
            return { value: null, label: '라인 해제' };
        }
    
        const selected = line.types.find(t => t.direction === type);
        
        return selected
            ? { value: selected.idx, label: `${selected.crossing_gate_ip}:${selected.crossing_gate_port}` }
            : { value: null, label: '라인 해제' };
    };
    
    const selectOptions = (gates: CrossingGateType[]) => {
        return [
            { value: null, label: '라인 해제' },
            ...gates.map(gate => ({
                value: gate.idx,
                label: `${gate.crossing_gate_ip}:${gate.crossing_gate_port}`,
            })),
        ];
    };
    
    const selectedValue = (gate: CrossingGateType | null) => {
        return gate
            ? {
                value: gate.idx,
                label: `${gate.crossing_gate_ip}:${gate.crossing_gate_port}`,
            }
            : { value: null, label: '라인 해제' };
    };

    const menuOpenFocus = () => {
        setTimeout(() => {
            const dropdownMenu = document.querySelector('.select-menu');
            
            dropdownMenu?.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }, 0);
    }

    const getOriginGateIdx = (line: LineInfo, type: 'in' | 'out') =>
        line.types.find(t => t.direction === type)?.idx ?? null;
    
    const lineChangeCheck = (line: LineInfo) => {
        const titleChanged =
            editingTitle.trim() !== "" &&
            editingTitle.trim() !== line.line_name;
    
        const inGateChanged =
            (editingInGate?.idx ?? null) !== getOriginGateIdx(line, 'in');
    
        const outGateChanged =
            (editingOutGate?.idx ?? null) !== getOriginGateIdx(line, 'out');
    
        return titleChanged || inGateChanged || outGateChanged;
    };

    return (
        <div>
            <div className="absolute left-0 right-0 border-t border-gray-200 border-2 dark:border-gray-500 mt-[-17px]"></div>

            <div className="mt-7">
                <div className="w-full bg-[#D2D6DE] dark:bg-[#A9A9A9] text-sm font-semibold text-center text-black dark:text-white px-3 py-2 rounded">
                    {selectedFloor?.inside_name ?? '층 선택 안됨'}
                </div>
            </div>

            <div className="grid grid-cols-5 items-start gap-4 pt-2">
                <div className="col-span-5 relative">
                    <div className="bg-[#F2F5F9] p-2 border rounded w-full dark:bg-[#404040] dark:border-[#404040]">
                        <div
                            className={`flex items-center h-[36px] pl-3 border-gray-300 dark:border-gray-600 dark:bg-gray-300 bg-gray-300 text-sm font-semibold text-gray-800
                                rounded-t-md shadow-sm`}
                        >
                            <span className={`text-left w-[230px] ${hasScroll ? '' : 'mr-4'}`}>라인</span>
                            <span className={`text-center w-[190px] ${hasScroll ? 'mr-2' : ''}`}>입차 (IN)</span>
                            <span className={`text-center w-[190px] ${hasScroll ? 'mr-2' : 'mr-3'}`}>출차 (OUT)</span>
                            <span className="text-center ml-1">{editingLineId || editStatus ? "확인" : "수정"}</span>
                            <span className="text-center ml-2.5">{editingLineId || editStatus ? "취소" : "삭제"}</span>
                        </div>

                        <ul ref={listRef} className="max-h-40 overflow-y-auto overflow-x-hidden min-h-[260px] pr-2">
                            {editStatus && (
                                <li className='w-full flex mt-2'>
                                    <input
                                        type='text'
                                        className='w-[240px] h-[1.9rem] border-[1px] border-[#E3E6EB] border-solid pl-2 rounded-sm dark:text-[#000] mr-2'
                                        placeholder='라인의 이름을 입력하세요.'
                                        value={lineName}
                                        minLength={2}
                                        maxLength={20}
                                        onChange={(e) => setLineName(e.target.value)}
                                    />
                                    <div className='flex justify-around items-center gap-1.5 ml-1'>
                                        {/* 신규 차단기 IN 셀렉트 박스 */}
                                        <label className="relative inline-flex items-center cursor-pointer w-[200px] h-[30px]">
                                            <Select
                                                className="w-full cursor-pointer"
                                                size="xxs"
                                                styles={{
                                                    control: () => ({
                                                        backgroundColor: '#fff',
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: '5px',
                                                    }),
                                                    menuList: () => ({
                                                        maxHeight: '190px',
                                                        overflowY: 'auto',
                                                    }),
                                                }}
                                                options={selectOptions(inOptions)}
                                                value={selectedValue(selectedInGate)}
                                                onChange={(option) => {
                                                    const selected = inOptions.find(gate => gate.idx === option?.value);
                                                    setSelectedInGate(selected ?? null);
                                                }}
                                            />
                                        </label>

                                        {/* 신규 차단기 OUT 셀렉트 박스 */}
                                        <label className="relative inline-flex items-center cursor-pointer w-[200px] h-[30px]">
                                            <Select
                                                className="w-full cursor-pointer"
                                                size="xxs"
                                                styles={{
                                                    control: () => ({
                                                        backgroundColor: '#fff',
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: '5px',
                                                    }),
                                                    menuList: () => ({
                                                        maxHeight: '190px',
                                                        overflowY: 'auto',
                                                    }),
                                                }}
                                                options={selectOptions(outOptions)}
                                                value={selectedValue(selectedOutGate)}
                                                onChange={(option) => {
                                                    const selected = outOptions.find(gate => gate.idx === option?.value);
                                                    setSelectedOutGate(selected ?? null);
                                                }}
                                            />
                                        </label>
                                        
                                        {/* 신규 차단기 ADD 아이콘 */}
                                        <div className="cursor-pointer text-[#57AF68] hover:bg-[#647DB7] hover:text-white flex justify-center items-center w-[2rem] h-[1.9rem] bg-white rounded-md border border-gray-300 shadow-sm"
                                            onClick={() => addLine()}
                                        >
                                            <parkingIcon.check className="w-[1.3rem] h-[1.3rem]" />
                                        </div>

                                        {/* 신규 차단기 DELETE 아이콘 */}
                                        <div className="cursor-pointer text-[#D76767] hover:bg-[#647DB7] hover:text-white flex justify-center items-center w-[2rem] h-[1.9rem] bg-white rounded-md border border-gray-300 shadow-sm"
                                            onClick={() => {
                                                setEditStatus(false);
                                                setLineName("");
                                            }}
                                        >
                                            <parkingIcon.close className="w-[1.5rem] h-[1.5rem]" />
                                        </div>
                                    </div>
                                </li>
                            )}

                            {lines.map(line => (
                                <li key={line.idx} className="w-full flex mt-2">
                                    {editingLineId === line.idx ? (
                                        <input
                                            value={editingTitle}
                                            className="bg-white text-black dark:bg-gray-700 dark:text-white border border-gray-300 rounded px-2 w-[240px] h-[1.9rem] mr-3.5"
                                            onChange={(e) => setEditingTitle(e.target.value)}
                                        />
                                    ) : (
                                        <span className="bg-[#E7EBF1] dark:text-black flex items-center w-[240px] h-[1.9rem] pl-2 rounded-sm mr-3.5">
                                            {line.line_name}
                                        </span>
                                    )}
                                    <div className="flex items-center gap-1.5">
                                        {/* 차단기 수정 IN 셀렉트 박스 */}
                                        <label className="relative inline-flex items-center w-[200px] h-[30px]">
                                            {editingLineId === line.idx ? (
                                                <Select
                                                    className="w-full cursor-pointer"
                                                    size="xxs"
                                                    styles={{
                                                        control: () => ({
                                                            backgroundColor: '#fff',
                                                            border: '1px solid #d1d5db',
                                                            borderRadius: '5px',
                                                        }),
                                                        menuList: () => ({
                                                            maxHeight: '190px',
                                                            overflowY: 'auto',
                                                        }),
                                                    }}
                                                    options={getGateOptionsLine(line, 'in')}
                                                    value={getSelectedGateOption(line, 'in')}
                                                    onMenuOpen={menuOpenFocus}
                                                    onChange={(option) => {
                                                        if (!option || option.value == null) {
                                                            setEditingInGate(null);
                                                            return;
                                                        }
                                                    
                                                        let selected = inOptions.find(g => g.idx === option.value);
                                                    
                                                        if (!selected) {
                                                            selected = line.types.find(g => g.idx === option.value) as CrossingGateType;
                                                        }
                                                    
                                                        setEditingInGate(selected ?? null);
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-full h-full rounded-md border border-gray-300 shadow-sm peer-checked:bg-blue-600 peer-checked:border-blue-600 flex justify-center items-center transition-colors duration-200">
                                                    {(() => {
                                                        const inGate = line.types?.find(t => t.direction === 'in');
                                                        return inGate
                                                            ? `${inGate.crossing_gate_ip}:${inGate.crossing_gate_port} - 입차`
                                                            : '라인 해제';
                                                    })()}
                                                </div>
                                            )}
                                        </label>

                                        {/* 차단기 수정 OUT 셀렉트 박스 */}
                                        <label className="relative inline-flex items-center w-[200px] h-[30px]">
                                            {editingLineId === line.idx ? (
                                                <Select
                                                    className="w-full cursor-pointer"
                                                    size="xxs"
                                                    styles={{
                                                        control: () => ({
                                                            backgroundColor: '#fff',
                                                            border: '1px solid #d1d5db',
                                                            borderRadius: '5px',
                                                        }),
                                                        menuList: () => ({
                                                            maxHeight: '190px',
                                                            overflowY: 'auto',
                                                        }),
                                                    }}
                                                    options={getGateOptionsLine(line, 'out')}
                                                    value={getSelectedGateOption(line, 'out')}                                                    
                                                    onMenuOpen={menuOpenFocus}
                                                    onChange={(option) => {
                                                        if (!option || option.value == null) {
                                                            setEditingOutGate(null);
                                                            return;
                                                        }
                                                    
                                                        let selected = outOptions.find(g => g.idx === option.value);
                                                    
                                                        if (!selected) {
                                                            selected = line.types.find(g => g.idx === option.value) as CrossingGateType;
                                                        }
                                                    
                                                        setEditingOutGate(selected ?? null);
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-full h-full rounded-md border border-gray-300 shadow-sm peer-checked:bg-blue-600 peer-checked:border-blue-600 flex justify-center items-center transition-colors duration-200">
                                                    {(() => {
                                                        const outGate = line.types?.find(t => t.direction === 'out');
                                                        return outGate
                                                            ? `${outGate.crossing_gate_ip}:${outGate.crossing_gate_port} - 출차`
                                                            : '라인 해제';
                                                    })()}
                                                </div>
                                            )}
                                        </label>

                                        {/* 수정,확인,취소,삭제 버튼 */}
                                        {editingLineId === line.idx ? (
                                            <>
                                                <div
                                                    className={`flex justify-center items-center w-[2rem] h-[1.9rem] rounded-md border shadow-sm
                                                        ${!lineChangeCheck(line)
                                                            ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'
                                                            : 'cursor-pointer text-[#57AF68] hover:bg-[#647DB7] hover:text-white bg-white border-gray-300'
                                                        }
                                                    `}
                                                    onClick={() => {
                                                        modifyLineName(line, editingTitle);
                                                    }}
                                                >
                                                    <parkingIcon.check className="w-[1.3rem] h-[1.3rem]" />
                                                </div>
                                                <div
                                                    className="cursor-pointer text-[#D76767] hover:bg-[#647DB7] hover:text-white flex justify-center items-center w-[2rem] h-[1.9rem] bg-white rounded-md border border-gray-300 shadow-sm"
                                                    onClick={() => {
                                                        setEditingLineId(null);
                                                        setEditingTitle("");
                                                    }}
                                                >
                                                    <parkingIcon.close className="w-[1.5rem] h-[1.5rem]" />
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div
                                                    className="cursor-pointer text-[#647DB7] hover:bg-[#647DB7] hover:text-white flex justify-center items-center w-[2rem] h-[1.9rem] bg-white rounded-md border border-gray-300 shadow-sm"
                                                    onClick={() => {
                                                        setEditingLineId(line.idx);
                                                        setEditingTitle(line.line_name);

                                                        const inGate = line.types.find(t => t.direction === 'in') || null;
                                                        const outGate = line.types.find(t => t.direction === 'out') || null;

                                                        setEditingInGate(inGate);
                                                        setEditingOutGate(outGate);

                                                        getGateOptions();
                                                    }}
                                                >
                                                    <parkingIcon.edit className="w-[1.2rem] h-[1.2rem]" />
                                                </div>
                                                <div
                                                    className="cursor-pointer text-[#D76767] hover:bg-[#647DB7] hover:text-white flex justify-center items-center w-[2rem] h-[1.9rem] bg-white rounded-md border border-gray-300 shadow-sm"
                                                    onClick={() => {
                                                        setTargetLine(line)
                                                        toggleModal({ show: true, title: '라인 삭제', type: 'removeLine' })
                                                    }}
                                                >
                                                    <parkingIcon.trash className="w-[1.2rem] h-[1.2rem]" />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            <div className="-mb-4 mt-2">
                <button
                    className={`w-full rounded shadow py-1 h-[36px]
                        ${editingLineId || editStatus
                            ? 'bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed'
                            : 'bg-white border hover:bg-gray-100 text-black dark:bg-[#404040] dark:border-[#404040] dark:text-white dark:hover:bg-gray-500'}
                    `}
                    disabled={!!editingLineId || editStatus}
                    onClick={() => {
                        setEditStatus(true);
                        setLineName("");
                        getGateOptions();

                        if (listRef.current) {
                            listRef.current.scrollTop = 0;
                        }
                    }}
                >
                    라인 추가
                </button>
            </div>

            <Modal
                modal={modal}
                toggle={toggleModal}
                modalChildRef={modalChildRef}
            >
                <div ref={modalChildRef}>
                    {setModalChild(modal.type)}
                </div>
            </Modal>
        </div>
    );
};

export default AddFeeLine;
