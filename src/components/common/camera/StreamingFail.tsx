import { MdOutlineSmsFailed } from "react-icons/md";

type Props = {
  message: string;
}

export default function StreamingFail({ message }: Props) {

  return (
    <div className='flex flex-col justify-center items-center'>
      <MdOutlineSmsFailed size={50} />
      <p>{message}</p>
    </div>
  );

}