import Button from '@/components/ui/Button'

type Props = {
    remove: () => void;
    type: string;
    closeModal: () => void;
    deleteTarget: { id: string; title: string } | null;
}

const RemoveData = ({remove, type, closeModal, deleteTarget} : Props ) => {
    const getName = (type : string) => {
        switch (type) {
            case 'RegisteredVehicles':
            case 'IdManagement' : 
            case 'parkingFeeMain' :
            case 'parkingFeeFloor' : 
            case 'parkingFeeLine' :
                return `${deleteTarget?.title}`;
            default:
                return ' 삭제 하시겠습니까?';
        }
    };
    
    const getMessage = (type : string) => {
        switch (type) {
            case 'RegisteredVehicles':
                return ' 등록 차량을 삭제 하시겠습니까?';
            case 'IdManagement' : 
                return ' 를 삭제 하시겠습니까?';
            case 'parkingFeeMain' : 
                return ' 주차장을 삭제 하시겠습니까?';
            case 'parkingFeeFloor' : 
                return ' 층을 삭제 하시겠습니까?';
            case 'parkingFeeLine' : 
                return ' 라인을 삭제 하시겠습니까?';
            default:
                return ' 삭제 하시겠습니까?';
        }
    };

    const name = getName(type);
    const message = getMessage(type);

    const removeClick = () =>{
        remove();
    }

    return (
        <div>
            <div className="absolute left-0 right-0 border-t border-gray-200 border-2 mt-[-7px] dark:border-gray-500"></div>

            <div className='pt-1'>
                <div className="mb-24 mt-20 text-center dark:text-[#FFFFFF]">
                   <span className='text-lg font-bold text-black dark:text-[#FFFFFF]'>`{name}`</span> 
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

export default RemoveData