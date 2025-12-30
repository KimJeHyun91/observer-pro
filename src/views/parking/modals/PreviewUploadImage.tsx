import { PreviewImage } from '@/@types/parking';
import Button from '@/components/ui/Button'

type Props = {
    previewData : PreviewImage | null
    closeModal: () => void;
    onSave: () => void;
}

const PreviewUploadImage = ({previewData, closeModal, onSave} : Props) => {
    const uploadImage = () => {
        onSave();
    };
    
    return (

        <div>
            <div className="absolute left-0 right-0 border-t border-gray-200 border-2 dark:border-gray-500"></div>

            <div className='pt-6'>
                <div className="w-full h-[400px] bg-gray-100 flex items-center justify-center p-3 rounded-md overflow-hidden">
                    {previewData?.path ? (
                        <img
                            src={previewData.path}
                            alt={previewData.file.name || 'Preview'}
                            className="max-w-full max-h-full object-contain"
                        />
                    ) : (
                        <span className="text-gray-500">변경 된 이미지가 없습니다.</span>
                    )}
                </div>
            </div>

            <div className="absolute left-0 right-0 border-t border-gray-200 border-2 mt-5 dark:border-gray-500"></div>

            <div className="flex justify-end space-x-2 mt-10">
                <Button
                    className="mr-3 w-[100px] h-[34px] bg-[#D9DCE3] rounded "
                    size="sm"
                    onClick={closeModal}
                >
                    취소
                </Button>
                
                <Button
                    className="mr-3 w-[100px] h-[34px] bg-[#17A36F] rounded"
                    size="sm"
                    variant="solid"
                    onClick={uploadImage}
                >
                    저장
                </Button>
            </div>
        </div>
    )
}

export default PreviewUploadImage