import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { billboardInfo } from '@/@types/tunnel'
import CloseButton from '@/components/ui/CloseButton'
import { useSessionUser } from '@/store/authStore'
import { apiModifyLCSBillboard } from '@/services/TunnelService'
import { AlertDialog } from '@/components/shared/AlertDialog'
import { useBillboardStore } from '@/store/tunnel/useBillboardStore'
import Spinner from '@/components/ui/Spinner'
// 이미지 경로
import downArrow from '@/assets/styles/images/LCS/down_arrow.png'
import leftArrow from '@/assets/styles/images/LCS/left_arrow.png'
import rightArrow from '@/assets/styles/images/LCS/right_arrow.png'
import noEntry from '@/assets/styles/images/LCS/no_entry.png'
import downArrowEffect from '@/assets/styles/images/LCS/down_arrow_Effect.gif'
import noEntryEffect from '@/assets/styles/images/LCS/no_entry_effect.gif'
import num30 from '@/assets/styles/images/LCS/30.png'
import num40 from '@/assets/styles/images/LCS/40.png'
import num50 from '@/assets/styles/images/LCS/50.png'
import num60 from '@/assets/styles/images/LCS/60.png'
import num70 from '@/assets/styles/images/LCS/70.png'
import num80 from '@/assets/styles/images/LCS/80.png'
import num90 from '@/assets/styles/images/LCS/90.png'

type BillboardLCSModalProps = {
  lcsInfo: billboardInfo[];
  onClose: () => void;
};

type FormValues = {
  selectLCSMsg: string[];
  arrowMsg: string;
};

// 백엔드 응답 타입
type ModifyResp = {
  message?: string;          // 'ok' 등
  status?: boolean;          // true/false 로 올 수도 있음
  lanes?: string[] | string; // ['1차선 성공', '2차선 실패'] 혹은 string
};

