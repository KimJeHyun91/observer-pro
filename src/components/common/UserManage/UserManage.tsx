import { useState, useRef, useEffect } from 'react';
import { FaUsers } from 'react-icons/fa';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { useSessionUser } from '@/store/authStore';
import { useGetUser } from '@/utils/hooks/useUserManage';
import { apiAddUser, apiModifyUser, apiDeleteUser } from '@/services/CommonService';

type UserData = {
  id: string;
  userName: string;
  userRole: 'admin' | 'user' | 'viewer';
  password?: string;
  enable?: boolean;
};

type ConfirmDialogState = {
  isOpen: boolean;
  idToDelete: string | null;
};

const UserManage = () => {
  const { user } = useSessionUser();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data, mutate } = useGetUser();
  const [users, setUsers] = useState<UserData[]>([]);
  const [newUser, setNewUser] = useState<UserData>({ id: '', userName: '', password: '', userRole: 'user' });
  const [searchTerm, setSearchTerm] = useState('');
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({ isOpen: false, idToDelete: null });
  const isAdmin = user?.userId === 'admin00' && user?.userRole === 'admin';
  const [editUser, setEditUser] = useState<UserData & { prevPassword?: string; newPassword?: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const tableContainerRef = useRef<HTMLDivElement>(null);

  const filteredUsers = (users || []).filter((user) =>
    user.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleScroll = () => {
      const header = document.querySelector('.table-header');
      if (header && tableContainerRef.current) {
        header.scrollLeft = tableContainerRef.current.scrollLeft;
      }
    };

    const tableContainer = tableContainerRef.current;
    if (tableContainer) {
      tableContainer.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (tableContainer) {
        tableContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  useEffect(() => {
    if (data) {
      const mappedData = data.map((item: { id: string; user_name: string; user_role: string; enable: boolean }) => ({
        id: item.id,
        userName: item.user_name,
        userRole: item.user_role,
        enable: item.enable,
        password: undefined,
      }));
      setUsers(mappedData);
    }
  }, [data]);

  const validatePassword = (password: string): boolean =>
    password.length >= 8 && /[A-Z]/.test(password) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(password);

  const validateForm = (user: Partial<UserData & { prevPassword?: string; newPassword?: string }>, confirm?: string) => {
    const errors: { [key: string]: string } = {};

    if (!user.id) errors.id = 'ID 필수';
    if (!user.userName) errors.userName = '이름 필수';

    if (!editUser) {
      if (!user.password) errors.password = '비밀번호 필수';
      if (user.password && !validatePassword(user.password)) errors.password = '8자 이상, 대문자, 특수문자 포함';
      if (user.password !== confirm) errors.passwordConfirm = '비밀번호 불일치';
    }
    else {
      if (!user.prevPassword) errors.prevPassword = '이전 비밀번호 필수';

      if (user.newPassword) {
        if (!validatePassword(user.newPassword)) {
          errors.newPassword = '8자 이상, 대문자, 특수문자 포함';
        }
      }
    }

    return errors;
  };

  const handleCreate = async () => {
    const errors = validateForm(newUser, passwordConfirm);
    if (Object.keys(errors).length) return setValidationErrors(errors);
    if (users.some((u) => u.id === newUser.id)) return setValidationErrors({ id: 'ID 중복' });

    const userToCreate = {
      id: newUser.id,
      user_name: newUser.userName,
      password: newUser.password,
      user_role: newUser.userRole,
      enable: true,
    };

    try {
      await apiAddUser(userToCreate);
      mutate();
      setNewUser({ id: '', userName: '', password: '', userRole: 'user' });
      setPasswordConfirm('');
      setValidationErrors({});
    } catch (error) {
      console.error('추가 실패:', error);
    }
  };

  const handleEdit = (user: UserData) => {
    setEditUser({
      ...user,
      prevPassword: '',
      newPassword: '',
    });
    setValidationErrors({});
    setErrorMessage(null);
  };

  const handleUpdate = async () => {
    if (!editUser) return;

    const errors = validateForm(editUser);
    if (Object.keys(errors).length) return setValidationErrors(errors);

    const userToUpdate = {
      id: editUser.id,
      prev_password: editUser.prevPassword,
      new_password: editUser.newPassword || undefined,
      new_user_name: editUser.userName,
      new_enable: editUser.enable ?? true,
      operatorId: user?.userId,
      changes: { passwordChanged: !!editUser.newPassword },
    };

    try {
      const response = await apiModifyUser(userToUpdate) as any;
      if (!response.status) throw new Error(response.message || '수정 실패');
      mutate();
      setEditUser(null);
      setValidationErrors({});
      setErrorMessage(null);
    } catch (error) {
      console.error('수정 실패:', error);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmDialog({ isOpen: true, idToDelete: id });
  };

  const confirmDelete = async () => {
    if (confirmDialog.idToDelete) {
      try {
        const response = await apiDeleteUser({ id: confirmDialog.idToDelete, operatorId: user?.userId }) as any;
        if (!response.status) throw new Error(response.message || '삭제 실패');
        mutate();
        setConfirmDialog({ isOpen: false, idToDelete: null });
        setErrorMessage(null);
      } catch (error) {
        console.error('삭제 실패:', error);
      }
    }
  };

  const cancelDelete = () => {
    setConfirmDialog({ isOpen: false, idToDelete: null });
  };

  return (
    <div className="relative">
      {isAdmin && (
        <button
          className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
          title='사용자 관리'
          onClick={() => setIsDialogOpen(!isDialogOpen)}
        >
          <FaUsers className="w-5 h-5 text-gray-700 dark:text-gray-400" />
        </button>
      )}

      <Dialog
        isOpen={confirmDialog.isOpen}
        onClose={cancelDelete}
        width={400}
        className="z-[60]"
      >
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-2">삭제 확인</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">이 사용자를 삭제하시겠습니까?</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="solid" size="sm" onClick={cancelDelete} className="w-[70px] h-[40px] bg-[#D9DCE3] rounded">
              취소
            </Button>
            <Button variant="solid" size="sm" onClick={confirmDelete} className="w-[70px] h-[40px] bg-[#17A36F] rounded">
              삭제
            </Button>
          </div>
        </div>
      </Dialog>

      {isDialogOpen && isAdmin && (
        <div className="absolute right-0 top-full mt-1 w-[950px] bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">사용자 관리</h3>
              <button
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
                onClick={() => setIsDialogOpen(false)}
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="mb-2 p-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-sm">
                {errorMessage}
              </div>
            )}

            <Input
              placeholder="검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full mb-2 text-sm"
            />

            <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="grid grid-cols-5 gap-2">
                <div className="col-span-1">
                  <Input
                    placeholder="ID"
                    value={newUser.id}
                    onChange={(e) => setNewUser({ ...newUser, id: e.target.value })}
                    className={`text-sm ${validationErrors.id ? 'border-red-500' : ''}`}
                  />
                  {validationErrors.id && <span className="text-red-500 text-xs">{validationErrors.id}</span>}
                </div>
                <div className="col-span-1">
                  <Input
                    placeholder="이름"
                    value={newUser.userName}
                    onChange={(e) => setNewUser({ ...newUser, userName: e.target.value })}
                    className={`text-sm ${validationErrors.userName ? 'border-red-500' : ''}`}
                  />
                  {validationErrors.userName && <span className="text-red-500 text-xs">{validationErrors.userName}</span>}
                </div>
                <div className="col-span-1">
                  <Input
                    placeholder="비밀번호"
                    type="password"
                    value={newUser.password || ''}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className={`text-sm ${validationErrors.password ? 'border-red-500' : ''}`}
                  />
                  {validationErrors.password && <span className="text-red-500 text-xs">{validationErrors.password}</span>}
                </div>
                <div className="col-span-1">
                  <Input
                    placeholder="비밀번호 확인"
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    className={`text-sm ${validationErrors.passwordConfirm ? 'border-red-500' : ''}`}
                  />
                  {validationErrors.passwordConfirm && (
                    <span className="text-red-500 text-xs">{validationErrors.passwordConfirm}</span>
                  )}
                </div>
                <div className="col-span-1 flex gap-1">
                  <select
                    value={newUser.userRole}
                    onChange={(e) => setNewUser({ ...newUser, userRole: e.target.value as 'user' | 'viewer' })}
                    className="text-sm flex-grow border rounded p-1 h-12"
                  >
                    <option value="user">사용자</option>
                    <option value="viewer">뷰어</option>
                  </select>
                  <Button variant="solid" size="sm" onClick={handleCreate} className="w-[50px] h-[46px] bg-[#17A36F] rounded">
                    추가
                  </Button>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded">
              <div className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 sticky top-0 z-20 table-header">
                <div className="grid grid-cols-6 px-2 py-1 text-sm text-center font-medium">
                  <div className="w-full text-left px-2">ID</div>
                  <div className="w-full text-left px-2">이름</div>
                  <div className="w-full text-left px-2">이전 비밀번호</div>
                  <div className="w-full text-left px-2">새 비밀번호</div>
                  <div className="w-full text-left px-2">권한</div>
                  <div className="w-full text-right px-2">관리</div>
                </div>
              </div>

              <div
                ref={tableContainerRef}
                className="max-h-[300px] overflow-y-auto"
                style={{ scrollbarWidth: 'thin' }}
              >
                {filteredUsers.length === 0 ? (
                  <div className="py-3 text-center text-gray-500 dark:text-gray-400 text-sm">
                    결과 없음
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="grid grid-cols-6 px-2 py-1 text-sm border-b border-gray-200 dark:border-gray-700"
                    >
                      <div className="px-2">
                        {user.id}
                      </div>
                      <div className="px-2">
                        {editUser?.id === user.id ? (
                          <Input
                            value={editUser.userName}
                            onChange={(e) => setEditUser({ ...editUser, userName: e.target.value })}
                            className={`text-sm ${validationErrors.userName ? 'border-red-500' : ''}`}
                          />
                        ) : (
                          user.userName
                        )}
                      </div>
                      <div className="px-2">
                        {editUser?.id === user.id ? (
                          <div>
                            <Input
                              type="password"
                              placeholder="이전 비밀번호"
                              value={editUser.prevPassword || ''}
                              onChange={(e) => setEditUser({ ...editUser, prevPassword: e.target.value })}
                              className={`text-sm ${validationErrors.prevPassword ? 'border-red-500' : ''}`}
                            />
                            {validationErrors.prevPassword && (
                              <span className="text-red-500 text-xs">{validationErrors.prevPassword}</span>
                            )}
                          </div>
                        ) : (
                          '******'
                        )}
                      </div>
                      <div className="px-2">
                        {editUser?.id === user.id ? (
                          <div>
                            <Input
                              type="password"
                              placeholder="새 비밀번호 (선택)"
                              value={editUser.newPassword || ''}
                              onChange={(e) => setEditUser({ ...editUser, newPassword: e.target.value })}
                              className={`text-sm ${validationErrors.newPassword ? 'border-red-500' : ''}`}
                            />
                            {validationErrors.newPassword && (
                              <span className="text-red-500 text-xs">{validationErrors.newPassword}</span>
                            )}
                          </div>
                        ) : (
                          '******'
                        )}
                      </div>
                      <div className="px-2">
                        {editUser?.id === user.id ? (
                          <select
                            value={editUser.userRole}
                            onChange={(e) => setEditUser({ ...editUser, userRole: e.target.value as 'user' | 'viewer' })}
                            className="text-sm w-full border rounded p-1"
                          >
                            <option value="user">사용자</option>
                            <option value="viewer">뷰어</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs ${user.userRole === 'admin'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : user.userRole === 'user'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}
                          >
                            {user.userRole === 'admin' ? '관리자' : user.userRole === 'user' ? '사용자' : '뷰어'}
                          </span>
                        )}
                      </div>
                      <div className="px-2 text-right">
                        {editUser?.id === user.id ? (
                          <div className="flex gap-1 justify-end">
                            <Button variant="solid" size="xs" onClick={handleUpdate} className="w-[50px] h-[34px] bg-[#17A36F] rounded">
                              저장
                            </Button>
                            <Button variant="solid" size="xs" onClick={() => setEditUser(null)} className=" w-[50px] h-[34px] bg-[#D9DCE3] rounded">
                              취소
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-1 justify-end">
                            <Button variant="solid" size="xs" onClick={() => handleEdit(user)} className="w-[50px] h-[34px] bg-[#17A36F] rounded">
                              수정
                            </Button>
                            {user.userRole !== 'admin' && (
                              <Button variant="solid" size="xs" onClick={() => handleDelete(user.id)} className="w-[50px] h-[34px] bg-[#D9DCE3] rounded">
                                삭제
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManage;