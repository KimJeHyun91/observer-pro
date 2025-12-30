import Button from '@/components/ui/Button'
import Loading from '@/components/shared/Loading'
import dayjs from 'dayjs'
import { imageType, driverInfo } from '@/@types/vehicle';
import { ModalType } from '@/@types/modal';
import Modal from '../modals/Modal';
import { useState, useRef } from 'react';

type LineProps = {
    setSelectedItem: (value: imageType | ((prev: imageType) => imageType)) => void;
    lineImages: imageType[];
    toggleModal: (modal: ModalType) => void;
    selectedLine: string | null;
    setSelectedLine: (value: string | null) => void;
    addDriverInfoList: driverInfo[];
    visitDriverList : driverInfo[];
};

const LineImage = ({setSelectedItem, lineImages, toggleModal, selectedLine, setSelectedLine, addDriverInfoList, visitDriverList} : LineProps) => {
    const [modal, setModal] = useState<ModalType>({
        show: false,
        type: '',
        title: '',
    });
    const modalChildRef = useRef<HTMLDivElement>(null);
    const [selectedImage, setSelectedImage] = useState<string | undefined>(undefined);

    const lineToggleModal = ({ show, title, type }: ModalType) => {
        setModal({
            show,
            title,
            type
        })
    }

    const openImageModal = (image: string) => {
        setSelectedImage(image);
        lineToggleModal({ show: true, title: '스냅샷', type: '' });
    };

    const selectLine = (item : imageType) => {
        if(!item.driverInfo){
            return
        }
        setSelectedLine(item.idx);
    }

    return (
        <>
            {
                lineImages.map((item, idx) => {
                    const isSelected = selectedLine === item.idx;
                    const laneNumber = (idx % 2) + 1;
                    const checkDriver = addDriverInfoList.find((info) => info.carNumber === item.driverInfo?.carNumber);
                    const blackListCheck = visitDriverList.filter((info) => info.carNumber === item.driverInfo?.carNumber);

                    const status = item.event
                        ? checkDriver
                            ? 'Registered'
                            : 'Unregistered'
                        : 'Waiting';
                        
                    return (
                        <div
                            key={idx}
                            className={`flex flex-col w-[25%] bg-gray-800 rounded-lg shadow-md mr-2 ${item.event ? 'cursor-pointer' : ''} ${isSelected ? 'border-4 border-green-500' : ''}`}
                            onClick={()=>{
                                selectLine(item)
                            }}
                        >
                            {/* Waiting 박스 */}
                            <div className="flex items-center justify-between py-2 px-2 bg-gray-900 rounded-t-lg">
                                <span className={`text-sm font-bold ${item.type === 'in' ? 'text-[#86EFAC]' : 'text-[#514CE3]'}`}>
                                    {item.type.toUpperCase()}
                                </span>
                                <span className="text-sm text-gray-300 translate-x-4 font-bold">{status}</span>
                                <span className='text-sm font-bold bg-yellow-500 text-black rounded px-1'>
                                    {laneNumber}LANE
                                </span>
                            </div>

                            {/* 이미지 박스 */}
                            <div className="relative flex flex-1 items-center justify-center bg-[#333335] rounded-b-lg">
                                {/* Add/Delete 버튼 */}
                                {item.event ? (
                                    <>
                                        {/* Front, Top, Back 이미지 영역 */}
                                        <div className="flex flex-col gap-2 p-2 w-full h-full">
                                            {/* Delete 버튼 */}
                                            <div className="flex justify-end flex-[0.05]">

                                                {blackListCheck.length > 0 && (
                                                    blackListCheck[0].blackList ? (
                                                        <div className="absolute w-full mt-2 text-center text-red-700 font-bold text-sm">
                                                            <p>Caution Vehicle</p>
                                                        </div>
                                                    ) : (
                                                        <>
                                                        </>
                                                    )
                                                )}
                                                <Button
                                                    className="w-[65px] h-[34px] bg-[rgb(87,27,32)] rounded text-white z-10 dark:bg-opacity-100"
                                                    size="sm"
                                                    variant="plain"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedItem(item);
                                                        toggleModal({ show: true, title: 'Delete', type: 'delete' });
                                                    }}
                                                >
                                                    Delete
                                                </Button>
                                            </div>

                                            {/* Front */}
                                            <div
                                                className={`flex items-center justify-center bg-[#333335] border border-black rounded overflow-hidden flex-[0.3] cursor-pointer ${
                                                    item.loading ? 'pointer-events-none' : ''
                                                }`}
                                                onClick={() => {
                                                    if (!item.loading) openImageModal(item.images.front!);
                                                }}
                                            >
                                                {
                                                    item.loading ? (
                                                        <Loading loading={true}/>
                                                    ) : (
                                                        <img
                                                            src={item.images.front}
                                                            alt="Front"
                                                            className="w-[11vw] h-[12.5vh]"
                                                            draggable="false"
                                                        />
                                                    )
                                                }
                                            </div>

                                            {/* Top */}
                                            <div
                                                className={`flex items-center justify-center bg-[#333335] border border-black rounded overflow-hidden flex-[0.3] cursor-pointer ${
                                                    item.loading ? 'pointer-events-none' : ''
                                                }`}
                                                onClick={() => {
                                                    if (!item.loading) openImageModal(item.images.top!);
                                                }}
                                            >
                                                {
                                                    item.loading ? (
                                                        <Loading loading={true}/>
                                                    ) : (
                                                        <img
                                                            src={item.images.top}
                                                            alt="Top"
                                                            className="w-[11vw] h-[12.5vh]"
                                                            draggable="false"
                                                        />
                                                    )
                                                }
                                            </div>

                                            {/* Back */}
                                            <div
                                                className={`flex items-center justify-center bg-[#333335] border border-black rounded overflow-hidden flex-[0.3] cursor-pointer ${
                                                    item.loading ? 'pointer-events-none' : ''
                                                }`}
                                                onClick={() => {
                                                    if (!item.loading) openImageModal(item.images.back!);
                                                }}
                                            >
                                                {
                                                    item.loading ? (
                                                        <Loading loading={true}/>
                                                    ) : (
                                                        <img
                                                            src={item.images.back}
                                                            alt="Back"
                                                            className="w-[11vw] h-[12.5vh]"
                                                            draggable="false"
                                                        />
                                                    )
                                                }
                                            </div>

                                            {/* 날짜 영역 */}
                                            {
                                                !item.loading && (
                                                    <div className="flex items-center justify-center text-sm bg-gray-800 text-[#FFFFFF] flex-[0.05]">
                                                        {dayjs(item.date).format('YYYY-MM-DD HH:mm:ss')}
                                                    </div>
                                                )
                                            }
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            className="absolute w-[65px] left-2 top-2 h-[34px] bg-[rgb(40,52,109)] rounded text-white z-10 dark:bg-opacity-100"
                                            size="sm"
                                            variant="plain"
                                            onClick={() => {
                                                setSelectedItem(item);
                                                toggleModal({ show: true, title: 'Car In-Out Add', type: 'inOutAdd' });
                                            }}
                                        >
                                            Add
                                        </Button>

                                        {/* 기본 이미지 영역 */}
                                        <img
                                            src={item.images.line}
                                            alt={`Lane ${laneNumber}`}
                                            className="h-[49vh] w-[14vw] z-0"
                                            draggable="false"
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })
            }

            <Modal width={500} modal={modal} toggle={lineToggleModal} modalChildRef={modalChildRef}>
                <div ref={modalChildRef}>
                    <img
                        src={selectedImage}
                        alt="Preview"
                        className="w-full h-full object-contain rounded-lg"
                        draggable="false"
                    />
                </div>
            </Modal>
        </>
    )
}

export default LineImage;