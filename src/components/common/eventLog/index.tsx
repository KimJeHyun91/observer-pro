import { useState, useEffect, useCallback, useRef } from "react";
import { FaRegBell } from "react-icons/fa";
import { motion } from "framer-motion";
import { useEventLogList } from "@/utils/hooks/useEventLog";
import { EventLogType } from "@/@types/common";
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
import { useSessionUser } from '@/store/authStore'
import { apiEventLogCheck, apiWarningBoardDelete, apiCheckUseWarningBoard, apiInsertWarningBoard } from "@/services/CommonService";
import { IoIosCheckmarkCircleOutline } from "react-icons/io";
import { useLocation } from "react-router-dom";
import dayjs from 'dayjs'

const EventLog = () => {
    const {
        data,
        mutate
    } = useEventLogList()
    const { socketService } = useSocketConnection();
    const [isOpen, setIsOpen] = useState(false);
    const [events, setEvents] = useState<EventLogType[]>([]);
    const [eventLogCheckCount, setEventLogCheckCount] = useState<EventLogType[]>([]);
    const location = useLocation();
    const [isShaking, setIsShaking] = useState(false);
    const user = useSessionUser((state) => state.user)
    const severityType = [
        { label: 'info', value: 0, },
        { label: 'minor', value: 1 },
        { label: 'major', value: 2 },
        { label: 'critical', value: 3 }
    ]
    const mainServiceName = [
        { label: '옵저버', value: 'origin' },
        { label: '주차관리', value: 'parking' },
        { label: '침수우려차단', value: 'inundation' },
        { label: '마을방송', value: 'broadcast' },
        { label: '터널', value: 'tunnel' },
        { label: '주차요금', value: 'parkingFee' },
    ];

    const observer = useRef<IntersectionObserver | null>(null);
    const [page, setPage] = useState(1);
    const [visibleEvents, setVisibleEvents] = useState<EventLogType[]>([]);
    const PAGE_SIZE = 100;

    useEffect(() => {
        const updateWarningBoard = async () => {

            if (eventLogCheckCount.length === 0) {
                await warningBoardDelete(); // 이벤트가 전부 확인 됐으면 워닝보드 삭제
                setIsShaking(false);
                return;
            }
            const warningBoard = await apiCheckUseWarningBoard(eventLogCheckCount as unknown as Record<string, unknown>);

            // api 응답이 없거나 결과가 비어있는 경우 워닝보드 삭제 후 종료
            if (!warningBoard || !warningBoard.result || warningBoard.result.length === 0) {
                await warningBoardDelete(); // 워닝보드 삭제
                setIsShaking(false); // UI 흔들림 효과 중지
                return;
            }

            // 무조건 제일 위에 로그가 워닝보드에 등록되도록 처리
            const targetEvent = eventLogCheckCount[0];

            // 타겟 이벤트가 있으면 워닝보드에 등록
            if (targetEvent) {
                // 초기 데이터 워닝 보드 표출
                await apiInsertWarningBoard({
                    eventName: targetEvent.event_name,  // 이벤트 이름 설정
                    location: targetEvent.location,    // 이벤트 발생 위치 설정
                });
            } else {
                // 타겟 이벤트가 없으면 워닝보드 삭제 후 종료
                await warningBoardDelete();
                setIsShaking(false);
            }
        };
        updateWarningBoard();

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventLogCheckCount]);

    useEffect(() => {

        if (data?.result) {
            setEvents((prevEvents) => {
                const newEvents = data.result;
                const prevMap = new Map(prevEvents.map((e) => [e.idx, e]));
                const updatedEvents = [...prevEvents];

                newEvents.forEach((event: EventLogType) => {
                    if (!prevMap.has(event.idx) || prevMap.get(event.idx) !== event) {
                        // 새로운 이벤트 추가 될때만 업데이트 하도록
                        const index = updatedEvents.findIndex((e) => e.idx === event.idx);
                        if (index === -1) {
                            updatedEvents.unshift(event);
                        } else {
                            updatedEvents[index] = event;
                        }
                    }
                });

                updatedEvents.sort((a, b) => {
                    const timeComparison = b.event_occurrence_time.localeCompare(a.event_occurrence_time);
                    return timeComparison !== 0 ? timeComparison : b.idx - a.idx;
                });

                return updatedEvents;
            });

            setEventLogCheckCount(() =>
                data.result.filter((event: EventLogType) => !event.is_acknowledge)
            );
        }
    }, [data]);

    useEffect(() => {
        if (!isOpen) {
            setPage(1);  // 팝업이 닫힐 때 page 초기화
            setVisibleEvents(events.slice(0, PAGE_SIZE)); // 100개만 다시 표시
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    useEffect(() => {
        if (isShaking) {
            const shakeTimer = setTimeout(() => {
                setIsShaking(false); // 10초 후
            }, 10000);

            return () => clearTimeout(shakeTimer);
        }
    }, [isShaking]);

    useEffect(() => {
        if (!socketService) {
            return;
        }

        const eventLogSocket = socketService.subscribe('cm_event_log-update', (received) => {
            if (!received) return;

            if ("eventLogCheck" in received) {
                mutate();
                return;
            }

            // 기본 동작
            setIsShaking(false);
            mutate();
            setTimeout(() => setIsShaking(true), 100);
        })

        return () => {
            eventLogSocket();
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socketService])

    useEffect(() => {
        setIsOpen(false);
    }, [location]);

    const deviceString = (serviceType: string) => {
        switch (serviceType) {
            case 'sensor':
                return '센서';
            case 'camera':
                return '카메라';
            case 'waterlevel':
                return '수위계';
            case 'crossinggate':
                return '차단기'
            default:
                return '미분류';
        }
    }

    const checkEvent = async (event: EventLogType) => {
        const checkEventData = {
            eventIdxArray: [{ idx: event.idx }],
            user_name: user.userName
        };

        await apiEventLogCheck(checkEventData);
    };

    const checkAllEvent = async () => {
        const checkFilterEvents = events.filter(event => !event.is_acknowledge);

        if (checkFilterEvents.length === 0) return;

        const eventIdxArray = checkFilterEvents.map(event => ({
            idx: event.idx,
        }));

        await apiEventLogCheck({
            eventIdxArray,
            user_name: user.userName
        });
    };

    const warningBoardDelete = async () => {
        await apiWarningBoardDelete();
    }

    const lastElementRef = useCallback((node: HTMLDivElement) => {
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setPage((prevPage) => prevPage + 1);
            }
        });

        if (node) observer.current.observe(node);
    }, []);

    useEffect(() => {
        setVisibleEvents(events.slice(0, page * PAGE_SIZE));
    }, [page, events]);

    return (
        <div className="relative">
            {/* 종 아이콘 + 이벤트 개수 */}
            <motion.button
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-black transition group"
                animate={isShaking ? { rotate: [0, -50, 50, -50, 50, 0] } : { rotate: 0 }}  // 중지 시 회전값 0                      
                transition={{ duration: isShaking ? 0.33 : 0, repeat: isShaking ? 30 : 0, repeatType: "loop" }}  // 중지 시 부드럽게 복귀
                title='알림'
                onClick={() => setIsOpen(!isOpen)}
            >
                <FaRegBell className="w-5 h-5 text-gray-700 dark:text-gray-400 group-hover:text-black dark:group-hover:text-white" />
                {eventLogCheckCount.length > 0 && (
                    <span className={`absolute -top-1 
                        ${eventLogCheckCount.length > 999 ? "-right-3.5 w-8 px-3" : eventLogCheckCount.length > 99 ? "-right-2 w-6 px-2" : "-right-1 w-5"} text-[10px] bg-red-500 text-white font-bold h-5 flex items-center justify-center rounded-full leading-none`}>
                        {eventLogCheckCount.length > 999 ? "999+" : eventLogCheckCount.length}
                    </span>

                )}
            </motion.button>

            {/* 이벤트 팝업 */}
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 w-[440px] bg-white  shadow-xl rounded-lg overflow-hidden border border-white dark:border-none"
                >
                    {/* 팝업 헤더 */}
                    <div className="flex justify-between items-center p-2 bg-[#9CA3B1] text-gray-800">
                        <div className="flex items-center gap-2">
                            <FaRegBell className="w-5 h-5 text-white" />
                            <p className="text-white font-bold">전체 이벤트</p>
                        </div>
                        <button className="bg-[#EBECEF] w-5 h-5 text-[#9CA3B1] hover:text-gray-900 rounded-sm" onClick={() => setIsOpen(false)}>
                            X
                        </button>
                    </div>

                    {/* 이벤트 리스트 */}
                    <div className="max-h-[500px] h-[500px] overflow-y-auto px-2 scroll-container">
                        {visibleEvents.map((event: EventLogType, index: number) => (
                            <div
                                key={event.idx}
                                ref={index === visibleEvents.length - 1 ? lastElementRef : null}
                                className="mt-2 flex flex-col items-center bg-[#EBECEF] px-2 py-1 shadow-md rounded-md border border-gray-200 dark:bg-[#EBECEF]"
                            >
                                {/* 이벤트 정보 */}
                                <div className="flex items-center gap-6 w-full pl-3">
                                    <div className={`
                                        w-[47px] h-[40px] flex items-center justify-center rounded-full select-none
                                        ${event.is_acknowledge ? 'border-[2.5px] border-[#616A79]' : 'border-[2.5px] border-[#D76767]'}
                                    `}>
                                        {event.is_acknowledge ? (
                                            <span className="text-lg font-bold text-[#616A79]">✓</span>
                                        ) : (
                                            <span className="text-[25px] font-bold text-[#D76767] h-full">!</span>
                                        )}
                                    </div>
                                    <div className="flex flex-col w-full">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-bold text-gray-700 -mb-0.5">{event.event_name}</span>
                                        </div>
                                        <div className="flex items-center w-full mt-1">
                                            <div className="flex-1 border-t border-gray-400"></div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="table text-xs text-black mt-1">
                                                <div className="table-row">
                                                    <span className="table-cell text-right pr-1">이벤트 중요도 :</span>
                                                    <span className="table-cell text-left">{severityType.find(type => type.value === event.severity_id)?.label}</span>
                                                </div>
                                                <div className="table-row">
                                                    <span className="table-cell text-right pr-1">발생 일시 :</span>
                                                    <span className="table-cell text-left">{dayjs(event.event_occurrence_time).format('YYYY-MM-DD HH:mm:ss')}</span>
                                                </div>
                                                <div className="table-row">
                                                    <span className="table-cell text-right pr-1">발생 위치 :</span>
                                                    <span className="table-cell text-left">{event.location || '-'}</span>
                                                </div>
                                                <div className="table-row">
                                                    <span className="table-cell text-right pr-1">장치 종류 :</span>
                                                    <span className="table-cell text-left">{deviceString(event.device_type || '')}</span>
                                                </div>
                                                <div className="table-row">
                                                    <span className="table-cell text-right pr-1">서비스 :</span>
                                                    <span className="table-cell text-left">{mainServiceName.find(type => type.value === event.main_service_name)?.label}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 버튼 */}
                                <div className="w-full mt-2 flex justify-center">
                                    <button
                                        className={`
                                            bg-[#FFFFFF] select-none text-gray-700 px-4 py-1 rounded-md w-full text-sm flex items-center justify-center gap-2
                                            ${event.is_acknowledge ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'}
                                        `}
                                        disabled={event.is_acknowledge}
                                        onClick={() => checkEvent(event)}
                                    >
                                        {event.is_acknowledge ? "확인 완료" : "미확인"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center w-full mt-2 px-2">
                        <div className="flex-1 border-t border-gray-200"></div>
                    </div>

                    {/* 전체 이벤트 확인 버튼 */}
                    <div className="p-2">
                        <button
                            className={`w-full h-[30px] text-black justify-center flex items-center gap-2 rounded-md text-sm font-medium
                                        bg-[#E0E0E0] transition-all duration-200
                                        ${eventLogCheckCount.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#D6D6D6] active:bg-[#C5C5C5]'}
                                    `}
                            disabled={eventLogCheckCount.length === 0}
                            onClick={checkAllEvent}
                        >
                            <IoIosCheckmarkCircleOutline className="w-5 h-5 text-[#17A36F] font-bold" /> 전체 이벤트 확인
                        </button>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default EventLog;