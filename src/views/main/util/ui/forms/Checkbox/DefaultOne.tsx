import Checkbox from '@/components/ui/Checkbox'

type Props = {
    value: boolean;
    onChange: (value: boolean) => void;
}

const DefaultOne = ({ value, onChange }: Props) => {
    const onCheck = () => {
        onChange(!value);
    };

    return (
        <Checkbox
            className='border-none flex justify-center items-center w-[1.5rem] h-[1.5rem]'
            checkboxClass='text-[#769AD5] bg-[#EBECEF] '
            checked={value}
            onChange={onCheck}
        />
    );
};

export default DefaultOne
