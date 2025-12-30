import { BiSolidCctv } from "react-icons/bi";
import { TbGrid4X4 } from "react-icons/tb";
import Button from '@/components/ui/Button'
import { imageType } from '@/@types/vehicle';
import { ModalType } from '@/@types/modal';

type DeviceProps = {
    setSelectedItem: (value: imageType | ((prev: imageType) => imageType)) => void;
    lineImages: imageType[];
    toggleModal: (modal: ModalType) => void;
    setTargetCCTV: (value: 'front' | 'top' | 'back') => void;
};

const DeviceList = ({setSelectedItem, lineImages, toggleModal, setTargetCCTV} : DeviceProps) => {
    return (
        <>
            {
                lineImages.map((item, idx) => {
                    const laneNumber = (idx % 2) + 1;

                    return (
                        <div
                            key={idx}
                            className={`flex flex-col w-[25%] p-2 ${idx >= 1 ? 'ml-4' : ''}`}
                        >
                            <div className="flex justify-between items-center h-[25%]">

                                <div className="flex items-center space-x-2">
                                    <TbGrid4X4 className="h-5 w-5 text-black dark:text-[#FFFFFF]"/>
                                    <span className="text-black font-bold text-lg dark:text-[#FFFFFF]">
                                        {item.type.toUpperCase()} {laneNumber} LANE
                                    </span>
                                </div>
                                <Button
                                    className={`${item.status === 'close' ? 'bg-[#BC433A] dark:bg-[#BC433A] dark:hover:bg-[#821111]' : 'bg-[#5F5E8D] dark:bg-[#5F5E8D] dark:hover:bg-[#40407f]'} text-white px-3 py-1 rounded text-sm h-[30px] w-[70px]`}
                                    size="sm"
                                    onClick={() => {
                                        setSelectedItem(item);
                                        toggleModal({
                                            show: true,
                                            title: `${item.status === 'close' ? 'OPEN' : 'CLOSE'}`,
                                            type: 'statusChange',
                                        });
                                    }}
                                >
                                    {item.status.toUpperCase()}
                                </Button>
                            </div>
                    
                            <div className="flex justify-between items-center h-[25%]">
                                <div className="flex items-center space-x-2">
                                    <BiSolidCctv className="h-5 w-5 text-black scale-x-[-1] dark:text-[#FFFFFF]"/>
                                    <span className="text-black font-bold text-lg dark:text-[#FFFFFF]">
                                        {item.idx}_lane_front
                                    </span>
                                </div>
                                <Button 
                                    className="bg-[#5F5E8D] text-white px-3 py-1 rounded text-sm h-[30px] w-[70px] dark:bg-[#5F5E8D] dark:hover:bg-[#40407f]"
                                    size="sm"
                                    onClick={() => {
                                        setTargetCCTV('front');
                                        setSelectedItem(item);
                                        toggleModal({ show: true, title: 'CCTV', type: 'cctv' });
                                    }}
                                >
                                    LIVE
                                </Button>
                            </div>

                            <div className="flex justify-between items-center h-[25%]">
                                <div className="flex items-center space-x-2">
                                    <BiSolidCctv className="h-5 w-5 text-black scale-x-[-1] dark:text-[#FFFFFF]"/>
                                    <span className="text-black font-bold text-lg dark:text-[#FFFFFF]">
                                        {item.idx}_lane_top
                                    </span>
                                </div>
                                <Button 
                                    className="bg-[#5F5E8D] text-white px-3 py-1 rounded text-sm h-[30px] w-[70px] dark:bg-[#5F5E8D] dark:hover:bg-[#40407f]"
                                    size="sm"
                                    onClick={() => {
                                        setTargetCCTV('top');
                                        setSelectedItem(item);
                                        toggleModal({ show: true, title: 'CCTV', type: 'cctv' });
                                    }}
                                >
                                    LIVE
                                </Button>
                            </div>

                            <div className="flex justify-between items-center h-[25%]">
                                <div className="flex items-center space-x-2">
                                    <BiSolidCctv className="h-5 w-5 text-black scale-x-[-1] dark:text-[#FFFFFF] "/>
                                    <span className="text-black font-bold text-lg dark:text-[#FFFFFF]">
                                        {item.idx}_lane_back
                                    </span>
                                </div>
                                <Button 
                                    className="bg-[#5F5E8D] text-white px-3 py-1 rounded text-sm h-[30px] w-[70px] dark:bg-[#5F5E8D] dark:hover:bg-[#40407f]"
                                    size="sm"
                                    onClick={() => {
                                        setTargetCCTV('back');
                                        setSelectedItem(item);
                                        toggleModal({ show: true, title: 'CCTV', type: 'cctv' });
                                    }}
                                >
                                    LIVE
                                </Button>
                            </div>
                        </div>
                    )
                })
            }
        </>
    )
}

export default DeviceList