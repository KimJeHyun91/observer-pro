import { IoCloseCircleOutline } from 'react-icons/io5';

type Props = {
  onClose: () => void;
}

export default function CloseIcon({ onClose }: Props) {
  return (
    <IoCloseCircleOutline
      size={26}
      color='#D76767'
      className='p-[2px] bg-white rounded-md cursor-pointer border-[#BEC3CC] border-[1px] border-solid'
      onClick={onClose}
    />
  );
}