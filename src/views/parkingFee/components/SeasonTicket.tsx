import { useEffect, useState, useRef } from "react";
import { 
    parkingFeeOutsideInfo,
    SeasonTicketMember,
    MemberPaymentHistory
} from '@/@types/parkingFee'
import { IoIosSearch } from "react-icons/io";
import Modal from '../modals/Modal'
import { ModalType } from '@/@types/modal'
import AddSeasonTicket from '../modals/AddSeasonTicket'

type Props = {
    selectedParking: parkingFeeOutsideInfo
}

type MembershipStatus =
  | 'UPCOMING'   // 예정
  | 'ACTIVE'     // 유효
  | 'EXPIRING'   // 임박
  | 'EXPIRED';   // 만료

const DUMMY_MEMBERS: SeasonTicketMember[] = [
    {
        id: '1',
        siteId: '1',
        carNumber: '12가3456',
        name: '홍길동',
        description: '단골 고객',
        code: 'DNE123L',
        phone: '010-1234-1234',
        groupName: '입주사 A',
        note: '본관 3층 근무',
        currentMembership: {
            status: 'ACTIVE',
            startDate: '2024-12-01',
            endDate: '2025-02-11',
            remainingDays: 30,
            paidFee: 2000,
            paidMethod: 'CASH',
        },
        isActive: true,
        createdAt: '2024-01-01T10:00:00.000Z',
        updatedAt: '2024-01-01T10:00:00.000Z',
    },
    {
        id: '2',
        siteId: '1',
        carNumber: '88나9999',
        name: '김철수',
        description: '단골 고객',
        code: 'DNE123L',
        phone: '010-1234-5678',
        groupName: '임원',
        note: '전용 구역 주차',
        currentMembership: {
            status: 'UPCOMING',
            startDate: '2025-03-01',
            endDate: '2025-07-11',
            remainingDays: 120,
            paidFee: 80000,
            paidMethod: 'CASH',
        },
        isActive: true,
        createdAt: '2024-03-01T09:00:00.000Z',
        updatedAt: '2024-03-01T09:00:00.000Z',
    },
    {
        id: '3',
        siteId: '1',
        carNumber: '33나9999',
        name: '이철수',
        description: '단골 고객',
        code: 'DNE123L',
        phone: '010-1234-5678',
        groupName: '임원',
        note: '전용 구역 주차',
        currentMembership: {
            status: 'EXPIRED',
            startDate: '2024-05-01',
            endDate: '2025-02-11',
            remainingDays: 0,
            paidFee: 150000,
            paidMethod: 'CASH',
        },
        isActive: true,
        createdAt: '2024-03-01T09:00:00.000Z',
        updatedAt: '2024-03-01T09:00:00.000Z',
    },
    {
        id: '4',
        siteId: '1',
        carNumber: '11나9999',
        name: '박철수',
        description: '단골 고객',
        code: 'DNE123L',
        phone: '010-1234-5678',
        groupName: '임원',
        note: '전용 구역 주차',
        currentMembership: {
            status: 'EXPIRING',
            startDate: '2024-11-01',
            endDate: '2025-02-11',
            remainingDays: 1,
            paidFee: 8000,
            paidMethod: 'CASH',
        },
        isActive: true,
        createdAt: '2024-03-01T09:00:00.000Z',
        updatedAt: '2024-03-01T09:00:00.000Z',
    },
];

const DUMMY_MEMBER_PAYMENT_HISTORIES: MemberPaymentHistory[] = [
    {
        id: '1',
        memberId: '1',
        policyId: 'policy-1',
        amount: 50000,
        paymentMethod: 'CARD',
        paymentStatus: 'ok',
        note: '1개월 연장',
        startDate: '2024-02-01',
        endDate: '2024-02-29',
        paidAt: '2024-01-31T10:00:00.000Z',
        createdAt: '2024-01-31T10:00:00.000Z',
        updatedAt: '2024-01-31T10:00:00.000Z',
    },
    {
        id: '2',
        memberId: '1',
        policyId: null,
        amount: 150000,
        paymentMethod: 'TRANSFER',
        paymentStatus: 'ok',
        note: '3개월 신규 등록 (할인 적용)',
        startDate: '2024-03-01',
        endDate: '2024-05-31',
        paidAt: '2024-02-28T15:30:00.000Z',
        createdAt: '2024-02-28T15:30:00.000Z',
        updatedAt: '2024-02-28T15:30:00.000Z',
    },
    {
        id: '3',
        memberId: '2',
        policyId: null,
        amount: 150000,
        paymentMethod: 'TRANSFER',
        paymentStatus: 'ok',
        note: '3개월 신규 등록 (할인 적용)',
        startDate: '2024-03-01',
        endDate: '2024-05-31',
        paidAt: '2024-02-28T15:30:00.000Z',
        createdAt: '2024-02-28T15:30:00.000Z',
        updatedAt: '2024-02-28T15:30:00.000Z',
    },
];

