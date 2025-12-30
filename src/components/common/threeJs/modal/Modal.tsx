import Dialog from '@/components/ui/Dialog'
import { ModalType } from '@/@types/modal'

type Props = {
    modal: {
        show: boolean;
        type: string;
        title: string;
    }
    children: React.ReactNode;
    toggle: ({ show, type, title }: ModalType) => void;
    modalChildRef: React.RefObject<HTMLDivElement>;
    width?: number;
    onClose?: () => void;
}

const Modal = ({
    modal: {
        show,
        // type,
        title
    },
    children,
    toggle,
    width = 520,
    onClose
}: Props) => {

    const onDialogClose = () => {
        toggle({
            show: false,
            type: '',
            title: ''
        })

        if (onClose) {
            onClose();
        }
    }

    return (
        <Dialog
            isOpen={show}
            contentClassName="pb-0 px-0"
            width={width}
            onClose={onDialogClose}
            onRequestClose={onDialogClose}
        >
            <div className="px-6 pb-6">
                <h5 className="mb-4">{title}</h5>
                {children}
            </div>
        </Dialog>
    )
}

export default Modal