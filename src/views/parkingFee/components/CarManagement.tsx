import { useEffect, useState, useRef } from "react";
import {
    parkingFeeOutsideInfo,
    VehicleInfo,
    CurrentSituation,
    PaymentDetail,
    PaymentDetailInfo
} from '@/@types/parkingFee'
import { IoIosSearch } from "react-icons/io";
import { LuCameraOff } from "react-icons/lu";
import { 
    getVehicleList,
    getCurrentSituation,
    getPaymentDetailList,
    getPaymentDetailInfo
} from '@/services/ParkingFeeService';
import dayjs from 'dayjs';

type Props = {
    selectedParking: parkingFeeOutsideInfo
}

export type ParkingFilter = 'all' | 'exit' | 'parking';

const CarManagement = ({ selectedParking }: Props) => {
    const today = new Date().toLocaleDateString("en-CA");

    // 조회 기간 상태
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);

   
    const dateRef = useRef({ startDate, endDate }); // 최신 조회 기간을 위한 ref
    const [filter, setFilter] = useState<ParkingFilter>('all'); // 입출차 필터(전체/출차/주차중)
    const [searchText, setSearchText] = useState(''); // 차량번호 검색어
    const [list, setList] = useState<VehicleInfo[]>([]); // 차량 목록
    const [selectedVehicle, setSelectedVehicle] = useState<VehicleInfo | null>(null); // 선택된 차량
    const [situation, setSituation] = useState<CurrentSituation | null>(null); // 주차 현황 요약
    const [paymentList, setPaymentList] = useState<PaymentDetail[]>([]); // 결제 내역 목록
    const [selectedPayment, setSelectedPayment] = useState<PaymentDetail | null>(null); // 선택된 결제 내역
    const [paymentDetailInfo, setPaymentDetailInfo] = useState<PaymentDetailInfo | null>(null); // 결제 상세 정보
    const vehicleView = paymentDetailInfo ?? selectedVehicle; // 차량 정보 뷰(결제 상세 우선)

    // parking_status 존재 여부 타입 가드
    const parkingStatus = (
        v: VehicleInfo | PaymentDetailInfo | null
    ): v is VehicleInfo => {
        return !!v && 'parking_status' in v;
    };

    useEffect(() => {
        dateRef.current = { startDate, endDate };
    }, [startDate, endDate]);

    // 날짜 변경 핸들러(미래 날짜 제한)
    const dateChange = (type: "start" | "end", value: string) => {
        if (new Date(value) > new Date(today)) return;
        if (type === "start") setStartDate(value);
        if (type === "end") setEndDate(value);
    };

    // 차량/현황 조회
    const search = async () => {
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (end < start) {
            alert("종료일은 시작일보다 빠를 수 없습니다.");
            return;
        }

        // 최대 3개월 제한
        const diff = end.getTime() - start.getTime();
        const threeMonths = 1000 * 60 * 60 * 24 * 90;

        if (diff > threeMonths) {
            alert("조회 기간은 최대 3개월까지만 가능합니다.");
            return;
        }

        try {    
            // 차량 목록 조회        
            const listRes = await getVehicleList<VehicleInfo>({
                outside_ip: selectedParking.outside_ip,
                start_date: startDate,
                end_date: endDate,
                lp: searchText.trim(),
            });

            // 조회 성공 시 선택 상태 초기화
            if (listRes.message === 'ok') {
                setList(listRes.result);
                setSelectedVehicle(null);
                setPaymentList([]);
                setSelectedPayment(null);
                setPaymentDetailInfo(null);
            }

            // 주차 현황 조회
            const situationRes = await getCurrentSituation<CurrentSituation>({
                outside_ip: selectedParking.outside_ip,
                start_date: startDate,
                end_date: endDate,
            });

            if (situationRes.message === 'ok') {
                setSituation(situationRes.result[0]);
            }
        } catch (err) {
            console.error('입출차 목록 api 조회 실패', err);
        }
    };

    // 필터 적용된 차량 목록
    const filteredList = list.filter((item) => {
        if (filter === 'all') return true;
        if (filter === 'exit') return item.parking_status === '출차';
        if (filter === 'parking') return item.parking_status === '주차중';
        return true;
    });

    // 필터 변경 시 선택 상태 초기화
    useEffect(() => {
        setSelectedVehicle(null);
        setPaymentList([]);
        setSelectedPayment(null);
        setPaymentDetailInfo(null);
    }, [filter]);

    // 차량 선택 시 결제 내역 조회
    useEffect(() => {
        if (!selectedVehicle) {
            setPaymentList([]);
            return;
        }

        const paymentDetail = async () => {
            const { startDate, endDate } = dateRef.current;

            try {
                const res = await getPaymentDetailList<PaymentDetail>({
                    outside_ip: selectedParking.outside_ip,
                    start_date: startDate,
                    end_date: endDate,
                    lp: selectedVehicle.lp,
                });

                if (res.message === 'ok') {
                    setPaymentList(res.result);
                }
            } catch (err) {
                console.error('결제 상세 api 조회 실패', err);
            }
        };

        paymentDetail();
    }, [selectedVehicle, selectedParking.outside_ip]);

    // 결제 선택 시 결제 상세 조회
    useEffect(() => {
        if (!selectedPayment) {
            setPaymentDetailInfo(null);
            return;
        }

        const paymentDetailInfo = async () => {
            try {
                const res = await getPaymentDetailInfo<PaymentDetailInfo>({
                    lp: selectedPayment.lp,
                    in_time: selectedPayment.in_time,
                });

                if (res.message === 'ok') {
                    setPaymentDetailInfo(res.result[0] ?? null);
                }
            } catch (err) {
                console.error('결제 상세 정보 api 조회 실패', err);
            }
        };

        paymentDetailInfo();
    }, [selectedPayment]);

    // 최초 진입 시 조회 실행
    useEffect(()=>{
        search();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    },[])
    
    return (
        <div className="w-full h-full mb-2 bg-white dark:bg-gray-800 shadow-md rounded-lg">
            <div className="px-4 py-3 border-b border-gray-300 dark:border-gray-700 flex items-center">
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
                    placeholder="차량번호 검색"
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
            </div>

            <div className="w-full h-full overflow-hidden">
                <div className="w-full h-full grid grid-cols-12 gap-2 overflow-auto p-4">
                    {/* 좌측 */}
                    <div className="col-span-5 flex flex-col gap-2">
                        <div className="flex flex-col h-[calc(100vh-548px)] rounded dark:bg-[#373737] border dark:border-none relative">
                            <div className="absolute top-0 left-0 w-0 h-0 
                                                border-l-[40px] border-l-[#8BC53F]
                                                border-b-[20px] border-b-transparent">
                            </div>
                            <div className="flex items-center bg-slate-400 text-white dark:bg-[#4B4B4B] font-bold text-sm p-1 rounded-t h-[29px]">
                                <span className="absolute left-1/2 -translate-x-1/2">
                                    입출차 목록
                                </span>
                                <select
                                    value={filter}
                                    className="ml-auto border border-gray-300 rounded-md px-2 text-sm outline-none text-black h-[21px]"
                                    onChange={(e) => setFilter(e.target.value as ParkingFilter)}
                                >
                                    <option value="all">전체</option>
                                    <option value="exit">출차</option>
                                    <option value="parking">주차중</option>
                                </select>
                            </div>
          
                            <div className="flex-1 overflow-auto scroll-container">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead className="bg-gray-100 text-gray-700 sticky top-0 z-20 dark:bg-[#2c2c2c] dark:text-white">
                                        <tr className="border-b border-gray-300 text-center dark:border-gray-500">
                                            <th className="px-3 py-2 font-semibold">전입시각</th>
                                            <th className="px-3 py-2 font-semibold">차량번호</th>
                                            <th className="px-3 py-2 font-semibold">주차시간</th>
                                            <th className="px-3 py-2 font-semibold">차량종류</th>
                                            <th className="px-3 py-2 font-semibold">주차 상태</th>
                                            <th className="px-3 py-2 font-semibold">결제금액</th>
                                        </tr>
                                    </thead>

                                    <tbody className="text-gray-700 bg-white dark:text-gray-100 cursor-pointer dark:bg-inherit">
                                        {filteredList.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-6 text-center text-gray-400 cursor-auto">
                                                    조회된 차량 내역이 없습니다
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredList.map((item, i) => (
                                                <tr
                                                    key={`${item.lp}-${item.in_time}-${i}`}
                                                    className={`
                                                        border-b border-gray-200 text-center transition cursor-pointer
                                                        dark:border-gray-500
                                                        
                                                        ${
                                                            selectedVehicle?.in_time === item.in_time
                                                            ? 'bg-blue-100 dark:bg-gray-600'
                                                            : 'hover:bg-gray-200 dark:hover:bg-gray-500'
                                                        }
                                                    `}
                                                    onClick={() => {
                                                        setSelectedVehicle(item);
                                                        setSelectedPayment(null);
                                                        setPaymentDetailInfo(null);
                                                    }}
                                                >
                                                    {/* 전입시각 */}
                                                    <td className="px-2 py-2">
                                                        {dayjs(item.in_time_person).format('MM.DD HH:mm')}
                                                    </td>

                                                    {/* 차량번호 */}
                                                    <td className="px-2 py-2 font-semibold">
                                                        {item.lp}
                                                    </td>

                                                    {/* 주차시간 */}
                                                    <td className="px-2 py-2">
                                                        {item.parking_time}
                                                    </td>

                                                    {/* 차종 */}
                                                    <td className="px-2 py-2">
                                                        {item.lp_type}
                                                    </td>

                                                    {/* 주차 상태 */}
                                                    <td
                                                        className={`px-2 py-2 font-semibold ${
                                                            item.parking_status === '출차'
                                                                ? 'text-green-500'
                                                                : 'text-orange-500'
                                                        }`}
                                                    >
                                                        {item.parking_status === '출차' ? '출차' : '주차중'}
                                                    </td>

                                                    {/* 결제금액 */}
                                                    <td className="px-2 py-2">
                                                        {item.parking_fee.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="h-[270px] rounded relative">
                                <div className="absolute top-0 left-0 w-0 h-0 
                                                border-l-[40px] border-l-[#8BC53F]
                                                border-b-[20px] border-b-transparent">
                                </div>
                                <div className="text-center bg-slate-400 text-white dark:bg-[#4B4B4B] font-bold text-sm p-1 rounded-t">
                                    입차
                                </div>

                                <div className="w-full h-[242px] flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-b">
                                    {selectedVehicle?.in_image_url ? (
                                        <img
                                            src={selectedVehicle.in_image_url}
                                            alt="입차 이미지"
                                            className="w-full h-full object-cover rounded-b"
                                        />
                                    ) : (
                                        <LuCameraOff className="text-gray-500 dark:text-gray-300 text-5xl" />
                                    )}
                                </div>
                            </div>
                            <div className="h-[270px] rounded relative">
                                <div className="absolute top-0 left-0 w-0 h-0 
                                                border-l-[40px] border-l-[#8BC53F]
                                                border-b-[20px] border-b-transparent">
                                </div>
                                <div className="text-center bg-slate-400 text-white dark:bg-[#4B4B4B] font-bold text-sm p-1 rounded-t">
                                    출차
                                </div>

                                <div className="w-full h-[242px] flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-b">
                                    {selectedVehicle?.out_image_url ? (
                                        <img
                                            src={selectedVehicle.out_image_url}
                                            alt="출차 이미지"
                                            className="w-full h-full object-cover rounded-b"
                                        />
                                    ) : (
                                        <LuCameraOff className="text-gray-500 dark:text-gray-300 text-5xl" />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 중앙 */}
                    <div className="col-span-3 flex flex-col gap-2">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="h-[209px] rounded dark:bg-[#373737] border dark:border-none relative">
                                <div className="absolute top-0 left-0 w-0 h-0 
                                                border-l-[40px] border-l-[#8BC53F]
                                                border-b-[20px] border-b-transparent">
                                </div>
                                <div className="text-center bg-slate-400 text-white dark:bg-[#4B4B4B] font-bold text-sm mb-2 p-1 rounded-t">
                                    주차현황
                                </div>
                                
                                <div className='px-2 pt-2'>
                                    <div className="grid grid-cols-3 text-gray-300 text-sm font-semibold ">
                                        <div></div>
                                        <div className="text-center text-orange-400">진입</div>
                                        <div className="text-right text-orange-400">진출</div>
                                    </div>

                                    <div className="text-gray-200 text-sm mt-2 space-y-2">
                                        <div className="grid grid-cols-3 text-black dark:text-white">
                                            <span>일반</span>
                                            <span className="text-center">
                                                {situation?.in_general_vehicles ?? 0}건
                                            </span>
                                            <span className="text-right">
                                                {situation?.out_general_vehicles ?? 0}건
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-3 text-black dark:text-white">
                                            <span>정기</span>
                                            <span className="text-center">
                                                {situation?.in_reg_vehicles ?? 0}건
                                            </span>
                                            <span className="text-right">
                                                {situation?.out_reg_vehicles ?? 0}건
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-3 text-black dark:text-white">
                                            <span>수동</span>
                                            <span className="text-center">
                                                {situation?.in_manual_vehicles ?? 0}건
                                            </span>
                                            <span className="text-right">
                                                {situation?.out_manual_vehicles ?? 0}건
                                            </span>
                                        </div>
                                    </div>

                                    <div className="absolute bottom-2 left-0 w-full px-2">
                                        <div className="flex justify-between text-orange-400 font-bold text-sm">
                                            <span>총합</span>
                                            <span>
                                                {(situation?.in_general_vehicles ?? 0)
                                                + (situation?.in_reg_vehicles ?? 0)
                                                + (situation?.in_manual_vehicles ?? 0)}건
                                            </span>
                                            <span>
                                                {(situation?.out_general_vehicles ?? 0)
                                                + (situation?.out_reg_vehicles ?? 0)
                                                + (situation?.out_manual_vehicles ?? 0)}건
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="h-[209px] rounded dark:bg-[#373737] border dark:border-none relative">
                                <div className="absolute top-0 left-0 w-0 h-0 
                                                border-l-[40px] border-l-[#8BC53F]
                                                border-b-[20px] border-b-transparent">
                                </div>
                                <div className="text-center bg-slate-400 text-white dark:bg-[#4B4B4B] font-bold text-sm mb-2 p-1 rounded-t">
                                    정산현황
                                </div>
                                
                                <div className='px-2 pt-2'>
                                    <div className="text-gray-200 text-sm space-y-2">
                                        <div className="flex justify-between text-black dark:text-white">
                                            <span>현금</span>
                                            <span>
                                                {situation?.cash != null
                                                    ? situation.cash.toLocaleString()
                                                    : 0}원
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-black dark:text-white">
                                            <span>신용카드</span>
                                             <span>
                                                {situation?.pre_parking_fee != null
                                                    ? situation.pre_parking_fee.toLocaleString()
                                                    : 0}원
                                            </span>
                                        </div>
                                    </div>

                                    <div className="absolute bottom-2 left-0 w-full px-2">
                                        <div className="flex justify-between text-orange-400 font-bold text-sm">
                                            <span>총합</span>
                                            <span>
                                                {situation?.parking_fee != null
                                                    ? situation.parking_fee.toLocaleString()
                                                    : 0}원
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col h-[calc(100vh-486px)] rounded dark:bg-[#373737] border dark:border-none relative">
                            <div className="absolute top-0 left-0 w-0 h-0 
                                            border-l-[40px] border-l-[#8BC53F]
                                            border-b-[20px] border-b-transparent">
                            </div>
                            <div className="text-center bg-slate-400 text-white dark:bg-[#4B4B4B] font-bold text-sm p-1 rounded-t">
                                차량정보
                            </div>
                                    
                            <div className="px-6 py-9 text-sm text-black space-y-4 h-full">
                                <div className="flex justify-between py-1.5">
                                    <span className="w-32 font-bold text-gray-600 dark:text-white">차량번호</span>
                                    <span className="ml-2 dark:text-white">
                                        {vehicleView?.lp ?? '-'}
                                    </span>
                                </div>

                                <div className="flex justify-between py-1.5">
                                    <span className="w-32 font-bold text-gray-600 dark:text-white">차량종류</span>
                                    <span className="ml-2 dark:text-white">
                                        {vehicleView?.lp_type ?? '-'}
                                    </span>
                                </div>

                                <div className="flex justify-between py-1.5">
                                    <span className="w-32 font-bold text-gray-600 dark:text-white">전입시각</span>
                                    <span className="ml-2 dark:text-white">
                                        {vehicleView?.in_time_person
                                            ? dayjs(vehicleView.in_time_person).format('YYYY.MM.DD HH:mm:ss')
                                            : '-'}
                                    </span>
                                </div>

                                <div className="flex justify-between py-1.5">
                                    <span className="w-32 font-bold text-gray-600 dark:text-white">전출시각</span>
                                    <span className="ml-2 dark:text-white">
                                        {vehicleView?.out_time_person
                                            ? dayjs(vehicleView.out_time_person).format('YYYY.MM.DD HH:mm:ss')
                                            : '-'}
                                    </span>
                                </div>

                                <div className="flex justify-between py-1.5">
                                    <span className="w-32 font-bold text-gray-600 dark:text-white">주차시간</span>
                                    <span className="ml-2 dark:text-white">
                                        {vehicleView?.parking_time ?? '-'}
                                    </span>
                                </div>

                                <div className="flex justify-between py-1.5">
                                    <span className="w-32 font-bold text-gray-600 dark:text-white">주차상태</span>
                                    <span className="ml-2 dark:text-white">
                                        {parkingStatus(vehicleView)
                                        ? vehicleView.parking_status
                                        : '-'}
                                    </span>
                                </div>
                                
                                <div className="flex justify-between py-1.5">
                                    <span className="w-32 font-bold text-gray-600 dark:text-white">결제금액</span>
                                    <span className="ml-2 font-bold text-orange-500">
                                        {vehicleView?.parking_fee != null
                                            ? `${vehicleView.parking_fee.toLocaleString()}원`
                                            : '-'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 우측 */}
                    <div className="col-span-4 flex flex-col gap-2">
                        <div className="flex flex-col h-[209px] rounded dark:bg-[#373737] border dark:border-none relative">
                            <div className="absolute top-0 left-0 w-0 h-0 
                                            border-l-[40px] border-l-[#8BC53F]
                                            border-b-[20px] border-b-transparent">
                            </div>
                            <div className="text-center bg-slate-400 text-white dark:bg-[#4B4B4B] font-bold text-sm p-1 rounded-t">
                                해당 차량 총 결제내역
                            </div>
                            
                            <div className="flex-1 overflow-auto scroll-container">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead className="bg-gray-100 text-gray-700 sticky top-0 z-20 dark:bg-[#2c2c2c] dark:text-white">
                                        <tr className="border-b border-gray-300 text-center dark:border-gray-500">
                                            <th className="px-3 py-2 font-semibold">승인일자</th>
                                            <th className="px-3 py-2 font-semibold">승인시간</th>
                                            <th className="px-3 py-2 font-semibold">결제매체</th>
                                            <th className="px-3 py-2 font-semibold">차량번호</th>
                                            <th className="px-3 py-2 font-semibold">승인금액</th>
                                        </tr>
                                    </thead>

                                    <tbody className="text-gray-700 bg-white dark:text-gray-100 dark:bg-inherit cursor-pointer">
                                        {paymentList.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-6 text-center text-gray-400 cursor-auto">
                                                    결제 내역이 없습니다
                                                </td>
                                            </tr>
                                        ) : (
                                            paymentList.map((item, i) => (
                                                <tr
                                                    key={`${item.lp}-${item.in_time}-${i}`}
                                                    className={`
                                                        border-b border-gray-200 text-center transition cursor-pointer
                                                        dark:border-gray-500
                                                        ${
                                                            selectedPayment?.in_time === item.in_time
                                                            ? 'bg-blue-100 dark:bg-gray-600'
                                                            : 'hover:bg-gray-200 dark:hover:bg-gray-500'
                                                        }
                                                        `}
                                                    onClick={() => setSelectedPayment(item)}
                                                >
                                                    <td className="px-2 py-2">{item.paydate}</td>
                                                    <td className="px-2 py-2">{item.paytime}</td>
                                                    <td className="px-2 py-2">{item.issuer ?? '-'}</td>
                                                    <td className="px-2 py-2 font-semibold">{item.lp}</td>
                                                    <td className="px-2 py-2 font-semibold text-orange-500">
                                                        {item.parking_fee.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex flex-col h-[150px] rounded dark:bg-[#373737] border dark:border-none relative">
                            <div className="absolute top-0 left-0 w-0 h-0 
                                            border-l-[40px] border-l-[#8BC53F]
                                            border-b-[20px] border-b-transparent">
                            </div>
                            <div className="text-center bg-slate-400 text-white dark:bg-[#4B4B4B] font-bold text-sm p-1 rounded-t">
                                할인내역
                            </div>
                            
                            <div className="flex-1 overflow-auto scroll-container">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead className="bg-gray-100 text-gray-700 sticky top-0 z-20 dark:bg-[#2c2c2c] dark:text-white">
                                        <tr className="border-b border-gray-300 text-center dark:border-gray-500">
                                            <th className="px-3 py-2 font-semibold">코드</th>
                                            <th className="px-3 py-2 font-semibold">할인종류</th>
                                            <th className="px-3 py-2 font-semibold">사유</th>
                                            <th className="px-3 py-2 font-semibold">수량</th>
                                        </tr>
                                    </thead>
                                    
                                    <tbody className="text-gray-700 bg-white dark:text-gray-100 dark:bg-inherit">
                                        {!paymentDetailInfo?.reduction_policy_idx ? (
                                            <tr>
                                                <td colSpan={4} className="py-6 text-center text-gray-400">
                                                    할인 내역이 없습니다
                                                </td>
                                            </tr>
                                        ) : (
                                            <tr
                                                className="hover:bg-gray-200 border-b border-gray-200 text-center
                                                        dark:border-gray-500 dark:hover:bg-gray-500"
                                            >
                                                <td className="px-2 py-2">
                                                    {paymentDetailInfo.reduction_policy_idx}
                                                </td>
                                                <td className="px-2 py-2">
                                                    {paymentDetailInfo.reduction_name}
                                                </td>
                                                <td className="px-2 py-2">
                                                    {paymentDetailInfo.contents ?? '-'}
                                                </td>
                                                <td className="px-2 py-2">1</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex flex-col h-[calc(100vh-644px)] rounded dark:bg-[#373737] border dark:border-none relative">
                            <div className="absolute top-0 left-0 w-0 h-0 
                                            border-l-[40px] border-l-[#8BC53F]
                                            border-b-[20px] border-b-transparent">
                            </div>
                            <div className="text-center bg-slate-400 text-white dark:bg-[#4B4B4B] font-bold text-sm p-1 rounded-t">
                                정산내역
                            </div>
                            
                            <div className="flex flex-col flex-1 px-6 py-4 text-sm text-gray-700 dark:text-gray-200 ">
                                <div className="flex justify-between py-2">
                                    <span>주차 요금</span>
                                    <span>{paymentDetailInfo?.parking_fee.toLocaleString() ?? '-'}</span>
                                </div>

                                <div className="flex justify-between py-2">
                                    <span>사전 정산</span>
                                    <span>{paymentDetailInfo?.pre_parking_fee.toLocaleString() ?? '-'}</span>
                                </div>

                                <div className="flex justify-between py-2">
                                    <span>할인 금액</span>
                                    <span>{paymentDetailInfo?.discount_fee.toLocaleString() ?? '-'}</span>
                                </div>

                                <div className="flex justify-between py-2"></div>

                                <div className="my-4 border-t border-gray-300 dark:border-gray-500" />

                                <div className="flex justify-between items-center text-orange-400">
                                    <span className="font-semibold text-lg">결제 금액</span>
                                    <span className="text-3xl font-extrabold">
                                        {Math.max(
                                            (paymentDetailInfo?.parking_fee ?? 0)
                                            - (paymentDetailInfo?.pre_parking_fee ?? 0)
                                            - (paymentDetailInfo?.discount_fee ?? 0),
                                            0
                                        ).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CarManagement
