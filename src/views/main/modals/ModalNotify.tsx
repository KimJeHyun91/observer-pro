import Dialog from '@/components/ui/Dialog'
import { ModalNotifyType } from '@/@types/modal'
import { Button } from '@/components/ui';

type Props = {
    modal: {
        show: boolean;
        title: string;
    }
    children: React.ReactNode;
    toggle: ({ show, title }: ModalNotifyType) => void;
    modalChildRef?: React.RefObject<HTMLDivElement>;
}

const ModalNotify = ({
    modal: {
        show,
        title
    },
    children,
    toggle
}: Props) => {
    const onDialogClose = () => {
        toggle({
            show: false,
            title: ''
        })
    }

    return (
        <Dialog
            isOpen={show}
            contentClassName="pb-0 px-0"
            onClose={onDialogClose}
            onRequestClose={onDialogClose}
        >
            <div className="px-6 pb-6">
                <h5 className="mb-4">{title}</h5>
                {children}
                <div className='flex justify-center mt-4'>
                    <Button
                        variant="solid"
                        onClick={onDialogClose}
                    >확인</Button>
                </div>
            </div>
        </Dialog>
    )
}

export default ModalNotify
