import { LayoutType } from './theme'
import type { LazyExoticComponent, ReactNode, ComponentType } from 'react'

export type PageHeaderProps = {
    title?: string | ReactNode | LazyExoticComponent<() => JSX.Element>
    description?: string | ReactNode
    contained?: boolean
    extraHeader?: string | ReactNode | LazyExoticComponent<() => JSX.Element>
}

export interface Meta {
    pageContainerType?: 'default' | 'gutterless' | 'contained'
    pageBackgroundType?: 'default' | 'plain'
    header?: PageHeaderProps
    footer?: boolean
    layout?: LayoutType
    device?: 'mobile' | 'desktop' | 'both'
}

export type Route<T extends Meta = Meta> = {
    key: string
    path: string
    component: LazyExoticComponent<ComponentType<T>>
    authority: string[]
    meta?: Meta
}

export type Routes = Route[]
