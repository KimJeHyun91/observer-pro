import { useState, useMemo, useEffect } from 'react';
import ScrollBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';
import { useSettingsStore } from '@/store/Inundation/useSettingsStore';

interface TreeNode {
	id: string;
	name: string;
	location: string;
	children?: {
		id: string;
		name: string;
		location?: string;
		unlinked?: boolean;
	}[];
}

export function WaterlevelLinkCrossingGates() {
	const { waterlevelLinkCrossinggateList } = useSettingsStore();
	const groupedData = useMemo(() => {
		const grouped = waterlevelLinkCrossinggateList.reduce((acc, item) => {
			const key = item.water_level_idx;
			if (!acc[key]) {
				acc[key] = {
					id: String(item.water_level_idx),
					name: item.water_level_name,
					location: item.water_level_location,
					children: []
				};
			}
			acc[key].children?.push({
				id: String(item.outside_idx),
				name: item.outside_name,
				location: item.location,
				unlinked: !item.linked_status
			});
			return acc;
		}, {} as Record<string, TreeNode>);

		return Object.values(grouped);
	}, [waterlevelLinkCrossinggateList]);

	const [toggleState, setToggleState] = useState(new Set(groupedData.map((node) => node.id)));

	useEffect(() => {
		setToggleState(new Set(groupedData.map((node) => node.id)));
	}, [groupedData]);

	const toggleNode = (nodeId: string) => {
		setToggleState((prev) => {
			const newState = new Set(prev);
			if (newState.has(nodeId)) {
				newState.delete(nodeId);
			} else {
				newState.add(nodeId);
			}
			return newState;
		});
	};

	return (
		<ScrollBar className="h-full">
			<div className="flex-1 space-y-1 mt-2">
				{groupedData.map((node) => (
					<div key={node.id} className="p-1 rounded-md bg-[#EBECEF]">
						<div
							className={`cursor-pointer font-bold p-1 flex justify-between items-center text-black ${toggleState.has(node.id) ? "bg-[#FAFBFB] border rounded-md" : "bg-[#EBECEF]"
								}`}
							onClick={() => toggleNode(node.id)}
						>
							<span>
								{node.name} ({node.location})
							</span>
							<span className="text-[#8D8D8D]">
								{toggleState.has(node.id) ? "▲" : "▼"}
							</span>
						</div>

						{toggleState.has(node.id) && node.children && (
							<div className="mt-1 ml-4 space-y-1">
								{node.children.map((child) => (
									<div
										key={child.id}
										className={`p-1 text-black flex justify-between items-center ${child.unlinked ? "text-red-500" : ""
											}`}
									>
										<span>- {child.name}</span>
										{child.unlinked && child.id !== "null" && (
											<span className="text-red-500">!</span>
										)}
									</div>
								))}
							</div>
						)}
					</div>
				))}
			</div>
		</ScrollBar>
	);
}
