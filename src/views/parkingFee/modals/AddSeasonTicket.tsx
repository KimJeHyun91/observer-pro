import Button from '@/components/ui/Button'
import { SeasonTicketMember } from '@/@types/parkingFee'
import { useState } from "react";

type Props = {
    siteId: string;
    closeModal: () => void;
    onCreated: (member: SeasonTicketMember) => void;
};

const AddSeasonTicket = ({ siteId, closeModal, onCreated }: Props) => {
    const [isSaving, setIsSaving] = useState(false);

    const [carNumber, setCarNumber] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [code, setCode] = useState('');
    const [phone, setPhone] = useState('');
    const [groupName, setGroupName] = useState('');
    const [note, setNote] = useState('');

    const save = async () => {
        if (!carNumber.trim() || !name.trim()) {
            return;
        }

        setIsSaving(true);

        const payload = {
            siteId,
            carNumber,
            name,
            description,
            code,
            phone,
            groupName,
            note,
        };

        console.log('멤버 보낼 api payload : ', payload);

        // TODO: API 연결
        const createdMember: SeasonTicketMember = {
            id: crypto.randomUUID(),
            siteId,
            carNumber,
            name,
            description,
            code,
            phone,
            groupName,
            note,
            currentMembership: undefined,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        onCreated(createdMember);
        setIsSaving(false);
    };

    const isSaveDisabled = isSaving || !carNumber.trim() || !name.trim();

    return (
        <div>
            <div className="absolute left-0 right-0 border-t border-gray-200 border-2 mt-[-7px] dark:border-gray-500"></div>

            <div className="pt-1">
                <div className="grid grid-cols-5 items-center gap-4 mb-12 mt-6">
                    <span className="font-bold col-span-1 text-right text-[13px]">
                        차량번호 <span className="text-red-500">*</span>
                    </span>
                    <div className="col-span-4">
                        <input
                            value={carNumber}
                            placeholder="차량번호를 입력하세요"
                            className="border p-2 rounded w-full dark:bg-[#404040]"
                            onChange={(e) => setCarNumber(e.target.value)}
                        />
                    </div>

                    <span className="font-bold col-span-1 text-right text-[13px]">
                        고객명 <span className="text-red-500">*</span>
                    </span>
                    <div className="col-span-4">
                        <input
                            value={name}
                            className="border p-2 rounded w-full dark:bg-[#404040]"
                            placeholder="회원 이름을 입력하세요"
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <span className="font-bold col-span-1 text-right text-[13px]">
                        회원 설명
                    </span>
                    <div className="col-span-4">
                        <input
                            value={description}
                            className="border p-2 rounded w-full dark:bg-[#404040]"
                            placeholder="회원 설명을 입력하세요"
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <span className="font-bold col-span-1 text-right text-[13px]">
                        회원 코드
                    </span>
                    <div className="col-span-4">
                        <input
                            value={code}
                            className="border p-2 rounded w-full dark:bg-[#404040]"
                            placeholder="회원 코드 (선택)"
                            onChange={(e) => setCode(e.target.value)}
                        />
                    </div>

                    <span className="font-bold col-span-1 text-right text-[13px]">
                        연락처
                    </span>
                    <div className="col-span-4">
                        <input
                            value={phone}
                            className="border p-2 rounded w-full dark:bg-[#404040]"
                            placeholder="연락처를 입력하세요"
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>

                    <span className="font-bold col-span-1 text-right text-[13px]">
                        소속
                    </span>
                    <div className="col-span-4">
                        <input
                            value={groupName}
                            className="border p-2 rounded w-full dark:bg-[#404040]"
                            onChange={(e) => setGroupName(e.target.value)}
                        />
                    </div>

                    <span className="font-bold col-span-1 text-right text-[13px]">
                        비고
                    </span>
                    <div className="col-span-4">
                        <input
                            value={note}
                            className="border p-2 rounded w-full dark:bg-[#404040]"
                            onChange={(e) => setNote(e.target.value)}
                        />
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
                    className={`mr-3 w-[100px] h-[34px] rounded
                        ${
                            isSaveDisabled
                                ? 'bg-gray-300 cursor-not-allowed'
                                : 'bg-[#17A36F] hover:bg-[#148a5f]'
                        }`}
                    size="sm"
                    variant="solid"
                    disabled={isSaveDisabled}
                    onClick={save}
                >
                    {isSaving ? '저장 중...' : '저장'}
                </Button>
            </div>
        </div>
    );
};

export default AddSeasonTicket;