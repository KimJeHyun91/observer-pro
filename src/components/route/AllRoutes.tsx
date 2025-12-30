import ProtectedRoute from './ProtectedRoute'
import PublicRoute from './PublicRoute'
import AuthorityGuard from './AuthorityGuard'
import AppRoute from './AppRoute'
import PageContainer from '@/components/template/PageContainer'
import { protectedRoutes, publicRoutes } from '@/configs/routes.config'
// import appConfig from '@/configs/app.config'
import { useAuth } from '@/auth'
import { Routes, Route, Navigate } from 'react-router-dom'
import type { LayoutType } from '@/@types/theme'
import { useNavigationConfig } from '@/configs/navigation.config'
import { useAuthenticatedEntryPath } from '@/configs/entryPath'
import NotFound from '@/views/others/NotFound'
import { useMemo } from 'react'
import Loading from '../shared/Loading'
import { useDeviceStore } from '@/store/common/useDeviceStore'

interface ViewsProps {
    pageContainerType?: 'default' | 'gutterless' | 'contained'
    layout?: LayoutType
}

type AllRoutesProps = ViewsProps

// const { authenticatedEntryPath } = appConfig

const AllRoutes = (props: AllRoutesProps) => {
    const { user } = useAuth()
    const isMobile = useDeviceStore((state) => state.isMobile)

    const navigationConfig = useNavigationConfig()
    const authenticatedEntryPath = useAuthenticatedEntryPath()
    const enabledKeys = navigationConfig.map((item) => item.key)
    
    // const filtered = useMemo(() => {
    //     return protectedRoutes.filter(route => {
    //         const baseKey = route.key.split('.')[0]
    //         return enabledKeys.includes(baseKey)
    //     })
    // }, [enabledKeys])
    
    const filtered = useMemo(() => {
        return protectedRoutes.filter(route => {
            const baseKey = route.key.split('.')[0]
            const deviceType = route.meta?.device ?? 'both'
            const allow =
                deviceType === 'both' ||
                (isMobile && deviceType === 'mobile') ||
                (!isMobile && deviceType === 'desktop')
            return enabledKeys.includes(baseKey) && allow
        })
    }, [enabledKeys, isMobile])

    if (!authenticatedEntryPath) {
        return <Loading loading={true}/>
    }

    return (
        <Routes>
            <Route path="/" element={<ProtectedRoute />}>
                <Route
                    path="/"
                    element={<Navigate replace to={authenticatedEntryPath} />}
                />
               {filtered.map((route, index) => {
                    const pageElement = (
                        <AppRoute
                            routeKey={route.key}
                            component={route.component}
                            {...route.meta}
                        />
                    )
                    
                    const wrappedElement = isMobile ? (
                        pageElement
                    ) : (
                        <PageContainer {...props} {...route.meta}>
                            {pageElement}
                        </PageContainer>
                    )

                    return (
                        <Route
                            key={route.key + index}
                            path={route.path}
                            element={
                                <AuthorityGuard
                                    userAuthority={user.authority}
                                    authority={route.authority}
                                >
                                    {wrappedElement}
                                </AuthorityGuard>
                            }
                        />
                    )
                })}

                {/* <Route path="*" element={<Navigate replace to="/" />} /> */}
            </Route>
      
            <Route path="/" element={<PublicRoute />}>
                {publicRoutes.map((route) => (
                    <Route
                        key={route.path}
                        path={route.path}
                        element={
                            <AppRoute
                                routeKey={route.key}
                                component={route.component}
                                {...route.meta}
                            />
                        }
                    />
                ))}
            </Route>
            <Route path="*" element={ <NotFound />} />
        </Routes>
    )
}

export default AllRoutes







