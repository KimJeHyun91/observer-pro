import ModeSwitcher from './ModeSwitcher'
import { Button } from '@/components/ui'
import { useSessionUser } from '@/store/authStore';
import { useCallback, useState } from 'react';
import { DialogState } from '@/@types/inundation';
import useCheckOperatorPermission from '@/utils/hooks/useCheckOperatePermission';
import { apiSocketServiceReset } from '@/services/InundationService';
import { ConfirmDialog } from '@/components/shared';

const ThemeConfigurator = () => {
    const { user } = useSessionUser();
    const { checkAdminPermission } = useCheckOperatorPermission();

    const [dialogState, setDialogState] = useState<DialogState>({
        isOpen: false,
        type: 'alert',
        title: '',
        message: '',
    });
    const [isResetting, setIsResetting] = useState(false);

    const showDialog = useCallback((dialogConfig: Partial<DialogState>) => {
        setDialogState(prev => ({
            ...prev,
            isOpen: true,
            ...dialogConfig
        }));
    }, []);

    const closeDialog = useCallback(() => {
        setDialogState(prev => ({ ...prev, isOpen: false }));
    }, []);


    const handleResetSocket = async () => {
        if (!checkAdminPermission(showDialog)) return;

        const confirmed = await new Promise<boolean>((resolve) => {
            showDialog({
                type: 'confirm',
                title: '소켓 서비스 재설정',
                message: '소켓 서비스를 재설정하시겠습니까? 모든 클라이언트의 연결이 일시적으로 끊어질 수 있습니다.',
                onConfirm: () => {
                    closeDialog();
                    resolve(true);
                },
                onCancel: () => {
                    closeDialog();
                    resolve(false);
                },
            });
        });

        if (!confirmed) return;

        try {
            setIsResetting(true);
            await apiSocketServiceReset();
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (error) {
            console.error('Error resetting socket service:', error);
            showDialog({
                type: 'alert',
                title: '오류',
                message: '소켓 서비스 재설정 중 오류가 발생했습니다.',
                onConfirm: closeDialog,
            });
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <div className="flex flex-col justify-between">
            <ConfirmDialog
                isOpen={dialogState.isOpen}
                onCancel={closeDialog}
                onConfirm={() => {
                    dialogState.onConfirm?.();
                    closeDialog();
                }}
                type="danger"
                title={dialogState.title}
                cancelText="취소"
                confirmText="확인"
                confirmButtonProps={{
                    color: 'red-600',
                }}
            >
                {dialogState.message}
            </ConfirmDialog>
            <div className="flex flex-col gap-y-10 mb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h6>다크 모드</h6>
                        <span>다크모드 활성화</span>
                    </div>
                    <ModeSwitcher />
                </div>
                <div className="flex items-center mb-3">
                    <div>
                        <h6>❗ 서비스 재시작</h6>
                        <span></span>
                    </div>
                    {user && user.userRole === 'admin' && (
                        <div className="ml-auto">
                            <Button
                                onClick={handleResetSocket}
                                disabled={isResetting}
                                className={`
                                    h-8 px-4 bg-gray-600 text-white rounded hover:bg-gray-700 text-center
                                    ${isResetting ? 'opacity-50 cursor-not-allowed' : ''}
                                `}
                            >
                                {isResetting ? '재설정 중...' : '서비스 재시작'}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ThemeConfigurator