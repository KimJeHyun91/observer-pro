import { useState, useRef } from 'react';
import { IoIosSearch } from "react-icons/io";
import { parkingFeeOutsideInfo } from "@/@types/parkingFee";
import { TbParkingCircle } from "react-icons/tb";
import Modal from '../modals/Modal';
import { ModalType } from '@/@types/modal';
import { 
    setParkingFeeInfo,
    deleteParkingFeeInfo,
    updateParkingFeeInfo
} from '@/services/ParkingFeeService';
import AddFeeParking from '../modals/AddFeeParking'
import RemoveData from '../modals/RemoveData';
import ModifyFeeParking from '../modals/ModifyFeeParking';

type Props = {
    parkings : parkingFeeOutsideInfo[]
    setSelectedParking: (parking: parkingFeeOutsideInfo) => void;
};
  
const ParkingFeeMain = ({ parkings ,setSelectedParking }: Props) => {
    const [searchKeyword, setSearchKeyword] = useState('');
    const [newParkingName, setNewParkingName] = useState('');
    const [newParkingIp, setNewParkingIp] = useState('');
    const [newParkingPort, setNewParkingPort] = useState('');
    const [targetParkingFee, setTargetParkingFee] = useState<parkingFeeOutsideInfo | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const filteredParkings = parkings.filter(p =>
        p.outside_name.toLowerCase().includes(searchKeyword.toLowerCase())
    );

    const [modal, setModal] = useState<ModalType>({
        show: false,
        type: '',
        title: ''
    });

    const modalChildRef = useRef<HTMLDivElement>(null);

    const toggleModal = ({ show, title, type }: ModalType) => {
        setModal({
            show,
            title,
            type
        })
    }

    const closeModal = () => {
        setNewParkingName('');
        setNewParkingIp('');
        setNewParkingPort('');
        setTargetParkingFee(null);
        toggleModal({ show: false, type: '', title: '' });
    }

    const save = async () => {
        if (!newParkingName.trim() || !newParkingIp.trim() || !newParkingPort.trim()) {
            alert('모든 필수 항목을 입력해주세요.');
            return;
        }
    
        setIsSaving(true);

        const newParkingFee = {
            outside_name: newParkingName.trim(),
            outside_ip: newParkingIp.trim(),
            outside_port: newParkingPort.trim()
        };

        try {
            const res = await setParkingFeeInfo(newParkingFee);
            
            if(res.message === 'fail'){
                alert(res.result);
                return;
            }

            if (!res || !res.result) {
                return;
            }

            closeModal();
        } catch (error) {
            console.error('주차장 Add API 에러: ', error);
            return;
        } finally {
            setIsSaving(false); // 저장 완료
        }
    };

    const modify = async (name: string, ip: string, port: string, status: string) => {
        if (!targetParkingFee) return;
        
        setIsSaving(true)

        const payload = {
            outside_idx: targetParkingFee.idx,
            outside_name: name,
            outside_ip: ip,
            outside_port: port,
            status: status,
            prev_outside_ip: targetParkingFee.outside_ip
        };

        try {
            const res = await updateParkingFeeInfo(payload);
            
            if(res.message === 'fail'){
                alert(res.result);
                return;
            }

            if (!res || !res.result) {
                return;
            }

            closeModal();
        } catch (error) {
            console.error('주차장 Modify API 에러: ', error);
            return;
        } finally {
            setIsSaving(false);
        }
    }

    const remove = async () => {
        const payload = {
            outside_idx: targetParkingFee?.idx,
            outside_ip: targetParkingFee?.outside_ip,
        };

        try {
            const res = await deleteParkingFeeInfo(payload);
            
            if(res.message === 'fail'){
                alert(res.result);
                return;
            }

            if (!res || !res.result) {
                return;
            }

            closeModal();
        } catch (error) {
            console.error('주차장 Delete API 에러: ', error);
            return;
        }
    }

    const setModalChild = (type: string) => {
        switch (type) {
            case 'addFeeParking':
                return (
                    <AddFeeParking
                        isSaving={isSaving}
                        newParkingName={newParkingName}
                        setNewParkingName={setNewParkingName}
                        newParkingIp={newParkingIp}
                        setNewParkingIp={setNewParkingIp}
                        newParkingPort={newParkingPort}
                        setNewParkingPort={setNewParkingPort}
                        closeModal={closeModal}
                        save={save}
                    />
                )
            case 'removeFeeParking':
                return (
                    targetParkingFee && (
                        <RemoveData
                            remove={remove}
                            closeModal={closeModal}
                            type="parkingFeeMain"
                            deleteTarget={{
                                id : (targetParkingFee.idx).toString(),
                                title : targetParkingFee.outside_name
                            }}
                        />
                    )
                )
            case 'modifyFeeParking':
                    return (
                        targetParkingFee && (
                            <ModifyFeeParking
                                modify={modify}
                                closeModal={closeModal}
                                targetParkingFee={targetParkingFee}
                                isSaving={isSaving}
                            />
                        )
                    )
            default:
                break
        }
    }

    return (
        <div className="flex-1 flex flex-col">
            <div className="flex flex-col h-full w-full bg-white mb-2 dark:bg-gray-800 shadow-md rounded-lg p-3">
                {/* 헤더 */}
                <div className="w-full mb-2 dark:bg-gray-600 rounded-lg p-3 flex items-center justify-between text-black dark:text-white border dark:border-gray-600 bg-gray-100">
                    <div className="text-lg font-semibold whitespace-nowrap mr-6">
                        통합주차관제센터
                    </div>

                    <div className="flex items-center space-x-2 ml-auto">
                        <input
                            type="text"
                            placeholder="주차장 명을 검색하세요"
                            value={searchKeyword}
                            className="w-64 h-8 px-3 text-sm text-black bg-white dark:bg-gray-200 dark:bg-white rounded outline-none placeholder-gray-400"
                            onChange={(e) => setSearchKeyword(e.target.value)}
                        />
                        <button
                            className="w-8 h-8 bg-[#F6A531] hover:bg-[#e89c2c] flex items-center justify-center rounded"
                            onClick={() => setSearchKeyword('')}
                        >
                            <IoIosSearch className='w-6 h-6 text-white' />
                        </button>
                    </div>
                </div>

                {/* 바디 */}
                <div className='flex-1 basis-0 overflow-y-auto'>
                    <div className="grid grid-cols-5 gap-5">
                        {filteredParkings.map((p) => (
                            <div
                                key={p.idx}
                                className={`group
                                    h-[250px] relative w-full rounded-md flex flex-col items-center justify-center shadow-md cursor-pointer duration-200
                                    ${p.status === 'error' ? 'border-2 border-red-500 hover:border-red-400' :
                                        p.status === 'lock' ? 'border-2 border-gray-500 hover:border-gray-400 cursor-not-allowed' :
                                        'border-2 border-green-500 hover:border-green-400'}
                                    dark:bg-[#1C1C1C] bg-gray-200
                                `}
                                onClick={() => setSelectedParking(p)}
                            >
                                {/* 상단 이름 */}
                                <div
                                    className={`
                                        absolute top-0 left-0 px-2 py-1 text-white text-[12px] font-bold
                                        ${p.status === 'error' ? 'bg-red-600' :
                                        p.status === 'lock' ? 'bg-gray-500' :
                                        'bg-green-600'}
                                        rounded-br-md
                                    `}
                                >
                                    {p.outside_name}
                                </div>
                            
                                {/* 주차 아이콘 */}
                                <TbParkingCircle className='w-40 h-40 text-white dark:text-gray-300'/>

                                {/* 상태 표시 */}
                                {p.status === 'error' && (
                                    <div className="absolute top-2 right-2 bg-white text-red-600 text-[11px] font-medium px-1.5 py-0.5 rounded shadow-sm border border-gray-300">
                                        {p.status}
                                    </div>
                                )}

                                {/* 마우스 호버 시 수정/삭제 버튼*/}
                                <div className="
                                    absolute bottom-2 right-2
                                    opacity-0 translate-y-2
                                    group-hover:opacity-100 group-hover:translate-y-0
                                    transition-all duration-200 ease-out
                                    flex space-x-1
                                ">
                                    <button
                                        className="bg-[#B1B1B1]  text-white text-xs font-semibold px-2 py-1 rounded hover:bg-gray-600 transition dark:bg-[#818181] dark:hover:bg-gray-600"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setTargetParkingFee(p);
                                            toggleModal({ show: true, title: '주차장 수정', type: 'modifyFeeParking' })
                                        }}
                                    >
                                        수정
                                    </button>
                                    <button
                                        className="bg-[#D76767] text-white text-xs font-semibold px-2 py-1 rounded hover:bg-red-600 transition dark:bg-[#cf4747] dark:hover:bg-red-700"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setTargetParkingFee(p);
                                            toggleModal({ show: true, title: '주차장 삭제', type: 'removeFeeParking' })
                                        }}
                                    >
                                        삭제
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 풋터 */}
                <div className="w-full flex items-center justify-between bg-gray-100 text-black dark:bg-[#1C1C1C] dark:text-white rounded-md border dark:border-gray-600 mt-2.5 px-4 py-2">
                    <div className="flex items-center space-x-4 text-sm font-medium">
                        <div className="flex items-center space-x-1">
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span>정상</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <span>에러</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <div className="w-3 h-3 rounded-full bg-[#737373]" />
                            <span>운영 중단</span>
                        </div>
                    </div>

                    <button
                        className="bg-[#F6A531] hover:bg-[#e89c2c] text-white font-semibold text-sm px-4 py-2 rounded-md shadow-md"
                        onClick={() => {
                            toggleModal({ show: true, title: '주차장 추가', type: 'addFeeParking' })
                        }}
                    >
                        + 주차장 추가
                    </button>
                </div>
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

export default ParkingFeeMain;
