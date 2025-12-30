import { FaRegEdit } from "react-icons/fa";

type Props = {
  onEditMode: () => void
}

export default function EditIcon({ onEditMode }: Props) {
  return (
    <FaRegEdit
      className='p-[1px] bg-[#EFEFF1] rounded-md cursor-pointer text-[#BEC3CC] border-[#E0E0E0] border-[1px] border-solid hover:bg-[#647DB7] hover:text-white'
      size={26}
      onClick={onEditMode}
    />
  );
}