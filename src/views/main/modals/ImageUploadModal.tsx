import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import { ImageUploadModalType } from '../BuildingDashboard'

type Props = {
  show: boolean;
  imageURL: string;
  title: string;
  toggle: ({ show, title, imageURL }: ImageUploadModalType) => void
  confirm: () => void;
}

const buttonStyle = 'border-[#BEC8BA] border-[1px] border-solid rounded-sm w-[120px] h-[34px] flex justify-center items-center';
const seperatorStyle = 'bg-[#D9DCE3] w-[970px] h-[1px] relative right-[1.5rem]';

const ImageUploadModal = ({ show, imageURL, title, toggle, confirm }: Props) => {
  const closeModal = () => {
    toggle({
      show: false,
      imageURL: '',
      title: '',
    })
  }

  return (
    <Dialog
      isOpen={show}
      width={970}
      height={650}
      onClose={closeModal}
      onRequestClose={closeModal}
    >
      <div className='flex flex-col h-full justify-between relative'>
        <div>
          <h5 className="pb-4">{title}</h5>
        </div>
        <div className={seperatorStyle}></div>
        <section className={'flex justify-center h-[32rem] items-center'}>
          <img src={imageURL} className={'h-[30rem] object-cover'} />
        </section>
        <div className={seperatorStyle}></div>
        <section className='flex justify-end'>
          <div className="pt-6 w-[16rem] flex justify-between">
            <Button
              variant='plain'
              className={`ltr:mr-2 rtl:ml-2 bg-[#EDF0F6] ${buttonStyle}`}
              onClick={closeModal}
            >
              취소
            </Button>
            <Button variant="solid" className={`bg-[#17A36F] ${buttonStyle}`} onClick={confirm}  >
              저장
            </Button>
          </div>
        </section>
      </div>
    </Dialog>
  )
}

export default ImageUploadModal
