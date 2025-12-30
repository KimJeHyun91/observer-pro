import { useState, useEffect, useRef } from 'react';
import CloseButton from '@/components/ui/CloseButton';
import { billboardInfo } from '@/@types/tunnel';
import { apiModifyVMSBillboard } from '@/services/TunnelService';
import { AlertDialog } from '@/components/shared/AlertDialog';
import { useSessionUser } from "@/store/authStore";
import Spinner from '@/components/ui/Spinner'
import { HiOutlineExclamation, } from 'react-icons/hi'
import Avatar from '@/components/ui/Avatar'

type CheckBarrierControlProps = {
  open: boolean
  onClose: () => void
}

export default function CheckBarrierControl({ open, onClose }: CheckBarrierControlProps) {

  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-[498px] h-[290px] shadow-xl text-gray-800 relative border-[3px] border-red-500">
        <Avatar
          className="text-red-600 bg-red-100 dark:text-red-100 w-[62px] h-[62px] relative block left-[50%] -translate-x-1/2 top-[38px]"
          shape="circle"
        >
          <HiOutlineExclamation
            size={40}
            className="absolute block left-1/2 -translate-x-1/2 top-[25%]"
          />
        </Avatar>
        <div className='font-bold text-[27px] absolute left-1/2 -translate-x-1/2 top-[114px] '>
          차단막
          <a className='text-[#D76767]'>작동</a>
        </div>
        <div className='text-[18px] absolute w-full text-center top-[158px]'>임계치 초과로 인해 차단막 자동 작동 상태가 되었습니다.</div>
        <span className='w-[95%] h-[3px] bg-[#EDF0F6] block absolute top-[215px] left-1/2 -translate-x-1/2'></span>
        <button
          type="button"
          onClick={onClose}
          className="w-[120px] h-[34px] bg-[#EBEBEB] text-center leading-[34px] text-[18px] left-1/2 -translate-x-1/2 absolute bottom-[14px] cursor-pointer rounded"
        >
          확인
        </button>
      </div>
    </div>
  );
}
