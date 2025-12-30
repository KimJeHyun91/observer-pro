import withHeaderItem from '@/utils/hoc/withHeaderItem'
import { useThemeStore } from '@/store/themeStore'
// import useResponsive from '@/utils/hooks/useResponsive'
// import NavToggle from '@/components/shared/NavToggle'
// import type { CommonProps } from '@/@types/common'
import { useLocation } from 'react-router-dom'
import { HEADER_HEIGHT, LOGO_X_GUTTER, SIDE_NAV_CONTENT_GUTTER } from '@/constants/theme.constant'
import classNames from '@/utils/classNames'
import Logo from './Logo'
import { useAuthenticatedEntryPath } from '@/configs/entryPath'
import { useNavigationConfig } from '@/configs/navigation.config'

// const _SideNavToggle = ({ className }: CommonProps) => {
const _SideNavToggle = () => {
    const { layout } = useThemeStore((state) => state)
    const defaultMode = useThemeStore((state) => state.mode)
    const sideNavCollapse = layout.sideNavCollapse
    const mode = 'light';
    // const { larger } = useResponsive()

    // const onCollapse = () => {
    //     setSideNavCollapse(!sideNavCollapse)
    // }

    const location = useLocation()
    const entryPath = useAuthenticatedEntryPath()
    const navItems = useNavigationConfig()

    const firstURL = location.pathname.split('/')[1]
    const currentPath = location.pathname

    const currentMenu =
    navItems.find(item => currentPath === item.path) ||
    navItems.find(item => currentPath.startsWith(item.path + '/')) ||
    navItems.find(item => currentPath.startsWith(item.path));
    
    let pathURL = ''

    if (firstURL === 'main') {
        pathURL = '/origin'
    } else if (firstURL) {
        pathURL = '/' + firstURL
    } else {
        pathURL = entryPath
    }

    return (
        <>
            {/* {larger.md && (
                <div className={className} role="button" onClick={onCollapse}>
                    <NavToggle className="text-2xl" toggled={sideNavCollapse} />
                    
                </div>
            )} */}
            <a
                // to={appConfig.authenticatedEntryPath}
                href={pathURL}
                className="side-nav-header flex justify-center items-center"
                style={{ height: HEADER_HEIGHT }}
            >
                <Logo
                    imgClass="max-h-10"
                    mode={mode || defaultMode}
                    type={sideNavCollapse ? 'streamline' : 'full'}
                    className={classNames(
                        sideNavCollapse && 'ltr:ml-[11.5px] ltr:mr-[11.5px]',
                        sideNavCollapse
                            ? SIDE_NAV_CONTENT_GUTTER
                            : LOGO_X_GUTTER,
                    )}
                />
                {!sideNavCollapse && (
                    <h3 className="font-mono font-semibold mr-2 flex items-center gap-1">
                        TRANSFORMER PLATFORM OBSERVER
                        {/* {currentMenu?.title && (
                            <span className="ml-1 font-sans font-semibold text-[17px] h-[28px] flex items-center">
                                {currentMenu?.key === 'observer' ? '메인' : currentMenu?.title}
                            </span>
                        )} */}
                    </h3>
                )}
            </a>
        </>
    )
}

const SideNavToggle = withHeaderItem(_SideNavToggle)

export default SideNavToggle
