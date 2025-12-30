import React from 'react';

const CustomerSupportInquirySetting: React.FC = () => {

	const CUSTOMER_SERVICE_URL = {
		homepage: 'http://greenitkr.com/',
		kakao: 'https://pf.kakao.com/_pwRaxj?from=qr',
		email: 'sales@greenitkr.com',
		asPage: 'http://greenitkr.com/bbs/write.php?bo_table=question'
	}

	const openExternalLink = (url: string) => {
		window.open(url, '_blank', 'noopener,noreferrer');
	};

	return (
		<div className="p-4">
			<h2 className="text-lg text-green-600 font-medium mb-3">
				그린아이티코리아 제품에 대한 문의사항이나 AS 접수가 필요하신가요?
			</h2>
			<p className="text-gray-600 mb-6">
				고객님의 편의를 위해 그린아이티코리아 고객센터 연락처와 상세 정보를 안내해 드립니다.
			</p>

			<div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md mb-5">
				<h3 className="text-green-600 font-medium text-center mb-3">제품 문의 및 AS 접수</h3>
				<p className="text-gray-600 text-center">* 02.6412.5662</p>
				<p className="text-gray-600 text-center">* 월~금 오전 9시 ~ 오후 6시</p>
				<p className="text-gray-600 text-center">* 상담 제품 구매, 설치, A/S, 제품 사용법, 기타 문의</p>
				<p className="text-gray-600 text-center">* 이메일 주소: sales@greenitkr.com</p>
			</div>

			<div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md mb-5">
				<h3 className="text-gray-800 font-medium text-center text-green-600 mb-3">온라인 문의</h3>
				<p className="text-gray-600 text-center cursor-pointer hover:text-blue-600"
					onClick={() => openExternalLink(CUSTOMER_SERVICE_URL.homepage)}>
					* [그린아이티코리아 고객센터 홈페이지 바로가기]
				</p>
				<p className="text-gray-600 text-center cursor-pointer hover:text-blue-600"
					onClick={() => openExternalLink(CUSTOMER_SERVICE_URL.kakao)}>
					* 그린아이티코리아 플러스 친구 추가
				</p>
			</div>

			<div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md mb-5">
				<h3 className="text-green-600 font-medium text-center mb-3">빠른 AS 접수</h3>
				<p className="text-gray-600 text-center cursor-pointer hover:text-blue-600"
					onClick={() => openExternalLink(CUSTOMER_SERVICE_URL.asPage)}>
					* 그린아이티코리아 A/S [그린아이티코리아 A/S 신청 페이지 바로가기]
				</p>
				<p className="text-gray-600 text-center">
					* 증상 확인 및 사전 점검을 통해 더욱 빠르고 정확하게 AS를 신청할 수 있습니다.
				</p>
			</div>

			<p className="text-gray-600 text-center mt-8">
				그린아이티코리아 고객센터는 고객님의 소중한 시간을 최우선으로 생각하며,<br />
				친절하고 전문적인 상담을 제공해드립니다.
			</p>
		</div>
	);
};

export default CustomerSupportInquirySetting;