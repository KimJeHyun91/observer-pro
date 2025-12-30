import Menu from '@/components/ui/Menu';
import ScrollBar from '@/components/ui/ScrollBar';
import type { View } from "@/components/shared/configPages/settings/types";
import { useParkingStore } from '@/store/parking/useParkingStore';
import _ from 'lodash';

const menuList: { title : string ,label: string; value: View; }[] = [
	{ title: '카메라', label: 'VMS 설정', value: 'vms' },
	{ title: '카메라', label: '카메라 설정', value: 'camera' },
	{ title: '주차 센서', label: '주차 센서 설정', value: 'parking_sensor' },
	{ title: '이벤트', label: '이벤트 설정', value: 'event_setting' },
]

const groupedMenu = _.groupBy(menuList, 'title');

export const ParkingSettingsMenu = () => {
	const { setCurrentMenuView, menuState } = useParkingStore(
		(state) => ({
			menuState: state.menuState,
			setCurrentMenuView: state.setCurrentMenuView,
		})
	);

	const onChange = (value: View) => {
		setCurrentMenuView(value);
	}

	return (
		<div className="flex flex-col justify-between h-full border-solid border-r-2 border-gray-300 dark:border-gray-700">
			<ScrollBar className="h-full overflow-y-auto">
				<Menu className="p-2">
					{Object.entries(groupedMenu).map(([title, items]) => (
						<div key={title} className="mb-3">
							<div className="rounded-sm font-semibold bg-[#F2F5F9] px-1 py-1 mb-1 dark:bg-[#404040] dark:text-[#FFFFFF]">
								{title}
							</div>

							{items.map((menu) => (
								<Menu.MenuItem
									key={menu.value}
									eventKey={menu.value}
									className={`custom-menu mb-1 dark:text-[#FFFFFF]`}
									isActive={menuState.currentMenuView === menu.value}
									onSelect={() => onChange(menu.value)}
								>
									<span>{menu.label}</span>
								</Menu.MenuItem>
							))}
						</div>
					))}
				</Menu>
			</ScrollBar>
		</div>
	)
}

export default ParkingSettingsMenu;