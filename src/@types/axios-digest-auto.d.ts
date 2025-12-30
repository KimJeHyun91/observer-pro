declare module '@mhoc/axios-digest-auth' {
	import { AxiosRequestConfig, AxiosResponse } from 'axios';

	interface DigestAuthConfig {
		username: string;
		password: string;
	}

	class AxiosDigestAuth {
		constructor(config: DigestAuthConfig);
		request(config: AxiosRequestConfig): Promise<AxiosResponse>;
	}

	export default AxiosDigestAuth;
}