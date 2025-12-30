
import { ScrollBar } from '@/components/ui';
import { CrossingGate } from '@/@types/socket';

interface ControlStatusProps {
	crossingGateList: CrossingGate[];
}

interface ControlItemProps {
	id: number;
	name: string;
	status: boolean | null;
	location: string;
}

export function ControlStatus({ crossingGateList }: ControlStatusProps) {
	return (
		<ScrollBar className='h-full'>
			<div className="flex flex-col h-full mt-2">
				<div className="space-y-2">
					{crossingGateList.map((item) => (
						<ControlItem
							key={item.id}
							id={item.idx}
							name={item.outside_name}
							location={item.location || ''}
							status={item.crossing_gate_status}
						/>
					))}
				</div>
			</div>
		</ScrollBar>
	);
}

function ControlItem({ name, location, status }: ControlItemProps) {
	return (
		<div className="flex justify-between items-center p-2 bg-gray-200 dark:bg-gray-700 rounded">
			<div className="">
				<div className="font-medium font-semibold">{name}</div>
				<div className="text-sm text-gray-500 dark:text-gray-400">{location}</div>
			</div>
			{status ?
				<span className='border-2 border-green-500 p-2 rounded-lg text-green-500 font-semibold'>열림</span>
				:
				status === null || '' ?
				<span className="border-2 border-gray-500 p-2 rounded-lg text-gray-500 font-semibold leading-none">연결<br />끊김</span>
				:
				<span className='border-2 border-red-500 p-2 rounded-lg text-red-500 font-semibold'>닫힘</span>
			}
		</div>
	);
}