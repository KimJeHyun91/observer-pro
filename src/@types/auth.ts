export type SignInCredential = {
    id?: string
    password: string
    email?: string
    hostname: string
}

export type SignInResponse = {
    status: boolean,
    token: string
    user: {
        userId: string
        userName: string
        userRole: string
        useLeftMenu: boolean
        useRightMenu: boolean
        useBottomMenu: boolean
        enable: boolean
        authority: string[]
        avatar?: string
        email?: string
    },
    message?: string
}

export type SignUpResponse = SignInResponse

export type SignUpCredential = {
    userName: string
    email: string
    password: string
}

export type ForgotPassword = {
    email: string
}

export type ResetPassword = {
    password: string
}

export type AuthRequestStatus = 'success' | 'failed' | ''

export type AuthResult = Promise<{
    status: AuthRequestStatus
    message: string
}>

export type User = {
    userRole: string
    userId?: string | null
    avatar?: string | null
    userName?: string | null
    email?: string | null
    authority?: string[]
}

export type Token = {
    accessToken: string
    refereshToken?: string
}

export type OauthSignInCallbackPayload = {
    onSignIn: (tokens: Token, user?: User) => void
    redirect: () => void
}