const SeasonTicket = ({ selectedParking }: Props) => {
    const [members, setMembers] = useState<SeasonTicketMember[]>([]);
    const [selectedMember, setSelectedMember] = useState<SeasonTicketMember | null>(null);
    const [selectedMembership, setSelectedMembership] = useState<SeasonTicketMember['currentMembership'] | null>(null);
    const [originMember, setOriginMember] = useState<SeasonTicketMember | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const isExtendDisabled = !selectedMember;
    const [paymentHistories, setPaymentHistories] = useState<MemberPaymentHistory[]>([]);
    const [modalWidth, setModalWidth] = useState(520);
    const today = new Date().toLocaleDateString("en-CA");
    
    // 조회 기간 상태
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);

    const dateRef = useRef({ startDate, endDate }); // 최신 조회 기간을 위한 ref
    const [searchText, setSearchText] = useState(''); // 검색어

    const MEMBERSHIP_STATUS_LABEL: Record<MembershipStatus, string> = {
        UPCOMING: '예정',
        ACTIVE: '유효',
        EXPIRING: '임박',
        EXPIRED: '만료',
    };

    const MEMBERSHIP_STATUS_COLOR: Record<MembershipStatus, string> = {
        UPCOMING: 'text-blue-500',
        ACTIVE: 'text-green-600',
        EXPIRING: 'text-orange-500',
        EXPIRED: 'text-red-500',
    };
    
    const modalChildRef = useRef<HTMLDivElement>(null)
    const [modal, setModal] = useState<ModalType>({
        show: false,
        type: '',
        title: '',
    })
    const toggleModal = ({ show, title, type }: ModalType) => {
        setModal({
            show,
            title,
            type,
        })

        if (!show) {
            setModalWidth(520);
        }
    }

    useEffect(() => {
        dateRef.current = { startDate, endDate };
    }, [startDate, endDate]);

    const dateChange = (type: "start" | "end", value: string) => {
        if (new Date(value) > new Date(today)) return;
        if (type === "start") setStartDate(value);
        if (type === "end") setEndDate(value);
    };
    
    useEffect(() => {
        setMembers(DUMMY_MEMBERS);
    }, []);

    const updateMemberField = (key: string, value: string) => {
        if (!selectedMember || !originMember) return;

        const next = { ...selectedMember, [key]: value };
        setSelectedMember(next);
        setIsDirty(JSON.stringify(next) !== JSON.stringify(originMember));
    };
    
    const search = async () => {

    }

    useEffect(() => {
        if (!selectedMembership || !selectedMember) return;

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMembership]);

    useEffect(() => {
        setPaymentHistories([]);
    }, [selectedMember]);

    const setModalChild = (type: string) => {
        switch (type) {
            case 'createMember':
                return (
                    <AddSeasonTicket
                        siteId={selectedParking.outside_ip}
                        closeModal={() =>
                            toggleModal({ show: false, type: '', title: '' })
                        }
                        onCreated={(newMember) => {
                            // 목록 갱신 (임시)
                            setMembers((prev) => [newMember, ...prev]);
                            // 선택 처리
                            setSelectedMember(newMember);
                            setOriginMember(JSON.parse(JSON.stringify(newMember)));
                            setIsDirty(false);

                            toggleModal({ show: false, type: '', title: '' });
                        }}
                    />
                )
            default:
                break
        }
    }
    return (
        <div className="w-full h-full mb-2 bg-white dark:bg-gray-800 shadow-md rounded-lg">
            <div className="px-4 py-3 border-b border-gray-300 dark:border-gray-700 flex items-center">
                <span className="mr-2 text-black font-bold text-[18px] dark:text-white">주차장명</span>
                <div className="border border-gray-300 outline-none rounded px-3 w-[200px] h-[30px] mr-3 flex items-center dark:text-white">
                    {selectedParking.outside_name}
                </div>

                <input 
                    id="1"
                    type="date"
                    value={startDate}
                    max={today}
                    className="border rounded h-[30px] px-3 py-2 outline-none border-gray-300 focus:border-blue-500 dark:text-black"
                    onChange={(e) => dateChange("start", e.target.value)}
                />

                <span className="font-semibold mx-2 text-sm dark:text-white">~</span>

                <input 
                    id="2"
                    type="date"
                    value={endDate}
                    max={today}
                    className="border rounded h-[30px] px-3 py-2 outline-none border-gray-300 focus:border-blue-500 dark:text-black"
                    onChange={(e) => dateChange("end", e.target.value)}
                />

                <input 
                    id="carManagementSearch"
                    type="text"
                    placeholder="검색"
                    value={searchText}
                    className="border rounded h-[30px] px-3 py-2 outline-none border-gray-300 focus:border-blue-500 mx-3 dark:text-black"
                    onChange={(e) => setSearchText(e.target.value)}
                />

                <button 
                    className="h-[30px] px-3 bg-blue-600 text-white rounded-md text-sm flex items-center justify-center"
                    onClick={search}
                >
                    <IoIosSearch className="text-white w-5 h-5" />
                </button>
                <button
                    className="h-[30px] px-3 ml-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md text-sm flex items-center gap-1"
                    onClick={() => {
                        setSelectedMember(null);
                        setOriginMember(null);
                        setIsDirty(false);

                        toggleModal({
                            show: true,
                            title: '정기권 고객 신규 생성',
                            type: 'createMember',
                        });
                    }}
                >
                    <span className="text-lg font-bold">+</span>
                    신규등록
                </button>
            </div>

            <div className="w-full h-full overflow-hidden">
                <div className="w-full h-full grid grid-cols-12 gap-2 overflow-auto p-4">
                    {/* 좌측 */}
                    <div className="col-span-3 flex flex-col gap-2">
                        <div className="flex flex-col h-[calc(100vh-270px)] rounded dark:bg-[#373737] border dark:border-none relative">
                            <div className="absolute top-0 left-0 w-0 h-0 
                                                border-l-[40px] border-l-[#8BC53F]
                                                border-b-[20px] border-b-transparent">
                            </div>
                            <div className="flex items-center bg-slate-400 text-white dark:bg-[#4B4B4B] font-bold text-sm p-1 rounded-t h-[29px]">
                                <span className="absolute left-1/2 -translate-x-1/2">
                                    정기권 정보
                                </span>
                            </div>
            
                            <div className="flex-1 overflow-auto scroll-container">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead className="bg-gray-100 text-gray-700 sticky top-0 z-20 dark:bg-[#2c2c2c] dark:text-white">
                                        <tr className="border-b border-gray-300 text-center dark:border-gray-500">
                                            <th className="px-3 py-2 font-semibold">고객명</th>
                                            <th className="px-3 py-2 font-semibold">차량번호</th>
                                            <th className="px-3 py-2 font-semibold">상태</th>
                                        </tr>
                                    </thead>

                                   <tbody className="text-gray-700 bg-white dark:text-gray-100 dark:bg-inherit">
                                        {members.map((m) => {
                                            const isSelected = m.id === selectedMember?.id;

                                            return (
                                                <tr
                                                    key={m.id}
                                                    className={`
                                                        text-center cursor-pointer
                                                        ${isSelected
                                                            ? 'bg-blue-50 dark:bg-[#2c3e50]'
                                                            : 'hover:bg-gray-100 dark:hover:bg-[#2c2c2c]'
                                                        }
                                                    `}
                                                    onClick={() => {
                                                        setSelectedMember(m);
                                                        setOriginMember(JSON.parse(JSON.stringify(m)));
                                                        setIsDirty(false);
                                                        setSelectedMembership(null);
                                                    }}
                                                >
                                                    <td className="px-3 py-2">{m.name}</td>
                                                    <td className="px-3 py-2">{m.carNumber}</td>
                                                    <td className="px-3 py-2">
                                                        {m.currentMembership ? (
                                                            <span
                                                                className={`font-semibold ${
                                                                    MEMBERSHIP_STATUS_COLOR[m.currentMembership.status]
                                                                }`}
                                                            >
                                                                    {MEMBERSHIP_STATUS_LABEL[m.currentMembership.status]}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400">없음</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}

                                        {members.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="py-6 text-center text-gray-400">
                                                    조회된 정기권 내역이 없습니다.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* 중앙 */}
                    <div className="col-span-6 flex flex-col gap-2">
                        <div className="col-span-5 flex flex-col gap-2">
                            <div className="flex flex-col h-[calc(100vh-532px)] rounded dark:bg-[#373737] border dark:border-none relative">
                                
                                {/* 좌측 상단 장식 */}
                                <div
                                    className="absolute top-0 left-0 w-0 h-0 
                                    border-l-[40px] border-l-[#8BC53F]
                                    border-b-[20px] border-b-transparent"
                                />

                                {/* 헤더 */}
                                <div className="text-center bg-slate-400 text-white dark:bg-[#4B4B4B] font-bold text-sm p-1 rounded-t">
                                    상세내역
                                </div>

                                {/* 테이블 영역 (스크롤) */}
                                <div className="flex-1 overflow-auto scroll-container">
                                    <table className="w-full text-sm text-left border-collapse">
                                        <thead className="bg-gray-100 text-gray-700 sticky top-0 z-20 dark:bg-[#2c2c2c] dark:text-white">
                                            <tr className="border-b border-gray-300 text-center dark:border-gray-500">
                                                <th className="px-3 py-2 font-semibold">시작일자</th>
                                                <th className="px-3 py-2 font-semibold">종료일자</th>
                                                <th className="px-3 py-2 font-semibold">결제방식</th>
                                                <th className="px-3 py-2 font-semibold">결제요금</th>
                                            </tr>
                                        </thead>

                                        <tbody className="text-gray-700 bg-white dark:text-gray-100 dark:bg-inherit">
                                            {selectedMember?.currentMembership ? (
                                                <tr
                                                    className={`text-center cursor-pointer
                                                        ${
                                                            selectedMembership === selectedMember.currentMembership
                                                                ? 'bg-blue-50 dark:bg-[#2c3e50]'
                                                                : 'hover:bg-gray-100 dark:hover:bg-[#2c2c2c]'
                                                        }`}
                                                    onClick={() => {
                                                        setSelectedMembership(selectedMember.currentMembership);

                                                        if (!selectedMember) {
                                                            setPaymentHistories([]);
                                                            return;
                                                        }

                                                        const filtered = DUMMY_MEMBER_PAYMENT_HISTORIES.filter(
                                                            (h) => h.memberId === selectedMember.id
                                                        );

                                                        setPaymentHistories(filtered);
                                                    }}
                                                >
                                                    {/* 시작일자 */}
                                                    <td className="px-3 py-2">
                                                        {selectedMember.currentMembership.startDate}
                                                    </td>

                                                    {/* 종료일자 */}
                                                    <td className="px-3 py-2">
                                                        {selectedMember.currentMembership.endDate}
                                                    </td>

                                                    {/* 결제 방식 */}
                                                    <td className="px-3 py-2">
                                                        {selectedMember.currentMembership.paidMethod === 'CASH'
                                                            ? '현금'
                                                            : selectedMember.currentMembership.paidMethod === 'CARD'
                                                            ? '카드'
                                                            : '계좌이체'}
                                                    </td>

                                                    {/* 결제 요금 */}
                                                    <td className="px-3 py-2">
                                                        {selectedMember.currentMembership.paidFee.toLocaleString()}원
                                                    </td>
                                                </tr>
                                            ) : (
                                                <tr>
                                                    <td colSpan={4} className="py-6 text-center text-gray-400">
                                                        회원을 선택해주세요.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="shrink-0 border-t px-3 py-2 bg-white dark:bg-[#373737]">
                                    <button
                                        disabled={isExtendDisabled}
                                        className={`w-full h-[36px] rounded text-white text-sm
                                            ${
                                                isExtendDisabled
                                                    ? 'bg-gray-300 cursor-not-allowed'
                                                    : 'bg-blue-600 hover:bg-blue-700'
                                            }`}
                                        onClick={() => {
                                            if (!selectedMember) return;

                                            if (selectedMember.currentMembership) {
                                                // TODO: 연장 모달
                                            } else {
                                                // TODO: 신규 정기권 생성 모달
                                            }
                                        }}
                                    >
                                        {selectedMember?.currentMembership
                                            ? '정기권 연장하기'
                                            : '정기권 생성하기'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col h-[255px] rounded dark:bg-[#373737] border dark:border-none relative">
                            <div className="absolute top-0 left-0 w-0 h-0 
                                            border-l-[40px] border-l-[#8BC53F]
                                            border-b-[20px] border-b-transparent">
                            </div>
                            <div className="text-center bg-slate-400 text-white dark:bg-[#4B4B4B] font-bold text-sm p-1 rounded-t">
                                전체 정기권 히스토리
                            </div>
                                    
                            <div className="flex-1 overflow-auto scroll-container">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead className="bg-gray-100 text-gray-700 sticky top-0 z-20 dark:bg-[#2c2c2c] dark:text-white">
                                        <tr className="border-b border-gray-300 text-center dark:border-gray-500">
                                            <th className="px-3 py-2">결제일</th>
                                            <th className="px-3 py-2">기간</th>
                                            <th className="px-3 py-2">결제수단</th>
                                            <th className="px-3 py-2">결제금액</th>
                                            <th className="px-3 py-2">비고</th>
                                        </tr>
                                    </thead>

                                    <tbody className="text-gray-700 dark:text-gray-100">
                                        {paymentHistories.map((p) => (
                                            <tr key={p.id} className="text-center hover:bg-gray-100 dark:hover:bg-[#2c2c2c]">
                                                {/* 결제일 */}
                                                <td className="px-3 py-2">
                                                    {new Date(p.paidAt).toLocaleDateString()}
                                                </td>

                                                {/* 기간 */}
                                                <td className="px-3 py-2">
                                                    {p.startDate} ~ {p.endDate}
                                                </td>

                                                {/* 결제 수단 */}
                                                <td className="px-3 py-2">
                                                    {p.paymentMethod === 'CASH'
                                                        ? '현금'
                                                        : p.paymentMethod === 'CARD'
                                                        ? '카드'
                                                        : '계좌이체'}
                                                </td>

                                                {/* 금액 */}
                                                <td className="px-3 py-2 font-semibold">
                                                    {p.amount.toLocaleString()}원
                                                </td>

                                                {/* 비고 */}
                                                <td className="px-3 py-2 text-left">
                                                    {p.note}
                                                </td>
                                            </tr>
                                        ))}

                                        {paymentHistories.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="py-6 text-center text-gray-400">
                                                    결제 내역이 없습니다.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* 우측 */}
                    <div className="col-span-3 flex flex-col gap-2">
                        <div className="flex flex-col h-[calc(100vh-270px)] rounded dark:bg-[#373737] border dark:border-none relative">
                            <div className="absolute top-0 left-0 w-0 h-0 
                                                border-l-[40px] border-l-[#8BC53F]
                                                border-b-[20px] border-b-transparent">
                            </div>
                            <div className="flex items-center bg-slate-400 text-white dark:bg-[#4B4B4B] font-bold text-sm p-1 rounded-t h-[29px]">
                                <span className="absolute left-1/2 -translate-x-1/2">
                                    정기권 고객 정보
                                </span>
                            </div>
            
                            <div className="flex flex-col h-full">
                                <div className="flex-1 flex flex-col overflow-hidden">

                                    {/* 내용 영역 */}
                                    <div className="flex-1 overflow-auto p-4 space-y-3">

                                        {/* 차량번호 */}
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-gray-500 dark:text-gray-300">차량번호</span>
                                            <input
                                                value={selectedMember?.carNumber ?? ''}
                                                className="h-[34px] px-3 rounded border dark:bg-[#2c2c2c] dark:text-white"
                                                onChange={(e) => updateMemberField('carNumber', e.target.value)}
                                            />
                                        </div>

                                        {/* 고객명 */}
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-gray-500 dark:text-gray-300">고객명</span>
                                            <input
                                                value={selectedMember?.name ?? ''}
                                                className="h-[34px] px-3 rounded border dark:bg-[#2c2c2c] dark:text-white"
                                                onChange={(e) => updateMemberField('name', e.target.value)}
                                            />
                                        </div>

                                        {/* 연락처 */}
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-gray-500 dark:text-gray-300">연락처</span>
                                            <input
                                                value={selectedMember?.phone ?? ''}
                                                className="h-[34px] px-3 rounded border dark:bg-[#2c2c2c] dark:text-white"
                                                onChange={(e) => updateMemberField('phone', e.target.value)}
                                            />
                                        </div>

                                        {/* 소속 */}
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-gray-500 dark:text-gray-300">소속</span>
                                            <input
                                                value={selectedMember?.groupName ?? ''}
                                                className="h-[34px] px-3 rounded border dark:bg-[#2c2c2c] dark:text-white"
                                                onChange={(e) => updateMemberField('groupName', e.target.value)}
                                            />
                                        </div>

                                        {/* 메모 */}
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-gray-500 dark:text-gray-300">비고</span>

                                            <input
                                                value={selectedMember?.note ?? ''}
                                                className="h-[34px] px-3 rounded border dark:bg-[#2c2c2c] dark:text-white"
                                                onChange={(e) => updateMemberField('note', e.target.value)}
                                            />
                                        </div>

                                        {/* 정기권 상태 */}
                                        <div className="rounded border px-3 py-2 text-sm bg-gray-50 dark:bg-[#2c2c2c]">
                                            <div className="font-semibold dark:text-white">정기권 상태</div>

                                            {selectedMember?.currentMembership ? (
                                                <>
                                                    <div className="flex justify-between mt-1">
                                                        <span className="text-gray-500 dark:text-white">상태</span>
                                                        <span
                                                            className={`font-semibold ${
                                                                MEMBERSHIP_STATUS_COLOR[selectedMember.currentMembership.status]
                                                            }`}
                                                        >
                                                            {MEMBERSHIP_STATUS_LABEL[selectedMember.currentMembership.status]}
                                                        </span>
                                                    </div>

                                                    <div className="flex justify-between mt-1">
                                                        <span className="text-gray-500 dark:text-white">등록일</span>
                                                        <span className="dark:text-white">{selectedMember?.currentMembership?.startDate}</span>
                                                    </div>

                                                    <div className="flex justify-between mt-1">
                                                        <span className="text-gray-500 dark:text-white">만료일</span>
                                                        <span className="dark:text-white">{selectedMember?.currentMembership?.endDate}</span>
                                                    </div>

                                                    <div className="flex justify-between mt-1">
                                                        <span className="text-gray-500 dark:text-white">결제 금액</span>
                                                        <span className="dark:text-white">{selectedMember?.currentMembership?.paidFee.toLocaleString()}원</span>
                                                    </div>

                                                    <div className="flex justify-between mt-1">
                                                        <span className="text-gray-500 dark:text-white">결제 수단</span>
                                                        <span className="dark:text-white">{selectedMember?.currentMembership?.paidMethod}</span>
                                                    </div>

                                                    <div className="flex justify-between mt-2 pt-2 border-t">
                                                        <span className="text-gray-500 dark:text-white">잔여 기간</span>
                                                        <span
                                                            className={`font-bold ${
                                                                selectedMember?.currentMembership?.remainingDays <= 3
                                                                    ? 'text-red-500'
                                                                    : 'text-green-600'
                                                            }`}
                                                        >
                                                            {selectedMember?.currentMembership?.remainingDays}일
                                                        </span>
                                                    </div>
                                                </>
                                            ) : (
                                                <span className="text-gray-400 mt-2 block">
                                                    정기권 정보 없음
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* 하단 버튼 */}
                                    <div className="shrink-0 border-t px-3 py-2 bg-white dark:bg-[#373737]">
                                        <button
                                            disabled={!isDirty}
                                            className={`w-full h-[36px] rounded text-white text-sm
                                                ${isDirty
                                                    ? 'bg-blue-600 hover:bg-blue-700'
                                                    : 'bg-gray-300 cursor-not-allowed'
                                                }`}
                                            onClick={() => {
                                                // TODO: 수정 API
                                            }}
                                        >
                                            수정하기
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Modal
                modal={modal}
                toggle={toggleModal}
                modalChildRef={modalChildRef}
                width={modalWidth}
            >
                <div ref={modalChildRef}>
                    {setModalChild(modal.type)}
                </div>
            </Modal>
        </div>
    )
}

export default SeasonTicket