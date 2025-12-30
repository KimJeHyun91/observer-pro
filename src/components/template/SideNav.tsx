import classNames from '@/utils/classNames'
import ScrollBar from '@/components/ui/ScrollBar'
// import Logo from '@/components/template/Logo'
import VerticalMenuContent from '@/components/template/VerticalMenuContent'
import { useThemeStore } from '@/store/themeStore'
import { useSessionUser } from '@/store/authStore'
import { useRouteKeyStore } from '@/store/routeKeyStore'
import navigationConfig, { useNavigationConfig } from '@/configs/navigation.config'
// import appConfig from '@/configs/app.config'
// import { Link } from 'react-router-dom'
import {
    SIDE_NAV_WIDTH,
    SIDE_NAV_COLLAPSED_WIDTH,
    // SIDE_NAV_CONTENT_GUTTER,
    // HEADER_HEIGHT,
    // LOGO_X_GUTTER,
} from '@/constants/theme.constant'
import type { Mode } from '@/@types/theme'
import { useServices } from '@/utils/hooks/useServices'
import { Service } from '@/@types/service'
import { memo } from 'react'
import { ApiResultObjectArray } from '@/@types/api'

type SideNavProps = {
    categoryFilter?: string 
    translationSetup?: boolean
    background?: boolean
    className?: string
    contentClass?: string
    mode?: Mode
    onMenuItemClick?: () => void
}

const sideNavStyle = {
    width: SIDE_NAV_WIDTH,
    minWidth: SIDE_NAV_WIDTH,
}

const sideNavCollapseStyle = {
    width: SIDE_NAV_COLLAPSED_WIDTH,
    minWidth: SIDE_NAV_COLLAPSED_WIDTH,
}

const SideNav = ({
    categoryFilter,
    translationSetup = true,
    background = true,
    className,
    contentClass,
    onMenuItemClick,
    // mode,
}: SideNavProps) => {
    // const defaultMode = useThemeStore((state) => state.mode)
    const direction = useThemeStore((state) => state.direction)
    const navItems = useNavigationConfig()
    const sideNavCollapse = useThemeStore(
        (state) => state.layout.sideNavCollapse,
    )
    const currentRouteKey = useRouteKeyStore((state) => state.currentRouteKey)
    const userAuthority = useSessionUser((state) => state.user.authority)

    const { data: services, error, isLoading } = useServices<ApiResultObjectArray<Service>>();
    if (isLoading) return <p>Loading...</p>;
    if (error) return <p>Error: {error.message}</p>;

    if (services) {
        const useService = navItems
        .filter((navItem) =>
            services.result.find((service: Service) => service.main_service_name === navItem.key)
        )
        .filter((navItem) => !categoryFilter || navItem.category === categoryFilter)

        return (
            <div
                // style={sideNavCollapse ? sideNavCollapseStyle : sideNavStyle}
                className={classNames(
                    'side-nav',
                    background && 'side-nav-bg',
                    !sideNavCollapse && 'side-nav-expand',
                    className,
                )}
            >
                {/* <Link
                    to={appConfig.authenticatedEntryPath}
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
                    {!sideNavCollapse && <h3 className='mt-2 font-mono font-semibold'>OBSERVER</h3>}
                </Link> */}
                <div className={classNames('side-nav-content', contentClass)}>
                    <ScrollBar style={{ height: '100%' }} direction={direction}>
                        <VerticalMenuContent
                            collapsed={sideNavCollapse}
                            navigationTree={useService}
                            routeKey={currentRouteKey}
                            direction={direction}
                            translationSetup={translationSetup}
                            userAuthority={userAuthority || []}
                            onMenuItemClick={onMenuItemClick}
                        />
                    </ScrollBar>
                </div>
            </div>
        )
    }
}

export default memo(SideNav)
