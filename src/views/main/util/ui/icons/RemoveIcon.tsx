import { FaTrashCan } from "react-icons/fa6";

type Props = {
  onRemove: () => void
}

export default function RemoveIcon({ onRemove }: Props) {
  return (
    <FaTrashCan
      className='p-[2px] bg-[#EFEFF1] rounded-md cursor-pointer border-[#E0E0E0] border-[1px] border-solid  hover:bg-[#647DB7] hover:text-white'
      size={26}
      onClick={onRemove}
    />
  );
}