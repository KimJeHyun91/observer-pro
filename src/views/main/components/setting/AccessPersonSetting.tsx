import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button, Checkbox } from '@/components/ui';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { apiGetAccessCtlPerson, apiModifyAccessCtlPerson, apiRemoveAccessCtlPerson } from '@/services/ObserverService';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import SMSSettingTime from './section/SMSSettingTime';
import ModalConfirm from '../../modals/ModalConfirm';
import { ModalConfirmType } from '@/@types/modal';

// 타입 정의
export type AccessPerson = {
  idx: number;
  student_id: string;
  student_name: string;
  student_contact: string;
  school_id: string;
  school_name: string;
  class_id: string;
  class_name: string;
  next_of_kin_name: string;
  next_of_kin_contact1: string;
  next_of_kin_contact2: string;
  use_sms: boolean;
};

export type UseSMSTime = {
  index: number;
  use: boolean;
  startTime: string;
  endTime: string;
}

export default function AccessPersonSetting() {
  const methods = useForm();
  const { handleSubmit, control, reset } = methods;
  const [accessPerson, setAccessPerson] = useState<AccessPerson[]>([]);
  const [modifyPerson, setModifyPerson] = useState<number | null>(null);
  const [modalConfirm, setModalConfirm] = useState<ModalConfirmType>({
    show: false,
    title: '',
    type: ''
  });
  const [confirmMsg, setConfirmMsg] = useState('');
  const [, forceRender] = useState(false); // 렌더링 트리거용
  let currPage = useRef<number | null>(null);
  let editingRowData = useRef<Partial<AccessPerson>>({});
  let removePersonIdx = useRef<number | null>(null);
  const handleToggleUseSMS = async (data: Omit<AccessPerson, 'student_id' | 'student_name' | 'student_contact' | 'school_id' | 'school_name' | 'class_id' | 'class_name'>) => {
    currPage.current = table.getState().pagination.pageIndex;
    const result = await apiModifyAccessCtlPerson(data);
    if (result === 'OK') {
      await handleGetAccessCtlPerson({});
    };
  };

  const handleGetAccessCtlPerson = async ({ studentId, studentName, className }: {
    studentId?: string,
    studentName?: string,
    className?: string
  }) => {
    const result = await apiGetAccessCtlPerson<AccessPerson[]>({
      studentId,
      studentName,
      className
    });
    setAccessPerson(result);
  };

  const toggleModalConfirm = ({ show, title, type }: ModalConfirmType) => {
    setModalConfirm({
      show,
      title,
      type
    });
  };

  const confirmRemove = async () => {
    if (removePersonIdx.current == null) {
      return;
    };
    try {
      apiRemoveAccessCtlPerson({
        idx: removePersonIdx.current
      }).then(() => {
        removePersonIdx.current = null;
        toggleModalConfirm({
          show: false,
          title: '',
          type: ''
        });
        handleGetAccessCtlPerson({});
      });
    } catch (err) {
      console.error(err);
    };
  };

  const columns: ColumnDef<AccessPerson>[] = useMemo(() => [
    {
      header: '번호',
      accessorKey: 'student_id',
      meta: { style: { width: '3rem' } },
      cell: ({ row }) => <p className='text-center'>{row.original.student_id}</p>,
    },
    {
      header: '학생 이름',
      accessorKey: 'student_name',
      meta: { style: { width: '4.5rem' } },
    },
    {
      header: '학생 연락처',
      accessorKey: 'student_contact',
      meta: { style: { width: '6.5rem' } },
    },
    {
      header: '소속',
      accessorKey: 'class_name',
      meta: { style: { width: '4.5rem' } },
    },
    {
      header: '보호자 이름',
      accessorKey: 'next_of_kin_name',
      meta: { style: { width: '6rem' } },
      cell: ({ row }) => modifyPerson === row.original.idx ? (
        <input
          className="border px-1 rounded-sm w-full"
          value={editingRowData.current.next_of_kin_name}
          onChange={(e) => {
            editingRowData.current = ({
              ...editingRowData.current,
              next_of_kin_name: e.target.value
            })
            forceRender((prev) => !prev);
          }}
        />
      ) : (
        <p className="text-center">{row.original.next_of_kin_name}</p>
      )
    },
    {
      header: '보호자 연락처1',
      accessorKey: 'next_of_kin_contact1',
      meta: { style: { width: '7rem' } },
      cell: ({ row }) => modifyPerson === row.original.idx ? (
        <input
          className="border px-1 rounded-sm w-full"
          value={editingRowData.current.next_of_kin_contact1}
          onChange={(e) => {
            editingRowData.current = ({
              ...editingRowData.current,
              next_of_kin_contact1: e.target.value
            });
            forceRender((prev) => !prev);
          }}
        />
      ) : (
        <p className="text-center">{row.original.next_of_kin_contact1}</p>
      )
    },
    {
      header: '보호자 연락처2',
      accessorKey: 'next_of_kin_contact2',
      meta: { style: { width: '7rem' } },
      cell: ({ row }) => modifyPerson === row.original.idx ? (
        <input
          className="border px-1 rounded-sm w-full"
          value={editingRowData.current.next_of_kin_contact2}
          onChange={(e) => {
            editingRowData.current = ({
              ...editingRowData.current,
              next_of_kin_contact2: e.target.value
            })
            forceRender((prev) => !prev)
          }}
        />
      ) : (
        <p className="text-center">{row.original.next_of_kin_contact2}</p>
      )
    },
    {
      header: () => (
        <Checkbox
          className="flex justify-center"
          checked={table.getRowModel()?.rows?.every((row) => row.original.use_sms)}
          onChange={() => {
            const isChecked = table.getRowModel()?.rows?.every((row) => row.original.use_sms);
            if (isChecked) {
              table.getRowModel()?.rows?.forEach((row) => {
                handleToggleUseSMS({
                  idx: row.original.idx,
                  next_of_kin_name: row.original.next_of_kin_name,
                  next_of_kin_contact1: row.original.next_of_kin_contact1,
                  next_of_kin_contact2: row.original.next_of_kin_contact2,
                  use_sms: false
                });
              });
            } else {
              table.getRowModel()?.rows?.forEach((row) => {
                handleToggleUseSMS({
                  idx: row.original.idx,
                  next_of_kin_name: row.original.next_of_kin_name,
                  next_of_kin_contact1: row.original.next_of_kin_contact1,
                  next_of_kin_contact2: row.original.next_of_kin_contact2,
                  use_sms: true
                });
              });
            }
          }}
        />
      ),
      id: 'use_sms',
      meta: { style: { width: '4rem', textAlign: 'center' } },
      cell: (props) => {
        const row = props.row.original;
        return (
          <Checkbox
            className='flex justify-center'
            checked={row.use_sms}
            onChange={(checked) => {
              handleToggleUseSMS({
                idx: row.idx,
                next_of_kin_name: row.next_of_kin_name,
                next_of_kin_contact1: row.next_of_kin_contact1,
                next_of_kin_contact2: row.next_of_kin_contact2,
                use_sms: !row.use_sms
              });
            }}
          />
        );
      }
    },
    {
      header: '관리',
      id: 'actions',
      meta: { style: { width: '7rem', textAlign: 'center' } },
      cell: ({ row }) => {
        const isEditing = modifyPerson === row.original.idx;
        return isEditing ? (
          <div
            className="flex gap-1 justify-center">
            <Button
              className="bg-green-500 text-white px-2 w-[2.5rem] h-[1.5rem] rounded-[3px] flex items-center justify-center"
              onClick={async () => {
                await handleToggleUseSMS({
                  idx: row.original.idx,
                  next_of_kin_name: editingRowData.current.next_of_kin_name ?? row.original.next_of_kin_name,
                  next_of_kin_contact1: editingRowData.current.next_of_kin_contact1 ?? row.original.next_of_kin_contact1,
                  next_of_kin_contact2: editingRowData.current.next_of_kin_contact2 ?? row.original.next_of_kin_contact2,
                  use_sms: row.original.use_sms,
                });
                setModifyPerson(null);
                editingRowData.current = {};
              }}
            >
              저장
            </Button>
            <Button
              className='w-[2.5rem] h-[1.5rem] rounded-[3px] bg-[#BEC3CC] text-[#F2F5F9] flex justify-center items-center'
              onClick={() => {
                setModifyPerson(null);
                editingRowData.current = {};
              }}
            >
              취소
            </Button>
          </div>
        ) : (
          <div className='flex justify-between'>
            <Button
              className="w-[2.5rem] h-[2rem] flex justify-center items-center bg-[#BEC3CC] text-[#616A79] m-auto"
              onClick={() => {
                setModifyPerson(row.original.idx);
                editingRowData.current = ({
                  next_of_kin_name: row.original.next_of_kin_name,
                  next_of_kin_contact1: row.original.next_of_kin_contact1,
                  next_of_kin_contact2: row.original.next_of_kin_contact2,
                });
              }}
            >수정</Button>
            <Button
              className="w-[2.5rem] h-[2rem] flex justify-center items-center bg-[#D76767] text-[#FEFBFB] m-auto"
              onClick={() => {
                removePersonIdx.current = row.original.idx;
                setConfirmMsg(`${row.original.student_name}을(를) 정말로 삭제하시겠습니까?`);
                toggleModalConfirm({
                  show: true,
                  title: '출입자 삭제',
                  type: 'delete'
                });
              }}
            >삭제</Button>
          </div>
        );
      },
    },
  ], [modifyPerson, editingRowData]);

  const handleSearch = async (data: any) => {
    handleGetAccessCtlPerson(data);
  }

  const table = useReactTable({
    data: accessPerson || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  useEffect(() => {
    handleGetAccessCtlPerson({});
  }, []);

  useEffect(() => {
    if (currPage.current != null) {
      const page = currPage.current;
      currPage.current = null; // 한 번만 적용하고 초기화
      requestAnimationFrame(() => {
        table.setPageIndex(page);
      });
    }
  }, [accessPerson]);

  return (
    <div>
      <SMSSettingTime index={0} />
      <SMSSettingTime index={1} />
      <div
        className="flex justify-around items-center bg-[#EBECEF] dark:bg-[#343638] rounded-sm p-2"
      >
        <Controller
          name="studentId"
          control={control}
          defaultValue={null}
          render={({ field }) => (
            <div className="flex items-center mr-10">
              <p className="mr-2 dark:text-[#F3F3F3]">번호</p>
              <input {...field}
                placeholder="번호를 입력하세요."
                className="border p-2 rounded-lg text-black dark:bg-gray-700 dark:text-[#FFFFFF] w-[8.5rem]"
                value={typeof field.value === 'object' ? '' : field.value}
              />
            </div>
          )}
        />
        <Controller
          name="studentName"
          control={control}
          defaultValue={null}
          render={({ field }) => (
            <div className="flex items-center mr-10">
              <p className="mr-2 dark:text-[#F3F3F3]">이름</p>
              <input {...field}
                placeholder="이름을 입력하세요."
                className="border p-2 rounded-lg text-black dark:bg-gray-700 dark:text-[#FFFFFF] w-[8.5rem]"
                value={typeof field.value === 'object' ? '' : field.value}
              />
            </div>
          )}
        />
        <Controller
          name="className"
          control={control}
          defaultValue={null}
          render={({ field }) => (
            <div className="flex items-center mr-10">
              <p className="mr-2 dark:text-[#F3F3F3]">소속</p>
              <input {...field}
                placeholder="소속을 입력하세요."
                className="border p-2 rounded-lg text-black dark:bg-gray-700 dark:text-[#FFFFFF] w-[8.5rem]"
                value={typeof field.value === 'object' ? '' : field.value}
              />
            </div>
          )}
        />
        <div className='w-[1px] h-[2rem] bg-[#BEC4D2] mr-1.5' />
        <button
          type="submit"
          className="flex justify-center items-center w-[4rem] h-[2rem] p-2 px-3 bg-[#6f93d3] rounded-lg text-white"
          onClick={handleSubmit(handleSearch)}
        >
          검색
        </button>
      </div>
      <div className='flex items-center bg-[#EBECEF] dark:bg-[#313233] dark:text-[#E5E5E5] h-[2.625rem] w-full rounded mt-2 mb-1.5'>
        <span className='w-[37%] text-center'>학생</span>
        <span className='w-[41%] text-center'>보호자</span>
        <span className='w-[8%] text-center'>문자 전송</span>
        <span className='w-[14%] text-center'>관리</span>
      </div>
      <table className='w-full table-fixed rounded-lg overflow-hidden shadow-md'>
        <thead
          className='bg-[#EBECEF] dark:bg-[#313233] dark:text-[#E5E5E5] rounded-[4px] h-[3rem] flex items-center justify-around'
        >
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className='table'>
              {headerGroup.headers.map((header) => (
                <th key={header.id} style={header.column.columnDef.meta?.style || {}}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className='dark:bg-[#272829]'>
          {accessPerson && accessPerson.length > 0 && table.getRowModel()?.rows?.length > 0 && table.getRowModel().rows.map((row) => (
            <tr key={row.id} className='table'>
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id} style={cell.column.columnDef.meta?.style || {}}
                  className='text-[#4E4A4A] dark:text-[#F3F3F3]'
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {accessPerson && accessPerson.length > 0 && table.getRowModel()?.rows?.length > 0 && (
        <div className="flex items-center justify-center gap-4 bottom-0 py-2">
          <button
            disabled={!table.getCanPreviousPage()}
            className="p-2 rounded-full disabled:opacity-50 dark:text-[#FFFFFF]"
            onClick={() => table.previousPage()}
          >

            <FaChevronLeft size={16} />
          </button>
          <span className="text-gray-700 font-medium dark:text-[#FFFFFF]">
            페이지 {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </span>
          <button
            disabled={!table.getCanNextPage()}
            className="p-2 rounded-full disabled:opacity-50 dark:text-[#FFFFFF]"
            onClick={() => table.nextPage()}
          >
            <FaChevronRight size={16} />
          </button>
        </div>
      )}
      {modalConfirm.show && (
        <ModalConfirm
          modal={modalConfirm}
          toggle={toggleModalConfirm}
          confirm={confirmRemove}
        // loading={loading}
        >
          <p>{confirmMsg}</p>
        </ModalConfirm>
      )}
    </div>
  )
}