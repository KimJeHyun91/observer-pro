import { GoIssueClosed } from "react-icons/go";

type Props = {
  onConfirm: () => void
}

export default function ConfirmIcon({ onConfirm }: Props) {
  return (
    <GoIssueClosed
      className='p-[2px] bg-white rounded-md cursor-pointer border-[#BEC3CC] border-[1px] border-solid'
      size={30}
      color='#57AF68'
      onClick={onConfirm}
    />
  );
}