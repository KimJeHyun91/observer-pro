import { useCallback } from 'react';
import { useSettingsMenuStore } from '@/store/settingsStore';
import type { View } from "@/components/shared/configPages/settings/types";

interface MenuItem {
  label: string;
  value: View;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    title: '카메라',
    items: [
      { label: 'VMS 설정', value: 'vms' },
      { label: '개별 카메라', value: 'camera' },
    ]
  },
  {
    title: '전광판',
    items: [
      { label: '문구 설정', value: 'billboard_message' }
    ]
  },
  {
    title: '스피커',
    items: [
      { label: '음성 문구 설정', value: 'speaker_message' }
    ]
  },
  {
    title: '수위계',
    items: [
      { label: '수위계 설정', value: 'waterlevel_gauge' },
      { label: '차단기 연동', value: 'waterlevel_gauge_crossinggate' },
      { label: '임계치 설정', value: 'waterlevel_gauge_threshold' },
      { label: '수위계 그룹핑', value: 'waterlevel_group_mapping' }
    ]
  },
  {
    title: '이벤트',
    items: [
      { label: '이벤트 설정', value: 'event_setting' }
    ]
  }
];

export const InundationSettingsMenu = ({ onChange }: { onChange?: () => void }) => {
  const { currentMenuView, setCurrentMenuView } = useSettingsMenuStore();

  const handleMenuClick = useCallback((value: View) => {
    setCurrentMenuView(value);
    onChange?.();
  }, [setCurrentMenuView, onChange]);

  return (
    <div className="w-[8.3vw] h-full border-r-2 border-gray-200">
      {menuGroups.map((group) => (
        <div key={group.title} className="mb-2">
          <div className="px-4 py-2 font-medium text-gray-700 bg-gray-100 dark:bg-gray-400 mr-2 rounded">
            {group.title}
          </div>
          <div>
            {group.items.map((item) => (
              <div
                key={item.value}
                className={`
                  px-8 py-2 cursor-pointer text-sm
                  ${currentMenuView === item.value
                    ? 'text-green-600 font-bold'
                    : 'text-gray-600 dark:text-gray-200'
                  }
                `}
                onClick={() => handleMenuClick(item.value)}
              >
                {item.label}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default InundationSettingsMenu;