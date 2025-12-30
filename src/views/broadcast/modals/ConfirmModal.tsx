import { Button, Dialog } from '@/components/ui'
import React from 'react'

interface ConfirmModalProps {
    show: boolean
    title?: string
    contents: string
    buttonName: string
    onClose: () => void
    onConfirm: () => void
    isBtnColor?: string
    loadingBtn?: boolean
}

const ConfirmModal = ({
    show,
    title,
    contents,
    buttonName,
    onClose,
    onConfirm,
    isBtnColor,
    loadingBtn
}: ConfirmModalProps)  => {
  return (
    <Dialog
    contentClassName="pb-4 px-0 py-0"
    isOpen={show}
    closable={false}
>
   <h5 className={`${!title && 'h-[50px]' } p-3 pt-3`}>{title}</h5>
    <div className="flex justify-center items-center border-t-2 border-b-2 h-[120px]">
        <p className="text-[.97rem] font-bold dark:text-white">
            {contents}
        </p>
    </div>
    <div className="flex justify-center items-center mt-2 gap-5">
        <Button
            type="submit"
            className=" w-[100px] h-[34px] mt-2 bg-[#aeafb1] text-white px-4 py-1 rounded hover:bg-[#b0b3b9]"
            onClick={() => onClose()}
        >
            취소
        </Button>
        <Button
            type="submit"
            loading={loadingBtn}
            className={`${isBtnColor ?? 'bg-[#17a36f]'} w-[100px] h-[34px] mt-2  text-white dark:bg-[#17a36f] px-4 py-1 rounded hover:bg-[#b0b3b9]`}
            onClick={() => onConfirm()}
        >
            {buttonName}
        </Button>
    </div>
</Dialog>
  )
}

export default ConfirmModal
