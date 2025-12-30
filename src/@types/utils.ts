import type { Meta } from '@/@types/routes'
import type { LazyExoticComponent, ComponentType } from 'react'

export function asMetaComponent<P extends object>(
  comp: LazyExoticComponent<ComponentType<Meta & P>>
) {
  return comp as LazyExoticComponent<ComponentType<Meta>>
}
