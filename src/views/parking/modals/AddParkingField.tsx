import { useState } from 'react';
import Button from '@/components/ui/Button'

type Props = {
  add: (data: { fieldName: string }) => void;
  closeModal: () => void;
};

const AddParkingField = ({ add, closeModal }: Props) => {
    const [addName, setAddName] = useState<string>('');
    const [error, setError] = useState<boolean>(false);

    const save = () => {
        const trimName = addName.trim().replace(/\s+/g, " "); // 앞뒤 공백 + 가운대 공백 한개빼고 다 제거

        if (!trimName) {
          setError(true);
        } else {
          setError(false);
          add({ fieldName: trimName });
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAddName(e.target.value);

        if (error && e.target.value.trim()) {
            setError(false);
        }
    };

    return (
        <div>
            <div className="absolute left-0 right-0 border-t border-gray-200 border-2 mt-[-7px] dark:border-gray-500"></div>

            <div className="pt-1">
            <div className="grid grid-cols-5 items-center gap-4 mb-12 mt-6">
                <span className="font-bold col-span-1 text-right text-black dark:text-[#FFFFFF]">건물명</span>
                <div className="col-span-4">
                <input
                    type="text"
                    placeholder="추가 할 건물 이름을 입력하세요."
                    value={addName}
                    className={`border p-2 rounded w-full dark:bg-[#404040] dark:border-[#404040] dark:text-[#FFFFFF] ${
                        error ? 'border-red-500' : 'border-gray-300'
                    }`}
                    onChange={handleInputChange}
                />

                {error && (
                    <span className="text-red-500 text-sm mt-1 block">
                        건물명을 입력해주세요.
                    </span>
                )}
                </div>
            </div>
            </div>

            <div className="absolute left-0 right-0 border-t border-gray-200 border-2 mt-[-17px] dark:border-gray-500"></div>

            <div className="flex justify-end space-x-2">
                <Button
                    className="mr-3 w-[100px] h-[34px] bg-[#D9DCE3] rounded "
                    size="sm"
                    onClick={closeModal}
                >
                    취소
                </Button>

                <Button
                    className="mr-3 w-[100px] h-[34px] bg-[#17A36F] rounded"
                    size="sm"
                    variant="solid"
                    onClick={save}
                >
                    저장
                </Button>
            </div>
        </div>
    );
};

export default AddParkingField;
