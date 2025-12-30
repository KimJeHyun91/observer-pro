import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import { HiOutlineExclamationCircle } from 'react-icons/hi';
import Avatar from '@/components/ui/Avatar';
import type { DialogProps } from '@/components/ui/Dialog';

interface AlertDialogProps extends DialogProps {
	message: string;
	title?: string;
	onClose?: () => void;
	onConfirm?: () => void;
	type?: 'alert' | 'confirm';
}

export function CommonAlertDialog({
	message,
	title = '알림',
	onClose,
	onConfirm,
	type = 'alert',
	className = '',
	...rest
}: AlertDialogProps) {
	const handleConfirm = () => {
		if (onConfirm) {
			onConfirm();
		}
		onClose?.();
	};

	return (
		<Dialog
			contentClassName={`pb-0 px-0 z-[999] dialog-content-location ${className}`}
			overlayClassName="z-[998]"
			{...rest}
			onClose={onClose}
		>
			<div className="px-6 pb-6 pt-2 flex">
				<div>
					<Avatar
						className="bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-100"
						shape="circle"
					>
						<span className="text-2xl">
							<HiOutlineExclamationCircle />
						</span>
					</Avatar>
				</div>
				<div className="ml-4 rtl:mr-4">
					<h5 className="mb-2">{title}</h5>
					<p className="text-gray-700 text-sm whitespace-pre-line dark:text-gray-50">{message}</p>
				</div>
			</div>
			<div className="px-6 py-3 bg-gray-100 dark:bg-gray-700 rounded-bl-2xl rounded-br-2xl dark:text-red-50">
				<div className="flex justify-end gap-2">
					{type === 'confirm' && (
						<Button
							className="mr-3 w-[100px] h-[34px] bg-[#D9DCE3] rounded"
							size="sm"
							onClick={onClose}
						>
							취소
						</Button>
					)}
					<Button
						className="mr-3 w-[100px] h-[34px] bg-[#17A36F] rounded"
						size="sm"
						variant="solid"
						onClick={handleConfirm}
					>
						확인
					</Button>
				</div>
			</div>
		</Dialog>
	);
}