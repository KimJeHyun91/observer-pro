import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import { HiOutlineExclamationCircle } from 'react-icons/hi';
import Avatar from '@/components/ui/Avatar';
import type { DialogProps } from '@/components/ui/Dialog';

interface AlertDialogProps extends DialogProps {
	message: string;
	onClose?: () => void;
	// ajy add 확인 버튼 클릭 시 실행할 함수 추가
	onConfirm?: () => void;
	status?: 'blue' | 'red'; // ✅ 상태 값 추가 (기본: blue)
}

export function AlertDialog({ message, onClose, onConfirm, status = 'blue', ...rest }: AlertDialogProps) {
	const statusClassMap = {
		blue: {
			bg: 'bg-blue-100 dark:bg-blue-500/20',
			text: 'text-blue-600 dark:text-blue-100',
		},
		red: {
			bg: 'bg-red-100 dark:bg-red-500/20',
			text: 'text-red-600 dark:text-red-100',
		},
	};
	const statusClasses = statusClassMap[status] || statusClassMap['blue'];

	return (
		<Dialog contentClassName="pb-0 px-0" {...rest} onClose={onClose} overlayClassName="z-[2000]" >
			<div className="px-6 pb-6 pt-2 flex">
				<div>
					<Avatar
						className={`${statusClasses.bg} ${statusClasses.text}`}
						shape="circle"
					>
						<span className="text-2xl">
							<HiOutlineExclamationCircle />
						</span>
					</Avatar>
				</div>
				<div className="ml-4 rtl:mr-4">
					<h5 className="mb-2">알림</h5>
					<p className="text-gray-700 text-sm whitespace-pre-line dark:text-[#FFFFFF]">{message}</p>
				</div>
			</div>
			<div className="px-6 py-3 bg-gray-100 dark:bg-gray-700 rounded-bl-2xl rounded-br-2xl">
				<div className="flex justify-end">
					<Button
						className="mr-3 w-[100px] h-[34px] bg-[#17A36F] rounded"
						size="sm"
						variant="solid"
						// ajy mod onClick 함수에 onConfirm 함수 추가 되게 수정
						// onClick={onClose}
						onClick={() => {
							if (onClose) onClose();
							if (onConfirm) onConfirm();
						}}
					>
						확인
					</Button>
				</div>
			</div>
		</Dialog>
	);
}