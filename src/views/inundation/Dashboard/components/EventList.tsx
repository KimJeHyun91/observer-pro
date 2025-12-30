import { useState, useEffect } from "react";
import { ScrollBar } from "@/components/ui";
import ParkingIcon from '@/configs/parking-icon.config';
import { apiGetEventList } from '@/services/InundationService';
import dayjs from 'dayjs';
import { useSocketConnection } from "@/utils/hooks/useSocketConnection";

interface EventItemType {
	id: string;
	event_name: string;
	description: string;
	event_occurrence_time: string;
	additional_info?: string;
}

interface EventTypes {
	[key: string]: string;
 }

const getEventTypeName = (eventTypeId: string) => {
	const eventTypes: EventTypes = {
		38: "위험 수위 감지(주의)",
		39: "위험 수위 감지(경계)",
		40: "위험 수위 감지(심각)",
		44: "위험 수위 감지(대피)",
		45: "인접 개소 침수 주의",
		47: "수위계 연동 차단기 자동제어",
		};
	return eventTypes[eventTypeId];
};

export function EventList() {
	const [events, setEvents] = useState<EventItemType[]>([]);
	const [targetIdx, setTargetIdx] = useState<number | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const { socketService } = useSocketConnection();

	const fetchEvents = async () => {
		try {
			setLoading(true);
			const yesterday = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
			const today = dayjs().format('YYYY-MM-DD');

			const res = await apiGetEventList({
				start: yesterday,
				end: today,
				mainServiceName: 'inundation',
			});

			if (res.message === 'ok') {
				const eventData = res.result.result || res.result;
				const mappedEvents: EventItemType[] = eventData.map((item: any, idx: number) => ({
					id: item.idx || `${idx + 1}`,
					event_name: getEventTypeName(item.event_type_id),
					description: item.location || item.description || "위치 없음",
					event_occurrence_time: item.event_occurrence_time
						? dayjs(item.event_occurrence_time, 'YYYYMMDDTHHmmss').format('YYYY-MM-DD HH:mm')
						: "시간 없음",
					additional_info: item.description || "추가 정보 없음",
				}));
				setEvents(mappedEvents); 
			}
		} catch (error) {
			console.error('이벤트 조회 중 오류 발생:', error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		socketService.initialize()
			.then(() => {
				fetchEvents();
			})
			.catch((error) => console.error('Socket initialization failed:', error));
	}, []);

	useEffect(() => {
		const eventUnsubscribe = socketService.subscribe('fl_events-update', (data: any) => {
			fetchEvents(); 
		});

		return () => eventUnsubscribe();
	}, []);

	const eventToggle = (idx: number) => {
		setTargetIdx(targetIdx === idx ? null : idx);
	};

	if (loading) {
		return <div>Loading events..</div>;
	}

	return (
		<ScrollBar className="h-[700px] overflow-y-auto">
			<div className="space-y-2">
				{events.length === 0 ? (
					<div className="text-center text-gray-500">최근 이벤트가 없습니다.</div>
				) : (
					<>
						{events.map((event, idx) => (
							<div
								key={event.id}
								className="flex items-center justify-between bg-white px-2 py-1 shadow-md rounded-md border border-gray-200 dark:bg-[#EBECEF]"
							>
								<div className="flex items-center gap-3 w-full">
									<div className="w-[35px] h-[32px] flex items-center justify-center bg-gray-100 rounded-full border">
										<span className="text-lg font-bold text-gray-500">✓</span>
									</div>
									<div className="flex flex-col w-full">
										<div className="flex justify-between items-center">
											<span className="text-sm font-bold text-gray-700 -mb-0.5">
												{event.event_name}
											</span>
											<button
												className="text-sm bg-[#B1B5C0] rounded-md"
												onClick={() => eventToggle(idx)}
											>
												{targetIdx === idx ? (
													<ParkingIcon.arrowLeftSquare className="w-[22px] h-[22px] p-0.5 text-[#FFFFFF]" />
												) : (
													<ParkingIcon.arrowRightSquare className="w-[22px] h-[22px] p-0.5 text-[#FFFFFF]" />
												)}
											</button>
										</div>
										<div className="flex items-center w-full mt-1">
											<div className="flex-1 border-t border-gray-300"></div>
										</div>
										<div className="flex items-center justify-between">
											<div className="table text-xs text-gray-500 mt-1">
												<div className="table-row">
													<span className="table-cell text-right pr-1">발생 일시 :</span>
													<span className="table-cell text-left">{event.event_occurrence_time}</span>
												</div>
												<div className="table-row">
													<span className="table-cell text-right pr-1">개소명 :</span>
													<span className="table-cell text-left">{event.description}</span>
												</div>
												{targetIdx === idx && (
													<div className="table-row">
														<span className="table-cell text-right pr-1">추가 정보 :</span>
														<span className="table-cell text-left">{event.additional_info}</span>
													</div>
												)}
											</div>
										</div>
									</div>
								</div>
							</div>
						))}
					</>
				)}
			</div>
		</ScrollBar>
	);
}