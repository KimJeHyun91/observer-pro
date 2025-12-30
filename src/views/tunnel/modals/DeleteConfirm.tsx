import { Button, Dialog } from '@/components/ui'
import React from 'react'

interface DeleteConfirmProps {
    show: boolean
    title: string
    contents: string
    onClose: () => void
    onConfirm: () => void
}

const DeleteConfirm = ({
    show,
    title,
    contents,
    onClose,
    onConfirm,
}: DeleteConfirmProps) => {
    return (
        <Dialog
            contentClassName="pb-4 px-0 py-0"
            isOpen={show}
            closable={false}
        >
            <h5 className="p-3 pt-3">{title} 삭제</h5>
            <div className="flex justify-center items-center border-t-2 border-b-2 h-[120px]">
                <p className="text-[.97rem] font-bold">
                    {contents} 삭제하시겠습니까?
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
                    className=" w-[100px] h-[34px] mt-2 bg-[#d56666] text-white px-4 py-1 rounded hover:bg-[#b0b3b9]"
                    onClick={() => onConfirm()}
                >
                    삭제
                </Button>
            </div>
        </Dialog>
    )
}

export default DeleteConfirm
