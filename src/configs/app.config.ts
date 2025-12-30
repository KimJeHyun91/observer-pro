

export type AppConfig = {
    protocol: 'http' | 'https';
    apiPrefix: string
    authenticatedEntryPath: string
    unAuthenticatedEntryPath: string
    locale: string
    accessTokenPersistStrategy: 'localStorage' | 'sessionStorage' | 'cookies'
    enableMock: boolean
}

const appConfig: AppConfig = {
    protocol: 'http',
    apiPrefix: '/api',
    authenticatedEntryPath: '/origin',
    unAuthenticatedEntryPath: '/sign-in',
    locale: 'en',
    accessTokenPersistStrategy: 'cookies',
    enableMock: false,
}

export default appConfig
