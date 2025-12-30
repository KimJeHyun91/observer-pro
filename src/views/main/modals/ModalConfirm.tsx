import Dialog from '@/components/ui/Dialog'
import { ModalConfirmType } from '@/@types/modal'
import { Button } from '@/components/ui';

type Props = {
    modal: {
        show: boolean;
        type: 'delete' | 'modify' | 'control' | '';
        title: string;
    }
    children: React.ReactNode;
    toggle: ({ show, type, title }: ModalConfirmType) => void;
    confirm: (type: 'delete' | 'modify' | 'control' | '') => Promise<number | void>;
    modalChildRef?: React.RefObject<HTMLDivElement>;
    loading?: boolean;
}

const ModalConfirm = ({
    modal: {
        show,
        type,
        title
    },
    children,
    toggle,
    loading,
    confirm
}: Props) => {
    const onDialogClose = () => {
        toggle({
            show: false,
            type: '',
            title: ''
        })
    }

    const onConfirm = async () => {
        const res = await confirm(type);
        if (res === 1) {
            onDialogClose();
        }
    }

    const confirmButton = () => {
        if (type === 'delete') {
            return '삭제';
        } else if (type === 'modify') {
            return '수정';
        } else {
            return '확인';
        }
    }

    return (
        <Dialog
            isOpen={show}
            contentClassName="pb-0 px-0"
            onClose={onDialogClose}
            onRequestClose={onDialogClose}
        >
            <section className="px-6 pb-6">
                <h5 className='mb-6'>{title}</h5>
                <div className='bg-[#D9DCE3] w-[32.3rem] h-[1px] absolute left-[0.1rem]' />
                <main className='p-4 font-semibold text-[1.25rem] text-[#4E4A4A] dark:text-[#f5f5f5]'>
                    {children}
                </main>
                <div className='bg-[#D9DCE3] w-[32.3rem] h-[1px] absolute left-[0.1rem]' />
                <div className='flex justify-center mt-6 gap-4'>
                    <Button
                        variant='default'
                        disabled={loading}
                        onClick={onDialogClose}
                    >
                        취소
                    </Button>
                    <Button
                        variant="default"
                        disabled={loading}
                        style={{ backgroundColor: type === 'delete' ? '#D76767' : '', color: type === 'delete' ? '#fff' : '' }}
                        onClick={onConfirm}
                    >{confirmButton()}</Button>
                </div>
            </section>
        </Dialog>
    )
}

export default ModalConfirm
