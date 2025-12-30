import Dialog from '@/components/ui/Dialog'
import { ModalType } from '@/@types/modal'

type Props = {
  modal: {
    show: boolean;
    type: string;
    title: string;
  }
  children?: React.ReactNode;
  noHeaderLine?: boolean;
  toggle: ({ show, type, title }: ModalType) => void;
  modalChildRef?: React.RefObject<HTMLDivElement>;
}

const ModalSetting = ({
  modal: {
    show,
    // type,
    title
  },
  children,
  toggle,
  noHeaderLine
}: Props) => {

  const onDialogClose = () => {
    toggle({
      show: false,
      type: '',
      title: ''
    })
  }

  return (
    <Dialog
      isOpen={show}
      contentClassName="pb-0 px-0 rounded-sm w-[36.25rem] "
      onClose={onDialogClose}
      onRequestClose={onDialogClose}
    >
      <div className="px-4 pb-6">
        <header className='mb-8'>
          <h5 className="mb-2">{title}</h5>
          {!noHeaderLine && <div className='bg-[#EDF0F6] w-full h-[2px] absolute left-0' />}
        </header>
        {children}
      </div>
    </Dialog >
  )
}

export default ModalSetting
