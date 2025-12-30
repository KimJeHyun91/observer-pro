import Container from '@/components/shared/Container'
import classNames from '@/utils/classNames'
// import { APP_NAME } from '@/constants/app.constant'
import { PAGE_CONTAINER_GUTTER_X } from '@/constants/theme.constant'
import SideNav from './SideNav'
import { useServiceNavStore } from '@/store/serviceNavStore'
import { useState, useRef, RefObject, useEffect } from 'react'
import { useNavigationConfig } from '@/configs/navigation.config'

export type FooterPageContainerType = 'gutterless' | 'contained'

type FooterProps = {
    pageContainerType: FooterPageContainerType
    className?: string
}

// 대분류 라벨 정의
const categoryLabels = {
    building: '건물',
    disaster: '재난',
    parking: '주차',
}

type CategoryKey = keyof typeof categoryLabels

const FooterContent = () => {
    const { use } = useServiceNavStore()
    const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null)
    const [menuPosition, setMenuPosition] = useState<{ left: number; width: number } | null>(null)
    const navItems = useNavigationConfig()
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const clickHide = (e: MouseEvent) => {
            if (activeCategory) {
                const insideButton = Object.values(buttonRef).some(
                    ref => ref.current?.contains(e.target as Node)
                )
                // const insideMenu = menuRef.current?.contains(e.target as Node)
                
                if (!insideButton) {
                    setActiveCategory(null)
                    setMenuPosition(null)
                }
            }
        }
    
        const resizeHide = () => {
            if (activeCategory) {
                setActiveCategory(null)
                setMenuPosition(null)
            }
        }
    
        window.addEventListener('click', clickHide)
        window.addEventListener('resize', resizeHide)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') resizeHide()
        })
    
        return () => {
            window.removeEventListener('click', clickHide)
            window.removeEventListener('resize', resizeHide)
            document.removeEventListener('visibilitychange', resizeHide)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCategory])

    // 현재 메뉴들 중 category가 존재하는 것만 추출
    const useCategoriMenu = Array.from(
        new Set(navItems.map((item) => item.category).filter(Boolean))
    )

    const visibleCategoryLabel = Object.entries(categoryLabels).filter(
        ([key]) => useCategoriMenu.includes(key as CategoryKey)
      )

    // 각 대분류 버튼에 대한 ref 저장 (위치 계산용)
    const buttonRef: Record<CategoryKey, RefObject<HTMLButtonElement>> = {
        building: useRef(null),
        disaster: useRef(null),
        parking: useRef(null),
    }

    // 버튼 클릭 시 메뉴 열기 or 닫기
    const categoryClick = (key: CategoryKey) => {
        if (activeCategory === key) {
            // 같은 버튼 다시 누르면 닫기
            setActiveCategory(null)
            setMenuPosition(null)
        } else {
            // 버튼 위치 계산해서 드롭업 메뉴 위치 조정
            const button = buttonRef[key].current
            if (button) {
                const rect = button.getBoundingClientRect()
                setMenuPosition({ left: rect.left + rect.width / 2, width: rect.width })
            }
            setActiveCategory(key)
        }
    }
    
    if (!use) return null

    return (
        <div className="relative w-full">
            {/* 대분류 버튼 */}
            <div className="flex justify-between w-full bg-white px-1 py-3 shadow-inner dark:bg-gray-800">
                {visibleCategoryLabel.map(([key, label]) => (
                    <button
                        key={key}
                        ref={buttonRef[key as CategoryKey]}
                        className={`w-full text-center py-2 font-semibold text-[15px] transition rounded mx-2
                            ${activeCategory === key
                              ? 'bg-blue-100 text-blue-600 dark:bg-[#6F93D3] dark:text-[#FFFFFF]'
                              : 'bg-gray-100 hover:bg-gray-200 dark:bg-[#404040] dark:hover:bg-[#555]'
                            } `}
                        onClick={() => categoryClick(key as CategoryKey)}
                    >
                        {label}
                    </button>
                ))}
            </div>
                
            {/* 대분류 안에 메뉴 열기 (드롭업) */}
            {activeCategory && menuPosition && (
                <div
                    ref={menuRef}
                    className="absolute bottom-full animate-slide-up z-10"
                    style={{
                        left: menuPosition.left,
                        transform: 'translateX(-51.8%)',
                        width: `${menuPosition.width}px`,
                    }}
                >
                    <div className="bg-white rounded shadow-md px-2 py-2 dark:bg-[#404040]">
                        <SideNav
                            categoryFilter={activeCategory}
                            background={false}
                            className="w-full"
                            contentClass="flex flex-col gap-2 w-full"
                            onMenuItemClick={() => {
                                setActiveCategory(null)
                                setMenuPosition(null)
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

export default function Footer({
    pageContainerType = 'contained',
    className,
}: FooterProps) {
    const { use } = useServiceNavStore();
    const FOOTER_HEIGHT = use ? 'h-[60px]' : 'h-0';
    return (
        <footer
            className={classNames(
                `footer flex flex-auto items-center ${FOOTER_HEIGHT} ${PAGE_CONTAINER_GUTTER_X}`,
                className,
            )}
        >
            {pageContainerType === 'contained' ? (
                <Container>
                    <FooterContent />
                </Container>
            ) : (
                <FooterContent />
            )}
        </footer>
    )
}
