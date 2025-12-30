import { useSessionUser } from "@/store/authStore";
import { DialogState } from '@/@types/inundation';

interface UseCheckOperatorPermissionReturn {
	checkAdminPermission: (showDialog: (config: Partial<DialogState>) => void) => boolean;
	isAdmin: boolean;
}


const useCheckOperatorPermission = (): UseCheckOperatorPermissionReturn => {
	const { user } = useSessionUser();

	const isAdmin = user?.userRole === 'admin';

	const checkAdminPermission = (showDialog: (config: Partial<DialogState>) => void): boolean => {
		if (!isAdmin && typeof showDialog === 'function') {
			showDialog({
				type: 'alert',
				title: '권한 없음',
				message: '이 작업을 수행할 권한이 없습니다. 관리자에게 문의하세요.',
			});
		}

		return isAdmin;
	};

	return { checkAdminPermission, isAdmin };
};

export default useCheckOperatorPermission;