export default function BillboardLCSModal({ lcsInfo: dataInfo, onClose }: BillboardLCSModalProps) {
  const LCSMsg: (keyof typeof LCSImgSrc)[] = [
    '8001', '8002', '8003', '8007', '8006', '8008',
    '8009', '8010', '8011', '8012', '8013', '8014', '8015'
  ];

  const LCSImgSrc = {
    '8001': downArrow,
    '8002': leftArrow,
    '8003': rightArrow,
    '8007': noEntry,
    '8006': downArrowEffect,
    '8008': noEntryEffect,
    '8009': num30,
    '8010': num40,
    '8011': num50,
    '8012': num60,
    '8013': num70,
    '8014': num80,
    '8015': num90
  };

  const { user } = useSessionUser();
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [idxList, setIdxList] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const { setIsSettingUpdate } = useBillboardStore();

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    defaultValues: {
      selectLCSMsg: dataInfo.map(item => item.msg ?? 'delete'),
      arrowMsg: dataInfo[0]?.direction ?? '',
    }
  });

  useEffect(() => {
    const idxArr = dataInfo
      .map(item => item.idx)
      .filter((idx): idx is number => idx !== undefined);
    setIdxList(idxArr);

    reset({
      selectLCSMsg: dataInfo.map(item => item.msg ?? 'delete'),
      arrowMsg: dataInfo[0]?.direction ?? '',
    });
  }, [dataInfo, reset]);

  const onSubmit = (checkedData: FormValues) => {
    const direction = checkedData.arrowMsg;
    const userId = user.userId ?? '';

    // lane 필드 포함
    const result: Record<
      string,
      {
        idx: number;
        ip: string;
        port: string;
        direction: string;
        msg: string;
        userId: string;
        lane: string;
        manufacturer: string;
      }
    > = {};

    dataInfo.forEach((item, i) => {
      if (item.idx === undefined) return;
      const laneName = `${i + 1}차선`;
      result[laneName] = {
        idx: item.idx,
        ip: item.ip ?? '',
        port: item.port != null ? item.port.toString() : '',
        direction,
        msg: checkedData.selectLCSMsg?.[i] || '',
        userId,
        lane: laneName,
        manufacturer:String(item.manufacturer ?? '')
      };
    });

    onModify(result);
  };

  // 응답의 lanes를 이용해 "1차선 …\n2차선 …" 형식으로 정렬/표시
  const onModify = async (
    submitData: Record<string, {
      idx: number;
      ip: string;
      port: string;
      direction: string;
      msg: string;
      userId: string;
      lane: string;
      manufacturer: string;
    }>
  ) => {
    try {
      setLoading(true);
      const res = (await apiModifyLCSBillboard(submitData)) as ModifyResp;

      if (res?.message === 'ok' || res?.status) {
        // string | string[] | undefined → 배열로 정규화
        const lanesRaw: string[] = Array.isArray(res?.lanes)
          ? (res!.lanes as string[])
          : typeof res?.lanes === 'string'
            ? [res.lanes as string]
            : [];

        // 'n차선 …' 에서 n 추출하여 1→N 순 재배치
        const laneByNum = new Map<number, string>();
        for (const s of lanesRaw) {
          const m = /^(\d+)차선/.exec(s);
          if (m) laneByNum.set(Number(m[1]), s);
        }

        const laneOrder = Array.from({ length: dataInfo.length }, (_, i) => i + 1);
        const laneReport =
          lanesRaw.length > 0
            ? laneOrder.map(n => laneByNum.get(n) ?? `${n}차선 결과 없음`).join('\n')
            : '전광판 메시지가 수정되었습니다.';

        setMessage(laneReport);
        setIsAlertOpen(true);
        setIsSettingUpdate(true);
      } else {
        setMessage('전광판 수정을 실패하였습니다.');
        setIsAlertOpen(true);
      }
    } catch (e) {
      console.error(e);
      setMessage('전광판 수정을 실패하였습니다.');
      setIsAlertOpen(true);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
      {loading && (
        <div className="absolute w-[100vw] h-[100vh] border-gray-200 dark:border-gray-500 left-0 top-0 z-20">
          <Spinner size={50} className='absolute left-[47%] top-[42%]' />
        </div>
      )}
      <div className="bg-white dark:bg-gray-800 rounded-xl px-6 pt-6 pb-3 w-[1220px] shadow-xl text-gray-800 dark:text-white relative">
        <CloseButton
          absolute
          className="ltr:right-4 rtl:left-6 top-3"
          onClick={onClose}
        />
        <h2 className="text-lg font-bold mb-2 border-b-2 pb-1">전광판 메시지 입력</h2>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="w-full relative flex flex-col gap-5">
            {idxList.map((idxValue, selectLCSMsgIdx) => (
              <Controller
                key={idxValue}
                name={`selectLCSMsg.${selectLCSMsgIdx}`}
                control={control}
                rules={{ required: `${selectLCSMsgIdx + 1}차선 메시지를 선택하세요` }}
                render={({ field }) => (
                  <div className="w-full h-[100px] bg-[#EBECEF] rounded-md pt-2 dark:text-black relative">
                    <div className="w-[100px] h-[30px] ml-[7px] bg-white text-center leading-[30px] font-bold">
                      {selectLCSMsgIdx + 1}차선
                    </div>
                    <div className="w-full h-[45px] flex gap-6">
                      <span className="flex gap-2 items-center cursor-pointer mt-2 pl-[10px]">
                        <input
                          type="radio"
                          id={`msg_${selectLCSMsgIdx}_0`}
                          value="delete"
                          checked={field.value === 'delete'}
                          onChange={() => field.onChange('delete')}
                          className="cursor-pointer"
                        />
                        <label htmlFor={`msg_${selectLCSMsgIdx}_0`}>
                          <span className="text-[16px]">지우기</span>
                        </label>
                      </span>
                      {LCSMsg.map((name, idx) => (
                        <span key={idx} className="flex items-center gap-3 mt-2">
                          <input
                            type="radio"
                            id={`msg_${selectLCSMsgIdx}_${idx + 1}`}
                            value={name}
                            checked={field.value === name}
                            onChange={() => field.onChange(name)}
                            className="cursor-pointer"
                          />
                          <label htmlFor={`msg_${selectLCSMsgIdx}_${idx + 1}`} className="w-[34px] h-[34px] cursor-pointer">
                            <img src={LCSImgSrc[name]} className="w-[34px] h-[34px]" />
                          </label>
                        </span>
                      ))}
                    </div>
                    {errors.selectLCSMsg?.[selectLCSMsgIdx] && (
                      <p className="text-red-500 text-sm mt-1 pl-2 absolute top-[10px] left-[110px]">
                        {errors.selectLCSMsg[selectLCSMsgIdx]?.message}
                      </p>
                    )}
                  </div>
                )}
              />
            ))}

            <div className="w-full h-[100px] flex relative">
              <Controller
                name="arrowMsg"
                control={control}
                rules={{ required: `방향정보 메시지를 선택하세요` }}
                render={({ field }) => (
                  <div className="w-[950px] h-[100px] bg-[#EBECEF] rounded-md pt-2 dark:text-black">
                    <div className="w-[100px] h-[30px] ml-[7px] bg-white text-center leading-[30px] font-bold">
                      방향정보
                    </div>
                    <div className="w-full h-[45px] flex gap-6 mt-2 pl-[10px]">
                      <input
                        {...field}
                        placeholder="방향 정보를 입력해주세요"
                        className="bg-white rounded-md w-[930px] pl-4"
                      />
                    </div>
                    {errors.arrowMsg && (
                      <p className="text-red-500 text-sm mt-1 pl-2 absolute top-[10px] left-[110px]">
                        {errors.arrowMsg.message}
                      </p>
                    )}
                  </div>
                )}
              />
              <div className="w-[200px] h-[34px] mt-2 flex gap-2 justify-end absolute right-0 bottom-1">
                <button
                  type="submit"
                  className="w-[100px] h-[34px] bg-[#EBECEF] text-[#647DB7] font-bold rounded border border-gray-400"
                >
                  저장
                </button>
                <button
                  type="button"
                  className="w-[100px] h-[34px] bg-[#EBECEF] text-[#D76767] font-bold rounded border border-gray-400"
                  onClick={onClose}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      <AlertDialog
        isOpen={isAlertOpen}
        message={message}
        onClose={() => setIsAlertOpen(false)}
        onConfirm={onClose}
      />
    </div>
  )
}
