import Button from '@/components/ui/Button';
import { imageType } from '@/@types/vehicle';
import { useState } from 'react';

type AddProps = {
    selectedItem: imageType;
    setSelectedItem: (value: imageType | ((prev: imageType) => imageType)) => void;
    lineImages: imageType[];
    addConfirm: (carNumber: string, selectedItem: imageType) => void; // 수정된 부분
    closeModal: () => void;
};

const Add = ({ selectedItem, setSelectedItem, lineImages, addConfirm, closeModal }: AddProps) => {
    const [carNumber, setCarNumber] = useState<string>("");

    const add = () => {
        addConfirm(carNumber, selectedItem);
    }

    return (
        <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center w-full">
                <span className="font-bold text-black dark:text-[#FFFFFF] mr-1">
                    Car Number :
                </span>
                <input
                    type="text"
                    placeholder="차량 번호를 입력해주세요."
                    value={carNumber}
                    className="border p-2 rounded flex-1 dark:bg-[#404040] dark:border-[#404040] dark:text-[#FFFFFF]"
                    onChange={(e) => setCarNumber(e.target.value)}
                />
            </div>

            {/* IN/OUT 버튼 */}
            <div className="flex space-x-2">
                <Button
                    className={`w-24 ${
                        selectedItem?.type === 'in' ? 'bg-green-500 text-black dark:bg-green-700' : ''
                    }`}
                    variant="default"
                    onClick={() => setSelectedItem((prev) => ({ ...prev, type: 'in', idx: '', event: false }))}
                >
                    IN
                </Button>
                <Button
                    className={`w-24 ${
                        selectedItem?.type === 'out' ? 'bg-green-500 text-black dark:bg-green-700 dark:hover:bg-green-900' : ''
                    }`}
                    variant="default"
                    onClick={() => setSelectedItem((prev) => ({ ...prev, type: 'out', idx: '', event: false }))}
                >
                    OUT
                </Button>
            </div>
        
            {/* Lane 버튼 */}
            <div className="flex space-x-2">
            {
                lineImages
                .filter((item) => item.type === selectedItem?.type) 
                .map((item, idx) => {
                const laneNumber = (idx % 2) + 1;
                return (
                    <Button
                        key={idx}
                            className={`w-24 ${
                            selectedItem?.idx === item.idx ? 'bg-green-300 text-black dark:bg-green-800 dark:hover:bg-green-950' : ''
                        }`}
                        variant="default"
                        disabled={item.event}
                        onClick={() =>
                            setSelectedItem((prev) => ({
                                ...prev,
                                idx: item.idx,
                                event: item.event,
                            }))
                        }
                    >
                        Lane {laneNumber}
                    </Button>
                );
                })}
            </div>
        
            {/* 확인 및 취소 버튼 */}
            <div className="flex space-x-2 mt-4">
                <Button
                    disabled={!selectedItem?.idx || !carNumber.trim()}
                    className={`w-24 ${selectedItem?.idx && carNumber.trim() ? 'bg-green-300 text-black dark:bg-green-800 dark:hover:bg-green-950' : ''}`}
                    variant="default"
                    onClick={add}
                >
                    등록
                </Button>
                <Button className='w-24' onClick={closeModal}>
                    취소
                </Button>
            </div>
        </div>
    )
}

export default Add;