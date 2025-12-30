import { GrPowerReset } from "react-icons/gr";

type Props = {
  reset: () => void;
}

export default function ResetIcon({ reset }: Props) {

  return (
    <GrPowerReset
      className='p-[2px] bg-white rounded-md cursor-pointer border-[#BEC3CC] border-[1px] border-solid'
      size={30}
      onClick={reset} />
  );
}