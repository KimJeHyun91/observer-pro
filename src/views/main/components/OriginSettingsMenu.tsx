import Menu from '@/components/ui/Menu';
import ScrollBar from '@/components/ui/ScrollBar';
import { MainSetting, useSettingStore } from '@/store/main/useSettingStore';

const menuList: { title: string, label: string; value: MainSetting; }[] = [
  { title: '카메라', label: 'VMS 설정', value: 'vms' },
  { title: '카메라', label: '카메라 설정', value: 'camera' },
  { title: '이벤트', label: '이벤트 설정', value: 'event' },
  { title: 'SOP 설정', label: 'SOP 절차 등록', value: 'sop-1' },
  { title: 'SOP 설정', label: '오탐 사유 등록', value: 'sop-2' },
  { title: '출입통제', label: '출입통제 설정', value: 'accessCtl' },
  { title: '출입통제', label: '출입자 관리', value: 'accessCtl-sms' },
  { title: '비상벨', label: '비상벨 설정', value: 'ebell' },
  { title: 'PIDS', label: 'PIDS 설정', value: 'PIDS' },
];

// title 기준으로 메뉴 그룹화
const groupedMenu = menuList.reduce((acc, item) => {
  if (!acc[item.title]) acc[item.title] = [];
  acc[item.title].push(item);
  return acc;
}, {} as Record<string, typeof menuList>);

export const OriginalSettingMenu = () => {
  const { setCurrentMenuView, menuState } = useSettingStore(
    (state) => ({
      menuState: state.menuState,
      setCurrentMenuView: state.setCurrentMenuView,
    })
  );

  const onChange = (value: MainSetting) => {
    setCurrentMenuView(value);
  };

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

export default OriginalSettingMenu;