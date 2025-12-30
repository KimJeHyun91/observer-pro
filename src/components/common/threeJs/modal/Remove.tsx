import Button from '@/components/ui/Button'

type Props = {
    remove: () => void
    type: string
    closeModal: () => void
    deleteTarget: { title: string } | null
}

const Remove = ({ remove, type, closeModal, deleteTarget }: Props) => {
    const getName = (type: string) => {
        switch (type) {
            case 'threeJsModel':
            case 'threeJsDevice':
            case 'ManageDevice':
                return `${deleteTarget?.title}`

            default:
                return ' 삭제 하시겠습니까?'
        }
    }

    const getMessage = (type: string) => {
        switch (type) {
            case 'threeJsModel':
                return (
                    <>
                        해당 모델을 삭제하시겠습니까? <br />
                        <span className="text-red-600 font-semibold">
                            (선택 된 모델의 하위 모든 객체는 전부 삭제 됩니다)
                        </span>
                    </>
                )
            case 'threeJsDevice':
                return (
                    <>
                        해당 장비를 삭제하시겠습니까? <br />
                        <span className="text-red-600 font-semibold">
                            (삭제 후에는 작업을 되돌릴 수 없습니다)
                        </span>
                    </>
                )
            case 'ManageDevice':
                return (
                    <>
                        해당 장비를 삭제하시겠습니까? <br />
                        <span className="text-red-600 font-semibold">
                            (삭제 시 연관된 모든 현장에서 장비가 전부
                            삭제됩니다)
                        </span>
                    </>
                )
            default:
                return ' 삭제 하시겠습니까?'
        }
    }

    const name = getName(type)
    const message = getMessage(type)

    const removeClick = () => {
        remove()
    }

    return (
        <div>
            <div className="absolute left-0 right-0 border-t border-gray-200 border-2 mt-[-7px] dark:border-gray-500"></div>

            <div className="pt-1">
                <div className="mb-24 mt-20 text-center dark:text-[#FFFFFF]">
                    <span className="text-lg font-bold text-black dark:text-[#FFFFFF]">
                        `{name}`
                    </span>{' '}
                    {message}
                </div>
            </div>

            <div className="absolute left-0 right-0 border-t border-gray-200 border-2 mt-[-17px] dark:border-gray-500"></div>

            <div className="flex justify-center space-x-12">
                <Button
                    className="mr-3 w-[100px] h-[34px] bg-[#D9DCE3] rounded "
                    size="sm"
                    onClick={closeModal}
                >
                    취소
                </Button>

                <Button
                    className="mr-3 w-[100px] h-[34px] bg-[#D76767] rounded"
                    size="sm"
                    variant="solid"
                    onClick={removeClick}
                >
                    삭제
                </Button>
            </div>
        </div>
    )
}

export default Remove