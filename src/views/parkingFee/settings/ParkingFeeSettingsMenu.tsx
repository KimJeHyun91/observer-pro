import Menu from '@/components/ui/Menu';
import ScrollBar from '@/components/ui/ScrollBar';
import type { View } from "@/components/shared/configPages/settings/types";
import { useParkingFeeStore } from '@/store/parkingFee/useParkingFeeStore';

const menuList: { title : string ,label: string; value: View; }[] = [
	{ title: '차단기', label: '차단기 등록', value: 'crossing_gate' },
]

export const ParkingFeeSettingsMenu = () => {
	const { setCurrentMenuView, menuState } = useParkingFeeStore(
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
					{menuList.map((menu,index) => (
						<div key={index}>
							<div className='rounded-sm font-semibold bg-[#F2F5F9] px-1 py-1 mb-1 dark:bg-[#404040] dark:text-[#FFFFFF]'>
								{menu.title}
							</div>
							
							<Menu.MenuItem
								key={menu.value}
								eventKey={menu.value}
								className={`custom-menu mb-1 dark:text-[#FFFFFF]`}
								isActive={menuState.currentMenuView === menu.value}
								onSelect={() => onChange(menu.value)} 
							>
								<span>{menu.label}</span>
							</Menu.MenuItem>
						</div>
						
					))}
				</Menu>
			</ScrollBar>
		</div>
	)
}

export default ParkingFeeSettingsMenu;