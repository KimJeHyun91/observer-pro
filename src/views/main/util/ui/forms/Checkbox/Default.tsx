import Checkbox from '@/components/ui/Checkbox'
import { FalseAlram } from '@/views/main/components/SOPEventDetail';
import type { ChangeEvent } from 'react'

type Props = {
    falseAlarm: FalseAlram;
    checkedFalseAlarm: FalseAlram;
    handleCheckFalseAlarm: (idx: number | null, type: string | null) => void;
}

const Default = ({
    falseAlarm,
    checkedFalseAlarm,
    handleCheckFalseAlarm
}: Props) => {
    const onCheck = (value: boolean, e: ChangeEvent<HTMLInputElement>) => {
        if (falseAlarm.idx !== checkedFalseAlarm.idx) {
            handleCheckFalseAlarm(falseAlarm.idx, falseAlarm.type);
        } else {
            handleCheckFalseAlarm(null, null);
        };
    };

    return (
        <Checkbox
            className='flex justify-center items-center'
            checkboxClass='text-[#769AD5] bg-[#EBECEF]'
            checked={checkedFalseAlarm.idx === falseAlarm.idx} value={falseAlarm.idx!} onChange={onCheck}
        >
        </Checkbox>
    )
}

export default Default
