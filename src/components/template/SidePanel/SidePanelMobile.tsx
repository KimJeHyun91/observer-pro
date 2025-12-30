import classNames from 'classnames'
import Drawer from '@/components/ui/Drawer'
import { PiGearDuotone } from 'react-icons/pi'
import { SidePanelContentProps } from './SidePanelContent'
import withHeaderItem from '@/utils/hoc/withHeaderItem'
import { useThemeStore } from '@/store/themeStore'
import type { CommonProps } from '@/@types/common'
import { useNavigationConfig } from '@/configs/navigation.config'
import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { IoIosArrowDown } from "react-icons/io";

type SidePanelProps = SidePanelContentProps & CommonProps

const SidePanel = (props: SidePanelProps) => {
    const categoryLabel = {
        building: '건물',
        disaster: '재난',
        parking: '주차',
    } as const
    
    type CategoryKey = keyof typeof categoryLabel

    const { className, ...rest } = props

    // 테마 및 상태 관련 (기존 테마 코드)
    const panelExpand = useThemeStore((state) => state.panelExpand)
    const direction = useThemeStore((state) => state.direction)
    const setPanelExpand = useThemeStore((state) => state.setPanelExpand)

    // 전체 모바일 메뉴 (prefix m_으로 시작하는 key만)
    const navItems = useNavigationConfig().filter(item => item.key.startsWith('m_'))

    // 카테고리 목록 추출
    const categories = useMemo(
        () => [...new Set(navItems.map(item => item.category))],
        [navItems]
    )

    const [selectedCategory, setSelectedCategory] = useState<string | undefined>()
    const filtered = navItems.filter(item => item.category === selectedCategory)
    const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({})
    const { pathname } = useLocation()
    const navigate = useNavigate()
    
    // 현재 라우트에 맞는 카테고리 자동 선택 + 서브메뉴가 있다면 자동 확장
    useEffect(() => {
        if (!selectedCategory && categories.length > 0) {
            const currentItem = navItems.find(item => pathname.startsWith(item.path))
            
            if (currentItem?.category) {
                setSelectedCategory(currentItem.category)

                if (
                    currentItem.subMenu?.length &&
                    currentItem.subMenu.some(sub => sub.path === pathname)
                ) {
                    setExpandedKeys(prev => ({
                        ...prev,
                        [currentItem.key]: true,
                    }))
                }
            } else {
                setSelectedCategory(categories[0])
            }
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname, categories, selectedCategory])

    const openPanel = () => {
        setPanelExpand(true)
    }

    const closePanel = () => {
        setPanelExpand(false)

        if (document) {
            const bodyClassList = document.body.classList
            if (bodyClassList.contains('drawer-lock-scroll')) {
                bodyClassList.remove('drawer-lock-scroll', 'drawer-open')
            }
        }
    }

    // 서브 메뉴 토글
    const toggle = (key: string) => {
        setExpandedKeys(prev => ({
            ...prev,
            [key]: !prev[key],
        }))
    }

    // 현재 경로가 유효한 메뉴 항목에 포함되어 있는지 확인
    const isValidPath = useMemo(() => {
        return navItems.some(item => 
            item.path === pathname || 
            item.subMenu?.some(sub => sub.path === pathname)
        )
    }, [pathname, navItems])

    // 잘못 된 경로일 경우 상태 초기화 첫 번째 카테고리 선택 / 펼침 상태 초기화
    useEffect(() => {
        if (!isValidPath && categories.length > 0) {
            setSelectedCategory(categories[0])
            setExpandedKeys({})
        }
    }, [isValidPath, categories])

    return (
        <>
            <div
                className={classNames('text-2xl', className)}
                onClick={openPanel}
                {...rest}
            >
                <PiGearDuotone />
            </div>
            <Drawer
                title="메뉴 목록"
                isOpen={panelExpand}
                placement={direction === 'rtl' ? 'left' : 'right'}
                width={375}
                bodyClass={"p-0"}
                onClose={closePanel}
                onRequestClose={closePanel}
            >
                {/* <SidePanelContent callBackClose={closePanel} /> */}
                <div className="flex h-full">
                    {/* 카테고리 목록 (좌측 패널) */}
                    <div className="w-32 bg-gray-100 border-r overflow-y-auto h-full">
                        {categories.map(key => (
                            <div
                                key={key}
                                className={classNames(
                                'px-4 py-3 text-sm cursor-pointer',
                                key === selectedCategory
                                    ? 'bg-white text-blue-600 font-semibold'
                                    : 'text-gray-700'
                                )}
                                onClick={() => setSelectedCategory(key)}
                            >
                                {categoryLabel[key as CategoryKey] ?? key}
                            </div>
                        ))}
                    </div>

                    {/* 하위 메뉴 목록 (우측 패널) */}
                    <div className="flex-1 overflow-y-auto">
                        {filtered.map((item,idx) => {
                            const isActive = pathname === item.path
                            const hasSubMenu = item.subMenu && item.subMenu.length > 0
                            const expanded = expandedKeys[item.key]

                            return (
                                <div key={item.key}>
                                    <div
                                        className={classNames(
                                            'px-4 py-3 text-sm cursor-pointer flex justify-between items-center',
                                            idx !== filtered.length - 1 && 'border-b border-gray-200',
                                            isActive && 'bg-blue-50 text-blue-600 font-semibold',
                                        )}
                                    >
                                        {/* 메인 메뉴 클릭 시 페이지 이동 */}
                                        <span
                                            className="flex-1"
                                            onClick={() => {
                                                if (item.path) {
                                                    navigate(item.path)
                                                    closePanel()
                                                }
                                            }}
                                        >
                                            {item.title}
                                        </span>

                                        {/* 토글 아이콘 */}
                                        {hasSubMenu && (
                                            <span
                                                className="text-xs ml-2 cursor-pointer"
                                                style={{
                                                    transition: 'transform 200ms ease-out',
                                                    transform: `rotateZ(${expanded ? 180 : 0}deg)`
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    toggle(item.key)
                                                }}
                                            >
                                                <IoIosArrowDown className="w-4 h-4" />
                                            </span>
                                        )}
                                    </div>
                                    
                                    {/* 서브 메뉴 목록 */}
                                    {hasSubMenu && (
                                        <div
                                            className={classNames(
                                                'ml-6 border-l border-gray-200 transition-all duration-300 overflow-hidden',
                                                expanded ? 'opacity-100' : 'opacity-0'
                                            )}
                                        >
                                            {item.subMenu!.map(sub => (
                                                <div
                                                    key={sub.key}
                                                    className={classNames(
                                                        'px-4 py-2 text-sm cursor-pointer',
                                                        pathname === sub.path && 'text-blue-600 font-semibold',
                                                    )}
                                                    onClick={() => {
                                                        navigate(sub.path)
                                                        closePanel()
                                                    }}
                                                >
                                                    {sub.title}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </Drawer>
        </>
    )
}

const SidePanelMobile = withHeaderItem(SidePanel)

export default SidePanelMobile
